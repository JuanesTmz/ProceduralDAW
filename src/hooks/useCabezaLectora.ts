/**
 * Mueve la cabeza lectora —la columna que marca el paso que suena—
 * escribiendo directamente en el DOM.
 *
 * Por qué así: si el paso actual viviera en el estado de React, cada
 * semicorchea re-renderizaría las casillas de la rejilla entera. En las
 * tablets del evento eso se nota. Aquí solo se toca un `left`.
 *
 * Y va en porcentaje, no en píxeles, porque las rejillas de las ventanas ya
 * no miden un número fijo de píxeles por casilla: se reparten el ancho que
 * tengan. El porcentaje vale igual con 16 pasos que con 64.
 */
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { motorAudio } from '../audio/motorAudio';

export function useCabezaLectora(
  referencia: RefObject<HTMLDivElement | null>,
  cantidadPasos: number,
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
      elemento.style.left = `${((paso + 0.5) / cantidadPasos) * 100}%`;
    });
  }, [referencia, cantidadPasos]);
}
