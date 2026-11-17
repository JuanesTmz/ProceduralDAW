// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * «Estás dentro de un tutorial». Los tutoriales muestran las pantallas de
 * verdad, con un proyecto de demostración; adentro, lo que normalmente se
 * abre encima de todo (las ventanas) se dibuja dentro del video, y nada
 * toma el foco ni el teclado.
 */
import { createContext, useContext } from 'react';

export const EnDemo = createContext(false);

export function useEnDemo(): boolean {
  return useContext(EnDemo);
}
