/**
 * Los datos del lab de IA: de dónde sale cada número que mueve la obra.
 *
 * Una «fuente» es cualquier cosa que cambia y se puede leer de 0 a 1: la
 * emoción de la escena, el volumen, el golpe del redoblante, la luz de una
 * foto. Una conexión dice «este parámetro se mueve según esta fuente». Aquí
 * está el catálogo de fuentes y la función que las lee, la misma para la
 * música y para la imagen: así un dato vale igual se mire por donde se mire.
 *
 * Seis familias:
 *  - El relato: emoción, fuerza, avance, cada palabra que se dice.
 *  - El sonido: voz, bombo, pulso, compás y, solo para la imagen, el volumen
 *    y los graves, medios y agudos de lo que suena.
 *  - Los instrumentos: el golpe de cada capa, cada nota de la melodía, qué
 *    tan aguda es, cuántos instrumentos suenan.
 *  - La foto de la escena y las fotos que se suben: se descomponen en luz,
 *    color, detalle y bits.
 *  - Los sonidos que se suben: su ritmo.
 */
import { campoDe, LADO_BITS, type CanalFoto, type CanalesFoto } from '../visual/imagenDatos';
import { palabrasDe } from './proyecto';
import type { Emocion, Escena, Proyecto } from './tipos';

export type GrupoFuente = 'relato' | 'sonido' | 'instrumento' | 'foto' | 'archivo';

export interface Fuente {
  clave: string;
  etiqueta: string;
  grupo: GrupoFuente;
  /** El título de la lista donde aparece (agrupa las fuentes en el desplegable). */
  seccion: string;
  /** Cómo se lee la conexión: «Con cada golpe del redoblante». Si falta, «Cuanto más sube …». */
  frase?: string;
  /** Una línea que explica qué es, para quien no lo sepa. */
  ayuda?: string;
}

export const COLOR_GRUPO: Record<GrupoFuente, string> = {
  relato: '#ffb020',
  sonido: '#5ee0ff',
  instrumento: '#ff7ab8',
  foto: '#8fe35a',
  archivo: '#2ee6a8',
};

/** Qué tan «arriba» está cada emoción, para usarla como dato de 0 a 1. */
export const VALOR_EMOCION: Record<Emocion, number> = {
  calma: 0.15,
  nostalgia: 0.3,
  misterio: 0.42,
  alegria: 0.68,
  tension: 0.82,
  euforia: 1,
};

// ------------------------------------------------------------ Catálogo

export const CANALES_FOTO: { canal: CanalFoto; etiqueta: string; ayuda: string }[] = [
  { canal: 'luz', etiqueta: 'luz', ayuda: 'Qué tan clara u oscura es cada parte.' },
  { canal: 'rojo', etiqueta: 'rojo', ayuda: 'Cuánto rojo hay.' },
  { canal: 'verde', etiqueta: 'verde', ayuda: 'Cuánto verde hay.' },
  { canal: 'azul', etiqueta: 'azul', ayuda: 'Cuánto azul hay.' },
  { canal: 'tono', etiqueta: 'color (tono)', ayuda: 'En qué parte del arcoíris está el color.' },
  { canal: 'saturacion', etiqueta: 'intensidad', ayuda: 'Qué tan vivo o apagado es el color.' },
  { canal: 'detalle', etiqueta: 'detalle', ayuda: 'Cuántos bordes y texturas hay.' },
  { canal: 'bits', etiqueta: 'bits', ayuda: 'La foto en 16 × 16 casillas encendidas o apagadas: en cada paso se lee una.' },
];

const SONIDO_DE_SALIDA: Fuente[] = [
  { clave: 'volumen', etiqueta: 'El volumen', grupo: 'sonido', seccion: 'El sonido', ayuda: 'Qué tan fuerte suena todo junto.' },
  { clave: 'graves', etiqueta: 'Los graves', grupo: 'sonido', seccion: 'El sonido', ayuda: 'La parte más profunda: bombo y bajos.' },
  { clave: 'medios', etiqueta: 'Los medios', grupo: 'sonido', seccion: 'El sonido', ayuda: 'El cuerpo de la mezcla: redoblante y voz.' },
  { clave: 'agudos', etiqueta: 'Los agudos', grupo: 'sonido', seccion: 'El sonido', ayuda: 'Lo brillante: platillos y aire.' },
];

/**
 * Las fuentes que se pueden elegir. La música no puede escucharse a sí
 * misma por el volumen o las bandas (se enredaría), así que esas son solo
 * de la imagen.
 */
