/**
 * pSEO 2.0 TypeScript Schemas
 * AI generates strict JSON → Astro components render. Never mix layers.
 */

// ── Famoso (source of truth: famosos.json) ──────────────────────────

export interface Famoso {
  id: string;
  nombre: string;
  apodo: string | null;
  fullName: string;
  estaturaCm: number;
  estaturaFt: string;
  peso: number | string | null;
  edad: number;
  pais: string;
  bandera: string;
  profesion: string;
  categoria: Categoria;
  genero: string;
  tags: string[];
  foto: string | null;
  color: string;
  funFact: string | null;
}

export type Categoria = 'futbol' | 'musica' | 'streamers' | 'cine-tv' | 'deportes' | 'influencers' | 'la-velada' | 'politica' | 'otros';

// ── SEO block (shared) ──────────────────────────────────────────────

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
}

// ── CategoriaPage ───────────────────────────────────────────────────

export interface CategoriaPage {
  slug: string;
  nombre: string;
  emoji: string;
  seo: SeoMeta;
  content: {
    intro: string;
    fun_facts: string[];
    subcategorias: string[];
    related_rankings: string[];
  };
  // Computed at build time from famosos.json:
  stats?: {
    total: number;
    promedio: number;
    max: { id: string; nombre: string; estaturaCm: number };
    min: { id: string; nombre: string; estaturaCm: number };
  };
  top10?: string[];
}

// ── PaisPage ────────────────────────────────────────────────────────

export interface PaisPage {
  slug: string;
  nombre: string;
  bandera: string;
  seo: SeoMeta;
  content: {
    intro: string;
    fun_facts: string[];
    paises_similares: string[];
  };
  // Computed at build time:
  stats?: {
    total: number;
    promedio: number;
    max: { id: string; nombre: string; estaturaCm: number };
    min: { id: string; nombre: string; estaturaCm: number };
  };
}

// ── RangoEstatura ───────────────────────────────────────────────────

export interface RangoEstatura {
  slug: string;
  tipo: 'rango' | 'especial';
  min_cm: number;
  max_cm: number;
  seo: SeoMeta;
  content: {
    intro: string;
    dato_curioso: string;
  };
  // Computed at build time:
  famosos_count?: number;
}

// ── RankingAuto ─────────────────────────────────────────────────────

export interface RankingAuto {
  slug: string;
  tipo: 'mas-altos' | 'mas-bajos' | 'promedio';
  filtro: {
    categoria?: string;
    pais?: string;
    genero?: string;
    min_cm?: number;
    max_cm?: number;
  };
  seo: SeoMeta;
  content: {
    intro: string;
    datos_extra: Record<string, string>;
    conclusion: string;
    related_rankings: string[];
  };
}

// ── Comparacion ─────────────────────────────────────────────────────

export interface Comparacion {
  slug: string;
  famoso_a: string;
  famoso_b: string;
  search_volume: 'high' | 'medium' | 'low';
  seo: SeoMeta;
  content: {
    intro: string;
    fun_fact: string;
    shared_traits: string[];
    key_differences: string[];
    related: string[];
    verdict: string;
  };
}

// ── EventoPage ──────────────────────────────────────────────────────

export interface EventoPage {
  slug: string;
  nombre: string;
  fecha: string;
  lugar: string;
  seo: SeoMeta;
  content: {
    intro: string;
    participantes: string[];
    enfrentamientos: {
      famoso_a: string;
      famoso_b: string;
      prediccion: string;
    }[];
    datos_evento: string[];
    countdown_date: string;
  };
}

// ── BlogPost ────────────────────────────────────────────────────────

export interface BlogPost {
  slug: string;
  tipo: 'editorial' | 'lista' | 'comparativa' | 'evento';
  fecha: string;
  seo: SeoMeta;
  content: {
    titulo: string;
    intro: string;
    secciones: {
      heading: string;
      body: string;
      famosos_mencionados: string[];
    }[];
    conclusion: string;
    cta: string;
    related_posts: string[];
  };
}
