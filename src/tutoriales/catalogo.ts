// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los tutoriales, en el orden en que aparecen en la galería (el mismo orden
 * en que se usa la app). Los seis primeros muestran la interfaz de verdad;
 * los demás son dibujados y explican una idea o una mecánica.
 *
 * Desde nov. 2026 ya no están «Voz de corrido», «El Pad», «Los datos» de
 * la música ni «Tocar la imagen en vivo»: esas partes se quitaron de la app.
 * El 23 nov 2026 se rehicieron los seis «reales» para la interfaz de cinco
 * pasos y «La mezcla» salió (ahora es el botón Volumen de Música).
 * «El visual reacciona» salió el mismo día: mostraba el visual moviéndose
 * solo, y ahora se mueve con las cajitas y los golpes de Visuales.
 */
import type { Composicion } from './motor';
import { tutorialCajitas } from './tCajitas';
import { tutorialEmocion } from './tEmocion';
import { tutorialGolpes } from './tGolpes';
import { tutorialInstrumento } from './tInstrumento';
import { tutorialMatriz } from './tMatriz';
import { tutorialNarrativa } from './tNarrativa';
import { tutorialRespiros } from './tRespiros';
import { tutorialFuncion, tutorialHistoria, tutorialMusica, tutorialSonidos, tutorialVisuales, tutorialVoz } from './tReales';

export const TUTORIALES: Composicion[] = [
  tutorialHistoria,
  tutorialVoz,
  tutorialMusica,
  tutorialSonidos,
  tutorialVisuales,
  tutorialFuncion,
  // Historia
  tutorialNarrativa,
  tutorialEmocion,
  // Música
  tutorialGolpes,
  tutorialCajitas,
  tutorialMatriz,
  tutorialInstrumento,
  tutorialRespiros,
];

export function tutorial(id: string): Composicion | undefined {
  return TUTORIALES.find((t) => t.id === id);
}
