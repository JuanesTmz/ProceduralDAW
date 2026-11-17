// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los golpes de la imagen, en celdas (como los golpes de la música), y los
 * parámetros de la obra que sirven con cualquier estilo.
 *
 * Golpes: cada efecto (destello, zoom, giro…) tiene una fila de casillas,
 * una por paso de la vuelta. Si la casilla está encendida, la imagen da
 * ese golpe en ese momento, al ritmo de la música. Valen para toda la pieza
 * y cada escena puede tener los suyos (como las celdas de la música).
 *
 * Obra: brillo, zoom, giro, tono y saturación de la
 * imagen entera. Se asignan con cajitas igual que los mandos del estilo
 * (destino 'obra:<id>') o se ajustan a mano.
 */
import type { Escena, GolpeVisual, Proyecto } from './tipos';
import { ORDEN_GOLPES } from './imagen';
import { buscarEscena } from './escenas';

export type PasosEfectos = Partial<Record<GolpeVisual, boolean[]>>;

/** Los golpes que suenan en una escena: los suyos, o los de toda la pieza. */
export function pasosEfectosDe(p: Proyecto, escena: Escena | null | undefined): PasosEfectos {
  return escena?.efectosPasos ?? p.visual.efectosPasos ?? {};
}

function copiar(pasos: PasosEfectos): PasosEfectos {
  return Object.fromEntries(Object.entries(pasos).map(([k, v]) => [k, [...(v ?? [])]]));
}

/** Enciende o apaga una casilla. Dentro de una escena, la primera vez se copian los de toda la pieza. */
export function ponerPasoEfecto(p: Proyecto, escenaId: string | null, efecto: GolpeVisual, paso: number, encender: boolean): void {
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  const lista = e ? (e.efectosPasos ??= copiar(p.visual.efectosPasos ?? {})) : (p.visual.efectosPasos ??= {});
  const n = p.patron.cantidadPasos;
  const fila = (lista[efecto] ??= new Array(n).fill(false));
  while (fila.length < n) fila.push(false);
  fila[paso] = encender;
}

/** «Al azar»: unos cuantos golpes repartidos con sentido (en los tiempos, alguno a contratiempo). */
export function efectosAlAzar(p: Proyecto, escenaId: string | null): void {
  const n = p.patron.cantidadPasos;
  const elegidos = [...ORDEN_GOLPES].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
  const nuevos: PasosEfectos = {};
  elegidos.forEach((g, k) => {
    const fila = new Array(n).fill(false);
    // El primero marca el pulso; los demás caen más espaciados.
    const cada = k === 0 ? 4 : [8, 16, 6, 12][Math.floor(Math.random() * 4)];
    const corrimiento = k === 0 ? 0 : Math.floor(Math.random() * 4) * 2;
    for (let i = corrimiento; i < n; i += cada) fila[i] = true;
    nuevos[g] = fila;
  });
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  if (e) e.efectosPasos = nuevos;
  else p.visual.efectosPasos = nuevos;
}

/**
 * Proyectos de antes: los golpes por sonido («cuando suena el bombo, zoom»)
 * pasan a celdas: el zoom queda encendido donde el bombo tenía golpes.
 */
export function migrarReacciones(p: Proyecto): void {
  const n = p.patron.cantidadPasos;
  for (const e of [...p.escenas, ...p.respiros]) {
    if (!e.reacciones?.length || e.efectosPasos) continue;
    const pasos: PasosEfectos = {};
    for (const r of e.reacciones) {
      const fuente =
        r.fuente === 'melodia'
          ? Array.from({ length: n }, (_, i) => p.patron.melodia.notas.some((x) => x.paso === i))
          : r.fuente === 'todo'
            ? Array.from({ length: n }, (_, i) => p.patron.filas.some((f) => f.pasos[i]))
            : (e.golpes?.[r.fuente]?.pasos ?? p.patron.filas.find((f) => f.id === r.fuente)?.pasos);
      if (!fuente) continue;
      const fila = (pasos[r.efecto] ??= new Array(n).fill(false));
      fuente.forEach((on, i) => {
        if (on && i < n) fila[i] = true;
      });
    }
    e.efectosPasos = pasos;
    e.reacciones = undefined;
  }
}

// ------------------------------------------------------------ la obra

export interface ParametroObra {
  id: string;
  etiqueta: string;
  /** Dónde queda el deslizador a mano si nadie lo tocó (0..1). */
  neutro: number;
}

export const PARAMETROS_OBRA: ParametroObra[] = [
  { id: 'brillo', etiqueta: 'Brillo', neutro: 0.5 },
  { id: 'zoom', etiqueta: 'Zoom', neutro: 0 },
  { id: 'giro', etiqueta: 'Giro', neutro: 0.5 },
  { id: 'tono', etiqueta: 'Tono del color', neutro: 0 },
  { id: 'saturacion', etiqueta: 'Saturación', neutro: 0.5 },
];

/** Cómo se ve la obra entera con esos valores (0..1 cada uno). */
export function estiloDeObra(v: Record<string, number>): { transform: string; filter: string } {
  const val = (id: string) => v[id] ?? PARAMETROS_OBRA.find((x) => x.id === id)!.neutro;
  const escala = 1 + 0.4 * val('zoom');
  const giro = (val('giro') - 0.5) * 30;
  const filtros = [
    `brightness(${(0.35 + 1.3 * val('brillo')).toFixed(2)})`,
    `saturate(${(2 * val('saturacion')).toFixed(2)})`,
    `hue-rotate(${Math.round(360 * val('tono'))}deg)`,
  ];
  return { transform: `scale(${escala.toFixed(3)}) rotate(${giro.toFixed(1)}deg)`, filter: filtros.join(' ') };
}
