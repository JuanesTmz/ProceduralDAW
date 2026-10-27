/**
 * Los golpes y las notas de cada escena.
 *
 * Lo que suena es siempre lo que está en las celdas. Cada escena puede tener
 * sus propias celdas por capa (si no, usa las de General). El Pad escribe en
 * ellas —reescribe lo que hubiera—, y las celdas se retocan a mano encima.
 * Una celda del Pad puede ser «a veces» (probabilidad menor que 1); las que
 * se encienden a mano suenan siempre.
 */
import { buscarEscena } from './escenas';
import { generarMelodia, generarPasos } from '../generativo/motorGenerativo';
import type { NotaMelodia, Proyecto } from './tipos';

export interface PasosFila {
  pasos: boolean[];
  probabilidad: number[];
}

/** Las celdas de una capa, tal como suenan en la escena (o en General si `escenaId` es null). */
export function golpesDe(p: Proyecto, escenaId: string | null, filaId: string): PasosFila {
  const propios = escenaId ? buscarEscena(p, escenaId)?.golpes?.[filaId] : undefined;
  if (propios) return propios;
  const f = p.patron.filas.find((x) => x.id === filaId);
  return f ? { pasos: f.pasos, probabilidad: f.probabilidad } : { pasos: [], probabilidad: [] };
}

/** Las notas de la melodía tal como suenan en la escena (o en General). */
export function notasDe(p: Proyecto, escenaId: string | null): NotaMelodia[] {
  const propias = escenaId ? buscarEscena(p, escenaId)?.notas : undefined;
  return propias ?? p.patron.melodia.notas;
}

/** ¿Esta escena tiene celdas propias para la capa (golpes o, si es la melodía, notas)? */
export function tienePropias(p: Proyecto, escenaId: string, id: string): boolean {
  const e = buscarEscena(p, escenaId);
  return id === 'melodia' ? Boolean(e?.notas) : Boolean(e?.golpes?.[id]);
}

/** Enciende o apaga una celda. Dentro de una escena, la capa pasa a tener celdas propias. */
export function ponerGolpe(p: Proyecto, escenaId: string | null, filaId: string, paso: number, encender: boolean): void {
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  if (!e) {
    const f = p.patron.filas.find((x) => x.id === filaId);
    if (!f) return;
    f.pasos[paso] = encender;
    if (encender) f.probabilidad[paso] = 1;
    return;
  }
  const base = golpesDe(p, escenaId, filaId);
  e.golpes ??= {};
  const propios = (e.golpes[filaId] ??= { pasos: [...base.pasos], probabilidad: [...base.probabilidad] });
  propios.pasos[paso] = encender;
  if (encender) propios.probabilidad[paso] = 1;
}

/** Enciende o apaga una nota de la matriz. */
export function ponerNota(p: Proyecto, escenaId: string | null, grado: number, paso: number, encender: boolean): void {
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  let notas: NotaMelodia[];
  if (e) {
    e.notas ??= p.patron.melodia.notas.map((n) => ({ ...n }));
    notas = e.notas;
  } else {
    notas = p.patron.melodia.notas;
  }
  const existe = notas.some((n) => n.grado === grado && n.paso === paso);
  if (encender && !existe) notas.push({ grado, paso });
  else if (!encender && existe) {
    const quedan = notas.filter((n) => !(n.grado === grado && n.paso === paso));
    if (e) e.notas = quedan;
    else p.patron.melodia.notas = quedan;
  }
}

/** Borra todas las notas (de la escena, o de General). */
export function borrarNotas(p: Proyecto, escenaId: string | null): void {
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  if (e) e.notas = [];
  else p.patron.melodia.notas = [];
}

/**
 * El Pad escribe en las celdas de la capa: lo que había se reescribe.
 * En una escena queda como celdas propias; en General, como las de todos.
 */
export function aplicarPad(p: Proyecto, escenaId: string | null, id: string, golpes: number, azar: number): void {
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  const n = p.patron.cantidadPasos;
  if (!e) {
    if (id === 'melodia') {
      const m = p.patron.melodia;
      m.regla.golpes = golpes;
      m.regla.azar = azar;
      const notas = generarMelodia({ ...m, regla: { ...m.regla, activa: true } }, n, p.semilla);
      if (notas) m.notas = notas;
      return;
    }
    const f = p.patron.filas.find((x) => x.id === id);
    if (!f) return;
    f.regla.golpes = golpes;
    f.regla.azar = azar;
    const g = generarPasos({ ...f.regla, activa: true }, n, p.semilla, id);
    if (g) {
      f.pasos = g.pasos;
      f.probabilidad = g.probabilidad;
    }
    return;
  }
  e.reglas = { ...(e.reglas ?? {}), [id]: { golpes, azar } };
  const indice = Math.max(0, p.escenas.findIndex((x) => x.id === e.id));
  if (id === 'melodia') {
    const m = p.patron.melodia;
    const notas = generarMelodia({ ...m, regla: { ...m.regla, golpes, azar, activa: true } }, n, p.semilla + indice * 31);
    if (notas) e.notas = notas;
    return;
  }
  const f = p.patron.filas.find((x) => x.id === id);
  if (!f) return;
  const g = generarPasos({ ...f.regla, golpes, azar, activa: true }, n, p.semilla, id);
  if (g) {
    e.golpes ??= {};
    e.golpes[id] = { pasos: g.pasos, probabilidad: g.probabilidad };
  }
}

/** La capa de esta escena vuelve a las celdas (y al Pad) de General. */
export function volverAGeneral(p: Proyecto, escenaId: string, id: string): void {
  const e = buscarEscena(p, escenaId);
  if (!e) return;
  if (id === 'melodia') e.notas = undefined;
  else if (e.golpes) {
    delete e.golpes[id];
    if (Object.keys(e.golpes).length === 0) e.golpes = undefined;
  }
  if (e.reglas) {
    delete e.reglas[id];
    if (Object.keys(e.reglas).length === 0) e.reglas = undefined;
  }
}

/** Al cambiar cuántos pasos tiene el patrón, las celdas propias de las escenas se ajustan. */
export function redimensionarEscenas(p: Proyecto, cantidad: number): void {
  const ajustar = <T,>(a: T[], relleno: T): T[] => {
    if (a.length >= cantidad) return a.slice(0, cantidad);
    return Array.from({ length: cantidad }, (_, i) => (a.length > 0 ? a[i % a.length] : relleno));
  };
  for (const e of [...p.escenas, ...p.respiros]) {
    if (e.golpes) {
      for (const g of Object.values(e.golpes)) {
        g.pasos = ajustar(g.pasos, false);
        g.probabilidad = ajustar(g.probabilidad, 1);
      }
    }
    if (e.notas) e.notas = e.notas.filter((n) => n.paso < cantidad);
  }
}
