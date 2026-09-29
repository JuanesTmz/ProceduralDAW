/**
 * Escalas: el piso que hace que "nunca suene mal".
 * Todo lo que genera el motor se cuantiza a una escala, y el piano roll
 * marca en claro las notas que pertenecen a ella.
 */

export type NombreEscala = 'menor' | 'menorPentatonica' | 'mayor' | 'dorica' | 'frigia';

/** Semitonos de cada escala, relativos a la tónica. */
export const ESCALAS: Record<NombreEscala, number[]> = {
  menor: [0, 2, 3, 5, 7, 8, 10],
  menorPentatonica: [0, 3, 5, 7, 10],
  mayor: [0, 2, 4, 5, 7, 9, 11],
  dorica: [0, 2, 3, 5, 7, 9, 10],
  frigia: [0, 1, 3, 5, 7, 8, 10],
};

export const ETIQUETAS_ESCALA: Record<NombreEscala, string> = {
  menor: 'Menor (melancólica)',
  menorPentatonica: 'Pentatónica menor (urbana)',
  mayor: 'Mayor (luminosa)',
  dorica: 'Dórica (nostálgica)',
  frigia: 'Frigia (tensa)',
};

const NOMBRES_NOTA = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOMBRES_NOTA_ING = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** ¿El semitono (relativo a la nota base) pertenece a la escala? */
export function perteneceAEscala(semitono: number, escala: NombreEscala): boolean {
  const grados = ESCALAS[escala] ?? ESCALAS.menor;
  return grados.includes(((semitono % 12) + 12) % 12);
}

/** Lleva un semitono cualquiera al grado más cercano de la escala. */
export function cuantizarAEscala(semitono: number, escala: NombreEscala): number {
  const grados = ESCALAS[escala] ?? ESCALAS.menor;
  const octava = Math.floor(semitono / 12);
  const clase = ((semitono % 12) + 12) % 12;
  let mejor = grados[0];
  let distancia = 99;
  for (const grado of grados) {
    const d = Math.abs(grado - clase);
    if (d < distancia) {
      distancia = d;
      mejor = grado;
    }
  }
  return octava * 12 + mejor;
}

/** Los semitonos de la escala dentro de un rango, de grave a agudo. */
export function gradosEnRango(escala: NombreEscala, cantidadSemitonos: number): number[] {
  const salida: number[] = [];
  for (let i = 0; i < cantidadSemitonos; i++) {
    if (perteneceAEscala(i, escala)) salida.push(i);
  }
  return salida;
}

/**
 * Las `cantidad` primeras notas de la escala, de grave a agudo, encadenando
 * octavas. Es la columna de la matriz: la fila 0 es la nota más grave.
 *
 * Guardar la fila (el "grado") y no el semitono tiene una ventaja: al cambiar
 * de escala, la melodía se traslada entera a la escala nueva y sigue sonando bien.
 */
export function notasDeEscala(escala: NombreEscala, cantidad: number): number[] {
  const grados = ESCALAS[escala] ?? ESCALAS.menor;
  return Array.from({ length: cantidad }, (_, i) => {
    const octava = Math.floor(i / grados.length);
    return octava * 12 + grados[i % grados.length];
  });
}

/** Cuántas notas tiene la escala por octava (5 en la pentatónica, 7 en el resto). */
export function gradosPorOctava(escala: NombreEscala): number {
  return (ESCALAS[escala] ?? ESCALAS.menor).length;
}

/** El semitono que le toca a una fila de la matriz. */
export function semitonoDeGrado(grado: number, escala: NombreEscala): number {
  const grados = ESCALAS[escala] ?? ESCALAS.menor;
  const octava = Math.floor(grado / grados.length);
  return octava * 12 + grados[((grado % grados.length) + grados.length) % grados.length];
}

/** Nombre en español para mostrar en el piano roll, p. ej. "La#3". */
export function nombreNota(semitono: number, octavaBase: number): string {
  const clase = ((semitono % 12) + 12) % 12;
  const octava = octavaBase + Math.floor(semitono / 12);
  return `${NOMBRES_NOTA[clase]}${octava}`;
}

/** Nombre que entiende Tone.js, p. ej. "A#3". */
export function notaTone(semitono: number, octavaBase: number): string {
  const clase = ((semitono % 12) + 12) % 12;
  const octava = octavaBase + Math.floor(semitono / 12);
  return `${NOMBRES_NOTA_ING[clase]}${octava}`;
}

/** Las teclas negras del piano, para dibujar el teclado. */
export function esTeclaNegra(semitono: number): boolean {
  return [1, 3, 6, 8, 10].includes(((semitono % 12) + 12) % 12);
}
