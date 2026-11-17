// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los tutoriales, en el orden en que aparecen en la galería (el mismo orden
 * en que se usa la app). Los cinco primeros muestran la interfaz de verdad
 * y son los que se abren solos al entrar a cada parte.
 *
 * Desde nov. 2026 ya no están «Voz de corrido», «El Pad», «Los datos» de
 * la música ni «Tocar la imagen en vivo»: esas partes se quitaron de la app.
 */
import type { Composicion } from './motor';
import { tutorialCajitas } from './tCajitas';
import { tutorialEmocion } from './tEmocion';
import { tutorialGolpes } from './tGolpes';
import { tutorialInstrumento } from './tInstrumento';
import { tutorialMatriz } from './tMatriz';
import { tutorialNarrativa } from './tNarrativa';
import { tutorialRespiros } from './tRespiros';
import { tutorialVisual } from './tVisual';
import { tutorialHistoria, tutorialMezcla, tutorialMusica, tutorialSonidos, tutorialVisuales, tutorialVoz } from './tReales';

export const TUTORIALES: Composicion[] = [
  tutorialHistoria,
  tutorialVoz,
  tutorialMusica,
  tutorialSonidos,
  tutorialMezcla,
  tutorialVisuales,
  tutorialNarrativa,
  tutorialRespiros,
  tutorialEmocion,
  tutorialCajitas,
  tutorialGolpes,
  tutorialMatriz,
  tutorialInstrumento,
  tutorialVisual,
];

export function tutorial(id: string): Composicion | undefined {
  return TUTORIALES.find((t) => t.id === id);
}
