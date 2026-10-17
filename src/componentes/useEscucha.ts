/**
 * Los botones de «oír» de una ventana o de una lista.
 *
 * No llevan su propia cuenta de qué suena: le preguntan al motor cuál es la
 * reproducción activa, en cada cuadro. Así un botón solo aparece como «Pausar»
 * si es EL que suena, y vuelve a «oír» en cuanto otra cosa lo reemplaza
 * (otro botón, la escena, la pieza, la barra espaciadora) o termina sola.
 *
 * Al cerrarse la ventana se para lo que se arrancó desde ella, y solo eso.
 */
import { useEffect, useRef, useState } from 'react';
import { claveDe, motorAudio, type Reproduccion } from '../audio/motorAudio';

export function useEscucha() {
  const [activa, setActiva] = useState<string | null>(motorAudio.claveActiva);
  /** El número de pedido del último play que se arrancó desde aquí. */
  const mio = useRef<number | null>(null);

  useEffect(() => {
    let cuadro = 0;
    const mirar = () => {
      setActiva(motorAudio.claveActiva);
      cuadro = requestAnimationFrame(mirar);
    };
    cuadro = requestAnimationFrame(mirar);
    return () => cancelAnimationFrame(cuadro);
  }, []);

  /** ¿Es esta la reproducción que suena ahora? */
  const suena = (r: Reproduccion) => activa === claveDe(r);

  const eraMio = () => mio.current !== null && mio.current === motorAudio.numeroDePedido && motorAudio.claveActiva !== null;

  // Al desmontarse la ventana, se para lo que se empezó aquí (y solo eso).
  useEffect(
    () => () => {
      if (eraMio()) motorAudio.detener();
    },
    [],
  );

  const parar = () => {
    if (eraMio()) motorAudio.detener();
  };

  /** Suena `r`, o para si ya sonaba exactamente eso. Si sonaba otra cosa, la reemplaza. */
  const alternar = (r: Reproduccion) => {
    if (motorAudio.claveActiva === claveDe(r)) {
      motorAudio.detener();
      return;
    }
    void motorAudio.reproducirCon(r);
    mio.current = motorAudio.numeroDePedido;
  };

  return { suena, alternar, parar };
}
