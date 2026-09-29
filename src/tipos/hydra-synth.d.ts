/**
 * hydra-synth no trae tipos propios. Solo declaramos lo que usamos:
 * el constructor y el objeto `synth` con las funciones de Hydra.
 */
declare module 'hydra-synth' {
  interface OpcionesHydra {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    detectAudio?: boolean;
    makeGlobal?: boolean;
    autoLoop?: boolean;
    numSources?: number;
    numOutputs?: number;
  }

  export default class HydraSynth {
    constructor(opciones?: OpcionesHydra);
    // La API de Hydra es encadenable y dinámica; se tipa como registro abierto.
    synth: Record<string, unknown> & Record<string, never>;
    canvas: HTMLCanvasElement;
  }
}
