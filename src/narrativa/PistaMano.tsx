// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Pistas animadas (coach marks): una mano fantasma enseña el gesto dentro de la
 * propia interfaz, en bucle, y se va sola cuando el usuario hace lo que enseñaba.
 *
 *  - «arrastrar»: la mano agarra una cajita y la lleva a una caja.
 *  - «tocar»: la mano toca tres casillas seguidas.
 *
 * Se muestra la primera vez que se abre la pantalla, hasta que se haga el gesto o se
 * toque «Entendido» (queda guardado por navegador). Si en la pantalla hay varias, sale
 * una a la vez, en orden. El botón «¿Cómo se hace?» la vuelve a mostrar.
 */
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from './Icono';

const EVENTO = 'nv-pista';
const guardada = (clave: string) => {
  try {
    return localStorage.getItem(`sonora-pista-${clave}`) === 'vista';
  } catch {
    return false;
  }
};

/** Las pistas que esperan en pantalla (clave → orden). Solo se ve la de menor orden. */
const esperando = new Map<string, number>();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());
const primera = (): string | null => {
  let clave: string | null = null;
  let orden = Infinity;
  for (const [c, o] of esperando) if (o < orden) [clave, orden] = [c, o];
  return clave;
};
const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => void oyentes.delete(f);
};

/**
 * Cuándo se ve la pista de una clave. `orden` decide cuál sale primero si hay varias;
 * `hecho` la cierra sola; `alTocar` es un selector: tocar algo así también la cierra;
 * `puesta` es false si la pantalla no tiene aquello que la pista enseña (no estorba a las demás).
 */
export function usePista(clave: string, hecho = false, orden = 1, alTocar?: string, puesta = true) {
  const [pendiente, setPendiente] = useState(() => !guardada(clave));
  const [repetida, setRepetida] = useState(false);
  const cerrar = () => {
    setPendiente(false);
    setRepetida(false);
    try {
      localStorage.setItem(`sonora-pista-${clave}`, 'vista');
    } catch {
      /* sin almacenamiento: se queda solo en esta sesión */
    }
  };
  const activa = (pendiente || repetida) && puesta;
  // Hacer el gesto es la mejor señal de que ya se entendió.
  useEffect(() => {
    if (hecho && activa) cerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hecho]);
  useEffect(() => {
    if (!activa || !alTocar) return;
    const oyente = (ev: Event) => {
      if ((ev.target as Element | null)?.closest?.(alTocar)) cerrar();
    };
    document.addEventListener('pointerdown', oyente, true);
    return () => document.removeEventListener('pointerdown', oyente, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa, alTocar]);
  useEffect(() => {
    const oyente = (ev: Event) => (ev as CustomEvent).detail === clave && setRepetida(true);
    window.addEventListener(EVENTO, oyente);
    return () => window.removeEventListener(EVENTO, oyente);
  }, [clave]);
  // Mientras está esperando, se anota; una que se pide repetir pasa adelante.
  useEffect(() => {
    if (!activa) return;
    esperando.set(clave, repetida ? -1 : orden);
    avisar();
    return () => {
      esperando.delete(clave);
      avisar();
    };
  }, [activa, repetida, clave, orden]);
  const turno = useSyncExternalStore(suscribir, primera);
  return { visible: activa && turno === clave, cerrar };
}

/** El botón que vuelve a mostrar la pista (`corto`: solo la manito, para sitios con poco espacio). */
export function BotonPista({ clave, corto = false }: { clave: string; corto?: boolean }) {
  return (
    <button
      type="button"
      className={`nv-pista__repetir ${corto ? 'nv-pista__repetir--corto' : ''}`}
      title="¿Cómo se hace?"
      aria-label="¿Cómo se hace? Ver la pista otra vez"
      onClick={() => window.dispatchEvent(new CustomEvent(EVENTO, { detail: clave }))}
    >
      <Icono n="hand-pointing-fill" tam={14} /> {!corto && '¿Cómo se hace?'}
    </button>
  );
}

interface Punto {
  x: number;
  y: number;
  w: number;
  h: number;
}

const medir = (el: Element | null | undefined): Punto | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } : null;
};

interface Props {
  modo: 'arrastrar' | 'tocar';
  /** Qué agarra (arrastrar) o dónde toca (tocar): se buscan en cada medida. */
  origen: () => Element | null;
  destinos: () => Element[];
  texto: string;
  /** Lo que lleva la cajita fantasma al arrastrar (sin esto, solo se mueve la mano). */
  etiqueta?: string;
  alCerrar: () => void;
}

export function PistaMano({ modo, origen, destinos, texto, etiqueta, alCerrar }: Props) {
  const [m, setM] = useState<{ o: Punto | null; d: Punto[] }>({ o: null, d: [] });

  // Se vuelve a medir de vez en cuando: la lista puede moverse o desplazarse.
  useLayoutEffect(() => {
    const medirTodo = () => {
      const o = medir(origen());
      const d = destinos().map(medir).filter((x): x is Punto => x !== null);
      setM((a) => {
        const igual = (p: Punto | null, q: Punto | null) => (p === null && q === null) || (p && q && Math.abs(p.x - q.x) < 2 && Math.abs(p.y - q.y) < 2);
        return igual(a.o, o) && a.d.length === d.length && a.d.every((p, i) => igual(p, d[i])) ? a : { o, d };
      });
    };
    medirTodo();
    const id = window.setInterval(medirTodo, 500);
    return () => window.clearInterval(id);
    // origen y destinos buscan en el DOM; no cambian la medida por sí solos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puntos = modo === 'arrastrar' ? (m.o && m.d[0] ? [m.o, m.d[0]] : []) : m.d.slice(0, 3);
  if (puntos.length < 2 && !(modo === 'tocar' && puntos.length > 0)) return null;
  const ult = puntos[puntos.length - 1];
  const vars: Record<string, string> = {};
  puntos.forEach((p, i) => {
    vars[`--x${i}`] = `${p.x}px`;
    vars[`--y${i}`] = `${p.y}px`;
  });

  return createPortal(
    <div className="nv nv--incrustado nv-pista" style={vars as React.CSSProperties} aria-hidden={false}>
      {modo === 'arrastrar' ? (
        <>
          <span className="nv-pista__objetivo" style={{ left: ult.x - ult.w / 2, top: ult.y - ult.h / 2, width: ult.w, height: ult.h }} />
          {etiqueta && <span className="nv-pista__cajita">{etiqueta}</span>}
          <span className="nv-pista__mano nv-pista__mano--arrastrar">
            <Icono n="hand-pointing-fill" tam={34} />
          </span>
        </>
      ) : (
        <>
          {puntos.map((p, i) => (
            <span key={i} className="nv-pista__casilla" style={{ left: p.x - p.w / 2, top: p.y - p.h / 2, width: p.w, height: p.h, animationDelay: `${0.55 + i * 0.95}s` }} />
          ))}
          <span className="nv-pista__mano nv-pista__mano--tocar">
            <Icono n="hand-pointing-fill" tam={34} />
          </span>
        </>
      )}
      <div className="nv-pista__globo" style={{ left: Math.min(ult.x, window.innerWidth - 230), top: Math.min(ult.y + ult.h / 2 + 14, window.innerHeight - 110) }}>
        <span>{texto}</span>
        <button type="button" onClick={alCerrar}>
          Entendido
        </button>
      </div>
    </div>,
    document.body,
  );
}
