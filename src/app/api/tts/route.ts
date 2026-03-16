import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

function createWavFile(base64Pcm: string, sampleRate = 24000, numChannels = 1): string {
    const rawPcm = Buffer.from(base64Pcm, 'base64');
    const header = Buffer.alloc(44);

    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + rawPcm.length, 4);
    header.write('WAVE', 8);

    // 'fmt ' sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22); // NumChannels
    header.writeUInt32LE(sampleRate, 24); // SampleRate
    header.writeUInt32LE(sampleRate * numChannels * 2, 28); // ByteRate
    header.writeUInt16LE(numChannels * 2, 32); // BlockAlign
    header.writeUInt16LE(16, 34); // BitsPerSample

    // 'data' sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(rawPcm.length, 40);

    const wavBuffer = Buffer.concat([header, rawPcm]);
    return wavBuffer.toString('base64');
}

export async function POST(request: NextRequest) {
    try {
        const { text, voiceName } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
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
        const isPcm = inlineData.mimeType.toLowerCase().includes('pcm');
        const finalBase64 = isPcm ? createWavFile(inlineData.data, 24000) : inlineData.data;

        // Return base64 audio data
        return NextResponse.json({
            audio: finalBase64,
            mimeType: 'audio/wav',
        });
    } catch (error) {
        console.error('TTS error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'TTS generation failed' },
            { status: 500 }
        );
    }
}
