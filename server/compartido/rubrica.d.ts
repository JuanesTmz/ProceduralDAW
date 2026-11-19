// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
export type GuiaId = 'logrado' | 'parcial' | 'no';
/** Nota de 1 a 5 por criterio. */
export type Notas = Partial<Record<string, number>>;

export interface Guia {
  id: GuiaId;
  nombre: string;
  nota: number;
}

export interface Criterio {
  id: string;
  nombre: string;
  corto: string;
  peso: number;
  icono: string;
  /** Lo que mira el jurado en este criterio. */
  pregunta: string;
  guias: Record<GuiaId, string>;
}

export interface FilaRanking {
  equipoId: number;
  nombre: string;
  total: number;
  criterios: Record<string, number>;
  jurados: number;
  puesto: number;
}

export const NOTA_MINIMA: number;
export const NOTA_MAXIMA: number;
export const GUIAS: Guia[];
export const CRITERIOS: Criterio[];
export function leerNota(valor: unknown): number | null;
export function limpiarNotas(notas: unknown): Notas;
export function completa(notas: Notas): boolean;
export function notaFinal(notas: Notas): number | null;
export function armarRanking(equipos: { id: number; nombre: string }[], calificaciones: { equipoId: number; notas: Notas }[]): FilaRanking[];
