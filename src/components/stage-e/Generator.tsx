'use client';

import { useState } from 'react';
import { Bot, Sparkles, AlertTriangle } from 'lucide-react';
import { RagChunk } from '@/hooks/useRagEngine';
import { generateAnswerAction } from '@/app/actions';

interface GeneratorProps {
    query: string;
    topChunks: RagChunk[];
}

export function Generator({ query, topChunks }: GeneratorProps) {
    const [answer, setAnswer] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAt, setGeneratedAt] = useState<number | null>(null);
    const [usedModel, setUsedModel] = useState<string | null>(null);
    const [didFailover, setDidFailover] = useState(false);

    const handleGenerate = async () => {
        if (!query || topChunks.length === 0) return;

        setIsGenerating(true);
        setAnswer('');
        setUsedModel(null);
        setDidFailover(false);
        try {
            // Prepare context from top chunks
            const context = topChunks.map(c => c.text).join('\n\n');
            const result = await generateAnswerAction(query, context);

            setAnswer(result.text);
            if (result.modelName !== 'Error') {
                setUsedModel(result.modelName);
                if (result.modelName !== 'gemini-2.0-flash') {
                    setDidFailover(true);
                }
            }
            setGeneratedAt(Date.now());
        } catch (e) {
            console.error(e);
            setAnswer('Error generating answer. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!query || topChunks.length === 0) return null;

    return (
        <div className="p-6 border rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-indigo-900">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    Grounded Generation
                </h3>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-lg text-sm flex items-center gap-2"
                >
                    {isGenerating ? 'Thinking...' : (
                        <>
                            <Sparkles className="w-4 h-4" /> Generate Answer
                        </>
                    )}
                </button>
            </div>

            {didFailover && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in duration-300 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm font-medium">Primary model busy, switched to backup for speed.</p>
                </div>
            )}

            {answer && (
                <div className="bg-white p-6 rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="prose prose-indigo max-w-none">
                        {answer}
                    </div>
                    {usedModel && (
                        <div className="mt-4 pt-4 border-t text-xs text-gray-400 flex justify-between items-center">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-medium border border-indigo-100">
                                Model: {usedModel}
                            </span>
                            <span>Ref: {topChunks.length} chunks</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

