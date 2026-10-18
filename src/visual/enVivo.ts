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
  /** Cuándo fue (performance.now) el último golpe de cada tipo. */
  private ultimo: Record<GolpeVisual, number> = {
    destello: -1e9,
    zoom: -1e9,
    sacudon: -1e9,
    corte: -1e9,
  };

  /** Anota que ocurrió un golpe (venga de un botón, de lo grabado o de una cajita). */
  marcar(golpe: GolpeVisual): void {
    this.ultimo[golpe] = performance.now();
  }

  /** Segundos desde el último golpe de cada tipo. */
  edades(): Record<GolpeVisual, number> {
    const ahora = performance.now();
    return {
      destello: (ahora - this.ultimo.destello) / 1000,
      zoom: (ahora - this.ultimo.zoom) / 1000,
      sacudon: (ahora - this.ultimo.sacudon) / 1000,
      corte: (ahora - this.ultimo.corte) / 1000,
    };
  }

  disparar(golpe: GolpeVisual): void {
    for (const oyente of this.oyentes) oyente(golpe);
  }

  alDisparar(oyente: (golpe: GolpeVisual) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }
}

export const enVivo = new EnVivo();
