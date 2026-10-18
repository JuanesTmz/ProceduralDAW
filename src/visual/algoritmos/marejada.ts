/**
 * Marejada de puntos: una rejilla que oscila alrededor de lo que la toca.
 *
 * Parte de un clásico de p5: una cuadrícula de círculos que suben y bajan con
 * un seno, y que oscilan distinto según qué tan lejos están del ratón. Aquí
 * no hay ratón. Lo que hace de ratón es:
 *
 *  - **El dedo** sobre el cuadro de tocar en vivo (o el gesto grabado): la
 *    ola nace donde lo pones, y se corre con él.
 *  - **Un par de fantasmas** que pasean solos, para que la rejilla esté viva
 *    aunque nadie toque. Cuando el dedo llega, ceden el sitio.
 *  - **Los datos**, si los hay: cada pico es un centro más.
 *  - **La música**: los graves alzan la ola, el bombo lanza un anillo que se
 *    expande desde el centro (como una piedra en el agua), los agudos hacen
 *    centellear los puntos. Y cada botón de golpe tocado deja su propio
 *    anillo (el sacudón además agita la ola, el zoom hincha los puntos).
 *
 * Cada mando toca una sola cosa: la separación de los puntos, su tamaño, lo
 * alta que es la ola, el largo de la onda, hasta dónde llega el toque, el
 * imán que los junta o los aparta, la forma y la estela que dejan.
 *
 * Como en los demás algoritmos, el tiempo se acumula cuadro a cuadro: mover
 * la velocidad cambia el ritmo desde ahora y no hace saltar la rejilla.
 */
import { rampa } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';

interface Anillo {
  x: number;
  y: number;
  /** Segundos de vida. */
  edad: number;
  fuerza: number;
}

interface Centro {
  x: number;
  y: number;
  peso: number;
}

const VIDA_ANILLO = 2.4;
const MAXIMO_ANILLOS = 8;
const FORMAS = ['Puntos', 'Cuadros', 'Agujas', 'Anillos'];

function azar(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h >>> 0) / 4294967296;
}

class Marejada implements Instancia {
  private ctx: CanvasRenderingContext2D;
  private ancho = 1;
  private alto = 1;
  /** El tiempo de la ola y el de los fantasmas: se suman, no se multiplican. */
  private fase = 0;
  private faseFantasma = 0;
  private anillos: Anillo[] = [];
  private golpePrevio = 0;
  private edadesPrevias = { destello: 99, zoom: 99, sacudon: 99, corte: 99 };

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

  private lanzar(x: number, y: number, fuerza: number): void {
    this.anillos.push({ x, y, edad: 0, fuerza });
    if (this.anillos.length > MAXIMO_ANILLOS) this.anillos.shift();
  }

