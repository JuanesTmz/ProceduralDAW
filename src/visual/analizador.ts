/**
 * El puente entre lo que suena y lo que se ve.
 *
 * Cuelga un AnalyserNode de la salida maestra de Tone y reparte el espectro
 * en tres bandas —graves, medios, agudos— más la amplitud general.
 * Esos cuatro números son los que mueven el visual en vivo.
 *
 * Los valores van suavizados: sin suavizar, el visual tiembla y marea;
 * con demasiado, va tarde respecto a la música.
 */
import * as Tone from 'tone';

export interface Bandas {
  /** 0..1 — bombo y bajo. */
  graves: number;
  /** 0..1 — cuerpo de la mezcla, redoblante, voz. */
  medios: number;
  /** 0..1 — hi-hats, aire, brillo. */
  agudos: number;
  /** 0..1 — volumen general (RMS). */
  amplitud: number;
  /** Sube de golpe cuando entra un golpe fuerte y baja despacio. */
  golpe: number;
}

/**
 * Cortes de las bandas, en Hz.
 * El techo de agudos se queda en 9 kHz a propósito: de ahí a Nyquist
 * (22 kHz) casi no hay energía musical, y promediar ese vacío dejaba
 * la banda de agudos pegada a cero.
 */
const CORTE_GRAVES = 250;
const CORTE_MEDIOS = 2000;
const TECHO_AGUDOS = 9000;

/** Los agudos traen mucha menos energía que los graves; se compensa. */
const REALCE_MEDIOS = 1.5;
const REALCE_AGUDOS = 2.6;

/** Cuánto pesa el valor anterior al suavizar. Más alto = más calmado. */
const SUAVIZADO = 0.72;
const SUAVIZADO_GOLPE = 0.86;

class Analizador {
  private analizador: AnalyserNode | null = null;
  private espectro: Uint8Array<ArrayBuffer> | null = null;
  private onda: Uint8Array<ArrayBuffer> | null = null;
  private frecuenciaPorCasilla = 0;

  private bandas: Bandas = { graves: 0, medios: 0, agudos: 0, amplitud: 0, golpe: 0 };

  /** Se engancha a la salida maestra. Idempotente. */
  conectar(): void {
    if (this.analizador) return;
    const contexto = Tone.getContext().rawContext as AudioContext;
    const nodo = contexto.createAnalyser();
    nodo.fftSize = 1024;
    nodo.smoothingTimeConstant = 0.6;

    // Escucha la salida final: oye exactamente lo que oye el estudiante.
    Tone.getDestination().connect(nodo);

    this.analizador = nodo;
    this.espectro = new Uint8Array(new ArrayBuffer(nodo.frequencyBinCount));
    this.onda = new Uint8Array(new ArrayBuffer(nodo.fftSize));
    this.frecuenciaPorCasilla = contexto.sampleRate / nodo.fftSize;
  }

  get conectado(): boolean {
    return this.analizador !== null;
  }

  /** Lee el espectro y actualiza las bandas. Se llama una vez por cuadro. */
  medir(): Bandas {
    const nodo = this.analizador;
    const espectro = this.espectro;
    const onda = this.onda;
    if (!nodo || !espectro || !onda) return this.bandas;

    nodo.getByteFrequencyData(espectro);
    nodo.getByteTimeDomainData(onda);

    const casillaGraves = Math.floor(CORTE_GRAVES / this.frecuenciaPorCasilla);
    const casillaMedios = Math.floor(CORTE_MEDIOS / this.frecuenciaPorCasilla);
    const casillaAgudos = Math.min(
      espectro.length,
      Math.floor(TECHO_AGUDOS / this.frecuenciaPorCasilla),
    );

    const graves = this.promedio(espectro, 1, casillaGraves);
    const medios = Math.min(1, this.promedio(espectro, casillaGraves, casillaMedios) * REALCE_MEDIOS);
    const agudos = Math.min(1, this.promedio(espectro, casillaMedios, casillaAgudos) * REALCE_AGUDOS);

    // Amplitud por RMS de la onda: refleja el volumen que se percibe.
    let suma = 0;
    for (let i = 0; i < onda.length; i++) {
      const v = (onda[i] - 128) / 128;
      suma += v * v;
    }
    const amplitud = Math.min(1, Math.sqrt(suma / onda.length) * 2.6);

    const anterior = this.bandas;
    const golpeCrudo = Math.max(0, graves - anterior.graves * 0.92);

    this.bandas = {
      graves: this.suavizar(anterior.graves, graves, SUAVIZADO),
      medios: this.suavizar(anterior.medios, medios, SUAVIZADO),
      agudos: this.suavizar(anterior.agudos, agudos, SUAVIZADO),
      amplitud: this.suavizar(anterior.amplitud, amplitud, SUAVIZADO),
      // El golpe sube de inmediato y cae despacio: así se ve el pulso.
      // Acotado a 1 porque los presets lo usan como factor.
      golpe: Math.min(1, Math.max(golpeCrudo * 3, anterior.golpe * SUAVIZADO_GOLPE)),
    };
    return this.bandas;
  }

  get valores(): Bandas {
    return this.bandas;
  }

  private promedio(datos: Uint8Array, desde: number, hasta: number): number {
    const fin = Math.min(hasta, datos.length);
    if (fin <= desde) return 0;
    let suma = 0;
    for (let i = desde; i < fin; i++) suma += datos[i];
    return suma / (fin - desde) / 255;
  }

  private suavizar(anterior: number, nuevo: number, factor: number): number {
    return anterior * factor + nuevo * (1 - factor);
  }
}

export const analizador = new Analizador();
