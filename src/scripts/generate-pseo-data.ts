#!/usr/bin/env npx tsx
/**
 * pSEO 2.0 Data Generator
 * Reads famosos.json → generates categorias.json, paises.json, rangos.json, rankings-auto.json
 * All computed — NO AI needed for these.
 *
 * Usage: npx tsx src/scripts/generate-pseo-data.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Famoso, CategoriaPage, PaisPage, RangoEstatura, RankingAuto } from '../types/pseo.js';

const ROOT = resolve(import.meta.dirname, '../../');
const DATA = resolve(ROOT, 'src/data');

const famosos: Famoso[] = JSON.parse(readFileSync(resolve(DATA, 'famosos.json'), 'utf-8'));

// ── Helpers ─────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function avg(nums: number[]): number {
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function maxBy(arr: Famoso[]): { id: string; nombre: string; estaturaCm: number } {
  const f = arr.reduce((a, b) => (b.estaturaCm > a.estaturaCm ? b : a));
  return { id: f.id, nombre: f.nombre, estaturaCm: f.estaturaCm };
}

function minBy(arr: Famoso[]): { id: string; nombre: string; estaturaCm: number } {
  const f = arr.reduce((a, b) => (b.estaturaCm < a.estaturaCm ? b : a));
  return { id: f.id, nombre: f.nombre, estaturaCm: f.estaturaCm };
}

// ── 1. Categorias ───────────────────────────────────────────────────

const CATEGORIA_META: Record<string, { nombre: string; emoji: string }> = {
  'futbol':      { nombre: 'Futbolistas', emoji: '⚽' },
  'musica':      { nombre: 'Músicos y Cantantes', emoji: '🎵' },
  'cine-tv':     { nombre: 'Actores y Actrices', emoji: '🎬' },
  'deportes':    { nombre: 'Deportistas', emoji: '🏆' },
  'influencers': { nombre: 'Influencers y Streamers', emoji: '📱' },
  'streamers':   { nombre: 'Streamers', emoji: '🎮' },
  'la-velada':   { nombre: 'La Velada', emoji: '🥊' },
  'politica':    { nombre: 'Políticos', emoji: '🏛️' },
  'otros':       { nombre: 'Otros Famosos', emoji: '⭐' },
};

const catGroups = new Map<string, Famoso[]>();
for (const f of famosos) {
  const list = catGroups.get(f.categoria) ?? [];
  list.push(f);
  catGroups.set(f.categoria, list);
}

const categorias: CategoriaPage[] = [...catGroups.entries()]
  .filter(([, members]) => members.length >= 2)
  .map(([cat, members]) => {
    const meta = CATEGORIA_META[cat] ?? { nombre: cat, emoji: '⭐' };
    const sorted = [...members].sort((a, b) => b.estaturaCm - a.estaturaCm);
    return {
      slug: cat,
      nombre: meta.nombre,
      emoji: meta.emoji,
      seo: {
        title: `Estatura de ${meta.nombre} famosos | estaturas.com`,
        description: `¿Cuánto miden los ${meta.nombre.toLowerCase()}? Ranking de estaturas de ${members.length} ${meta.nombre.toLowerCase()} famosos. El más alto: ${maxBy(members).nombre} (${maxBy(members).estaturaCm}cm).`,
        keywords: [`estatura ${meta.nombre.toLowerCase()}`, `cuanto miden ${meta.nombre.toLowerCase()}`, `${meta.nombre.toLowerCase()} mas altos`],
      },
      content: {
        intro: `Descubre las estaturas de ${members.length} ${meta.nombre.toLowerCase()} famosos. Desde ${maxBy(members).nombre} con ${maxBy(members).estaturaCm}cm hasta ${minBy(members).nombre} con ${minBy(members).estaturaCm}cm.`,
        fun_facts: [
          `La estatura promedio de los ${meta.nombre.toLowerCase()} en nuestra base es de ${avg(members.map(f => f.estaturaCm))}cm.`,
          `El más alto es ${maxBy(members).nombre} con ${maxBy(members).estaturaCm}cm.`,
          `El más bajo es ${minBy(members).nombre} con ${minBy(members).estaturaCm}cm.`,
        ],
        subcategorias: [...new Set(members.flatMap(f => f.tags))].slice(0, 8),
        related_rankings: [`${cat}-mas-altos`, `${cat}-mas-bajos`].filter(Boolean),
      },
      stats: {
        total: members.length,
        promedio: avg(members.map(f => f.estaturaCm)),
        max: maxBy(members),
        min: minBy(members),
      },
      top10: sorted.slice(0, 10).map(f => f.id),
    };
  })
  .sort((a, b) => (b.stats?.total ?? 0) - (a.stats?.total ?? 0));

// ── 2. Paises ───────────────────────────────────────────────────────

// Normalize country: "Cuba / España" → ["Cuba", "España"]
function expandCountries(pais: string): string[] {
  return pais.split('/').map(s => s.trim());
}

const paisGroups = new Map<string, Famoso[]>();
for (const f of famosos) {
  for (const p of expandCountries(f.pais)) {
    const list = paisGroups.get(p) ?? [];
    list.push(f);
    paisGroups.set(p, list);
  }
}

// Get flag from first famoso of that country
function flagFor(country: string): string {
  for (const f of famosos) {
    if (expandCountries(f.pais).includes(country)) return f.bandera;
  }
  return '🌍';
}

const paises: PaisPage[] = [...paisGroups.entries()]
  .filter(([, members]) => members.length >= 2)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20)
  .map(([pais, members]) => {
    const slug = slugify(pais);
    return {
      slug,
      nombre: pais,
      bandera: flagFor(pais),
      seo: {
        title: `Estatura de famosos de ${pais} | estaturas.com`,
        description: `¿Cuánto miden los famosos de ${pais}? ${members.length} celebridades. Promedio: ${avg(members.map(f => f.estaturaCm))}cm. El más alto: ${maxBy(members).nombre}.`,
        keywords: [`famosos ${pais.toLowerCase()}`, `estatura famosos ${pais.toLowerCase()}`, `cuanto miden famosos ${pais.toLowerCase()}`],
      },
      content: {
        intro: `Tenemos ${members.length} famosos de ${pais} en nuestra base de datos. Su estatura promedio es de ${avg(members.map(f => f.estaturaCm))}cm.`,
        fun_facts: [
          `El famoso más alto de ${pais} es ${maxBy(members).nombre} con ${maxBy(members).estaturaCm}cm.`,
          `El más bajo es ${minBy(members).nombre} con ${minBy(members).estaturaCm}cm.`,
          `La diferencia entre el más alto y el más bajo es de ${maxBy(members).estaturaCm - minBy(members).estaturaCm}cm.`,
        ],
        paises_similares: [],
      },
      stats: {
        total: members.length,
        promedio: avg(members.map(f => f.estaturaCm)),
        max: maxBy(members),
        min: minBy(members),
      },
    };
  });

// Fill paises_similares: countries with similar average height
for (const p of paises) {
  p.content.paises_similares = paises
    .filter(other => other.slug !== p.slug)
    .sort((a, b) => Math.abs((a.stats?.promedio ?? 0) - (p.stats?.promedio ?? 0)) - Math.abs((b.stats?.promedio ?? 0) - (p.stats?.promedio ?? 0)))
    .slice(0, 3)
    .map(other => other.slug);
}

// ── 3. Rangos de estatura ───────────────────────────────────────────

const RANGOS_CONFIG: { slug: string; tipo: 'rango' | 'especial'; min: number; max: number; label: string }[] = [
  { slug: '150-160', tipo: 'rango', min: 150, max: 160, label: '150-160cm' },
  { slug: '160-170', tipo: 'rango', min: 160, max: 170, label: '160-170cm' },
  { slug: '170-180', tipo: 'rango', min: 170, max: 180, label: '170-180cm' },
  { slug: '180-190', tipo: 'rango', min: 180, max: 190, label: '180-190cm' },
  { slug: '190-200', tipo: 'rango', min: 190, max: 200, label: '190-200cm' },
  { slug: '200-210', tipo: 'rango', min: 200, max: 210, label: '200-210cm' },
  { slug: '210-220', tipo: 'rango', min: 210, max: 220, label: '210-220cm' },
  { slug: 'famosos-bajos', tipo: 'especial', min: 0, max: 165, label: 'menos de 165cm' },
  { slug: 'famosos-altos', tipo: 'especial', min: 190, max: 999, label: 'más de 190cm' },
];

const rangos: RangoEstatura[] = RANGOS_CONFIG
  .map(r => {
    const members = famosos.filter(f => f.estaturaCm >= r.min && f.estaturaCm < r.max);
    if (members.length === 0) return null;
    return {
      slug: r.slug,
      tipo: r.tipo,
      min_cm: r.min,
      max_cm: r.max,
      seo: {
        title: r.tipo === 'especial'
          ? `Famosos ${r.slug.replace('-', ' ')} (${r.label}) | estaturas.com`
          : `Famosos que miden entre ${r.label} | estaturas.com`,
        description: `${members.length} famosos que miden ${r.tipo === 'especial' ? r.label : `entre ${r.label}`}. De ${minBy(members).nombre} a ${maxBy(members).nombre}.`,
        keywords: [
          r.tipo === 'especial' ? `famosos ${r.slug.replace('-', ' ')}` : `famosos ${r.label}`,
          `estatura ${r.label}`,
          `cuanto miden ${r.label}`,
        ],
      },
      content: {
        intro: `${members.length} famosos miden ${r.tipo === 'especial' ? r.label : `entre ${r.label}`}. El promedio de este grupo es ${avg(members.map(f => f.estaturaCm))}cm.`,
        dato_curioso: r.tipo === 'especial'
          ? `El rango incluye desde ${minBy(members).nombre} (${minBy(members).estaturaCm}cm) hasta ${maxBy(members).nombre} (${maxBy(members).estaturaCm}cm).`
          : `La mayoría de la población mundial se encuentra en el rango de 160-180cm.`,
      },
      famosos_count: members.length,
    } satisfies RangoEstatura;
  })
  .filter((r): r is RangoEstatura => r !== null);

// ── 4. Rankings automáticos ─────────────────────────────────────────

const rankingsAuto: RankingAuto[] = [];

// Per-category rankings
for (const [cat, members] of catGroups.entries()) {
  if (members.length < 3) continue;
  const meta = CATEGORIA_META[cat] ?? { nombre: cat, emoji: '⭐' };
  const sortedDesc = [...members].sort((a, b) => b.estaturaCm - a.estaturaCm);
  const sortedAsc = [...members].sort((a, b) => a.estaturaCm - b.estaturaCm);

  rankingsAuto.push({
    slug: `${cat}-mas-altos`,
    tipo: 'mas-altos',
    filtro: { categoria: cat },
    seo: {
      title: `${meta.nombre} más altos | estaturas.com`,
      description: `Ranking de los ${meta.nombre.toLowerCase()} más altos. ${sortedDesc[0].nombre} lidera con ${sortedDesc[0].estaturaCm}cm.`,
      keywords: [`${meta.nombre.toLowerCase()} mas altos`, `${meta.nombre.toLowerCase()} estatura`, `ranking ${meta.nombre.toLowerCase()}`],
    },
    content: {
      intro: `¿Quién es el más alto entre los ${meta.nombre.toLowerCase()}? Aquí tienes el ranking completo ordenado de mayor a menor estatura.`,
      datos_extra: Object.fromEntries(sortedDesc.slice(0, 3).map(f => [f.id, f.funFact ?? `Mide ${f.estaturaCm}cm`])),
      conclusion: `El promedio de estatura entre los ${meta.nombre.toLowerCase()} es de ${avg(members.map(f => f.estaturaCm))}cm.`,
      related_rankings: [`${cat}-mas-bajos`, 'los-mas-altos'],
    },
  });

  rankingsAuto.push({
    slug: `${cat}-mas-bajos`,
    tipo: 'mas-bajos',
    filtro: { categoria: cat },
    seo: {
      title: `${meta.nombre} más bajos | estaturas.com`,
      description: `Ranking de los ${meta.nombre.toLowerCase()} con menor estatura. ${sortedAsc[0].nombre} con ${sortedAsc[0].estaturaCm}cm.`,
      keywords: [`${meta.nombre.toLowerCase()} mas bajos`, `${meta.nombre.toLowerCase()} bajitos`, `ranking estatura ${meta.nombre.toLowerCase()}`],
    },
    content: {
      intro: `Los ${meta.nombre.toLowerCase()} más bajos del momento. Pequeños en estatura, enormes en talento.`,
      datos_extra: Object.fromEntries(sortedAsc.slice(0, 3).map(f => [f.id, f.funFact ?? `Mide ${f.estaturaCm}cm`])),
      conclusion: `Demuestran que la estatura no define el éxito en su campo.`,
      related_rankings: [`${cat}-mas-altos`, 'los-mas-bajos'],
    },
  });
}

// Global rankings
const allSortedDesc = [...famosos].sort((a, b) => b.estaturaCm - a.estaturaCm);
const allSortedAsc = [...famosos].sort((a, b) => a.estaturaCm - b.estaturaCm);

rankingsAuto.push({
  slug: 'los-mas-altos-global',
  tipo: 'mas-altos',
  filtro: {},
  seo: {
    title: 'Los famosos más altos del mundo | estaturas.com',
    description: `Ranking general de los famosos más altos. ${allSortedDesc[0].nombre} lidera con ${allSortedDesc[0].estaturaCm}cm.`,
    keywords: ['famosos mas altos', 'celebridades altas', 'ranking estatura famosos'],
  },
  content: {
    intro: 'El ranking definitivo de los famosos más altos del mundo, sin importar su profesión.',
    datos_extra: Object.fromEntries(allSortedDesc.slice(0, 3).map(f => [f.id, f.funFact ?? `Mide ${f.estaturaCm}cm`])),
    conclusion: `El promedio general de nuestros ${famosos.length} famosos es de ${avg(famosos.map(f => f.estaturaCm))}cm.`,
    related_rankings: ['los-mas-bajos-global'],
  },
});

rankingsAuto.push({
  slug: 'los-mas-bajos-global',
  tipo: 'mas-bajos',
  filtro: {},
  seo: {
    title: 'Los famosos más bajos del mundo | estaturas.com',
    description: `Los famosos con menor estatura. ${allSortedAsc[0].nombre} con solo ${allSortedAsc[0].estaturaCm}cm.`,
    keywords: ['famosos mas bajos', 'celebridades bajitas', 'famosos bajitos'],
  },
  content: {
    intro: 'Pequeños en estatura, gigantes en fama. Los famosos más bajitos del momento.',
    datos_extra: Object.fromEntries(allSortedAsc.slice(0, 3).map(f => [f.id, f.funFact ?? `Mide ${f.estaturaCm}cm`])),
    conclusion: 'La estatura no es obstáculo para llegar a la cima del éxito.',
    related_rankings: ['los-mas-altos-global'],
  },
});

// ── Write output ────────────────────────────────────────────────────

function writeJson(name: string, data: unknown) {
  const path = resolve(DATA, name);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  const count = Array.isArray(data) ? data.length : Object.keys(data as object).length;
  console.log(`✅ ${name}: ${count} entries`);
}

writeJson('categorias.json', categorias);
writeJson('paises.json', paises);
writeJson('rangos.json', rangos);
writeJson('rankings-auto.json', rankingsAuto);

console.log('\n🎯 pSEO data generation complete!');
console.log(`   Categorias: ${categorias.map(c => c.slug).join(', ')}`);
console.log(`   Paises: ${paises.map(p => p.slug).join(', ')}`);
console.log(`   Rangos: ${rangos.map(r => r.slug).join(', ')}`);
console.log(`   Rankings: ${rankingsAuto.length} auto-generated`);
