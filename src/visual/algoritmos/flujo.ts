/**
 * Campo de flujo: miles de partículas siguiendo corrientes invisibles.
 *
 * El algoritmo clásico del arte procedural, y el más fácil de explicar: en
 * cada punto del lienzo el ruido decide un ángulo; cada partícula mira qué
 * ángulo le toca donde está y da un paso en esa dirección. Nadie dibuja las
 * corrientes —emergen de que miles de partículas obedezcan la misma regla.
 *
 * Qué lo hace nuestro:
 *  - **La música** empuja: los graves aceleran, los agudos despeinan la
 *    corriente y el golpe del bombo da un tirón a todas a la vez.
 *  - **La imagen** es un relieve por el que las partículas resbalan: en vez
 *    de cruzar la silueta la bordean, y se tiñen del color del píxel por el
 *    que pasan. La foto aparece dibujada por el movimiento, no pegada.
 *  - **Los datos** son remolinos: cada pico hace girar lo que pasa cerca.
 *
 * No se borra el fondo en cada cuadro, se oscurece un poco: eso deja la
 * estela, que es donde se ve la corriente. Es también lo que hace que el
 * algoritmo sea barato — no hay que redibujar la historia, ya está pintada.
 */
import { ruido } from '../perlin';
import { rampa } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Su sitio en la rampa de color, 0..1. */
  tono: number;
  /** Cuadros que le quedan antes de renacer en otro sitio. */
  vida: number;
}

/** Tope de partículas. Por encima, una tablet del evento empieza a sufrir. */
const MAXIMO = 2600;

class Flujo implements Instancia {
  private ctx: CanvasRenderingContext2D;
  private particulas: Particula[] = [];
  private ancho = 1;
  private alto = 1;

  constructor(lienzo: HTMLCanvasElement) {
    const ctx = lienzo.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Sin canvas 2D');
    this.ctx = ctx;
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    this.ctx.fillStyle = '#05050c';
    this.ctx.fillRect(0, 0, ancho, alto);
  }

