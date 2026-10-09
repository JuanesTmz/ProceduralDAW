/**
 * El motor generativo: las reglas que hacen la música.
 *
 * Tres ideas, y ninguna es azar puro:
 *  - La SEMILLA fija el azar. Misma semilla + misma configuración = mismo resultado.
 *  - Cada pista tiene una REGLA, que es un punto dentro de un cuadro: a la
 *    derecha más golpes, arriba más azar.
 *  - La PROBABILIDAD POR PASO decide, en cada vuelta del loop, si un golpe suena.
 *
 * Por eso "Variar" no rompe la pieza: el esqueleto de golpes se reparte parejo
 * y sigue ahí; lo que respira es cuáles de esos golpes suenan en cada vuelta.
 */
import { crearRng, mezclarSemilla } from './rng';
import { euclidiano } from './euclidiano';
import { FILAS_MATRIZ } from '../estado/tipos';
import type { Fila, Melodia, Patron, Proyecto, ReglaFila, Seccion } from '../estado/tipos';

/** Por encima de este azar empiezan a aparecer golpes de relleno. */
const UMBRAL_RELLENO = 0.55;

export interface PasosGenerados {
  pasos: boolean[];
  /** Probabilidad de cada paso, en el mismo orden. */
  probabilidad: number[];
}

/**
 * Los pasos que le tocan a una pista según su regla.
 * Devuelve null cuando la regla está apagada: ahí manda el estudiante.
 *
 * El eje X reparte los golpes lo más parejo posible —es el algoritmo
 * euclidiano, el que está detrás del tresillo o del cinquillo, y por eso casi
 * cualquier posición suena bien—. El eje Y hace dos cosas a la vez: baja la
 * probabilidad de los golpes del esqueleto, y pasado cierto punto agrega
 * golpes de relleno entre medio. Así el mismo gesto va de "firme y escueto"
 * a "lleno y suelto" sin que el estudiante tenga que elegir entre modos.
 */
export function generarPasos(
  regla: ReglaFila,
  cantidadPasos: number,
  _semilla: number,
  _clave: string,
): PasosGenerados | null {
  if (!regla.activa) return null;

  const pulsos = Math.round(regla.golpes * cantidadPasos);
  const base = euclidiano(pulsos, cantidadPasos, regla.rotacion);

  const relleno =
    regla.azar > UMBRAL_RELLENO
      ? euclidiano(
          Math.round(((regla.azar - UMBRAL_RELLENO) / (1 - UMBRAL_RELLENO)) * (cantidadPasos / 2)),
          cantidadPasos,
          regla.rotacion + 1,
        )
      : null;

  const probBase = 1 - regla.azar * 0.45;
  const pasos: boolean[] = [];
  const probabilidad: number[] = [];

  for (let i = 0; i < cantidadPasos; i++) {
    const esqueleto = base[i];
    const extra = !esqueleto && Boolean(relleno?.[i]);
    pasos.push(esqueleto || extra);
    // El relleno suena menos que el esqueleto: adorna, no compite.
    probabilidad.push(esqueleto ? probBase : extra ? probBase * 0.6 : 1);
  }

  return { pasos, probabilidad };
}

