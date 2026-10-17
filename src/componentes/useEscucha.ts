/**
 * Los botones de «oír» de una ventana: tocar una vez suena, tocar otra vez
 * para. Y al cerrar la ventana (por donde sea) se para solo: lo que se
 * empezó a oír aquí no se queda sonando en bucle detrás.
 *
 * Mientras un botón está en «Pausar», se mira al motor en cada cuadro: en
 * cuanto deja de sonar —porque terminó la escena, porque se paró con la
 * barra espaciadora o con otro play— el botón vuelve a «oír». No depende
 * de alcanzar a ver el instante exacto en que cambia.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';

/** Cuánto se espera a que arranque (cargar sonidos) antes de darlo por fallido. */
const ESPERA_ARRANQUE = 4000;

export function useEscucha() {
  const [sonandoAqui, setSonandoAqui] = useState<string | null>(null);
  const propio = useRef<string | null>(null);
  const empezo = useRef(0);
  const yaSono = useRef(false);
  /** Cómo saber si lo que suena sigue siendo lo de este botón. */
  const sigue = useRef<() => boolean>(() => motorAudio.sigueSonando);

  useEffect(() => {
    if (!sonandoAqui) return;
    let cuadro = 0;
    const mirar = () => {
      if (sigue.current()) yaSono.current = true;
      else if (yaSono.current || performance.now() - empezo.current > ESPERA_ARRANQUE) {
        propio.current = null;
        setSonandoAqui(null);
        return;
      }
      cuadro = requestAnimationFrame(mirar);
    };
    cuadro = requestAnimationFrame(mirar);
    return () => cancelAnimationFrame(cuadro);
  }, [sonandoAqui]);

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

  /**
   * Suena con `arrancar`, o para si ya sonaba este mismo botón. `sigueSiendo`
   * dice si lo que suena todavía es lo suyo (si otro play lo reemplazó, el
   * botón vuelve a «oír» aunque el motor siga sonando).
   */
  const alternar = (id: string, arrancar: () => void, sigueSiendo?: () => boolean) => {
    if (propio.current === id) {
      parar();
      return;
    }
    propio.current = id;
    empezo.current = performance.now();
    yaSono.current = false;
    sigue.current = sigueSiendo ?? (() => motorAudio.sigueSonando);
    setSonandoAqui(id);
    arrancar();
  };

  return { sonandoAqui, alternar, parar };
}
