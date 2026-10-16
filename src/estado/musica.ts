/**
 * La música de las escenas: lo que se puede conectar, los puntos de
 * partida (presets) y cómo se sacan datos de un archivo.
 *
 * En el lab de IA la música se dirige con conexiones «este parámetro se
 * mueve según este dato». Aquí está el catálogo de las dos puntas: las
 * fuentes (de dónde sale el dato) y los destinos (qué se mueve).
 */
import { crearFila, nuevoId } from './proyecto';
import type { ArchivoDatos, Conexion, Emocion, Proyecto, TipoSonido } from './tipos';
import type { NombreEscala } from '../generativo/escalas';

// ------------------------------------------------------------ Fuentes

export type GrupoFuente = 'relato' | 'sonido' | 'archivo';

export interface Fuente {
  clave: string;
  etiqueta: string;
  grupo: GrupoFuente;
}

export const COLOR_GRUPO: Record<GrupoFuente, string> = {
  relato: '#ffb020',
  sonido: '#5ee0ff',
  archivo: '#2ee6a8',
};

export const FUENTES_FIJAS: Fuente[] = [
  { clave: 'emocion', etiqueta: 'La emoción', grupo: 'relato' },
  { clave: 'fuerza', etiqueta: 'La fuerza de la escena', grupo: 'relato' },
  { clave: 'avance', etiqueta: 'El avance de la historia', grupo: 'relato' },
  { clave: 'voz', etiqueta: 'La voz', grupo: 'sonido' },
  { clave: 'bombo', etiqueta: 'El bombo', grupo: 'sonido' },
];

export function fuentesDe(p: Proyecto): Fuente[] {
  return [
    ...FUENTES_FIJAS,
    ...p.archivosDatos.map((a) => ({
      clave: `archivo:${a.id}`,
      etiqueta: `${a.nombre} · ${a.tipo === 'sonido' ? 'ritmo' : 'brillo'}`,
      grupo: 'archivo' as const,
    })),
  ];
}

export function fuente(p: Proyecto, clave: string): Fuente | undefined {
  return fuentesDe(p).find((f) => f.clave === clave);
}

/** Qué tan «arriba» está cada emoción, para usarla como dato de 0 a 1. */
export const VALOR_EMOCION: Record<Emocion, number> = {
  calma: 0.15,
  nostalgia: 0.3,
  misterio: 0.42,
  alegria: 0.68,
  tension: 0.82,
  euforia: 1,
};

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
  return `Cuanto más sube ${dato}, ${d.efecto}.`;
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

// ------------------------------------------------------------ Presets

interface Preset {
  id: string;
  nombre: string;
  descripcion: string;
  bpm: number;
  swing: number;
  escala: NombreEscala;
  capas: { tipo: TipoSonido; pasos: number[]; volumen: number }[];
  melodia: { grado: number; paso: number }[];
}

export const PRESETS: Preset[] = [
  {
    id: 'pulso',
    nombre: 'Pulso lento',
    descripcion: 'Bombo pausado y un hi-hat que respira.',
    bpm: 92,
    swing: 0.12,
    escala: 'menorPentatonica',
    capas: [
      { tipo: 'bombo', pasos: [0, 8, 11], volumen: 0.95 },
      { tipo: 'redoblante', pasos: [4, 12], volumen: 0.7 },
      { tipo: 'hihat', pasos: [2, 6, 10, 14], volumen: 0.55 },
      { tipo: 'palma', pasos: [12], volumen: 0.5 },
      { tipo: 'tom', pasos: [7, 15], volumen: 0.5 },
    ],
    melodia: [{ grado: 4, paso: 0 }, { grado: 6, paso: 6 }, { grado: 5, paso: 10 }, { grado: 3, paso: 14 }],
  },
  {
    id: 'seco',
    nombre: 'Seco',
    descripcion: 'Golpes cortos y cuadrados, sin adornos.',
    bpm: 104,
    swing: 0,
    escala: 'menor',
    capas: [
      { tipo: 'bombo', pasos: [0, 4, 8, 12], volumen: 0.9 },
      { tipo: 'aro', pasos: [4, 12], volumen: 0.6 },
      { tipo: 'hihat', pasos: [0, 2, 4, 6, 8, 10, 12, 14], volumen: 0.45 },
      { tipo: 'palma', pasos: [], volumen: 0.5 },
      { tipo: 'tom', pasos: [14], volumen: 0.5 },
    ],
    melodia: [{ grado: 2, paso: 0 }, { grado: 2, paso: 8 }, { grado: 4, paso: 12 }],
  },
  {
    id: 'profundo',
    nombre: 'Profundo',
    descripcion: 'Graves largos y mucho espacio.',
    bpm: 78,
    swing: 0.06,
    escala: 'dorica',
    capas: [
      { tipo: 'bombo', pasos: [0, 10], volumen: 1 },
      { tipo: 'redoblante', pasos: [8], volumen: 0.6 },
      { tipo: 'hihat', pasos: [4, 12], volumen: 0.4 },
      { tipo: 'tom', pasos: [6, 14], volumen: 0.55 },
      { tipo: 'palma', pasos: [], volumen: 0.5 },
    ],
    melodia: [{ grado: 0, paso: 0 }, { grado: 4, paso: 4 }, { grado: 7, paso: 8 }, { grado: 4, paso: 12 }],
  },
  {
    id: 'abierto',
    nombre: 'Abierto',
    descripcion: 'Liviano y luminoso, deja respirar la voz.',
    bpm: 96,
    swing: 0.18,
    escala: 'mayor',
    capas: [
      { tipo: 'bombo', pasos: [0, 7, 10], volumen: 0.85 },
      { tipo: 'palma', pasos: [4, 12], volumen: 0.6 },
      { tipo: 'hihat', pasos: [2, 5, 8, 11, 14], volumen: 0.5 },
      { tipo: 'redoblante', pasos: [], volumen: 0.6 },
      { tipo: 'tom', pasos: [15], volumen: 0.45 },
    ],
    melodia: [{ grado: 7, paso: 0 }, { grado: 9, paso: 3 }, { grado: 8, paso: 6 }, { grado: 11, paso: 10 }],
  },
  {
    id: 'denso',
    nombre: 'Denso',
    descripcion: 'Muchas capas a la vez: lleno y con empuje.',
    bpm: 112,
    swing: 0.08,
    escala: 'frigia',
    capas: [
      { tipo: 'bombo', pasos: [0, 3, 6, 8, 11, 14], volumen: 0.95 },
      { tipo: 'redoblante', pasos: [4, 12], volumen: 0.75 },
      { tipo: 'hihat', pasos: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14], volumen: 0.45 },
      { tipo: 'palma', pasos: [4, 12, 15], volumen: 0.55 },
      { tipo: 'tom', pasos: [7, 10, 13], volumen: 0.55 },
    ],
    melodia: [{ grado: 3, paso: 0 }, { grado: 4, paso: 2 }, { grado: 3, paso: 4 }, { grado: 6, paso: 8 }, { grado: 5, paso: 12 }],
  },
];

