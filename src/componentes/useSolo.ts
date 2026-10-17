/**
 * Tocar una pista sola, aislada, desde su fila. Todas las filas de una
 * lista comparten este hook: tocar otra la reemplaza, y si suena otra cosa
 * (la escena, la pieza, otra ventana) el botón vuelve a ▶ solo.
 */
import { motorAudio } from '../audio/motorAudio';
import { useEscucha } from './useEscucha';

/** `escena`: el índice de la escena abierta (suena como en ella), o -1 en General. */
export function useSolo(escena = -1) {
  const escucha = useEscucha();
  return {
    sonando: escucha.sonandoAqui,
    alternar: (id: string) =>
      escucha.alternar(
        id,
        () => void motorAudio.reproducirSolo(id, escena),
        () => motorAudio.sigueSonando && motorAudio.pistaSola === id,
      ),
  };
}
