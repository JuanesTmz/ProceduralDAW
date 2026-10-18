/**
 * La imagen de las escenas: qué se puede conectar en el visual y cómo se
 * arma la paleta.
 *
 * El lab de IA mueve la imagen con la misma mecánica que la música: una
 * conexión «este parámetro se mueve según este dato». Los destinos son los
 * mandos del algoritmo elegido (los mismos de GenArt) y, además, la paleta.
 */
import { algoritmoDe, type NombreAlgoritmo } from '../visual/algoritmos';
import { nuevaConexion } from './musica';
import type { Conexion, Emocion, GolpeVisual, ReaccionVisual } from './tipos';
import { EMOCIONES } from './escenas';

export interface DestinoVisual {
  clave: string;
  etiqueta: string;
}

export function destinosVisuales(algoritmo: NombreAlgoritmo): DestinoVisual[] {
  return [
    ...algoritmoDe(algoritmo).mandos.map((m) => ({ clave: m.id, etiqueta: m.etiqueta })),
    { clave: 'paleta', etiqueta: 'Paleta de colores' },
  ];
}

/** Los estilos, con los nombres que los chicos ya conocen de GenArt (y los nuevos). */
export const NOMBRE_ESTILO: Record<NombreAlgoritmo, string> = {
  flujo: 'Campo de flujo',
  ondas: 'Ondas topográficas',
  glifos: 'Constelación de glifos',
  nebulosa: 'Nebulosa líquida',
  marejada: 'Marejada de puntos',
  caleidoscopio: 'Caleidoscopio',
};

export const ORDEN_ESTILOS: NombreAlgoritmo[] = ['flujo', 'nebulosa', 'ondas', 'glifos', 'marejada', 'caleidoscopio'];

/** Las conexiones con las que arranca el lab de IA en la imagen. */
export function conexionesVisualIniciales(algoritmo: NombreAlgoritmo): Conexion[] {
  const ids = new Set(algoritmoDe(algoritmo).mandos.map((m) => m.id));
  const lista: Conexion[] = [nuevaConexion('emocion', 'paleta')];
  if (ids.has('velocidad')) lista.push(nuevaConexion('voz', 'velocidad'));
  if (ids.has('tamano')) lista.push(nuevaConexion('bombo', 'tamano'));
  return lista;
}

/** Aclara u oscurece un color: k<0 hacia negro, k>0 hacia blanco. */
function mezclar(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canales = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k),
  );
  return `#${canales.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Una paleta entera sacada del color de una emoción. */
export function paletaDeEmocion(emocion: Emocion): string[] {
  const c = EMOCIONES[emocion].color;
  return ['#0b0c12', mezclar(c, -0.65), mezclar(c, -0.25), c, mezclar(c, 0.6)];
}

export const NOMBRE_REACCION: Record<ReaccionVisual, string> = {
  bombo: 'Late con el bombo',
  voz: 'Respira con la voz',
  quieta: 'Quieta',
};

/** Cuánto le hace caso la imagen al sonido en cada reacción. */
export const VALOR_REACCION: Record<ReaccionVisual, number> = { bombo: 1, voz: 0.5, quieta: 0.08 };

export const NOMBRE_GOLPE: Record<GolpeVisual, string> = {
  destello: 'Destello',
  zoom: 'Zoom',
  sacudon: 'Sacudón',
  corte: 'Corte',
};

export const ORDEN_GOLPES: GolpeVisual[] = ['destello', 'zoom', 'sacudon', 'corte'];
