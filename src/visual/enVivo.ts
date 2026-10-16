/**
 * Lo que se toca en vivo sobre la imagen: el gesto del cuadro X/Y y los
 * golpes visuales. Es un canal pequeño entre los botones y el escenario,
 * fuera de React, porque cambia sesenta veces por segundo.
 */
import type { GolpeVisual } from '../estado/tipos';

class EnVivo {
  /** El gesto que se está tocando ahora, o null si nadie toca el cuadro. */
  gesto: { x: number; y: number } | null = null;
  private oyentes = new Set<(golpe: GolpeVisual) => void>();

  disparar(golpe: GolpeVisual): void {
    for (const oyente of this.oyentes) oyente(golpe);
  }

  alDisparar(oyente: (golpe: GolpeVisual) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }
}

export const enVivo = new EnVivo();