/** Cuántos golpes deja el eje X, para enseñárselo al estudiante. */
export function golpesDeRegla(regla: ReglaFila, cantidadPasos: number): number {
  return Math.round(regla.golpes * cantidadPasos);
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
  const generado = generarPasos(melodia.regla, cantidadPasos, semilla, 'melodia');
  if (!generado) return null;

  const rng = crearRng(mezclarSemilla(semilla, 'melodia', 'notas'));
  const notas: Melodia['notas'] = [];
  let anterior = Math.floor(FILAS_MATRIZ / 3);

  for (let paso = 0; paso < cantidadPasos; paso++) {
    if (!generado.pasos[paso]) continue;
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
    const generado = generarPasos(fila.regla, patron.cantidadPasos, semilla, fila.id);
    if (!generado) continue;
    fila.pasos = generado.pasos;
    fila.probabilidad = generado.probabilidad;
  }

  const notas = generarMelodia(patron.melodia, patron.cantidadPasos, semilla);
  if (notas) patron.melodia.notas = notas;

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
  // La generación entra en el azar en vez de la hora del reloj: así mutar
  // tres veces desde la misma semilla da siempre el mismo resultado, y una
  // pieza guardada se puede reconstruir tal cual.
  proyecto.generacionMutacion = (proyecto.generacionMutacion ?? 0) + 1;
  const rng = crearRng(mezclarSemilla(semilla, 'mutacion', proyecto.generacionMutacion));

  for (const fila of patron.filas) {
    if (!fila.regla.activa) continue;
    const cuantos = Math.max(1, Math.round(patron.cantidadPasos * fila.regla.mutabilidad));
    for (let i = 0; i < cuantos; i++) {
      const paso = rng.entero(0, patron.cantidadPasos - 1);
      // Se apaga un golpe o se enciende un silencio: el patrón se mueve, no explota.
      fila.pasos[paso] = !fila.pasos[paso];
    }
  }

  if (patron.melodia.regla.activa && patron.melodia.notas.length > 0) {
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
  // No basta con que la máquina arme la pista: si el azar está en cero, el
  // resultado es siempre el mismo y la semilla no cambia nada.
  const filaGenerativa = patron.filas.some(
    (f) => (f.regla.activa && f.regla.azar > 0.02) || probabilidadMedia(f) < 1,
  );
  const melodiaGenerativa = patron.melodia.regla.activa && patron.melodia.regla.azar > 0.02;
  return filaGenerativa || melodiaGenerativa;
}

// ------------------------------------------------- Intensidad y niveles

/**
 * Cuánto pesa la intensidad de la sección sobre la probabilidad de cada golpe.
 * En 1 suena todo; en 0 queda el 40%, que adelgaza la textura sin vaciarla.
 *
 * Vive aquí y no en el motor de audio porque la pantalla de la canción dibuja
 * los golpes que van a sonar: si cada uno hiciera su propia cuenta, lo dibujado
 * y lo que se oye se separarían.
 */
export function densidadDeIntensidad(intensidad: number): number {
  return 0.4 + 0.6 * intensidad;
}

/** La intensidad también mueve el volumen, pero menos: la mezcla no se hunde. */
export function volumenDeIntensidad(intensidad: number): number {
  return 0.45 + 0.55 * intensidad;
}

/**
 * Los cuatro escalones de energía de un bloque (pista dentro de una parte):
 * apagado, suave, medio y fuerte. Un toque en la línea de tiempo pasa al
 * siguiente, y de fuerte vuelve a apagado.
 */
export const NIVELES = [0, 1, 2, 3] as const;
export const NOMBRE_NIVEL = ['apagado', 'suave', 'medio', 'fuerte'] as const;

/** Cuánto recorta la probabilidad cada escalón. */
export const PROBABILIDAD_NIVEL = [0, 0.6, 0.85, 1] as const;

/** Con cuánta fuerza se golpea en cada escalón. */
export const VELOCIDAD_NIVEL = [0, 0.62, 0.88, 1] as const;

/**
 * El escalón de una pista dentro de una parte.
 * capasActivas sigue mandando sobre el encendido/apagado —lo usan el mapa de
 * reglas, los requisitos y la pantalla de estructura—, y niveles solo afina
 * cuánta energía tiene lo que está encendido.
 */
export function nivelDeCapa(seccion: Seccion, idFila: string): number {
  if (!seccion.capasActivas.includes(idFila)) return 0;
  const guardado = seccion.niveles?.[idFila];
  return guardado === undefined ? 2 : Math.max(1, Math.min(3, guardado));
}

/** Pasa al escalón siguiente, y de fuerte vuelve a apagado. */
export function siguienteNivel(nivel: number): number {
  return (nivel + 1) % 4;
}

/** Escribe el escalón de una pista en una parte, manteniendo capasActivas al día. */
export function fijarNivelCapa(seccion: Seccion, idFila: string, nivel: number): void {
  if (!seccion.niveles) seccion.niveles = {};
  if (nivel <= 0) {
    seccion.capasActivas = seccion.capasActivas.filter((id) => id !== idFila);
    delete seccion.niveles[idFila];
    return;
  }
  if (!seccion.capasActivas.includes(idFila)) seccion.capasActivas.push(idFila);
  seccion.niveles[idFila] = nivel;
}

// ------------------------------------------------- Groove: acentos y remates

/**
 * Con cuánta fuerza se pega en cada paso del compás.
 *
 * Todas las voces del kit aceptan una velocidad y hasta ahora recibían
 * siempre 1, que es exactamente lo que hace que un patrón suene a máquina:
 * en la música de verdad el tiempo fuerte pega más que la semicorchea de
 * relleno. Esto no cambia QUÉ suena, solo cuánto.
 */
export function acentoDePaso(paso: number, pasosPorVuelta: number): number {
  const porNegra = Math.max(1, Math.round(pasosPorVuelta / 4));
  if (paso % pasosPorVuelta === 0) return 1;
  if (paso % porNegra === 0) return 0.9;
  if (paso % Math.max(1, porNegra / 2) === 0) return 0.8;
  return 0.7;
}

/**
 * Un empujoncito de fuerza distinto en cada golpe, pero fijo para una semilla
 * dada. Sin esto todos los golpes del mismo tipo pesan idéntico y el oído lo
 * nota; con esto respira sin dejar de ser reproducible.
 */
export function humanizar(semilla: number, idFila: string, paso: number, vuelta: number): number {
  const rng = crearRng(mezclarSemilla(semilla, idFila, paso, vuelta, 'humano'));
  return 0.94 + rng.siguiente() * 0.12;
}

/** Cuántos pasos dura el remate del final de una parte. */
export function pasosDeRemate(pasosPorVuelta: number): number {
  return Math.max(2, Math.round(pasosPorVuelta / 4));
}

/**
 * ¿Este paso cae en el REMATE?
 *
 * El remate son los últimos pasos de la última vuelta de una parte, cuando
 * todavía queda parte siguiente. Es el truco más barato y más audible de la
 * música popular: antes de que cambie algo, se anuncia. Sin esto las partes
 * se suceden sin que el oído se entere de que pasó una frontera.
 */
export function enRemate(paso: number, pasosPorVuelta: number, esUltimaVuelta: boolean): boolean {
  return esUltimaVuelta && paso >= pasosPorVuelta - pasosDeRemate(pasosPorVuelta);
}

/**
 * Qué pista hace el redoble del remate: la que más golpes tiene, que casi
 * siempre es el hi-hat o la que lleva el pulso rápido. Se elige por el
 * patrón y no al azar, para que el remate caiga siempre en el mismo sitio.
 *
 * Importante: hay que pasarle solo las pistas que suenan en ESA parte. Si no,
 * en una intro de dos capas el redoble le tocaría a una pista apagada y la
 * transición se quedaría muda justo donde más falta hace.
 */
export function filaDeRemate(filas: Fila[]): string | null {
  let mejor: Fila | null = null;
  let masGolpes = 0;
  for (const fila of filas) {
    const golpes = golpesDeFila(fila);
    if (golpes > masGolpes) {
      masGolpes = golpes;
      mejor = fila;
    }
  }
  return masGolpes > 0 ? (mejor?.id ?? null) : null;
}

/**
 * Lo que el remate le hace a un golpe: suena seguro y más fuerte, y la fila
 * del redoble además rellena los pasos que tenía vacíos.
 */
export interface AjusteRemate {
  /** Multiplica la probabilidad; 1 o más quiere decir "suena seguro". */
  probabilidad: number;
  /** Multiplica la fuerza del golpe. */
  velocidad: number;
}

export function ajusteDeRemate(paso: number, pasosPorVuelta: number): AjusteRemate {
  const largo = pasosDeRemate(pasosPorVuelta);
  const primero = pasosPorVuelta - largo;
  // Va creciendo hacia el final: el último golpe es el más fuerte.
  const avance = (paso - primero) / Math.max(1, largo - 1);
  return { probabilidad: 2, velocidad: 0.8 + 0.35 * avance };
}
