import { cosineSimilarity } from './math';

function generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 11);
}

export interface Chunk {
    id: string;
    text: string;
    start: number;
    end: number;
    embedding?: number[]; // Added for semantic context
}

/**
 * Stage 1: Split text by a specific delimiter.
 * This creates the initial "atoms" for the pipeline.
 */
export function splitByDelimiter(text: string, delimiter: string): Chunk[] {
    const chunks: Chunk[] = [];
    const parts = text.split(delimiter);
    let currentPos = 0;

    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        const isDelimiterFollowing = i < parts.length - 1;

        if (part.length > 0) {
            // If content exists, start a new chunk, adding delimiter if it's not the last part
            const fullText = isDelimiterFollowing ? part + delimiter : part;
            chunks.push({
                id: generateId(),
                text: fullText,
                start: currentPos,
                end: currentPos + fullText.length
            });
            currentPos += fullText.length;
        } else if (isDelimiterFollowing) {
            // Content is empty, meaning consecutive delimiters (e.g. \n\n)
            // Append this delimiter to the previous chunk if it exists
            if (chunks.length > 0) {
                const lastChunk = chunks[chunks.length - 1];
                lastChunk.text += delimiter;
                lastChunk.end += delimiter.length;
                currentPos += delimiter.length;
            } else {
                // Leading delimiter (empty space before first delimiter).
                // Usually safe to ignore, or track as offset. 
                currentPos += delimiter.length;
            }
        }
    }
    return chunks;
}

/**
 * Stage 2: Semantic Merging.
 */
export function mergeBySemantic(atoms: Chunk[], threshold: number): Chunk[] {
    if (atoms.length === 0) return [];
    if (atoms.length === 1) return atoms;

    const merged: Chunk[] = [];
    let currentBuffer: Chunk = { ...atoms[0] };

    for (let i = 1; i < atoms.length; i++) {
        const nextChunk = atoms[i];
        if (currentBuffer.embedding && nextChunk.embedding) {
            const sim = cosineSimilarity(currentBuffer.embedding, nextChunk.embedding);
            if (sim >= threshold) {
                currentBuffer.text += ' ' + nextChunk.text;
                currentBuffer.end = nextChunk.end;
                currentBuffer.embedding = undefined;
            } else {
                merged.push(currentBuffer);
                currentBuffer = { ...nextChunk };
            }
        } else {
            merged.push(currentBuffer);
            currentBuffer = { ...nextChunk };
        }
    }
    merged.push(currentBuffer);
    return merged;
}

/**
 * Stage 3: Size & Overlap Enforcement.
 */
export function enforceSize(inputChunks: Chunk[], size: number, overlap: number): Chunk[] {
    console.log(`[Chunking] enforceSize called. Inputs: ${inputChunks.length}, Size: ${size}, Overlap: ${overlap}`);
    const output: Chunk[] = [];

    // Safety checks
    if (size <= 0) {
        console.error('[Chunking] Invalid size <= 0');
        return [];
    }
    if (size <= overlap) {
        console.warn(`[Chunking] Size ${size} <= Overlap ${overlap}. Adjusting overlap.`);
        overlap = size - 1;
    }

    for (const chunk of inputChunks) {
        if (chunk.text.length <= size) {
            output.push(chunk);
            continue;
        }

        let i = 0;
        const text = chunk.text;

        // Prevent infinite loop if size-overlap <= 0 (handled above, but double check)
        const step = size - overlap;
        if (step <= 0) break;

        while (i < text.length) {
            const end = Math.min(i + size, text.length);
            const part = text.slice(i, end);
            const absStart = chunk.start + i;

            output.push({
                id: generateId(),
                text: part,
                start: absStart,
                end: absStart + part.length
            });

            if (end === text.length) break;
            i += step;
        }
    }
    if (output.length > 0) {
        console.log(`[Chunking] First chunk text preview: "${output[0].text.substring(0, 50)}..."`);
    }
    console.log(`[Chunking] enforceSize finished. Outputs: ${output.length}`);
    return output;
}

export function generateChunks(text: string, size: number, overlap: number): Chunk[] {
    const single = [{ id: 'root', text, start: 0, end: text.length }];
    return enforceSize(single, size, overlap);
}
