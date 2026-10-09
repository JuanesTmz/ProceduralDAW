/**
 * Lo que hace falta para convertir una grabación en un sample usable:
 * leerla, dibujarla y recortarla.
 *
 * El recorte produce un archivo WAV de verdad, no un "toca desde el segundo
 * 0,4 hasta el 0,9". Así el sonido recortado se comporta igual que cualquier
 * otro de la app —arranca al instante, se puede volver a recortar, y el día
 * que se exporte la pieza va completo— sin que el motor de audio tenga que
 * saber nada de desplazamientos.
 */

/** Un contexto suelto solo para leer archivos; el de Tone no se toca. */
let lector: AudioContext | null = null;

function contextoLector(): AudioContext {
  if (!lector) lector = new AudioContext();
  return lector;
}

export async function leerAudio(url: string): Promise<AudioBuffer> {
  const respuesta = await fetch(url);
  const datos = await respuesta.arrayBuffer();
  return contextoLector().decodeAudioData(datos);
}

/**
 * Los picos de la onda, resumidos a `cuantos` columnas.
 * Se guarda el máximo de cada tramo y no el promedio: un promedio aplana los
 * golpes cortos justo hasta hacerlos invisibles, que es lo contrario de lo
 * que el estudiante necesita ver para recortar.
 */
export function picosDe(buffer: AudioBuffer, cuantos: number): number[] {
  const datos = buffer.getChannelData(0);
  const porColumna = Math.max(1, Math.floor(datos.length / cuantos));
  const picos: number[] = [];
  for (let i = 0; i < cuantos; i++) {
    let maximo = 0;
    const desde = i * porColumna;
    const hasta = Math.min(datos.length, desde + porColumna);
    for (let j = desde; j < hasta; j++) {
      const v = Math.abs(datos[j]);
      if (v > maximo) maximo = v;
    }
    picos.push(maximo);
  }
  return picos;
}

/**
 * Dónde empieza y dónde acaba el sonido de verdad, saltándose el silencio
 * del principio y del final. Es lo que propone la app al recortar: casi
 * siempre es lo que el estudiante quería, y le ahorra pelear con los tiradores.
 */
export function bordesDelSonido(buffer: AudioBuffer): { inicio: number; fin: number } {
  const datos = buffer.getChannelData(0);
  const umbral = 0.04;
  let inicio = 0;
  let fin = datos.length - 1;
  while (inicio < datos.length && Math.abs(datos[inicio]) < umbral) inicio++;
  while (fin > inicio && Math.abs(datos[fin]) < umbral) fin--;
  if (inicio >= fin) return { inicio: 0, fin: buffer.duration };
  // Un pelín de aire antes del golpe, para no comerse el ataque.
  const aire = 0.01 * buffer.sampleRate;
  return {
    inicio: Math.max(0, inicio - aire) / buffer.sampleRate,
    fin: Math.min(datos.length - 1, fin + aire) / buffer.sampleRate,
  };
}

/**
 * Recorta y devuelve un WAV. Se le pone un desvanecido de milisegundos en los
 * dos extremos: cortar una onda a mitad de ciclo produce un chasquido, y en
 * un sample que suena cien veces ese chasquido es lo único que se oye.
 */
export async function recortarAWav(
  buffer: AudioBuffer,
  inicio: number,
  fin: number,
): Promise<Blob> {
  const tasa = buffer.sampleRate;
  const desde = Math.max(0, Math.floor(inicio * tasa));
  const hasta = Math.min(buffer.length, Math.ceil(fin * tasa));
  const largo = Math.max(1, hasta - desde);
  const canales = Math.min(2, buffer.numberOfChannels);

  const rampa = Math.min(Math.floor(tasa * 0.004), Math.floor(largo / 2));
  const pistas: Float32Array[] = [];
  for (let c = 0; c < canales; c++) {
    const origen = buffer.getChannelData(c);
    const salida = new Float32Array(largo);
    for (let i = 0; i < largo; i++) {
      let v = origen[desde + i] ?? 0;
      if (rampa > 0) {
        if (i < rampa) v *= i / rampa;
        else if (i > largo - rampa) v *= (largo - i) / rampa;
      }
      salida[i] = v;
    }
    pistas.push(salida);
  }

  return new Blob([aWav(pistas, tasa)], { type: 'audio/wav' });
}

/** WAV de 16 bits, que es el formato que todo navegador sabe leer. */
function aWav(pistas: Float32Array[], tasa: number): ArrayBuffer {
  const canales = pistas.length;
  const muestras = pistas[0].length;
  const bytes = muestras * canales * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const vista = new DataView(buffer);

  const texto = (posicion: number, cadena: string) => {
    for (let i = 0; i < cadena.length; i++) vista.setUint8(posicion + i, cadena.charCodeAt(i));
  };

  texto(0, 'RIFF');
  vista.setUint32(4, 36 + bytes, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, canales, true);
  vista.setUint32(24, tasa, true);
  vista.setUint32(28, tasa * canales * 2, true);
  vista.setUint16(32, canales * 2, true);
  vista.setUint16(34, 16, true);
  texto(36, 'data');
  vista.setUint32(40, bytes, true);

  let posicion = 44;
  for (let i = 0; i < muestras; i++) {
    for (let c = 0; c < canales; c++) {
      const v = Math.max(-1, Math.min(1, pistas[c][i]));
      vista.setInt16(posicion, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      posicion += 2;
    }
  }
  return buffer;
}
