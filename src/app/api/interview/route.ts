import { NextRequest, NextResponse } from 'next/server';
import { createInterviewAgent, getRunner, runInterviewTurn } from '@/lib/interviewAgent';

// Cache agents per study to avoid recreating
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agentCache = new Map<string, any>();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { studyType, goals, audience, guide, maxFollowUps, messages, sessionId, lang, smartSkipping } = body;

        // Create or get cached agent for this study config
        const cacheKey = `${studyType}_${(goals || '').substring(0, 50)}_${lang || 'en-US'}_${smartSkipping ? 'skip' : 'noskip'}`;
        let agent = agentCache.get(cacheKey);
        if (!agent) {
            agent = createInterviewAgent({
                studyType,
                goals,
                audience,
                guide,
                maxFollowUps: maxFollowUps || 2,
                lang: lang || 'en-US',
                smartSkipping,
            });
            agentCache.set(cacheKey, agent);
        }

        // Get or create cached runner (maintains session state)
        const runner = getRunner(cacheKey, agent);

        // Get the user's last message, or use a start prompt
        const lastUserMessage = messages && messages.length > 0
            ? messages[messages.length - 1].text
            : 'Hello, I am ready to start the interview.';

        const userId = sessionId || 'participant';
        const sid = sessionId || `session_${Date.now()}`;

        const result = await runInterviewTurn(
            runner,
            sid,
            userId,
            lastUserMessage,
        );

        return NextResponse.json({
            message: result.message,
            action: result.isEnd ? 'end' : result.action,
            questionIndex: 0,
            isFollowUp: false,
        });
    } catch (error) {
        console.error('Interview agent error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Interview agent error' },
            { status: 500 }
        );
    }
}
