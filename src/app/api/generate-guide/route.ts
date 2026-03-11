import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { RESEARCH_TYPES, ResearchType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { researchType, goals, audience, inputMethod, maxQuestions, maxFollowUps } = body;

    const typeLabel = RESEARCH_TYPES[researchType as ResearchType]?.label || researchType;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert UX researcher. Generate a complete research interview guide for the following study.

STUDY TYPE: ${typeLabel}
RESEARCH GOALS: ${goals}
TARGET AUDIENCE: ${audience}
INTERVIEW METHOD: ${inputMethod}
MAX FOLLOW-UPS PER QUESTION: ${maxFollowUps}

Generate a structured JSON response with the following format:
{
  "preScreen": [
    { "id": "ps-1", "text": "question text" }
  ],
  "mainQuestions": [
    { "id": "mq-1", "text": "question text", "followUps": ["follow-up 1", "follow-up 2"] }
  ],
  "exitQuestions": [
    { "id": "eq-1", "text": "question text" }
  ]
}

Guidelines:
- Generate exactly 1 (or at most 2) highly direct, open-ended pre-screening questions to verify the participant matches the target audience
- For pre-screening, DO NOT use an elaborated multi-question funnel (e.g., asking about hobbies -> board games -> chess). Ask a single, direct question that gets straight to the point (e.g., "Could you describe your recent experiences playing chess?").
- Generate up to ${maxQuestions} main interview questions that address the research goals
- For each main question, generate exactly ${maxFollowUps} follow-up questions that probe deeper
- Generate 2-3 exit questions for final thoughts and anything the participant wants to add
- CRITICAL: STRICTLY adhere to UX research best practices for question framing.
- CRITICAL: NEVER ask leading, suggesting, or binary (yes/no) questions (e.g., DO NOT ask "Are you between 18 and 35?").
- CRITICAL: ALWAYS use open-ended, neutral framing (e.g., INSTEAD ask "Could you describe your current age range?").
- Pre-screening questions MUST be open-ended, allowing the user to self-describe their qualifications without being hinted at the "correct" answer.
- Main questions should explore behaviors, experiences, pain points, and needs neutrally.
- Follow-ups should dig deeper based on likely responses without feeding words into the participant's mouth.

Return ONLY valid JSON, no markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const guide = JSON.parse(jsonStr);

    return NextResponse.json({ guide });
  } catch (error) {
    console.error('Guide generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate guide' },
      { status: 500 }
    );
  }
}
