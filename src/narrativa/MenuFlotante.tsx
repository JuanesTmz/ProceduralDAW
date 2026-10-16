/**
 * Un menú que flota encima de toda la interfaz, pegado a lo que lo abrió.
 *
 * Se pinta en <body> con posición fija: así no lo recorta ni le crea
 * scroll un contenedor que tenga altura máxima. Se abre debajo del ancla
 * si cabe y encima si no, sin salirse nunca de la pantalla. Se cierra al
 * tocar fuera, con Escape o si la página se desplaza.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

const AIRE = 6;
const BORDE = 10;

interface Props {
  ancla: HTMLElement;
  alCerrar: () => void;
  className?: string;
  children: ReactNode;
}

export function MenuFlotante({ ancla, alCerrar, className = '', children }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  const ubicar = () => {
    const menu = caja.current;
    if (!menu) return;
    const a = ancla.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cabeAbajo = a.bottom + AIRE + m.height <= vh - BORDE;
    const top = cabeAbajo ? a.bottom + AIRE : Math.max(BORDE, a.top - AIRE - m.height);
    const left = Math.min(Math.max(BORDE, a.left), vw - m.width - BORDE);
    setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
  };

  // Se mide antes de pintar, y otra vez si cambia el contenido (otro submenú).
  useLayoutEffect(ubicar);

  useEffect(() => {
    const fuera = (ev: PointerEvent) => {
      const t = ev.target as Node;
      if (caja.current?.contains(t) || ancla.contains(t)) return;
      cerrar.current();
    };
    const tecla = (ev: KeyboardEvent) => ev.key === 'Escape' && cerrar.current();
    const desplazar = (ev: Event) => {
      if (caja.current?.contains(ev.target as Node)) return;
      cerrar.current();
    };
    document.addEventListener('pointerdown', fuera, true);
    window.addEventListener('keydown', tecla);
    window.addEventListener('scroll', desplazar, true);
    window.addEventListener('resize', ubicar);
    return () => {
      document.removeEventListener('pointerdown', fuera, true);
      window.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', desplazar, true);
      window.removeEventListener('resize', ubicar);
    };
  });

  return createPortal(
    <div className="nv nv--incrustado nv-flotante" style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}>
      <div ref={caja} className={`nv-lista-flotante ${className}`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
