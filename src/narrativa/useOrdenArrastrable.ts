/**
 * Reordenar una fila de tarjetas arrastrando, con el dedo o el ratón.
 *
 * Mientras se arrastra, la tarjeta agarrada sigue al dedo y las demás se
 * corren para hacerle sitio. Al soltar se guarda el orden nuevo y cada
 * tarjeta se desliza desde donde estaba hasta su lugar (la técnica FLIP:
 * se mide antes, se mide después y se anima la diferencia).
 *
 * Un toque sin arrastrar sigue siendo un toque: abre la tarjeta.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as EventoPuntero } from 'react';

const UMBRAL = 8;
const CURVA = 'cubic-bezier(.2,.8,.2,1)';

interface Arrastre {
  desde: number;
  hasta: number;
  dx: number;
  anchos: number[];
  centros: number[];
  hueco: number;
}

export function useOrdenArrastrable(
  ids: string[],
  alSoltar: (orden: string[]) => void,
  alTocar: (id: string) => void,
) {
  const nodos = useRef(new Map<string, HTMLElement>());
  const inicio = useRef<{ x: number; i: number; activo: boolean } | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const actual = useRef<Arrastre | null>(null);
  const antes = useRef<Map<string, number> | null>(null);

  // FLIP: tras guardar el orden nuevo, cada tarjeta arranca donde se veía.
  const clave = ids.join('|');
  useLayoutEffect(() => {
    const previas = antes.current;
    if (!previas) return;
    antes.current = null;
    for (const [id, el] of nodos.current) {
      const izquierda = previas.get(id);
      if (izquierda === undefined) continue;
      const delta = izquierda - el.getBoundingClientRect().left;
      if (Math.abs(delta) < 1) continue;
      el.style.transition = 'none';
      el.style.transform = `translateX(${delta}px)`;
      void el.offsetWidth;
      el.style.transition = `transform 280ms ${CURVA}`;
      el.style.transform = '';
    }
  }, [clave]);

  const registrar = (id: string) => (el: HTMLElement | null) => {
    if (el) nodos.current.set(id, el);
    else nodos.current.delete(id);
  };

  const alBajar = (i: number) => (ev: EventoPuntero<HTMLElement>) => {
    if (ev.button !== 0) return;
    inicio.current = { x: ev.clientX, i, activo: false };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };

  const alMover = (ev: EventoPuntero<HTMLElement>) => {
    const s = inicio.current;
    if (!s) return;
    const dx = ev.clientX - s.x;
    let a = actual.current;
    if (!s.activo) {
      if (Math.abs(dx) < UMBRAL) return;
      s.activo = true;
      const cajas = ids.map((id) => nodos.current.get(id)!.getBoundingClientRect());
      a = {
        desde: s.i,
        hasta: s.i,
        dx,
        anchos: cajas.map((c) => c.width),
        centros: cajas.map((c) => c.left + c.width / 2),
        hueco: cajas.length > 1 ? cajas[1].left - cajas[0].right : 10,
      };
    }
    if (!a) return;
    const centro = a.centros[a.desde] + dx;
    const hasta = a.centros.filter((c, j) => j !== a!.desde && c < centro).length;
    const siguiente = { ...a, dx, hasta };
    actual.current = siguiente;
    setArrastre(siguiente);
  };

  const alSubir = () => {
    const s = inicio.current;
    inicio.current = null;
    if (!s) return;
    if (!s.activo) {
      alTocar(ids[s.i]);
      return;
    }
    const a = actual.current;
    actual.current = null;
    // Se mide dónde se ve cada tarjeta justo antes de soltar.
    const posiciones = new Map<string, number>();
    for (const [id, el] of nodos.current) posiciones.set(id, el.getBoundingClientRect().left);
    antes.current = posiciones;
    setArrastre(null);
    if (!a || a.hasta === a.desde) {
      // Vuelve a su sitio con la misma animación.
      requestAnimationFrame(() => {
        const el = nodos.current.get(ids[s.i]);
        if (!el) return;
        const delta = (posiciones.get(ids[s.i]) ?? 0) - el.getBoundingClientRect().left;
        el.style.transition = 'none';
        el.style.transform = `translateX(${delta}px)`;
        void el.offsetWidth;
        el.style.transition = `transform 280ms ${CURVA}`;
        el.style.transform = '';
      });
      antes.current = null;
      return;
    }
    const orden = [...ids];
    const [movida] = orden.splice(a.desde, 1);
    orden.splice(a.hasta, 0, movida);
    alSoltar(orden);
  };

  const estilo = (i: number): CSSProperties => {
    const a = arrastre;
    if (!a) return {};
    if (i === a.desde) {
      return {
        transform: `translateX(${a.dx}px) scale(1.04)`,
        transition: 'none',
        zIndex: 5,
        boxShadow: '0 18px 40px #000a',
      };
    }
    const paso = a.anchos[a.desde] + a.hueco;
    let x = 0;
    if (a.desde < a.hasta && i > a.desde && i <= a.hasta) x = -paso;
    if (a.hasta < a.desde && i >= a.hasta && i < a.desde) x = paso;
    return { transform: `translateX(${x}px)`, transition: `transform 220ms ${CURVA}` };
  };

  const manejadores = (i: number) => ({
    ref: registrar(ids[i]),
    onPointerDown: alBajar(i),
    onPointerMove: alMover,
    onPointerUp: alSubir,
    onPointerCancel: alSubir,
    style: estilo(i),
  });

  return { manejadores, arrastrando: arrastre !== null, agarrada: arrastre?.desde ?? -1 };
}
