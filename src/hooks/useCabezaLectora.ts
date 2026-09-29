/**
 * Mueve la cabeza lectora (la columna que marca el paso que suena)
 * escribiendo directamente en el DOM.
 *
 * Por qué así: si el paso actual viviera en el estado de React, cada
 * semicorchea re-renderizaría las ~2000 celdas de la grilla. En los equipos
 * modestos del evento eso se nota. Aquí solo se toca un `transform`.
 */
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { motorAudio } from '../audio/motorAudio';

/** Separación entre celdas, igual que el `gap` de la grilla en el CSS. */
export const SEPARACION_CELDA = 3;

export function useCabezaLectora(
  referencia: RefObject<HTMLDivElement | null>,
  anchoCelda: number,
): void {
  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;

    return motorAudio.alCambiarPaso((paso) => {
      if (paso < 0) {
        elemento.style.opacity = '0';
        return;
      }
      elemento.style.opacity = '1';
      elemento.style.transform = `translateX(${paso * (anchoCelda + SEPARACION_CELDA)}px)`;
    });
  }, [referencia, anchoCelda]);
}
