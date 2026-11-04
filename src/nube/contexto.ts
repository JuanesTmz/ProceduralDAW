// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/** Lo que la puerta de la nube le cuenta al resto de la app. */
import { createContext, useContext } from 'react';
import type { Equipo } from './api';
import type { Sala } from './sala';

export interface Persona {
  nombre: string;
  color: string;
}

export interface ContextoNube {
  equipo: Equipo;
  persona: Persona;
  /** La sala en tiempo real del equipo. */
  sala: Sala;
  cambiarPersona: () => void;
  salir: () => void;
}

export const ContextoNube = createContext<ContextoNube | null>(null);

/** null fuera de la nube. */
export function useNube(): ContextoNube | null {
  return useContext(ContextoNube);
}
