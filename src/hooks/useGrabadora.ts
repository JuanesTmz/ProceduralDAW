// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Grabadora de voz con getUserMedia + MediaRecorder.
 *
 * Deja el micrófono libre en cuanto termina de grabar: en los equipos
 * compartidos del evento, un micrófono tomado por una pestaña es un problema.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { crearUrl } from '../estado/guardado';

export type EstadoGrabadora = 'inactiva' | 'pidiendo' | 'grabando' | 'sin-permiso' | 'sin-soporte';

export interface Grabacion {
  url: string;
  duracion: number;
}

/**
 * Opus a 128 kbps: con la tasa baja que algunos Android eligen por su
 * cuenta, la voz sale metálica. Si el navegador no acepta las opciones,
 * se graba como él quiera.
 */
function crearGrabadora(flujo: MediaStream): MediaRecorder {
  const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
    (t) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t),
  );
  try {
    return new MediaRecorder(flujo, { ...(tipo ? { mimeType: tipo } : {}), audioBitsPerSecond: 128_000 });
  } catch {
    return new MediaRecorder(flujo);
  }
}

export function useGrabadora(alTerminar: (grabacion: Grabacion) => void) {
  const [estado, setEstado] = useState<EstadoGrabadora>('inactiva');
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const grabadora = useRef<MediaRecorder | null>(null);
  const pistas = useRef<MediaStream | null>(null);
  const trozos = useRef<Blob[]>([]);
  const inicio = useRef(0);
  const cronometro = useRef<number | null>(null);
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;

  const soltarMicrofono = useCallback(() => {
    pistas.current?.getTracks().forEach((t) => t.stop());
    pistas.current = null;
    if (cronometro.current !== null) {
      window.clearInterval(cronometro.current);
      cronometro.current = null;
    }
  }, []);

  useEffect(() => soltarMicrofono, [soltarMicrofono]);

  const empezar = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setEstado('sin-soporte');
      setError('Este navegador no permite grabar. Puedes narrar con el celular y subir el archivo.');
      return;
    }

    setEstado('pidiendo');
    try {
      // Sin los filtros de llamada: en Android la supresión de ruido y el
      // control automático de volumen dejan la voz robótica y con estática,
      // y la supresión además borra los efectos (una reja, una olla) por no
      // ser voz. Mientras se graba no suena música, así que el eco no hace falta.
      const flujo = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      pistas.current = flujo;
      trozos.current = [];

      const rec = crearGrabadora(flujo);
      grabadora.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) trozos.current.push(e.data);
      };
      rec.onstop = () => {
        const duracion = (performance.now() - inicio.current) / 1000;
        const blob = new Blob(trozos.current, { type: rec.mimeType || 'audio/webm' });
        soltarMicrofono();
        setEstado('inactiva');
        setSegundos(0);
        if (blob.size > 0) {
          alTerminarRef.current({ url: crearUrl(blob), duracion });
        }
      };

      inicio.current = performance.now();
      rec.start();
      setEstado('grabando');
      setSegundos(0);
      cronometro.current = window.setInterval(() => {
        setSegundos((performance.now() - inicio.current) / 1000);
      }, 200);
    } catch {
      soltarMicrofono();
      setEstado('sin-permiso');
      setError(
        'No se pudo usar el micrófono. Revisa el permiso del navegador, o narra con el celular y sube el archivo.',
      );
    }
  }, [soltarMicrofono]);

  const parar = useCallback(() => {
    if (grabadora.current?.state === 'recording') grabadora.current.stop();
  }, []);

  return { estado, segundos, error, empezar, parar };
}
