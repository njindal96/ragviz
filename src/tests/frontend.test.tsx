import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../components/stage-a/FileUpload';
import { ChunkVisualizer } from '../components/stage-b/ChunkVisualizer';
import { Generator } from '../components/stage-e/Generator';

// Mock Server Actions
vi.mock('../app/actions', () => ({
    parsePdfAction: vi.fn(),
    generateAnswerAction: vi.fn(),
}));

describe('Frontend Components', () => {

    it('renders FileUpload component correctly', () => {
        // Stage A Smoke Test
        render(<FileUpload onTextLoaded={() => { }} />);
        expect(screen.getByText(/Drop your PDF here/i)).toBeDefined();
        expect(screen.getByText(/Select File/i)).toBeDefined();
    });

    it('renders ChunkVisualizer with chunks', () => {
        // Stage B Integration Test
        const mockChunks = [
            { id: '1', text: 'Chunk 1', start: 0, end: 7, embedding: [] },
            { id: '2', text: 'Chunk 2', start: 8, end: 15, embedding: [] }
        ];

        // Convert to RagChunk shape (Chunk + embedding)
        // The component expects RagChunk[] which extends Chunk
        // We can cast or just ensure properties match

        render(
            <ChunkVisualizer
                text="Chunk 1 Chunk 2"
                chunks={mockChunks as any}
                params={{ delimiter: '\n', semantic: false, semanticThreshold: 0.8, size: 200, overlap: 20 }}
                onParamsChange={() => { }}
                onRunPipeline={() => { }}
                onTriggerManualSave={() => { }}
                isProcessing={false}
            />
        );

        expect(screen.getByText('Chunk 1')).toBeDefined();
        expect(screen.getByText('Chunk 2')).toBeDefined();
    });

    it('renders Generator component', () => {
        // Stage E Smoke Test
        render(
            <Generator
                query="test query"
                topChunks={[{ id: '1', text: 'Context', start: 0, end: 0, embedding: [] }] as any}
            />
        );
        expect(screen.getByText(/Grounded Generation/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Generate Answer/i })).toBeDefined();
    });

});
