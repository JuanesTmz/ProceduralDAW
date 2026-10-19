/**
 * La imagen convertida en DATOS.
 *
 * Esta es la diferencia que pidió el encargo: la foto no se pega encima del
 * visual, se lee. Se descarga a un canvas pequeño, se saca su mapa de
 * píxeles y se ofrece como un campo que cualquier algoritmo puede consultar:
 * «¿qué tan clara es la imagen en este punto?», «¿hacia dónde crece la luz?».
 *
 * A partir de ahí cada algoritmo la usa a su manera —como relieve, como
 * densidad de glifos, como corriente que empuja partículas— y la imagen
 * gobierna la obra sin aparecer nunca tal cual. Que es lo que separa usar
 * datos de poner un fondo.
 *
 * Se guarda a 320 px de lado como mucho: a esa resolución el campo ya es
 * suave y la tablet no tiene que mover un bitmap grande en cada cuadro.
 */

const LADO_MAXIMO = 320;

/** Cuántas columnas tiene cada canal: la foto se lee de izquierda a derecha en estos tramos. */
export const COLUMNAS_CANAL = 64;
/** Los bits de la foto: una cuadrícula de 16 × 16 encendidos o apagados. */
export const LADO_BITS = 16;

export type CanalFoto = 'luz' | 'rojo' | 'verde' | 'azul' | 'tono' | 'saturacion' | 'detalle' | 'bits';

/** Cada canal de la foto: una lista de 0..1 (los bits, 0 o 1, en una cuadrícula de 16 × 16). */
export type CanalesFoto = Record<CanalFoto, number[]>;

export interface Muestra {
  /** Luminancia 0..1. */
  l: number;
  r: number;
  g: number;
  b: number;
}

export class CampoImagen {
  private pixeles: Uint8ClampedArray;
  readonly ancho: number;
  readonly alto: number;
  /**
   * El mismo bitmap como canvas. Los algoritmos de CPU leen `pixeles`; el de
   * GPU necesita algo que se pueda subir como textura, y es este.
   */
  readonly fuente: HTMLCanvasElement;

  private constructor(
    pixeles: Uint8ClampedArray,
    ancho: number,
    alto: number,
    fuente: HTMLCanvasElement,
  ) {
    this.pixeles = pixeles;
    this.ancho = ancho;
    this.alto = alto;
    this.fuente = fuente;
  }

  get proporcion(): number {
    return this.alto ? this.ancho / this.alto : 1;
  }

  /** Carga una imagen y la deja lista para consultar. */
  static async desdeUrl(url: string): Promise<CampoImagen> {
    const imagen = await new Promise<HTMLImageElement>((listo, falla) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => listo(img);
      img.onerror = () => falla(new Error('No se pudo leer la imagen'));
      img.src = url;
    });

    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const ancho = Math.max(2, Math.round(imagen.width * escala));
    const alto = Math.max(2, Math.round(imagen.height * escala));

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Este navegador no deja leer la imagen');
    ctx.drawImage(imagen, 0, 0, ancho, alto);

