'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import type { FC, MouseEvent } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface FamosoData {
  id: string; nombre: string; estaturaCm: number;
  color: string; foto?: string | null; profesion?: string; pais?: string; apodo?: string;
}
interface Persona extends FamosoData { key: string; esFamoso?: boolean; }

interface Props {
  famosos: FamosoData[];
  inicial?: { a?: string; b?: string };
}

/* ─── Helpers ───────────────────────────────────────────────────────── */
const WARM_PALETTE = [
  { from: '#f59e0b', to: '#d97706' },   // Amber/orange
  { from: '#8b5cf6', to: '#7c3aed' },   // Purple/violet
  { from: '#f43f5e', to: '#e11d48' },   // Coral/pink
  { from: '#14b8a6', to: '#0d9488' },   // Teal
  { from: '#fb923c', to: '#ea580c' },   // Rose gold
];

const getWarmColor = (i: number) => WARM_PALETTE[i % WARM_PALETTE.length];

const cmToFtIn = (cm: number) => {
  const i = cm / 2.54;
  let ft = Math.floor(i / 12);
  let inches = Math.round(i % 12);
  if (inches === 12) { ft += 1; inches = 0; }
  return `${ft}'${inches}"`;
};

/* ─── Human Silhouette ──────────────────────────────────────────────── */
// Clean minimal human silhouette - single path, arms at sides, standing straight
// Normalized to a 40×100 viewBox for simplicity
const HUMAN_PATH = `
  M20,0 C23,0 25,2 25,5 C25,8 23,10 20,10 C17,10 15,8 15,5 C15,2 17,0 20,0 Z
  M16,11 L24,11 C25,11 26,12 26,13 L28,25 L27,25 L25,16 L25,58 L30,58 L30,100 L23,100 L23,60 L20,60 L17,60 L17,100 L10,100 L10,58 L15,58 L15,16 L13,25 L12,25 L14,13 C14,12 15,11 16,11 Z
`;

// viewBox dimensions for the silhouette
const SIL_VB_W = 40;
const SIL_VB_H = 100;
const SILHOUETTE_ASPECT = SIL_VB_W / SIL_VB_H;

const SilhouettePath: FC<{
  colorFrom: string; colorTo: string; gradId: string; displayH: number;
  animate: boolean; label: string; cm: number;
}> = ({ colorFrom, colorTo, gradId, displayH, animate, label, cm }) => {
  const pw = displayH * SILHOUETTE_ASPECT;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const scale = ready && animate ? 1 : animate ? 0 : 1;

  return (
    <g style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: `scaleY(${scale})`, transition: 'transform 0.5s cubic-bezier(0.34,1.2,0.64,1)' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorFrom} stopOpacity="0.95" />
          <stop offset="100%" stopColor={colorTo} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <svg width={pw} height={displayH} viewBox="0 0 40 100" overflow="visible">
        <path d={HUMAN_PATH} fill={`url(#${gradId})`} />
      </svg>
    </g>
  );
};

