// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
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
  /**
   * Si no cabe entero ni debajo ni encima (pantalla baja), se abre al lado
   * del ancla, con toda la altura: así nunca tapa lo que se tocó.
   */
  alLado?: boolean;
  children: ReactNode;
}

export function MenuFlotante({ ancla, alCerrar, className = '', alLado = false, children }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; alto: number } | null>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  const ubicar = () => {
    const menu = caja.current;
    if (!menu) return;
    const a = ancla.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Nunca sube sobre el encabezado de los pasos: en una pantalla baja taparía «Escuchar».
    const techo = Math.max(BORDE, (document.querySelector('.nv-camino')?.getBoundingClientRect().bottom ?? 0) + BORDE);
    const cabeAbajo = a.bottom + AIRE + m.height <= vh - BORDE;
    const cabeArriba = a.top - AIRE - m.height >= techo;
    const derecha = vw - BORDE - (a.right + AIRE) >= m.width;
    const izquierda = a.left - AIRE - BORDE >= m.width;
    let top: number;
    let left: number;
    if (!cabeAbajo && !cabeArriba && alLado && (derecha || izquierda)) {
      // Al lado: a la altura de lo que se tocó, sin salirse por abajo.
      top = Math.max(techo, Math.min(a.top - 40, vh - BORDE - m.height));
      left = derecha ? a.right + AIRE : a.left - AIRE - m.width;
    } else {
      top = cabeAbajo ? a.bottom + AIRE : Math.max(techo, a.top - AIRE - m.height);
      left = Math.min(Math.max(BORDE, a.left), vw - m.width - BORDE);
    }
    // Si no cabe entero, se desplaza por dentro.
    const alto = Math.max(160, vh - top - BORDE);
    setPos((p) => (p && p.left === left && p.top === top && p.alto === alto ? p : { left, top, alto }));
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
      <div ref={caja} className={`nv-lista-flotante ${className}`} style={pos ? { maxHeight: pos.alto, overflowY: 'auto' } : undefined}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
