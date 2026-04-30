'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRagEngine, RagChunk } from '@/hooks/useRagEngine';
import { Generator } from '@/components/stage-e/Generator';
import { ScatterPlot, CHUNK_COLORS, getEmbeddingPos, hashStr } from '@/components/ScatterPlot';
import { parsePdfAction } from '@/app/actions';

const SAMPLE_TEXT = `Retrieval-Augmented Generation (RAG) is an AI framework that improves the accuracy and reliability of large language models by grounding responses in external knowledge. Unlike traditional language models that rely solely on parametric memory from training, RAG systems retrieve relevant information at inference time from a curated knowledge base.

The parsing stage is the first step in building a RAG pipeline. Raw documents — PDFs, web pages, or plain text files — are ingested and their text content is extracted. Text is cleaned to remove noise such as headers, footers, and formatting artifacts before being passed downstream to the chunking stage.

Chunking determines how a document is divided into smaller segments for indexing. Common strategies include character-based splitting, sentence-based splitting, and semantic chunking. The chunk size and overlap are critical parameters: smaller chunks improve retrieval precision but may lose context, while larger chunks preserve more context at the cost of specificity.

Each text chunk is encoded into a dense vector representation using an embedding model. These high-dimensional vectors capture semantic meaning, allowing semantically similar text to cluster nearby in vector space. Popular embedding models include text-embedding-ada-002, Cohere embed-v3, and open-source models like BGE and E5.

At retrieval time, the user query is encoded with the same embedding model. Cosine similarity is computed between the query vector and all indexed chunk vectors. The top-k most similar chunks are retrieved and injected into the language model's context window, enabling accurate, grounded, and up-to-date responses.`;

const SUGGESTED_QUERIES = [
  'What is RAG?',
  'How does chunking work?',
  'What are embedding models?',
  'How is retrieval performed?',
];