/* ─── Main component ────────────────────────────────────────────────── */
const Comparador: FC<Props> = ({ famosos, inicial }) => {
  const uid = useId().replace(/:/g, '');

  const [personas, setPersonas] = useState<Persona[]>(() => {
    const make = (id: string, i: number): Persona | null => {
      const f = famosos.find(x => x.id === id);
      if (!f) return null;
      return { ...f, color: getWarmColor(i).from, key: `${id}-${Date.now()}-${i}`, esFamoso: true };
    };
    const a = inicial?.a ? make(inicial.a, 0) : null;
    const b = inicial?.b ? make(inicial.b, 1) : null;
    if (a && b) return [a, b];
    const m = make('lionel-messi', 0);
    const c = make('cristiano-ronaldo', 1);
    return [m, c].filter(Boolean) as Persona[];
  });

  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FamosoData[]>([]);
  const [customNombre, setCustomNombre] = useState('');
  const [customCm, setCustomCm] = useState('');
  const [hoverCm, setHoverCm] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle'|'loading'|'done'>('idle');
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout constants - wider to accommodate full names
  const RULER_W = 44;
  const PERSON_W = 110;
  const GAP = 32;
  const MAX_H = 260;
  const LABEL_H = 56;
  const maxCm = Math.max(...personas.map(p => p.estaturaCm), 1);

  const svgW = RULER_W + personas.length * (PERSON_W + GAP) + GAP;
  const svgH = MAX_H + LABEL_H;

  /* Autocomplete */
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    setSuggestions(famosos.filter(f =>
      (f.nombre.toLowerCase().includes(q) || (f.apodo || '').toLowerCase().includes(q))
      && !personas.find(p => p.id === f.id)
    ).slice(0, 6));
  }, [query, famosos, personas]);

  const addFamoso = (f: FamosoData) => {
    if (personas.length >= 5) return;
    const key = `${f.id}-${Date.now()}`;
    const palette = getWarmColor(personas.length);
    setNewKeys(prev => new Set(prev).add(key));
    setPersonas(prev => [...prev, { ...f, color: palette.from, key, esFamoso: true }]);
    setQuery(''); setSuggestions([]);
  };

  const addCustom = () => {
    const cm = parseInt(customCm);
    if (!customNombre.trim() || isNaN(cm) || cm < 50 || cm > 300) return;
    const key = `custom-${Date.now()}`;
    const palette = getWarmColor(personas.length);
    setNewKeys(prev => new Set(prev).add(key));
    setPersonas(prev => [...prev, {
      id: key, nombre: customNombre, estaturaCm: cm,
      color: palette.from, key, esFamoso: false,
    }]);
    setCustomNombre(''); setCustomCm('');
  };

  const removePerson = (key: string) =>
    setPersonas(prev => prev.filter(p => p.key !== key));

  /* Hover line */
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const cm = Math.round(maxCm * (MAX_H - y) / MAX_H);
    setHoverCm(cm > 0 && cm <= maxCm + 30 ? cm : null);
  };

  /* Share image — canvas draw */
  const handleShare = async () => {
    setShareStatus('loading');
    try {
      const canvas = canvasRef.current!;
      const PAD = 40, TITLE_H = 64, FOOTER_H = 36;
      const personW = 110, personGap = 36;
      const bodyH = 300;
      const W = PAD * 2 + personas.length * (personW + personGap) - personGap + PAD;
      const H = TITLE_H + bodyH + FOOTER_H + PAD * 2;

      canvas.width = W * 2; canvas.height = H * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);

      // BG warm dark
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0f0d13'); bg.addColorStop(1, '#1a1520');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Subtle warm radial
      const radial = ctx.createRadialGradient(W/2, 0, 0, W/2, H/2, H);
      radial.addColorStop(0, 'rgba(245,158,11,0.04)');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial; ctx.fillRect(0, 0, W, H);

      // Title
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#fef3c7';
      const title = personas.map(p => p.nombre.split(' ')[0]).join(' vs ');
      ctx.fillText(title, W / 2, PAD + 22);

      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#92856b';
      ctx.fillText('estaturas.com', W / 2, PAD + 40);

      // Grid lines
      const maxC = Math.max(...personas.map(p => p.estaturaCm));
      ctx.strokeStyle = 'rgba(245,158,11,0.06)';
      ctx.lineWidth = 1;
      for (let h = 150; h <= maxC + 20; h += 10) {
        const y = TITLE_H + PAD + bodyH - (h / maxC) * bodyH;
        if (y < TITLE_H + PAD) continue;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
        if (h % 10 === 0) {
          ctx.font = '9px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#78716c';
          ctx.textAlign = 'left';
          ctx.fillText(`${h}`, PAD + 2, y - 3);
        }
      }

      // Draw each person
      personas.forEach((p, i) => {
        const palette = getWarmColor(i);
        const displayH = (p.estaturaCm / maxC) * bodyH;
        const cx = PAD + personW / 2 + i * (personW + personGap);
        const baseY = TITLE_H + PAD + bodyH;

        // Draw clean silhouette on canvas using the same simple path approach
        const silW = displayH * SILHOUETTE_ASPECT;
        const silX = cx - silW / 2;
        const silY = baseY - displayH;
        const scaleX = silW / SIL_VB_W;
        const scaleY = displayH / SIL_VB_H;

        const grad = ctx.createLinearGradient(cx, silY, cx, baseY);
        grad.addColorStop(0, palette.from + 'ee');
        grad.addColorStop(1, palette.to + '88');
        ctx.fillStyle = grad;

        // Use Path2D with transform for the simple silhouette
        ctx.save();
        ctx.translate(silX, silY);
        ctx.scale(scaleX, scaleY);

        // Head
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.bezierCurveTo(23, 0, 25, 2, 25, 5);
        ctx.bezierCurveTo(25, 8, 23, 10, 20, 10);
        ctx.bezierCurveTo(17, 10, 15, 8, 15, 5);
        ctx.bezierCurveTo(15, 2, 17, 0, 20, 0);
        ctx.closePath();
        ctx.fill();

        // Body - arms at sides, two legs
        ctx.beginPath();
        ctx.moveTo(16, 11); ctx.lineTo(24, 11);
        ctx.bezierCurveTo(25, 11, 26, 12, 26, 13);
        ctx.lineTo(28, 25); ctx.lineTo(27, 25); ctx.lineTo(25, 16);
        ctx.lineTo(25, 58); ctx.lineTo(30, 58); ctx.lineTo(30, 100);
        ctx.lineTo(23, 100); ctx.lineTo(23, 60); ctx.lineTo(20, 60);
        ctx.lineTo(17, 60); ctx.lineTo(17, 100); ctx.lineTo(10, 100);
        ctx.lineTo(10, 58); ctx.lineTo(15, 58); ctx.lineTo(15, 16);
        ctx.lineTo(13, 25); ctx.lineTo(12, 25); ctx.lineTo(14, 13);
        ctx.bezierCurveTo(14, 12, 15, 11, 16, 11);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Label
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = palette.from;
        const displayName = p.nombre.length > 20 ? p.nombre.slice(0, 19) + '…' : p.nombre;
        ctx.fillText(displayName, cx, baseY + 18);
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#a8a29e';
        ctx.fillText(`${p.estaturaCm}cm · ${cmToFtIn(p.estaturaCm)}`, cx, baseY + 30);

        // Diff to next
        if (i < personas.length - 1) {
          const next = personas[i + 1];
          const diff = next.estaturaCm - p.estaturaCm;
          const diffY = baseY - Math.min(displayH, (next.estaturaCm / maxC) * bodyH) - 10;
          const diffX = cx + personW / 2 + personGap / 2;
          ctx.font = 'bold 9px Inter, system-ui, sans-serif';
          ctx.fillStyle = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#a8a29e';
          ctx.textAlign = 'center';
          ctx.fillText(`${diff > 0 ? '+' : ''}${diff}cm`, diffX, diffY);
        }
      });

      // Footer
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#57534e';
      ctx.textAlign = 'right';
      ctx.fillText('estaturas.com', W - PAD, H - 12);

      // Download
      const link = document.createElement('a');
      link.download = `estaturas-${personas.map(p => p.nombre.split(' ')[0]).join('-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setShareStatus('done');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (e) {
      console.error(e); setShareStatus('idle');
    }
  };

  const handleCopyLink = () => {
    const ids = personas.filter(p => p.esFamoso).map(p => p.id).join('-vs-');
    const url = ids
      ? `${window.location.origin}/comparar/${ids}`
      : window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const hoverY = hoverCm !== null ? MAX_H - (hoverCm / maxCm) * MAX_H : null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f0d13 0%, #1a1520 100%)', border: '1px solid rgba(245,158,11,0.12)' }}>

      {/* ── Visualization ── */}
      <div className="relative overflow-x-auto"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.04) 0%, transparent 70%)' }}>
        <svg
          ref={svgRef}
          width={svgW} height={svgH}
          className="block mx-auto select-none"
          style={{ minWidth: `${svgW}px`, cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCm(null)}
        >
          {/* Grid */}
          {[150, 160, 170, 175, 180, 190, 200, 210, 220].map(h => {
            const y = MAX_H - (h / maxCm) * MAX_H;
            if (y < 4 || y > MAX_H) return null;
            return (
              <g key={h}>
                <line x1={RULER_W} y1={y} x2={svgW} y2={y}
                  stroke="rgba(245,158,11,0.06)" strokeWidth={1} />
                <text x={RULER_W - 6} y={y + 4} textAnchor="end" fontSize={11}
                  fill="#a8a29e" fontFamily="Inter, system-ui, sans-serif" fontWeight="500">{h}</text>
                <line x1={RULER_W - 4} y1={y} x2={RULER_W} y2={y}
                  stroke="#78716c" strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Baseline */}
          <line x1={RULER_W} y1={MAX_H} x2={svgW} y2={MAX_H}
            stroke="rgba(245,158,11,0.15)" strokeWidth={1} />

          {/* Hover height line */}
          {hoverY !== null && hoverCm !== null && (
            <g>
              <line x1={RULER_W} y1={hoverY} x2={svgW} y2={hoverY}
                stroke="rgba(253,224,71,0.4)" strokeWidth={1} strokeDasharray="4 4" />
              <rect x={svgW - 56} y={hoverY - 11} width={54} height={18}
                rx={5} fill="#292524" stroke="rgba(245,158,11,0.3)" strokeWidth={0.5} />
              <text x={svgW - 29} y={hoverY + 2} textAnchor="middle" fontSize={10}
                fill="#fef3c7" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">
                {hoverCm}cm
              </text>
            </g>
          )}

          {/* People */}
          {personas.map((p, i) => {
            const palette = getWarmColor(i);
            const displayH = (p.estaturaCm / maxCm) * MAX_H;
            const x = RULER_W + GAP / 2 + i * (PERSON_W + GAP);
            const baseX = x + PERSON_W / 2 - (displayH * SILHOUETTE_ASPECT) / 2;
            const gradId = `grad-${uid}-${i}`;

            // Height diff to next
            const next = personas[i + 1];
            const diff = next ? next.estaturaCm - p.estaturaCm : null;
            const diffY = diff !== null
              ? MAX_H - Math.max(displayH, (next!.estaturaCm / maxCm) * MAX_H) - 14
              : null;

            // Show full name up to 20 chars
            const displayName = p.nombre.length > 20
              ? p.nombre.slice(0, 19) + '…'
              : p.nombre;

            return (
              <g key={p.key}>
                {/* Silhouette */}
                <g transform={`translate(${baseX}, ${MAX_H - displayH})`}>
                  <SilhouettePath
                    colorFrom={palette.from} colorTo={palette.to}
                    gradId={gradId} displayH={displayH}
                    animate={newKeys.has(p.key)}
                    label={p.nombre} cm={p.estaturaCm}
                  />
                </g>

                {/* Height marker at top of head */}
                <line
                  x1={x + PERSON_W / 2 - 8} y1={MAX_H - displayH}
                  x2={x + PERSON_W / 2 + 8} y2={MAX_H - displayH}
                  stroke={palette.from} strokeWidth={1.5} opacity={0.6}
                />

                {/* Name label */}
                <text x={x + PERSON_W / 2} y={MAX_H + 20} textAnchor="middle"
                  fontSize={11} fill={palette.from} fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif">
                  {displayName}
                </text>
                <text x={x + PERSON_W / 2} y={MAX_H + 34} textAnchor="middle"
                  fontSize={10} fill="#a8a29e" fontFamily="Inter, system-ui, sans-serif">
                  {p.estaturaCm}cm · {cmToFtIn(p.estaturaCm)}
                </text>

                {/* Diff badge between persons */}
                {diff !== null && diffY !== null && (
                  <g>
                    <line
                      x1={x + PERSON_W + 2} y1={diffY + 8}
                      x2={x + PERSON_W + GAP - 2} y2={diffY + 8}
                      stroke={diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#a8a29e'}
                      strokeWidth={1.5}
                    />
                    <rect x={x + PERSON_W + GAP / 2 - 20} y={diffY - 2} width={40} height={16}
                      rx={5} fill="#292524" stroke={diff > 0 ? 'rgba(52,211,153,0.2)' : diff < 0 ? 'rgba(248,113,113,0.2)' : 'rgba(168,162,158,0.2)'} strokeWidth={0.5} />
                    <text
                      x={x + PERSON_W + GAP / 2} y={diffY + 9}
                      textAnchor="middle" fontSize={9} fontWeight="700"
                      fill={diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#a8a29e'}
                      fontFamily="Inter, system-ui, sans-serif">
                      {diff > 0 ? '+' : ''}{diff}cm
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ── Controls ── */}
      <div className="p-5 space-y-4 border-t" style={{ borderColor: 'rgba(245,158,11,0.08)' }}>

        {/* Person pills */}
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {personas.map((p, i) => {
            const palette = getWarmColor(i);
            return (
              <div key={p.key}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: `${palette.from}18`,
                  color: palette.from,
                  border: `1px solid ${palette.from}40`,
                }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }} />
                {p.nombre}
                <span className="opacity-60 font-normal text-xs">{p.estaturaCm}cm</span>
                <button onClick={() => removePerson(p.key)}
                  className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity text-base leading-none"
                  aria-label={`Eliminar ${p.nombre}`}>×</button>
              </div>
            );
          })}
          {personas.length === 0 && (
            <p className="text-stone-600 text-sm">Añade personas para comparar →</p>
          )}
        </div>

        {personas.length < 5 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Famoso search */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">🔍</div>
              <input type="text" placeholder="Buscar famoso..." value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-stone-200 placeholder-stone-600 focus:outline-none transition-colors"
                style={{ background: 'rgba(41,37,36,0.8)', border: '1px solid rgba(245,158,11,0.12)' }}
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1.5 w-full rounded-xl shadow-2xl overflow-hidden"
                  style={{ background: '#292524', border: '1px solid rgba(245,158,11,0.15)' }}>
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => addFamoso(s)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-700/50 transition-colors text-left">
                      <div>
                        <span className="text-stone-200 text-sm font-medium">{s.nombre}</span>
                        {s.profesion && <span className="text-stone-500 text-xs ml-2">{s.profesion}</span>}
                      </div>
                      <span className="text-stone-400 text-xs font-mono">{s.estaturaCm}cm</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom person */}
            <div className="flex gap-2">
              <input type="text" placeholder="Tu nombre" value={customNombre}
                onChange={e => setCustomNombre(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm text-stone-200 placeholder-stone-600 focus:outline-none transition-colors"
                style={{ background: 'rgba(41,37,36,0.8)', border: '1px solid rgba(245,158,11,0.12)' }}
              />
              <input type="number" placeholder="cm" value={customCm}
                onChange={e => setCustomCm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
                min={50} max={300}
                className="w-20 px-2 py-2.5 rounded-xl text-sm text-stone-200 placeholder-stone-600 focus:outline-none text-center transition-colors"
                style={{ background: 'rgba(41,37,36,0.8)', border: '1px solid rgba(245,158,11,0.12)' }}
              />
              <button onClick={addCustom}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                +
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={handleShare} disabled={shareStatus === 'loading' || personas.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: 'rgba(41,37,36,0.8)', border: '1px solid rgba(245,158,11,0.15)', color: '#fef3c7' }}>
            {shareStatus === 'done' ? '✅ Descargado' : shareStatus === 'loading' ? '⏳ Generando…' : '📸 Descargar imagen'}
          </button>
          <button onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(41,37,36,0.8)', border: '1px solid rgba(245,158,11,0.15)', color: '#fef3c7' }}>
            {copied ? '✅ Copiado' : '🔗 Copiar enlace'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Comparador;
