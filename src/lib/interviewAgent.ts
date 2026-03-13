import { LlmAgent, FunctionTool, InMemoryRunner } from '@google/adk';
import { z } from 'zod';
import type { ResearchGuide, MainQuestion } from './types';
import { SUPPORTED_LANGUAGES } from './types';

/* ------------------------------------------------------------------ */
/*  ADK Interview Agent — built with Gemini ADK `LlmAgent`            */
/* ------------------------------------------------------------------ */

/**
 * Creates an ADK `LlmAgent` configured for a specific study.
 * The agent uses FunctionTools to structure the interview flow:
 *   - recordResponse: logs a participant's answer
 *   - moveToNextQuestion: advances to the next question
 *   - endInterview: signals interview completion
 */
export function createInterviewAgent(config: {
    studyType: string;
    goals: string;
    audience: string;
    guide: ResearchGuide;
    maxFollowUps: number;
    lang?: string;
    smartSkipping?: boolean;
}) {
    const guideText = formatGuide(config.guide);
    const targetLang = SUPPORTED_LANGUAGES.find(l => l.code === (config.lang || 'en-US'))?.label || 'English';

    // --- Tools ---
    const recordResponse = new FunctionTool({
        name: 'record_response',
        description: 'Record a noteworthy quote or key insight from the participant\'s response for later analysis.',
        parameters: z.object({
            quote: z.string().describe('The exact or paraphrased quote from the participant.'),
            questionIndex: z.number().describe('The index of the question this response relates to.'),
            isFollowUp: z.boolean().describe('Whether this was a response to a follow-up question.'),
            sentiment: z.string().optional().describe('The sentiment: positive, negative, neutral, or mixed.'),
        }),
        execute: ({ quote, questionIndex, isFollowUp, sentiment }) => {
            return {
                status: 'recorded',
                quote,
                questionIndex,
                isFollowUp,
                sentiment: sentiment || 'neutral',
            };
        },
    });

    const moveToNextQuestion = new FunctionTool({
        name: 'move_to_next_question',
        description: 'Move to the next question in the interview guide after the current question and its follow-ups are complete.',
        parameters: z.object({
            currentIndex: z.number().describe('The index of the question just completed.'),
            followUpsAsked: z.number().describe('How many follow-up questions were asked for this question.'),
        }),
        execute: ({ currentIndex, followUpsAsked }) => {
            return {
                status: 'moved',
                completedQuestion: currentIndex,
                followUpsAsked,
                nextIndex: currentIndex + 1,
            };
        },
    });

    const endInterview = new FunctionTool({
        name: 'end_interview',
        description: 'End the interview session. Call this after all exit questions are complete.',
        parameters: z.object({
            summary: z.string().describe('A brief summary of key findings from this interview.'),
        }),
        execute: ({ summary }) => {
            return {
                status: 'ended',
                summary,
            };
        },
    });

    // --- Agent ---
    const agent = new LlmAgent({
        name: 'fieldwork_interview_agent',
        model: 'gemini-2.5-flash',
        description: 'AI UX research moderator that conducts structured interviews with dynamic follow-ups.',
        instruction: `You are Fieldwork, an expert AI UX research moderator conducting a ${config.studyType} interview.

SYSTEM DIRECTIVE: 
You MUST conduct the entire interview and format all of your responses strictly in the specified language: ${targetLang}. 
You MUST ask the scheduled main questions directly from the provided script WITHOUT ANY ALTERATION (except translating them accurately to ${targetLang} if the script is in another language). It is forbidden to add conversational fluff, leading context, or preamble to the script questions. Ask them verbatim.

RESEARCH GOALS:
${config.goals}

TARGET AUDIENCE:
${config.audience}

INTERVIEW GUIDE:
${guideText}

MAX FOLLOW-UPS PER QUESTION: ${config.maxFollowUps}

${config.smartSkipping ? `SMART QUESTION SKIPPING ENABLED:
As an expert moderator, you should evaluate if a participant's previous answers already sufficiently address future questions in the guide. 
If a future question's core intent has already been answered, use the 'move_to_next_question' tool to skip it and proceed to the next relevant question. 
Ensure the conversation remains natural and avoid asking the participant for information they have already provided.` : ''}
INTERVIEW PROTOCOL:
1. Start by warmly greeting the participant and explaining the interview format.
2. Ask pre-screening questions one at a time to verify they match the target audience.
3. If they don't match, call end_interview.
4. Ask main interview questions strictly one at a time. After each participant response:
   - Use record_response to capture notable quotes
   - Ask up to ${config.maxFollowUps} contextual follow-up questions if needed
   - Call move_to_next_question and proceed
5. After all main questions, ask exit questions.
6. When asking the next scheduled question from the guide, YOU MUST ASK IT EXACTLY AS WRITTEN. Do NOT add conversational fluff, leading context, or preamble to the guide questions. Ask them verbatim.
7. Call end_interview when complete.

STYLE RULES:
- Never lead the participant or suggest answers.
- Ask ONE question at a time — never stack multiple questions.
- Ask questions from the guide exactly as written.
- Keep follow-ups strictly concise (1 sentence max).
- Do not invent new main questions.`,
        tools: [recordResponse, moveToNextQuestion, endInterview],
    });

    return agent;
}

