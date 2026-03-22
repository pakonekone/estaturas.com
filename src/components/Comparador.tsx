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
const COLORS = ['#60a5fa','#34d399','#f59e0b','#f472b6','#a78bfa','#fb923c','#2dd4bf'];
const cmToFtIn = (cm: number) => {
  const i = cm / 2.54;
  let ft = Math.floor(i / 12);
  let inches = Math.round(i % 12);
  if (inches === 12) { ft += 1; inches = 0; }
  return `${ft}'${inches}"`;
};

/* ─── Human Silhouette ──────────────────────────────────────────────── */
// Normalized viewBox: 40 × 100 units. Feet at y=100, head at y=0.
const SILHOUETTE_ASPECT = 40 / 100; // width / height

const SilhouettePath: FC<{
  color: string; gradId: string; displayH: number;
  animate: boolean; photo?: string | null; label: string; cm: number;
}> = ({ color, gradId, displayH, animate, photo, label, cm }) => {
  const pw = displayH * SILHOUETTE_ASPECT;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // stagger so CSS transition fires
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const scale = ready && animate ? 1 : animate ? 0 : 1;

  return (
    <g style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transform: `scaleY(${scale})`, transition: 'transform 0.45s cubic-bezier(0.34,1.2,0.64,1)' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Body — normalized to pw × displayH */}
      <svg width={pw} height={displayH} viewBox="0 0 40 100" overflow="visible">
        {/* Head */}
        <ellipse cx="20" cy="7.5" rx="7.5" ry="8" fill={`url(#${gradId})`} />
        {/* Neck */}
        <rect x="17" y="15.5" width="6" height="3.5" rx="1" fill={`url(#${gradId})`} />
        {/* Shoulders */}
        <path d="M17,19 Q4,20 3,26 L37,26 Q36,20 23,19 Z" fill={`url(#${gradId})`} />
        {/* Left arm */}
        <path d="M3,26 L0,54 L7,54 L8,26 Z" rx="2" fill={`url(#${gradId})`} />
        {/* Right arm */}
        <path d="M37,26 L40,54 L33,54 L32,26 Z" rx="2" fill={`url(#${gradId})`} />
        {/* Torso (slight waist) */}
        <path d="M8,26 L32,26 L30,58 L10,58 Z" fill={`url(#${gradId})`} />
        {/* Left leg */}
        <path d="M10,57 L20,57 L19.5,100 L10,100 Z" rx="2" fill={`url(#${gradId})`} />
        {/* Right leg */}
        <path d="M20,57 L30,57 L30,100 L20.5,100 Z" rx="2" fill={`url(#${gradId})`} />
        {/* Highlight strip on torso */}
        <path d="M18,19 Q20,18 22,19 L21.5,55 L18.5,55 Z" fill="white" opacity="0.12" />
      </svg>

      {/* Photos shown in cards/lists only — silhouettes are the comparator's identity */}
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
      return { ...f, key: `${id}-${Date.now()}-${i}`, esFamoso: true };
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

  // Layout constants
  const RULER_W = 32;
  const PERSON_W = 72;
  const GAP = 28;
  const MAX_H = 240; // display px for tallest person
  const LABEL_H = 52;
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
    setNewKeys(prev => new Set(prev).add(key));
    setPersonas(prev => [...prev, { ...f, key, esFamoso: true }]);
    setQuery(''); setSuggestions([]);
  };

  const addCustom = () => {
    const cm = parseInt(customCm);
    if (!customNombre.trim() || isNaN(cm) || cm < 50 || cm > 300) return;
    const key = `custom-${Date.now()}`;
    setNewKeys(prev => new Set(prev).add(key));
    setPersonas(prev => [...prev, {
      id: key, nombre: customNombre, estaturaCm: cm,
      color: COLORS[prev.length % COLORS.length], key, esFamoso: false,
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
      const personW = 80, personGap = 32;
      const bodyH = 280;
      const W = PAD * 2 + personas.length * (personW + personGap) - personGap + PAD;
      const H = TITLE_H + bodyH + FOOTER_H + PAD * 2;

      canvas.width = W * 2; canvas.height = H * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);

      // BG gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0a0a14'); bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Dot grid
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let x = 0; x < W; x += 24) for (let y = 0; y < H; y += 24) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
      }

      // Title
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#f1f5f9';
      const title = personas.map(p => p.nombre.split(' ')[0]).join(' vs ');
      ctx.fillText(title, W / 2, PAD + 22);

      // Subtitle
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('estaturas.com', W / 2, PAD + 40);

      // Grid lines
      const maxC = Math.max(...personas.map(p => p.estaturaCm));
      ctx.strokeStyle = 'rgba(148,163,184,0.07)';
      ctx.lineWidth = 1;
      for (let h = 150; h <= maxC + 20; h += 10) {
        const y = TITLE_H + PAD + bodyH - (h / maxC) * bodyH;
        if (y < TITLE_H + PAD) continue;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
        if (h % 20 === 0) {
          ctx.font = '8px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'left';
          ctx.fillText(`${h}`, PAD, y - 2);
        }
      }

      // Draw each person
      personas.forEach((p, i) => {
        const displayH = (p.estaturaCm / maxC) * bodyH;
        const cx = PAD + personW / 2 + i * (personW + personGap);
        const baseY = TITLE_H + PAD + bodyH;

        // Silhouette — simplified human shape on canvas
        const grad = ctx.createLinearGradient(cx, baseY - displayH, cx, baseY);
        grad.addColorStop(0, p.color + 'f0');
        grad.addColorStop(1, p.color + '60');
        ctx.fillStyle = grad;

        const sx = displayH * 0.4; // silhouette width
        const headR = Math.max(6, displayH * 0.075);
        const neckH = displayH * 0.04;
        const torsoH = displayH * 0.38;
        const legH = displayH * 0.42;
        const armW = sx * 0.14;
        const bodyW = sx * 0.52;

        const top = baseY - displayH;
        // Head
        ctx.beginPath(); ctx.arc(cx, top + headR, headR, 0, Math.PI * 2); ctx.fill();
        // Neck
        ctx.fillRect(cx - sx * 0.08, top + headR * 2, sx * 0.16, neckH);
        // Body
        const bodyTop = top + headR * 2 + neckH;
        ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, torsoH);
        // Arms
        ctx.fillRect(cx - bodyW / 2 - armW, bodyTop, armW, torsoH * 0.85);
        ctx.fillRect(cx + bodyW / 2, bodyTop, armW, torsoH * 0.85);
        // Legs
        const hipY = bodyTop + torsoH;
        ctx.fillRect(cx - bodyW / 2, hipY, bodyW / 2 - 1, legH);
        ctx.fillRect(cx + 1, hipY, bodyW / 2 - 1, legH);

        // Label
        ctx.textAlign = 'center';
        ctx.font = 'bold 10px Inter, system-ui, sans-serif';
        ctx.fillStyle = p.color;
        ctx.fillText(p.nombre.length > 13 ? p.nombre.slice(0, 12) + '…' : p.nombre, cx, baseY + 16);
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${p.estaturaCm}cm · ${cmToFtIn(p.estaturaCm)}`, cx, baseY + 28);

        // Diff to next person
        if (i < personas.length - 1) {
          const next = personas[i + 1];
          const diff = next.estaturaCm - p.estaturaCm;
          const diffY = baseY - Math.min(displayH, (next.estaturaCm / maxC) * bodyH) - 8;
          const diffX = cx + personW / 2 + personGap / 2;
          ctx.font = 'bold 9px Inter, system-ui, sans-serif';
          ctx.fillStyle = diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#94a3b8';
          ctx.textAlign = 'center';
          ctx.fillText(`${diff > 0 ? '+' : ''}${diff}cm`, diffX, diffY);
        }
      });

      // Footer watermark
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#334155';
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
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f172a 100%)', border: '1px solid rgba(148,163,184,0.1)' }}>

      {/* ── Visualization ── */}
      <div className="relative overflow-x-auto"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.06) 0%, transparent 70%)' }}>
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
                  stroke="rgba(148,163,184,0.07)" strokeWidth={1} />
                <text x={RULER_W - 4} y={y + 4} textAnchor="end" fontSize={8}
                  fill="#334155" fontFamily="Inter, system-ui, sans-serif">{h}</text>
                <line x1={RULER_W - 6} y1={y} x2={RULER_W} y2={y}
                  stroke="#334155" strokeWidth={1} />
              </g>
            );
          })}

          {/* Baseline */}
          <line x1={RULER_W} y1={MAX_H} x2={svgW} y2={MAX_H}
            stroke="rgba(148,163,184,0.2)" strokeWidth={1} />

          {/* Hover height line */}
          {hoverY !== null && hoverCm !== null && (
            <g>
              <line x1={RULER_W} y1={hoverY} x2={svgW} y2={hoverY}
                stroke="rgba(250,250,250,0.35)" strokeWidth={1} strokeDasharray="4 4" />
              <rect x={svgW - 52} y={hoverY - 10} width={50} height={16}
                rx={4} fill="#1e293b" stroke="rgba(148,163,184,0.3)" strokeWidth={0.5} />
              <text x={svgW - 27} y={hoverY + 1.5} textAnchor="middle" fontSize={9}
                fill="#e2e8f0" fontFamily="Inter, system-ui, sans-serif" fontWeight="600">
                {hoverCm}cm
              </text>
            </g>
          )}

          {/* People */}
          {personas.map((p, i) => {
            const displayH = (p.estaturaCm / maxCm) * MAX_H;
            const x = RULER_W + GAP / 2 + i * (PERSON_W + GAP);
            const baseX = x + PERSON_W / 2 - (displayH * SILHOUETTE_ASPECT) / 2;
            const gradId = `grad-${uid}-${i}`;

            // Height diff to next
            const next = personas[i + 1];
            const diff = next ? next.estaturaCm - p.estaturaCm : null;
            const diffY = diff !== null
              ? MAX_H - Math.max(displayH, (next!.estaturaCm / maxCm) * MAX_H) - 12
              : null;

            return (
              <g key={p.key}>
                {/* Silhouette */}
                <g transform={`translate(${baseX}, ${MAX_H - displayH})`}>
                  <SilhouettePath
                    color={p.color} gradId={gradId} displayH={displayH}
                    animate={newKeys.has(p.key)} photo={p.foto}
                    label={p.nombre} cm={p.estaturaCm}
                  />
                </g>

                {/* Glow at feet */}
                <ellipse cx={x + PERSON_W / 2} cy={MAX_H} rx={displayH * 0.2} ry={3}
                  fill={p.color} opacity={0.25} />

                {/* Height line */}
                <line
                  x1={x + PERSON_W / 2} y1={MAX_H - displayH - 2}
                  x2={x + PERSON_W / 2} y2={MAX_H}
                  stroke={p.color} strokeWidth={0.5} strokeDasharray="2 2" opacity={0.4}
                />

                {/* Name label */}
                <text x={x + PERSON_W / 2} y={MAX_H + 18} textAnchor="middle"
                  fontSize={10} fill={p.color} fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif">
                  {p.nombre.length > 12 ? p.nombre.slice(0, 11) + '…' : p.nombre}
                </text>
                <text x={x + PERSON_W / 2} y={MAX_H + 32} textAnchor="middle"
                  fontSize={9} fill="#64748b" fontFamily="Inter, system-ui, sans-serif">
                  {p.estaturaCm}cm · {cmToFtIn(p.estaturaCm)}
                </text>

                {/* Diff badge between persons */}
                {diff !== null && diffY !== null && (
                  <g>
                    <line
                      x1={x + PERSON_W + 2} y1={diffY + 8}
                      x2={x + PERSON_W + GAP - 2} y2={diffY + 8}
                      stroke={diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#94a3b8'}
                      strokeWidth={1.5} markerEnd="url(#arrow)"
                    />
                    <rect x={x + PERSON_W + GAP / 2 - 18} y={diffY - 1} width={36} height={14}
                      rx={4} fill="#1e293b" />
                    <text
                      x={x + PERSON_W + GAP / 2} y={diffY + 9}
                      textAnchor="middle" fontSize={9} fontWeight="700"
                      fill={diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#94a3b8'}
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
      <div className="p-5 space-y-4 border-t" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>

        {/* Person pills */}
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {personas.map(p => (
            <div key={p.key}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: `${p.color}18`,
                color: p.color,
                border: `1px solid ${p.color}40`,
                boxShadow: `0 0 0 0 ${p.color}`,
              }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
              {p.nombre}
              <span className="opacity-60 font-normal text-xs">{p.estaturaCm}cm</span>
              <button onClick={() => removePerson(p.key)}
                className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity text-base leading-none"
                aria-label={`Eliminar ${p.nombre}`}>×</button>
            </div>
          ))}
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
                className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-stone-200 placeholder-slate-600 focus:outline-none transition-colors"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.12)' }}
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1.5 w-full rounded-xl shadow-2xl overflow-hidden"
                  style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)' }}>
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
                className="flex-1 px-3 py-2.5 rounded-xl text-sm text-stone-200 placeholder-slate-600 focus:outline-none transition-colors"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.12)' }}
              />
              <input type="number" placeholder="cm" value={customCm}
                onChange={e => setCustomCm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
                min={50} max={300}
                className="w-20 px-2 py-2.5 rounded-xl text-sm text-stone-200 placeholder-slate-600 focus:outline-none text-center transition-colors"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.12)' }}
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
            style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }}>
            {shareStatus === 'done' ? '✅ Descargado' : shareStatus === 'loading' ? '⏳ Generando…' : '📸 Descargar imagen'}
          </button>
          <button onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }}>
            {copied ? '✅ Copiado' : '🔗 Copiar enlace'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Comparador;
