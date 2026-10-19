/**
 * Marejada de formas: una rejilla de figuras que oscila alrededor de lo que
 * la toca, con la figura y la trama a elección.
 *
 * Parte de un clásico de p5: una cuadrícula de círculos que suben y bajan
 * con un seno, y oscilan distinto según qué tan lejos están del ratón. Aquí
 * no hay ratón. Lo que hace de ratón es:
 *
 *  - **El dedo** sobre el cuadro de tocar en vivo (o el gesto grabado).
 *  - **Un par de fantasmas** que pasean solos, para que esté viva aunque
 *    nadie toque. Cuando llega el dedo, ceden el sitio.
 *  - **Los datos**, si los hay: cada pico es un centro más.
 *  - **La música**: los graves alzan la ola, el bombo lanza un anillo que
 *    se expande, los agudos hacen centellear. Cada botón de golpe tocado
 *    deja el suyo (el sacudón agita, el zoom hincha).
 *
 * Qué se dibuja lo deciden dos mandos de elección:
 *
 *  - **Forma**: puntos, triángulos, cuadros, cuadros redondeados (como
 *    luces LED), polígonos de 3 a 10 lados, estrellas, cruces, agujas de
 *    brújula, anillos, o una mezcla de todo.
 *  - **Trama**: qué casillas se encienden y cómo.
 *      · *Ola llena*: todas, como la referencia.
 *      · *Munching (XOR)*: solo las que cumplen `y = x XOR t`, que dibujan
 *        curvas de fractal que se desplazan (los «munching squares»).
 *      · *Sierpinski*: solo las que cumplen `x AND y = 0`: el triángulo de
 *        Sierpinski, que corre y se transforma.
 *      · *Baldosas*: cada casilla hace su entrada por etapas —desliza, gira,
 *        crece, cambia de color— en una ola que sale del centro (o del dedo).
 *
 * El tiempo se acumula cuadro a cuadro: mover la velocidad cambia el ritmo
 * desde ahora y no hace saltar la rejilla.
 */
import { rampa } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { eleccion, porcentaje } from './tipos';

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
const TAU = Math.PI * 2;
const FORMAS = [
  'Puntos',
  'Triángulos',
  'Cuadros',
  'Cuadros redondeados',
  'Polígonos',
  'Estrellas',
  'Cruces',
  'Agujas',
  'Anillos',
  'Mezcla',
];
const TRAMAS = ['Ola llena', 'Munching (XOR)', 'Sierpinski', 'Baldosas'];
/** Las figuras que puede sortear la mezcla (sin las agujas, que dependen del centro). */
const SORTEABLES = [0, 1, 2, 3, 4, 5, 6, 8];
/** Los valores de t de los munching squares: cuatro familias de curvas. */
const FAMILIAS_XOR = [
  [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 26],
  [0, 31, 94, 93, 91, 90, 89, 8, 9, 10, 11, 28, 33, 34],
  [1, 3, 5, 7, 9, 12, 14, 17, 20, 23, 26, 29, 32],
  [5, 6, 19, 18],
];

function azar(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h >>> 0) / 4294967296;
}

const suave = (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2); // easeInOutQuint

/**
 * Traza una figura centrada en (x, y). El radio `r` es la mitad del ancho;
 * `sx` y `sy` la estiran (para las entradas de las baldosas) y `ang` la gira.
 * Devuelve true si hay que rellenarla y false si hay que dibujarle solo el borde.
 */
