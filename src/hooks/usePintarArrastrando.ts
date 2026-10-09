/**
 * Pintar varias casillas de un tirón, también con el dedo.
 *
 * Con mouse basta `onPointerEnter`: el puntero va entrando en cada celda y
 * cada una avisa. Con el dedo no pasa: el navegador le entrega todos los
 * eventos del arrastre a la celda donde empezó el toque, así que las demás
 * nunca se enteran y solo se pinta una.
 *
 * La salida es mirar en cada movimiento qué hay debajo del dedo. Cada celda
 * se marca con `data-pintar="<clave>"` y el hook avisa cuando el dedo entra
 * en una clave distinta de la anterior.
 */
import { useCallback, useRef } from 'react';
import type { PointerEvent as PointerEventoReact } from 'react';

export interface Pintado {
  /** En el onPointerDown de la celda, con su clave. */
  alBajar: (evento: PointerEventoReact<HTMLElement>, clave: string) => void;
  /** En el onPointerMove de la celda. */
  alMover: (evento: PointerEventoReact<HTMLElement>) => void;
  /** En el onPointerUp / onPointerCancel del contenedor. */
  alSoltar: () => void;
  /** ¿Hay un arrastre en curso? */
  estaPintando: () => boolean;
}

export function usePintarArrastrando(alEntrar: (clave: string) => void): Pintado {
  const activo = useRef(false);
  const ultima = useRef<string | null>(null);
  const alEntrarRef = useRef(alEntrar);
  alEntrarRef.current = alEntrar;

  const alBajar = useCallback((evento: PointerEventoReact<HTMLElement>, clave: string) => {
    activo.current = true;
    ultima.current = clave;
    // Capturar el puntero mantiene vivos los pointermove aunque el dedo
    // se salga de la celda donde empezó.
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId);
    } catch {
      // Algunos navegadores lo rechazan si el puntero ya se soltó; no importa.
    }
  }, []);

  const alMover = useCallback((evento: PointerEventoReact<HTMLElement>) => {
    if (!activo.current) return;
    const debajo = document.elementFromPoint(evento.clientX, evento.clientY);
    const celda = (debajo as HTMLElement | null)?.closest<HTMLElement>('[data-pintar]');
    const clave = celda?.dataset.pintar;
    if (!clave || clave === ultima.current) return;
    ultima.current = clave;
    alEntrarRef.current(clave);
  }, []);

  const alSoltar = useCallback(() => {
    activo.current = false;
    ultima.current = null;
  }, []);

  const estaPintando = useCallback(() => activo.current, []);

  return { alBajar, alMover, alSoltar, estaPintando };
}
