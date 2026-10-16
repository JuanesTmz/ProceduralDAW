/**
 * Las paletas: cinco colores de oscuro a claro, que cada algoritmo usa como
 * rampa.
 *
 * Cinco y no más porque una rampa de cinco tramos ya da todos los tonos
 * intermedios, y porque elegir entre siete paletas es una decisión que se
 * toma en dos segundos. Elegir entre un selector de color libre, no.
 */

export interface Paleta {
  id: string;
  nombre: string;
  colores: [string, string, string, string, string];
}

export const PALETAS: Paleta[] = [
  { id: 'nebulosa', nombre: 'Nebulosa', colores: ['#3a0ca3', '#7b2ff7', '#b5179e', '#f72585', '#ffd166'] },
  { id: 'aurora', nombre: 'Aurora', colores: ['#012a4a', '#2a6f97', '#00b4d8', '#90e0ef', '#caf0f8'] },
  { id: 'magma', nombre: 'Magma', colores: ['#03071e', '#6a040f', '#dc2f02', '#f48c06', '#ffba08'] },
  { id: 'monte', nombre: 'Monte', colores: ['#081c15', '#1b4332', '#2d6a4f', '#52b788', '#b7e4c7'] },
  { id: 'metro', nombre: 'Metro', colores: ['#0b0b0f', '#3a3a44', '#8a8a99', '#d0d0dc', '#ffffff'] },
  { id: 'iris', nombre: 'Iris', colores: ['#7400b8', '#5e60ce', '#4ea8de', '#56cfe1', '#80ffdb'] },
  { id: 'sonora', nombre: 'Sonora', colores: ['#0d1014', '#b87a0d', '#ffb020', '#ff5d73', '#2ee6a8'] },
];

export const PALETA_POR_DEFECTO = 'sonora';

export function paletaDe(id: string): Paleta {
  return PALETAS.find((p) => p.id === id) ?? PALETAS[PALETAS.length - 1];
}

/** '#rrggbb' → [r, g, b] en 0..255. */
export function aRgb(hex: string): [number, number, number] {
  const limpio = hex.replace('#', '');
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ];
}

/** '#rrggbb' → [r, g, b] en 0..1, que es lo que quiere un shader. */
export function aRgb01(hex: string): [number, number, number] {
  const [r, g, b] = aRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/**
 * La rampa: un número de 0 a 1 se convierte en un color interpolando entre
 * los cinco de la paleta. Es lo que convierte un campo de valores —altura,
 * densidad, brillo— en una imagen con color.
 */
export function rampa(colores: string[], x: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, x)) * (colores.length - 1);
  const i = Math.min(colores.length - 2, Math.floor(t));
  const f = t - i;
  const a = aRgb(colores[i]);
  const b = aRgb(colores[i + 1]);
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export function rampaCss(colores: string[], x: number, alfa = 1): string {
  const [r, g, b] = rampa(colores, x);
  return alfa >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alfa.toFixed(3)})`;
}
