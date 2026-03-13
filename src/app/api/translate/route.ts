import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { texts, sourceLang } = body;

        if (!texts || !Array.isArray(texts)) {
            return NextResponse.json({ error: 'Missing or invalid texts array' }, { status: 400 });
        }
        if (texts.length === 0) {
            return NextResponse.json({ translations: [] });
        }

        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an expert translator. 
Translate the following array of strings from ${sourceLang} into exactly the same number of English strings.
Keep UX research domain terminology natural.

INPUT ARRAY:
${JSON.stringify(texts)}

Return ONLY a perfectly formatted JSON object with a single "translations" key containing a string array of the translated texts. Example:
{
  "translations": ["translated string 1", "translated string 2"]
}
DO NOT wrap the response in markdown blocks.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        let jsonStr = text.trim();
        // Remove markdown formatting if the model still included it
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const parsed = JSON.parse(jsonStr);

        return NextResponse.json({
            translations: parsed.translations || []
        });
    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Translation failed' },
            { status: 500 }
        );
    }
}
