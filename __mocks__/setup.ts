import { vi } from 'vitest';

// Intercept all calls to GoogleGenerativeAI
vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            getGenerativeModel() {
                return {
                    generateContent: vi.fn().mockResolvedValue({
                        response: {
                            text: () => "This is a mocked AI response."
                        }
                    })
                };
            }
        }
    };
});

// Intercept Transformers.js to prevent WASM download in tests
vi.mock('@xenova/transformers', () => ({
    pipeline: vi.fn().mockResolvedValue(
        vi.fn().mockImplementation((inputs) => {
            const numInputs = Array.isArray(inputs) ? inputs.length : 1;
            const dims = numInputs === 1 ? [384] : [numInputs, 384];
            const data = new Float32Array(numInputs * 384).fill(0.1);
            return Promise.resolve({ data, dims });
        })
    ),
    env: { allowLocalModels: true }
}));
