/**
 * Motor visual: el que hace girar el bucle.
 *
 * React no habla con los algoritmos. Le dice al motor qué algoritmo quiere,
 * con qué mandos, con qué imagen y con qué datos, y el motor se encarga del
 * lienzo, del tamaño y de los sesenta cuadros por segundo.
 *
 * Dos detalles que no son evidentes:
 *
 *  - **El lienzo se vuelve a crear al cambiar de algoritmo.** Un canvas
 *    solo admite un tipo de contexto en toda su vida: el que pidió 2D no
 *    puede dar WebGL después. Por eso el motor recibe un contenedor y no un
 *    canvas, y planta uno nuevo cada vez.
 *  - **La resolución interna no es la de la pantalla.** Se trabaja a un
 *    tamaño acotado y el CSS lo estira: en la tablet del evento eso es la
 *    diferencia entre ir fluido y arrastrarse, y a esta distancia no se
 *    nota.
 */
import { analizador, type Bandas } from './analizador';
import { algoritmoDe, fijarAlfabeto } from './algoritmos';
import type { Algoritmo, Entorno, Instancia, NombreAlgoritmo } from './algoritmos/tipos';
import type { CampoImagen } from './imagenDatos';
import type { Pico } from './datosVisual';
import { enVivo } from './enVivo';

/** Lado mayor de la resolución interna. */
const LADO_TACTIL = 720;
const LADO_ESCRITORIO = 1100;

const BANDAS_QUIETAS: Bandas = { graves: 0, medios: 0, agudos: 0, amplitud: 0, golpe: 0 };

export interface Ajustes {
  algoritmo: NombreAlgoritmo;
  parametros: Record<string, number>;
  paleta: string[];
  alfabeto: string;
  reaccion: number;
  imagen: CampoImagen | null;
  influenciaImagen: number;
  picos: Pico[];
  influenciaDatos: number;
  movimientoDatos: number;
  semilla: number;
  /** El dedo sobre el cuadro de tocar en vivo, con la y hacia abajo. */
  toque: { x: number; y: number } | null;
}

class MotorVisual {
  private contenedor: HTMLElement | null = null;
  private lienzo: HTMLCanvasElement | null = null;
  private instancia: Instancia | null = null;
  private algoritmo: Algoritmo | null = null;
  private observador: ResizeObserver | null = null;
  private cuadro: number | null = null;
  private inicio = 0;
  private ultimo = 0;
  private ancho = 1;
  private alto = 1;
  private pausado = false;

  /** Si un algoritmo no arranca —WebGL ausente, por ejemplo—, se dice. */
  fallo: string | null = null;
  private avisarFallo: ((mensaje: string | null) => void) | null = null;

  private ajustes: Ajustes = {
    algoritmo: 'flujo',
    parametros: {},
    paleta: ['#0d1014', '#b87a0d', '#ffb020', '#ff5d73', '#2ee6a8'],
    alfabeto: 'sonora',
    reaccion: 0.8,
    imagen: null,
    influenciaImagen: 0.75,
    picos: [],
    influenciaDatos: 0.7,
    movimientoDatos: 0,
    semilla: 2310,
    toque: null,
  };

  iniciar(contenedor: HTMLElement, alFallar: (mensaje: string | null) => void): void {
    this.contenedor = contenedor;
    this.avisarFallo = alFallar;
    this.inicio = performance.now();
    this.ultimo = this.inicio;

    this.observador = new ResizeObserver(() => this.medir());
    this.observador.observe(contenedor);

    this.montar();
    this.cuadro = requestAnimationFrame(this.paso);
  }

  detener(): void {
    if (this.cuadro !== null) cancelAnimationFrame(this.cuadro);
    this.cuadro = null;
    this.observador?.disconnect();
    this.observador = null;
    this.instancia?.destruir?.();
    this.instancia = null;
    this.lienzo?.remove();
    this.lienzo = null;
    this.contenedor = null;
    this.avisarFallo = null;
  }

  /** El canvas que se está pintando, para componerlo al exportar. */
  get lienzoActual(): HTMLCanvasElement | null {
    return this.lienzo;
  }

  get activo(): boolean {
    return this.cuadro !== null;
  }

  pausar(pausado: boolean): void {
    this.pausado = pausado;
  }

