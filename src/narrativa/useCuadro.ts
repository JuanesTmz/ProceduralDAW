/**
 * Corre una función en cada cuadro de la pantalla (60 veces por segundo).
 *
 * Los cabezales se mueven así, escribiendo directo en el estilo, sin pasar
 * por React: si cada cuadro redibujara la pantalla entera, el movimiento
 * saldría a saltos.
 */
import { useEffect, useRef } from 'react';

export function useCuadro(alCuadro: () => void): void {
  const fn = useRef(alCuadro);
  fn.current = alCuadro;
  useEffect(() => {
    let id = 0;
    const paso = () => {
      fn.current();
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, []);
}
