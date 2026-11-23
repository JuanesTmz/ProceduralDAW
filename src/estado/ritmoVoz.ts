// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Cuándo se dice cada palabra de una escena.
 *
 * Cada quien narra a su paso: unos lento, otros rápido, con pausas en los
 * lugares más inesperados. Repartir las palabras en línea recta a lo largo de
 * la grabación hacía que el sonido de una palabra, el golpe de imagen y el
 * texto que aparece cayeran antes o después de la voz.
 *
 * Aquí se escucha la grabación (sin internet, solo su volumen): se encuentra
 * dónde hay voz y dónde hay silencio, y las palabras se reparten solo sobre
 * la voz, según cuánto cuesta decir cada una (sus sílabas). Una pausa larga
 * queda como pausa, y el arranque tardío de la grabación no corre las demás.
 *
 * Mientras la grabación no se ha analizado (o si no se puede), se usa un
 * reparto parejo por sílabas sobre toda la duración: nunca queda sin tiempos.
 */
import { palabrasDe } from './proyecto';
import type { Escena } from './tipos';

/** Segundos que pasan desde que empieza la escena hasta que entra la voz. */
export const ENTRADA_VOZ = 0.15;

/** Un cuadro del volumen: 10 ms. */
const PASO = 0.01;

interface Perfil {
  /** Volumen de cada cuadro de 10 ms. */
  volumen: Float32Array;
}

const perfiles = new Map<string, Perfil | 'fallo'>();
const pendientes = new Map<string, Promise<void>>();
const oyentes = new Set<() => void>();

