/**
 * Los tutoriales animados, en el orden en que aparecen en la galería
 * (el mismo orden en que se usan las herramientas).
 */
import type { Composicion } from './motor';
import { tutorialCajitas } from './tCajitas';
import { tutorialDatos } from './tDatos';
import { tutorialEmocion } from './tEmocion';
import { tutorialEnVivo } from './tEnVivo';
import { tutorialGolpes } from './tGolpes';
import { tutorialInstrumento } from './tInstrumento';
import { tutorialMaquina } from './tMaquina';
import { tutorialMatriz } from './tMatriz';
import { tutorialNarrativa } from './tNarrativa';
import { tutorialPad } from './tPad';
import { tutorialRespiros } from './tRespiros';
import { tutorialVisual } from './tVisual';
import { tutorialVozCorrida } from './tVozCorrida';

export const TUTORIALES: Composicion[] = [
  tutorialNarrativa,
  tutorialVozCorrida,
  tutorialRespiros,
  tutorialEmocion,
  tutorialCajitas,
  tutorialGolpes,
  tutorialMatriz,
  tutorialInstrumento,
  tutorialMaquina,
  tutorialEnVivo,
  tutorialPad,
  tutorialDatos,
  tutorialVisual,
];

export function tutorial(id: string): Composicion | undefined {
  return TUTORIALES.find((t) => t.id === id);
}
