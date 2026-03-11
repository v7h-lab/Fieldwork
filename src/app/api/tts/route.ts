import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
    try {
        const { text, voiceName } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ role: 'user', parts: [{ text }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceName || 'Aoede',
                        },
                    },
                },
            },
        });

        // Extract audio data from response
        const audioPart = response.candidates?.[0]?.content?.parts?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => p.inlineData
        );

        if (!audioPart || !('inlineData' in audioPart)) {
            return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
        }

        const inlineData = audioPart.inlineData as { data: string; mimeType: string };

        // Return base64 audio data
        return NextResponse.json({
            audio: inlineData.data,
            mimeType: inlineData.mimeType || 'audio/wav',
        });
    } catch (error) {
        console.error('TTS error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'TTS generation failed' },
            { status: 500 }
        );
    }
}
