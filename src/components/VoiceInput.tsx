'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}

export function VoiceInput({ value, onChange, placeholder, rows = 4 }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const valueRef = useRef(value);

    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const startRecording = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) return;

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = valueRef.current;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript = (finalTranscript + ' ' + transcript).trim();
                    onChange(finalTranscript);
                } else {
                    interim += transcript;
                }
            }
            if (interim) {
                onChange((finalTranscript + ' ' + interim).trim());
            }
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    }, [onChange]);

    const stopRecording = useCallback(() => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setIsRecording(false);
    }, []);

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <button
                    type="button"
                    className={`voice-btn ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                    {isRecording ? <MicOff size={16} strokeWidth={1.5} /> : <Mic size={16} strokeWidth={1.5} />}
                </button>
                {isRecording && (
                    <span className="caption" style={{ color: 'var(--text-primary)' }}>
                        Listening…
                    </span>
                )}
            </div>
            <textarea
                className="textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
            />
        </div>
    );
}
