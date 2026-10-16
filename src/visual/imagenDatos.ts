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
