import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from '../lib/math';
import { findBreakpoints } from '../lib/semantic-chunker';

describe('Math & Logic', () => {
    describe('cosineSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const sim = cosineSimilarity([1, 0], [1, 0]);
            expect(sim).toBeCloseTo(1);
        });

        it('should return 0 for orthogonal vectors', () => {
            const sim = cosineSimilarity([1, 0], [0, 1]);
            expect(sim).toBeCloseTo(0);
        });

        it('should return -1 for opposite vectors', () => {
            const sim = cosineSimilarity([1, 0], [-1, 0]);
            expect(sim).toBeCloseTo(-1);
        });
    });

    describe('findBreakpoints', () => {
        it('should split an array of numbers based on a percentile threshold', () => {
            // Given distances: [0.1, 0.2, 0.9, 0.15, 0.8]
            // Sorted: [0.1, 0.15, 0.2, 0.8, 0.9]
            // If percentile is 80th (index 3 => 0.8):
            // Then threshold is 0.8. Distances > 0.8 is just 0.9.
            // But if threshold is 75th, etc.

            const distances = [0.1, 0.2, 0.9, 0.15, 0.8];
            // Sort: 0.1, 0.15, 0.2, 0.8, 0.9
            const breakpoints = findBreakpoints(distances, 80); // 80th percentile means threshold is at index 3 (0.8)
            // Distances > 0.8 is 0.9, which is at index 2
            expect(breakpoints).toContain(2);
            expect(breakpoints).not.toContain(4); // 0.8 > 0.8 is false
        });

        it('should return empty array if no distances exceed threshold', () => {
            const distances = [0.1, 0.1, 0.1];
            const breakpoints = findBreakpoints(distances, 99);
            expect(breakpoints).toHaveLength(0);
        });
    });
});
