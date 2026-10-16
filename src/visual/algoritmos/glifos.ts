/**
 * Constelación de glifos: la pantalla como rejilla de caracteres.
 *
 * Es la idea más vieja del arte por computadora —dibujar con letras— puesta
 * a correr en tiempo real. El lienzo se parte en una cuadrícula y en cada
 * casilla se calcula un valor de 0 a 1; ese valor elige el carácter, de los
 * más vacíos a los más densos, y su color en la rampa.
 *
 * Es el que mejor enseña de qué va esto: se ve literalmente que debajo de
 * la imagen hay NÚMEROS, porque los números están escritos en la pantalla.
 *
 *  - **La música** enciende la constelación: la amplitud sube el umbral de
 *    lo que se ve y el golpe hace destellar filas enteras.
 *  - **La imagen** decide la densidad: donde la foto es clara salen los
 *    glifos gordos, y la silueta aparece escrita.
 *  - **Los datos** encienden racimos alrededor de cada pico.
 */
import { ruidoFractal } from '../perlin';
import { rampa } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';

/** De lo más vacío a lo más denso: el orden importa, es la escala de grises. */
const ALFABETOS: Record<string, string> = {
  clasico: ' .:-=+*#%@',
  bloques: ' ░▒▓█',
  sonora: ' ·:∙•◦○◍◉●',
  binario: ' 0101',
};

export const NOMBRES_ALFABETO: { id: string; etiqueta: string }[] = [
  { id: 'clasico', etiqueta: 'Clásico' },
  { id: 'bloques', etiqueta: 'Bloques' },
  { id: 'sonora', etiqueta: 'Puntos' },
  { id: 'binario', etiqueta: 'Binario' },
];

function azar(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h >>> 0) / 4294967296;
}

class Glifos implements Instancia {
  private ctx: CanvasRenderingContext2D;
  private ancho = 1;
  private alto = 1;
  private cols = 0;
  private filas = 0;
  private anchoCelda = 10;
  private altoCelda = 16;
  private cuerpo = 14;
  /** Alfabeto en uso. Lo fija la pantalla, no un mando numérico. */
  alfabeto = 'sonora';

  constructor(lienzo: HTMLCanvasElement) {
    const ctx = lienzo.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Sin canvas 2D');
    this.ctx = ctx;
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    this.distribuir(this.cuerpo);
  }

  private distribuir(cuerpo: number): void {
    this.cuerpo = cuerpo;
    this.ctx.font = `${cuerpo}px var(--mono, monospace)`;
    // Se mide un glifo de verdad en vez de suponer: cada sistema tiene su
    // monoespaciada y suponer deja huecos o solapes.
    this.anchoCelda = Math.max(4, this.ctx.measureText('M').width);
    this.altoCelda = Math.max(5, cuerpo * 1.16);
    this.cols = Math.ceil(this.ancho / this.anchoCelda);
    this.filas = Math.ceil(this.alto / this.altoCelda);
  }

  dibujar(e: Entorno): void {
    const ctx = this.ctx;
    const { parametros: p, bandas, reaccion } = e;

    const cuerpo = Math.round(p.cuerpo);
    if (cuerpo !== this.cuerpo) this.distribuir(cuerpo);

    const chars = ALFABETOS[this.alfabeto] ?? ALFABETOS.clasico;
    const escala = 0.004 + (1 - p.tamano) * 0.02;
    const t = e.tiempo * p.velocidad * 0.5;
    const proporcion = this.ancho / Math.max(1, this.alto);
    const imgAmt = e.imagen ? e.influenciaImagen : 0;

    // La amplitud destapa la constelación: en silencio solo se ven los
    // glifos más densos; con la pieza sonando se enciende entera.
    const umbral = Math.max(0, p.umbral - reaccion * bandas.amplitud * 0.35);
    const chispa = reaccion * bandas.golpe;

    ctx.fillStyle = '#05050c';
    ctx.fillRect(0, 0, this.ancho, this.alto);
    ctx.font = `${cuerpo}px var(--mono, monospace)`;
    ctx.textBaseline = 'top';

    for (let fy = 0; fy < this.filas; fy++) {
      const py = fy * this.altoCelda;
      // El golpe recorre filas sueltas: el destello no es uniforme, parece
      // que algo pasa por dentro de la rejilla.
      const destello = chispa > 0.05 ? chispa * azar(fy, Math.floor(e.tiempo * 6)) : 0;

      for (let fx = 0; fx < this.cols; fx++) {
        const px = fx * this.anchoCelda;
        let valor = ruidoFractal(px * escala, py * escala, t, 3);

        if (imgAmt > 0 && e.imagen) {
          const luz = e.imagen.luz(px / this.ancho, py / this.alto, proporcion);
          valor = valor * (1 - imgAmt) + luz * imgAmt;
        }

        if (e.influenciaDatos > 0) {
          const u = px / this.ancho;
          const v = py / this.alto;
          for (const pico of e.picos) {
            const dx = u - pico.x;
            const dy = v - pico.y;
            const d2 = dx * dx + dy * dy;
            const r2 = pico.radio * pico.radio;
            if (d2 >= r2) continue;
            const c = 1 - d2 / r2;
            valor += c * c * pico.fuerza * e.influenciaDatos * 0.7;
          }
        }

        valor = Math.min(1, valor + destello * 0.5);
        if (valor < umbral) continue;

        // Reescalado: lo que pasa el umbral usa toda la escala de glifos,
        // si no, subir el umbral deja solo los densos y se pierde el dibujo.
        const n = Math.min(1, (valor - umbral) / Math.max(0.05, 1 - umbral));
        const indice = Math.min(chars.length - 1, Math.floor(n * chars.length));
        const glifo = chars[indice];
        if (glifo === ' ') continue;

        const [r, g, b] = rampa(e.paleta, n);
        const alfa = 0.25 + n * 0.75;
        ctx.fillStyle = `rgba(${r},${g},${b},${alfa.toFixed(3)})`;
        ctx.fillText(glifo, px, py);
      }
    }
  }
}

export const glifos: Algoritmo = {
  id: 'glifos',
  nombre: 'Constelación de glifos',
  descripcion:
    'La pantalla partida en una rejilla de caracteres. Cada casilla calcula un número y ese número elige su glifo: se ve que debajo de la imagen hay datos.',
  escucha: 'La amplitud enciende la constelación · el bombo hace destellar filas',
  conImagen: 'La foto decide la densidad: su silueta aparece escrita en glifos',
  conDatos: 'Cada dato enciende un racimo de glifos a su alrededor',
  mandos: [
    { id: 'cuerpo', etiqueta: 'Tamaño del glifo', min: 7, max: 26, paso: 1, valor: 13, lectura: (v) => `${v} px` },
    { id: 'tamano', etiqueta: 'Tamaño de las formas', min: 0, max: 1, paso: 0.02, valor: 0.6, lectura: porcentaje },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 3, paso: 0.05, valor: 0.8, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'umbral', etiqueta: 'Cuánto se tapa', min: 0, max: 0.9, paso: 0.02, valor: 0.42, lectura: porcentaje },
  ],
  crear: (lienzo) => new Glifos(lienzo),
};

/** Para que la pantalla pueda cambiar el alfabeto sin pasar por un número. */
export function fijarAlfabeto(instancia: Instancia, id: string): void {
  if (instancia instanceof Glifos) instancia.alfabeto = id;
}
