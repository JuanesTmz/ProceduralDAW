/**
 * Los datos que gobiernan el visual.
 *
 * Un algoritmo generativo necesita de dónde sacar sus decisiones. Aquí se
 * ofrecen tres fuentes y todas acaban en la misma forma —una lista de
 * PICOS—, para que los cuatro algoritmos las entiendan sin saber de dónde
 * vinieron:
 *
 *  - **Tu canción.** La fuente propia de SONORA, y la más honesta: cada
 *    pista del patrón es un pico, su fuerza son los golpes que tiene y su
 *    sitio sale de la semilla. Cambiar el beat cambia el cuadro, con la
 *    misma semilla que cambia la música. El visual deja de acompañar a la
 *    pieza y pasa a estar hecho de ella.
 *  - **Un archivo.** Una tabla CSV: las dos primeras columnas numéricas
 *    colocan cada fila y la tercera le da fuerza. Es el caso de libro de
 *    «datos que se vuelven imagen».
 *  - **Nada.** Solo ruido: arte procedural puro, sin datos de entrada.
 *
 * Un pico no dibuja nada por sí mismo. Deforma el campo a su alrededor, y
 * cada algoritmo decide qué significa esa deformación: una montaña en las
 * ondas, un remolino en la nebulosa, un racimo de glifos encendidos.
 */
import { crearRng, mezclarSemilla } from '../generativo/rng';
import type { Proyecto } from '../estado/tipos';

export type FuenteDatos = 'ninguna' | 'cancion' | 'archivo';

export interface Pico {
  /** Dónde cae, en 0..1 de pantalla. */
  x: number;
  y: number;
  /** Cuánto deforma, 0..1. */
  fuerza: number;
  /** Hasta dónde llega, como fracción del lado mayor. */
  radio: number;
  /** Sentido del giro, para los algoritmos que arremolinan. */
  giro: 1 | -1;
  /** Para poder decir en la pantalla de dónde salió este pico. */
  nombre: string;
}

export interface Datos {
  picos: Pico[];
  /** Qué tan movida es la fuente: de 0 (plana) a 1 (muy dispersa). */
  movimiento: number;
  /** Una línea para la pantalla: qué se está usando. */
  resumen: string;
}

export const SIN_DATOS: Datos = { picos: [], movimiento: 0, resumen: 'Solo ruido, sin datos' };

/** Tope de picos. Más de veinte y el campo se vuelve una sopa sin forma. */
const MAXIMO_PICOS = 20;

/**
 * La canción como fuente. El reparto en pantalla no es aleatorio de verdad:
 * sale de la semilla del proyecto, así que la misma pieza da siempre el
 * mismo cuadro, y «Variar» lo cambia todo a la vez —música y visual—, que
 * es la promesa del motor.
 */
export function datosDeLaCancion(proyecto: Proyecto): Datos {
  const { patron } = proyecto;
  const rng = crearRng(mezclarSemilla(proyecto.semilla, 'visual'));
  const pasos = patron.cantidadPasos;

  const picos: Pico[] = [];
  const fuentes: { nombre: string; valor: number; peso: number }[] = patron.filas.map((fila) => ({
    nombre: fila.nombre,
    valor: fila.pasos.filter(Boolean).length / Math.max(1, pasos),
    peso: fila.volumen,
  }));

  if (patron.melodia.notas.length > 0) {
    fuentes.push({
      nombre: 'Matriz',
      valor: Math.min(1, patron.melodia.notas.length / Math.max(1, pasos)),
      peso: patron.melodia.volumen,
    });
  }

  for (const fuente of fuentes.slice(0, MAXIMO_PICOS)) {
    if (fuente.valor <= 0) continue;
    picos.push({
      // Repartidos por toda la pantalla, pero sin pegarse a los bordes.
      x: 0.12 + rng.siguiente() * 0.76,
      y: 0.12 + rng.siguiente() * 0.76,
      fuerza: Math.min(1, fuente.valor * 1.6),
      radio: 0.14 + fuente.peso * 0.26,
      giro: rng.ocurre(0.5) ? 1 : -1,
      nombre: fuente.nombre,
    });
  }

  // Lo movida que es la pieza: cuánto se diferencian las partes entre sí.
  const energias = proyecto.secciones.map((s) => s.intensidad);
  const media = energias.reduce((a, b) => a + b, 0) / Math.max(1, energias.length);
  const dispersion =
    energias.reduce((a, b) => a + Math.abs(b - media), 0) / Math.max(1, energias.length);

  return {
    picos,
    movimiento: Math.min(1, dispersion * 2.6),
    resumen:
      picos.length > 0
        ? `${picos.length} ${picos.length === 1 ? 'pista' : 'pistas'} de tu canción`
        : 'Tu canción todavía no tiene golpes',
  };
}

