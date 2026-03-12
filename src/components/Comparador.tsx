'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { FC } from 'react';

interface Persona {
  id: string;
  nombre: string;
  estaturaCm: number;
  color: string;
  esFamoso?: boolean;
  foto?: string | null;
}

interface FamosoData {
  id: string;
  nombre: string;
  estaturaCm: number;
  color: string;
  foto?: string | null;
  profesion?: string;
  pais?: string;
}

interface Props {
  famosos: FamosoData[];
  inicial?: { a: string; b: string };
}

const COLORS = [
  '#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa',
];

const cmToFtIn = (cm: number): string => {
  const inches = cm / 2.54;
  const ft = Math.floor(inches / 12);
  const inLeft = Math.round(inches % 12);
  return `${ft}'${inLeft}"`;
};

// Simple SVG human silhouette path (normalized 0-1 coordinates, bottom anchored)
const SilhouetteSVG: FC<{ color: string; height: number; label: string; cm: number }> = ({
  color, height, label, cm
}) => {
  const headR = 12;
  const bodyW = 28;
  const bodyH = height * 0.38;
  const legH = height * 0.42;
  const totalW = 56;
  const cx = totalW / 2;
  const topY = 0;
  const headBottom = topY + headR * 2;
  const bodyBottom = headBottom + bodyH;

  return (
    <g>
      {/* Head */}
      <circle cx={cx} cy={topY + headR} r={headR} fill={color} opacity={0.9} />
      {/* Body */}
      <rect x={cx - bodyW / 2} y={headBottom} width={bodyW} height={bodyH} rx={6} fill={color} opacity={0.85} />
      {/* Left leg */}
      <rect x={cx - bodyW / 2} y={bodyBottom} width={bodyW / 2 - 2} height={legH} rx={5} fill={color} opacity={0.8} />
      {/* Right leg */}
      <rect x={cx + 2} y={bodyBottom} width={bodyW / 2 - 2} height={legH} rx={5} fill={color} opacity={0.8} />
      {/* Name label */}
      <text x={cx} y={height + 18} textAnchor="middle" fontSize="11" fill={color} fontWeight="600" fontFamily="Inter, sans-serif">
        {label.length > 12 ? label.slice(0, 11) + '…' : label}
      </text>
      {/* Height label */}
      <text x={cx} y={height + 32} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Inter, sans-serif">
        {cm}cm / {cmToFtIn(cm)}
      </text>
    </g>
  );
};

