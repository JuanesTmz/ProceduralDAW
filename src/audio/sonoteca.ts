// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La Sonoteca: los sonidos que trae la app, en public/sonoteca/.
 *
 * Se generan por síntesis con scripts/generar-sonoteca.mjs —sin grabaciones
 * de terceros—. Los melódicos dicen en qué nota están afinados, para que
 * la matriz los transporte a cualquier casilla sin desafinar.
 *
 * Cuando el equipo grabe los sonidos reales de Medellín, se suman aquí.
 */
export type GrupoSonoteca = 'biblioteca' | 'melodico' | 'percusion' | 'ciudad';

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

/**
 * La biblioteca de SONORA: sonidos grabados por el equipo (objetos, la
 * calle, el colegio), en public/sonoteca/biblioteca/. Van tal cual se grabaron.
 */
const b = (id: string, nombre: string, archivo: string): SonidoSonoteca => ({
  id,
  nombre,
  grupo: 'biblioteca',
  url: `${base}biblioteca/${archivo}`,
});

const BIBLIOTECA: SonidoSonoteca[] = [
  b('bib-bombo', 'Bombo', 'bombo.mp3'),
  b('bib-boca', 'Boca', 'boca.mp3'),
  b('bib-burbujas', 'Burbujas', 'burbujas.mp3'),
  b('bib-bus', 'Bus', 'bus.mp3'),
  b('bib-campana', 'Campana del colegio', 'campana-colegio.mp3'),
  b('bib-carro', 'Carro de basura y botella', 'carro-basura.mp3'),
  b('bib-metal1', 'Golpe de metal 1', 'golpe-metal-1.mp3'),
  b('bib-metal2', 'Golpe de metal 2', 'golpe-metal-2.mp3'),
  b('bib-zona', 'La zona', 'la-zona.m4a'),
  b('bib-lapiz', 'Lápiz contra rejilla', 'lapiz-rejilla.mp3'),
  b('bib-arte', 'Materiales de arte', 'materiales-arte.mp3'),
  b('bib-mesa1', 'Mesa 1', 'mesa-1.mp3'),
  b('bib-mesa2', 'Mesa 2', 'mesa-2.mp3'),
  b('bib-moneda', 'Moneda', 'moneda.mp3'),
  b('bib-portalapices', 'Portalápices', 'portalapices.mp3'),
  b('bib-sextillizos', 'Sextillizos', 'sextillizos.m4a'),
  b('bib-taza1', 'Taza 1', 'taza-1.mp3'),
  b('bib-taza2', 'Taza 2', 'taza-2.mp3'),
  b('bib-uuuu', 'Uuuu', 'uuuu.mp3'),
];

export const SONOTECA: SonidoSonoteca[] = [
  ...BIBLIOTECA,
  s('marimba', 'Marimba', 'melodico', 'C4'),
  s('piano', 'Piano eléctrico', 'melodico', 'C4'),
  s('pluck', 'Cuerda pulsada', 'melodico', 'C4'),
  s('kalimba', 'Kalimba', 'melodico', 'C5'),
  s('campana', 'Campana', 'melodico', 'C5'),
  s('silbido', 'Silbido', 'melodico', 'C5'),
  s('vozah', 'Voz «ah»', 'melodico', 'C3'),
  s('pad', 'Colchón', 'melodico', 'C3'),
  s('bajo808', 'Bajo 808', 'melodico', 'C2'),
  s('pianoac', 'Piano', 'melodico', 'C4'),
  s('bajo', 'Bajo', 'melodico', 'C2'),
  s('acordeon', 'Acordeón', 'melodico', 'C4'),
  s('requinto', 'Guitarra', 'melodico', 'C4'),
  s('shaker', 'Shaker', 'percusion'),
  s('conga', 'Conga', 'percusion'),
  s('cencerro', 'Cencerro', 'percusion'),
  s('clave', 'Clave', 'percusion'),
  s('guiro', 'Güiro', 'percusion'),
  s('chasquido', 'Chasquido', 'percusion'),
  s('guira', 'Güira', 'percusion'),
  s('bongo', 'Bongó', 'percusion'),
  s('bongograve', 'Bongó grave', 'percusion'),
  s('tumbadora', 'Tumbadora', 'percusion'),
  s('caja', 'Caja', 'percusion'),
  s('hatcerrado', 'Hi-hat cerrado', 'percusion'),
  s('hatabierto', 'Hi-hat abierto', 'percusion'),
  s('palmas', 'Palmas', 'percusion'),
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
  biblioteca: 'Biblioteca de SONORA',
  melodico: 'Para melodías',
  percusion: 'Percusión',
  ciudad: 'Sonidos de ciudad',
};

export function deSonoteca(url: string | undefined): SonidoSonoteca | undefined {
  return url ? SONOTECA.find((x) => x.url === url) : undefined;
}
