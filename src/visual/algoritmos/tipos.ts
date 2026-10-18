/**
 * El contrato de un algoritmo visual.
 *
 * Los cuatro algoritmos no saben nada del resto de la app: reciben un
 * ENTORNO —el tamaño, el tiempo, lo que suena, la imagen leída como datos,
 * los picos y los valores de sus mandos— y pintan un cuadro. Ni tocan el
 * proyecto ni hablan con React.
 *
 * Eso es lo que permite tenerlos los cuatro juntos y que añadir el quinto
 * sea escribir un archivo, no tocar la pantalla.
 */
import type { Bandas } from '../analizador';
import type { CampoImagen } from '../imagenDatos';
import type { Pico } from '../datosVisual';
import type { GolpeVisual } from '../../estado/tipos';

export type NombreAlgoritmo = 'flujo' | 'ondas' | 'glifos' | 'nebulosa' | 'marejada' | 'caleidoscopio';

/** Un mando: lo que el estudiante mueve a la derecha de la pantalla. */
export interface Mando {
  id: string;
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
  valor: number;
  /** Cómo se lee el valor. Sin esto saldría «0.73», que no dice nada. */
  lectura?: (v: number) => string;
}

export interface Entorno {
  ancho: number;
  alto: number;
  /** Segundos desde que arrancó el algoritmo. */
  tiempo: number;
  /** Segundos del último cuadro, para que la animación no dependa del FPS. */
  delta: number;
  bandas: Bandas;
  /** Cuánto le hace caso a la música, 0..1. */
  reaccion: number;
  imagen: CampoImagen | null;
  /** Cuánto manda la imagen sobre el campo, 0..1. */
  influenciaImagen: number;
  picos: Pico[];
  /** Cuánto deforman los picos, 0..1. */
  influenciaDatos: number;
  /** Lo movida que es la fuente de datos, 0..1. */
  movimientoDatos: number;
  parametros: Record<string, number>;
  paleta: string[];
  semilla: number;
  /**
   * Dónde toca el dedo el cuadro de tocar en vivo (o dónde lo tocó el gesto
   * grabado), en 0..1 de pantalla con la y hacia abajo. null si nadie toca.
   * Los algoritmos que lo usan hacen que el dedo SEA el ratón.
   */
  toque: { x: number; y: number } | null;
  /**
   * Segundos desde el último golpe visual de cada tipo (los botones de tocar
   * en vivo, los grabados y los de las cajitas). Grande si todavía no hubo.
   */
  edadGolpe: Record<GolpeVisual, number>;
}

export interface Instancia {
  dibujar(entorno: Entorno): void;
  redimensionar(ancho: number, alto: number): void;
  destruir?(): void;
}

export interface Algoritmo {
  id: NombreAlgoritmo;
  nombre: string;
  /** Qué es, en una línea. */
  descripcion: string;
  /** Qué mueve la música aquí: se lee en pantalla, no hay que adivinarlo. */
  escucha: string;
  /** Qué hace con la imagen cuando hay una. */
  conImagen: string;
  /** Qué hacen los datos aquí. */
  conDatos: string;
  mandos: Mando[];
  crear(lienzo: HTMLCanvasElement): Instancia;
}

/** Los valores de fábrica de un algoritmo, para arrancar y para reiniciar. */
export function valoresPorDefecto(algoritmo: Algoritmo): Record<string, number> {
  const valores: Record<string, number> = {};
  for (const mando of algoritmo.mandos) valores[mando.id] = mando.valor;
  return valores;
}

/** Lecturas que se repiten entre algoritmos. */
export const porcentaje = (v: number) => `${Math.round(v * 100)}%`;
export const veces = (v: number) => `${v.toFixed(1)}×`;