function ParseStep({ text, onComplete, onSetText }: { text: string, onComplete: () => void, onSetText: (t: string) => void }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const parsedText = await parsePdfAction(formData);
      onSetText(parsedText);
    } catch (e) {
      console.error(e);
      alert('Failed to parse PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up">
      <div className="step-header">
        <div className="step-tag">Step 01</div>
        <div className="step-title">Parse Document</div>
        <div className="step-subtitle">Upload any PDF or use the sample document to extract raw text for the pipeline.</div>
      </div>

      {!text ? (
        <>
          <div
            className={`drop-zone ${drag ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault(); setDrag(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="drop-icon">{loading ? '⏳' : '📄'}</div>
            <div className="drop-title">{loading ? 'Extracting text…' : 'Drop your PDF here'}</div>
            <div className="drop-sub">PDF text is extracted securely</div>
            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); document.getElementById('file-input')?.click(); }}>
              Select File
            </button>
            <input id="file-input" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files?.[0]; if (f) handleFile(f);
            }} />
          </div>

          <div className="or-divider">or</div>

          <div className="sample-card" onClick={() => onSetText(SAMPLE_TEXT)}>
            <div className="sample-icon">✦</div>
            <div className="sample-info">
              <div className="sample-name">RAG Explainer — Sample Document</div>
              <div className="sample-desc">A 5-paragraph passage about RAG · perfect for exploring all pipeline stages</div>
            </div>
            <button className="btn btn-ghost btn-sm">Load Sample</button>
          </div>
        </>
      ) : (
        <div className="fade-up">
          <div className="card">
            <div className="card-header">
              <span>Extracted Text</span>
              <span style={{ color: 'var(--teal)', fontWeight: 600 }}>✓ Parsed</span>
            </div>
            <div className="card-body">
              <div className="text-preview">{text}</div>
              <div className="parse-stats">
                <div className="stat-item"><span>{text.length.toLocaleString()}</span> characters</div>
                <div className="stat-item"><span>{text.split(/\s+/).length.toLocaleString()}</span> words</div>
                <div className="stat-item"><span>{text.split(/\n\n+/).length}</span> paragraphs</div>
              </div>
            </div>
          </div>
          <div className="complete-banner">
            <span>✓</span> Text extracted successfully — ready to configure chunking
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => onSetText('')}>← Change Document</button>
            <button className="btn btn-primary" onClick={onComplete}>
              Configure Chunking →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChunkStep({ 
  chunks, 
  params, 
  onParamsChange, 
  onGenerate, 
  onComplete,
  isProcessing
}: { 
  chunks: RagChunk[], 
  params: any, 
  onParamsChange: (p: any) => void, 
  onGenerate: () => void, 
  onComplete: () => void,
  isProcessing: boolean
}) {
  const [hoveredChunk, setHoveredChunk] = useState<number | null>(null);

  // Auto generate on mount if no chunks
  useEffect(() => {
    if (chunks.length === 0) onGenerate();
  }, []);

  const avgLen = chunks.length ? Math.round(chunks.reduce((a, c) => a + c.text.length, 0) / chunks.length) : 0;

  return (
    <div className="fade-up">
      <div className="step-header">
        <div className="step-tag">Step 02</div>
        <div className="step-title">Chunk &amp; Visualize</div>
        <div className="step-subtitle">Configure how the text is split. Tune size, overlap, and delimiter — see the result instantly.</div>
      </div>

      <div className="chunk-layout">
        <div className="card config-panel" style={{ padding: '20px' }}>
          <div className="config-group">
            <div className="config-label">Segmentation</div>
            <div className="config-sublabel">Primary split delimiter</div>
            <select
              className="select-input"
              value={params.delimiter}
              onChange={e => { onParamsChange({ delimiter: e.target.value }); }}
            >
              <option value="\n\n">¶ Paragraph break</option>
              <option value="\n">↵ Newline</option>
              <option value=". ">Sentence</option>
              <option value="">None</option>
            </select>
          </div>

          <div className="config-divider" />

          <div className="config-group">
            <div className="config-label">Max Chunk Size</div>
            <div className="range-row">
              <input type="range" className="range-input" min={60} max={800} step={10}
                value={params.size}
                onChange={e => onParamsChange({ size: +e.target.value })}
              />
              <span className="range-val">{params.size}</span>
            </div>
          </div>

          <div className="config-group">
            <div className="config-label">Overlap</div>
            <div className="range-row">
              <input type="range" className="range-input" min={0} max={150} step={5}
                value={params.overlap}
                onChange={e => onParamsChange({ overlap: +e.target.value })}
              />
              <span className="range-val">{params.overlap}</span>
            </div>
          </div>

          <div className="config-divider" />

          <div className="config-group">
            <div className="toggle-row">
              <div>
                <div className="config-label">Semantic Merging</div>
                <div className="config-sublabel">Merge adjacent small chunks</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={params.semantic} onChange={e => onParamsChange({ semantic: e.target.checked })} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {params.semantic && (
              <div className="config-group mt-2">
                <div className="config-label">Semantic Threshold</div>
                <div className="range-row">
                  <input type="range" className="range-input" min={0} max={100} step={5}
                    value={params.semanticThreshold}
                    onChange={e => onParamsChange({ semanticThreshold: +e.target.value })}
                  />
                  <span className="range-val">{params.semanticThreshold}</span>
                </div>
              </div>
            )}
          </div>

          <div className="apply-btn-wrap">
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onGenerate} disabled={isProcessing}>
              {isProcessing ? '⟳ Processing...' : '⟳ Apply'}
            </button>
          </div>
        </div>

        <div className="chunk-visual">
          <div className="card">
            <div className="card-header">
              <span>Chunk Visualization</span>
              {chunks.length > 0 && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--teal)' }}>
                  {chunks.length} chunks
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="chunk-text-display">
                {chunks.map((chunk, i) => (
                  <span
                    key={i}
                    className="chunk-span"
                    style={{
                      background: hoveredChunk === i
                        ? CHUNK_COLORS[i % CHUNK_COLORS.length].dim
                        : CHUNK_COLORS[i % CHUNK_COLORS.length].dim,
                      color: hoveredChunk === i
                        ? CHUNK_COLORS[i % CHUNK_COLORS.length].solid
                        : 'oklch(0.75 0.008 265)',
                      outline: hoveredChunk === i
                        ? `1px solid ${CHUNK_COLORS[i % CHUNK_COLORS.length].solid}`
                        : 'none',
                      borderRadius: 3,
                    }}
                    onMouseEnter={() => setHoveredChunk(i)}
                    onMouseLeave={() => setHoveredChunk(null)}
                    title={`Chunk ${i + 1} · ${chunk.text.length} chars`}
                  >
                    {chunk.text}
                    {i < chunks.length - 1 && ' '}
                  </span>
                ))}
                {chunks.length === 0 && !isProcessing && (
                  <span style={{ color: 'var(--muted)' }}>Apply config to see chunks…</span>
                )}
              </div>

              {chunks.length > 0 && (
                <>
                  <div className="chunk-stats-bar">
                    <div className="chunk-stat"><strong>{chunks.length}</strong> chunks</div>
                    <div className="chunk-stat-sep" />
                    <div className="chunk-stat">avg <strong>{avgLen}</strong> chars</div>
                    <div className="chunk-stat-sep" />
                    <div className="chunk-stat">min <strong>{Math.min(...chunks.map(c => c.text.length))}</strong></div>
                    <div className="chunk-stat-sep" />
                    <div className="chunk-stat">max <strong>{Math.max(...chunks.map(c => c.text.length))}</strong></div>
                  </div>
                  <div className="chunk-legend">
                    {chunks.map((_, i) => (
                      <div
                        key={i}
                        className="legend-item"
                        style={{ background: CHUNK_COLORS[i % CHUNK_COLORS.length].dim, cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredChunk(i)}
                        onMouseLeave={() => setHoveredChunk(null)}
                      >
                        <div className="legend-dot" style={{ background: CHUNK_COLORS[i % CHUNK_COLORS.length].solid }} />
                        C{i + 1}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {chunks.length} chunks ready for indexing
        </div>
        <button
          className="btn btn-primary"
          disabled={chunks.length === 0 || isProcessing}
          onClick={onComplete}
        >
          Index Chunks →
        </button>
      </div>
    </div>
  );
}

function IndexStep({ 
  chunks, 
  pdfText,
  onComputeEmbeddings, 
  onComplete, 
  progress, 
  isIndexed 
}: { 
  chunks: RagChunk[], 
  pdfText: string,
  onComputeEmbeddings: () => void, 
  onComplete: () => void, 
  progress: any, 
  isIndexed: boolean 
}) {
  const [fakeScatter, setFakeScatter] = useState<{x: number, y: number}[]>([]);
  const usingRealSample = pdfText.startsWith('Retrieval-Augmented Generation (RAG) is');
  
  useEffect(() => {
    if (isIndexed) {
      // Create scatter plot layout. In real app, we use fake PCA visually for the embeddings.
      const embs = chunks.map((c, idx) => getEmbeddingPos(c.text, idx, usingRealSample));
      setFakeScatter(embs);
    }
  }, [isIndexed, chunks, usingRealSample]);

  const pPercent = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : (isIndexed ? 100 : 0);
  const doneIdx = progress ? Math.floor((progress.current / Math.max(progress.total, 1)) * chunks.length) - 1 : (isIndexed ? chunks.length - 1 : -1);

  return (
    <div className="fade-up">
      <div className="step-header">
        <div className="step-tag">Step 03</div>
        <div className="step-title">Vector Index</div>
        <div className="step-subtitle">Each chunk is converted to a dense embedding vector running locally in your browser.</div>
      </div>

      <div className="index-layout">
        <div className="card">
          <div className="card-header">
            <span>Embedding Progress</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isIndexed ? 'var(--teal)' : 'var(--accent)' }}>
              {pPercent}%
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isIndexed && !progress ? (
              <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={onComputeEmbeddings}>
                Start Vector Indexing
              </button>
            ) : (
              <>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: pPercent + '%' }} />
                </div>
                {progress?.status && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{progress.status}</div>}
                <div className="chunk-index-list">
                  {chunks.map((chunk, i) => (
                    <div
                      key={i}
                      className={`chunk-index-item ${i <= doneIdx ? 'done' : i === doneIdx + 1 ? 'active' : ''}`}
                    >
                      <div className="ci-num" style={{ color: CHUNK_COLORS[i % CHUNK_COLORS.length].solid }}>
                        C{i + 1}
                      </div>
                      <div className="ci-text">{chunk.text.slice(0, 55)}…</div>
                      <div className={`ci-status ${i < doneIdx ? 'done' : i === doneIdx ? 'active' : 'pending'}`}>
                        {i < doneIdx ? '✓' : i === doneIdx ? <span className="pulse">●</span> : '○'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isIndexed && (
              <div style={{ padding: '10px 12px', background: 'var(--teal-dim)', borderRadius: 8, border: '1px solid oklch(0.7 0.14 175 / 0.3)', fontSize: 12, color: 'var(--teal)' }}>
                ✓ {chunks.length} vectors indexed · ready for retrieval
              </div>
            )}
          </div>
        </div>

        <div className="card scatter-card">
          <div className="card-header">
            <span>Vector Space</span>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--muted)' }}>2D PCA projection</span>
          </div>
          <div style={{ padding: '12px' }}>
            <ScatterPlot chunks={chunks.map(c => c.text)} embeddings={fakeScatter} />
          </div>
        </div>
      </div>

      {isIndexed && (
        <div className="step-actions fade-up">
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {chunks.length} vectors in index
          </div>
          <button className="btn btn-primary" onClick={onComplete}>
            Start Retrieval →
          </button>
        </div>
      )}
    </div>
  );
}

function RetrieveStep({ 
  chunks, 
  pdfText,
  search, 
  isProcessing, 
  queryValue
}: { 
  chunks: RagChunk[], 
  pdfText: string,
  search: (q: string) => void, 
  isProcessing: boolean, 
  queryValue: string
}) {
  const [localQuery, setLocalQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const usingRealSample = pdfText.startsWith('Retrieval-Augmented Generation (RAG) is');
  
  // Calculate fake scatter embeddings
  const fakeScatter = chunks.map((c, idx) => getEmbeddingPos(c.text, idx, usingRealSample));

  const runQuery = (q: string) => {
    setLocalQuery(q);
    search(q);
  };

  const topChunks = chunks.filter(c => (c.score || 0) > 0).slice(0, 3);
  
  // Try to figure out query embedding position
  let queryEmb = null;
  if (topChunks.length > 0) {
    const topOrigIndex = chunks.findIndex(c => c === topChunks[0]);
    if (topOrigIndex !== -1 && fakeScatter[topOrigIndex]) {
      queryEmb = {
        x: fakeScatter[topOrigIndex].x + (hashStr(localQuery) % 200 - 100) / 1000,
        y: fakeScatter[topOrigIndex].y + (hashStr(localQuery + "y") % 200 - 100) / 1000,
      };
    }
  }

  const rankColors = [CHUNK_COLORS[0].solid, CHUNK_COLORS[1].solid, CHUNK_COLORS[2].solid];

  return (
    <div className="fade-up">
      <div className="step-header">
        <div className="step-tag">Step 04</div>
        <div className="step-title">Interactive Retrieval</div>
        <div className="step-subtitle">Ask a question. Your query is vectorized and compared to all indexed chunks by cosine similarity.</div>
      </div>

      <div className="query-row">
        <input
          className="query-input"
          placeholder="Ask a question about the document…"
          value={localQuery}
          onChange={e => setLocalQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runQuery(localQuery)}
        />
        <button className="btn btn-primary" onClick={() => runQuery(localQuery)} disabled={isProcessing}>
          {isProcessing ? 'Retrieving...' : 'Retrieve'}
        </button>
      </div>

      <div className="tag-queries">
        {SUGGESTED_QUERIES.map(q => (
          <div key={q} className="tag-query" onClick={() => runQuery(q)}>
            {q}
          </div>
        ))}
      </div>

      <div className="retrieve-layout" style={{ marginTop: 20 }}>
        <div>
          <div className="card-header" style={{ paddingLeft: 0, paddingBottom: 12 }}>
            <span>Results</span>
            {topChunks.length > 0 && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
                top {topChunks.length} of {chunks.length}
              </span>
            )}
          </div>

          {topChunks.length === 0 ? (
            <div className="empty-results card" style={{ padding: '40px 24px' }}>
              <div style={{ fontSize: 28 }}>⟲</div>
              <div>Enter a query to retrieve matching chunks</div>
            </div>
          ) : (
            <div className="results-list fade-up">
              {topChunks.map((r, ri) => {
                const origIndex = chunks.findIndex(c => c === r);
                const colorIdx = origIndex !== -1 ? origIndex : ri;
                return (
                <div
                  key={ri}
                  className={`result-card rank-${ri + 1}`}
                  onMouseEnter={() => setHighlightIdx(origIndex)}
                  onMouseLeave={() => setHighlightIdx(null)}
                >
                  <div className="result-header">
                    <span className="result-rank">#{ri + 1}</span>
                    <span
                      className="result-chunk-badge"
                      style={{
                        background: CHUNK_COLORS[colorIdx % CHUNK_COLORS.length].dim,
                        color: CHUNK_COLORS[colorIdx % CHUNK_COLORS.length].solid,
                      }}
                    >
                      Chunk {colorIdx + 1}
                    </span>
                    <span className="result-score" style={{ color: rankColors[ri] }}>
                      {(r.score || 0).toFixed(3)}
                    </span>
                  </div>
                  <div className="sim-bar">
                    <div
                      className="sim-bar-fill"
                      style={{
                        width: ((r.score || 0) * 100) + '%',
                        background: CHUNK_COLORS[colorIdx % CHUNK_COLORS.length].solid,
                      }}
                    />
                  </div>
                  <div className="result-text">{r.text.slice(0, 160)}{r.text.length > 160 ? '…' : ''}</div>
                </div>
              )})}
            </div>
          )}
        </div>

        <div className="card scatter-card">
          <div className="card-header">
            <span>Vector Space</span>
            {queryEmb && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                ◉ Query · ✦ Top matches
              </span>
            )}
          </div>
          <div style={{ padding: '12px' }}>
            <ScatterPlot
              chunks={chunks.map(c => c.text)}
              embeddings={fakeScatter}
              queryEmbedding={queryEmb}
              topResults={topChunks.map(tc => ({ index: chunks.findIndex(c => c === tc), score: tc.score || 0, text: tc.text }))}
              highlightIndex={highlightIdx}
            />
          </div>
        </div>
      </div>

      {topChunks.length > 0 && (
        <div className="mt-8 fade-up">
          <div className="card">
            <div className="card-header border-b-0">
              <span>Generator (Stage E)</span>
            </div>
            <div className="px-4 pb-4">
              <Generator query={queryValue} topChunks={topChunks} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function Home() {
  const [step, setStep] = useState(1);
  const {
    pdfText,
    setPdfText,
    chunks,
    params,
    updateParams,
    generatePipeline,
    computeEmbeddings,
    search,
    isProcessing,
    stage,
    progress,
    query
  } = useRagEngine();

  const isIndexed = chunks.some(c => c.embedding && c.embedding.length > 0);
  const maxStep = step; // Allow going back and forth depending on state

  function goToStep(s: number) {
    // Basic validation
    if (s === 2 && !pdfText) return;
    if (s === 3 && chunks.length === 0) return;
    if (s === 4 && !isIndexed) return;
    setStep(s);
  }

  const STEPS = [
    { n: 1, label: 'Parse' },
    { n: 2, label: 'Chunk' },
    { n: 3, label: 'Index' },
    { n: 4, label: 'Retrieve' },
  ];

  return (
    <>
      <header className="header">
        <div className="logo">
          <div className="logo-dot"></div>
          ragviz
        </div>
        <nav className="pipeline">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <span className="step-arrow">→</span>}
              <div
                className={`step-pill ${step === s.n ? 'active' : step > s.n || (s.n === 2 && pdfText) || (s.n === 3 && chunks.length > 0) || (s.n === 4 && isIndexed) ? 'completed' : ''}`}
                onClick={() => goToStep(s.n)}
              >
                <div className="step-num">
                  {step > s.n ? '✓' : s.n}
                </div>
                {s.label}
              </div>
            </React.Fragment>
          ))}
        </nav>
        {step > 1 && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={() => { setStep(1); setPdfText(''); }}>
            ↺ Restart
          </button>
        )}
      </header>

      <main className="main">
        <div className="step-container">
          {step === 1 && (
            <ParseStep 
              text={pdfText} 
              onSetText={setPdfText} 
              onComplete={() => setStep(2)} 
            />
          )}
          {step === 2 && (
            <ChunkStep
              chunks={chunks}
              params={params}
              onParamsChange={updateParams}
              onGenerate={generatePipeline}
              isProcessing={isProcessing && stage === 'CHUNKING'}
              onComplete={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <IndexStep
              chunks={chunks}
              pdfText={pdfText}
              progress={progress}
              isIndexed={isIndexed}
              onComputeEmbeddings={computeEmbeddings}
              onComplete={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <RetrieveStep 
              chunks={chunks} 
              pdfText={pdfText}
              search={search} 
              isProcessing={isProcessing && stage === 'RETRIEVAL'} 
              queryValue={query}
            />
          )}
        </div>
      </main>
    </>
  );
}
