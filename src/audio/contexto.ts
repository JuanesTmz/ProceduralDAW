// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Contexto de audio con margen para las tablets.
 *
 * Por defecto el navegador pide el búfer más corto posible («interactive»).
 * En la Tab M10, con los sintetizadores y el visual a la vez, el procesador
 * no alcanza a llenarlo a tiempo y el sonido «cruje». Con «playback» el
 * búfer es más largo: un poco más de retraso al tocar, pero sin cortes.
 * El visual sigue sincronizado porque `posicionOida` descuenta outputLatency.
 *
 * Para comparar en la tablet: ?audio=interactivo | equilibrado | reproduccion
 *
 * Tiene que importarse antes que cualquier otra cosa que use Tone.
 */
import * as Tone from 'tone';

const MODOS: Record<string, AudioContextLatencyCategory> = {
  interactivo: 'interactive',
  equilibrado: 'balanced',
  reproduccion: 'playback',
};

function modoPedido(): AudioContextLatencyCategory {
  try {
    const pedido = new URLSearchParams(window.location.search).get('audio');
    if (pedido && MODOS[pedido]) return MODOS[pedido];
  } catch {
    // Sin URL legible: se queda el de siempre.
  }
  return 'playback';
}

try {
  Tone.setContext(new Tone.Context({ latencyHint: modoPedido() }));
} catch {
  // Si el navegador no acepta la opción, Tone usa su contexto por defecto.
}
