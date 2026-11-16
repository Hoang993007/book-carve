/**
 * A world's atlas, read from atlas.json beside the world's pages. Every entry names the chapters
 * it comes from (`src`), by the first 8 characters of their id; "astory" points to another work.
 */
export interface WorldAtlas {
  meta: { title: string; note: string };
  eras: Era[];
  places: Place[];
  beings: Being[];
  rules: Rule[];
  characters: Character[];
  /** [character id, character id, how they relate] */
  links: [string, string, string][];
  stories: Story[];
  conflicts: Conflict[];
  astory: { vita: string; astory: string }[];
  open: string[];
  /** How the places sit on the drawn map; without it the atlas shows lists only. */
  map?: AtlasMap;
}

export type LandKind = 'forest' | 'water' | 'realm' | 'dark' | 'dead' | 'sky';

/**
 * A relation diagram, not geography: one heart (`center` with `core` inside), an optional ring of
 * numbered zones around it, an optional band beyond the ring, and lands placed on a 1000×760 board.
 */
export interface AtlasMap {
  center: string;
  core: string;
  ring?: { place: string; count: number; zones: Record<string, string>; empty: string; label: string; sub: string };
  band?: { place: string; from: number; to: number; label: string; spot?: { place: string; label: string } };
  /** place id → [x, y, radius x, radius y, kind, shorter label for the map] */
  lands: Record<string, [number, number, number, number, LandKind, string?]>;
  /** [from place, to place, what travels there in the story] */
  routes: [string, string, string][];
  note: string;
}

export interface Era {
  id: string;
  name: string;
  time: string;
  summary: string;
  events: { text: string; src: string[] }[];
}

/** `zone` places it on the map: around the planet, the planet itself, the heart, next to it, or far away. */
export interface Place {
  id: string;
  name: string;
  aka?: string;
  parent?: string;
  zone: 'ngoai' | 'hanh-tinh' | 'trung-tam' | 'ke-ben' | 'xa';
  summary: string;
  src: string[];
}

export interface Being {
  id: string;
  name: string;
  aka?: string;
  kind: 'than' | 'loai';
  summary: string;
  src: string[];
}

export interface Rule {
  name: string;
  summary: string;
  src: string[];
}

export interface Character {
  id: string;
  name: string;
  aka?: string;
  group: 'vita' | 'ngoai' | 'doi-dau' | 'qua-khu' | 'than';
  summary: string;
  src: string[];
}

/** A chapter, or a planned one (`part: null`). "chinh" is the main line, "mau" a piece, "tu-lieu" research. */
export interface Story {
  part: string | null;
  group: 'chinh' | 'mau' | 'tu-lieu';
  order?: number;
  title: string;
  ver?: string;
  status: string;
  era?: string | null;
  place?: string | null;
  summary?: string;
}

export interface Conflict {
  topic: string;
  v1: string;
  v2: string;
  status: string;
}