  dibujar(e: Entorno): void {
    const ctx = this.ctx;
    const { parametros: p, bandas, reaccion } = e;
    const w = this.ancho;
    const h = this.alto;
    const mayor = Math.max(w, h);

    this.fase += e.delta * p.velocidad * 2.2;
    this.faseFantasma += e.delta * (0.35 + p.velocidad * 0.4);

    // La estela: con 0 se borra todo cada cuadro; más alto, deja rastro.
    ctx.fillStyle = `rgba(5, 5, 12, ${(1 - p.estela * 0.93).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    // ------------------------------------------------------------ los centros
    const dedo = e.toque;
    const centros: Centro[] = [
      {
        x: w * (0.5 + 0.3 * Math.sin(this.faseFantasma * 0.9)),
        y: h * (0.5 + 0.28 * Math.sin(this.faseFantasma * 0.63 + 1.3)),
        peso: dedo ? 0.25 : 0.95,
      },
      {
        x: w * (0.5 + 0.34 * Math.cos(this.faseFantasma * 0.51 + 0.7)),
        y: h * (0.5 + 0.3 * Math.cos(this.faseFantasma * 0.77 + 2.1)),
        peso: dedo ? 0.12 : 0.6,
      },
    ];
    if (dedo) centros.push({ x: dedo.x * w, y: dedo.y * h, peso: 1.4 });
    if (e.influenciaDatos > 0) {
      for (const pico of e.picos) {
        if (pico.nombre === 'dedo') continue; // ya está arriba
        centros.push({ x: pico.x * w, y: pico.y * h, peso: pico.fuerza * e.influenciaDatos });
      }
    }
    // De dónde nacen los anillos: del dedo si lo hay, y si no del primer fantasma.
    const origen = dedo ? centros[2] : centros[0];

    // ------------------------------------------------------ los anillos
    for (const a of this.anillos) a.edad += e.delta;
    this.anillos = this.anillos.filter((a) => a.edad < VIDA_ANILLO);

    // El bombo lanza un anillo en el instante en que sube.
    if (reaccion > 0.05 && bandas.golpe > 0.55 && this.golpePrevio <= 0.55) {
      this.lanzar(origen.x, origen.y, 0.6 + 0.4 * bandas.golpe);
    }
    this.golpePrevio = bandas.golpe;

    // Cada golpe tocado deja el suyo.
    for (const tipo of ['destello', 'zoom', 'sacudon', 'corte'] as const) {
      if (e.edadGolpe[tipo] < this.edadesPrevias[tipo]) {
        this.lanzar(tipo === 'corte' ? w / 2 : origen.x, tipo === 'corte' ? h / 2 : origen.y, 1);
      }
      this.edadesPrevias[tipo] = e.edadGolpe[tipo];
    }

    // --------------------------------------------------------- la rejilla
    const sp = Math.max(8, Math.round(p.densidad));
    const cols = Math.ceil(w / sp) + 1;
    const filas = Math.ceil(h / sp) + 1;
    const x0 = (w - (cols - 1) * sp) / 2;
    const y0 = (h - (filas - 1) * sp) / 2;

    const largo = mayor * (0.06 + 0.5 * p.ondulacion); // largo de onda
    const alcance = mayor * (0.15 + 0.7 * p.alcance);
    const sacudon = Math.exp(-e.edadGolpe.sacudon * 4);
    const zoom = Math.exp(-e.edadGolpe.zoom * 5);
    const alturaPx =
      sp * (0.15 + p.altura * 1.7) * (1 + reaccion * bandas.graves * 0.9 + sacudon * 1.2);
    const radioBase = sp * (0.1 + p.tamano * 0.4) * (1 + zoom * 0.8);
    const celeridad = (0.35 + p.ondulacion * 0.4) * mayor; // px/s del anillo
    const imgAmt = e.imagen ? e.influenciaImagen : 0;
    const proporcion = w / Math.max(1, h);
    // La amplitud y el destello suben la opacidad: con la pieza sonando todo brilla más.
    const brillo = bandas.amplitud * reaccion * 0.25 + Math.exp(-e.edadGolpe.destello * 6) * 0.35;

    ctx.lineCap = 'round';

    for (let gy = 0; gy < filas; gy++) {
      const py = y0 + gy * sp;
      for (let gx = 0; gx < cols; gx++) {
        const px = x0 + gx * sp;

        // La ola: cada centro manda un seno que se retrasa con la distancia.
        let z = 0;
        let suma = 0;
        let mejor = 0;
        let cx = px;
        let cy = py;
        let caidaMejor = 0;
        for (const c of centros) {
          const dx = px - c.x;
          const dy = py - c.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const caida = Math.exp(-((d / alcance) * (d / alcance)));
          const peso = c.peso * (0.25 + 0.75 * caida);
          z += peso * Math.sin(this.fase - (d / largo) * 6.2832);
          suma += peso;
          if (peso > mejor) {
            mejor = peso;
            cx = c.x;
            cy = c.y;
            caidaMejor = caida;
          }
        }
        z = suma > 0 ? z / Math.max(1, suma) : 0;

        // Los anillos: una cresta que viaja y se apaga.
        for (const a of this.anillos) {
          const d = Math.hypot(px - a.x, py - a.y);
          const dd = (d - a.edad * celeridad) / (0.05 * mayor + sp);
          z += a.fuerza * Math.exp(-dd * dd) * (1 - a.edad / VIDA_ANILLO);
        }
        z = Math.max(-1.6, Math.min(1.6, z));

        // El imán: junta los puntos hacia el centro (o los aparta, si es negativo).
        const ex = cx - px;
        const ey = cy - py;
        const dc = Math.hypot(ex, ey) + 1e-3;
        const tiro = p.iman * caidaMejor * sp * 2.2;
        const x = px + (ex / dc) * tiro;
        const y = py + (ey / dc) * tiro + z * alturaPx;

        // Tamaño y color salen de la altura de la ola.
        const nz = Math.max(0, Math.min(1, z * 0.5 + 0.5));
        let radio = radioBase * (0.45 + 1.1 * nz);
        radio *= 1 + reaccion * bandas.agudos * 0.8 * azar(gx, gy);
        let tono = nz * 0.78 + caidaMejor * 0.22;
        let alfa = 0.35 + nz * 0.6;

        if (imgAmt > 0 && e.imagen) {
          const m = e.imagen.muestra(px / w, py / h, proporcion);
          radio *= 1 - imgAmt + imgAmt * (0.3 + 1.2 * m.l);
          tono = tono * (1 - imgAmt) + m.l * imgAmt;
        }
        if (radio < 0.4) continue;

        const [r, g, b] = rampa(e.paleta, tono);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alfa + brillo).toFixed(3)})`;

        switch (Math.round(p.forma)) {
          case 1: {
            // Cuadros que giran con la ola.
            const ang = z * 0.9 + this.fase * 0.15;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(ang);
            ctx.fillRect(-radio, -radio, radio * 2, radio * 2);
            ctx.restore();
            break;
          }
          case 2: {
            // Agujas de brújula: apuntan al centro y se tuercen con la ola.
            const ang = Math.atan2(ey, ex) + z * 0.7;
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = Math.max(1, radio * 0.6);
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(ang) * radio * 1.5, y - Math.sin(ang) * radio * 1.5);
            ctx.lineTo(x + Math.cos(ang) * radio * 1.5, y + Math.sin(ang) * radio * 1.5);
            ctx.stroke();
            break;
          }
          case 3: {
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = Math.max(1, radio * 0.32);
            ctx.beginPath();
            ctx.arc(x, y, radio, 0, 6.2832);
            ctx.stroke();
            break;
          }
          default:
            ctx.beginPath();
            ctx.arc(x, y, radio, 0, 6.2832);
            ctx.fill();
        }
      }
    }
  }
}

