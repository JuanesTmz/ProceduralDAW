/**
 * Tipos del proyecto SONORA.
 * Un "proyecto" es lo que el estudiante construye: un patrón (el loop)
 * y unas secciones (el arco). Todo serializable a JSON para guardar/cargar.
 */
import type { NombreEscala } from '../generativo/escalas';
import type { NombreAlgoritmo } from '../visual/algoritmos/tipos';
import type { FuenteDatos } from '../visual/datosVisual';
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

/**
 * La regla de una pista, tal como la deja el cuadro X/Y.
 *
 * Antes había tres modos sueltos —a mano, euclidiano, probabilístico— y cinco
 * controles para elegir entre ellos. Son un solo gesto: dónde pones el punto
 * dentro del cuadro ES la regla, y los tres modos viejos son sus esquinas.
 */
export interface ReglaFila {
  /** ¿La arma la máquina? Si no, manda lo que el estudiante dibujó. */
  activa: boolean;
  /** Eje X, 0..1 — cuántos golpes tiene el esqueleto, repartidos parejo. */
  golpes: number;
  /** Eje Y, 0..1 — cuánto azar: 0 suena siempre igual, 1 respira mucho. */
  azar: number;
  /** Corre el patrón para mover el acento. */
  rotacion: number;
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

/** Con qué suena la matriz: el sintetizador de la app o un sonido propio. */
export type InstrumentoMelodia = 'sintetizador' | 'sample';

export interface Melodia {
  /** Octava de la nota más grave de la matriz. */
  octavaBase: number;
  instrumento: InstrumentoMelodia;
  /** Sonido subido por el estudiante, que se afina en cada casilla. */
  sampleUrl?: string;
  nombreSample?: string;
  /**
   * Qué nota es ese sonido tal como se grabó. Desde ahí se transporta al
   * resto de la matriz: en esa casilla suena a su velocidad original.
   */
  notaSample: string;
  notas: NotaMelodia[];
  volumen: number;
  silenciada: boolean;
  soloActivo: boolean;
  regla: ReglaFila;
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
  /**
   * Cuánto mueve la máquina el ecualizador sola, de 0 a 1.
   *
   * En 0 el sonido es el que se dejó puesto y no cambia nunca. Según sube,
   * el filtro se cierra en las partes de poca energía y se abre en el coro,
   * y la sala hace lo contrario. Es el mismo trato que las reglas de los
   * golpes: el estudiante dice cuánto, la pieza lo hace sola.
   */
  movimiento: number;
}

export interface Patron {
  cantidadPasos: 16 | 32 | 64;
  filas: Fila[];
  melodia: Melodia;
}

/**
 * El nombre de una sección del motor. Antes eran cuatro fijas (intro,
 * estrofa, coro, cierre); con las escenas del relato son tantas como el
 * estudiante quiera, y el id de cada una es el de su escena.
 */
export type NombreSeccion = string;

/**
 * Cómo se produce el material de una sección.
 * 'procedural' = mandan las reglas y la semilla; 'manual' = suena tal cual
 * lo que el estudiante dibujó en la grilla, sin azar.
 */
export type ModoSeccion = 'procedural' | 'manual';

export interface Seccion {
  id: NombreSeccion;
  etiqueta: string;
  /** Con reglas (procedural) o a mano con lo dibujado y los samples. */
  modo: ModoSeccion;
  /** Cuántas repeticiones del patrón dura la sección. */
  compases: number;
  /** Semilla propia: cada sección varía distinto. */
  semilla: number;
  /** 0..1 — cuánto material suena y con qué fuerza. */
  intensidad: number;
  /** Ids de filas activas en esta sección. */
  capasActivas: string[];
  /**
   * Cuánta energía tiene cada pista encendida en esta parte: 1 suave,
   * 2 medio, 3 fuerte. Lo que no esté aquí vale 2. Es lo que se ajusta
   * tocando un bloque en la línea de tiempo de la canción.
   */
  niveles?: Record<string, number>;
  melodiaActiva: boolean;
  /** Ajuste de tempo relativo al BPM base (1 = igual). */
  factorTempo: number;
  /** Texto de la guía: qué le toca hacer a esta sección en el relato. */
  intencion: string;
  /** El cierre baja de volumen progresivamente. */
  desvanecer: boolean;
  /** Escala propia de la sección; si falta, manda la de la melodía. */
  escala?: NombreEscala;
  /** La voz que entra al empezar la sección (una escena grabada). */
  voz?: { url: string; duracion: number };
}

// ------------------------------------------------------------ El relato

/** Lo que siente una escena. Mueve la música y, más adelante, la imagen. */
export type Emocion = 'calma' | 'alegria' | 'tension' | 'nostalgia' | 'misterio' | 'euforia';

/** 1 suave, 2 media, 3 fuerte. */
export type Fuerza = 1 | 2 | 3;

/**
 * Una escena del relato: un trozo del monólogo con su voz, su emoción,
 * su fuerza y su foto. Es la unidad de toda la app.
 *
 * Un respiro es una escena sin voz: la música cuenta sola. Va en su propia
 * lista porque no sale del texto, y `despuesDe` dice detrás de qué escena
 * se coloca (-1 = al principio).
 */
export interface Escena {
  id: string;
  nombre: string;
  /** El trozo de monólogo que le toca. Vacío en un respiro. */
  texto: string;
  respiro: boolean;
  emocion: Emocion;
  fuerza: Fuerza;
  /** URL local de la voz grabada para esta escena. */
  vozUrl?: string;
  vozDuracion: number;
  /** Solo en respiros: cuánto dura, en segundos. */
  duracionRespiro: number;
  despuesDe: number;
  imagenUrl?: string;
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

/**
 * Un sonido grabado por el estudiante en el Estudio, ya recortado y listo
 * para usarse como sample. La url es local (objectURL), así que no viaja en
 * el JSON del proyecto: vive mientras la pestaña esté abierta.
 */
export interface SonidoPropio {
  id: string;
  nombre: string;
  url: string;
  duracion: number;
}

/**
 * El visual: mismo criterio que la música —reglas, datos y semilla—, pero
 * en imagen.
 *
 * Un algoritmo a la vez, con tres entradas que puede tener o no: lo que
 * suena, una imagen leída como datos y una tabla. Los mandos se guardan por
 * algoritmo, para que cambiar de obra y volver no pierda lo que se ajustó.
 */
export interface Visual {
  algoritmo: NombreAlgoritmo;
  /** Los mandos de cada algoritmo, cada uno por su lado. */
  parametros: Partial<Record<NombreAlgoritmo, Record<string, number>>>;
  paleta: string;
  /** Solo lo usa la constelación de glifos. */
  alfabeto: string;
  /** Cuánto le hace caso a la música (0..1). */
  reaccion: number;
  /** URL local de la foto del tema. */
  imagenUrl?: string;
  nombreImagen?: string;
  /** Cuánto manda la imagen sobre el algoritmo (0..1). */
  influenciaImagen: number;
  /** De dónde salen los datos que deforman la obra. */
  fuenteDatos: FuenteDatos;
  /** El CSV cargado, tal cual, para poder recalcular sin volver a pedirlo. */
  csv?: string;
  nombreDatos?: string;
  influenciaDatos: number;
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
  /**
   * Cuánto se retrasan las semicorcheas impares (0..0.6). Es lo que hace que
   * el ritmo "cojee" en vez de ir cuadrado como un metrónomo.
   */
  swing: number;
  /** Semilla global del motor generativo. */
  semilla: number;
  /**
   * Cuántas veces se ha pulsado "Mutar". Entra en el azar de la mutación para
   * que mutar sea reproducible: antes usaba la hora del reloj, y eso rompía la
   * promesa de que la misma semilla da siempre la misma pieza.
   */
  generacionMutacion: number;
  volumenMaestro: number;
  patron: Patron;
  efectos: Efectos;
  secciones: Seccion[];
  /** Lo que el estudiante grabó en el Estudio. */
  sonidos: SonidoPropio[];
  /**
   * Índices de palabra donde empieza una escena nueva (sin contar la 0).
   * De aquí salen las escenas con voz: partir el texto es partir la pieza.
   */
  cortesEscena: number[];
  /** Las escenas con voz, en orden. Se rehacen solas al mover los cortes. */
  escenas: Escena[];
  /** Los respiros, cada uno colgado detrás de una escena. */
  respiros: Escena[];
}

/**
 * Las tres fases del recorrido, tal como se ven en la barra de arriba.
 * Conceptualización es el relato, Producción es la música y Visual es
 * lo que se ve. Exportar no es una fase: es la salida, y vive aparte.
 */
export type Fase = 'concepto' | 'produccion' | 'visual';

/**
 * Las herramientas de Producción.
 *
 * Ya no son pantallas: Producción es UNA pantalla —la pista repartida— y
 * cada herramienta se abre encima en su ventana. 'cancion' no es una
 * herramienta, es la pantalla misma; está aquí porque la guía y los
 * requisitos siguen hablando de ella como un destino.
 */
export type Mesa = 'cancion' | 'golpes' | 'matriz' | 'procedural' | 'sonidos';

/**
 * Las que de verdad abren una ventana. 'estructura' y 'mezcla' no son mesas
 * porque nadie llega a ellas desde fuera: se abren aquí y se cierran aquí.
 */
export type Herramienta = Exclude<Mesa, 'cancion'> | 'estructura' | 'mezcla';

/** Cada pantalla de la app. Las del medio son Producción. */
export type Vista =
  | 'historia'
  | 'monologo'
  | Mesa
  | 'visual'
  | 'exportar';

/** A qué fase pertenece cada pantalla. */
export const FASE_DE_VISTA: Record<Vista, Fase> = {
  historia: 'concepto',
  monologo: 'concepto',
  cancion: 'produccion',
  golpes: 'produccion',
  matriz: 'produccion',
  procedural: 'produccion',
  sonidos: 'produccion',
  visual: 'visual',
  exportar: 'visual',
};

export const MESAS: Mesa[] = ['cancion', 'golpes', 'matriz', 'procedural', 'sonidos'];

export function esMesa(vista: Vista): vista is Mesa {
  return (MESAS as string[]).includes(vista);
}

/** Meta de palabras del monólogo, como en «Medellín en 100 palabras». */
export const META_PALABRAS = 100;
export const MINIMO_PALABRAS = 70;
export const MAXIMO_PALABRAS = 130;
