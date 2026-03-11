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
- Generate 3-5 pre-screening questions to verify the participant matches the target audience
- Generate up to ${maxQuestions} main interview questions that address the research goals
- For each main question, generate exactly ${maxFollowUps} follow-up questions that probe deeper
- Generate 2-3 exit questions for final thoughts and anything the participant wants to add
- Questions should be open-ended, non-leading, and conversational
- Tailor questions specifically to the research type and goals
- Pre-screening questions should be factual/qualifying (yes/no or short answer)
- Main questions should explore behaviors, experiences, pain points, and needs
- Follow-ups should dig deeper based on likely responses

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