export const marejada: Algoritmo = {
  id: 'marejada',
  nombre: 'Marejada de puntos',
  descripcion:
    'Una rejilla de puntos que sube y baja alrededor de lo que la toca: tu dedo, dos fantasmas que pasean y, con cada bombo, un anillo como una piedra en el agua.',
  escucha: 'Los graves alzan la ola · el bombo lanza un anillo · los agudos hacen centellear',
  conImagen: 'La foto decide el tamaño y el color de cada punto: el retrato aparece hecho de olas',
  conDatos: 'Cada dato (y tu dedo) es un centro del que nace la ola',
  mandos: [
    { id: 'densidad', etiqueta: 'Separación de los puntos', min: 12, max: 48, paso: 1, valor: 24, lectura: (v) => `${Math.round(v)} px` },
    { id: 'tamano', etiqueta: 'Tamaño de los puntos', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'altura', etiqueta: 'Altura de la ola', min: 0, max: 1, paso: 0.02, valor: 0.6, lectura: porcentaje },
    { id: 'ondulacion', etiqueta: 'Largo de la onda', min: 0, max: 1, paso: 0.02, valor: 0.35, lectura: porcentaje },
    { id: 'alcance', etiqueta: 'Hasta dónde llega el toque', min: 0, max: 1, paso: 0.02, valor: 0.55, lectura: porcentaje },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 3, paso: 0.05, valor: 1, lectura: (v) => `${v.toFixed(2)}×` },
    {
      id: 'iman',
      etiqueta: 'Imán (aparta ↔ junta)',
      min: -1,
      max: 1,
      paso: 0.02,
      valor: 0.25,
      lectura: (v) => (Math.abs(v) < 0.05 ? 'sin imán' : v > 0 ? `junta ${Math.round(v * 100)}%` : `aparta ${Math.round(-v * 100)}%`),
    },
    { id: 'forma', etiqueta: 'Forma', min: 0, max: 3, paso: 1, valor: 0, lectura: (v) => FORMAS[Math.round(v)] ?? '' },
    { id: 'estela', etiqueta: 'Estela', min: 0, max: 0.95, paso: 0.02, valor: 0.3, lectura: porcentaje },
  ],
  crear: (lienzo) => new Marejada(lienzo),
};
