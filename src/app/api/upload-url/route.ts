import { NextRequest, NextResponse } from 'next/server';
import { getUploadUrl } from '@/lib/gcs';

export async function POST(request: NextRequest) {
    try {
        const { studyId, participantId } = await request.json();
        const timestamp = Date.now();
        const filePath = `studies/${studyId}/recordings/${participantId}_${timestamp}.webm`;
        const url = await getUploadUrl(filePath);
        return NextResponse.json({ url, filePath });
    } catch (error) {
        console.error('Upload URL error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}
