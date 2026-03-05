import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChunkVisualizer } from '../stage-b/ChunkVisualizer';

describe('VisualSplitter (ChunkVisualizer)', () => {
    it('should render distinct chunks based on input', () => {
        // Given 1000 chars simulated as 5 chunks
        const chunks = Array.from({ length: 5 }, (_, i) => ({
            id: `id-${i}`,
            text: `Chunk ${i} of length 200`,
            start: i * 200,
            end: (i + 1) * 200,
            embedding: []
        }));

        render(
            <ChunkVisualizer
                text={chunks.map(c => c.text).join(' ')}
                chunks={chunks}
                params={{ delimiter: '', semantic: false, semanticThreshold: 80, size: 200, overlap: 0 }}
                onParamsChange={() => { }}
                onRunPipeline={() => { }}
                onTriggerManualSave={() => { }}
                isProcessing={false}
            />
        );

        // Verify it renders 5 distinct chunk texts
        for (let i = 0; i < 5; i++) {
            expect(screen.getByText(`Chunk ${i} of length 200`)).toBeDefined();
        }
    });

    it('should enter manual mode and trigger save', () => {
        const mockSave = vi.fn();
        const chunks = [
            { id: '1', text: 'Chunk 1 text', start: 0, end: 12 }
        ];

        render(
            <ChunkVisualizer
                text="Chunk 1 text"
                chunks={chunks}
                params={{ delimiter: '', semantic: false, semanticThreshold: 80, size: 200, overlap: 0 }}
                onParamsChange={() => { }}
                onRunPipeline={() => { }}
                onTriggerManualSave={mockSave}
                isProcessing={false}
            />
        );

        // Enter manual editor
        const manualBtn = screen.getByRole('button', { name: /Manual Editor/i });
        fireEvent.click(manualBtn);

        // Verify textarea appears using a more specific query
        const editor = screen.getByPlaceholderText(/Loading chunks/i);
        expect(editor).toBeDefined();

        // Save & Exit
        const saveBtn = screen.getByRole('button', { name: /Save & Exit/i });
        fireEvent.click(saveBtn);

        // Verify save was called
        expect(mockSave).toHaveBeenCalled();
    });
});