    return new CampoImagen(ctx.getImageData(0, 0, ancho, alto).data, ancho, alto, lienzo);
  }

  /**
   * Consulta en coordenadas de pantalla 0..1, con la imagen encajada por
   * «cover» —se recorta por el lado que sobra en vez de deformarse—, que es
   * lo que uno espera al poner una foto de fondo.
   */
  muestra(u: number, v: number, proporcionLienzo: number): Muestra {
    const pi = this.proporcion;
    let iu = u;
    let iv = v;
    if (pi > proporcionLienzo) iu = 0.5 + (u - 0.5) * (proporcionLienzo / pi);
    else iv = 0.5 + (v - 0.5) * (pi / proporcionLienzo);

    const x = Math.min(this.ancho - 1, Math.max(0, (iu * this.ancho) | 0));
    const y = Math.min(this.alto - 1, Math.max(0, (iv * this.alto) | 0));
    const i = (y * this.ancho + x) * 4;
    const r = this.pixeles[i] / 255;
    const g = this.pixeles[i + 1] / 255;
    const b = this.pixeles[i + 2] / 255;
    return { l: 0.299 * r + 0.587 * g + 0.114 * b, r, g, b };
  }

  private memoCanales: CanalesFoto | null = null;
  private memoColores: string[] | null = null;

  /** Los cinco colores más presentes de la foto, como una paleta. */
  colores(): string[] {
    if (this.memoColores) return this.memoColores;
    const cubos = new Map<string, number>();
    for (let y = 0; y < this.alto; y += 3) {
      for (let x = 0; x < this.ancho; x += 3) {
        const i = (y * this.ancho + x) * 4;
        const clave = [0, 1, 2].map((k) => Math.round(this.pixeles[i + k] / 51) * 51).join(',');
        cubos.set(clave, (cubos.get(clave) ?? 0) + 1);
      }
    }
    this.memoColores = [...cubos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => `#${k.split(',').map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`);
    return this.memoColores;
  }

  /**
   * La foto desmenuzada en datos. Por cada columna (de izquierda a derecha) se
   * sacan la luz, el rojo, el verde, el azul, el tono, lo intenso del color y
   * cuánto detalle hay (los bordes). Y aparte, los «bits»: la foto reducida a
   * 16 × 16 casillas que quedan encendidas (más claras que la mediana) o
   * apagadas. Se calcula una vez y se guarda.
   */
  canales(): CanalesFoto {
    if (this.memoCanales) return this.memoCanales;
    const n = COLUMNAS_CANAL;
    const sal: CanalesFoto = {
      luz: [], rojo: [], verde: [], azul: [], tono: [], saturacion: [], detalle: [], bits: [],
    };
    const px = this.pixeles;
    const redondo = (v: number) => Math.round(v * 1000) / 1000;
    const luzEn = (x: number, y: number) => {
      const i = (y * this.ancho + x) * 4;
      return (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    };
    for (let c = 0; c < n; c++) {
      const x0 = Math.floor((c * this.ancho) / n);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * this.ancho) / n));
      let lu = 0, ro = 0, ve = 0, az = 0, sa = 0, de = 0, sx = 0, sy = 0, cuenta = 0;
      for (let y = 0; y < this.alto; y += 2) {
        for (let x = x0; x < x1 && x < this.ancho; x++) {
          const i = (y * this.ancho + x) * 4;
          const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          const sat = mx > 0 ? (mx - mn) / mx : 0;
          let h = 0;
          if (mx > mn) {
            if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6;
            else if (mx === g) h = (b - r) / (mx - mn) + 2;
            else h = (r - g) / (mx - mn) + 4;
          }
          // El tono es un círculo: se promedia con vectores, ponderado por lo intenso.
          sx += Math.cos((h / 6) * Math.PI * 2) * sat;
          sy += Math.sin((h / 6) * Math.PI * 2) * sat;
          lu += 0.299 * r + 0.587 * g + 0.114 * b;
          ro += r; ve += g; az += b; sa += sat;
          if (x + 1 < this.ancho && y + 1 < this.alto) {
            de += Math.abs(luzEn(x, y) - luzEn(x + 1, y)) + Math.abs(luzEn(x, y) - luzEn(x, y + 1));
          }
          cuenta++;
        }
      }
      const k = Math.max(1, cuenta);
      sal.luz.push(redondo(lu / k));
      sal.rojo.push(redondo(ro / k));
      sal.verde.push(redondo(ve / k));
      sal.azul.push(redondo(az / k));
      sal.saturacion.push(redondo(sa / k));
      sal.detalle.push(redondo(Math.min(1, (de / k) * 5)));
      const ang = Math.atan2(sy, sx);
      sal.tono.push(redondo(((ang / (Math.PI * 2)) + 1) % 1));
    }
    // Los bits: 16 × 16 casillas, encendida si es más clara que la mediana.
    const lado = LADO_BITS;
    const celdas: number[] = [];
    for (let fy = 0; fy < lado; fy++) {
      for (let fx = 0; fx < lado; fx++) {
        const xa = Math.floor((fx * this.ancho) / lado);
        const xb = Math.max(xa + 1, Math.floor(((fx + 1) * this.ancho) / lado));
        const ya = Math.floor((fy * this.alto) / lado);
        const yb = Math.max(ya + 1, Math.floor(((fy + 1) * this.alto) / lado));
        let s = 0, q = 0;
        for (let y = ya; y < yb && y < this.alto; y++) for (let x = xa; x < xb && x < this.ancho; x++) { s += luzEn(x, y); q++; }
        celdas.push(s / Math.max(1, q));
      }
    }
    const ordenadas = [...celdas].sort((a, b) => a - b);
    const mediana = ordenadas[Math.floor(ordenadas.length / 2)];
    sal.bits = celdas.map((v) => (v > mediana ? 1 : 0));
    this.memoCanales = sal;
    return sal;
  }

  /** Solo la luminancia, que es lo que piden los algoritmos en el bucle. */
  luz(u: number, v: number, proporcionLienzo: number): number {
    return this.muestra(u, v, proporcionLienzo).l;
  }

  /**
   * Hacia dónde crece la luz, en 0..1 de pantalla. Girado 90° da la dirección
   * en la que una partícula bordea la silueta en vez de cruzarla: es lo que
   * hace que el dibujo se reconozca sin pintarlo.
   */
  pendiente(u: number, v: number, proporcionLienzo: number, paso = 0.01): [number, number] {
    const dx = this.luz(u + paso, v, proporcionLienzo) - this.luz(u - paso, v, proporcionLienzo);
    const dy = this.luz(u, v + paso, proporcionLienzo) - this.luz(u, v - paso, proporcionLienzo);
    return [dx, dy];
  }
}

/**
 * Las fotos ya cargadas, por url. Las usan el visual (como relieve) y los
 * datos (como canales): se baja una sola vez y se comparte.
 */
const guardadas = new Map<string, CampoImagen | 'cargando'>();

/** La foto de esa url si ya está lista; si no, empieza a cargarla y devuelve null por ahora. */
export function campoDe(url: string | undefined): CampoImagen | null {
  if (!url) return null;
  const g = guardadas.get(url);
  if (g instanceof CampoImagen) return g;
  if (!g) {
    guardadas.set(url, 'cargando');
    CampoImagen.desdeUrl(url)
      .then((c) => guardadas.set(url, c))
      .catch(() => guardadas.delete(url));
  }
  return null;
}
