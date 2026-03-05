'use client';

import { useState, useEffect } from 'react';
import { ChunkParams, RagChunk } from '@/hooks/useRagEngine';
import { Settings2, Scissors, Zap, MousePointerClick, BarChart3, Info, FileText, AlertCircle, X, Check } from 'lucide-react';
import clsx from 'clsx';

interface ChunkVisualizerProps {
    text: string;
    chunks: RagChunk[];
    params: ChunkParams;
    onParamsChange: (newParams: Partial<ChunkParams>) => void;
    onRunPipeline: (params?: ChunkParams, baseChunks?: RagChunk[]) => void;
    onTriggerManualSave: (newChunks: RagChunk[]) => void;
    isRetrievalActive?: boolean;
    isProcessing: boolean;
}

export function ChunkVisualizer({
    chunks,
    params,
    onParamsChange,
    onRunPipeline,
    onTriggerManualSave,
    isRetrievalActive,
    isProcessing
}: ChunkVisualizerProps) {

    // Local state for debouncing inputs
    const [localParams, setLocalParams] = useState(params);
    const [manualMode, setManualMode] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Stats
    const totalChunks = chunks.length;
    const avgLength = totalChunks > 0 ? Math.round(chunks.reduce((acc, c) => acc + c.text.length, 0) / totalChunks) : 0;

    // Sync external params to local
    useEffect(() => {
        setLocalParams(params);
    }, [params]);

    // Debounce updates back to parent
    useEffect(() => {
        const timer = setTimeout(() => {
            if (JSON.stringify(localParams) !== JSON.stringify(params)) {
                onParamsChange(localParams);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localParams, params, onParamsChange]);

    // Manual Mode State
    const [manualText, setManualText] = useState('');

    // Enter Manual Mode: Convert chunks to text
    useEffect(() => {
        if (manualMode) {
            const formatted = chunks.map(c => `--- ID: ${c.id} ---\n${c.text}`).join('\n\n');
            setManualText(formatted);
        }
    }, [manualMode, chunks]);

    const handleManualSave = () => {
        // Parse text back to chunks
        const newChunks: RagChunk[] = [];
        const seenIds = new Set<string>();
        // More robust regex
        const regex = /--- ID:\s*(.+?)\s*---\n([\s\S]*?)(?=\n--- ID: |$)/g;
        let match;

        let found = false;
        while ((match = regex.exec(manualText)) !== null) {
            found = true;
            let originalId = match[1];
            const content = match[2].trim();

            if (seenIds.has(originalId)) {
                originalId = typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : Math.random().toString(36).substring(2, 11);
            }
            seenIds.add(originalId);

            if (content) {
                newChunks.push({
                    id: originalId,
                    text: content,
                    start: 0,
                    end: 0
                });
            }
        }

        if (!found && manualText.trim()) {
            newChunks.push({
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'manual-root',
                text: manualText.trim(),
                start: 0,
                end: manualText.length
            });
        }

        onTriggerManualSave(newChunks);
        setManualMode(false);
    };

    return (
        <div className="flex flex-col gap-6 h-[850px]">
            {/* Top Toolbar Controls */}
            <div className="w-full bg-white border rounded-xl shadow-sm flex flex-col shrink-0">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <Settings2 className="w-5 h-5 text-indigo-600" />
                        <h3>Pipeline Config</h3>
                    </div>

                    <div className="flex items-center gap-4">
                        {isProcessing && <span className="loading loading-spinner loading-sm text-indigo-600 mr-2"></span>}

                        <button
                            onClick={() => {
                                if (manualMode) handleManualSave();
                                else setManualMode(true);
                            }}
                            className={clsx(
                                "btn h-9 min-h-0 px-4 border rounded-lg font-medium flex items-center gap-2 transition-all",
                                manualMode
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md hover:bg-indigo-700"
                                    : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm"
                            )}
                        >
                            {manualMode ? <FileText className="w-4 h-4" /> : <MousePointerClick className="w-4 h-4" />}
                            {manualMode ? 'Save & Exit' : 'Manual Editor'}
                        </button>

                        <button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={isProcessing || manualMode}
                            className={clsx(
                                "btn h-9 min-h-0 px-5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md active:scale-95 hover:-translate-y-0.5",
                                isProcessing || manualMode ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                            )}
                        >
                            {isProcessing ? (
                                <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                                <>
                                    <Scissors className="w-4 h-4" /> Apply
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    {/* Group 1: Segmentation */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Segmentation</h4>
                        <div className="space-y-2">
                            <label htmlFor="pipeline-config-delimiter" className="text-sm font-medium text-gray-700">Delimiter</label>
                            <input
                                id="pipeline-config-delimiter"
                                type="text"
                                placeholder="e.g. \n or ."
                                value={localParams.delimiter}
                                onChange={e => setLocalParams(p => ({ ...p, delimiter: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-xs text-gray-400">Character to strictly split on first.</p>
                        </div>
                    </div>



                    {/* Group 2: Intelligence */}
                    <div className="space-y-3 md:border-l md:pl-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            2. Intelligence <Zap className="w-3 h-3 text-amber-500" />
                        </h4>

                        <div className="flex items-center justify-between">
                            <label htmlFor="pipeline-config-semantic" className="text-sm font-medium text-gray-700">Semantic Merging</label>
                            <input
                                id="pipeline-config-semantic"
                                type="checkbox"
                                checked={localParams.semantic}
                                onChange={e => setLocalParams(p => ({ ...p, semantic: e.target.checked }))}
                                className="toggle toggle-sm accent-indigo-600"
                            />
                        </div>

                        <div className={`space-y-2 transition-all duration-300 ${!localParams.semantic ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="flex justify-between text-xs text-gray-500">
                                <label htmlFor="pipeline-config-threshold">Sensitivity</label>
                                <span className="font-mono">{localParams.semanticThreshold}%</span>
                            </div>
                            <input
                                id="pipeline-config-threshold"
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={localParams.semanticThreshold}
                                onChange={e => setLocalParams(p => ({ ...p, semanticThreshold: Number(e.target.value) }))}
                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>



                    <div className={`space-y-3 md:border-l md:pl-6 transition-all duration-300 ${localParams.semantic ? 'opacity-50 pointer-events-none grayscale relative' : ''}`}>
                        {localParams.semantic && <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"><span className="bg-white/90 text-gray-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm border">DISABLED BY SEMANTIC</span></div>}
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. Constraints</h4>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <label htmlFor="pipeline-config-size">Max Chunk Size</label>
                                    <span className="font-mono">{localParams.size} chars</span>
                                </div>
                                <input
                                    id="pipeline-config-size"
                                    type="range"
                                    min="50"
                                    max="2000"
                                    step="50"
                                    value={localParams.size}
                                    onChange={e => setLocalParams(p => ({ ...p, size: Number(e.target.value) }))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <label htmlFor="pipeline-config-overlap">Overlap</label>
                                    <span className="font-mono">{localParams.overlap} chars</span>
                                </div>
                                <input
                                    id="pipeline-config-overlap"
                                    type="range"
                                    min="0"
                                    max="200"
                                    step="10"
                                    value={localParams.overlap}
                                    onChange={e => setLocalParams(p => ({ ...p, overlap: Number(e.target.value) }))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Manual Mode Hint */}
                {manualMode && <div className="bg-indigo-50 p-2 text-center border-t border-indigo-100 flex items-center justify-center gap-2">
                    <Info className="w-4 h-4 text-indigo-500" />
                    <p className="text-xs text-indigo-700 font-medium">Safe to edit. Remove "--- ID ---" headers to merge chunks. Add them to split.</p>
                </div>}
            </div>

            {/* Main Visualizer Area */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Stats Bar */}
                <div className="bg-white border rounded-xl p-3 shadow-sm flex items-center justify-between text-sm px-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-gray-600">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{totalChunks}</span>
                            <span className="text-xs">Chunks Generated</span>
                        </div>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Info className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{avgLength}</span>
                            <span className="text-xs">Avg. Char Length</span>
                        </div>
                    </div>
                </div>

                {/* Chunks Grid */}
                {/* Chunks Grid or Editor */}
                {manualMode ? (
                    <div className="flex-1 border rounded-xl bg-white shadow-inner overflow-hidden flex flex-col">
                        <textarea
                            value={manualText}
                            onChange={(e) => setManualText(e.target.value)}
                            className="flex-1 w-full p-6 font-mono text-sm leading-relaxed outline-none resize-none bg-gray-50 text-gray-800"
                            placeholder="Loading chunks..."
                        />
                    </div>
                ) : (
                    <div className="flex-1 border rounded-xl bg-gray-50/50 p-6 overflow-y-auto shadow-inner transition-colors scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {chunks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Scissors className="w-12 h-12 mb-4 opacity-20" />
                                <p>Upload a document to start chunking...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 pb-20">
                                {chunks.map((chunk, i) => {
                                    const isTopMatch = isRetrievalActive && i < 3 && (chunk.score || 0) > 0;
                                    return (
                                        <div
                                            key={chunk.id}
                                            className={clsx(
                                                "relative group p-4 rounded-xl border transition-all duration-200 bg-white hover:shadow-md flex flex-col gap-2",
                                                isTopMatch
                                                    ? "border-amber-400 ring-2 ring-amber-100 shadow-amber-100 z-10 scale-[1.02]"
                                                    : "border-gray-200 hover:border-indigo-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                                    ID: {chunk.id.substring(0, 6)}
                                                </span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                                                    {chunk.text.length} chars
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-700 leading-relaxed font-mono whitespace-pre-wrap break-words">
                                                {chunk.text}
                                            </p>

                                            {chunk.score !== undefined && (
                                                <div className="mt-auto pt-2 border-t border-dashed border-gray-100 flex items-center justify-between">
                                                    <span className="text-xs text-gray-400">Relevance</span>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.max(0, (chunk.score || 0) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-mono font-medium text-indigo-600">
                                                            {(chunk.score || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {isTopMatch && (
                                                <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg">
                                                    <Zap className="w-3 h-3 fill-current" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 pb-4">
                            <div className="flex items-center gap-3 mb-4 text-indigo-900">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <AlertCircle className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-bold">Apply Chunking Pipeline?</h3>
                            </div>

                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                This will apply the pipeline to your <strong>current chunks</strong> (preserving manual splits where possible). The following parameters will be applied:
                            </p>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border border-gray-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Delimiter</span>
                                    <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-mono text-xs">
                                        {localParams.delimiter || '(None)'}
                                    </code>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Semantic Merging</span>
                                    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", localParams.semantic ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                        {localParams.semantic ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                {localParams.semantic && (
                                    <div className="flex justify-between items-center pl-4 border-l-2 border-green-100">
                                        <span className="text-gray-400">Threshold</span>
                                        <span className="font-mono text-gray-700">{localParams.semanticThreshold}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Max Size</span>
                                    <span className="font-mono text-gray-700">{localParams.size} chars</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="btn btn-ghost btn-sm h-9 font-medium text-gray-600 hover:bg-gray-200/50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onRunPipeline(localParams, chunks);
                                    setShowConfirmModal(false);
                                }}
                                className="btn btn-sm h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-indigo-200 shadow-md flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                Confirm & Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