const Comparador: FC<Props> = ({ famosos, inicial }) => {
  const [personas, setPersonas] = useState<Persona[]>(() => {
    const defaults: Persona[] = [];
    if (inicial?.a) {
      const f = famosos.find(x => x.id === inicial.a);
      if (f) defaults.push({ ...f, esFamoso: true });
    }
    if (inicial?.b) {
      const f = famosos.find(x => x.id === inicial.b);
      if (f) defaults.push({ ...f, esFamoso: true });
    }
    if (defaults.length === 0) {
      // Default: Messi vs Cristiano
      const messi = famosos.find(x => x.id === 'lionel-messi');
      const cr7 = famosos.find(x => x.id === 'cristiano-ronaldo');
      if (messi) defaults.push({ ...messi, esFamoso: true });
      if (cr7) defaults.push({ ...cr7, esFamoso: true });
    }
    return defaults;
  });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FamosoData[]>([]);
  const [customNombre, setCustomNombre] = useState('');
  const [customCm, setCustomCm] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Autocomplete
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    setSuggestions(famosos.filter(f =>
      f.nombre.toLowerCase().includes(q) && !personas.find(p => p.id === f.id)
    ).slice(0, 6));
  }, [query, famosos, personas]);

  const addFamoso = (f: FamosoData) => {
    if (personas.length >= 5) return;
    setPersonas(prev => [...prev, { ...f, esFamoso: true }]);
    setQuery('');
    setSuggestions([]);
  };

  const addCustom = () => {
    const cm = parseInt(customCm);
    if (!customNombre.trim() || isNaN(cm) || cm < 50 || cm > 300) return;
    const idx = personas.length;
    setPersonas(prev => [...prev, {
      id: `custom-${Date.now()}`,
      nombre: customNombre,
      estaturaCm: cm,
      color: COLORS[idx % COLORS.length],
      esFamoso: false,
    }]);
    setCustomNombre('');
    setCustomCm('');
  };

  const removePerson = (id: string) => {
    setPersonas(prev => prev.filter(p => p.id !== id));
  };

  // SVG dimensions
  const MAX_DISPLAY_H = 220; // px for tallest person
  const maxCm = Math.max(...personas.map(p => p.estaturaCm), 1);
  const personWidth = 64;
  const gap = 20;
  const svgWidth = personas.length * (personWidth + gap) + gap;
  const svgHeight = MAX_DISPLAY_H + 60; // + label space

  // Share: draw to canvas and download
  const handleShare = async () => {
    setShareStatus('loading');
    try {
      const canvas = canvasRef.current!;
      const padding = 32;
      const titleH = 48;
      const W = svgWidth + padding * 2;
      const H = svgHeight + titleH + padding * 2;

      canvas.width = W * 2; // @2x
      canvas.height = H * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y <= MAX_DISPLAY_H; y += 20) {
        const yPos = padding + titleH + MAX_DISPLAY_H - y;
        ctx.beginPath();
        ctx.moveTo(padding, yPos);
        ctx.lineTo(W - padding, yPos);
        ctx.stroke();
      }

      // Title
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText('Comparador de estaturas', W / 2, padding + 20);
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('estaturas.com', W / 2, padding + 36);

      // Draw people
      personas.forEach((p, i) => {
        const displayH = (p.estaturaCm / maxCm) * MAX_DISPLAY_H;
        const x = padding + gap / 2 + i * (personWidth + gap);
        const baseY = padding + titleH + MAX_DISPLAY_H;

        // Silhouette (simplified rect + circle for canvas)
        const headR = Math.max(8, displayH * 0.1);
        const bodyH = displayH * 0.38;
        const legH = displayH * 0.42;
        const bw = personWidth * 0.5;
        const cx2 = x + personWidth / 2;

        ctx.fillStyle = p.color + 'dd';
        // Head
        ctx.beginPath();
        ctx.arc(cx2, baseY - displayH + headR, headR, 0, Math.PI * 2);
        ctx.fill();
        // Body
        const bodyTop = baseY - displayH + headR * 2;
        ctx.fillRect(cx2 - bw / 2, bodyTop, bw, bodyH);
        // Legs
        ctx.fillRect(cx2 - bw / 2, bodyTop + bodyH, bw / 2 - 2, legH);
        ctx.fillRect(cx2 + 2, bodyTop + bodyH, bw / 2 - 2, legH);

        // Labels
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        const shortName = p.nombre.length > 12 ? p.nombre.slice(0, 11) + '…' : p.nombre;
        ctx.fillText(shortName, cx2, baseY + 14);
        ctx.font = '8px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${p.estaturaCm}cm`, cx2, baseY + 26);
      });

      // Download
      const link = document.createElement('a');
      link.download = `estaturas-${personas.map(p => p.nombre.split(' ')[0]).join('-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setShareStatus('done');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setShareStatus('idle');
    }
  };

  // URL share
  const shareUrl = () => {
    const ids = personas.filter(p => p.esFamoso).map(p => p.id).join('-vs-');
    const url = `${window.location.origin}/comparar/${ids}`;
    navigator.clipboard?.writeText(url);
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Visualization */}
      <div className="relative bg-slate-950 p-4 overflow-x-auto">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          className="mx-auto block"
          style={{ minWidth: `${svgWidth}px` }}
        >
          {/* Grid */}
          {Array.from({ length: 12 }).map((_, i) => {
            const y = MAX_DISPLAY_H - (i * (MAX_DISPLAY_H / 11));
            return (
              <line key={i} x1={0} y1={y} x2={svgWidth} y2={y}
                stroke="rgba(148,163,184,0.07)" strokeWidth={1} />
            );
          })}
          {/* Height ruler marks */}
          {[150, 160, 170, 180, 190, 200, 210].map(h => {
            const y = MAX_DISPLAY_H - (h / maxCm) * MAX_DISPLAY_H;
            if (y < 0 || y > MAX_DISPLAY_H) return null;
            return (
              <g key={h}>
                <line x1={0} y1={y} x2={8} y2={y} stroke="#475569" strokeWidth={1} />
                <text x={10} y={y + 4} fontSize={9} fill="#475569" fontFamily="Inter, sans-serif">{h}cm</text>
              </g>
            );
          })}
          {/* People */}
          {personas.map((p, i) => {
            const displayH = (p.estaturaCm / maxCm) * MAX_DISPLAY_H;
            const x = gap / 2 + i * (personWidth + gap) + 24; // offset for ruler
            return (
              <g key={p.id} transform={`translate(${x}, ${MAX_DISPLAY_H - displayH})`}>
                <SilhouetteSVG
                  color={p.color}
                  height={displayH}
                  label={p.nombre}
                  cm={p.estaturaCm}
                />
              </g>
            );
          })}
        </svg>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Person pills */}
        <div className="flex flex-wrap gap-2">
          {personas.map(p => (
            <div key={p.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: p.color + '22', color: p.color, border: `1px solid ${p.color}44` }}
            >
              <span>{p.nombre}</span>
              <span className="opacity-70 text-xs">{p.estaturaCm}cm</span>
              <button onClick={() => removePerson(p.id)}
                className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Eliminar ${p.nombre}`}>
                ×
              </button>
            </div>
          ))}
        </div>

        {personas.length < 5 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Famoso search */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar famoso..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => addFamoso(s)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 transition-colors text-left">
                      <span className="text-slate-200 text-sm">{s.nombre}</span>
                      <span className="text-slate-400 text-xs">{s.estaturaCm}cm</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Custom person */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tu nombre"
                value={customNombre}
                onChange={e => setCustomNombre(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <input
                type="number"
                placeholder="cm"
                value={customCm}
                onChange={e => setCustomCm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
                min={50} max={300}
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button onClick={addCustom}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
                +
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={handleShare} disabled={shareStatus === 'loading'}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
            {shareStatus === 'done' ? '✅ Descargado' : shareStatus === 'loading' ? '⏳ Generando...' : '📸 Descargar imagen'}
          </button>
          <button onClick={shareUrl}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            🔗 Copiar enlace
          </button>
        </div>
      </div>
    </div>
  );
};

export default Comparador;
