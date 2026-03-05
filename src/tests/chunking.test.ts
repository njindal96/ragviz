import { describe, it, expect } from 'vitest';
import { splitByDelimiter, mergeBySemantic, enforceSize, Chunk } from '../lib/chunking';

describe('Chunking Logic', () => {

    describe('splitByDelimiter', () => {
        it('should split text by newline', () => {
            const text = "Hello.\nWorld.";
            const chunks = splitByDelimiter(text, "\n");
            expect(chunks).toHaveLength(2);
            expect(chunks[0].text).toBe("Hello.\n");
            expect(chunks[1].text).toBe("World.");
        });

        it('should handle text without delimiter', () => {
            const text = "Hello World";
            const chunks = splitByDelimiter(text, "\n");
            expect(chunks).toHaveLength(1);
            expect(chunks[0].text).toBe("Hello World");
        });

        it('should handle empty text', () => {
            const chunks = splitByDelimiter("", "\n");
            expect(chunks).toHaveLength(0); // My implementation currently returns []
        });
    });

    describe('enforceSize', () => {
        it('should respect max size', () => {
            const input: Chunk[] = [{ id: '1', text: '1234567890', start: 0, end: 10 }];
            // Size 5, Overlap 0
            const chunks = enforceSize(input, 5, 0);
            expect(chunks).toHaveLength(2);
            expect(chunks[0].text).toBe('12345');
            expect(chunks[1].text).toBe('67890');
        });

        it('should respect overlap', () => {
            const input: Chunk[] = [{ id: '1', text: '1234567890', start: 0, end: 10 }];
            // Size 6, Overlap 2 -> [0,6), [4,10)
            const chunks = enforceSize(input, 6, 2);
            expect(chunks).toHaveLength(2);
            expect(chunks[0].text).toBe('123456');
            expect(chunks[1].text).toBe('567890');
        });

        it('should default overlap to size-1 if invalid', () => {
            const input: Chunk[] = [{ id: '1', text: '123', start: 0, end: 3 }];
            // Size 2, Overlap 5 -> Should behave safe
            const chunks = enforceSize(input, 2, 5);
            expect(chunks.length).toBeGreaterThan(0);
        });
    });

    describe('mergeBySemantic', () => {
        it('should merge similar chunks', () => {
            const c1: Chunk = { id: '1', text: 'A', start: 0, end: 1, embedding: [1, 0] };
            const c2: Chunk = { id: '2', text: 'B', start: 1, end: 2, embedding: [0.99, 0.05] }; // Very similar

            const merged = mergeBySemantic([c1, c2], 0.8);
            expect(merged).toHaveLength(1);
            expect(merged[0].text).toBe('A B');
        });

        it('should not merge dissimilar chunks', () => {
            const c1: Chunk = { id: '1', text: 'A', start: 0, end: 1, embedding: [1, 0] };
            const c2: Chunk = { id: '2', text: 'B', start: 1, end: 2, embedding: [0, 1] }; // Orthogonal

            const merged = mergeBySemantic([c1, c2], 0.8);
            expect(merged).toHaveLength(2);
        });
    });
});
