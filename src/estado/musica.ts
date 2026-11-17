// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La música de las escenas: lo que se puede conectar, los puntos de
 * partida (presets) y cómo se sacan datos de un archivo.
 *
 * En el lab de IA la música se dirige con conexiones «este parámetro se
 * mueve según este dato». Aquí está el catálogo de las dos puntas: las
 * fuentes (de dónde sale el dato) y los destinos (qué se mueve).
 */
import { fuente } from './datos';
import { colorDeSonido, crearFila, NOMBRES_SONIDO, nuevoId } from './proyecto';
import { CampoImagen, type CanalesFoto } from '../visual/imagenDatos';
import { SONOTECA } from '../audio/sonoteca';
import { generarMelodia, generarPasos } from '../generativo/motorGenerativo';
import type { ArchivoDatos, Conexion, Proyecto, TipoSonido } from './tipos';
import type { NombreEscala } from '../generativo/escalas';

// Las fuentes (de dónde sale cada dato) viven en datos.ts.
export { COLOR_GRUPO, fuente, fuentesDe, VALOR_EMOCION } from './datos';
export type { Fuente, GrupoFuente } from './datos';

// ------------------------------------------------------------ Destinos

export interface Destino {
  clave: string;
  etiqueta: string;
  /** La frase que explica la conexión: «Cuanto más {dato}, {efecto}». */
  efecto: string;
}

export function destinosDe(p: Proyecto): Destino[] {
  return [
    ...p.patron.filas.map((f) => ({
      clave: `golpes:${f.id}`,
      etiqueta: `Golpes del ${f.nombre.toLowerCase()}`,
      efecto: `más golpes tiene el ${f.nombre.toLowerCase()}`,
    })),
    { clave: 'melodia', etiqueta: 'Notas de la melodía', efecto: 'más notas toca la melodía' },
    { clave: 'brillo', etiqueta: 'Brillo del sonido', efecto: 'más brillante suena' },
    { clave: 'eco', etiqueta: 'Eco', efecto: 'más eco tiene' },
    { clave: 'escala', etiqueta: 'Escala', efecto: 'más luminosa es la escala' },
    { clave: 'volumen', etiqueta: 'Volumen de la música', efecto: 'más fuerte suena la música' },
    { clave: 'apartar', etiqueta: 'Que la música se aparte', efecto: 'más baja la música' },
  ];
}

export function destino(p: Proyecto, clave: string): Destino | undefined {
  return destinosDe(p).find((d) => d.clave === clave);
}

export const NOMBRE_CANTIDAD: Record<Conexion['cantidad'], string> = { 1: 'Poco', 2: 'Algo', 3: 'Mucho' };

/** La frase que se lee debajo de una conexión. */
export function fraseConexion(p: Proyecto, c: Conexion): string {
  const f = fuente(p, c.fuente);
  const d = destino(p, c.destino);
  if (!f || !d) return '';
  const dato = f.etiqueta.charAt(0).toLowerCase() + f.etiqueta.slice(1);
  return f.frase ? `${f.frase}, ${d.efecto}.` : `Cuanto más sube ${dato}, ${d.efecto}.`;
}

export function nuevaConexion(fuenteClave: string, destinoClave: string): Conexion {
  return { id: nuevoId('conexion'), fuente: fuenteClave, destino: destinoClave, cantidad: 2 };
}

/** Las conexiones con las que arranca el lab de IA: un ejemplo que ya funciona. */
export function conexionesIniciales(p: Proyecto): Conexion[] {
  const bombo = p.patron.filas.find((f) => f.tipo === 'bombo');
  const lista = [
    nuevaConexion('emocion', 'brillo'),
    nuevaConexion('voz', 'apartar'),
  ];
  if (bombo) lista.unshift(nuevaConexion('fuerza', `golpes:${bombo.id}`));
  lista[0].cantidad = 3;
  return lista;
}

