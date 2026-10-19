/**
 * El atlas de glifos: una tira con cada carácter dibujado una vez, para que
 * la tarjeta gráfica los pueda copiar en miles de casillas a la vez.
 *
 * Lo importante es el ORDEN. Para pasar una foto a letras, lo claro tiene
 * que ser lo que más tinta lleva (una «@», una «█») y lo oscuro lo que menos
 * («.», un espacio). Como esa «tinta» depende de la tipografía de cada
 * tablet, no se supone: se dibuja cada carácter, se cuentan sus píxeles y se
 * ordenan por eso. Así sirve cualquier alfabeto, hasta las letras del propio
 * relato.
 */

export const GLIFO_ANCHO = 36;
export const GLIFO_ALTO = 64;

const TIPOGRAFIA = 'ui-monospace, "Cascadia Mono", Menlo, Consolas, "Noto Sans Mono", monospace';

export interface Alfabeto {
  id: string;
  etiqueta: string;
  caracteres: string;
}

export const ALFABETOS: Alfabeto[] = [
  { id: 'clasico', etiqueta: 'Clásico', caracteres: ' .:-=+*#%@' },
  { id: 'bloques', etiqueta: 'Bloques', caracteres: ' ░▒▓█' },
  { id: 'puntos', etiqueta: 'Puntos', caracteres: ' ·:∙•◦○◍◉●' },
  { id: 'binario', etiqueta: 'Binario', caracteres: ' 01' },
  { id: 'hex', etiqueta: 'Hex', caracteres: ' 0123456789ABCDEF' },
  { id: 'codigo', etiqueta: 'Código', caracteres: ' .,;:!/\\|(){}[]<>=+-*#&%$@' },
  { id: 'letras', etiqueta: 'Letras', caracteres: ' ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'formas', etiqueta: 'Formas', caracteres: ' ·+×○◇△▽□▣◆★' },
  { id: 'matrix', etiqueta: 'Matrix', caracteres: ' ｦｱｳｴｵｶｷｹｺｻｼｽｾﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789' },
  { id: 'relato', etiqueta: 'Mi relato', caracteres: '' },
];

/** Los caracteres del alfabeto elegido; «Mi relato» son las letras del texto de la escena. */
export function caracteresDe(indice: number, texto: string): string {
  const alfabeto = ALFABETOS[Math.max(0, Math.min(ALFABETOS.length - 1, indice))];
  if (alfabeto.id !== 'relato') return alfabeto.caracteres;
  const letras = [...new Set([...texto.toLowerCase()].filter((c) => /[\p{L}\d]/u.test(c)))].join('');
  // Con tan pocas letras no hay escala de grises: se usa el alfabeto de letras.
  return letras.length >= 4 ? ` ${letras}` : ALFABETOS[6].caracteres;
}

/** Dibuja y ordena los caracteres; devuelve la tira lista para subir a la GPU. */
export function construirAtlas(caracteres: string): { lienzo: HTMLCanvasElement; cantidad: number } {
  const unicos = [...new Set([...caracteres])].filter((c) => c !== ' ');
  const prueba = document.createElement('canvas');
  prueba.width = GLIFO_ANCHO;
  prueba.height = GLIFO_ALTO;
  const pctx = prueba.getContext('2d', { willReadFrequently: true });
  if (!pctx) throw new Error('Sin canvas 2D para los glifos');

  const dibujar = (ctx: CanvasRenderingContext2D, c: string, x: number) => {
    ctx.font = `${Math.round(GLIFO_ALTO * 0.74)}px ${TIPOGRAFIA}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(c, x + GLIFO_ANCHO / 2, GLIFO_ALTO / 2 + GLIFO_ALTO * 0.04, GLIFO_ANCHO - 4);
  };

  // Cuánta tinta lleva cada carácter, contando píxeles encendidos.
  const tinta = unicos.map((c) => {
    pctx.clearRect(0, 0, GLIFO_ANCHO, GLIFO_ALTO);
    dibujar(pctx, c, 0);
    const datos = pctx.getImageData(0, 0, GLIFO_ANCHO, GLIFO_ALTO).data;
    let suma = 0;
    for (let i = 3; i < datos.length; i += 4) suma += datos[i];
    return { c, suma };
  });
  tinta.sort((a, b) => a.suma - b.suma);
  const orden = [' ', ...tinta.map((t) => t.c)];

  const lienzo = document.createElement('canvas');
  lienzo.width = orden.length * GLIFO_ANCHO;
  lienzo.height = GLIFO_ALTO;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Sin canvas 2D para los glifos');
  orden.forEach((c, i) => {
    if (c !== ' ') dibujar(ctx, c, i * GLIFO_ANCHO);
  });
  return { lienzo, cantidad: orden.length };
}
