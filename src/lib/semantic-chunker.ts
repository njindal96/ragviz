import { LocalAISingleton } from './ai-instances';
import { cosineSimilarity } from './math';
import { Chunk } from './chunking';

function generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 11);
}

// Basic sentence tokenizer. Better than naive split.
export function tokenizeSentences(text: string): { text: string, start: number, end: number }[] {
    // Regex matches a sentence boundary (.?! followed by space or end of string)
    // Doesn't perfectly handle Mr. or Dr., but good enough for MVP. A more robust regex can be used.
    // Improved regex to handle basic abbreviations
    const sentences = [];
    const regex = /[^.!?\s][^.!?]*(?:(?:Dr|Mr|Mrs|Ms|Prof|St|etc|al|vs)\.[^.!?]*)*[.!?]+(?=\s|$)/gi;

    let match;
    while ((match = regex.exec(text)) !== null) {
        sentences.push({
            text: match[0].trim(),
            start: match.index,
            end: match.index + match[0].length
        });
    }

    // Fallback if no punctuation or just one huge block
    if (sentences.length === 0 && text.trim().length > 0) {
        sentences.push({ text: text.trim(), start: 0, end: text.length });
    }

    return sentences;
}

export async function generateBatchedEmbeddings(sentences: string[]): Promise<number[][]> {
    const extractor = await LocalAISingleton.getInstance();
    // Transformers.js pipeline supports array input for batching
    const output = await extractor(sentences, { pooling: 'mean', normalize: true });
    // Output is a Tensor. If we passed N sentences, shape is [N, EmbedDim]
    const embeddings: number[][] = [];
    const data = output.data;
    const dims = output.dims; // [num_sentences, embedding_dim]

    if (dims.length === 2) {
        const [numSentences, embedDim] = dims;
        for (let i = 0; i < numSentences; i++) {
            const embed = Array.from(data.slice(i * embedDim, (i + 1) * embedDim));
            embeddings.push(embed as number[]);
        }
    } else {
        // Fallback if single dimension
        embeddings.push(Array.from(data) as number[]);
    }
    return embeddings;
}

export function calculateDistances(embeddings: number[][]): number[] {
    const distances: number[] = [];
    for (let i = 0; i < embeddings.length - 1; i++) {
        const sim = cosineSimilarity(embeddings[i], embeddings[i + 1]);
        const distance = 1 - sim;
        distances.push(distance);
    }
    return distances;
}

export function findBreakpoints(distances: number[], percentile: number): number[] {
    if (distances.length === 0) return [];

    const sortedDistances = [...distances].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sortedDistances.length - 1));
    const threshold = sortedDistances[index];

    const breakpoints: number[] = [];
    for (let i = 0; i < distances.length; i++) {
        if (distances[i] > threshold) {
            breakpoints.push(i);
        }
    }
    return breakpoints;
}

export async function semanticChunkText(text: string, sensitivity: number): Promise<Chunk[]> {
    console.log('[SemanticChunker] Start tokenizing...');
    const sentences = tokenizeSentences(text);
    if (sentences.length <= 1) {
        return [{ id: generateId(), text, start: 0, end: text.length }];
    }

    console.log(`[SemanticChunker] Found ${sentences.length} sentences. Generating batched embeddings...`);
    const embeddings = await generateBatchedEmbeddings(sentences.map(s => s.text));

    console.log('[SemanticChunker] Calculating distances...');
    const distances = calculateDistances(embeddings);

    // Sensitivity UI (0-100). 
    // High sensitivity = Break more often = lower distance threshold (lower percentile).
    // Low sensitivity = Break less often = higher distance threshold (higher percentile).
    // Let's map sensitivity 0-100 to percentile 99-50.
    // E.g. 0 sensitivity -> 99th percentile (rarely break)
    // E.g. 100 sensitivity -> 50th percentile (break half the time)
    const percentile = 99 - (sensitivity / 100) * 49;

    console.log(`[SemanticChunker] Finding breakpoints at ${percentile.toFixed(2)}th percentile...`);
    const breakpoints = findBreakpoints(distances, percentile);

    const chunks: Chunk[] = [];
    let currentChunkStartIdx = 0;

    for (let currentSentenceIdx = 0; currentSentenceIdx < sentences.length; currentSentenceIdx++) {
        const isBreakpoint = breakpoints.includes(currentSentenceIdx);
        // Breakpoint means the current sentence is the END of a chunk, and next sentence starts a new one.

        if (isBreakpoint || currentSentenceIdx === sentences.length - 1) {
            // Create chunk from currentChunkStartIdx to currentSentenceIdx
            const chunkSentences = sentences.slice(currentChunkStartIdx, currentSentenceIdx + 1);
            const chunkText = chunkSentences.map(s => s.text).join(' ');

            // Calculate an aggregate embedding (e.g. mean of sentence embeddings) for the chunk
            // For simplicity, we skip full embedding aggregation and re-embed chunk later if needed,
            // or we could average them here. Let's average them.
            const chunkEmbeddings = embeddings.slice(currentChunkStartIdx, currentSentenceIdx + 1);
            const averagedEmbedding = chunkEmbeddings[0].map((_, col) =>
                chunkEmbeddings.reduce((sum, row) => sum + row[col], 0) / chunkEmbeddings.length
            );

            chunks.push({
                id: generateId(),
                text: chunkText,
                start: chunkSentences[0].start,
                end: chunkSentences[chunkSentences.length - 1].end,
                embedding: averagedEmbedding
            });

            currentChunkStartIdx = currentSentenceIdx + 1;
        }
    }

    console.log(`[SemanticChunker] Produced ${chunks.length} semantic chunks.`);
    return chunks;
}
