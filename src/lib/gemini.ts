import { VertexAI } from '@google-cloud/vertexai';

export function getGeminiClient() {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    
    // Vertex AI uses Application Default Credentials (ADC) when running on GCP
    const vertexAI = new VertexAI({ project, location });
    return vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}
