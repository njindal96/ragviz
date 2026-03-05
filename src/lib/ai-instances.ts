import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Local AI Singleton ---
export class LocalAISingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: Promise<any> | null = null;

    static async getInstance(progressCallback?: Function) {
        if (process.env.NEXT_PUBLIC_MOCK_AI === 'true') {
            console.log('[LocalAISingleton] ZERO-CREDIT MODE ACTIVE. Returning mock pipeline.');
            return async (text: string | string[], options?: any) => {
                // Return dummy embedding tensor
                const numInputs = Array.isArray(text) ? text.length : 1;
                const dims = numInputs === 1 ? [384] : [numInputs, 384];
                const data = new Float32Array(numInputs * 384).fill(0.123);
                return { data, dims };
            };
        }

        if (this.instance === null) {
            const { pipeline } = await import('@xenova/transformers');
            this.instance = pipeline(this.task as any, this.model, { progress_callback: progressCallback });
        }
        return this.instance;
    }
}

// --- Cloud AI Singleton ---
export class CloudAISingleton {
    static client: GoogleGenerativeAI | null = null;

    static getClient(): GoogleGenerativeAI {
        if (this.client === null) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
            this.client = new GoogleGenerativeAI(apiKey);
        }
        return this.client;
    }

    static getModel(modelName: string) {
        return this.getClient().getGenerativeModel({ model: modelName });
    }
}
