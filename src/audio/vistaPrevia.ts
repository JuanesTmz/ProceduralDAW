/**
 * El centro de escucha de todo lo que no es la pieza: probar un sonido,
 * oír una grabación de voz, un efecto propio o un instrumento.
 *
 * Solo suena una cosa a la vez, y eso incluye al motor: si arranca una
 * vista previa se para la pieza (y al revés). Cada botón ▶ le pregunta a
 * este centro si ES el que suena, así cambia a ❚❚ y se puede pausar.
 */
import { useSyncExternalStore } from 'react';

type Oyente = () => void;

interface Opciones {
  /** Segundo de la grabación donde empieza (un tramo de la voz de corrido). */
  desde?: number;
  /** Cuánto dura el tramo, en segundos. */
  duracion?: number;
}

class VistaPrevia {
  private actual: string | null = null;
  private audio: HTMLAudioElement | null = null;
  private reloj: number | null = null;
  private oyentes = new Set<Oyente>();
  /** Lo registra el motor: así esta clase no lo importa (evita el ciclo). */
  pararMotor: () => void = () => {};

  get activa(): string | null {
    return this.actual;
  }

  suscribir = (oyente: Oyente): (() => void) => {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  };

  private avisar() {
    for (const o of this.oyentes) o();
  }

  private soltar() {
    if (this.reloj !== null) window.clearTimeout(this.reloj);
    this.reloj = null;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.pause();
    }
    this.audio = null;
  }

  /** Para lo que suene aquí (no toca al motor). */
  parar() {
    if (this.actual === null) return;
    this.soltar();
    this.actual = null;
    this.avisar();
  }

  /** Para todo: la vista previa y la pieza. */
  pararTodo() {
    this.parar();
    this.pararMotor();
  }

  /** Suena `url` bajo `clave`; si ya sonaba esa clave, la para. */
  oir(clave: string, url: string, opciones: Opciones = {}) {
    if (this.actual === clave) return this.parar();
    this.soltar();
    this.pararMotor();
    const a = new Audio(url);
    this.audio = a;
    this.actual = clave;
    const terminar = () => {
      if (this.audio === a) this.parar();
    };
    a.onended = terminar;
    a.onerror = terminar;
    if (opciones.desde !== undefined) a.currentTime = opciones.desde;
    if (opciones.duracion !== undefined) this.reloj = window.setTimeout(terminar, opciones.duracion * 1000);
    void a.play().catch(terminar);
    this.avisar();
  }

  /**
   * Un golpe suelto (lo hace sonar el motor y dura poco): se marca como
   * «sonando» un instante para que su botón responda.
   */
  golpe(clave: string, disparar: () => void, ms = 700) {
    this.soltar();
    this.pararMotor();
    this.actual = clave;
    disparar();
    this.reloj = window.setTimeout(() => this.parar(), ms);
    this.avisar();
  }
}

export const vistaPrevia = new VistaPrevia();

/** Para los botones ▶: qué suena y cómo pedir o parar una vista previa. */
export function useVistaPrevia() {
  const activa = useSyncExternalStore(vistaPrevia.suscribir, () => vistaPrevia.activa);
  return {
    activa,
    suena: (clave: string) => activa === clave,
    oir: vistaPrevia.oir.bind(vistaPrevia),
    golpe: vistaPrevia.golpe.bind(vistaPrevia),
    parar: vistaPrevia.parar.bind(vistaPrevia),
  };
}
