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

export type NombreAlgoritmo =
  | 'flujo'
  | 'ondas'
  | 'glifos'
  | 'nebulosa'
  | 'marejada'
  | 'caleidoscopio'
  | 'pegajoso';

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
  /**
   * Si el mando es una elección y no una cantidad (la figura, el alfabeto),
   * sus opciones por nombre. El valor es el número de la opción (0, 1, 2…)
   * y la pantalla muestra botones en vez de un deslizador.
   */
  opciones?: string[];
}

/** Un mando que elige entre opciones: sus límites salen de la lista. */
export function eleccion(
  id: string,
  etiqueta: string,
  opciones: string[],
  valor = 0,
): Mando {
  return {
    id,
    etiqueta,
    min: 0,
    max: opciones.length - 1,
    paso: 1,
    valor,
    lectura: (v) => opciones[Math.max(0, Math.min(opciones.length - 1, Math.round(v)))],
    opciones,
  };
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
  /** El texto de la escena que suena: algunos algoritmos lo usan como material. */
  texto: string;
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

/**
 * Valores al azar para el botón «Sorprenderme» y para que cada grupo arranque
 * con una obra distinta. `azar` devuelve un número de 0 a 1.
 *
 * Las elecciones (figura, alfabeto…) se sortean entre todas sus opciones. Las
 * cantidades se mueven alrededor de su valor de fábrica: `osadia` es qué
 * tanto del rango se pueden alejar (0 = nada, 1 = cualquier punto). Con todo
 * el rango salen pantallas vacías o saturadas; con la mitad, obras distintas
 * pero que siguen siendo legibles.
 */
export function valoresAlAzar(algoritmo: Algoritmo, azar: () => number, osadia = 0.5): Record<string, number> {
  const valores: Record<string, number> = {};
  for (const m of algoritmo.mandos) {
    const rango = m.max - m.min;
    const crudo = m.opciones
      ? m.min + azar() * rango
      : m.valor + (azar() * 2 - 1) * osadia * rango;
    const acotado = Math.max(m.min, Math.min(m.max, crudo));
    valores[m.id] = Math.max(m.min, Math.min(m.max, Math.round(acotado / m.paso) * m.paso));
  }
  return valores;
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
