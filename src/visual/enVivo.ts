/**
 * Lo que se toca en vivo sobre la imagen: el gesto del cuadro X/Y y los
 * golpes visuales. Es un canal pequeño entre los botones y el escenario,
 * fuera de React, porque cambia sesenta veces por segundo.
 */
import { GOLPES_VISUALES, type GolpeVisual } from '../estado/tipos';

const sinGolpes = (valor: number) => Object.fromEntries(GOLPES_VISUALES.map((g) => [g, valor])) as Record<GolpeVisual, number>;

class EnVivo {
  /** El gesto que se está tocando ahora, o null si nadie toca el cuadro. */
  gesto: { x: number; y: number } | null = null;
  private oyentes = new Set<(golpe: GolpeVisual, fuerza: number) => void>();
  /** Cuándo fue (performance.now) el último golpe de cada tipo. */
  private ultimo = sinGolpes(-1e9);
  /** Con cuánta fuerza fue (1 es lo normal). */
  private fuerzas = sinGolpes(1);

  /** Anota que ocurrió un golpe (venga de un botón, de lo grabado, de una cajita o de una reacción). */
  marcar(golpe: GolpeVisual, fuerza = 1): void {
    this.ultimo[golpe] = performance.now();
    this.fuerzas[golpe] = fuerza;
  }

  /** Con cuánta fuerza fue el último golpe de ese tipo. */
  fuerzaDe(golpe: GolpeVisual): number {
    return this.fuerzas[golpe];
  }

  /** Segundos desde el último golpe de cada tipo. */
  edades(): Record<GolpeVisual, number> {
    const ahora = performance.now();
    const salida = sinGolpes(0);
    for (const g of GOLPES_VISUALES) salida[g] = (ahora - this.ultimo[g]) / 1000;
    return salida;
  }

  disparar(golpe: GolpeVisual, fuerza = 1): void {
    for (const oyente of this.oyentes) oyente(golpe, fuerza);
  }

  alDisparar(oyente: (golpe: GolpeVisual, fuerza: number) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }
}

export const enVivo = new EnVivo();
