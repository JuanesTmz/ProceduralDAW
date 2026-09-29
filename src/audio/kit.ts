/**
 * Kit de percusión sintetizado con Tone.js — sonidos propios, sin muestras de terceros.
 * Cada voz expone disparar(tiempo, velocidad) para que el secuenciador la agende
 * en el reloj del Transport, no en el reloj de JavaScript.
 */
import * as Tone from 'tone';
import type { TipoSonido } from '../estado/tipos';

export interface VozPercusion {
  tipo: TipoSonido;
  /** Nodo de entrada al que se conecta el volumen de la fila. */
  salida: Tone.Gain;
  disparar: (tiempo: number, velocidad: number) => void;
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

function crearRedoblante(): VozPercusion {
  const salida = new Tone.Gain(1);
  // Cuerpo afinado + ruido: así suena a tambor y no a "shhh".
  const filtro = new Tone.Filter({ type: 'bandpass', frequency: 1800, Q: 0.9 }).connect(salida);
  const ruido = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
  }).connect(filtro);
  const cuerpo = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
  }).connect(salida);
  cuerpo.volume.value = -10;

  return {
    tipo: 'redoblante',
    salida,
    disparar: (tiempo, velocidad) => {
      ruido.triggerAttackRelease('16n', tiempo, velocidad);
      cuerpo.triggerAttackRelease('E2', '32n', tiempo, velocidad * 0.7);
    },
    liberar: () => {
      ruido.dispose();
      cuerpo.dispose();
      filtro.dispose();
      salida.dispose();
    },
  };
}

function crearHihat(): VozPercusion {
  const salida = new Tone.Gain(1);
  const filtro = new Tone.Filter({ type: 'highpass', frequency: 7000 }).connect(salida);
  const metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.055, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 5000,
    octaves: 1.5,
  }).connect(filtro);
  metal.volume.value = -22;

  return {
    tipo: 'hihat',
    salida,
    disparar: (tiempo, velocidad) => metal.triggerAttackRelease('32n', tiempo, velocidad),
    liberar: () => {
      metal.dispose();
      filtro.dispose();
      salida.dispose();
    },
  };
}

function crearPalma(): VozPercusion {
  const salida = new Tone.Gain(1);
  // Una palma real son varios golpes muy juntos: tres ráfagas cortas.
  const filtro = new Tone.Filter({ type: 'bandpass', frequency: 1200, Q: 1.6 }).connect(salida);
  const ruido = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
  }).connect(filtro);

  return {
    tipo: 'palma',
    salida,
    disparar: (tiempo, velocidad) => {
      ruido.triggerAttackRelease('32n', tiempo, velocidad * 0.6);
      ruido.triggerAttackRelease('32n', tiempo + 0.011, velocidad * 0.8);
      ruido.triggerAttackRelease('16n', tiempo + 0.023, velocidad);
    },
    liberar: () => {
      ruido.dispose();
      filtro.dispose();
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

function crearAro(): VozPercusion {
  const salida = new Tone.Gain(1);
  const metal = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.09, release: 0.01 },
    harmonicity: 12,
    modulationIndex: 18,
    resonance: 3200,
    octaves: 0.8,
  }).connect(salida);
  metal.volume.value = -24;

  return {
    tipo: 'aro',
    salida,
    disparar: (tiempo, velocidad) => metal.triggerAttackRelease('32n', tiempo, velocidad),
    liberar: () => {
      metal.dispose();
      salida.dispose();
    },
  };
}

/** Voz que reproduce un sample subido por el estudiante. */
export function crearVozSample(url: string, alCargar?: () => void): VozPercusion {
  const salida = new Tone.Gain(1);
  const player = new Tone.Player({ url, onload: alCargar }).connect(salida);

  return {
    tipo: 'sample',
    salida,
    disparar: (tiempo, velocidad) => {
      if (!player.loaded) return;
      player.volume.value = Tone.gainToDb(Math.max(velocidad, 0.001));
      player.start(tiempo);
    },
    liberar: () => {
      player.dispose();
      salida.dispose();
    },
  };
}

export function crearVoz(tipo: TipoSonido, sampleUrl?: string): VozPercusion {
  switch (tipo) {
    case 'bombo':
      return crearBombo();
    case 'redoblante':
      return crearRedoblante();
    case 'hihat':
      return crearHihat();
    case 'palma':
      return crearPalma();
    case 'tom':
      return crearTom();
    case 'aro':
      return crearAro();
    case 'sample':
      return crearVozSample(sampleUrl ?? '');
  }
}