/**
 * Aplica un preset como punto de partida. Las pistas con sonidos propios
 * se conservan: samplear el preset es justamente cambiarle sonidos.
 */
export function aplicarPreset(p: Proyecto, id: string): void {
  const preset = PRESETS.find((x) => x.id === id);
  if (!preset) return;
  const pasos = p.patron.cantidadPasos;
  const propias = p.patron.filas.filter((f) => f.tipo === 'sample');
  const filas = preset.capas.map((c) => {
    const fila = crearFila(c.tipo, pasos, { volumen: c.volumen });
    for (const i of c.pasos) if (i < pasos) fila.pasos[i] = true;
    return fila;
  });
  p.patron.filas = [...filas, ...propias];
  p.patron.melodia.notas = preset.melodia.map((n) => ({ ...n }));
  p.patron.melodia.escala = preset.escala;
  p.bpm = preset.bpm;
  p.swing = preset.swing;
  p.preset = id;
  // Las conexiones que apuntaban a pistas que ya no existen se van.
  const ids = new Set(p.patron.filas.map((f) => f.id));
  p.conexiones = p.conexiones.filter(
    (c) => !c.destino.startsWith('golpes:') || ids.has(c.destino.slice(7)),
  );
  // Y los niveles por escena de esas pistas también.
  for (const e of [...p.escenas, ...p.respiros]) e.niveles = undefined;
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
 * Una imagen leída como partitura: el brillo de cada columna, de izquierda
 * a derecha, y sus cinco colores más presentes.
 */
async function leerImagen(archivo: File): Promise<{ valores: number[]; colores: string[] }> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const ancho = 64;
    const alto = 40;
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d')!;
    ctx.drawImage(img, 0, 0, ancho, alto);
    const px = ctx.getImageData(0, 0, ancho, alto).data;
    const valores: number[] = [];
    const cubos = new Map<string, number>();
    for (let x = 0; x < ancho; x++) {
      let suma = 0;
      for (let y = 0; y < alto; y++) {
        const i = (y * ancho + x) * 4;
        const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
        suma += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const clave = [r, g, b].map((c) => Math.round(c / 51) * 51).join(',');
        cubos.set(clave, (cubos.get(clave) ?? 0) + 1);
      }
      valores.push(suma / alto);
    }
    const colores = [...cubos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => `#${k.split(',').map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`);
    return { valores, colores };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function leerArchivoDatos(archivo: File): Promise<ArchivoDatos> {
  const nombre = archivo.name.length > 18 ? `${archivo.name.slice(0, 15)}…` : archivo.name;
  if (archivo.type.startsWith('image/')) {
    const { valores, colores } = await leerImagen(archivo);
    return { id: nuevoId('datos'), nombre, tipo: 'imagen', valores, colores };
  }
  return { id: nuevoId('datos'), nombre, tipo: 'sonido', valores: await envolvente(archivo) };
}
