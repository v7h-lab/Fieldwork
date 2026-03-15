'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Study, TranscriptEntry } from '@/lib/types';
import { Mic, MicOff, Loader2, Volume2, X, MessageSquare } from 'lucide-react';

interface LiveExperienceUIProps {
    study: Study;
    participantName: string;
    onMessage: (entry: TranscriptEntry) => void;
    onComplete: (transcript: TranscriptEntry[]) => void;
    startTime: number;
}

export function LiveExperienceUI({ study, participantName, onMessage, onComplete, startTime }: LiveExperienceUIProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [showMuteReminder, setShowMuteReminder] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [currentAgentText, setCurrentAgentText] = useState('');
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isWaitingForSubmit, setIsWaitingForSubmit] = useState(false);
    const [isEnding, setIsEnding] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const speechDetectorRef = useRef<AnalyserNode | null>(null);

    const transcriptRef = useRef<TranscriptEntry[]>([]);
    const audioQueueRef = useRef<Int16Array[]>([]);
    const isPlayingRef = useRef(false);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const accumulatedTextRef = useRef(''); // Agent
    const accumulatedUserTextRef = useRef(''); // Participant
    const [currentUserText, setCurrentUserText] = useState('');
    const isMutedRef = useRef(isMuted);
    const audioBufferRef = useRef<Float32Array[]>([]);
    const systemInstructionsRef = useRef('');
    const hasSentActivityStartRef = useRef(false);

    // Get language from URL or default to en-US
    const lang = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lang') || 'en-US' : 'en-US';

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // Memoize instructions to prevent reconnection loops
    const systemInstructions = useMemo(() => `
        You are a research assistant conducting a ${study.type} study.
        Goals: ${study.goals}
        Audience: ${study.audience}
        
        RESEARCH GUIDE:
        ${JSON.stringify(study.guide)}

        STRICT RULES:
        1. Follow the Research Guide flow (Pre-screen -> Main Questions -> Exit).
        2. Be conversational but focused.
        3. Do not wander outside the study goals.
        4. If the participant provides a response that answers multiple questions, use your smart skipping ability to move to the next relevant question.
        5. When all questions are exhausted, say "Thank you for your time. This concludes our interview." and terminate the session. 
        6. Use the provided participant name: ${participantName}.
        7. Maintain a professional yet empathetic tone.
        8. IMPORTANT: You must NOT speak your internal thinking, planning, or preparation process aloud. Any text like "Initiating the interview process" or "I've ready to begin" must be internal only. ONLY speak direct dialogue intended for the participant.
        9. Start immediately with the first question or introduction without any metadata or labels.
        10. LANGUAGE MANDATE: The participant has selected ${lang} as their preferred language. Even if you hear noise or words that sound like other languages, you MUST interpret them in the context of ${lang} and you MUST ONLY respond and transcribe in English (en-US). Do NOT use any non-English characters or scripts.
    `, [study, participantName, lang]);

    // Stability: Wrap onMessage and onComplete in refs so connect doesn't restart when they (rarely) change
    const onMessageRef = useRef(onMessage);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        systemInstructionsRef.current = systemInstructions;
    }, [systemInstructions]);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [transcript, currentAgentText, scrollToBottom]);

    const stopPlayback = useCallback(() => {
        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
            } catch (e) { /* ignore */ }
            currentSourceRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        setIsAgentSpeaking(false);
    }, []);

    const playNextChunk = useCallback(async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsAgentSpeaking(false);
            return;
        }

        isPlayingRef.current = true;
        setIsAgentSpeaking(true);
        const pcm16 = audioQueueRef.current.shift()!;

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768.0;
        }

        const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        currentSourceRef.current = source;
        source.onended = () => {
            if (currentSourceRef.current === source) {
                playNextChunk();
            }
        };
        source.start();
    }, []);

    const connect = useCallback(() => {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        console.log('Attempting to connect to Gemini Live...', apiKey ? 'API Key found' : 'API Key MISSING');
        if (!apiKey) {
            console.error('Gemini API key missing');
            return null;
        }

        const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket Connected to Gemini Live');
            setIsConnected(true);
            const setupMsg = {
                setup: {
                    model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
                    generation_config: {
                        response_modalities: ["AUDIO"],
                        speech_config: {
                            voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } }
                        },
                        thinking_config: { include_thoughts: false }
                    },
                    input_audio_transcription: {},
                    output_audio_transcription: {}, // Enable transcription of model output
                    realtime_input_config: {
                        automatic_activity_detection: {
                            disabled: true
                        }
                    },
                    system_instruction: { role: "system", parts: [{ text: systemInstructionsRef.current }] }
                }
            };
            try {
                ws.send(JSON.stringify(setupMsg));
            } catch (err) {
                console.error("Failed to send setup message:", err);
            }
        };

        const sendInitialMessage = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    client_content: {
                        turns: [{
                            role: "user",
                            parts: [{ text: "Start" }]
                        }],
                        turn_complete: true
                    }
                }));
            }
        };

        ws.onmessage = async (event) => {
            let text = "";
            if (typeof event.data === 'string') {
                text = event.data;
            } else if (event.data instanceof ArrayBuffer) {
                text = new TextDecoder().decode(event.data);
            } else if (event.data instanceof Blob) {
                text = await event.data.text();
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse WebSocket message (first 100 bytes):", text.substring(0, 100));
                return;
            }

            if (data.setupComplete) {
                console.log('Gemini Live Setup Complete');
                sendInitialMessage();
                return;
            }

            console.log('Server Message:', JSON.stringify(data));

            // Debug: Log unexpected server content types to see why transcripts are missing
            if (data.serverContent && !data.serverContent.modelTurn && !data.serverContent.userTranscription && !data.serverContent.interrupted) {
                console.log('Received raw server content:', JSON.stringify(data.serverContent));
            }

            // Handle interruption (barge-in)
            if (data.serverContent?.interrupted) {
                console.log('Gemini Live Interrupted');
                stopPlayback();

                // Prevent agent text from disappearing: Commit partial text to transcript
                if (accumulatedTextRef.current.trim()) {
                    const entry: TranscriptEntry = {
                        role: 'agent',
                        text: accumulatedTextRef.current + "...", // Indicate interruption
                        timestamp: new Date().toISOString(),
                        videoTimestamp: (Date.now() - startTime) / 1000
                    };
                    const updated = [...transcriptRef.current, entry];
                    transcriptRef.current = updated;
                    setTranscript(updated);
                    onMessageRef.current(entry);
                }

                // Clear agent buffers after committing
                accumulatedTextRef.current = '';
                setCurrentAgentText('');

                // Reset manual VAD states on interruption
                hasSentActivityStartRef.current = false;
                setIsWaitingForSubmit(false);
                return;
            }

            if (data.serverContent) {
                // Handle User Transcription (both field names used by Gemini)
                const userTranscript = data.serverContent.userTranscription || data.serverContent.inputTranscription;
                if (userTranscript) {
                    const userText = userTranscript.text || userTranscript.parts?.[0]?.text || "";
                    if (userText) {
                        accumulatedUserTextRef.current += userText;
                        setCurrentUserText(accumulatedUserTextRef.current);
                    }
                }

                // Handle Agent Transcription (Streaming parts)
                if (data.serverContent.outputTranscription) {
                    const agentText = data.serverContent.outputTranscription.text || "";
                    if (agentText) {
                        accumulatedTextRef.current += agentText;
                        setCurrentAgentText(accumulatedTextRef.current);
                    }
                }

                const modelTurn = data.serverContent.modelTurn;
                if (modelTurn) {
                    // Agent started speaking, flush user buffer if it exists
                    if (accumulatedUserTextRef.current.trim()) {
                        const entry: TranscriptEntry = {
                            role: 'participant',
                            text: accumulatedUserTextRef.current,
                            timestamp: new Date().toISOString(),
                            videoTimestamp: (Date.now() - startTime) / 1000
                        };
                        const updated = [...transcriptRef.current, entry];
                        transcriptRef.current = updated;
                        setTranscript(updated);
                        onMessageRef.current(entry);
                        accumulatedUserTextRef.current = '';
                        setCurrentUserText('');
                    }
                }

                if (modelTurn && modelTurn.parts) {
                    for (const part of modelTurn.parts) {
                        if (part.inlineData) {
                            const audioBase64 = part.inlineData.data;
                            const binaryString = atob(audioBase64);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const pcm16 = new Int16Array(bytes.buffer);
                            audioQueueRef.current.push(pcm16);
                            if (!isPlayingRef.current) playNextChunk();
                        }
                        // Use text part if available (transcription of output)
                        if (part.text && !part.thought) {
                            accumulatedTextRef.current += part.text;
                            setCurrentAgentText(accumulatedTextRef.current);
                        }
                    }
                }

                if (data.serverContent.turnComplete) {
                    // Flush Agent Text
                    const text = accumulatedTextRef.current;
                    if (text.trim()) {
                        const entry: TranscriptEntry = {
                            role: 'agent',
                            text: text,
                            timestamp: new Date().toISOString(),
                            videoTimestamp: (Date.now() - startTime) / 1000
                        };
                        const updated = [...transcriptRef.current, entry];
                        transcriptRef.current = updated;
                        setTranscript(updated);
                        onMessageRef.current(entry);

                        // Reliable termination check: strictly keyword based
                        const lowerText = text.toLowerCase();
                        const hasEndKeywords = lowerText.includes("thank you for your time") ||
                            lowerText.includes("concludes our interview") ||
                            lowerText.includes("concludes our study") ||
                            (lowerText.includes("thank you") && lowerText.includes("concludes"));

                        if (hasEndKeywords) {
                            console.log("Session conclusion detected via keywords, killing resources...");
                            setIsEnding(true);
                            // Immediate resource teardown
                            sourceRef.current?.disconnect();
                            workletNodeRef.current?.disconnect();
                            if (audioContextRef.current?.state !== 'closed') {
                                audioContextRef.current?.close();
                            }
                            // UI Delay for "Thank You" logic
                            setTimeout(() => onCompleteRef.current(updated), 3000);
                        }
                    }
                    accumulatedTextRef.current = '';
                    setCurrentAgentText('');

                    // Flush User Text (if terminal hasn't already)
                    if (accumulatedUserTextRef.current.trim()) {
                        const entry: TranscriptEntry = {
                            role: 'participant',
                            text: accumulatedUserTextRef.current,
                            timestamp: new Date().toISOString(),
                            videoTimestamp: (Date.now() - startTime) / 1000
                        };
                        const updated = [...transcriptRef.current, entry];
                        transcriptRef.current = updated;
                        setTranscript(updated);
                        onMessageRef.current(entry);
                        accumulatedUserTextRef.current = '';
                        setCurrentUserText('');
                        setIsWaitingForSubmit(false);
                    }
                }
            }
        };

        ws.onerror = (err: Event) => {
            console.error('WebSocket Error Object:', err);
            // WebSocket errors don't provide much info in the event itself for security reasons.
            // Usually the close event has more details.
        };
        ws.onclose = (ev) => {
            setIsConnected(false);
            console.error(`WebSocket Closed: Code=${ev.code}, Reason=${ev.reason}, WasClean=${ev.wasClean}`);
            if (ev.code === 1006) {
                console.error('Abnormal closure: Check your API key and model name, and ensure you are using a Gemini 2.0 Flash enabled key.');
            }
        };

        return ws;
    }, [startTime, playNextChunk, stopPlayback]); // Removed systemInstructions to break loop

    const submitResponse = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && hasSentActivityStartRef.current) {
            console.log("Submitting response via ActivityEnd");
            wsRef.current.send(JSON.stringify({
                realtime_input: {
                    activity_end: {}
                }
            }));
            hasSentActivityStartRef.current = false;
            setIsWaitingForSubmit(false);
        }
    }, []);

    const startMic = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

            try {
                await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
            } catch (e) {
                console.error('Failed to load AudioWorklet module:', e);
                // In some browsers or during re-renders, it might already be loaded
            }

            let workletNode;
            try {
                workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
            } catch (e) {
                console.error('Failed to create AudioWorkletNode:', e);
                return;
            }
            workletNodeRef.current = workletNode;

            const source = audioContextRef.current.createMediaStreamSource(stream);
            sourceRef.current = source;

            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            speechDetectorRef.current = analyser;
            source.connect(analyser);

            workletNode.port.onmessage = (e) => {
                const inputData = e.data; // Float32Array from AudioWorklet

                // Speech detection for mute reminder
                if (isMutedRef.current) {
                    let max = 0;
                    for (let i = 0; i < inputData.length; i++) {
                        if (Math.abs(inputData[i]) > max) max = Math.abs(inputData[i]);
                    }
                    if (max > 0.1) {
                        setShowMuteReminder(true);
                    } else if (max < 0.02) {
                        setShowMuteReminder(false);
                    }
                    return;
                } else {
                    setShowMuteReminder(false);
                }

                // Buffer audio to send larger chunks (lower WebSocket frequency)
                audioBufferRef.current.push(new Float32Array(inputData));
                if (audioBufferRef.current.length < 5) return; // Snappy QoS: Reduced from 10 to 5 (~40ms)

                const totalLength = audioBufferRef.current.reduce((acc, val) => acc + val.length, 0);
                const unified = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of audioBufferRef.current) {
                    unified.set(chunk, offset);
                    offset += chunk.length;
                }
                audioBufferRef.current = [];

                const pcm16 = new Int16Array(unified.length);
                for (let i = 0; i < unified.length; i++) {
                    pcm16[i] = Math.max(-1, Math.min(1, unified[i])) * 0x7FFF;
                }

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    const pcmData = new Uint8Array(pcm16.buffer);
                    const base64 = btoa(String.fromCharCode(...pcmData));

                    let energy = 0;
                    for (let i = 0; i < unified.length; i++) energy += Math.abs(unified[i]);
                    const avgEnergy = energy / unified.length;

                    // VAD Gating: Only send if energy is above threshold
                    if (avgEnergy > 0.002) {
                        // Only trigger ActivityStart on significant speech (0.005) to avoid cutting agent off
                        if (!hasSentActivityStartRef.current && avgEnergy > 0.005) {
                            console.log("Speech detected: sending ActivityStart");
                            wsRef.current.send(JSON.stringify({
                                realtime_input: {
                                    activity_start: {}
                                }
                            }));
                            hasSentActivityStartRef.current = true;
                            setIsWaitingForSubmit(true);
                        }

                        if (Math.random() < 0.05) {
                            console.log(`Mic active: sending ${base64.length} bytes, avg energy: ${avgEnergy.toFixed(4)}`);
                        }
                        wsRef.current.send(JSON.stringify({
                            realtime_input: {
                                media_chunks: [{ data: base64, mime_type: "audio/pcm" }]
                            }
                        }));
                    } else if (Math.random() < 0.01) {
                        console.log(`Gating mic: avg energy ${avgEnergy.toFixed(4)} too low`);
                    }
                }
            };

            source.connect(workletNode);
            workletNode.connect(audioContextRef.current.destination);
        } catch (err) {
            console.error('Mic Access Denied:', err);
        }
    }, []);

    useEffect(() => {
        if (isEnding) return;
        const ws = connect();
        startMic();
        return () => {
            if (ws) ws.close();
            sourceRef.current?.disconnect();
            workletNodeRef.current?.disconnect();
            if (audioContextRef.current?.state !== 'closed') {
                audioContextRef.current?.close();
            }
        };
    }, [connect, startMic, isEnding]);

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', background: 'var(--bg-page)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444', animation: isConnected ? 'pulse 2s infinite' : 'none' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isConnected ? 'Live Audio Active' : 'Connecting to Gemini...'}
                    </span>
                </div>
            </div>

            {/* Transcript Area */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '8px'
                }}
            >
                {transcript.map((entry, i) => (
                    <div key={i} style={{
                        alignSelf: entry.role === 'agent' ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        padding: '12px 16px',
                        background: entry.role === 'agent' ? 'var(--bg-card)' : 'var(--black)',
                        color: entry.role === 'agent' ? 'var(--text-primary)' : 'white',
                        borderRadius: '12px',
                        border: '1px solid var(--neutral-100)',
                        fontSize: '15px',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {entry.text}
                    </div>
                ))}

                {(currentUserText) && (
                    <div style={{
                        alignSelf: 'flex-end',
                        maxWidth: '85%',
                        padding: '12px 16px',
                        background: 'var(--black)',
                        opacity: 0.7,
                        color: 'white',
                        borderRadius: '12px',
                        border: '1px solid var(--neutral-800)',
                        fontSize: '15px',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {currentUserText}
                    </div>
                )}

                {(currentAgentText || isAgentSpeaking) && (
                    <div style={{
                        alignSelf: 'flex-start',
                        maxWidth: '85%',
                        padding: '12px 16px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        border: '1px solid var(--neutral-100)',
                        fontSize: '15px',
                        lineHeight: 1.5,
                        position: 'relative'
                    }}>
                        {currentAgentText || '...'}
                        {isAgentSpeaking && (
                            <div style={{ display: 'flex', gap: '3px', marginTop: '8px' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ width: '4px', height: '4px', background: 'var(--neutral-400)', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: `${i * 0.2}s` }} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mute Reminder */}
            {showMuteReminder && (
                <div style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    textAlign: 'center',
                    alignSelf: 'center',
                    fontWeight: 500,
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    You are muted. Click the microphone to respond.
                </div>
            )}

            {/* Footer Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: isMuted ? '#ef4444' : 'var(--black)',
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                {isWaitingForSubmit && !isMuted && (
                    <button
                        onClick={submitResponse}
                        style={{
                            padding: '12px 24px',
                            background: '#22c55e',
                            color: 'white',
                            borderRadius: '24px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            animation: 'fadeInUp 0.3s ease-out',
                            boxShadow: '0 4px 12px rgba(34,197,94,0.2)'
                        }}
                    >
                        Submit Response
                    </button>
                )}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