/** Escalas de la más oscura a la más luminosa, para el destino «Escala». */
export const ESCALAS_POR_LUZ: NombreEscala[] = ['frigia', 'menor', 'dorica', 'menorPentatonica', 'mayor'];

// ------------------------------------------------------------ Bases musicales

/**
 * Las bases: puntos de partida con la forma de ritmos conocidos, hechos con
 * la batería de la app y la Sonoteca. No copian ninguna canción: cada una es
 * el patrón típico del género en una vuelta de 16 pasos —la batería con sus
 * acentos, una línea de bajo con notas y los acordes o el riff que la
 * identifican—. Al elegir una se escriben las celdas de General, y desde ahí
 * se retocan.
 *
 * Todo está en grados de la escala (Do es la tónica): si una escena cambia
 * de emoción y de escala, el bajo y los acordes la siguen sin desafinar.
 *
 * Los patrones se escriben como texto, una letra por paso:
 *   «X» golpe fuerte · «x» golpe normal · «o» golpe suave · «.» silencio
 */
interface CapaBase {
  /** Un sonido de la batería ('bombo'…) o de la Sonoteca ('sonoteca:conga'). */
  sonido: string;
  patron: string;
  volumen: number;
  /** Solo las capas con notas (el bajo): el grado de cada golpe, en orden. */
  notas?: number[];
  /** La octava del grado 0 de esas notas. */
  octava?: number;
}

export interface Base {
  id: string;
  nombre: string;
  descripcion: string;
  /** Un ícono corto para la tarjeta. */
  icono: string;
  bpm: number;
  swing: number;
  escala: NombreEscala;
  capas: CapaBase[];
  /** Los acordes o el riff, en la matriz: con qué suena, dónde y cuánto dura cada nota. */
  melodia: {
    /** Un sonido melódico de la Sonoteca, o 'sintetizador'. */
    instrumento: string;
    octavaBase: number;
    volumen: number;
    eco: number;
    /** Pasos que dura cada nota. */
    largo: number;
    /** [paso, grados que suenan juntos]. */
    notas: [number, number[]][];
  };
}

// Acordes en grados, con la tónica en el grado 7 (la octava del medio).
// En escala menor: I = Do menor y VI = La bemol; en dórica, I7 = Do menor 7 e IV7 = Fa 7.
const I = [7, 9, 11];
const VI = [5, 7, 9];
const I7 = [7, 9, 11, 13];
const IV7 = [3, 5, 7, 9];