/**
 * Un CSV como fuente. Se buscan las columnas que traen números y se usan las
 * tres primeras: dos para colocar y una para la fuerza. Sin columnas
 * numéricas no hay nada que colocar, y se dice.
 */
export function datosDeCsv(texto: string, nombreArchivo: string): Datos {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lineas.length < 2) return { ...SIN_DATOS, resumen: 'El archivo está vacío' };

  const separador = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const cabecera = lineas[0].split(separador).map((c) => c.trim().replace(/^"|"$/g, ''));
  const filas = lineas.slice(1).map((l) => l.split(separador).map((c) => c.trim().replace(/^"|"$/g, '')));

  const esNumero = (v: string) => v !== '' && Number.isFinite(Number(v.replace(',', '.')));
  const numericas: number[] = [];
  for (let c = 0; c < cabecera.length; c++) {
    const valores = filas.slice(0, 40).map((f) => f[c] ?? '');
    if (valores.filter(esNumero).length >= Math.max(2, valores.length * 0.6)) numericas.push(c);
  }
  if (numericas.length === 0) {
    return { ...SIN_DATOS, resumen: `«${nombreArchivo}» no trae columnas de números` };
  }

  const leer = (fila: string[], col: number | undefined) =>
    col === undefined ? NaN : Number((fila[col] ?? '').replace(',', '.'));

  const [colX, colY, colF] = numericas;
  const crudos = filas
    .map((f) => ({ x: leer(f, colX), y: leer(f, colY ?? colX), f: leer(f, colF ?? colX) }))
    .filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y));
  if (crudos.length === 0) return { ...SIN_DATOS, resumen: `«${nombreArchivo}» no tiene filas usables` };

  /** A 0..1. Si la columna es constante, se queda en el centro. */
  const normalizar = (vals: number[]) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rango = max - min;
    return vals.map((v) => (rango > 1e-9 ? (v - min) / rango : 0.5));
  };

  const xs = normalizar(crudos.map((v) => v.x));
  const ys = normalizar(crudos.map((v) => v.y));
  const fs = crudos.every((v) => Number.isFinite(v.f))
    ? normalizar(crudos.map((v) => v.f))
    : crudos.map(() => 0.6);

  // Si hay más filas que picos, se toman repartidas por toda la tabla y no
  // las primeras: así el cuadro habla de los datos enteros.
  const salto = Math.max(1, Math.floor(crudos.length / MAXIMO_PICOS));
  const picos: Pico[] = [];
  for (let i = 0; i < crudos.length && picos.length < MAXIMO_PICOS; i += salto) {
    picos.push({
      x: 0.08 + xs[i] * 0.84,
      y: 0.08 + ys[i] * 0.84,
      fuerza: 0.25 + fs[i] * 0.75,
      radio: 0.12 + fs[i] * 0.2,
      giro: i % 2 === 0 ? 1 : -1,
      nombre: `fila ${i + 1}`,
    });
  }

  const media = fs.reduce((a, b) => a + b, 0) / fs.length;
  const dispersion = fs.reduce((a, b) => a + Math.abs(b - media), 0) / fs.length;

  return {
    picos,
    movimiento: Math.min(1, dispersion * 3),
    resumen: `${crudos.length} filas de «${nombreArchivo}» · ${numericas.length} columnas de números`,
  };
}