function trazar(
  ctx: CanvasRenderingContext2D,
  tipo: number,
  x: number,
  y: number,
  r: number,
  ang: number,
  lados: number,
  sx: number,
  sy: number,
): boolean {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const punto = (px: number, py: number, primero: boolean) => {
    const ax = px * sx;
    const ay = py * sy;
    const X = x + ax * c - ay * s;
    const Y = y + ax * s + ay * c;
    if (primero) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  };
  ctx.beginPath();
  switch (tipo) {
    case 1:
    case 4: {
      const n = tipo === 1 ? 3 : Math.max(3, Math.round(lados));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - Math.PI / 2;
        punto(Math.cos(a) * r, Math.sin(a) * r, i === 0);
      }
      ctx.closePath();
      return true;
    }
    case 2:
      punto(-r, -r, true);
      punto(r, -r, false);
      punto(r, r, false);
      punto(-r, r, false);
      ctx.closePath();
      return true;
    case 3: {
      // Un cuadrado de esquinas muy redondeadas (una superelipse), como un LED.
      const pasos = 20;
      for (let i = 0; i < pasos; i++) {
        const a = (i / pasos) * TAU;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        punto(Math.sign(ca) * Math.sqrt(Math.abs(ca)) * r, Math.sign(sa) * Math.sqrt(Math.abs(sa)) * r, i === 0);
      }
      ctx.closePath();
      return true;
    }
    case 5: {
      const n = Math.max(3, Math.round(lados));
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.42;
        punto(Math.cos(a) * rr, Math.sin(a) * rr, i === 0);
      }
      ctx.closePath();
      return true;
    }
    case 6: {
      const t = r * 0.34;
      const p: [number, number][] = [
        [-t, -r], [t, -r], [t, -t], [r, -t], [r, t], [t, t],
        [t, r], [-t, r], [-t, t], [-r, t], [-r, -t], [-t, -t],
      ];
      p.forEach(([px, py], i) => punto(px, py, i === 0));
      ctx.closePath();
      return true;
    }
    case 8:
      ctx.ellipse(x, y, Math.max(0.1, r * sx), Math.max(0.1, r * sy), ang, 0, TAU);
      return false;
    default:
      ctx.ellipse(x, y, Math.max(0.1, r * sx), Math.max(0.1, r * sy), ang, 0, TAU);
      return true;
  }
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
    // De dónde nacen los anillos y las baldosas: del dedo si lo hay, y si no del primer fantasma.
    const origen = dedo ? centros[2] : centros[0];

    // ------------------------------------------------------ los anillos
    for (const a of this.anillos) a.edad += e.delta;
    this.anillos = this.anillos.filter((a) => a.edad < VIDA_ANILLO);
    if (reaccion > 0.05 && bandas.golpe > 0.55 && this.golpePrevio <= 0.55) {
      this.lanzar(origen.x, origen.y, 0.6 + 0.4 * bandas.golpe);
    }
    this.golpePrevio = bandas.golpe;
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
    const alturaPx = sp * (0.15 + p.altura * 1.7) * (1 + reaccion * bandas.graves * 0.9 + sacudon * 1.2);
    const radioBase = sp * (0.1 + p.tamano * 0.4) * (1 + zoom * 0.8);
    const celeridad = (0.35 + p.ondulacion * 0.4) * mayor; // px/s del anillo
    const imgAmt = e.imagen ? e.influenciaImagen : 0;
    const proporcion = w / Math.max(1, h);
    // La amplitud y el destello suben la opacidad: con la pieza sonando todo brilla más.
    const brillo = bandas.amplitud * reaccion * 0.25 + Math.exp(-e.edadGolpe.destello * 6) * 0.35;

    const forma = Math.round(p.forma);
    const trama = Math.round(p.trama);
    const lados = Math.round(p.lados);
    ctx.lineCap = 'round';

    // La trama de bits: de qué familia de curvas, cuánto se ha corrido y cuánto se ve.
    const ciclo = this.fase / 26;
    const familia = FAMILIAS_XOR[Math.floor(ciclo) % FAMILIAS_XOR.length];
    const fraccion = ciclo % 1;
    const visto = Math.min(1, fraccion / 0.2, (1 - fraccion) / 0.2);
    const filasPot = 2 ** Math.ceil(Math.log2(Math.max(2, filas)));
    const corrida = Math.floor(this.fase * p.desplazamiento * 0.6);
    const tFase = Math.floor(this.fase * 0.5);
    // Las baldosas: cuánto dura cada una y de qué lado de la rampa de color van.
    const periodoBaldosa = 9;
    const reloj = this.fase * 0.55;

    for (let gy = 0; gy < filas; gy++) {
      const py = y0 + gy * sp;
      for (let gx = 0; gx < cols; gx++) {
        const px = x0 + gx * sp;
        const azarCelda = azar(gx, gy);

        // ---- ¿esta casilla se enciende, y con qué luz?
        let luz = 1;
        let capa = 0;
        let sx = 1;
        let sy = 1;
        let desliz = 0;
        let rotBaldosa = 0;
        let tonoBaldosa = -1;

        if (trama === 1) {
          // Munching squares: y = (x XOR t) mod filas, para cada t de la familia.
          const lx = gx + corrida + 1048576;
          let enciende = -1;
          for (let k = 0; k < familia.length; k++) {
            if (((lx ^ (familia[k] + tFase)) % filasPot) === gy) {
              enciende = k;
              break;
            }
          }
          if (enciende < 0) continue;
          capa = enciende / familia.length;
          luz = (0.35 + 0.65 * (0.3 + 0.7 * (1 - capa))) * visto;
        } else if (trama === 2) {
          // Sierpinski: x AND y = 0, corriendo y transformándose con el tiempo.
          const lx = gx + corrida + 1048576;
          if (((lx + tFase) & gy) !== 0) continue;
          capa = (gy % 8) / 8;
          luz = (0.55 + 0.45 * Math.sin(this.fase * 0.4 + gy * 0.2) * 0.5 + 0.25) * visto;
        } else if (trama === 3) {
          // Baldosas: cada una entra por etapas, retrasada por su distancia al origen.
          const retraso = (Math.hypot(px - origen.x, py - origen.y) / mayor) * 4.5 + azarCelda * 0.6;
          const t = (reloj - retraso) % periodoBaldosa;
          const u = (t < 0 ? t + periodoBaldosa : t) / periodoBaldosa; // 0..1
          const movimiento = Math.floor(azarCelda * 4.99);
          const dir = Math.floor(azar(gx + 7, gy + 3) * 4) * (Math.PI / 2);
          // 0..0.22 primera etapa · 0.22..0.44 segunda · quieta hasta 0.9 · luego se va
          const n1 = suave(Math.min(1, u / 0.22));
          const n2 = suave(Math.max(0, Math.min(1, (u - 0.22) / 0.22)));
          const sale = suave(Math.max(0, Math.min(1, (u - 0.9) / 0.1)));
          let escala = 0;
          if (movimiento === 0) {
            // Un cuadro que llega deslizando desde fuera y crece.
            desliz = sp * 3 * (1 - n1);
            escala = n1;
          } else if (movimiento === 1) {
            // Sale a un lado, vuelve y se redondea.
            desliz = sp * 2 * Math.sin(Math.min(1, u / 0.44) * Math.PI) * (1 - n2);
            escala = 0.5 * n1 + 0.5 * n2;
          } else if (movimiento === 2) {
            // Gira una vuelta entera mientras crece.
            rotBaldosa = TAU * n1;
            escala = n1;
          } else if (movimiento === 3) {
            // Una cortina que se abre y se da la vuelta.
            sy = Math.max(0.02, n1);
            rotBaldosa = Math.PI * (1 - n2);
            escala = 1;
          } else {
            // Se abre desde el centro.
            escala = 0.35 + 0.65 * n2;
            sx = n1;
            sy = n1;
            desliz = sp * 0.4 * (1 - n2);
          }
          escala *= 1 - sale;
          if (escala < 0.02) continue;
          sx *= escala;
          sy *= escala;
          // Colores: de uno al azar de la paleta a uno claro, a medida que avanza.
          tonoBaldosa = azarCelda * 0.6 + 0.35 * (n1 + n2) * 0.5;
          luz = 0.9;
          capa = dir; // la dirección de la que llega, para el desplazamiento
        }

        // ---- la ola: cada centro manda un seno que se retrasa con la distancia
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
          z += peso * Math.sin(this.fase - (d / largo) * TAU);
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

        // El imán: junta las figuras hacia el centro (o las aparta, si es negativo).
        const ex = cx - px;
        const ey = cy - py;
        const dc = Math.hypot(ex, ey) + 1e-3;
        const tiro = p.iman * caidaMejor * sp * 2.2;
        let x = px + (ex / dc) * tiro;
        let y = py + (ey / dc) * tiro + z * alturaPx;
        if (trama === 3 && desliz !== 0) {
          x += Math.cos(capa) * desliz;
          y += Math.sin(capa) * desliz;
        }

        // ---- tamaño y color salen de la altura de la ola
        const nz = Math.max(0, Math.min(1, z * 0.5 + 0.5));
        let radio: number;
        let tono: number;
        let alfa: number;
        if (trama === 1 || trama === 2) {
          // Como en la referencia: el seno modula el tamaño y el brillo.
          const onda = Math.sin((gx + corrida) * 0.12 + gy * 0.12 - this.fase * 0.6);
          radio = sp * (0.2 + 0.28 * p.tamano * 2) * (0.45 + 0.47 * (onda * 0.5 + 0.5)) * (1 + z * 0.15);
          tono = Math.max(0, Math.min(1, 0.15 + (1 - capa) * 0.55 + (onda * 0.5 + 0.5) * 0.3 + nz * 0.15));
          alfa = 0.3 + 0.7 * luz;
        } else if (trama === 3) {
          radio = sp * (0.22 + p.tamano * 0.5) * (1 + z * 0.12);
          tono = Math.max(0, Math.min(1, tonoBaldosa + nz * 0.15));
          alfa = 0.85;
        } else {
          radio = radioBase * (0.45 + 1.1 * nz);
          tono = nz * 0.78 + caidaMejor * 0.22;
          alfa = 0.35 + nz * 0.6;
        }
        radio *= 1 + reaccion * bandas.agudos * 0.8 * azarCelda;

        if (imgAmt > 0 && e.imagen) {
          const m = e.imagen.muestra(px / w, py / h, proporcion);
          radio *= 1 - imgAmt + imgAmt * (0.3 + 1.2 * m.l);
          tono = tono * (1 - imgAmt) + m.l * imgAmt;
        }
        if (radio < 0.4) continue;

        const [r, g, b] = rampa(e.paleta, tono);
        const color = `rgba(${r},${g},${b},${Math.min(1, alfa + brillo).toFixed(3)})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        // ---- la figura
        let tipo = forma;
        if (forma === 9) tipo = SORTEABLES[Math.floor(azar(gx * 3 + 1, gy * 5 + 2) * SORTEABLES.length)];
        // El giro de las figuras acompaña a la ola.
        const giro = p.giro * (z * 1.4 + this.fase * 0.25) + (trama === 3 ? rotBaldosa : 0);

        if (tipo === 7) {
          // Agujas de brújula: apuntan al centro y se tuercen con la ola.
          const ang = Math.atan2(ey, ex) + z * 0.7 + (trama === 3 ? rotBaldosa : 0);
          ctx.lineWidth = Math.max(1, radio * 0.6);
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(ang) * radio * 1.5 * sx, y - Math.sin(ang) * radio * 1.5 * sy);
          ctx.lineTo(x + Math.cos(ang) * radio * 1.5 * sx, y + Math.sin(ang) * radio * 1.5 * sy);
          ctx.stroke();
        } else {
          const relleno = trazar(ctx, tipo, x, y, radio, giro, lados, sx, sy);
          if (relleno) ctx.fill();
          else {
            ctx.lineWidth = Math.max(1, radio * 0.32);
            ctx.stroke();
          }
        }
      }
    }
  }
}

export const marejada: Algoritmo = {
  id: 'marejada',
  nombre: 'Marejada de formas',
  descripcion:
    'Una rejilla de figuras que oscila alrededor de lo que la toca: tu dedo, dos fantasmas que pasean y, con cada bombo, un anillo como una piedra en el agua. Cambia la figura y la trama y sale otra obra.',
  escucha: 'Los graves alzan la ola · el bombo lanza un anillo · los agudos hacen centellear',
  conImagen: 'La foto decide el tamaño y el color de cada figura: el retrato aparece hecho de olas',
  conDatos: 'Cada dato (y tu dedo) es un centro del que nace la ola',
  mandos: [
    eleccion('forma', 'Figura', FORMAS, 0),
    eleccion('trama', 'Trama', TRAMAS, 0),
    { id: 'lados', etiqueta: 'Lados / puntas', min: 3, max: 10, paso: 1, valor: 5, lectura: (v) => `${Math.round(v)}` },
    { id: 'giro', etiqueta: 'Giro de las figuras', min: 0, max: 1, paso: 0.02, valor: 0, lectura: porcentaje },
    { id: 'densidad', etiqueta: 'Separación', min: 12, max: 48, paso: 1, valor: 24, lectura: (v) => `${Math.round(v)} px` },
    { id: 'tamano', etiqueta: 'Tamaño de las figuras', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'altura', etiqueta: 'Altura de la ola', min: 0, max: 1, paso: 0.02, valor: 0.6, lectura: porcentaje },
    { id: 'ondulacion', etiqueta: 'Largo de la onda', min: 0, max: 1, paso: 0.02, valor: 0.35, lectura: porcentaje },
    { id: 'alcance', etiqueta: 'Hasta dónde llega el toque', min: 0, max: 1, paso: 0.02, valor: 0.55, lectura: porcentaje },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 3, paso: 0.05, valor: 1, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'desplazamiento', etiqueta: 'Desplazamiento (tramas de bits)', min: 0, max: 2, paso: 0.05, valor: 0.6, lectura: (v) => `${v.toFixed(2)}×` },
    {
      id: 'iman',
      etiqueta: 'Imán (aparta ↔ junta)',
      min: -1,
      max: 1,
      paso: 0.02,
      valor: 0.25,
      lectura: (v) => (Math.abs(v) < 0.05 ? 'sin imán' : v > 0 ? `junta ${Math.round(v * 100)}%` : `aparta ${Math.round(-v * 100)}%`),
    },
    { id: 'estela', etiqueta: 'Estela', min: 0, max: 0.95, paso: 0.02, valor: 0.3, lectura: porcentaje },
  ],
  crear: (lienzo) => new Marejada(lienzo),
};