export const BASES: Base[] = [
  {
    id: 'reggaeton',
    nombre: 'Reggaetón',
    descripcion: 'Dembow: bombo parejo, caja que salta y bajo 808.',
    icono: '🔥',
    bpm: 94,
    swing: 0,
    escala: 'menor',
    capas: [
      { sonido: 'bombo', patron: 'X...X...X...X...', volumen: 0.9 },
      { sonido: 'sonoteca:caja', patron: '...X..x....X..x.', volumen: 0.95 },
      { sonido: 'sonoteca:hatcerrado', patron: 'o.x.o.x.o.x.o.x.', volumen: 0.5 },
      { sonido: 'sonoteca:bajo808', patron: 'X......xX.......', volumen: 0.6, notas: [0, 0, 5], octava: 2 },
    ],
    melodia: {
      instrumento: 'pianoac',
      octavaBase: 3,
      volumen: 0.5,
      eco: 0.1,
      largo: 2,
      notas: [[0, I], [3, I], [6, I], [8, VI], [11, VI], [14, VI]],
    },
  },
  {
    id: 'trap',
    nombre: 'Trap',
    descripcion: '808 que retumba, hi-hats rápidos y la palma lenta.',
    icono: '💎',
    bpm: 140,
    swing: 0,
    escala: 'menor',
    capas: [
      { sonido: 'bombo', patron: 'X......x..x.....', volumen: 0.9 },
      { sonido: 'sonoteca:palmas', patron: '........X.......', volumen: 0.9 },
      { sonido: 'sonoteca:hatcerrado', patron: 'XoxoXoxoXoxoXoxx', volumen: 0.5 },
      { sonido: 'sonoteca:hatabierto', patron: '..............x.', volumen: 0.4 },
      { sonido: 'sonoteca:bajo808', patron: 'X......x..x.....', volumen: 0.6, notas: [0, 0, 5], octava: 2 },
    ],
    melodia: {
      instrumento: 'campana',
      octavaBase: 3,
      volumen: 0.5,
      eco: 0.2,
      largo: 3,
      notas: [[0, [11]], [3, [9]], [6, [7]], [8, [12]], [11, [11]], [14, [9]]],
    },
  },
  {
    id: 'bachata',
    nombre: 'Bachata',
    descripcion: 'Güira «chi-ki-chi», bongó y la guitarra que puntea.',
    icono: '💃',
    bpm: 128,
    swing: 0,
    escala: 'menor',
    capas: [
      { sonido: 'sonoteca:guira', patron: 'X.xxX.xxX.xxX.xx', volumen: 0.75 },
      { sonido: 'sonoteca:bongo', patron: 'x.o.x.o.x.o.x...', volumen: 0.75 },
      { sonido: 'sonoteca:bongograve', patron: '............x.x.', volumen: 0.8 },
      { sonido: 'sonoteca:bajo', patron: 'X.....x.X.....x.', volumen: 0.55, notas: [0, 4, 3, 5], octava: 2 },
    ],
    melodia: {
      instrumento: 'requinto',
      octavaBase: 3,
      volumen: 0.8,
      eco: 0.12,
      largo: 2,
      notas: [
        [0, [7]], [2, [9]], [3, [11]], [4, [9]], [6, [11]],
        [8, [10]], [10, [12]], [11, [14]], [12, [12]], [14, [10]],
      ],
    },
  },
  {
    id: 'salsa',
    nombre: 'Salsa',
    descripcion: 'Clave 3-2, campana, tumbao y el montuno del piano.',
    icono: '🎺',
    bpm: 96,
    swing: 0,
    escala: 'mayor',
    capas: [
      { sonido: 'sonoteca:clave', patron: 'x..x..x...x.x...', volumen: 0.7 },
      { sonido: 'sonoteca:cencerro', patron: 'X.x.X.x.X.x.X.x.', volumen: 0.55 },
      { sonido: 'sonoteca:tumbadora', patron: '..o...XX..o...XX', volumen: 0.85 },
      { sonido: 'sonoteca:bajo', patron: '...X..x....X..x.', volumen: 0.6, notas: [4, 4, 1, 0], octava: 2 },
    ],
    melodia: {
      instrumento: 'pianoac',
      octavaBase: 3,
      volumen: 0.5,
      eco: 0.06,
      largo: 1,
      notas: [
        [0, [7, 9]], [2, [9, 11]], [3, [7, 11]], [5, [9, 11]], [7, [11, 14]],
        [8, [8, 11]], [10, [11, 13]], [11, [8, 13]], [13, [11, 13]], [15, [13, 15]],
      ],
    },
  },
  {
    id: 'cumbia',
    nombre: 'Cumbia',
    descripcion: 'La guacharaca que raspa, el llamador y el acordeón.',
    icono: '🪗',
    bpm: 92,
    swing: 0,
    escala: 'menor',
    capas: [
      { sonido: 'sonoteca:guiro', patron: 'X...X...X...X...', volumen: 0.6 },
      { sonido: 'sonoteca:guira', patron: '..xx..xx..xx..xx', volumen: 0.55 },
      { sonido: 'bombo', patron: 'X.......x.......', volumen: 0.85 },
      { sonido: 'sonoteca:bongograve', patron: '..x...x...x...x.', volumen: 0.7 },
      { sonido: 'sonoteca:bajo', patron: 'X.....x.X.......', volumen: 0.55, notas: [0, 0, 4], octava: 2 },
    ],
    melodia: {
      instrumento: 'acordeon',
      octavaBase: 3,
      volumen: 0.7,
      eco: 0.06,
      largo: 2,
      notas: [
        [0, [11]], [2, [11]], [3, [10]], [4, [9]], [6, [10]],
        [8, [11]], [10, [9]], [11, [8]], [12, [7]], [14, [8]],
      ],
    },
  },
  {
    id: 'champeta',
    nombre: 'Champeta',
    descripcion: 'Bombo que empuja, bajo saltón y guitarra africana.',
    icono: '🌴',
    bpm: 112,
    swing: 0,
    escala: 'mayor',
    capas: [
      { sonido: 'bombo', patron: 'X...X...X...X...', volumen: 0.85 },
      { sonido: 'sonoteca:caja', patron: '....X.......X...', volumen: 0.9 },
      { sonido: 'sonoteca:hatcerrado', patron: 'oxXxoxXxoxXxoxXx', volumen: 0.45 },
      { sonido: 'sonoteca:tumbadora', patron: '..x..x....x..x..', volumen: 0.75 },
      { sonido: 'sonoteca:bajo', patron: 'X..x..x.X..x..x.', volumen: 0.55, notas: [0, 0, 4, 3, 3, 5], octava: 2 },
    ],
    melodia: {
      instrumento: 'requinto',
      octavaBase: 3,
      volumen: 0.8,
      eco: 0.12,
      largo: 1,
      notas: [
        [0, [11]], [1, [9]], [2, [7]], [3, [9]], [4, [11]], [6, [9]],
        [8, [10]], [9, [12]], [10, [14]], [11, [12]], [12, [10]], [14, [12]],
      ],
    },
  },
  {
    id: 'hiphop',
    nombre: 'Hip hop',
    descripcion: 'Boom bap: bombo, caja seca y acordes de piano eléctrico.',
    icono: '🎧',
    bpm: 90,
    swing: 0.25,
    escala: 'dorica',
    capas: [
      { sonido: 'bombo', patron: 'X......x..x.....', volumen: 1 },
      { sonido: 'sonoteca:caja', patron: '....X.......X..o', volumen: 1 },
      { sonido: 'sonoteca:hatcerrado', patron: 'x.o.x.o.x.o.x.o.', volumen: 0.45 },
      { sonido: 'sonoteca:bajo', patron: 'X......x..x.....', volumen: 0.55, notas: [0, 0, 3], octava: 2 },
    ],
    melodia: {
      instrumento: 'piano',
      octavaBase: 3,
      volumen: 0.45,
      eco: 0.15,
      largo: 6,
      notas: [[0, I7], [10, IV7]],
    },
  },
  {
    id: 'electronica',
    nombre: 'Electrónica',
    descripcion: 'Bombo en cada tiempo, palmas, bajo a contratiempo y colchón.',
    icono: '⚡',
    bpm: 124,
    swing: 0,
    escala: 'menor',
    capas: [
      { sonido: 'bombo', patron: 'X...X...X...X...', volumen: 1 },
      { sonido: 'sonoteca:palmas', patron: '....X.......X...', volumen: 0.85 },
      { sonido: 'sonoteca:hatcerrado', patron: 'oxoxoxoxoxoxoxox', volumen: 0.4 },
      { sonido: 'sonoteca:hatabierto', patron: '..x...x...x...x.', volumen: 0.45 },
      { sonido: 'sonoteca:bajo', patron: '..x...x...x...x.', volumen: 0.55, notas: [0, 0, 5, 5], octava: 2 },
    ],
    melodia: {
      instrumento: 'pad',
      octavaBase: 3,
      volumen: 0.45,
      eco: 0.15,
      largo: 8,
      notas: [[0, I], [8, VI]],
    },
  },
  {
    id: 'lofi',
    nombre: 'Lo-fi',
    descripcion: 'Lento y tibio, con lluvia de fondo: ideal para contar.',
    icono: '☔',
    bpm: 76,
    swing: 0.3,
    escala: 'dorica',
    capas: [
      { sonido: 'bombo', patron: 'X.........x.....', volumen: 0.9 },
      { sonido: 'sonoteca:caja', patron: '....x.......x...', volumen: 0.85 },
      { sonido: 'sonoteca:hatcerrado', patron: 'o.o.o.o.o.o.o.o.', volumen: 0.35 },
      { sonido: 'sonoteca:lluvia', patron: 'x...............', volumen: 0.3 },
      { sonido: 'sonoteca:bajo', patron: 'X.........x.....', volumen: 0.5, notas: [0, 3], octava: 2 },
    ],
    melodia: {
      instrumento: 'piano',
      octavaBase: 3,
      volumen: 0.45,
      eco: 0.22,
      largo: 8,
      notas: [[0, I7], [10, IV7]],
    },
  },
  {
    id: 'ambiente',
    nombre: 'Ambiente',
    descripcion: 'Casi sin golpes: un colchón suave que deja hablar a la voz.',
    icono: '🌙',
    bpm: 70,
    swing: 0,
    escala: 'dorica',
    capas: [
      { sonido: 'bombo', patron: 'o.......o.......', volumen: 0.5 },
      { sonido: 'sonoteca:shaker', patron: '....o.......o...', volumen: 0.35 },
      { sonido: 'sonoteca:bajo', patron: 'x.......x.......', volumen: 0.45, notas: [0, 3], octava: 2 },
    ],
    melodia: {
      instrumento: 'pad',
      octavaBase: 3,
      volumen: 0.5,
      eco: 0.25,
      largo: 8,
      notas: [[0, I], [8, IV7]],
    },
  },
];

