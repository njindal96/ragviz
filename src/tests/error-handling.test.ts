import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAnswerAction } from '@/app/actions';

// Use vi.hoisted to create vars that can be used in vi.mock
const { mockGenerateContent } = vi.hoisted(() => {
    return { mockGenerateContent: vi.fn() };
});

vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            getGenerativeModel() {
                return {
                    generateContent: mockGenerateContent
                };
            }
        }
    };
});

describe('Error Handling - generateAnswerAction', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-key';
    });

    it('should return a friendly error message on 429 Quota Exceeded', async () => {
        // Simulate a 429 error
        mockGenerateContent.mockRejectedValue({
            response: { status: 429 },
            message: '[429 Too Many Requests] Quota exceeded',
        });

        const result = await generateAnswerAction('query', 'context');

        // Since Stage F, 429s trigger a failover across all candidate models.
        // If they all fail, it returns a graceful error object.
        expect(result.text).toContain('Generation Error');
        expect(result.text).toContain('congested');
        expect(result.modelName).toBe('Error');
    });

    it('should return a generic error message on other errors', async () => {
        // Simulate a 500 error
        mockGenerateContent.mockRejectedValue(new Error('Internal Server Error'));

        const result = await generateAnswerAction('query', 'context');

        expect(result.text).toContain('Generation Error');
        expect(result.modelName).toBe('Error');
    });

    it('should return successfully when API works', async () => {
        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => 'Valid answer',
            },
        });

        const result = await generateAnswerAction('query', 'context');
        expect(result.text).toBe('Valid answer');
        expect(result.modelName).toBe('gemini-2.0-flash');
    });
});
