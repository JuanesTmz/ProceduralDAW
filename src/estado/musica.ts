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
  sincronizarReglas(p);
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
  } else {
    const tipo = valor as TipoSonido;
    fila.tipo = tipo;
    fila.sampleUrl = undefined;
    fila.nombre = NOMBRES_SONIDO[tipo];
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