/** La base con que arranca un proyecto nuevo. */
export const BASE_INICIAL = 'reggaeton';

/** El nombre de la base elegida, o null si el proyecto viene de antes de las bases. */
export function nombreBase(id: string): string | null {
  return BASES.find((b) => b.id === id)?.nombre ?? null;
}

/** Si cambiar de base borraría trabajo hecho a mano en las escenas. */
export function hayEscenasRetocadas(p: Proyecto): boolean {
  return [...p.escenas, ...p.respiros].some((e) => (e.golpes && Object.keys(e.golpes).length > 0) || e.notas);
}

const FUERZA: Record<string, number> = { X: 1, x: 0.75, o: 0.45 };
/**
 * Las bases se midieron capa por capa para que bombo, caja, percusión, bajo
 * y melodía queden en su lugar; esto baja todo un poco para que la mezcla
 * no toque el limitador (medido: picos de +2 dB sin este recorte).
 */
const RECORTE = 0.8;

/**
 * Pone una base: las capas y la melodía de General, el tempo y el swing.
 * Las pistas con efectos grabados por el equipo se conservan (al final), y
 * las celdas propias de cada escena se borran: ya no corresponden a nada.
 */
export function aplicarPreset(p: Proyecto, id: string): void {
  const base = BASES.find((x) => x.id === id) ?? BASES[0];
  const pasos = p.patron.cantidadPasos;
  const urlsPropias = new Set(p.sonidos.map((s) => s.url));
  const propias = p.patron.filas.filter((f) => f.tipo === 'sample' && f.sampleUrl && urlsPropias.has(f.sampleUrl));
  const filas = base.capas.map((c) => {
    const fila = crearFila('bombo', pasos, { volumen: c.volumen * RECORTE });
    // ponerSonido busca la fila en el patrón: se pone sola un momento.
    p.patron.filas = [fila];
    ponerSonido(p, fila.id, c.sonido);
    // El patrón de 16 se repite si la vuelta es más larga.
    const letra = (i: number) => c.patron[i % 16] ?? '.';
    fila.pasos = Array.from({ length: pasos }, (_, i) => letra(i) !== '.');
    fila.acentos = Array.from({ length: pasos }, (_, i) => FUERZA[letra(i)] ?? 1);
    if (c.notas) {
      let k = 0;
      fila.grados = Array.from({ length: pasos }, (_, i) => {
        if (i % 16 === 0) k = 0;
        return letra(i) === '.' ? null : c.notas![k++ % c.notas!.length];
      });
      fila.octava = c.octava;
    }
    return fila;
  });
  p.patron.filas = [...filas, ...propias];

  const m = p.patron.melodia;
  const b = base.melodia;
  const instrumento = SONOTECA.find((x) => x.id === b.instrumento && x.grupo === 'melodico');
  if (instrumento) {
    m.instrumento = 'sample';
    m.sampleUrl = instrumento.url;
    m.nombreSample = instrumento.nombre;
    m.notaSample = instrumento.nota ?? 'C4';
  } else {
    m.instrumento = 'sintetizador';
  }
  m.octavaBase = b.octavaBase;
  m.escala = base.escala;
  m.volumen = b.volumen * RECORTE;
  m.eco = b.eco;
  m.largo = b.largo;
  m.notas = [];
  for (let vuelta = 0; vuelta * 16 < pasos; vuelta++) {
    for (const [paso, grados] of b.notas) for (const grado of grados) m.notas.push({ paso: paso + vuelta * 16, grado });
  }
  p.bpm = base.bpm;
  p.swing = base.swing;
  p.preset = base.id;
  sincronizarReglas(p);
  // Lo que dependía de las pistas viejas se va.
  for (const e of [...p.escenas, ...p.respiros]) {
    e.niveles = undefined;
    e.golpes = undefined;
    e.notas = undefined;
    e.reglas = undefined;
  }
}

