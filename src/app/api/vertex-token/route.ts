import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

/**
 * API route to serve short-lived OAuth 2.0 access tokens to the frontend.
 * This allows the client-side LiveExperienceUI to connect to Vertex AI 
 * using BidiGenerateContent without exposing long-lived credentials.
 */
export async function GET() {
    try {
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        
        if (!tokenResponse.token) {
            throw new Error('Failed to generate access token');
        }

        return NextResponse.json({
            token: tokenResponse.token,
            projectId: await auth.getProjectId(),
        });
    } catch (error) {
        console.error('Vertex Token generation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
