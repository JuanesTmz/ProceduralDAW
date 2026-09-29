/**
 * Azar controlado: la misma semilla produce siempre la misma secuencia.
 * Es la pieza que hace que el motor sea "procedural" y no caótico.
 * Implementación propia de mulberry32 (generador de 32 bits, rápido y suficiente).
 */

export interface Rng {
  /** Siguiente número en [0, 1). */
  siguiente: () => number;
  /** Entero en [min, max] inclusive. */
  entero: (min: number, max: number) => number;
  /** true con probabilidad p (0..1). */
  ocurre: (p: number) => boolean;
  /** Elige un elemento del arreglo. */
  elige: <T>(items: readonly T[]) => T;
}

export function crearRng(semilla: number): Rng {
  let estado = semilla >>> 0;

  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    siguiente,
    entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
    ocurre: (p) => siguiente() < p,
    elige: (items) => items[Math.floor(siguiente() * items.length)],
  };
}

/**
 * Combina la semilla del proyecto con un identificador (fila, sección, paso)
 * para que cada elemento tenga su propio azar reproducible.
 */
export function mezclarSemilla(semilla: number, ...claves: (string | number)[]): number {
  let h = semilla >>> 0;
  for (const clave of claves) {
    const texto = String(clave);
    for (let i = 0; i < texto.length; i++) {
      h = (Math.imul(h ^ texto.charCodeAt(i), 0x01000193) + 0x9e3779b9) >>> 0;
    }
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return h >>> 0;
}

/** Semilla legible de 4 dígitos, cómoda para que el estudiante la anote y la repita. */
export function semillaAleatoria(): number {
  return 1000 + Math.floor(Math.random() * 9000);
}
