/**
 * El motor generativo: las reglas que hacen la música.
 *
 * Tres ideas, y ninguna es azar puro:
 *  - La SEMILLA fija el azar. Misma semilla + misma configuración = mismo resultado.
 *  - Cada fila sigue una REGLA (manual, euclidiana o probabilística).
 *  - La PROBABILIDAD POR PASO decide, en cada vuelta del loop, si un golpe suena.
 *
 * Por eso "Variar" no rompe la pieza: lo que el estudiante puso a mano y lo
 * euclidiano quedan como esqueleto, y solo respira lo que es probabilístico.
 */
import { crearRng, mezclarSemilla } from './rng';
import { euclidiano } from './euclidiano';
import { FILAS_MATRIZ } from '../estado/tipos';
import type { Fila, Melodia, Patron, Proyecto, ReglaFila } from '../estado/tipos';

/**
 * Los pasos que le tocan a una fila según su regla.
 * Devuelve null cuando la fila es manual: ahí manda el estudiante.
 */
export function generarPasos(
  regla: ReglaFila,
  cantidadPasos: number,
  semilla: number,
  clave: string,
): boolean[] | null {
  switch (regla.modo) {
    case 'euclidiano':
      return euclidiano(regla.pulsos, cantidadPasos, regla.rotacion);

    case 'probabilistico': {
      const rng = crearRng(mezclarSemilla(semilla, clave, 'pasos'));
      return Array.from({ length: cantidadPasos }, () => rng.ocurre(regla.densidad));
    }

    case 'manual':
    default:
      return null;
  }
}

/**
 * Notas de la matriz generadas por regla.
 * Como las filas ya son grados de la escala, cualquier nota que salga
 * está afinada: el azar no puede producir una nota fea.
 */
export function generarMelodia(
  melodia: Melodia,
  cantidadPasos: number,
  semilla: number,
): Melodia['notas'] | null {
  const pasos = generarPasos(melodia.regla, cantidadPasos, semilla, 'melodia');
  if (!pasos) return null;

  const rng = crearRng(mezclarSemilla(semilla, 'melodia', 'notas'));
  const notas: Melodia['notas'] = [];
  let anterior = Math.floor(FILAS_MATRIZ / 3);

  for (let paso = 0; paso < cantidadPasos; paso++) {
    if (!pasos[paso]) continue;
    // Paseo por grados vecinos: la línea se mueve por pasos, no a saltos.
    const salto = rng.entero(-3, 3);
    anterior = Math.max(0, Math.min(FILAS_MATRIZ - 1, anterior + salto));
    notas.push({ grado: anterior, paso });
  }
  return notas;
}

/**
 * "Variar": vuelve a sembrar. Regenera lo que depende de una regla y deja
 * intacto lo manual y lo protegido con candado.
 */
export function volverASembrar(proyecto: Proyecto, semilla: number): void {
  proyecto.semilla = semilla;
  const { patron } = proyecto;

  for (const fila of patron.filas) {
    if (fila.protegida) continue;
    const pasos = generarPasos(fila.regla, patron.cantidadPasos, semilla, fila.id);
    if (pasos) fila.pasos = pasos;
  }

  if (!patron.melodia.protegida) {
    const notas = generarMelodia(patron.melodia, patron.cantidadPasos, semilla);
    if (notas) patron.melodia.notas = notas;
  }

  // Cada sección conserva su desfase respecto a la semilla global.
  proyecto.secciones.forEach((seccion, i) => {
    seccion.semilla = mezclarSemilla(semilla, 'seccion', seccion.id, i) % 10000;
  });
}

/**
 * "Mutar": cambia unos pocos pasos manteniendo el carácter.
 * No regenera nada desde cero; toca el patrón que ya existe.
 */
export function mutar(proyecto: Proyecto, semilla: number): void {
  const { patron } = proyecto;
  const rng = crearRng(mezclarSemilla(semilla, 'mutacion', Date.now()));

  for (const fila of patron.filas) {
    if (fila.protegida) continue;
    const cuantos = Math.max(1, Math.round(patron.cantidadPasos * fila.regla.mutabilidad));
    for (let i = 0; i < cuantos; i++) {
      const paso = rng.entero(0, patron.cantidadPasos - 1);
      // Se apaga un golpe o se enciende un silencio: el patrón se mueve, no explota.
      fila.pasos[paso] = !fila.pasos[paso];
    }
  }

  if (!patron.melodia.protegida && patron.melodia.notas.length > 0) {
    const cuantas = Math.max(1, Math.round(patron.melodia.notas.length * 0.3));
    for (let i = 0; i < cuantas; i++) {
      const indice = rng.entero(0, patron.melodia.notas.length - 1);
      const nota = patron.melodia.notas[indice];
      // Se mueve a un grado vecino: cambia la melodía sin salirse de la escala.
      nota.grado = Math.max(0, Math.min(FILAS_MATRIZ - 1, nota.grado + rng.entero(-2, 2)));
    }
  }
}

/**
 * ¿Suena este paso en esta vuelta del loop?
 * La decisión depende de la semilla, así que la pieza es reproducible:
 * con la misma semilla, la misma vuelta suena igual siempre.
 */
export function debeSonar(
  semilla: number,
  idFila: string,
  paso: number,
  vuelta: number,
  probabilidad: number,
): boolean {
  if (probabilidad >= 1) return true;
  if (probabilidad <= 0) return false;
  const rng = crearRng(mezclarSemilla(semilla, idFila, paso, vuelta));
  return rng.ocurre(probabilidad);
}

/** Cuántos golpes tiene efectivamente una fila (para el mapa de reglas). */
export function golpesDeFila(fila: Fila): number {
  return fila.pasos.reduce((total, activo) => total + (activo ? 1 : 0), 0);
}

/** Probabilidad promedio de los pasos encendidos de una fila. */
export function probabilidadMedia(fila: Fila): number {
  const encendidos = fila.pasos
    .map((activo, i) => (activo ? fila.probabilidad[i] ?? 1 : null))
    .filter((v): v is number => v !== null);
  if (encendidos.length === 0) return 1;
  return encendidos.reduce((a, b) => a + b, 0) / encendidos.length;
}

/** ¿La pieza tiene al menos un elemento que varía con la semilla? */
export function tieneElementoGenerativo(patron: Patron): boolean {
  const filaGenerativa = patron.filas.some(
    (f) => f.regla.modo !== 'manual' || probabilidadMedia(f) < 1,
  );
  const melodiaGenerativa = patron.melodia.regla.modo !== 'manual';
  return filaGenerativa || melodiaGenerativa;
}
