// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
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
 *    nota. (Varios algoritmos miden en píxeles: cambiar este tamaño cambia
 *    cómo se ven las corrientes, los glifos y las líneas.)
 *  - **Al exportar el video, el tamaño es fijo** (16:9, el del video) y se
 *    pinta a 30 cuadros parejos: tras cada cuadro el motor avisa, y la
 *    exportación lo copia en ese mismo instante (un lienzo WebGL se borra
 *    después de mostrarse).
 */
import { analizador, type Bandas } from './analizador';
import { algoritmoDe } from './algoritmos';
import type { Algoritmo, Entorno, Instancia, NombreAlgoritmo } from './algoritmos/tipos';
import type { CampoImagen } from './imagenDatos';
import type { Pico } from './datosVisual';
import { enVivo } from './enVivo';

/** Lado mayor de la resolución interna. */
const LADO_TACTIL = 720;
const LADO_ESCRITORIO = 1100;
/**
 * Lo mínimo que puede bajar la calidad automática. Era 0,45 y el visual
 * terminaba pixelado; con 0,6 la tablet sigue teniendo dónde ahorrar.
 */
const CALIDAD_MINIMA = 0.6;

/** Lo que pide la exportación del video mientras graba. */
export interface ModoExportar {
  ancho: number;
  alto: number;
  /** Cada cuántos milisegundos se pinta un cuadro (33 para 30 por segundo). */
  cadaMs: number;
  /** Se llama justo después de pintar cada cuadro. */
  alPintar: () => void;
}

