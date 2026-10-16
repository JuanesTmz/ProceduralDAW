/**
 * Los botones de «oír» de una ventana: tocar una vez suena, tocar otra vez
 * para. Y al cerrar la ventana (por donde sea) se para solo: lo que se
 * empezó a oír aquí no se queda sonando en bucle detrás.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useReproduccion } from '../narrativa/useReproduccion';

export function useEscucha() {
  const [sonandoAqui, setSonandoAqui] = useState<string | null>(null);
  const propio = useRef<string | null>(null);
  const { sonando } = useReproduccion();
  const sonabaAntes = useRef(false);

  // Si algo más lo para (la barra espaciadora, otro play), el botón vuelve a «oír».
  useEffect(() => {
    if (sonabaAntes.current && !sonando && propio.current) {
      propio.current = null;
      setSonandoAqui(null);
    }
    sonabaAntes.current = sonando;
  }, [sonando]);

  // Al desmontarse la ventana, se para lo que se empezó aquí.
  useEffect(
    () => () => {
      if (propio.current) motorAudio.detener();
    },
    [],
  );

  const parar = () => {
    if (!propio.current) return;
    propio.current = null;
    setSonandoAqui(null);
    motorAudio.detener();
  };

  /** Suena con `arrancar`, o para si ya sonaba este mismo botón. */
  const alternar = (id: string, arrancar: () => void) => {
    if (propio.current === id) {
      parar();
      return;
    }
    propio.current = id;
    setSonandoAqui(id);
    arrancar();
  };

  return { sonandoAqui, alternar, parar };
}