// Cache runners per study so sessions persist across requests
const runnerCache = new Map<string, InMemoryRunner>();

/**
 * Gets or creates a cached InMemoryRunner for a study.
 */
export function getRunner(cacheKey: string, agent: LlmAgent): InMemoryRunner {
    let runner = runnerCache.get(cacheKey);
    if (!runner) {
        runner = new InMemoryRunner({
            agent,
            appName: 'fieldwork',
        });
        runnerCache.set(cacheKey, runner);
    }
    return runner;
}

/**
 * Runs the interview agent for a single turn using ADK InMemoryRunner.
 */
export async function runInterviewTurn(
    runner: InMemoryRunner,
    sessionId: string,
    userId: string,
    userMessage: string,
): Promise<{ message: string; action: string; isEnd: boolean }> {
    // Get or create session
    let session = await runner.sessionService.getSession({
        appName: 'fieldwork',
        userId,
        sessionId,
    });

    if (!session) {
        session = await runner.sessionService.createSession({
            appName: 'fieldwork',
            userId,
            sessionId,
        });
    }

    // Build the user content
    const content = {
        role: 'user' as const,
        parts: [{ text: userMessage }],
    };

    // Run the agent
    let agentMessage = '';
    let isEnd = false;
    let action = 'continue';

    const events = runner.runAsync({
        userId,
        sessionId: session.id,
        newMessage: content,
    });

    for await (const event of events) {
        // Check for text content from the agent
        if (event.content?.parts) {
            for (const part of event.content.parts) {
                if ('text' in part && part.text) {
                    agentMessage += part.text;
                }
                if ('functionCall' in part && part.functionCall) {
                    if (part.functionCall.name === 'end_interview') {
                        isEnd = true;
                        action = 'end';
                    } else if (part.functionCall.name === 'move_to_next_question') {
                        action = 'next_question';
                    } else if (part.functionCall.name === 'record_response') {
                        action = 'recorded';
                    }
                }
            }
        }
    }

    return { message: agentMessage, action, isEnd };
}

function formatGuide(guide: ResearchGuide): string {
    let text = 'PRE-SCREENING QUESTIONS:\n';
    guide.preScreen.forEach((q, i) => {
        text += `  ${i + 1}. ${q.text}\n`;
    });

    text += '\nMAIN INTERVIEW QUESTIONS:\n';
    guide.mainQuestions.forEach((q: MainQuestion, i: number) => {
        text += `  ${i + 1}. ${q.text}\n`;
        q.followUps.forEach((fu: string, fi: number) => {
            text += `     Follow-up ${fi + 1}: ${fu}\n`;
        });
    });

    text += '\nEXIT QUESTIONS:\n';
    guide.exitQuestions.forEach((q, i) => {
        text += `  ${i + 1}. ${q.text}\n`;
    });

    return text;
}
