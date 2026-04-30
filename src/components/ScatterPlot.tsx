'use client';

import React, { useRef, useState, useEffect } from 'react';

const CHUNK_COLORS = [
  { solid: 'oklch(0.68 0.2 270)', dim: 'oklch(0.68 0.2 270 / 0.18)' },
  { solid: 'oklch(0.70 0.18 215)', dim: 'oklch(0.70 0.18 215 / 0.18)' },
  { solid: 'oklch(0.70 0.14 175)', dim: 'oklch(0.70 0.14 175 / 0.18)' },
  { solid: 'oklch(0.72 0.16 140)', dim: 'oklch(0.72 0.16 140 / 0.18)' },
  { solid: 'oklch(0.76 0.18 75)',  dim: 'oklch(0.76 0.18 75  / 0.18)' },
  { solid: 'oklch(0.68 0.20 330)', dim: 'oklch(0.68 0.20 330 / 0.18)' },
];

export { CHUNK_COLORS };

export function hashStr(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SAMPLE_POSITIONS = [
  { x: -0.28, y: 0.12 },
  { x:  0.55, y: 0.52 },
  { x:  0.42, y:-0.52 },
  { x: -0.60, y: 0.48 },
  { x: -0.08, y:-0.58 },
];

export function getEmbeddingPos(text: string, index: number, isRealSample: boolean) {
  if (isRealSample && index < SAMPLE_POSITIONS.length) return SAMPLE_POSITIONS[index];
  const h = hashStr(text + index);
  const angle = (h * 2.39996) % (Math.PI * 2);
  const r = 0.25 + (h % 1000) / 1800;
  return {
    x: Math.max(-0.82, Math.min(0.82, Math.cos(angle) * r + (index % 3 - 1) * 0.2)),
    y: Math.max(-0.82, Math.min(0.82, Math.sin(angle) * r + (index % 2 - 0.5) * 0.15)),
  };
}

interface ScatterPlotProps {
  chunks: string[];
  embeddings: { x: number, y: number }[];
  queryEmbedding?: { x: number, y: number } | null;
  topResults?: { index: number, score: number, text: string }[];
  highlightIndex?: number | null;
}

export function ScatterPlot({ chunks, embeddings, queryEmbedding, topResults, highlightIndex }: ScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ index: number, x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !embeddings.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * DPR;
    const H = canvas.clientHeight * DPR;
    canvas.width = W; canvas.height = H;

    const pad = 40 * DPR;
    const toX = (nx: number) => pad + (nx + 1) / 2 * (W - 2 * pad);
    const toY = (ny: number) => pad + (1 - (ny + 1) / 2) * (H - 2 * pad);

    // BG
    ctx.fillStyle = 'oklch(0.09 0.01 265)';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let g = -0.5; g <= 0.6; g += 0.5) {
      ctx.beginPath(); ctx.moveTo(toX(g), pad); ctx.lineTo(toX(g), H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, toY(g)); ctx.lineTo(W - pad, toY(g)); ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(toX(0), pad); ctx.lineTo(toX(0), H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, toY(0)); ctx.lineTo(W - pad, toY(0)); ctx.stroke();

    // Connection lines from query to top results
    if (queryEmbedding && topResults?.length) {
      const qx = toX(queryEmbedding.x), qy = toY(queryEmbedding.y);
      topResults.forEach((r, ri) => {
        const emb = embeddings[r.index];
        if (!emb) return;
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(toX(emb.x), toY(emb.y));
        ctx.strokeStyle = `rgba(255,255,255,${0.35 - ri * 0.08})`;
        ctx.lineWidth = (2.5 - ri * 0.5) * DPR;
        ctx.setLineDash([4 * DPR, 4 * DPR]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Chunk dots
    embeddings.forEach((emb, i) => {
      const cx = toX(emb.x), cy = toY(emb.y);
      const color = CHUNK_COLORS[i % CHUNK_COLORS.length].solid;
      const isTop = topResults?.some(r => r.index === i);
      const isHl = highlightIndex === i;
      const r = (isTop || isHl ? 9 : 6) * DPR;

      if (isTop || isHl) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6 * DPR, 0, Math.PI * 2);
        ctx.fillStyle = CHUNK_COLORS[i % CHUNK_COLORS.length].dim;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      ctx.font = `${10 * DPR}px 'JetBrains Mono', var(--font-geist-mono), monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(`C${i + 1}`, cx + (r + 4 * DPR), cy + 4 * DPR);
    });

    // Query dot
    if (queryEmbedding) {
      const qx = toX(queryEmbedding.x), qy = toY(queryEmbedding.y);
      // Glow
      const grad = ctx.createRadialGradient(qx, qy, 0, qx, qy, 20 * DPR);
      grad.addColorStop(0, 'rgba(255,255,255,0.25)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(qx, qy, 20 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath(); ctx.arc(qx, qy, 9 * DPR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.font = `bold ${9 * DPR}px 'Space Grotesk', var(--font-geist-sans), sans-serif`;
      ctx.fillStyle = '#111';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Q', qx, qy);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }, [embeddings, queryEmbedding, topResults, highlightIndex]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !embeddings.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = rect.width, H = rect.height;
    const pad = 40;
    const toX = (nx: number) => pad + (nx + 1) / 2 * (W - 2 * pad);
    const toY = (ny: number) => pad + (1 - (ny + 1) / 2) * (H - 2 * pad);
    let hit: number | null = null;
    embeddings.forEach((emb, i) => {
      const dx = mx - toX(emb.x), dy = my - toY(emb.y);
      if (Math.sqrt(dx * dx + dy * dy) < 14) hit = i;
    });
    if (hit !== null) {
      setTooltip({ index: hit, x: mx + 12, y: my - 12 });
    } else {
      setTooltip(null);
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        className="scatter-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ cursor: tooltip ? 'pointer' : 'default' }}
      />
      <span className="scatter-label x">Dimension 1 (PCA)</span>
      <span className="scatter-label y">Dim 2</span>
      {tooltip !== null && (
        <div className="scatter-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tt-label" style={{ color: CHUNK_COLORS[tooltip.index % CHUNK_COLORS.length].solid }}>
            Chunk {tooltip.index + 1}
          </div>
          <div className="tt-text">{chunks[tooltip.index]?.slice(0, 90)}…</div>
        </div>
      )}
    </div>
  );
}
