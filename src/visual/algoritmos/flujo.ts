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
/** Tope de masas: cada una se atrae con todas las demás, así que cuesta al cuadrado. */
const MAXIMO_MASAS = 24;

/** Un cuerpo pesado: se atrae con los demás por un muelle y arrastra a las partículas. */
interface Masa {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0.003 a 0.03: pesa más, atrae más y se dibuja más grande. */
  m: number;
}

class Flujo implements Instancia {
  private ctx: CanvasRenderingContext2D;
  private particulas: Particula[] = [];
  private ancho = 1;
  private alto = 1;
  /** El tiempo de la corriente: se suma, no se multiplica, para que mover la velocidad no haga saltar el campo. */
  private fase = 0;
  private masas: Masa[] = [];
  private golpePrevio = 0;

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

  /** Reparte las masas la primera vez (o cuando cambia cuántas hay), desde la semilla. */
  private sembrarMasas(cuantas: number, semilla: number): void {
    let estado = (semilla + 77) >>> 0;
    const siguiente = () => {
      estado = (estado + 0x6d2b79f5) >>> 0;
      let t = estado;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.masas = Array.from({ length: cuantas }, () => ({
      x: this.ancho * (0.25 + siguiente() * 0.5),
      y: this.alto * (0.25 + siguiente() * 0.5),
      vx: 0,
      vy: 0,
      m: 0.003 + siguiente() * 0.027,
    }));
  }

  /**
   * La física de la referencia de gravedad: cada masa siente un muelle hacia
   * cada otra, con largo de reposo `reposo`: lejos de ese largo se atraen y
   * más cerca se repelen, así que se agrupan y orbitan sin chocar. El dedo y
   * los datos son masas fijas que también las atraen.
   */
  private moverMasas(e: Entorno, reposo: number): void {
    const paso = Math.min(3, e.delta * 60);
    const fijas: { x: number; y: number; m: number }[] = [];
    if (e.toque) fijas.push({ x: e.toque.x * this.ancho, y: e.toque.y * this.alto, m: 0.03 });
    if (e.influenciaDatos > 0) {
      for (const pico of e.picos) {
        if (pico.nombre === 'dedo') continue;
        fijas.push({ x: pico.x * this.ancho, y: pico.y * this.alto, m: 0.004 + pico.fuerza * 0.02 });
      }
    }
    // El bombo da un empujón hacia afuera: las masas respiran con la música.
    const golpe = e.reaccion > 0.05 && e.bandas.golpe > 0.55 && this.golpePrevio <= 0.55;
    this.golpePrevio = e.bandas.golpe;
    const escala = Math.max(this.ancho, this.alto) / 1000;

    for (const a of this.masas) {
      let ax = 0;
      let ay = 0;
      const atraer = (bx: number, by: number, mb: number) => {
        const dx = bx - a.x;
        const dy = by - a.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const fuerza = ((d - reposo) * mb) / d;
        ax += fuerza * dx;
        ay += fuerza * dy;
      };
      for (const b of this.masas) if (b !== a) atraer(b.x, b.y, b.m / escala);
      for (const f of fijas) atraer(f.x, f.y, f.m / escala);
      a.vx = (a.vx * 0.99 ** paso) + ax * a.m * paso * 0.9;
      a.vy = (a.vy * 0.99 ** paso) + ay * a.m * paso * 0.9;
      if (golpe) {
        const dx = a.x - this.ancho / 2;
        const dy = a.y - this.alto / 2;
        const d = Math.max(1, Math.hypot(dx, dy));
        a.vx += (dx / d) * 6 * e.bandas.golpe;
        a.vy += (dy / d) * 6 * e.bandas.golpe;
      }
    }
    for (const a of this.masas) {
      a.x += a.vx * paso;
      a.y += a.vy * paso;
      // Si una se escapa de la pantalla, vuelve rebotando.
      if (a.x < 0 || a.x > this.ancho) a.vx *= -0.6;
      if (a.y < 0 || a.y > this.alto) a.vy *= -0.6;
      a.x = Math.max(0, Math.min(this.ancho, a.x));
      a.y = Math.max(0, Math.min(this.alto, a.y));
    }
  }

  dibujar(e: Entorno): void {
    const ctx = this.ctx;
    const { bandas, reaccion, parametros: p } = e;

    // Las masas: 0 las apaga y queda el campo de siempre.
    const nMasas = Math.min(MAXIMO_MASAS, Math.round(p.masas));
    if (this.masas.length !== nMasas) this.sembrarMasas(nMasas, e.semilla);
    const mayorLado = Math.max(this.ancho, this.alto);
    if (nMasas > 0) this.moverMasas(e, (0.1 + p.distancia * 0.4) * mayorLado);

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
    this.fase += e.delta * 0.12 * p.velocidad;
    const t = this.fase;
    const cx = this.ancho / 2;
    const cy = this.alto / 2;

    ctx.lineCap = 'round';

    for (const q of this.particulas) {
      const u = q.x / this.ancho;
      const v = q.y / this.alto;

      // El ángulo base lo pone el ruido: esa es la corriente invisible.
      // (La escala se mide desde el centro: cambiar el tamaño no desliza el campo.)
      let angulo = ruido((q.x - cx) * escala, (q.y - cy) * escala, t) * Math.PI * 4 * giro;

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

      let ax = Math.cos(angulo) + rx;
      let ay = Math.sin(angulo) + ry;

      // Las masas atraen a las partículas: se enroscan a su alrededor como un enjambre.
      if (nMasas > 0 && p.gravedad > 0) {
        for (const mm of this.masas) {
          const gx = mm.x - q.x;
          const gy = mm.y - q.y;
          const d = Math.hypot(gx, gy) + 8;
          const tiro = (p.gravedad * mm.m * 110) / (1 + d / (0.12 * mayorLado));
          ax += (gx / d) * tiro;
          ay += (gy / d) * tiro;
        }
      }

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

    // Las masas se dibujan encima como círculos translúcidos. Como el cuadro no
    // se borra del todo (deja estela), su opacidad se saca de lo que se borra:
    // así se quedan en un tono estable en vez de sumarse hasta el blanco.
    if (nMasas > 0) {
      const borrada = Math.max(0.012, (1 - p.estela) * 0.5);
      const opacidad = Math.min(0.5, borrada * (0.5 + p.brillo * 0.6));
      const escalaMasa = mayorLado / 1000;
      for (const mm of this.masas) {
        const [r, g, b] = rampa(e.paleta, 0.35 + ((mm.m - 0.003) / 0.027) * 0.6);
        ctx.fillStyle = `rgba(${r},${g},${b},${opacidad.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(mm.x, mm.y, mm.m * 1000 * escalaMasa * (1 + bandas.golpe * reaccion * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
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
    { id: 'masas', etiqueta: 'Masas (gravedad)', min: 0, max: MAXIMO_MASAS, paso: 1, valor: 0, lectura: (v) => (v < 1 ? 'sin masas' : `${Math.round(v)}`) },
    { id: 'distancia', etiqueta: 'Distancia entre masas', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'gravedad', etiqueta: 'Cuánto atraen a las partículas', min: 0, max: 1, paso: 0.02, valor: 0.4, lectura: porcentaje },
  ],
  crear: (lienzo) => new Flujo(lienzo),
};
