/**
 * Lo que la interfaz necesita saber del motor mientras suena: si está
 * sonando, qué escena va y por dónde va la pieza (0..1).
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';

export function useReproduccion() {
  const [sonando, setSonando] = useState(motorAudio.estaSonando);
  const [seccion, setSeccion] = useState(-1);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    const quitar = motorAudio.alCambiarSeccion((i) => setSeccion(i));
    let cuadro = 0;
    const mirar = () => {
      setSonando(motorAudio.estaSonando);
      setProgreso(motorAudio.estaSonando ? motorAudio.progresoPieza : 0);
      cuadro = requestAnimationFrame(mirar);
    };
    cuadro = requestAnimationFrame(mirar);
    return () => {
      quitar();
      cancelAnimationFrame(cuadro);
    };
  }, []);

  return { sonando, seccion: sonando ? seccion : -1, progreso };
}
