'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Study, TranscriptEntry, ParticipantResponse } from '@/lib/types';
import { Mic, MicOff, Compass, CheckCircle, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

type InterviewState = 'loading' | 'name' | 'active' | 'completed' | 'error';

export default function InterviewPage() {
    const params = useParams();
    const studyId = params.id as string;

    const [study, setStudy] = useState<Study | null>(null);
    const [state, setState] = useState<InterviewState>('loading');
    const [participantName, setParticipantName] = useState('');
    const [messages, setMessages] = useState<TranscriptEntry[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [activeMediaUrls, setActiveMediaUrls] = useState<string[]>([]);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [interviewStartTime] = useState<number>(Date.now());
    const [questionCount, setQuestionCount] = useState(0);
    const [sessionId] = useState(() => `interview_${studyId}_${Date.now()}`);

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
        mediaRecorderRef.current?.stop();
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
        recognition.lang = 'en-US';

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
                startListening();
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
                startListening();
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

                // Find if the current question corresponds to a mediaUrl in the guide
                let foundMedia: string[] = [];
                if (study?.guide) {
                    const agentWords = new Set(data.message.toLowerCase().match(/\w+/g) || []);
                    const allQuestions = [...study.guide.preScreen, ...study.guide.mainQuestions, ...study.guide.exitQuestions];
                    for (const q of allQuestions) {
                        if (!q.mediaUrls || q.mediaUrls.length === 0) continue;
                        const qWords = new Set(q.text.toLowerCase().match(/\w+/g) || []);
                        const intersection = new Set(Array.from(agentWords).filter(x => qWords.has(x as string)));
                        if (intersection.size / qWords.size > 0.5) {
                            foundMedia = q.mediaUrls;
                            break;
                        }
                    }
                }
                setActiveMediaUrls(foundMedia);
                setActiveMediaIndex(0);

                // Read the question aloud
                speak(data.message);

                if (data.action === 'end') {
                    completeInterview(updated);
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

    const completeInterview = (transcript: TranscriptEntry[]) => {
        setState('completed');
        stopListening();
        stopCamera();

        // Cancel audio
        if (audioRef.current) {
            audioRef.current.pause();
        }
        window.speechSynthesis?.cancel();

        const response: ParticipantResponse = {
            id: crypto.randomUUID(),
            participantName: participantName.trim(),
            completedAt: new Date().toISOString(),
            transcript,
            screenedOut: false,
        };

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
    };

    const startInterview = () => {
        startCamera();
        setState('active');

        // Play a fast, immediate native greeting to mask the API latency of generating the first question
        if (ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(`Hi ${participantName}, give me just a second to get ready.`);
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google'));
            if (preferred) utterance.voice = preferred;
            window.speechSynthesis.speak(utterance);
        }

        // Initial agent greeting
        getAgentResponse([]);
        setTimeout(() => startListening(), 2000);
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
                <div className="spinner" />
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div style={styles.centerScreen}>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '8px' }}>Interview not found</h3>
                    <p className="caption">This interview link may be invalid or expired.</p>
                </div>
            </div>
        );
    }

    if (state === 'completed') {
        return (
            <div style={styles.centerScreen}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <CheckCircle size={48} strokeWidth={1.5} style={{ color: 'var(--text-primary)', marginBottom: '16px' }} />
                    <h2 style={{ marginBottom: '8px' }}>Thank you, {participantName}!</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                        Your interview has been recorded. Your responses will help inform the research.
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
                    <h2 style={{ marginBottom: '8px', fontSize: '26px', fontWeight: 400 }}>Welcome</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.7 }}>
                        You&apos;ve been invited to a research interview. An AI moderator will guide the conversation.
                    </p>
                    <p style={{ color: 'var(--neutral-400)', fontSize: '13px', marginBottom: '32px' }}>
                        📹 Camera &amp; microphone access will be requested when you begin.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Your Name</label>
                        <input
                            className="input"
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                            placeholder="Enter your name"
                            onKeyDown={(e) => e.key === 'Enter' && startInterview()}
                            style={{ fontSize: '15px', padding: '10px 14px' }}
                        />
                    </div>
                    <button className="btn btn-primary btn-lg" style={{ width: '100%', padding: '12px', fontSize: '15px' }} onClick={startInterview} disabled={!participantName.trim()}>
                        Start Interview
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
                                        {activeMediaUrls.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveMediaIndex(idx)}
                                                style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    padding: 0,
                                                    border: 'none',
                                                    background: idx === activeMediaIndex ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s ease'
                                                }}
                                                aria-label={`Show image ${idx + 1}`}
                                            />
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
                    {isListening && (
                        <div style={styles.listeningIndicator}>
                            <div style={styles.listeningDot} />
                            <span>Listening</span>
                        </div>
                    )}
                </div>

                {/* Question panel (right side) */}
                <div style={styles.questionPanel}>
                    {/* Current question */}
                    <div style={styles.questionDisplay}>
                        <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--neutral-400)', marginBottom: '12px' }}>
                            {isSending ? 'Thinking…' : `Question ${questionCount}`}
                        </div>
                        {isSending ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="spinner" />
                                <span style={{ fontSize: '14px', color: 'var(--neutral-400)' }}>Preparing next question…</span>
                            </div>
                        ) : (
                            <p style={{ fontSize: '18px', fontWeight: 400, lineHeight: 1.6, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                                {currentQuestion || 'Starting interview…'}
                            </p>
                        )}
                    </div>

                    {/* Live transcription */}
                    <div style={styles.transcriptArea}>
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
                    </div>

                    {/* Controls */}
                    <div style={styles.controls}>
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
                            onClick={() => submitResponse(false)}
                            disabled={(!liveTranscript.trim() && !isListening) || isSending}
                            style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                        >
                            {isSending ? 'Sending…' : 'Submit Response'}
                        </button>
                    </div>
                </div>
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
        padding: '20px 28px',
        borderBottom: '1px solid var(--neutral-100)',
        minHeight: '140px',
        maxHeight: '200px',
        overflow: 'auto',
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
