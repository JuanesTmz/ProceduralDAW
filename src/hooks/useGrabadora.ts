/**
 * Grabadora de voz con getUserMedia + MediaRecorder.
 *
 * Deja el micrófono libre en cuanto termina de grabar: en los equipos
 * compartidos del evento, un micrófono tomado por una pestaña es un problema.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoGrabadora = 'inactiva' | 'pidiendo' | 'grabando' | 'sin-permiso' | 'sin-soporte';

export interface Grabacion {
  url: string;
  duracion: number;
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
      const flujo = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      pistas.current = flujo;
      trozos.current = [];

      const rec = new MediaRecorder(flujo);
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
          alTerminarRef.current({ url: URL.createObjectURL(blob), duracion });
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
