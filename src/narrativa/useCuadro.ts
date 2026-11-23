// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
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

const escrito = new WeakMap<HTMLElement, Map<string, string>>();

/**
 * Escribe un texto ('texto') o una propiedad de estilo en un nodo, pero solo
 * si cambió. Escribir lo mismo en cada cuadro obliga al navegador a volver a
 * pintar 60 veces por segundo aunque nada se mueva, y en la tablet (más aún
 * con una ventana abierta encima) eso vuelve lenta toda la pantalla.
 */
export function fijar(nodo: HTMLElement | null | undefined, propiedad: string, valor: string): void {
  if (!nodo) return;
  let previos = escrito.get(nodo);
  if (!previos) escrito.set(nodo, (previos = new Map()));
  if (previos.get(propiedad) === valor) return;
  previos.set(propiedad, valor);
  if (propiedad === 'texto') nodo.textContent = valor;
  else nodo.style.setProperty(propiedad, valor);
}
