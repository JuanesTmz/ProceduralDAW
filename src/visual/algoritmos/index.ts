/**
 * El catálogo. Añadir un algoritmo es escribir su archivo y sumarlo aquí:
 * la pantalla se dibuja sola a partir de esta lista y de los mandos que
 * cada uno declare.
 */
import { flujo } from './flujo';
import { ondas } from './ondas';
import { glifos } from './glifos';
import { nebulosa } from './nebulosa';
import { marejada } from './marejada';
import { caleidoscopio } from './caleidoscopio';
import { pegajoso } from './pegajoso';
import type { Algoritmo, NombreAlgoritmo } from './tipos';

export const ALGORITMOS: Algoritmo[] = [flujo, ondas, glifos, nebulosa, marejada, caleidoscopio, pegajoso];

export function algoritmoDe(id: NombreAlgoritmo): Algoritmo {
  return ALGORITMOS.find((a) => a.id === id) ?? ALGORITMOS[0];
}

export * from './tipos';
export { NOMBRES_ALFABETO, fijarAlfabeto } from './glifos';
