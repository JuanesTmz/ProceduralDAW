/**
 * Ondas topográficas: curvas de nivel de un relieve que no existe.
 *
 * Se calcula una altura en cada punto de una rejilla y se dibujan las líneas
 * donde esa altura cruza cada nivel, igual que un mapa de montaña. El
 * método es «marching squares»: para cada celda de cuatro esquinas se mira
 * cuáles están por encima del nivel y eso decide qué segmento trazar. Son
 * dieciséis casos, y dos de ellos no dibujan nada.
 *
 * Lo bonito del algoritmo es que el relieve puede venir de donde sea:
 *  - del **ruido**, y entonces son dunas;
 *  - de la **imagen**, y entonces las curvas recorren la foto como un mapa
 *    topográfico del retrato: lo claro es montaña y lo oscuro es valle;
 *  - de los **datos**, que levantan un pico cada uno;
 *  - y de la **música**, que sube y baja el relieve entero con los graves y
 *    adelgaza o engorda las líneas con los agudos.
 */
import { ruidoFractal } from '../perlin';
import { rampa } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';

class Ondas implements Instancia {
  private ctx: CanvasRenderingContext2D;
  private ancho = 1;
  private alto = 1;
  /** Lado de la celda en píxeles. Más grande = más barato y más tosco. */
  private celda = 8;
  private capas = 4;
  private cols = 0;
  private filas = 0;
  private campo = new Float32Array(0);

  constructor(lienzo: HTMLCanvasElement) {
    const ctx = lienzo.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Sin canvas 2D');
    this.ctx = ctx;
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;

    // El coste va con el número de celdas, así que la rejilla se adapta al
    // tamaño: en una tablet se trabaja más grueso y nadie lo nota.
    const pixeles = ancho * alto;
    if (pixeles < 300000) {
      this.celda = 10;
      this.capas = 3;
    } else if (pixeles < 700000) {
      this.celda = 8;
      this.capas = 4;
    } else {
      this.celda = 7;
      this.capas = 4;
    }

    this.cols = Math.ceil(ancho / this.celda) + 1;
    this.filas = Math.ceil(alto / this.celda) + 1;
    this.campo = new Float32Array(this.cols * this.filas);
  }

  private calcularCampo(e: Entorno): void {
    const { parametros: p, bandas, reaccion } = e;
    const escala = 0.0009 + (1 - p.tamano) * 0.0055;
    const proporcion = this.ancho / Math.max(1, this.alto);
    const imgAmt = e.imagen ? e.influenciaImagen : 0;
    const mayor = Math.max(this.ancho, this.alto);
    const t = e.tiempo * p.velocidad * 0.35;

    // La música levanta el relieve entero: con el bombo sube la marea y las
    // curvas se apiñan, que es lo que se ve como un latido.
    const marea = reaccion * (bandas.graves * 0.22 + bandas.golpe * 0.16);

    for (let gy = 0; gy < this.filas; gy++) {
      const py = gy * this.celda;
      for (let gx = 0; gx < this.cols; gx++) {
        const px = gx * this.celda;
        let valor = ruidoFractal(px * escala, py * escala, t, this.capas);

        if (imgAmt > 0 && e.imagen) {
          const luz = e.imagen.luz(px / this.ancho, py / this.alto, proporcion);
          valor = valor * (1 - imgAmt) + (luz * 0.88 + valor * 0.12) * imgAmt;
        }

        if (e.influenciaDatos > 0) {
          for (const pico of e.picos) {
            const dx = px - pico.x * this.ancho;
            const dy = py - pico.y * this.alto;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radio = mayor * pico.radio;
            if (dist >= radio) continue;
            const t2 = 1 - dist / radio;
            // Suavizado: sin esto el pico se ve como un cono con arista.
            valor += t2 * t2 * (3 - 2 * t2) * pico.fuerza * e.influenciaDatos * 0.85;
          }
        }

        this.campo[gy * this.cols + gx] = valor + marea;
      }
    }
  }

  private segmento(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
  }

