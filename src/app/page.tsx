'use client';

import { useRagEngine } from '@/hooks/useRagEngine';
import { FileUpload } from '@/components/stage-a/FileUpload';
import { ChunkVisualizer } from '@/components/stage-b/ChunkVisualizer';
import { Vectornator } from '@/components/stage-c/Vectornator';
import { Retriever } from '@/components/stage-d/Retriever';
import { Generator } from '@/components/stage-e/Generator';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { Layers, Cpu, Search, CheckCircle2, Zap } from 'lucide-react';

function StepBadge({ n }: { n: number }) {
  const colors = [
    'bg-violet-100 text-violet-700 ring-violet-200',
    'bg-indigo-100 text-indigo-700 ring-indigo-200',
    'bg-amber-100 text-amber-700 ring-amber-200',
    'bg-blue-100 text-blue-700 ring-blue-200',
  ];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${colors[n - 1] ?? colors[0]}`}>
      STEP {n}
    </span>
  );
}

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
      <div className="max-w-7xl mx-auto space-y-6">

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
              <span className={stage === 'PARSING' ? 'text-indigo-600 font-semibold' : ''}>1. Parse</span>
              →
              <span className={stage === 'CHUNKING' ? 'text-indigo-600 font-semibold' : ''}>2. Chunk</span>
              →
              <span className={stage === 'INDEXING' ? 'text-indigo-600 font-semibold' : ''}>3. Index</span>
              →
              <span className={stage === 'RETRIEVAL' ? 'text-indigo-600 font-semibold' : ''}>4. Retrieve</span>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Top Row: Pipeline Stages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Stage A: Source */}
          <section className="bg-white p-6 rounded-xl shadow-sm border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${pdfText ? 'text-emerald-500' : 'text-gray-300'}`} />
                Source
              </h2>
              <StepBadge n={1} />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-1">
              Upload any PDF. Its text will be extracted and fed into the pipeline below.
            </p>
            <div className="flex-1 flex flex-col justify-center">
              <FileUpload onTextLoaded={setPdfText} compact={!!pdfText} />
            </div>
          </section>

          {/* Stage C: Indexing */}
          <section className="bg-white p-6 rounded-xl shadow-sm border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Local Vector Indexing
              </h2>
              <StepBadge n={3} />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-1">
              Each chunk is converted into a numerical vector (embedding) by an AI model running{' '}
              <span className="font-medium text-gray-500">entirely in your browser</span>. No data leaves your device.
            </p>
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
                <div className="text-center text-gray-400 text-sm py-4 border border-dashed rounded-lg border-gray-200">
                  ← Generate chunks first using the panel below
                </div>
              )}
            </div>
          </section>

          {/* Stage D: Retrieval */}
          <section className="bg-white p-6 rounded-xl shadow-sm border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" /> Interactive Retrieval
              </h2>
              <StepBadge n={4} />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed -mt-1">
              Your question is vectorized and compared to all chunks. The closest matches
              are returned using cosine similarity.
            </p>
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
                    placeholder="Index your chunks first to enable search..."
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
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                    Visual Splitter &amp; Vector Space
                  </h2>
                  <StepBadge n={2} />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed ml-7">
                  Configure how your text is split into chunks. Tune size, overlap, delimiter, or enable semantic splitting (AI-powered).
                  Hit <strong className="text-gray-500">Apply</strong> to see the chunks update in real time.
                </p>
              </div>
              {chunks.length > 0 && (
                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-mono shrink-0 mt-1">
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

          {/* Stage E: Generator Results */}
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
