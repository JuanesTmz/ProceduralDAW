/**
 * Ritmos euclidianos: repartir n pulsos lo más parejo posible en k pasos.
 * Es la regla que está detrás de muchísimos ritmos del mundo —el tresillo
 * E(3,8) o el cinquillo E(5,8)— y por eso "suena bien" casi siempre.
 *
 * Algoritmo de Bjorklund, implementado aquí desde cero.
 */

/** Reparte `pulsos` golpes en `pasos` posiciones. */
export function euclidiano(pulsos: number, pasos: number, rotacion = 0): boolean[] {
  if (pasos <= 0) return [];
  const n = Math.max(0, Math.min(pulsos, pasos));
  if (n === 0) return new Array(pasos).fill(false);
  if (n === pasos) return new Array(pasos).fill(true);

  // Se empieza con `n` grupos "golpe" y `pasos - n` grupos "silencio",
  // y se van fundiendo hasta que la repartición queda pareja.
  let golpes: boolean[][] = Array.from({ length: n }, () => [true]);
  let silencios: boolean[][] = Array.from({ length: pasos - n }, () => [false]);

  while (silencios.length > 1) {
    const cantidad = Math.min(golpes.length, silencios.length);
    const fundidos: boolean[][] = [];
    for (let i = 0; i < cantidad; i++) {
      fundidos.push([...golpes[i], ...silencios[i]]);
    }
    const sobrantes =
      golpes.length > cantidad ? golpes.slice(cantidad) : silencios.slice(cantidad);
    golpes = fundidos;
    silencios = sobrantes;
  }

  const patron = [...golpes, ...silencios].flat();
  return rotar(patron, rotacion);
}

/** Corre el patrón hacia la derecha; sirve para mover el acento. */
export function rotar(patron: boolean[], rotacion: number): boolean[] {
  const largo = patron.length;
  if (largo === 0 || rotacion % largo === 0) return [...patron];
  const desplazamiento = ((rotacion % largo) + largo) % largo;
  return patron.map((_, i) => patron[(i - desplazamiento + largo * 2) % largo]);
}

/** Cuántos golpes tiene un patrón: se usa en el mapa de reglas. */
export function contarGolpes(patron: boolean[]): number {
  return patron.reduce((total, activo) => total + (activo ? 1 : 0), 0);
}