/** Cómo se ve la obra entera (los mandos Zoom, Giro, Brillo, Tono y Saturación). */
export interface EstiloObra {
  escala: number;
  /** Grados. */
  giro: number;
  /** Filtro CSS, o 'none'. */
  filtro: string;
}

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
  /** El texto de la escena que suena. */
  texto: string;
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
  /**
   * Cuánto de la resolución se usa, de CALIDAD_MINIMA a 1. Baja sola si la
   * pantalla va lenta de forma sostenida (una tablet con poca GPU) y vuelve a
   * subir si le sobra.
   */
  private calidad = 1;
  private muestraRendimiento = { desde: 0, tiempos: [] as number[], buenas: 0 };
  private pausado = false;
  private exportar: ModoExportar | null = null;
  private ultimoPintado = 0;
  /** Exportando, cuánto del tamaño pedido se usa (1 a 0,67): baja solo si la tablet no da abasto. */
  private escalaExportar = 1;
  private muestraExportar = { desde: 0, cuadros: 0, primera: true };

  /**
   * El escenario aplica Zoom, Giro y los filtros con CSS sobre el lienzo; aquí
   * los deja anotados para que el video exportado se vea igual.
   */
  obra: EstiloObra = { escala: 1, giro: 0, filtro: 'none' };

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
    texto: '',
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

  /**
   * Mientras se exporta el video: lienzo de tamaño fijo, cuadros parejos y un
   * aviso después de cada uno. Con null vuelve a lo de siempre.
   */
  modoExportar(modo: ModoExportar | null): void {
    this.exportar = modo;
    this.escalaExportar = 1;
    this.muestraExportar = { desde: 0, cuadros: 0, primera: true };
    this.muestraRendimiento.desde = 0;
    this.medir();
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

    this.medir();
  }

  private medir(): void {
    const contenedor = this.contenedor;
    const lienzo = this.lienzo;
    if (!contenedor || !lienzo) return;

    if (this.exportar) {
      // El tamaño del video: el escenario lo muestra recortado (object-fit: cover).
      this.ancho = Math.round(this.exportar.ancho * this.escalaExportar);
      this.alto = Math.round(this.exportar.alto * this.escalaExportar);
      if (lienzo.width !== this.ancho || lienzo.height !== this.alto) {
        lienzo.width = this.ancho;
        lienzo.height = this.alto;
        this.instancia?.redimensionar(this.ancho, this.alto);
      }
      return;
    }

    const caja = contenedor.getBoundingClientRect();
    const anchoCss = Math.max(1, caja.width);
    const altoCss = Math.max(1, caja.height);
    const tactil = matchMedia('(pointer: coarse)').matches;
    const tope = tactil ? LADO_TACTIL : LADO_ESCRITORIO;
    const escala = Math.min(1, tope / Math.max(anchoCss, altoCss)) * this.calidad;

    this.ancho = Math.max(1, Math.round(anchoCss * escala));
    this.alto = Math.max(1, Math.round(altoCss * escala));
    lienzo.width = this.ancho;
    lienzo.height = this.alto;
    this.instancia?.redimensionar(this.ancho, this.alto);
  }

  /**
   * Cada dos segundos mira cuánto tardan los cuadros. Si la MEDIANA pasa de
   * 38 ms (menos de ~26 por segundo) baja la resolución un escalón; con
   * holgura sostenida, la sube.
   *
   * Es la mediana y no el promedio a propósito: al tocar la pantalla (mover
   * un deslizador, soltar una cajita) React redibuja y hay tirones sueltos;
   * con el promedio, cada uno bajaba la calidad y, como subir es más lento
   * que bajar, el visual terminaba pixelado. Solo la lentitud de verdad
   * (la mitad de los cuadros lentos) la baja.
   */
  private vigilarRendimiento(ahora: number, real: number): void {
    const m = this.muestraRendimiento;
    // Una pausa, otra pestaña o un cambio de algoritmo no cuentan.
    if (real > 250 || m.desde === 0) {
      m.desde = ahora;
      m.tiempos.length = 0;
      return;
    }
    m.tiempos.push(real);
    if (ahora - m.desde < 2000) return;
    const orden = m.tiempos.slice().sort((x, y) => x - y);
    const mediana = orden[Math.floor(orden.length / 2)];
    m.desde = ahora;
    m.tiempos.length = 0;
    if (mediana > 38 && this.calidad > CALIDAD_MINIMA) {
      this.calidad = Math.max(CALIDAD_MINIMA, this.calidad * 0.85);
      m.buenas = 0;
      this.medir();
    } else if (mediana < 20 && this.calidad < 1) {
      // Dos muestras seguidas con holgura para subir: si no, oscila.
      if (++m.buenas >= 2) {
        this.calidad = Math.min(1, this.calidad * 1.2);
        m.buenas = 0;
        this.medir();
      }
    } else if (mediana >= 20) m.buenas = 0;
  }

  /**
   * Exportando: si en dos segundos no salen ~22 cuadros por segundo, el
   * visual baja un escalón (nunca de 2/3 del tamaño pedido) para que el video
   * no salga a saltos. No vuelve a subir: así no oscila en plena grabación.
   * La primera muestra no cuenta (es el arranque de la grabadora).
   */
  private vigilarExportar(ahora: number): void {
    const m = this.muestraExportar;
    if (m.desde === 0) {
      m.desde = ahora;
      m.cuadros = 0;
      return;
    }
    m.cuadros++;
    if (ahora - m.desde < 2000) return;
    const mediaMs = (ahora - m.desde) / m.cuadros;
    m.desde = ahora;
    m.cuadros = 0;
    if (m.primera) {
      m.primera = false;
      return;
    }
    if (mediaMs > 45 && this.escalaExportar > 0.7) {
      this.escalaExportar = Math.max(0.67, this.escalaExportar * 0.85);
      this.medir();
    }
  }

  private paso = (): void => {
    this.cuadro = requestAnimationFrame(this.paso);
    const instancia = this.instancia;
    if (!instancia || this.pausado) return;

    const ahora = performance.now();
    // Exportando, cuadros parejos (30 por segundo): el video no da tirones y la tablet respira.
    if (this.exportar && ahora - this.ultimoPintado < this.exportar.cadaMs - 4) return;
    this.ultimoPintado = ahora;
    const real = ahora - this.ultimo;
    const delta = Math.min(0.05, real / 1000);
    this.ultimo = ahora;
    // Exportando, la resolución la cuida vigilarExportar (con un piso mucho más alto).
    if (this.exportar) this.vigilarExportar(ahora);
    else this.vigilarRendimiento(ahora, real);

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
      texto: a.texto,
      edadGolpe: enVivo.edades(),
    };

    try {
      instancia.dibujar(entorno);
    } catch (error) {
      // Un algoritmo que revienta no puede llevarse la app por delante.
      this.instancia = null;
      this.fallo = error instanceof Error ? error.message : 'El algoritmo falló';
      this.avisarFallo?.(this.fallo);
      return;
    }
    this.exportar?.alPintar();
  };
}

export const motorVisual = new MotorVisual();
