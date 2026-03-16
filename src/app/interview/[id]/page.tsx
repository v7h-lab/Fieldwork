'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Study, TranscriptEntry, ParticipantResponse } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { LiveExperienceUI } from '@/components/LiveExperienceUI';
import { Mic, MicOff, Compass, CheckCircle, Volume2, VolumeX, ChevronLeft, ChevronRight, Pause } from 'lucide-react';

type InterviewState = 'loading' | 'name' | 'active' | 'completed' | 'error';

function InterviewPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const studyId = params.id as string;
    const lang = searchParams.get('lang') || 'en-US';

    const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

    const [study, setStudy] = useState<Study | null>(null);
    const [state, setState] = useState<InterviewState>('loading');
    const [participantName, setParticipantName] = useState('');
    const [messages, setMessages] = useState<TranscriptEntry[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [activeMediaUrls, setActiveMediaUrls] = useState<string[]>([]);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [activeOptions, setActiveOptions] = useState<string[]>([]);
    const [activeQuestionType, setActiveQuestionType] = useState<string>('open');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [interviewStartTime] = useState<number>(Date.now());
    const [questionCount, setQuestionCount] = useState(0);
    const [sessionId] = useState(() => `interview_${studyId}_${Date.now()}`);
    const [isManualReady, setIsManualReady] = useState(false); // For turn-taking mode


    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef('');

    // Load study from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('fieldwork_studies');
            if (stored) {
                const studies: Study[] = JSON.parse(stored);
                const found = studies.find(s => s.id === studyId);
                if (found) {
                    if (found.status === 'paused') {
                        setState('error');
                        return;
                    }
                    setStudy(found);
                    setState('name');
                } else {
                    setState('error');
                }
            } else {
                setState('error');
            }
        } catch {
            setState('error');
        }
    }, [studyId]);

    // Start camera when active
    const startCamera = useCallback(async () => {
        try {
            const needsVideo = study?.inputMethod !== 'audio';
            const stream = await navigator.mediaDevices.getUserMedia({
                video: needsVideo ? { width: 1280, height: 720, facingMode: 'user' } : false,
                audio: true,
            });
            streamRef.current = stream;
            if (videoRef.current && needsVideo) {
                videoRef.current.srcObject = stream;
            }

            // Start recording
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.start(1000);
        } catch {
            // Camera unavailable — continue without
        }
    }, [study]);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // Prevent auto-restart loop if stopped manually
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    // Speech recognition (live transcription)
    const startListening = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Ctor) return;

        // Clean up existing instance before starting a new one to avoid double-firing
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }

        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        finalTranscriptRef.current = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + t).trim();
                } else {
                    interim += t;
                }
            }
            setLiveTranscript((finalTranscriptRef.current + ' ' + interim).trim());
        };

        recognition.onerror = () => { /* continue */ };
        recognition.onend = () => {
            // Auto-restart if still listening natively closed it
            if (recognitionRef.current) {
                try { recognition.start(); } catch { /* ignore */ }
            }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch { /* ignore */ }
        setIsListening(true);
    }, []);

    // Text-to-Speech using Gemini API
    const speak = useCallback(async (text: string) => {
        if (!ttsEnabled || typeof window === 'undefined') {
            startListening();
            return;
        }

        setIsSpeaking(true);
        // CRITICAL: Mute the microphone immediately so it doesn't transcribe the AI's audio (echo)
        stopListening();

        try {
            // Cancel current audio if any
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voiceName: 'Aoede' }),
            });

            if (!res.ok) throw new Error('TTS generation failed');

            const { audio, mimeType } = await res.json();
            const audioSrc = `data:${mimeType};base64,${audio}`;

            const audioEl = new Audio(audioSrc);
            audioRef.current = audioEl;

            audioEl.onended = () => {
                setIsSpeaking(false);
                if (study?.experienceMode === 'live') {
                    // In live mode, we might want to auto-listen or handled by LiveComponent
                } else if (study?.experienceMode === 'turn-taking') {
                    setIsManualReady(true);
                } else {
                    startListening();
                }
            };

            await audioEl.play();
        } catch (error) {
            console.error('Failed to play Gemini TTS:', error);
            // Fallback to browser TTS if Gemini fails
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google'));
            if (preferred) utterance.voice = preferred;
            utterance.onend = () => {
                setIsSpeaking(false);
                if (study?.experienceMode === 'turn-taking') {
                    setIsManualReady(true);
                } else {
                    startListening();
                }
            };
            window.speechSynthesis.speak(utterance);
        }
    }, [ttsEnabled, startListening]);

    // Get agent response
    const getAgentResponse = useCallback(async (currentMessages: TranscriptEntry[]) => {
        if (!study) return;
        setIsSending(true);
        try {
            const res = await fetch('/api/interview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studyType: study.type,
                    goals: study.goals,
                    audience: study.audience,
                    guide: study.guide,
                    maxFollowUps: study.maxFollowUps,
                    messages: currentMessages.map(m => ({ role: m.role, text: m.text })),
                    sessionId,
                    lang,
                    smartSkipping: study.smartSkipping,
                }),
            });
            const data = await res.json();

            if (data.message) {
                const agentEntry: TranscriptEntry = {
                    role: 'agent',
                    text: data.message,
                    timestamp: new Date().toISOString(),
                    videoTimestamp: (Date.now() - interviewStartTime) / 1000,
                    questionIndex: data.questionIndex,
                    isFollowUp: data.isFollowUp,
                };
                const updated = [...currentMessages, agentEntry];
                setMessages(updated);
                setCurrentQuestion(data.message);
                setQuestionCount(prev => prev + 1);

                // Find if the current question corresponds to a mediaUrl or interactive options in the guide
                let foundMedia: string[] = [];
                let foundOptions: string[] = [];
                let foundType: string = 'open';

                if (study?.guide) {
                    const agentWords = new Set(data.message.toLowerCase().match(/\w+/g) || []);
                    const allQuestions = [...study.guide.preScreen, ...study.guide.mainQuestions, ...study.guide.exitQuestions];
                    for (const q of allQuestions) {
                        const qWords = new Set(q.text.toLowerCase().match(/\w+/g) || []);
                        const intersection = new Set(Array.from(agentWords).filter(x => qWords.has(x as string)));
                        if (intersection.size / qWords.size > 0.5) {
                            if (q.mediaUrls && q.mediaUrls.length > 0) foundMedia = q.mediaUrls;
                            if (q.type && q.type !== 'open' && q.options && q.options.length > 0) {
                                foundOptions = q.options;
                                foundType = q.type;
                            }
                            break;
                        }
                    }
                }
                setActiveMediaUrls(foundMedia);
                setActiveMediaIndex(0);
                setActiveOptions(foundOptions);
                setActiveQuestionType(foundType);
                setSelectedOption(null);

                // Read the question aloud
                if (study.experienceMode === 'turn-taking') {
                    setIsManualReady(false);
                }
                speak(data.message);

                if (data.action === 'end') {
                    // Slight delay to allow final TTS to queue
                    setTimeout(() => completeInterview(updated), 500);
                }
            }
        } catch {
            // handle silently
        } finally {
            setIsSending(false);
        }
    }, [study, interviewStartTime, speak]);

    // Submit participant response
    const submitResponse = useCallback(async (isInterrupt = false) => {
        let text = (finalTranscriptRef.current || liveTranscript).trim();
        if (!text && !isInterrupt) return;
        if (isSending) return;

        stopListening();

        // Cancel audio
        if (audioRef.current) {
            audioRef.current.pause();
        }
        window.speechSynthesis?.cancel();

        if (isInterrupt) {
            text = `[Participant interrupted the AI to say]: ${text || '(interrupted but said nothing yet)'}`;
        }

        // Clear interactive state
        setActiveOptions([]);
        setActiveQuestionType('open');
        setSelectedOption(null);

        const entry: TranscriptEntry = {
            role: 'participant',
            text,
            timestamp: new Date().toISOString(),
            videoTimestamp: (Date.now() - interviewStartTime) / 1000,
        };

        const updated = [...messages, entry];
        setMessages(updated);
        setLiveTranscript('');
        finalTranscriptRef.current = '';

        await getAgentResponse(updated);
    }, [liveTranscript, isSending, messages, interviewStartTime, getAgentResponse, stopListening]);

    // Manual Submit for multiple-choice / binary
    const submitOptionResponse = useCallback(async (optionText: string) => {
        if (isSending) return;

        stopListening();
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis?.cancel();

        const entry: TranscriptEntry = {
            role: 'participant',
            text: `[Selected Option]: ${optionText}`,
            timestamp: new Date().toISOString(),
            videoTimestamp: (Date.now() - interviewStartTime) / 1000,
        };

        const updated = [...messages, entry];
        setMessages(updated);
        setLiveTranscript('');
        finalTranscriptRef.current = '';

        setActiveOptions([]);
        setActiveQuestionType('open');
        setSelectedOption(null);

        await getAgentResponse(updated);
    }, [isSending, messages, interviewStartTime, getAgentResponse, stopListening]);

    // Interrupt AI speaking
    const interruptAgent = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        startListening();
        // The user can now speak their interruption, and submit it normally.
    }, [startListening]);

    const completeInterview = async (transcript: TranscriptEntry[]) => {
        stopListening();
        window.speechSynthesis?.cancel();

        // Cancel audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        const responseId = crypto.randomUUID();
        const response: ParticipantResponse = {
            id: responseId,
            participantName: participantName.trim(),
            completedAt: new Date().toISOString(),
            transcript,
            screenedOut: false,
            videoDuration: Math.round((Date.now() - interviewStartTime) / 1000),
        };

        // Stop recording and handle video upload
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            setState('loading'); // Show loading spinner while uploading
            setUploadingVideo(true);

            // Create a promise to wait for the final data chunks
            const getBlob = new Promise<Blob>((resolve) => {
                mediaRecorderRef.current!.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                    resolve(blob);
                };
                mediaRecorderRef.current!.stop();
            });

            try {
                const blob = await getBlob;

                // Only upload if it's a substantive video (e.g. > 10KB)
                if (blob.size > 10000) {
                    const filename = `interviews/${studyId}/${responseId}.webm`;

                    // 1. Get signed URL
                    const urlRes = await fetch('/api/upload-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename, contentType: 'video/webm' }),
                    });

                    if (urlRes.ok) {
                        const { uploadUrl, publicUrl } = await urlRes.json();

                        // 2. Upload to GCS
                        const uploadRes = await fetch(uploadUrl, {
                            method: 'PUT',
                            body: blob,
                            headers: { 'Content-Type': 'video/webm' },
                        });

                        if (uploadRes.ok) {
                            response.videoPath = filename;
                            response.videoDuration = Math.round((Date.now() - interviewStartTime) / 1000);
                        } else {
                            console.error('Failed to upload video chunk to GCS', uploadRes.statusText);
                        }
                    } else {
                        console.error('Failed to get signed upload URL');
                    }
                }
            } catch (err) {
                console.error('Error uploading video:', err);
            } finally {
                setUploadingVideo(false);
            }
        } else {
            // Audio only or no camera — just stop tracks
            streamRef.current?.getTracks().forEach(t => t.stop());
        }

        // Translate transcript if necessary
        if (lang !== 'en-US') {
            setState('loading'); // Ensure spinner is up
            try {
                const transRes = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ texts: transcript.map(t => t.text), sourceLang: lang }),
                });
                if (transRes.ok) {
                    const data = await transRes.json();
                    if (data.translations && data.translations.length === transcript.length) {
                        response.transcript = transcript.map((entry, i) => ({
                            ...entry,
                            translatedText: data.translations[i],
                        }));
                    }
                }
            } catch (err) {
                console.error('Translation failed', err);
            }
        }

        try {
            const stored = localStorage.getItem('fieldwork_studies');
            if (stored) {
                const studies: Study[] = JSON.parse(stored);
                const idx = studies.findIndex(s => s.id === studyId);
                if (idx >= 0) {
                    studies[idx].responses.push(response);
                    localStorage.setItem('fieldwork_studies', JSON.stringify(studies));
                }
            }
        } catch {
            // ignore
        }

        setState('completed');
    };

    const startInterview = () => {
        startCamera();
        setState('active');

        // Play a fast, immediate native greeting to mask the API latency of generating the first question
        // Play a fast, immediate native greeting for manual mode to mask AI latency
        if (study?.experienceMode !== 'live' && ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(`Hi ${participantName}, give me just a second to get ready.`);
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google'));
            if (preferred) utterance.voice = preferred;
            window.speechSynthesis.speak(utterance);
        }

        // Initial agent greeting
        if (study?.experienceMode !== 'live') {
            getAgentResponse([]);
            if (study?.experienceMode !== 'turn-taking') {
                setTimeout(() => startListening(), 2000);
            }
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            stopCamera();
            stopListening();
            window.speechSynthesis?.cancel();
        };
    }, [stopCamera, stopListening]);

    // --- Render ---

    if (state === 'loading') {
        return (
            <div style={styles.centerScreen}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div className="spinner" />
                    {uploadingVideo && (
                        <p style={{ color: 'var(--text-secondary)' }}>{t('saving')}</p>
                    )}
                </div>
            </div>
        );
    }

    if (state === 'error') {
        const isPaused = study?.status === 'paused';
        return (
            <div style={styles.centerScreen}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 var(--space-6)' }}>
                    {isPaused ? (
                        <>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Pause size={32} strokeWidth={1.5} style={{ color: 'var(--neutral-400)' }} />
                            </div>
                            <h3 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: 500 }}>Study is Paused</h3>
                            <p className="body-text" style={{ color: 'var(--neutral-500)' }}>This interview session is currently inactive. Please contact the researcher for more information.</p>
                        </>
                    ) : (
                        <>
                            <h3 style={{ marginBottom: '8px' }}>Interview not found</h3>
                            <p className="caption">This interview link may be invalid or expired.</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (state === 'completed') {
        return (
            <div style={styles.centerScreen}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <CheckCircle size={48} strokeWidth={1.5} style={{ color: 'var(--text-primary)', marginBottom: '16px' }} />
                    <h2 style={{ marginBottom: '8px' }}>{t('thankYou')}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                        {t('complete')}
                    </p>
                    <div style={{ marginTop: '24px' }}>
                        <span className="caption">{questionCount} questions · {Math.round((Date.now() - interviewStartTime) / 60000)} min</span>
                    </div>
                </div>
            </div>
        );
    }

    if (state === 'name') {
        return (
            <div style={styles.centerScreen}>
                <div style={{ maxWidth: '420px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                        <Compass size={22} strokeWidth={1.5} />
                        <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.02em' }}>Fieldwork</span>
                    </div>
                    <h2 style={{ marginBottom: '8px', fontSize: '26px', fontWeight: 400 }}>{t('welcome')}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.7 }}>
                        {t('recordingNotice')}
                    </p>
                    <p style={{ color: 'var(--neutral-400)', fontSize: '13px', marginBottom: '32px' }}>
                        📹 {t('reqAccess')}
                    </p>
                    <div className="form-group">
                        <label className="form-label">Your Name</label>
                        <input
                            className="input"
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                            placeholder="Type your name..."
                            onKeyDown={(e) => e.key === 'Enter' && startInterview()}
                            style={{ fontSize: '15px', padding: '10px 14px' }}
                        />
                    </div>
                    <button className="btn btn-primary btn-lg" style={{ width: '100%', padding: '12px', fontSize: '15px' }} onClick={startInterview} disabled={!participantName.trim()}>
                        {t('startBtn')}
                    </button>
                </div>
            </div>
        );
    }

    // === ACTIVE INTERVIEW — Video Meeting Layout ===
    return (
        <div style={styles.meetingContainer}>
            {/* Top bar */}
            <div style={styles.topBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Compass size={16} strokeWidth={1.5} style={{ color: '#fff' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>Fieldwork Interview</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        Q{questionCount} · {Math.floor((Date.now() - interviewStartTime) / 60000)}m
                    </span>
                    <button
                        onClick={() => setTtsEnabled(!ttsEnabled)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(255,255,255,0.7)' }}
                        title={ttsEnabled ? 'Mute voice' : 'Unmute voice'}
                    >
                        {ttsEnabled ? <Volume2 size={16} strokeWidth={1.5} /> : <VolumeX size={16} strokeWidth={1.5} />}
                    </button>
                </div>
            </div>

            {/* Main area */}
            <div style={styles.meetingBody}>
                {/* Video feed */}
                <div style={styles.videoArea}>
                    {study?.inputMethod !== 'audio' ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={styles.videoFeed}
                        />
                    ) : (
                        <div style={styles.audioOnlyAvatar}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 300, color: 'rgba(255,255,255,0.6)' }}>
                                {participantName.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '12px' }}>{participantName}</span>
                        </div>
                    )}

                    {/* Active Media Overlay */}
                    {activeMediaUrls.length > 0 && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={activeMediaUrls[activeMediaIndex]} alt={`Concept Media ${activeMediaIndex + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />

                            {activeMediaUrls.length > 1 && (
                                <>
                                    <div style={{ position: 'absolute', bottom: '24px', display: 'flex', gap: '8px', zIndex: 10 }}>
                                        {activeMediaUrls.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveMediaIndex(idx)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    opacity: idx === activeMediaIndex ? 1 : 0.5,
                                                    transition: 'opacity 0.2s ease',
                                                }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt={`Option ${idx + 1}`} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: `2px solid ${idx === activeMediaIndex ? 'var(--primary)' : 'transparent'}` }} />
                                                <span style={{ color: 'white', fontSize: '11px', fontWeight: 500, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    Option {String.fromCharCode(65 + idx)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setActiveMediaIndex(prev => prev > 0 ? prev - 1 : activeMediaUrls.length - 1)}
                                        style={{ position: 'absolute', left: '24px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s ease' }}
                                        className="hover-bg-black"
                                    >
                                        <ChevronLeft size={24} strokeWidth={2} />
                                    </button>
                                    <button
                                        onClick={() => setActiveMediaIndex(prev => prev < activeMediaUrls.length - 1 ? prev + 1 : 0)}
                                        style={{ position: 'absolute', right: '24px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s ease' }}
                                        className="hover-bg-black"
                                    >
                                        <ChevronRight size={24} strokeWidth={2} />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Participant name overlay */}
                    {study?.inputMethod !== 'audio' && (
                        <div style={styles.nameOverlay}>
                            <span>{participantName}</span>
                        </div>
                    )}

                    {/* Listening indicator */}
                    {isListening && study?.experienceMode !== 'live' && (
                        <div style={styles.listeningIndicator}>
                            <div style={styles.listeningDot} />
                            <span>{t('listening')}</span>
                        </div>
                    )}
                </div>

                {/* Question panel (right side) / Live Experience */}
                {study?.experienceMode === 'live' ? (
                    <div style={{ flex: 1, height: '100%', background: 'var(--bg-card)' }}>
                        <LiveExperienceUI
                            study={study}
                            participantName={participantName}
                            onMessage={(entry) => setMessages(prev => [...prev, entry])}
                            onComplete={(finalTranscript) => completeInterview(finalTranscript)}
                            onStatsUpdate={(stats) => {
                                setQuestionCount(stats.questionCount);
                            }}
                            startTime={interviewStartTime}
                        />
                    </div>
                ) : (
                    <div style={styles.questionPanel}>
                        {/* Current question */}
                        <div style={styles.questionDisplay}>
                            <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--neutral-400)', marginBottom: '12px' }}>
                                {isSending ? t('thinking') : `Question ${questionCount}`}
                            </div>
                            {isSending ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="spinner" />
                                    <span style={{ fontSize: '14px', color: 'var(--neutral-400)' }}>{t('thinking')}</span>
                                </div>
                            ) : (
                                <p style={{ fontSize: '18px', fontWeight: 400, lineHeight: 1.6, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                                    {currentQuestion || 'Starting interview…'}
                                </p>
                            )}
                        </div>

                        {/* Live transcription / Interactive Options */}
                        <div style={styles.transcriptArea}>
                            {activeOptions.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--neutral-500)', marginBottom: '4px' }}>
                                        {activeQuestionType === 'binary-choice' ? 'Select one option:' : 'Select many options (experimental):'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeOptions.map((opt, idx) => (
                                            <label key={idx} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                                                background: selectedOption === opt ? 'rgba(0,0,0,0.03)' : 'var(--bg-page)',
                                                border: `1px solid ${selectedOption === opt ? 'var(--black)' : 'var(--neutral-200)'}`,
                                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s',
                                            }}>
                                                <div style={{
                                                    width: '18px', height: '18px',
                                                    border: `1px solid ${selectedOption === opt ? 'var(--black)' : 'var(--neutral-400)'}`,
                                                    borderRadius: activeQuestionType === 'binary-choice' ? '50%' : '4px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {selectedOption === opt && <div style={{ width: '10px', height: '10px', background: 'var(--black)', borderRadius: activeQuestionType === 'binary-choice' ? '50%' : '2px' }} />}
                                                </div>
                                                <span style={{ fontSize: '15px', fontWeight: 400, flex: 1, color: 'var(--text-primary)' }}>{opt}</span>
                                                <input
                                                    type="radio"
                                                    name="interactive-option"
                                                    value={opt}
                                                    checked={selectedOption === opt}
                                                    onChange={() => setSelectedOption(opt)}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--neutral-400)', marginBottom: '8px' }}>
                                        Your Response
                                    </div>
                                    <div style={styles.transcriptText}>
                                        {liveTranscript || (
                                            <span style={{ color: 'var(--neutral-300)', fontStyle: 'italic' }}>
                                                {isListening ? 'Speak your response…' : 'Press the microphone to respond'}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Controls */}
                        <div style={styles.controls}>
                            {study?.experienceMode === 'turn-taking' ? (
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                    {!isListening && !isManualReady && !isSpeaking && !isSending && (
                                        <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} disabled>
                                            AI is thinking...
                                        </button>
                                    )}
                                    {!isListening && isManualReady && !isSpeaking && !isSending && (
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ flex: 1, padding: '12px', fontSize: '15px' }}
                                            onClick={() => {
                                                setIsManualReady(false);
                                                startListening();
                                            }}
                                        >
                                            Begin response
                                        </button>
                                    )}
                                    {isListening && (
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ flex: 1, padding: '12px', fontSize: '15px', background: 'var(--black)' }}
                                            onClick={() => {
                                                if (activeOptions.length > 0 && selectedOption) {
                                                    submitOptionResponse(selectedOption);
                                                } else {
                                                    submitResponse(false);
                                                }
                                            }}
                                            disabled={activeOptions.length > 0 && !selectedOption}
                                        >
                                            {isSending ? t('saving') : 'Submit response'}
                                        </button>
                                    )}
                                    {(isSpeaking || isSending) && (
                                        <div style={{ flex: 1, textAlign: 'center', padding: '12px', color: 'var(--neutral-400)', fontSize: '14px' }}>
                                            {isSpeaking ? 'AI is speaking...' : t('thinking')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        style={{
                                            ...styles.micButton,
                                            background: isListening ? 'var(--black)' : 'var(--neutral-100)',
                                            color: isListening ? '#fff' : 'var(--text-primary)',
                                        }}
                                        title={isListening ? 'Stop listening' : 'Start listening'}
                                    >
                                        {isListening ? <MicOff size={20} strokeWidth={1.5} /> : <Mic size={20} strokeWidth={1.5} />}
                                    </button>

                                    {/* Interrupt button */}
                                    {(isSpeaking || isSending) && !isListening && (
                                        <button
                                            className="btn"
                                            onClick={interruptAgent}
                                            style={{
                                                flex: 0.5,
                                                padding: '12px',
                                                fontSize: '14px',
                                                background: 'var(--neutral-100)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--neutral-200)',
                                            }}
                                            title="Interrupt the AI and speak"
                                        >
                                            Interrupt AI
                                        </button>
                                    )}

                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={() => {
                                            if (activeOptions.length > 0) {
                                                if (selectedOption) submitOptionResponse(selectedOption);
                                            } else {
                                                submitResponse(false);
                                            }
                                        }}
                                        disabled={
                                            (activeOptions.length > 0 && !selectedOption) ||
                                            (activeOptions.length === 0 && !liveTranscript.trim() && !isListening) ||
                                            isSending
                                        }
                                        style={{ flex: 1, padding: '12px', fontSize: '15px', fontWeight: 500 }}
                                    >
                                        {isSending ? t('saving') : t('submit')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    centerScreen: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-page)',
        padding: '32px',
    },
    meetingContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
    },
    topBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10,
    },
    meetingBody: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
    },
    videoArea: {
        flex: 1,
        position: 'relative',
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    videoFeed: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        transform: 'scaleX(-1)',
    },
    audioOnlyAvatar: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameOverlay: {
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#fff',
        fontWeight: 500,
    },
    listeningIndicator: {
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    listeningDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#ef4444',
        animation: 'voice-pulse 1.5s ease-in-out infinite',
    },
    questionPanel: {
        width: '380px',
        minWidth: '380px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column' as const,
        borderLeft: '1px solid var(--neutral-200)',
    },
    questionDisplay: {
        flex: 1,
        padding: '32px 28px',
        borderBottom: '1px solid var(--neutral-100)',
        overflow: 'auto',
    },
    transcriptArea: {
        padding: '24px 28px',
        borderBottom: '1px solid var(--neutral-100)',
        flex: 1, // Allow it to take more space
        overflow: 'auto',
        maxHeight: '400px', // Set a larger maxHeight
    },
    transcriptText: {
        fontSize: '14px',
        lineHeight: 1.7,
        color: 'var(--text-primary)',
    },
    controls: {
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    micButton: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 120ms ease',
        flexShrink: 0,
    },
};

export default function InterviewPage() {
    return (
        <Suspense fallback={<div style={styles.centerScreen}><div className="spinner" /></div>}>
            <InterviewPageContent />
        </Suspense>
    );
}