  private sembrar(cuantas: number, semilla: number): void {
    // El sembrado no es azar del navegador: sale de la semilla, para que la
    // misma pieza arranque siempre igual.
    let estado = semilla >>> 0;
    const siguiente = () => {
      estado = (estado + 0x6d2b79f5) >>> 0;
      let t = estado;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.particulas = Array.from({ length: cuantas }, () => ({
      x: siguiente() * this.ancho,
      y: siguiente() * this.alto,
      vx: 0,
      vy: 0,
      tono: siguiente(),
      vida: 40 + siguiente() * 160,
    }));
  }

  dibujar(e: Entorno): void {
    const ctx = this.ctx;
    const { bandas, reaccion, parametros: p } = e;

    const cuantas = Math.round(p.cantidad);
    if (this.particulas.length !== cuantas) this.sembrar(cuantas, e.semilla);

    // La estela: cuanto más alta, más memoria deja el cuadro.
    const borrado = 1 - p.estela;
    ctx.fillStyle = `rgba(5, 5, 12, ${Math.max(0.012, borrado * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, this.ancho, this.alto);

    const proporcion = this.ancho / Math.max(1, this.alto);
    const escala = 0.0006 + (1 - p.tamano) * 0.004;
    // Los graves aceleran; el golpe da el tirón.
    const velocidad =
      p.velocidad * (1 + reaccion * (bandas.graves * 1.1 + bandas.golpe * 1.4));
    // Los agudos despeinan: más vueltas por unidad de recorrido.
    const giro = p.giro * (1 + reaccion * bandas.agudos * 1.6);
    const imgAmt = e.imagen ? e.influenciaImagen : 0;
    const t = e.tiempo * 0.12 * p.velocidad;

    ctx.lineCap = 'round';

    for (const q of this.particulas) {
      const u = q.x / this.ancho;
      const v = q.y / this.alto;

      // El ángulo base lo pone el ruido: esa es la corriente invisible.
      let angulo = ruido(q.x * escala, q.y * escala, t) * Math.PI * 4 * giro;

      // La imagen tuerce la corriente: las partículas resbalan por el borde
      // de la silueta en vez de atravesarlo.
      let tono = q.tono;
      if (imgAmt > 0 && e.imagen) {
        const [dx, dy] = e.imagen.pendiente(u, v, proporcion);
        const fuerza = Math.hypot(dx, dy);
        if (fuerza > 0.0015) {
          // Girado 90°: seguir el contorno, no subir la cuesta.
          const borde = Math.atan2(dx, -dy);
          angulo = angulo * (1 - imgAmt) + borde * imgAmt;
        }
        const m = e.imagen.muestra(u, v, proporcion);
        tono = q.tono * (1 - imgAmt) + m.l * imgAmt;
      }

      // Los picos arremolinan lo que pasa cerca.
      let rx = 0;
      let ry = 0;
      if (e.influenciaDatos > 0) {
        for (const pico of e.picos) {
          const ddx = u - pico.x;
          const ddy = v - pico.y;
          const d2 = ddx * ddx + ddy * ddy;
          const r2 = pico.radio * pico.radio;
          if (d2 > r2) continue;
          const caida = 1 - d2 / r2;
          const d = Math.sqrt(d2) + 1e-4;
          rx += (-ddy / d) * pico.giro * caida * pico.fuerza;
          ry += (ddx / d) * pico.giro * caida * pico.fuerza;
        }
        rx *= e.influenciaDatos * 1.4;
        ry *= e.influenciaDatos * 1.4;
      }

      const ax = Math.cos(angulo) + rx;
      const ay = Math.sin(angulo) + ry;

      // Inercia: sin esto las partículas cambian de rumbo a tirones.
      q.vx = q.vx * 0.86 + ax * velocidad * 0.5;
      q.vy = q.vy * 0.86 + ay * velocidad * 0.5;

      const px = q.x;
      const py = q.y;
      q.x += q.vx;
      q.y += q.vy;
      q.vida -= 1;

      // Renacer: por el borde o por vieja. Si no, todas acaban apelotonadas
      // en los sumideros del campo y el cuadro se queda quieto.
      if (q.vida <= 0 || q.x < 0 || q.y < 0 || q.x > this.ancho || q.y > this.alto) {
        q.x = Math.random() * this.ancho;
        q.y = Math.random() * this.alto;
        q.vx = 0;
        q.vy = 0;
        q.vida = 40 + Math.random() * 160;
        continue; // sin trazo: si no, deja una raya de lado a lado
      }

      const [r, g, b] = rampa(e.paleta, tono);
      const brillo = 0.22 + bandas.amplitud * reaccion * 0.5 + p.brillo * 0.5;
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(0.95, brillo).toFixed(3)})`;
      ctx.lineWidth = p.grosor * (0.7 + bandas.golpe * reaccion * 1.2);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
  }
}

export const flujo: Algoritmo = {
  id: 'flujo',
  nombre: 'Campo de flujo',
  descripcion:
    'Miles de partículas siguen corrientes invisibles que dibuja el ruido. Nadie pinta las corrientes: salen de que todas obedezcan la misma regla.',
  escucha: 'Los graves aceleran · los agudos despeinan · el bombo da el tirón',
  conImagen: 'Las partículas bordean la silueta y se tiñen de su color',
  conDatos: 'Cada dato es un remolino que arrastra lo que pasa cerca',
  mandos: [
    { id: 'cantidad', etiqueta: 'Partículas', min: 300, max: MAXIMO, paso: 100, valor: 1400, lectura: (v) => `${v}` },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0.2, max: 4, paso: 0.1, valor: 1.4, lectura: (v) => `${v.toFixed(1)}×` },
    { id: 'tamano', etiqueta: 'Tamaño de las corrientes', min: 0, max: 1, paso: 0.02, valor: 0.55, lectura: porcentaje },
    { id: 'giro', etiqueta: 'Revueltas', min: 0.2, max: 3, paso: 0.05, valor: 1, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'estela', etiqueta: 'Estela', min: 0, max: 0.98, paso: 0.02, valor: 0.9, lectura: porcentaje },
    { id: 'grosor', etiqueta: 'Grosor del trazo', min: 0.3, max: 3, paso: 0.1, valor: 1, lectura: (v) => `${v.toFixed(1)} px` },
    { id: 'brillo', etiqueta: 'Brillo', min: 0, max: 1, paso: 0.02, valor: 0.3, lectura: porcentaje },
  ],
  crear: (lienzo) => new Flujo(lienzo),
};
