/**
 * Texto cinético: el monólogo apareciendo sobre el visual, al ritmo de la voz.
 *
 * Se dibuja en su propio canvas 2D, encima del de Hydra —no en HTML—
 * para que la exportación en video pueda componer las dos capas.
 *
 * La sincronía es por regla de tres sobre la duración de la grabación:
 * si la narración dura 40 s y tiene 100 palabras, la palabra 50 entra
 * al segundo 20. No es reconocimiento de voz, pero cae bien y es predecible.
 */
import type { Bandas } from './analizador';

export interface EstadoTexto {
  /** Palabras del fragmento que le toca a la sección que suena. */
  palabras: string[];
  /** Cuántas van reveladas. */
  reveladas: number;
  /** 0..1 — cuánto se ve el bloque (el cierre lo desvanece). */
  opacidad: number;
}

const MARGEN = 46;
const LINEAS_VISIBLES = 3;

/** Reparte las palabras en líneas que quepan a lo ancho. */
function armarLineas(
  ctx: CanvasRenderingContext2D,
  palabras: string[],
  anchoMaximo: number,
): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(intento).width > anchoMaximo && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = intento;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Dibuja el texto sobre el canvas. Se llama una vez por cuadro.
 * La última palabra entra un poco más grande y se asienta: eso es lo cinético.
 */
export function dibujarTexto(
  lienzo: HTMLCanvasElement,
  estado: EstadoTexto,
  bandas: Bandas,
): void {
  const ctx = lienzo.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  if (estado.opacidad <= 0.01 || estado.reveladas === 0) return;

  const visibles = estado.palabras.slice(0, estado.reveladas);
  if (visibles.length === 0) return;

  const tamano = Math.round(lienzo.height * 0.062);
  ctx.font = `600 ${tamano}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'alphabetic';

  const anchoMaximo = lienzo.width - MARGEN * 2;
  const todas = armarLineas(ctx, visibles, anchoMaximo);
  const lineas = todas.slice(-LINEAS_VISIBLES);

  const alturaLinea = tamano * 1.34;
  const base = lienzo.height - MARGEN - (lineas.length - 1) * alturaLinea;

  // El bloque late suavemente con la amplitud: acompaña sin distraer.
  const latido = 1 + bandas.amplitud * 0.02;

  lineas.forEach((linea, i) => {
    const y = base + i * alturaLinea;
    // Las líneas viejas se apagan; la última es la que se lee.
    const desvanecido = 0.4 + 0.6 * ((i + 1) / lineas.length);
    const alfa = estado.opacidad * desvanecido;

    ctx.save();
    ctx.translate(MARGEN, y);
    ctx.scale(latido, latido);

    // Sombra en vez de caja: el texto se lee sobre cualquier visual.
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alfa})`;
    ctx.fillText(linea, 0, 0);
    ctx.restore();
  });
}

/**
 * Cuántas palabras deberían verse en este instante de la narración.
 * Devuelve el total si la narración ya terminó, y 0 si todavía no empieza.
 */
export function palabrasReveladas(
  segundosDesdeInicio: number,
  duracion: number,
  total: number,
): number {
  if (total === 0) return 0;
  if (segundosDesdeInicio < 0) return 0;
  if (duracion <= 0) return total;
  const proporcion = segundosDesdeInicio / duracion;
  return Math.max(0, Math.min(total, Math.ceil(proporcion * total)));
}
