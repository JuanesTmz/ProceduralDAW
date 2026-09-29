/**
 * Presets visuales: no son tres videos fijos, son tres FAMILIAS de reglas.
 *
 * La semilla decide los valores concretos —frecuencias, número de caras del
 * caleidoscopio, velocidades, paleta— igual que en el motor musical. Con la
 * misma semilla el visual es el mismo; al variarla, cambia sin dejar de ser
 * el mismo preset.
 *
 * Y sobre eso, las bandas del analizador mueven los parámetros en vivo:
 * graves → escala y peso, medios → movimiento, agudos → brillo y color,
 * el golpe → el latido.
 */
import type { Rng } from '../generativo/rng';
import type { Bandas } from './analizador';

export type NombrePreset = 'pulso' | 'caleidoscopio' | 'ciudad';

export const PRESETS: { id: NombrePreset; etiqueta: string; descripcion: string }[] = [
  {
    id: 'pulso',
    etiqueta: 'Pulso',
    descripcion: 'Ondas que respiran con el bombo. Sobrio, deja leer el texto.',
  },
  {
    id: 'caleidoscopio',
    etiqueta: 'Caleidoscopio',
    descripcion: 'Celdas que se parten en espejo y se tiñen con los agudos.',
  },
  {
    id: 'ciudad',
    etiqueta: 'Ciudad',
    descripcion: 'Retícula con rastro, como fachadas vistas desde el metro.',
  },
];

/** Lo que el preset puede consultar en cada cuadro. */
export interface ContextoVisual {
  bandas: () => Bandas;
  /** Intensidad de la sección que suena (0..1). */
  intensidad: () => number;
  /** Segundos desde que arrancó el visual. */
  tiempo: () => number;
  /** Cuánto pesa la imagen subida (0 = solo generado). */
  mezclaImagen: () => number;
  hayImagen: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sintesis = Record<string, any>;

/** Paleta procedural: un tono base sacado de la semilla y su complementario. */
function paleta(rng: Rng): { r: number; g: number; b: number } {
  const tonos = [
    { r: 1.4, g: 0.7, b: 0.25 }, // ámbar
    { r: 0.3, g: 1.3, b: 1.5 }, // cian
    { r: 1.4, g: 0.35, b: 0.5 }, // coral
    { r: 0.7, g: 0.5, b: 1.5 }, // lila
    { r: 0.35, g: 1.4, b: 0.85 }, // verde
  ];
  return rng.elige(tonos);
}

/**
 * Ondas concéntricas que laten con el bombo.
 * Es el preset sobrio: sirve de fondo sin comerse el texto.
 */
function construirPulso(s: Sintesis, rng: Rng, ctx: ContextoVisual) {
  const { osc, noise, src, s0 } = s;
  const b = ctx.bandas;
  const frecuencia = 6 + rng.entero(0, 16);
  const velocidad = 0.04 + rng.siguiente() * 0.12;
  const giro = (rng.siguiente() - 0.5) * 0.12;
  const color = paleta(rng);

  const base = ctx.hayImagen
    ? src(s0)
        // La imagen late: se escala con los graves.
        .scale(() => 1 + b().graves * 0.22 + b().golpe * 0.06)
        .modulate(
          noise(() => 1.5 + b().medios * 4, 0.08),
          () => (0.02 + b().amplitud * 0.12) * ctx.mezclaImagen(),
        )
    : osc(
        () => frecuencia + b().graves * 48,
        velocidad,
        () => 0.2 + b().agudos * 1.8,
      );

  return base
    .rotate(() => ctx.tiempo() * giro, () => 0.02 + b().medios * 0.14)
    .modulate(
      noise(() => 1.2 + b().golpe * 5, 0.1),
      () => 0.04 + b().graves * 0.3 * ctx.intensidad(),
    )
    .color(color.r, color.g, color.b)
    .brightness(() => -0.16 + b().agudos * 0.35)
    .contrast(() => 1.1 + b().amplitud * 0.9);
}

/** Celdas que se parten en espejo. El preset vistoso. */
function construirCaleidoscopio(s: Sintesis, rng: Rng, ctx: ContextoVisual) {
  const { voronoi, osc, src, s0 } = s;
  const b = ctx.bandas;
  const caras = rng.entero(3, 8);
  const celdas = 4 + rng.entero(0, 8);
  const deriva = 0.03 + rng.siguiente() * 0.1;
  const tinte = 0.002 + rng.siguiente() * 0.008;

  const base = ctx.hayImagen
    ? src(s0).modulateScale(
        voronoi(() => celdas + b().medios * 14, 0.3),
        () => (0.06 + b().graves * 0.5) * ctx.mezclaImagen(),
      )
    : voronoi(
        () => celdas + b().medios * 18,
        () => 0.1 + b().amplitud * 0.9,
        () => 0.1 + b().agudos * 0.5,
      );

  return base
    .kaleid(caras)
    .rotate(() => ctx.tiempo() * deriva, () => b().medios * 0.1)
    .colorama(() => tinte + b().agudos * 0.03 * ctx.intensidad())
    .scale(() => 0.9 + b().graves * 0.35 + b().golpe * 0.1)
    .modulateRotate(osc(3, 0.05), () => b().golpe * 0.4)
    .saturate(() => 0.8 + b().amplitud * 1.2)
    .contrast(() => 1 + b().graves * 0.6);
}

/** Retícula con rastro: la que mejor acompaña fotos de la ciudad. */
function construirCiudad(s: Sintesis, rng: Rng, ctx: ContextoVisual) {
  const { shape, osc, noise, src, s0, o0 } = s;
  const b = ctx.bandas;
  const lados = rng.entero(3, 6);
  const repeticiones = 2 + rng.entero(0, 4);
  const rastro = 0.55 + rng.siguiente() * 0.3;
  const color = paleta(rng);

  const base = ctx.hayImagen
    ? src(s0)
        .pixelate(
          () => 40 + (1 - b().amplitud) * 260 * ctx.mezclaImagen(),
          () => 24 + (1 - b().amplitud) * 150 * ctx.mezclaImagen(),
        )
        .modulateScale(osc(2, 0.03), () => b().graves * 0.3)
    : shape(lados, () => 0.12 + b().graves * 0.4, 0.03)
        .repeat(repeticiones, repeticiones)
        .color(color.r, color.g, color.b);

  return base
    .modulate(
      noise(() => 1 + b().golpe * 4, 0.05),
      () => 0.02 + b().medios * 0.2,
    )
    // Realimentación: el cuadro anterior se encoge y gira un poco, y deja estela.
    .add(
      src(o0)
        .scale(() => 0.985 - b().golpe * 0.02)
        .rotate(0.0015),
      () => rastro * ctx.intensidad(),
    )
    .brightness(() => -0.1 + b().agudos * 0.3)
    .contrast(() => 1.05 + b().amplitud * 0.7);
}

const CONSTRUCTORES: Record<
  NombrePreset,
  (s: Sintesis, rng: Rng, ctx: ContextoVisual) => Sintesis
> = {
  pulso: construirPulso,
  caleidoscopio: construirCaleidoscopio,
  ciudad: construirCiudad,
};

/** Arma la cadena del preset y la manda a la salida. */
export function aplicarPreset(
  preset: NombrePreset,
  sintesis: Sintesis,
  rng: Rng,
  ctx: ContextoVisual,
): void {
  const construir = CONSTRUCTORES[preset] ?? construirPulso;
  construir(sintesis, rng, ctx).out(sintesis.o0);
}
