/**
 * Los tutoriales animados, en el orden en que aparecen en la galería.
 */
import type { Composicion } from './motor';
import { tutorialDatos } from './tDatos';
import { tutorialEmocion } from './tEmocion';
import { tutorialInstrumento } from './tInstrumento';
import { tutorialNarrativa } from './tNarrativa';
import { tutorialPad } from './tPad';

export const TUTORIALES: Composicion[] = [tutorialNarrativa, tutorialEmocion, tutorialPad, tutorialDatos, tutorialInstrumento];

export function tutorial(id: string): Composicion | undefined {
  return TUTORIALES.find((t) => t.id === id);
}
