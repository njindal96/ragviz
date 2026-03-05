import { CloudAISingleton } from './ai-instances';

export const GEMINI_CANDIDATES = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
];

export async function generateWithFailover(prompt: string, retryCount = 0): Promise<any> {
    if (process.env.MOCK_AI === 'true') {
        console.log('[GeminiService] ZERO-CREDIT MODE ACTIVE. Returning mock response.');
        await new Promise(r => setTimeout(r, 500));
        return {
            text: "This is a mocked AI response.",
            modelName: "mock-gemini-model"
        };
    }

    for (const modelName of GEMINI_CANDIDATES) {
        try {
            console.log(`[GeminiService] Attempting generation with ${modelName}`);
            const model = CloudAISingleton.getModel(modelName);
            const result = await model.generateContent(prompt);
            return {
                text: result.response.text(),
                modelName
            };
        } catch (error: any) {
            console.warn(`[GeminiService] ${modelName} failed:`, error.message || error);

            const isRateLimit = error.status === 429 || error.response?.status === 429 || error.message?.includes('429') || error.message?.includes('Quota exceeded') || error.message?.includes('quota');
            const isOverloaded = error.status === 503 || error.response?.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded');

            if ((isRateLimit || isOverloaded) && retryCount < 2) {
                console.log(`[GeminiService] Rate limit hit on ${modelName}, backing off...`);

                // Try to extract retryDelay from error if it exists, otherwise use exponential backoff
                let delay = Math.pow(2, retryCount) * 1000;
                if (error.errorDetails) {
                    const retryInfo = error.errorDetails.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
                    if (retryInfo && retryInfo.retryDelay) {
                        const parsedDelay = parseInt(retryInfo.retryDelay);
                        if (!isNaN(parsedDelay)) delay = parsedDelay * 1000;
                    }
                }

                await new Promise(res => setTimeout(res, delay));
                return generateWithFailover(prompt, retryCount + 1);
            }

            console.error(`[GeminiService] ${modelName} failed. Moving to next.`);
            continue;
        }
    }

    // Global Error Handler
    console.error('[GeminiService] All Gemini models failed.');
    return {
        error: true,
        message: "AI services are currently congested. Please try again in 30 seconds."
    };
}
