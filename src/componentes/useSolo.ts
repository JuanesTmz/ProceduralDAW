/**
 * Tocar un sonido solo, aislado, desde su fila. Todas las filas de una
 * lista comparten este hook: tocar otra la reemplaza, y si suena otra cosa
 * (la escena, la pieza, otra ventana) el botón vuelve a ▶.
 */
import { useEscucha } from './useEscucha';

/** `escena`: el índice de la escena abierta (suena como en ella), o -1 en General. */
export function useSolo(escena = -1) {
  const escucha = useEscucha();
  return {
    suena: (id: string) => escucha.suena({ tipo: 'capa', id, escena }),
    alternar: (id: string) => escucha.alternar({ tipo: 'capa', id, escena }),
  };
}