export function fuentesDe(p: Proyecto, para: 'musica' | 'imagen' = 'musica'): Fuente[] {
  const lista: Fuente[] = [
    { clave: 'emocion', etiqueta: 'La emoción', grupo: 'relato', seccion: 'El relato' },
    { clave: 'fuerza', etiqueta: 'La fuerza de la escena', grupo: 'relato', seccion: 'El relato' },
    { clave: 'avance', etiqueta: 'El avance de la historia', grupo: 'relato', seccion: 'El relato' },
    { clave: 'escena', etiqueta: 'El avance de la escena', grupo: 'relato', seccion: 'El relato', ayuda: 'Sube de 0 a 1 mientras dura la escena.' },
    {
      clave: 'palabra',
      etiqueta: 'Cada palabra que se dice',
      grupo: 'relato',
      seccion: 'El relato',
      frase: 'Con cada palabra que se dice',
      ayuda: 'Un latido por cada palabra del texto.',
    },
    { clave: 'texto', etiqueta: 'Lo larga que es la escena', grupo: 'relato', seccion: 'El relato', ayuda: 'Más palabras, más alto.' },
    { clave: 'voz', etiqueta: 'La voz', grupo: 'sonido', seccion: 'El sonido' },
    { clave: 'bombo', etiqueta: 'El bombo', grupo: 'sonido', seccion: 'El sonido' },
    { clave: 'pulso', etiqueta: 'El pulso', grupo: 'sonido', seccion: 'El sonido', frase: 'Con cada tiempo del ritmo', ayuda: 'Un latido en cada tiempo.' },
    { clave: 'compas', etiqueta: 'El compás', grupo: 'sonido', seccion: 'El sonido', ayuda: 'Sube de 0 a 1 y vuelve a empezar en cada compás.' },
  ];
  if (para === 'imagen') lista.push(...SONIDO_DE_SALIDA);

  lista.push(
    ...p.patron.filas.map((f) => ({
      clave: `golpe:${f.id}`,
      etiqueta: `${f.nombre} · cada golpe`,
      grupo: 'instrumento' as const,
      seccion: 'Los instrumentos',
      frase: `Con cada golpe del ${f.nombre.toLowerCase()}`,
    })),
    {
      clave: 'golpe:melodia',
      etiqueta: 'La melodía · cada nota',
      grupo: 'instrumento',
      seccion: 'Los instrumentos',
      frase: 'Con cada nota de la melodía',
    },
    {
      clave: 'nota',
      etiqueta: 'La altura de la melodía',
      grupo: 'instrumento',
      seccion: 'Los instrumentos',
      ayuda: 'Sube con las notas agudas y baja con las graves.',
    },
    {
      clave: 'golpe:todos',
      etiqueta: 'Todos los golpes juntos',
      grupo: 'instrumento',
      seccion: 'Los instrumentos',
      frase: 'Con cada golpe de cualquier instrumento',
    },
    {
      clave: 'capas',
      etiqueta: 'Cuántos instrumentos suenan',
      grupo: 'instrumento',
      seccion: 'Los instrumentos',
      ayuda: 'Más instrumentos encendidos en la escena, más alto.',
    },
  );

  for (const c of CANALES_FOTO) {
    lista.push({
      clave: `foto:${c.canal}`,
      etiqueta: `Foto · ${c.etiqueta}`,
      grupo: 'foto',
      seccion: 'La foto de la escena',
      ayuda: c.ayuda,
      frase: c.canal === 'bits' ? 'En cada paso, según el bit de la foto' : undefined,
    });
  }
  for (const a of p.archivosDatos) {
    if (a.tipo === 'sonido') {
      lista.push({
        clave: `archivo:${a.id}`,
        etiqueta: `${a.nombre} · ritmo`,
        grupo: 'archivo',
        seccion: `Sonido «${a.nombre}»`,
        ayuda: 'Qué tan fuerte va el sonido en cada momento.',
      });
      continue;
    }
    for (const c of CANALES_FOTO) {
      lista.push({
        clave: `archivo:${a.id}:${c.canal}`,
        etiqueta: `${a.nombre} · ${c.etiqueta}`,
        grupo: 'foto',
        seccion: `Foto «${a.nombre}»`,
        ayuda: c.ayuda,
        frase: c.canal === 'bits' ? 'En cada paso, según el bit de la foto' : undefined,
      });
    }
  }
  return lista;
}

export function fuente(p: Proyecto, clave: string): Fuente | undefined {
  const todas = fuentesDe(p, 'imagen');
  // Las conexiones viejas de una foto usaban 'archivo:<id>' (su luz).
  return todas.find((f) => f.clave === clave) ?? todas.find((f) => f.clave === `${clave}:luz`);
}

// ------------------------------------------------------------ Lectura

