/**
 * La Sonoteca: los sonidos que trae la app, en public/sonoteca/.
 *
 * Se generan por síntesis con scripts/generar-sonoteca.mjs —sin grabaciones
 * de terceros—. Los melódicos dicen en qué nota están afinados, para que
 * la matriz los transporte a cualquier casilla sin desafinar.
 *
 * Cuando el equipo grabe los sonidos reales de Medellín, se suman aquí.
 */
export type GrupoSonoteca = 'melodico' | 'percusion' | 'ciudad';

export interface SonidoSonoteca {
  id: string;
  nombre: string;
  grupo: GrupoSonoteca;
  /** Solo los melódicos: la nota en que suena el archivo tal cual. */
  nota?: string;
  url: string;
}

const base = `${import.meta.env.BASE_URL}sonoteca/`;
const s = (id: string, nombre: string, grupo: GrupoSonoteca, nota?: string): SonidoSonoteca => ({
  id,
  nombre,
  grupo,
  nota,
  url: `${base}${id}.wav`,
});

export const SONOTECA: SonidoSonoteca[] = [
  s('marimba', 'Marimba', 'melodico', 'C4'),
  s('piano', 'Piano eléctrico', 'melodico', 'C4'),
  s('pluck', 'Cuerda pulsada', 'melodico', 'C4'),
  s('kalimba', 'Kalimba', 'melodico', 'C5'),
  s('campana', 'Campana', 'melodico', 'C5'),
  s('silbido', 'Silbido', 'melodico', 'C5'),
  s('vozah', 'Voz «ah»', 'melodico', 'C3'),
  s('pad', 'Colchón', 'melodico', 'C3'),
  s('bajo808', 'Bajo 808', 'melodico', 'C2'),
  s('shaker', 'Shaker', 'percusion'),
  s('conga', 'Conga', 'percusion'),
  s('cencerro', 'Cencerro', 'percusion'),
  s('clave', 'Clave', 'percusion'),
  s('guiro', 'Güiro', 'percusion'),
  s('chasquido', 'Chasquido', 'percusion'),
  s('lluvia', 'Lluvia', 'ciudad'),
  s('viento', 'Viento en la loma', 'ciudad'),
  s('trafico', 'Tráfico lejano', 'ciudad'),
  s('bocina', 'Bocina', 'ciudad'),
  s('metro', 'Metro en los rieles', 'ciudad'),
  s('campanario', 'Campanario', 'ciudad'),
  s('pajaros', 'Pájaros', 'ciudad'),
  s('murmullo', 'Murmullo de gente', 'ciudad'),
  s('moto', 'Moto que pasa', 'ciudad'),
];

export const NOMBRE_GRUPO: Record<GrupoSonoteca, string> = {
  melodico: 'Para melodías',
  percusion: 'Percusión',
  ciudad: 'Sonidos de ciudad',
};

export function deSonoteca(url: string | undefined): SonidoSonoteca | undefined {
  return url ? SONOTECA.find((x) => x.url === url) : undefined;
}
