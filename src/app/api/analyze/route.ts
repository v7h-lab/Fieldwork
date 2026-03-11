import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studyType, goals, responses } = body;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a senior UX researcher analyzing interview responses from a ${studyType} study.

RESEARCH GOALS: ${goals}

INTERVIEW RESPONSES:
${JSON.stringify(responses, null, 2)}

Analyze all responses and generate insights. Return a JSON object:

{
  "insights": [
    {
      "id": "unique-id",
      "theme": "Short theme name",
      "summary": "2-3 sentence summary of the insight",
      "confidence": 0.0-1.0,
      "quotes": [
        {
          "participantId": "id",
          "participantName": "name",
          "text": "relevant quote from transcript",
          "videoTimestamp": number_or_null
        }
      ]
    }
  ],
  "responseRate": number,
  "avgDuration": number,
  "topTakeaways": ["string"]
}

Guidelines:
- Identify 3-8 key themes across all responses
- Each theme should have supporting quotes from participants
- Confidence reflects how many participants support the theme
- Be specific and actionable in summaries
- Group related findings thematically
- Include video timestamps for quotes when available

Return ONLY valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
