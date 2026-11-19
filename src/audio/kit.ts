// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Kit de percusión. El bombo y el tom se sintetizan con Tone.js (en los géneros
 * urbanos el bombo electrónico es el que se espera); la caja, el hi-hat, la
 * palma y el aro son grabaciones reales de la Sonoteca, del Versilian
 * Community Sample Library (VCSL, CC0: dominio público).
 * Cada voz expone disparar(tiempo, velocidad) para que el secuenciador la agende
 * en el reloj del Transport, no en el reloj de JavaScript.
 */
import * as Tone from 'tone';
import type { TipoSonido } from '../estado/tipos';

export interface VozPercusion {
  tipo: TipoSonido;
  /** Nodo de entrada al que se conecta el volumen de la fila. */
  salida: Tone.Gain;
  /**
   * `maxDuracion`: hasta cuánto puede sonar este golpe (segundos). Solo recorta
   * los sonidos que son más largos que eso; los cortos suenan enteros.
   */
  disparar: (tiempo: number, velocidad: number, maxDuracion?: number, semitonos?: number) => void;
  /** Corta lo que esté sonando o agendado (los samples largos no se apagan solos). */
  parar?: () => void;
  liberar: () => void;
}

function crearBombo(): VozPercusion {
  const salida = new Tone.Gain(1);
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.028,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.34, sustain: 0.005, release: 0.9 },
  }).connect(salida);

  return {
    tipo: 'bombo',
    salida,
    disparar: (tiempo, velocidad) => synth.triggerAttackRelease('C1', '8n', tiempo, velocidad),
    liberar: () => {
      synth.dispose();
      salida.dispose();
    },
  };
}

function crearTom(): VozPercusion {
  const salida = new Tone.Gain(1);
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.06,
    octaves: 4,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.4 },
  }).connect(salida);

  return {
    tipo: 'tom',
    salida,
    disparar: (tiempo, velocidad) => synth.triggerAttackRelease('A2', '8n', tiempo, velocidad),
    liberar: () => {
      synth.dispose();
      salida.dispose();
    },
  };
}

// ------------------------------------------------------------ grabaciones

/** Las voces de la batería que suenan con una grabación de la Sonoteca. */
const GRABACIONES: Partial<Record<TipoSonido, string>> = {
  redoblante: 'caja',
  hihat: 'hatcerrado',
  palma: 'palmas',
  aro: 'aro',
};

/** Un solo búfer por grabación, compartido por todas las pistas y nunca liberado. */
const buffersGrabados = new Map<string, Tone.ToneAudioBuffer>();
function bufferGrabado(archivo: string): Tone.ToneAudioBuffer {
  let buffer = buffersGrabados.get(archivo);
  if (!buffer) {
    buffer = new Tone.ToneAudioBuffer(`${import.meta.env.BASE_URL}sonoteca/${archivo}.wav`);
    buffersGrabados.set(archivo, buffer);
  }
  return buffer;
}

/**
 * Carga de una vez las grabaciones de la batería. Se llama al arrancar el
 * audio: así el primer golpe (o la primera escucha al elegir un sonido) ya
 * suena, en vez de quedar mudo mientras baja el archivo.
 */
export function precargarBateria(): void {
  for (const archivo of Object.values(GRABACIONES)) if (archivo) bufferGrabado(archivo);
}

/**
 * Voz que reproduce un sample subido por el estudiante.
 *
 * Cada golpe es su propia fuente con su propio volumen. Con un solo
 * reproductor, el volumen era uno para todos: cambiarlo para el golpe nuevo
 * cambiaba también la cola del anterior, que todavía sonaba, y golpes
 * seguidos de la misma celda se oían unos más fuertes que otros.
 */
export function crearVozSample(url: string, alCargar?: () => void): VozPercusion {
  const buffer = url ? new Tone.ToneAudioBuffer(url, alCargar) : new Tone.ToneAudioBuffer();
  return vozDeBuffer('sample', buffer, true);
}

/** La voz de un búfer. `propio`: el búfer es solo de esta voz y se libera con ella. */
function vozDeBuffer(tipo: TipoSonido, buffer: Tone.ToneAudioBuffer, propio: boolean): VozPercusion {
  const salida = new Tone.Gain(1);
  const activos = new Set<Tone.ToneBufferSource>();

  return {
    tipo,
    salida,
    disparar: (tiempo, velocidad, maxDuracion, semitonos = 0) => {
      if (!buffer.loaded) return;
      const ganancia = new Tone.Gain(Math.max(velocidad, 0.001)).connect(salida);
      // Un fundido corto para que el recorte de un sonido largo no suene a clic.
      // Con semitonos, el sonido se afina más agudo o más grave (las capas con notas).
      const fuente = new Tone.ToneBufferSource({
        url: buffer,
        fadeOut: 0.05,
        playbackRate: Math.pow(2, semitonos / 12),
        onended: () => {
          activos.delete(fuente);
          fuente.dispose();
          ganancia.dispose();
        },
      }).connect(ganancia);
      activos.add(fuente);
      if (maxDuracion !== undefined && buffer.duration > maxDuracion) fuente.start(tiempo, 0, maxDuracion);
      else fuente.start(tiempo);
    },
    parar: () => {
      for (const f of activos) f.stop();
    },
    liberar: () => {
      for (const f of activos) f.dispose();
      activos.clear();
      if (propio) buffer.dispose();
      salida.dispose();
    },
  };
}

export function crearVoz(tipo: TipoSonido, sampleUrl?: string): VozPercusion {
  switch (tipo) {
    case 'bombo':
      return crearBombo();
    case 'redoblante':
    case 'hihat':
    case 'palma':
    case 'aro':
      return vozDeBuffer(tipo, bufferGrabado(GRABACIONES[tipo]!), false);
    case 'tom':
      return crearTom();
    case 'sample':
      return crearVozSample(sampleUrl ?? '');
  }
}
