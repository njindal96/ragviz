'use client';

import { useRagEngine } from '@/hooks/useRagEngine';
import { FileUpload } from '@/components/stage-a/FileUpload';
import { ChunkVisualizer } from '@/components/stage-b/ChunkVisualizer';
import { Vectornator } from '@/components/stage-c/Vectornator';
import { Retriever } from '@/components/stage-d/Retriever';
import { Generator } from '@/components/stage-e/Generator';
import { Layers, Database, Cpu, Search, CheckCircle2, Zap } from 'lucide-react';

export default function Home() {
  const {
    setPdfText,
    chunks,
    params,
    updateParams,
    generatePipeline,
    updateChunks,
    computeEmbeddings,
    search,
    isProcessing,
    progress,
    stage,
    query,
    pdfText
  } = useRagEngine();

  const isIndexed = chunks.some(c => c.embedding && c.embedding.length > 0);
  const topChunks = chunks.filter(c => (c.score || 0) > 0).slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Layers className="w-8 h-8 text-indigo-600" />
              RAG Visualizer
            </h1>
            <p className="text-gray-500 mt-1">Play tool to visualize how RAG works</p>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-400">
            <div className="flex items-center gap-1">
              <span className={stage === 'PARSING' ? 'text-indigo-600' : ''}>1. Parse</span>
              →
              <span className={stage === 'CHUNKING' ? 'text-indigo-600' : ''}>2. Chunk</span>
              →
              <span className={stage === 'INDEXING' ? 'text-indigo-600' : ''}>3. Index</span>
              →
              <span className={stage === 'RETRIEVAL' ? 'text-indigo-600' : ''}>4. Retrieve</span>
            </div>
          </div>
        </header>

        {/* Top Row: Pipeline Stages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Stage A: Source */}
          <section className="bg-white p-6 rounded-xl shadow-sm border flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gray-400" /> Source
            </h2>
            <div className="flex-1 flex flex-col justify-center">
              <FileUpload onTextLoaded={setPdfText} compact={!!pdfText} />
            </div>
          </section>

          {/* Stage C: Indexing */}
          <section className="bg-white p-6 rounded-xl shadow-sm border flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Local Vector Indexing
            </h2>
            <div className="flex-1 flex flex-col justify-center">
              {chunks.length > 0 ? (
                <Vectornator
                  onComputeEmbeddings={computeEmbeddings}
                  isProcessing={stage === 'INDEXING'}
                  progress={progress}
                  hasChunks={chunks.length > 0}
                  isIndexed={isIndexed}
                />
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">
                  Generate chunks to enable indexing
                </div>
              )}
            </div>
          </section>

          {/* Stage D: Retrieval */}
          <section className="bg-white p-6 rounded-xl shadow-sm border flex flex-col gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" /> Interactive Retrieval
            </h2>
            <div className="flex-1 flex flex-col justify-center">
              {isIndexed ? (
                <Retriever
                  onSearch={search}
                  isProcessing={stage === 'RETRIEVAL' && isProcessing}
                  hasIndex={isIndexed}
                />
              ) : (
                <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <input
                    disabled
                    placeholder="Ask a question about the document..."
                    className="w-full bg-transparent text-center text-sm text-gray-400 cursor-not-allowed outline-none"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Section: Visualization */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-sm border min-h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-500" />
                Visual Splitter & Vector Space
              </h2>
              {chunks.length > 0 && (
                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-mono">
                  {chunks.length} chunks
                </span>
              )}
            </div>

            <ChunkVisualizer
              text={pdfText}
              chunks={chunks}
              params={params}
              onParamsChange={updateParams}
              onRunPipeline={generatePipeline}
              onTriggerManualSave={updateChunks}
              isRetrievalActive={topChunks.length > 0}
              isProcessing={isProcessing && stage === 'CHUNKING'}
            />
          </section>

          {/* Stage E: Generator Results (floating or below) */}
          {topChunks.length > 0 && (
            <section className="bg-white shadow-lg border border-indigo-100 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Generator query={query} topChunks={topChunks} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