  /** Los dieciséis casos del marching squares. */
  private celdaDeMarcha(
    cx: number,
    cy: number,
    caso: number,
    nivel: number,
    ai: number,
    ad: number,
    bd: number,
    bi: number,
  ): void {
    const s = this.celda;
    const x = cx * s;
    const y = cy * s;
    const lim = (v: number) => Math.max(0, Math.min(1, v));
    const arriba = x + lim((nivel - ai) / (ad - ai || 1e-4)) * s;
    const derecha = y + lim((nivel - ad) / (bd - ad || 1e-4)) * s;
    const abajo = x + lim((nivel - bi) / (bd - bi || 1e-4)) * s;
    const izquierda = y + lim((nivel - ai) / (bi - ai || 1e-4)) * s;

    switch (caso) {
      case 1: case 14: this.segmento(abajo, y + s, x, izquierda); break;
      case 2: case 13: this.segmento(x + s, derecha, abajo, y + s); break;
      case 3: case 12: this.segmento(x + s, derecha, x, izquierda); break;
      case 4: case 11: this.segmento(arriba, y, x + s, derecha); break;
      case 5:
        this.segmento(arriba, y, x, izquierda);
        this.segmento(x + s, derecha, abajo, y + s);
        break;
      case 6: case 9: this.segmento(arriba, y, abajo, y + s); break;
      case 7: case 8: this.segmento(arriba, y, x, izquierda); break;
      case 10:
        this.segmento(arriba, y, x + s, derecha);
        this.segmento(x, izquierda, abajo, y + s);
        break;
    }
  }

  dibujar(e: Entorno): void {
    const ctx = this.ctx;
    const { parametros: p, bandas, reaccion } = e;
    this.calcularCampo(e);

    ctx.fillStyle = '#05050c';
    ctx.fillRect(0, 0, this.ancho, this.alto);

    const niveles = Math.round(p.niveles);
    // Los agudos engordan la línea: el brillo del hi-hat se ve como grosor.
    const grosor = p.grosor * (1 + reaccion * bandas.agudos * 0.9);

    for (let nivel = 0; nivel < niveles; nivel++) {
      const altura = (nivel + 0.5) / niveles;
      // Las curvas del medio son las más marcadas: dan el centro de la forma.
      const prominencia = 1 - Math.abs(altura - 0.5) * 2;
      const alfa = (40 + prominencia * 190) / 255;
      const [r, g, b] = rampa(e.paleta, altura);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alfa.toFixed(3)})`;
      ctx.lineWidth = grosor * (0.4 + prominencia * 0.8);
      ctx.beginPath();

      for (let gy = 0; gy < this.filas - 1; gy++) {
        for (let gx = 0; gx < this.cols - 1; gx++) {
          const i = gy * this.cols + gx;
          const ai = this.campo[i];
          const ad = this.campo[i + 1];
          const bi = this.campo[i + this.cols];
          const bd = this.campo[i + this.cols + 1];
          const caso =
            (ai >= altura ? 8 : 0) |
            (ad >= altura ? 4 : 0) |
            (bd >= altura ? 2 : 0) |
            (bi >= altura ? 1 : 0);
          if (caso === 0 || caso === 15) continue;
          this.celdaDeMarcha(gx, gy, caso, altura, ai, ad, bd, bi);
        }
      }
      ctx.stroke();
    }
  }
}

export const ondas: Algoritmo = {
  id: 'ondas',
  nombre: 'Ondas topográficas',
  descripcion:
    'Curvas de nivel de un relieve inventado, como un mapa de montaña vivo. Donde el terreno sube, las curvas se aprietan.',
  escucha: 'Los graves levantan el relieve · los agudos engordan la línea',
  conImagen: 'La foto ES el relieve: lo claro es montaña y lo oscuro, valle',
  conDatos: 'Cada dato levanta un pico que deforma las curvas a su alrededor',
  mandos: [
    { id: 'niveles', etiqueta: 'Curvas', min: 6, max: 60, paso: 1, valor: 28, lectura: (v) => `${v}` },
    { id: 'tamano', etiqueta: 'Tamaño del relieve', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 3, paso: 0.05, valor: 0.7, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'grosor', etiqueta: 'Grosor', min: 0.3, max: 3, paso: 0.1, valor: 1.2, lectura: (v) => `${v.toFixed(1)} px` },
  ],
  crear: (lienzo) => new Ondas(lienzo),
};