  get enPausa(): boolean {
    return this.pausado;
  }

  actualizar(cambios: Partial<Ajustes>): void {
    const cambiaAlgoritmo =
      cambios.algoritmo !== undefined && cambios.algoritmo !== this.ajustes.algoritmo;
    this.ajustes = { ...this.ajustes, ...cambios };
    if (cambiaAlgoritmo) this.montar();
    else if (cambios.alfabeto && this.instancia) fijarAlfabeto(this.instancia, cambios.alfabeto);
  }

  /** El PNG de lo que se está viendo, para llevárselo. */
  aPng(): string | null {
    return this.lienzo?.toDataURL('image/png') ?? null;
  }

  // ------------------------------------------------------------------ dentro

  private montar(): void {
    const contenedor = this.contenedor;
    if (!contenedor) return;

    this.instancia?.destruir?.();
    this.instancia = null;
    this.lienzo?.remove();

    const lienzo = document.createElement('canvas');
    lienzo.className = 'obra__lienzo';
    contenedor.appendChild(lienzo);
    this.lienzo = lienzo;

    this.algoritmo = algoritmoDe(this.ajustes.algoritmo);
    try {
      this.instancia = this.algoritmo.crear(lienzo);
      this.fallo = null;
    } catch (error) {
      this.instancia = null;
      this.fallo = error instanceof Error ? error.message : 'No se pudo arrancar el algoritmo';
    }
    this.avisarFallo?.(this.fallo);

    fijarAlfabeto(this.instancia ?? ({} as Instancia), this.ajustes.alfabeto);
    this.medir();
  }

  private medir(): void {
    const contenedor = this.contenedor;
    const lienzo = this.lienzo;
    if (!contenedor || !lienzo) return;

    const caja = contenedor.getBoundingClientRect();
    const anchoCss = Math.max(1, caja.width);
    const altoCss = Math.max(1, caja.height);
    const tactil = matchMedia('(pointer: coarse)').matches;
    const tope = tactil ? LADO_TACTIL : LADO_ESCRITORIO;
    const escala = Math.min(1, tope / Math.max(anchoCss, altoCss));

    this.ancho = Math.max(1, Math.round(anchoCss * escala));
    this.alto = Math.max(1, Math.round(altoCss * escala));
    lienzo.width = this.ancho;
    lienzo.height = this.alto;
    this.instancia?.redimensionar(this.ancho, this.alto);
  }

  private paso = (): void => {
    this.cuadro = requestAnimationFrame(this.paso);
    const instancia = this.instancia;
    if (!instancia || this.pausado) return;

    const ahora = performance.now();
    const delta = Math.min(0.05, (ahora - this.ultimo) / 1000);
    this.ultimo = ahora;

    const bandas = analizador.conectado ? analizador.medir() : BANDAS_QUIETAS;
    const a = this.ajustes;

    // El dedo es un pico más: un remolino en la nebulosa y el flujo, una montaña
    // en las ondas, un racimo en los glifos. Así todos los algoritmos le hacen
    // caso sin saber que existe el cuadro de tocar.
    const dedo: Pico[] = a.toque
      ? [{ x: a.toque.x, y: a.toque.y, fuerza: 1, radio: 0.3, giro: 1, nombre: 'dedo' }]
      : [];

    const entorno: Entorno = {
      ancho: this.ancho,
      alto: this.alto,
      tiempo: (ahora - this.inicio) / 1000,
      delta,
      bandas,
      reaccion: a.reaccion,
      imagen: a.imagen,
      influenciaImagen: a.influenciaImagen,
      picos: [...a.picos, ...dedo],
      influenciaDatos: a.toque ? Math.max(a.influenciaDatos, 0.9) : a.influenciaDatos,
      movimientoDatos: a.movimientoDatos,
      parametros: a.parametros,
      paleta: a.paleta,
      semilla: a.semilla,
      toque: a.toque,
      edadGolpe: enVivo.edades(),
    };

    try {
      instancia.dibujar(entorno);
    } catch (error) {
      // Un algoritmo que revienta no puede llevarse la app por delante.
      this.instancia = null;
      this.fallo = error instanceof Error ? error.message : 'El algoritmo falló';
      this.avisarFallo?.(this.fallo);
    }
  };
}

export const motorVisual = new MotorVisual();
