/**
 * El afinador: escucha un sonido y dice en qué nota está.
 *
 * La matriz necesita saberlo para tocar una grabación propia afinada en
 * cada casilla: si alguien canta un «la» y la app cree que es un «do»,
 * toda la melodía sale corrida. Se mide con autocorrelación sobre el
 * tramo más estable del sonido —el método clásico de los afinadores de
 * guitarra—, que basta para voces, silbidos y objetos con tono.
 */
import { leerAudio } from './muestras';

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOMBRES_ES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

/** Todas las notas que se pueden elegir a mano, de Do1 a Si5. */
export const NOTAS_ELEGIBLES: { nota: string; etiqueta: string }[] = [];
for (let octava = 1; octava <= 5; octava++) {
  NOTAS.forEach((n, i) => NOTAS_ELEGIBLES.push({ nota: `${n}${octava}`, etiqueta: `${NOMBRES_ES[i]} ${octava}` }));
}

export function nombreNota(nota: string): string {
  return NOTAS_ELEGIBLES.find((n) => n.nota === nota)?.etiqueta ?? nota;
}

function notaDeFrecuencia(f: number): string {
  const midi = Math.round(69 + 12 * Math.log2(f / 440));
  const acotado = Math.max(24, Math.min(83, midi));
  return `${NOTAS[acotado % 12]}${Math.floor(acotado / 12) - 1}`;
}

/** La nota del sonido, o null si no tiene un tono claro (un golpe, un ruido). */
export async function detectarNota(url: string): Promise<string | null> {
  const buffer = await leerAudio(url);
  const datos = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const ventana = Math.min(datos.length, Math.floor(sr * 0.25));
  if (ventana < 1024) return null;

  // El tramo más fuerte suele ser el más estable.
  let mejor = 0;
  let energiaMax = 0;
  const paso = Math.floor(ventana / 2);
  for (let i = 0; i + ventana <= datos.length; i += paso) {
    let e = 0;
    for (let j = i; j < i + ventana; j += 4) e += datos[j] * datos[j];
    if (e > energiaMax) {
      energiaMax = e;
      mejor = i;
    }
  }

  const minimo = Math.floor(sr / 1000);
  const maximo = Math.floor(sr / 60);
  let mejorRetraso = -1;
  let mejorCorrelacion = 0;
  let energia = 0;
  for (let j = 0; j < ventana - maximo; j++) energia += datos[mejor + j] * datos[mejor + j];
  if (energia < 1e-4) return null;
  for (let retraso = minimo; retraso <= maximo; retraso++) {
    let suma = 0;
    for (let j = 0; j < ventana - maximo; j++) suma += datos[mejor + j] * datos[mejor + j + retraso];
    const c = suma / energia;
    if (c > mejorCorrelacion) {
      mejorCorrelacion = c;
      mejorRetraso = retraso;
    }
  }
  // Por debajo de esto no hay un tono claro.
  if (mejorRetraso < 0 || mejorCorrelacion < 0.55) return null;
  return notaDeFrecuencia(sr / mejorRetraso);
}
