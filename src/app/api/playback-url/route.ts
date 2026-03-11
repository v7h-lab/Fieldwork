import { NextRequest, NextResponse } from 'next/server';
import { getPlaybackUrl } from '@/lib/gcs';

export async function POST(request: NextRequest) {
    try {
        const { filePath } = await request.json();
        const url = await getPlaybackUrl(filePath);
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Playback URL error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate playback URL' },
            { status: 500 }
        );
    }
}