// ------------------------------------------------------------ Datos de archivos

/** La envolvente de un sonido: qué tan fuerte va, 20 veces por segundo. */
async function envolvente(archivo: File): Promise<number[]> {
  const contexto = new AudioContext();
  try {
    const datos = await contexto.decodeAudioData(await archivo.arrayBuffer());
    const canal = datos.getChannelData(0);
    const tramo = Math.max(1, Math.floor(datos.sampleRate / 20));
    const valores: number[] = [];
    for (let i = 0; i < canal.length; i += tramo) {
      let suma = 0;
      const fin = Math.min(canal.length, i + tramo);
      for (let j = i; j < fin; j++) suma += canal[j] * canal[j];
      valores.push(Math.sqrt(suma / (fin - i)));
    }
    const maximo = Math.max(...valores, 1e-6);
    return valores.slice(0, 1200).map((v) => v / maximo);
  } finally {
    void contexto.close();
  }
}

/**
 * Una imagen leída como datos: su luz columna por columna (como una
 * partitura), sus cinco colores más presentes y todos los canales (rojo,
 * verde, azul, tono, intensidad, detalle y bits).
 */
async function leerImagen(archivo: File): Promise<{ valores: number[]; colores: string[]; canales: CanalesFoto }> {
  const url = URL.createObjectURL(archivo);
  try {
    const campo = await CampoImagen.desdeUrl(url);
    const canales = campo.canales();
    const colores = campo.colores();
    return { valores: canales.luz, colores, canales };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function leerArchivoDatos(archivo: File): Promise<ArchivoDatos> {
  const nombre = archivo.name.length > 18 ? `${archivo.name.slice(0, 15)}…` : archivo.name;
  if (archivo.type.startsWith('image/')) {
    const { valores, colores, canales } = await leerImagen(archivo);
    return { id: nuevoId('datos'), nombre, tipo: 'imagen', valores, colores, canales };
  }
  return { id: nuevoId('datos'), nombre, tipo: 'sonido', valores: await envolvente(archivo) };
}

// ------------------------------------------------------------ Pistas y sonidos

/**
 * Pone el cuadro de cada pista donde está su patrón: así, al moverlo, el
 * cambio parte de lo que ya suena y no de un punto cualquiera.
 */
export function sincronizarReglas(p: Proyecto): void {
  const n = p.patron.cantidadPasos;
  for (const f of p.patron.filas) {
    f.regla.golpes = f.pasos.filter(Boolean).length / n;
    f.regla.azar = 0.1;
  }
  const m = p.patron.melodia;
  m.regla.golpes = new Set(m.notas.map((x) => x.paso)).size / n;
  m.regla.azar = 0.1;
}

/** Mueve el cuadro de una pista en toda la pieza y rehace su patrón. */
export function moverReglaGeneral(p: Proyecto, id: string, golpes: number, azar: number): void {
  const n = p.patron.cantidadPasos;
  if (id === 'melodia') {
    const m = p.patron.melodia;
    m.regla.golpes = golpes;
    m.regla.azar = azar;
    const notas = generarMelodia({ ...m, regla: { ...m.regla, activa: true } }, n, p.semilla);
    if (notas) m.notas = notas;
    return;
  }
  const f = p.patron.filas.find((x) => x.id === id);
  if (!f) return;
  f.regla.golpes = golpes;
  f.regla.azar = azar;
  const g = generarPasos({ ...f.regla, activa: true }, n, p.semilla, id);
  if (g) {
    f.pasos = g.pasos;
    f.probabilidad = g.probabilidad;
  }
}

/**
 * Cambia el sonido de una pista. El valor es un sonido de la batería
 * ('bombo'…), 'sonoteca:<id>' o 'propio:<id>'.
 */
export function ponerSonido(p: Proyecto, filaId: string, valor: string): void {
  const fila = p.patron.filas.find((f) => f.id === filaId);
  if (!fila) return;
  if (valor.startsWith('propio:') || valor.startsWith('sonoteca:')) {
    const s = valor.startsWith('propio:')
      ? p.sonidos.find((x) => x.id === valor.slice(7))
      : SONOTECA.find((x) => x.id === valor.slice(9));
    if (!s) return;
    fila.tipo = 'sample';
    fila.sampleUrl = s.url;
    fila.nombre = s.nombre;
    // Un sonido melódico de la Sonoteca sabe en qué nota está: así la capa puede tocar notas (el bajo).
    fila.nota = 'nota' in s ? s.nota : undefined;
  } else {
    const tipo = valor as TipoSonido;
    fila.tipo = tipo;
    fila.sampleUrl = undefined;
    fila.nombre = NOMBRES_SONIDO[tipo];
    fila.nota = undefined;
  }
  fila.color = colorDeSonido(fila.tipo, fila.sampleUrl);
}

/** El valor con que se identifica el sonido actual de una pista (inverso de ponerSonido). */
export function valorSonido(p: Proyecto, tipo: TipoSonido, url?: string): string {
  if (tipo !== 'sample') return tipo;
  const deLaApp = SONOTECA.find((x) => x.url === url);
  if (deLaApp) return `sonoteca:${deLaApp.id}`;
  const s = p.sonidos.find((x) => x.url === url);
  return s ? `propio:${s.id}` : '';
}

/** Una pista nueva, vacía, con el sonido elegido. Devuelve su id. */
export function agregarPista(p: Proyecto, valor: string): string {
  const fila = crearFila('bombo', p.patron.cantidadPasos, { volumen: 0.7 });
  p.patron.filas.push(fila);
  ponerSonido(p, fila.id, valor);
  // En las escenas donde ya se eligió qué suena, la capa nueva entra sonando.
  for (const e of [...p.escenas, ...p.respiros]) if (e.niveles) e.niveles[fila.id] = 2;
  return fila.id;
}

/** Quita una pista y todo lo que dependía de ella. */
export function quitarPista(p: Proyecto, filaId: string): void {
  p.patron.filas = p.patron.filas.filter((f) => f.id !== filaId);
  p.conexiones = p.conexiones.filter((c) => c.destino !== `golpes:${filaId}`);
  for (const e of [...p.escenas, ...p.respiros]) {
    if (e.niveles) delete e.niveles[filaId];
    if (e.reglas) delete e.reglas[filaId];
  }
}
