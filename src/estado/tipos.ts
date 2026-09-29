/**
 * Tipos del proyecto SONORA.
 * Un "proyecto" es lo que el estudiante construye: un patrón (el loop)
 * y unas secciones (el arco). Todo serializable a JSON para guardar/cargar.
 */
import type { NombreEscala } from '../generativo/escalas';
import type { NombrePreset } from '../visual/presets';
import type { Track } from '../guia/pasos';

/** Filas de la matriz tonal: 16 notas de la escala, de grave a agudo. */
export const FILAS_MATRIZ = 16;

/** Los sonidos del kit de prueba. 'sample' = archivo subido por el estudiante. */
export type TipoSonido =
  | 'bombo'
  | 'redoblante'
  | 'hihat'
  | 'palma'
  | 'tom'
  | 'aro'
  | 'sample';

/** Cómo se decide si un paso suena. Se amplía en la Fase 2. */
export type ModoRegla = 'manual' | 'euclidiano' | 'probabilistico';

export interface ReglaFila {
  modo: ModoRegla;
  /** Ritmos euclidianos: cuántos pulsos repartir en los pasos disponibles. */
  pulsos: number;
  /** Corrimiento del patrón euclidiano. */
  rotacion: number;
  /** Modo probabilístico: qué tan lleno queda el patrón (0..1). */
  densidad: number;
  /** Cuántos pasos cambia el botón "Mutar" (0..1). */
  mutabilidad: number;
}

export interface Fila {
  id: string;
  nombre: string;
  tipo: TipoSonido;
  color: string;
  /** Pasos activos del patrón. Largo = cantidad de pasos del proyecto. */
  pasos: boolean[];
  /** Probabilidad por paso (0..1). Largo = cantidad de pasos. */
  probabilidad: number[];
  /** Volumen relativo 0..1. */
  volumen: number;
  silenciada: boolean;
  soloActivo: boolean;
  regla: ReglaFila;
  /** Con candado, ni "Variar" ni "Mutar" tocan esta fila. */
  protegida: boolean;
  /** URL local (objectURL o dataURL) del sample subido. */
  sampleUrl?: string;
  /** Nota base para afinar el sample o el sonido. */
  nota?: string;
}

/**
 * Una nota de la matriz: la fila (grado de la escala, 0 = la más grave)
 * y el paso. Se guarda el grado, no el semitono, para que cambiar de escala
 * traslade la melodía entera sin desafinarla.
 */
export interface NotaMelodia {
  grado: number;
  paso: number;
}

export interface Melodia {
  /** Octava de la nota más grave de la matriz. */
  octavaBase: number;
  notas: NotaMelodia[];
  volumen: number;
  silenciada: boolean;
  soloActivo: boolean;
  regla: ReglaFila;
  protegida: boolean;
  /** Escala a la que se cuantizan las notas generadas. */
  escala: NombreEscala;
  /** El estudiante puede ocultar la matriz para concentrarse en el ritmo. */
  visible: boolean;
}

export interface Efectos {
  reverbCantidad: number;
  filtroFrecuencia: number;
  /** Tipo de filtro maestro. */
  filtroTipo: 'lowpass' | 'highpass';
  delayCantidad: number;
}

export interface Patron {
  cantidadPasos: 16 | 32 | 64;
  filas: Fila[];
  melodia: Melodia;
}

export type NombreSeccion = 'intro' | 'cuerpo' | 'giro' | 'cierre';

export interface Seccion {
  id: NombreSeccion;
  etiqueta: string;
  /** Cuántas repeticiones del patrón dura la sección. */
  compases: number;
  /** Semilla propia: cada sección varía distinto. */
  semilla: number;
  /** 0..1 — cuánto material suena y con qué fuerza. */
  intensidad: number;
  /** Ids de filas activas en esta sección. */
  capasActivas: string[];
  melodiaActiva: boolean;
  /** Ajuste de tempo relativo al BPM base (1 = igual). */
  factorTempo: number;
  /** Texto de la guía: qué le toca hacer a esta sección en el relato. */
  intencion: string;
  /** Preset visual propio. Si no hay, usa el general del proyecto. */
  presetVisual?: NombrePreset;
  /** El cierre baja de volumen progresivamente. */
  desvanecer: boolean;
}

/** La historia: el corazón del reto. Sin esto, lo demás no tiene para qué. */
export interface Historia {
  /** ¿Qué historia de Medellín vas a contar? */
  que: string;
  /** ¿Por qué es Medellín? — el arraigo territorial que pide la rúbrica. */
  porQue: string;
}

/**
 * El monólogo narrado. El texto es uno solo; el reparto marca en qué
 * palabra empieza cada sección, para que la narración avance con el arco.
 */
export interface Narracion {
  texto: string;
  /** URL local de la grabación (objectURL). No se serializa a JSON. */
  audioUrl?: string;
  /** Nombre del archivo, si lo subieron en vez de grabarlo. */
  origen: 'ninguno' | 'grabado' | 'subido';
  duracion: number;
  /** Sección en la que entra la voz. */
  seccionInicio: NombreSeccion;
  /** Segundos de espera desde que empieza esa sección. */
  desfase: number;
  volumen: number;
  /** Índices de palabra donde empieza cada sección después de la primera. */
  cortes: [number, number, number];
}

/** El visual reactivo: mismo criterio que la música, todo por reglas y semilla. */
export interface Visual {
  preset: NombrePreset;
  /** URL local de la foto del tema. */
  imagenUrl?: string;
  nombreImagen?: string;
  /** Cuánto se deforma la imagen con el sonido (0..1). */
  mezclaImagen: number;
  /** Mostrar el monólogo sobre el visual. */
  textoVisible: boolean;
  /** Por defecto comparte la semilla de la música; se puede separar. */
  semillaPropia: boolean;
  semilla: number;
}

/** Bucle del patrón, o recorrido completo por las secciones. */
export type ModoReproduccion = 'patron' | 'pieza';

export interface Proyecto {
  nombre: string;
  /** Urban Lab de origen. null = todavía no ha elegido (Pantalla 0). */
  track: Track | null;
  modoReproduccion: ModoReproduccion;
  historia: Historia;
  narracion: Narracion;
  visual: Visual;
  bpm: number;
  /** Semilla global del motor generativo. */
  semilla: number;
  volumenMaestro: number;
  patron: Patron;
  efectos: Efectos;
  secciones: Seccion[];
}

/** Vistas de la app. La Fase 6 las convertirá en un recorrido guiado. */
export type Vista =
  | 'historia'
  | 'monologo'
  | 'arco'
  | 'patron'
  | 'motor'
  | 'secciones'
  | 'visual'
  | 'exportar';

/** Meta de palabras del monólogo, como en «Medellín en 100 palabras». */
export const META_PALABRAS = 100;
export const MINIMO_PALABRAS = 70;
export const MAXIMO_PALABRAS = 130;