/** Lo que el motor de audio mide mientras suena. */
export interface Vivo {
  voz: number;
  bombo: number;
  /** Se enciende en cada tiempo y se apaga solo. */
  pulso: number;
  /** De 0 a 1 en cada compás. */
  compas: number;
  /** El golpe de cada capa (por id) y de la melodía ('melodia'), que se apagan solos. */
  golpes: Record<string, number>;
  /** Qué tan aguda fue la última nota de la melodía. */
  nota: number;
  /** Qué fracción de los instrumentos está sonando en esta escena. */
  capas: number;
  /** Un latido por cada palabra que se dice. */
  palabra: number;
  /** En qué paso del compás va y cuántas vueltas lleva (para leer los bits). */
  paso: number;
  vuelta: number;
  /** Segundos desde que arrancó la pieza. */
  segundos: number;
  volumen: number;
  graves: number;
  medios: number;
  agudos: number;
}

export const VIVO_QUIETO: Vivo = {
  voz: 0, bombo: 0, pulso: 0, compas: 0, golpes: {}, nota: 0, capas: 0, palabra: 0,
  paso: 0, vuelta: 0, segundos: 0, volumen: 0, graves: 0, medios: 0, agudos: 0,
};

export interface ContextoDato {
  proyecto: Proyecto;
  escena?: Escena;
  /** Si la pieza está sonando: si no, los datos en vivo valen 0.5 (neutros). */
  sonando: boolean;
  /** Por dónde va la escena, de 0 a 1. */
  fraccion: number;
  /** Por dónde va la historia entera, de 0 a 1. */
  avance: number;
  vivo: Vivo;
}

const entre = (v: number) => Math.max(0, Math.min(1, v));

/** Una lista leída en el punto t (0..1), con el valor intermedio entre dos casillas. */
function leerLista(lista: number[], t: number): number {
  if (lista.length === 0) return 0.5;
  const x = entre(t) * (lista.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  return lista[i] + ((lista[Math.min(lista.length - 1, i + 1)] - lista[i]) * f);
}

function leerCanal(canales: CanalesFoto, canal: CanalFoto, c: ContextoDato): number {
  if (canal === 'bits') {
    if (!c.sonando) return 0.5;
    const fila = c.vivo.vuelta % LADO_BITS;
    const col = c.vivo.paso % LADO_BITS;
    return canales.bits[fila * LADO_BITS + col] ?? 0;
  }
  return leerLista(canales[canal], c.sonando ? c.fraccion : 0.5);
}

/** El valor de una fuente (0..1) en este instante. */
export function valorDato(clave: string, c: ContextoDato): number {
  const { vivo, escena } = c;
  const vivoO = (v: number) => (c.sonando ? v : 0.5);

  switch (clave) {
    case 'emocion':
      return escena ? VALOR_EMOCION[escena.emocion] : 0.5;
    case 'fuerza':
      return escena ? (escena.fuerza - 1) / 2 : 0.5;
    case 'avance':
      return vivoO(c.avance);
    case 'escena':
      return vivoO(c.fraccion);
    case 'palabra':
      return vivoO(vivo.palabra);
    case 'texto':
      return escena ? Math.min(1, palabrasDe(escena.texto).length / 40) : 0.5;
    case 'voz':
      return vivoO(vivo.voz);
    case 'bombo':
      return vivoO(vivo.bombo);
    case 'pulso':
      return vivoO(vivo.pulso);
    case 'compas':
      return vivoO(vivo.compas);
    case 'volumen':
      return vivoO(vivo.volumen);
    case 'graves':
      return vivoO(vivo.graves);
    case 'medios':
      return vivoO(vivo.medios);
    case 'agudos':
      return vivoO(vivo.agudos);
    case 'nota':
      return vivoO(vivo.nota);
    case 'capas':
      return vivoO(vivo.capas);
    case 'golpe:todos':
      return vivoO(Math.max(0, ...Object.values(vivo.golpes)));
  }
  if (clave.startsWith('golpe:')) return vivoO(vivo.golpes[clave.slice(6)] ?? 0);

  if (clave.startsWith('foto:')) {
    const url = escena?.imagenUrl ?? c.proyecto.visual.imagenUrl;
    const canales = campoDe(url)?.canales();
    return canales ? leerCanal(canales, clave.slice(5) as CanalFoto, c) : 0.5;
  }

  if (clave.startsWith('archivo:')) {
    const [, id, canal] = clave.split(':');
    const archivo = c.proyecto.archivosDatos.find((a) => a.id === id);
    if (!archivo || archivo.valores.length === 0) return 0.5;
    if (archivo.tipo === 'sonido') {
      if (!c.sonando) return 0.5;
      return archivo.valores[Math.floor(Math.max(0, vivo.segundos) * 20) % archivo.valores.length];
    }
    // Las fotos guardadas antes no traen canales: se les lee la luz y lo demás queda en el medio.
    const canales = archivo.canales;
    if (!canales) return !canal || canal === 'luz' ? leerLista(archivo.valores, c.sonando ? c.fraccion : 0.5) : 0.5;
    return leerCanal(canales, (canal || 'luz') as CanalFoto, c);
  }
  return 0.5;
}