/** Avisa cuando termina de analizarse una grabación: los tiempos pueden cambiar. */
export function alCambiarRitmo(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** El volumen de la grabación, cuadro a cuadro (RMS de 20 ms cada 10 ms). */
async function medir(url: string): Promise<Float32Array> {
  const respuesta = await fetch(url);
  const bytes = await respuesta.arrayBuffer();
  const Contexto = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const audio = await new Contexto(1, 1, 44100).decodeAudioData(bytes);
  const canal = audio.getChannelData(0);
  const cuadros = Math.floor(audio.duration / PASO);
  const salida = new Float32Array(cuadros);
  const ventana = Math.max(1, Math.round(audio.sampleRate * 0.02));
  const salto = audio.sampleRate * PASO;
  for (let i = 0; i < cuadros; i++) {
    const inicio = Math.floor(i * salto);
    const fin = Math.min(canal.length, inicio + ventana);
    let suma = 0;
    for (let j = inicio; j < fin; j++) suma += canal[j] * canal[j];
    salida[i] = Math.sqrt(suma / Math.max(1, fin - inicio));
  }
  return salida;
}

function analizar(url: string): void {
  if (perfiles.has(url) || pendientes.has(url)) return;
  const tarea = medir(url)
    .then((volumen) => {
      perfiles.set(url, { volumen });
    })
    .catch(() => {
      perfiles.set(url, 'fallo');
    })
    .finally(() => {
      pendientes.delete(url);
      resultados.clear();
      for (const oyente of oyentes) oyente();
    });
  pendientes.set(url, tarea);
}

/** Cuánto cuesta decir una palabra: sus sílabas (grupos de vocales) más un poco de arranque. */
export function pesoPalabra(palabra: string): number {
  const letras = palabra.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  const grupos = letras.match(/[aeiouáéíóúü]+/g)?.length ?? 0;
  // Una palabra sin vocales («y», siglas) igual se dice.
  return Math.max(1, grupos) + 0.4;
}

/** Marca dónde hay voz: sobre el ruido de fondo, sin partirse en cada sílaba. */
function vozActiva(volumen: Float32Array, desde: number, hasta: number): Uint8Array {
  const ordenado = Array.from(volumen.subarray(desde, hasta)).sort((a, b) => a - b);
  const suelo = ordenado[Math.floor(ordenado.length * 0.1)] ?? 0;
  const techo = ordenado[Math.floor(ordenado.length * 0.95)] ?? 0;
  const umbral = Math.max(0.004, suelo * 2.2, suelo + (techo - suelo) * 0.12);
  const activo = new Uint8Array(hasta - desde);
  for (let i = 0; i < activo.length; i++) activo[i] = volumen[desde + i] > umbral ? 1 : 0;

  // Los huecos cortos (entre sílabas, consonantes) siguen siendo voz; las pausas de verdad no.
  const hueco = 18;
  let i = 0;
  while (i < activo.length) {
    if (activo[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < activo.length && !activo[j]) j++;
    if (i > 0 && j < activo.length && j - i < hueco) activo.fill(1, i, j);
    i = j;
  }
  // Un chasquido suelto no es voz.
  i = 0;
  while (i < activo.length) {
    if (!activo[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < activo.length && activo[j]) j++;
    if (j - i < 6) activo.fill(0, i, j);
    i = j;
  }
  return activo;
}

/** Los cuadros donde la voz vuelve tras una pausa de verdad (más de 0,25 s de silencio entre voz y voz). */
function pausasDe(activo: Uint8Array): number[] {
  const fines: number[] = [];
  let i = 0;
  while (i < activo.length && !activo[i]) i++;
  while (i < activo.length) {
    if (activo[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < activo.length && !activo[j]) j++;
    if (j < activo.length && j - i >= 25) fines.push(j);
    i = j;
  }
  return fines;
}

/** Tiempos ya calculados por escena, hasta que algo cambie. */
const resultados = new Map<string, number[]>();

/**
 * Cuándo empieza a decirse cada palabra, en segundos desde que entra la voz.
 * Tiene tantos números como palabras tenga la escena.
 */
export function iniciosDePalabras(escena: Pick<Escena, 'texto' | 'vozUrl' | 'vozDesde' | 'vozDuracion' | 'respiro'>): number[] {
  const palabras = palabrasDe(escena.texto);
  if (palabras.length === 0 || escena.respiro) return [];
  const pesos = palabras.map(pesoPalabra);
  const total = pesos.reduce((a, b) => a + b, 0);
  const grabada = Boolean(escena.vozUrl) && escena.vozDuracion > 0;
  const duracion = grabada ? escena.vozDuracion : palabras.length / 2.3;
  const clave = `${escena.vozUrl ?? ''}|${escena.vozDesde ?? 0}|${duracion}|${escena.texto}`;
  const guardado = resultados.get(clave);
  if (guardado) return guardado;

  // Reparto parejo por sílabas: el de partida y el que queda si no se puede escuchar.
  const parejo = () => {
    let acumulado = 0;
    return pesos.map((peso) => {
      const t = (acumulado / total) * duracion;
      acumulado += peso;
      return t;
    });
  };

  let inicios = parejo();
  if (grabada && escena.vozUrl) {
    analizar(escena.vozUrl);
    const perfil = perfiles.get(escena.vozUrl);
    if (perfil && perfil !== 'fallo') {
      const desde = Math.max(0, Math.round((escena.vozDesde ?? 0) / PASO));
      const hasta = Math.min(perfil.volumen.length, desde + Math.round(duracion / PASO));
      if (hasta - desde > 20) {
        const activo = vozActiva(perfil.volumen, desde, hasta);
        // Tiempo de voz acumulado hasta cada cuadro.
        const acumulado = new Float32Array(activo.length + 1);
        for (let i = 0; i < activo.length; i++) acumulado[i + 1] = acumulado[i] + activo[i];
        const voz = acumulado[activo.length];
        // Si casi no hay voz que medir (grabación muy baja), mejor el reparto parejo.
        if (voz * PASO >= Math.min(0.6, duracion * 0.25)) {
          let previo = 0;
          inicios = pesos.map((peso) => {
            const objetivo = (previo / total) * voz;
            previo += peso;
            // El último cuadro que no pasa del objetivo: tras una pausa, la palabra cae donde la voz vuelve.
            let bajo = 0;
            let alto = activo.length;
            while (bajo < alto) {
              const medio = (bajo + alto + 1) >> 1;
              if (acumulado[medio] <= objetivo) bajo = medio;
              else alto = medio - 1;
            }
            return Math.min(duracion, bajo * PASO);
          });
          // Tras una coma o un punto la voz hace una pausa: esa palabra cae donde la voz vuelve.
          const pausas = pausasDe(activo);
          const usadas = new Set<number>();
          for (let k = 1; k < palabras.length; k++) {
            if (!/[.,;:!?…]$/.test(palabras[k - 1])) continue;
            let mejor = -1;
            let cerca = 0.7;
            pausas.forEach((fin, j) => {
              const distancia = Math.abs(fin * PASO - inicios[k]);
              if (!usadas.has(j) && distancia < cerca) {
                cerca = distancia;
                mejor = j;
              }
            });
            if (mejor < 0) continue;
            usadas.add(mejor);
            const t = pausas[mejor] * PASO;
            // Sin pasar a las vecinas: el orden de las palabras no se rompe.
            if (t > inicios[k - 1] && (k === palabras.length - 1 || t < inicios[k + 1])) inicios[k] = t;
          }
        }
      }
    } else if (!perfil) {
      // Todavía analizándose: se usa el parejo, sin guardarlo para que se rehaga al terminar.
      return inicios;
    }
  }
  resultados.set(clave, inicios);
  return inicios;
}

/** Segundos desde que empieza la escena hasta que se dice la palabra `k`. */
export function inicioPalabra(escena: Parameters<typeof iniciosDePalabras>[0], k: number): number {
  const inicios = iniciosDePalabras(escena);
  return ENTRADA_VOZ + (inicios[Math.max(0, Math.min(inicios.length - 1, k))] ?? 0);
}

/**
 * Cuántas palabras ya se dijeron (o se están diciendo) a los `segundos` de la
 * escena. Es lo que mueve el texto, las cajitas de imagen y el resaltado.
 */
export function palabrasDichas(escena: Parameters<typeof iniciosDePalabras>[0], segundos: number): number {
  const inicios = iniciosDePalabras(escena);
  const t = segundos - ENTRADA_VOZ + 0.03;
  let n = 0;
  while (n < inicios.length && inicios[n] <= t) n++;
  return n;
}
