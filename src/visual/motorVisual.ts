/**
 * Motor visual: envuelve Hydra y lo mantiene al día.
 *
 * Igual que con el audio, los componentes de React no hablan con Hydra:
 * le piden cosas a este motor ("usa este preset", "carga esta imagen")
 * y él se encarga del canvas y del bucle de dibujo.
 */
import Hydra from 'hydra-synth';
import { crearRng, mezclarSemilla } from '../generativo/rng';
import { analizador, type Bandas } from './analizador';
import { aplicarPreset, type ContextoVisual, type NombrePreset } from './presets';

/** Resolución interna del canvas. Modesta a propósito: los PC del evento no son potentes. */
export const ANCHO_VISUAL = 720;
export const ALTO_VISUAL = 405;

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Ajustes {
  preset: NombrePreset;
  semilla: number;
  mezclaImagen: number;
  intensidad: number;
  /** El cierre apaga también la imagen. */
  desvanecido: number;
}

class MotorVisual {
  private hydra: any = null;
  private lienzo: HTMLCanvasElement | null = null;
  private imagen: HTMLImageElement | null = null;
  private urlImagen: string | undefined;

  private ajustes: Ajustes = {
    preset: 'pulso',
    semilla: 2310,
    mezclaImagen: 0.6,
    intensidad: 1,
    desvanecido: 1,
  };

  /** Firma del último preset montado: evita rearmar la cadena en cada cuadro. */
  private firmaMontada = '';
  private inicio = 0;
  private cuadro: number | null = null;

  get activo(): boolean {
    return this.hydra !== null;
  }

  get canvas(): HTMLCanvasElement | null {
    return this.lienzo;
  }

  /** Arranca Hydra sobre un canvas. Idempotente por canvas. */
  iniciar(lienzo: HTMLCanvasElement): void {
    if (this.lienzo === lienzo && this.hydra) return;
    this.detener();

    lienzo.width = ANCHO_VISUAL;
    lienzo.height = ALTO_VISUAL;
    this.lienzo = lienzo;
    this.inicio = performance.now();

    this.hydra = new Hydra({
      canvas: lienzo,
      width: ANCHO_VISUAL,
      height: ALTO_VISUAL,
      // El audio lo analizamos nosotros desde Tone; el de Hydra sobra.
      detectAudio: false,
      // Sin variables globales: nada de ensuciar window.
      makeGlobal: false,
      autoLoop: true,
    });

    analizador.conectar();
    this.firmaMontada = '';
    this.montarPreset();
    this.arrancarBucle();
  }

  detener(): void {
    if (this.cuadro !== null) {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = null;
    }
    if (this.hydra) {
      try {
        this.hydra.synth?.hush?.();
      } catch {
        // Si Hydra ya se fue, no hay nada que apagar.
      }
    }
    this.hydra = null;
    this.lienzo = null;
    this.firmaMontada = '';
  }

  /** El bucle solo mide el audio; de dibujar se encarga Hydra. */
  private arrancarBucle(): void {
    const paso = () => {
      analizador.medir();
      this.cuadro = requestAnimationFrame(paso);
    };
    this.cuadro = requestAnimationFrame(paso);
  }

  actualizar(ajustes: Partial<Ajustes>): void {
    this.ajustes = { ...this.ajustes, ...ajustes };
    this.montarPreset();
  }

  /**
   * Rearma la cadena solo cuando cambia el preset o la semilla.
   * Todo lo demás (intensidad, mezcla, bandas) entra por funciones vivas,
   * así que no hace falta reconstruir nada para que reaccione.
   */
  private montarPreset(): void {
    if (!this.hydra) return;
    const { preset, semilla } = this.ajustes;
    const firma = `${preset}:${semilla}:${this.imagen ? 'img' : 'sin'}`;
    if (firma === this.firmaMontada) return;
    this.firmaMontada = firma;

    const rng = crearRng(mezclarSemilla(semilla, 'visual', preset));
    const contexto: ContextoVisual = {
      bandas: () => analizador.valores,
      intensidad: () => this.ajustes.intensidad,
      tiempo: () => (performance.now() - this.inicio) / 1000,
      mezclaImagen: () => this.ajustes.mezclaImagen,
      hayImagen: Boolean(this.imagen),
    };

    try {
      aplicarPreset(preset, this.hydra.synth, rng, contexto);
    } catch (error) {
      console.warn('[SONORA] No se pudo montar el preset visual', error);
    }
  }

  /** Carga la foto del tema como fuente de Hydra. */
  cargarImagen(url: string | undefined): void {
    if (this.urlImagen === url) return;
    this.urlImagen = url;

    if (!url) {
      this.imagen = null;
      this.firmaMontada = '';
      this.montarPreset();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.imagen = img;
      this.hydra?.synth?.s0?.init({ src: img });
      this.firmaMontada = '';
      this.montarPreset();
    };
    img.src = url;
  }

  get bandas(): Bandas {
    return analizador.valores;
  }
}

export const motorVisual = new MotorVisual();

// Solo en desarrollo: acceso desde la consola para diagnosticar el visual.
if (import.meta.env.DEV) {
  const global = globalThis as Record<string, any>;
  global.__sonoraVisual = { motorVisual, analizador, interno: () => (motorVisual as any).hydra };
}
