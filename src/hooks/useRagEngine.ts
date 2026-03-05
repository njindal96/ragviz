import { useState, useCallback, useEffect } from 'react';
import { splitByDelimiter, enforceSize, Chunk } from '../lib/chunking';
import { semanticChunkText } from '../lib/semantic-chunker';
import { cosineSimilarity } from '../lib/math';
import { LocalAISingleton } from '../lib/ai-instances';
import { checkApiHealthAction } from '../app/actions';

export interface RagChunk extends Chunk {
    embedding?: number[];
    score?: number;
}

export interface ChunkParams {
    delimiter: string;
    semantic: boolean;
    semanticThreshold: number; // Used as Sensitivity (0-100)
    size: number;
    overlap: number;
}

export function useRagEngine() {
    const [pdfText, setPdfText] = useState('');
    const [chunks, setChunks] = useState<RagChunk[]>([]);
    const [query, setQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [stage, setStage] = useState<'PARSING' | 'CHUNKING' | 'INDEXING' | 'RETRIEVAL'>('PARSING');
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

    // Default parameters
    const [params, setParams] = useState<ChunkParams>({
        delimiter: '', // Empty means standard splitting or none
        semantic: false,
        semanticThreshold: 80,
        size: 200,
        overlap: 20
    });

    const updateParams = useCallback((newParams: Partial<ChunkParams>) => {
        setParams(prev => {
            const updated = { ...prev, ...newParams };
            return updated;
        });
    }, []);

    // Helper to unescape user input (e.g. "\n" -> newline)
    const unescapeDelimiter = (str: string) => {
        return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
    };

    // Heartbeat Test on Mount
    useEffect(() => {
        checkApiHealthAction().then(res => {
            if (res.status === 'ERROR') {
                console.error('[Heartbeat] Gemini API Check Failed:', res.message);
            } else {
                console.log('[Heartbeat] Gemini API Check OK');
            }
        });
    }, []);

    // Auto-generate pipeline when pdfText changes
    useEffect(() => {
        if (pdfText) {
            generatePipeline();
        }
    }, [pdfText]);

    // Core Pipeline
    const generatePipeline = useCallback(async (currentParams: ChunkParams = params, sourceChunks?: RagChunk[]) => {
        if (!pdfText) return;
        setIsProcessing(true);
        setStage('CHUNKING');

        try {
            let pipelineChunks: RagChunk[] = [];
            // If semantic is enabled, we use the robust semantic engine.
            if (currentParams.semantic) {
                console.log('[Pipeline] Semantic chunking started...');
                let textToChunk = pdfText;

                // If chaining from existing chunks, join them so the semantic engine can process the continuous text.
                if (sourceChunks && sourceChunks.length > 0) {
                    textToChunk = sourceChunks.map(c => c.text).join('\n\n');
                }

                pipelineChunks = await semanticChunkText(textToChunk, currentParams.semanticThreshold);

                // Usually, you don't enforce strict character sizes on semantic chunks since the point is to preserve meaning,
                // but if we want to guarantee max token limits for Gemini, we could optionally enforce size here.
                // For this implementation, we will skip enforceSize if semantic is active, as requested by the UI behavior.

            } else {
                // Legacy / Standard Pipeline
                // Stage 1: Delimiter (or use source chunks)
                if (sourceChunks && sourceChunks.length > 0) {
                    console.log(`[Pipeline] Using ${sourceChunks.length} existing chunks as input (skipping delimiter split)`);
                    pipelineChunks = [...sourceChunks];
                } else {
                    const delimiter = unescapeDelimiter(currentParams.delimiter);
                    if (delimiter) {
                        console.log(`[Pipeline] Splitting by delimiter: "${delimiter.replace(/\n/g, '\\n')}"`);
                        pipelineChunks = splitByDelimiter(pdfText, delimiter);
                    } else {
                        pipelineChunks = [{ id: 'root', text: pdfText, start: 0, end: pdfText.length }];
                    }
                }

                // Stage 3: Size & Overlap
                pipelineChunks = enforceSize(pipelineChunks, currentParams.size, currentParams.overlap);
            }

            setChunks(pipelineChunks.map(c => ({ ...c })));
        } catch (e) {
            console.error("Chunking pipeline error", e);
        } finally {
            setIsProcessing(false);
        }
    }, [pdfText, params]);

    // Manual Update handlers
    const updateChunks = useCallback((newChunks: RagChunk[]) => {
        setChunks(newChunks);
    }, []);

    // Existing Compute Embeddings (Stage C)
    // This should run on whatever chunks are currently in state
    const computeEmbeddings = useCallback(async () => {
        if (chunks.length === 0) return;
        console.log('[useRagEngine] computeEmbeddings started. Chunks:', chunks.length);
        setIsProcessing(true);
        setStage('INDEXING');

        try {
            // Yield to main thread so React can render the "Vectorizing..." UI before heavy WASM work
            await new Promise(resolve => setTimeout(resolve, 50));

            const extractor = await LocalAISingleton.getInstance();
            const newChunks = [...chunks];

            const allHaveEmbeddings = newChunks.every(c => c.embedding);
            let computedCount = 0;
            const totalToCompute = allHaveEmbeddings ? newChunks.length : newChunks.filter(c => !c.embedding).length;

            if (totalToCompute > 0) {
                setProgress({ current: 0, total: totalToCompute });
            }

            for (let i = 0; i < newChunks.length; i++) {
                if (!newChunks[i].embedding || allHaveEmbeddings) {
                    setProgress({ current: computedCount + 1, total: totalToCompute });

                    // Yield occasionally to prevent UI freezing during large generic arrays
                    if (computedCount > 0 && computedCount % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }

                    const output = await extractor(newChunks[i].text, { pooling: 'mean', normalize: true });
                    newChunks[i].embedding = Array.from(output.data);
                    computedCount++;
                }
            }

            // Just in case we did 0 work, wait briefly to ensure UI flashed properly
            if (computedCount === 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            setChunks(newChunks);
        } catch (error) {
            console.error('Embedding failed', error);
        } finally {
            setIsProcessing(false);
            setProgress(null);
            setStage('RETRIEVAL');
        }
    }, [chunks]);

    // Search (Stage D) - Unchanged mostly
    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || chunks.length === 0) return;
        setIsProcessing(true);
        setQuery(searchQuery);

        try {
            const extractor = await LocalAISingleton.getInstance();
            const output = await extractor(searchQuery, { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(output.data) as number[];

            const scoredChunks = chunks.map(chunk => {
                if (!chunk.embedding) return { ...chunk, score: 0 };
                return {
                    ...chunk,
                    score: cosineSimilarity(queryEmbedding, chunk.embedding)
                };
            });

            scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
            setChunks(scoredChunks);
            setStage('RETRIEVAL');
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsProcessing(false);
        }
    }, [chunks]);

    return {
        pdfText,
        setPdfText,
        chunks,
        params,
        updateParams,
        generatePipeline, // Replaces generateChunks

        computeEmbeddings,
        search,
        isProcessing,
        stage,
        progress,
        query,
        updateChunks // Replaces splitChunk (manual)
    };
}
