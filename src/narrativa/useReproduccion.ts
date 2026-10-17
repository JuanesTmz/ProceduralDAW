/**
 * Lo que la interfaz necesita saber del motor mientras suena: qué se pidió
 * oír (la clave de la reproducción activa), si suena la pieza y qué escena
 * va. La posición fina (cabezales, barras) no pasa por aquí: se lee del
 * motor en cada cuadro con useCuadro, sin redibujar.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';

export function useReproduccion() {
  const [activa, setActiva] = useState<string | null>(motorAudio.claveActiva);
  const [sonando, setSonando] = useState(motorAudio.estaSonando);
  const [seccion, setSeccion] = useState(-1);

  useEffect(() => {
    const quitar = motorAudio.alCambiarSeccion((i) => setSeccion(i));
    let cuadro = 0;
    // React no redibuja si el valor no cambió: esto solo cuesta al empezar y al parar.
    const mirar = () => {
      setActiva(motorAudio.claveActiva);
      setSonando(motorAudio.estaSonando);
      cuadro = requestAnimationFrame(mirar);
    };
    cuadro = requestAnimationFrame(mirar);
    return () => {
      quitar();
      cancelAnimationFrame(cuadro);
    };
  }, []);

  return {
    activa,
    sonando,
    /** Suena la pieza completa (no una escena ni un sonido suelto). */
    sonandoPieza: activa === 'pieza',
    seccion: sonando ? seccion : -1,
  };
}
