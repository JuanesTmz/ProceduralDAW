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
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from './Icono';
import { useEnDemo } from '../componentes/demo';

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
  // Dentro de un tutorial en video no se muestran: la mano del video ya enseña.
  const demo = useEnDemo();
  const activa = (pendiente || repetida) && puesta && !demo;
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
  /** Debajo (o encima) de qué va el globo, si no es del objetivo: p. ej. el nodo entero con su nombre. */
  ancla?: () => Element | null;
  alCerrar: () => void;
}

/** Mueve cada contenedor con desplazamiento (y, si hace falta, la página) para que el elemento se vea. */
function asomar(el: Element): void {
  for (let padre = el.parentElement; padre && padre !== document.body; padre = padre.parentElement) {
    const estilo = getComputedStyle(padre);
    if (!/(auto|scroll)/.test(estilo.overflowY) || padre.scrollHeight <= padre.clientHeight) continue;
    const a = el.getBoundingClientRect();
    const b = padre.getBoundingClientRect();
    if (a.top < b.top + 8) padre.scrollTop -= b.top + 8 - a.top;
    else if (a.bottom > b.bottom - 8) padre.scrollTop += a.bottom - (b.bottom - 8);
  }
  const r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'nearest' });
}

/** Un objetivo más grande que una casilla (una tarjeta, un botón): se resalta con borde, sin taparlo. */
const esGrande = (p: Punto) => p.w > 60 || p.h > 60;

interface Caja {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const cajaDe = (p: Punto): Caja => ({ x0: p.x - p.w / 2, y0: p.y - p.h / 2, x1: p.x + p.w / 2, y1: p.y + p.h / 2 });
const cruce = (a: Caja, b: Caja) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/**
 * Dónde va el globo: debajo del objetivo, encima, a un lado o, si nada de eso
 * sirve (un celular acostado), en la esquina más cercana. Gana el primer
 * lugar que cabe en la pantalla y no tapa nada de lo que la mano enseña.
 * Devuelve el centro en x (el globo se corre −50 % con CSS) y el borde de arriba.
 */
function lugarDelGlobo(ref: Punto, tam: { w: number; h: number }, evitar: Punto[]): { left: number; top: number } {
  const margen = 8;
  const aire = 14;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const enX = (x: number) => Math.min(Math.max(margen, x), W - margen - tam.w);
  const enY = (y: number) => Math.min(Math.max(margen, y), H - margen - tam.h);
  const r = cajaDe(ref);
  const junto = [
    { x: enX(ref.x - tam.w / 2), y: r.y1 + aire },
    { x: enX(ref.x - tam.w / 2), y: r.y0 - aire - tam.h },
    { x: r.x1 + aire, y: enY(ref.y - tam.h / 2) },
    { x: r.x0 - aire - tam.w, y: enY(ref.y - tam.h / 2) },
  ];
  const lejos = (c: { x: number; y: number }) => Math.hypot(c.x + tam.w / 2 - ref.x, c.y + tam.h / 2 - ref.y);
  const esquinas = [
    { x: margen, y: margen },
    { x: W - margen - tam.w, y: margen },
    { x: margen, y: H - margen - tam.h },
    { x: W - margen - tam.w, y: H - margen - tam.h },
  ].sort((a, b) => lejos(a) - lejos(b));
  const cabe = (c: { x: number; y: number }) => c.x >= margen - 0.5 && c.y >= margen - 0.5 && c.x + tam.w <= W - margen + 0.5 && c.y + tam.h <= H - margen + 0.5;
  const tapa = (c: { x: number; y: number }) => {
    const g = { x0: c.x, y0: c.y, x1: c.x + tam.w, y1: c.y + tam.h };
    return [ref, ...evitar].reduce((suma, p) => suma + cruce(g, cajaDe(p)), 0);
  };
  const posibles = [...junto, ...esquinas].filter(cabe);
  const elegido = posibles.find((c) => tapa(c) === 0) ?? [...posibles].sort((a, b) => tapa(a) - tapa(b))[0] ?? { x: enX(ref.x - tam.w / 2), y: enY(r.y1 + aire) };
  return { left: elegido.x + tam.w / 2, top: elegido.y };
}

export function PistaMano({ modo, origen, destinos, texto, etiqueta, ancla, alCerrar }: Props) {
  const [m, setM] = useState<{ o: Punto | null; d: Punto[]; a: Punto | null }>({ o: null, d: [], a: null });
  const globo = useRef<HTMLDivElement>(null);
  const [tamGlobo, setTamGlobo] = useState({ w: 230, h: 110 });
  // El globo se mide a sí mismo: así nunca se sale de la pantalla (en un celular acostado no cabe debajo).
  useLayoutEffect(() => {
    const g = globo.current;
    if (!g) return;
    const { width, height } = g.getBoundingClientRect();
    if (Math.abs(width - tamGlobo.w) > 1 || Math.abs(height - tamGlobo.h) > 1) setTamGlobo({ w: width, h: height });
  });

  // Si lo que enseña quedó fuera de la vista (en un celular acostado, más abajo, o
  // escondido en un estante con desplazamiento), se asoma una vez al aparecer.
  useEffect(() => {
    for (const el of [origen(), destinos()[0]]) if (el) asomar(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se vuelve a medir de vez en cuando: la lista puede moverse o desplazarse.
  useLayoutEffect(() => {
    const medirTodo = () => {
      const o = medir(origen());
      const d = destinos().map(medir).filter((x): x is Punto => x !== null);
      const an = medir(ancla?.());
      setM((a) => {
        const igual = (p: Punto | null, q: Punto | null) => (p === null && q === null) || (p && q && Math.abs(p.x - q.x) < 2 && Math.abs(p.y - q.y) < 2);
        return igual(a.o, o) && igual(a.a, an) && a.d.length === d.length && a.d.every((p, i) => igual(p, d[i])) ? a : { o, d, a: an };
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
  // El globo se centra en el objetivo, pero se pone debajo (o encima) del ancla si la hay.
  const refGlobo = m.a ? { x: ult.x, y: m.a.y, w: ult.w, h: m.a.h } : ult;
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
            <span key={i} className={`nv-pista__casilla ${esGrande(p) ? 'nv-pista__casilla--grande' : ''}`} style={{ left: p.x - p.w / 2, top: p.y - p.h / 2, width: p.w, height: p.h, animationDelay: `${0.55 + i * 0.95}s` }} />
          ))}
          <span className="nv-pista__mano nv-pista__mano--tocar">
            <Icono n="hand-pointing-fill" tam={34} />
          </span>
        </>
      )}
      <div ref={globo} className="nv-pista__globo" style={lugarDelGlobo(refGlobo, tamGlobo, puntos)}>
        <span>{texto}</span>
        <button type="button" onClick={alCerrar}>
          Entendido
        </button>
      </div>
    </div>,
    document.body,
  );
}
