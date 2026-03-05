'use client';

import { Loader2, Zap, CheckCircle2 } from 'lucide-react';

interface VectornatorProps {
    onComputeEmbeddings: () => void;
    isProcessing: boolean;
    progress: { current: number; total: number } | null;
    hasChunks: boolean;
    isIndexed: boolean;
}

export function Vectornator({ onComputeEmbeddings, isProcessing, progress, hasChunks, isIndexed }: VectornatorProps) {
    return (
        <div className="w-full">
            {progress && (
                <div className="flex justify-end mb-2">
                    <span className="text-sm text-gray-600 font-mono">
                        {progress.current} / {progress.total} chunks
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {isIndexed && !isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                        <span className="font-medium text-emerald-800">Indexing Completed</span>
                        <button
                            onClick={onComputeEmbeddings}
                            className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 underline"
                        >
                            Re-run Embedding Process
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onComputeEmbeddings}
                        disabled={isProcessing || !hasChunks}
                        className="w-full btn bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Vectorizing...
                            </>
                        ) : (
                            'Start Embedding Process (Browser-Side)'
                        )}
                    </button>
                )}

                {progress && (
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
