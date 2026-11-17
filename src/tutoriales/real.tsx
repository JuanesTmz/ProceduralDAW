// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Tutoriales con la interfaz de verdad.
 *
 * En vez de dibujar una caricatura de la pantalla, aquí se monta la pantalla
 * real de la app (la historia, las celdas, la ventana de sonidos…) con un
 * proyecto de demostración que vive solo en memoria. Un guion dice, cuadro a
 * cuadro, qué se toca: la mano de caricatura viaja hasta el botón real
 * (se mide dónde quedó en la pantalla), lo toca, y el guion hace el cambio,
 * ya sea con un clic de verdad o cambiando el proyecto de demostración.
 *
 * - `PantallaReal` monta la pantalla dentro del escenario del video.
 * - `useGuion` corre el guion y mueve la mano (`ManoReal`).
 *
 * Al adelantar o volver atrás en el video, la pantalla se rearma desde el
 * principio y el guion se pone al día, un paso por cuadro.
 */
import { memo, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode, RefObject } from 'react';
import { EnDemo } from '../componentes/demo';
import { ProveedorDemo, type ApiDemo } from '../estado/ProyectoContext';
import { ContextoNube } from '../nube/contexto';
import type { Proyecto } from '../estado/tipos';
import { ANCHO, useFotograma } from './motor';
import { Mano } from './piezas';

// ------------------------------------------------------------ el guion

/**
 * Dónde está algo en la pantalla: un selector CSS, y si lleva «::texto»,
 * el primero de esos elementos que contiene ese texto.
 */
export type Donde = string;

interface Base {
  /** El cuadro en que la mano llega y toca. */
  f: number;
  en: Donde;
  /** Dónde dentro del elemento, de 0 a 1 (por defecto el centro). */
  fx?: number;
  fy?: number;
}

/** Un toque: en el cuadro `f` se hace clic en el elemento y/o se cambia el proyecto. */
export interface Toque extends Base {
  clic?: boolean;
  hacer?: (api: ApiDemo) => void;
  /** Solo señalar, sin el gesto de tocar. */
  senalar?: boolean;
}

/** Un gesto que dura: escribir, arrastrar un mando. `t` va de 0 a 1. */
export interface Tramo extends Base {
  hasta: number;
  tramo: (api: ApiDemo, t: number) => void;
  /** Dónde va el dedo a lo largo del gesto (fracción del ancho). */
  fxDe?: (t: number) => number;
}

export type Movimiento = Toque | Tramo;

const esTramo = (m: Movimiento): m is Tramo => 'hasta' in m;
const fin = (m: Movimiento) => (esTramo(m) ? m.hasta : m.f);

/** Cuántos cuadros tarda la mano en ir de un lugar al siguiente. */
const VIAJE = 18;

function buscar(raiz: HTMLElement, donde: Donde): HTMLElement | null {
  const [selector, texto] = donde.split('::');
  const todos = raiz.querySelectorAll<HTMLElement>(selector);
  if (!texto) return todos[0] ?? null;
  for (const el of todos) if (el.textContent?.includes(texto)) return el;
  return null;
}

/** Mueve los contenedores con desplazamiento para que el elemento se vea. */
function asomar(el: HTMLElement, raiz: HTMLElement): void {
  let padre = el.parentElement;
  while (padre && padre !== raiz) {
    const estilo = getComputedStyle(padre);
    if (/(auto|scroll)/.test(estilo.overflowY) && padre.scrollHeight > padre.clientHeight) {
      const a = el.getBoundingClientRect();
      const b = padre.getBoundingClientRect();
      if (a.top < b.top + 10) padre.scrollTop -= b.top + 10 - a.top;
      else if (a.bottom > b.bottom - 10) padre.scrollTop += a.bottom - (b.bottom - 10);
    }
    padre = padre.parentElement;
  }
}

/** El punto del elemento, en píxeles del escenario de 1280×720. */
function punto(el: HTMLElement, escenario: HTMLElement, fx = 0.5, fy = 0.5): { x: number; y: number } {
  const e = escenario.getBoundingClientRect();
  const escala = e.width / ANCHO || 1;
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width * fx - e.left) / escala, y: (r.top + r.height * fy - e.top) / escala };
}

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface EstadoGuion {
  /** Cuántos movimientos ya se hicieron (o se terminaron, si duran). */
  hechos: number;
  /** El último cuadro visto: si el video vuelve atrás, se rearma. */
  ultimo: number;
  /** Dónde quedó la mano al final de cada movimiento. */
  posiciones: Map<number, { x: number; y: number }>;
}

/**
 * Corre el guion en el cuadro actual. Devuelve la llave para rearmar la
 * pantalla (cambia al volver atrás) y las referencias que necesitan la
 * pantalla y la mano.
 */
export function useGuion(guion: Movimiento[]) {
  const f = useFotograma();
  const [vuelta, setVuelta] = useState(0);
  const api = useRef<ApiDemo | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const mano = useRef<HTMLDivElement>(null);
  const estado = useRef<EstadoGuion>({ hechos: 0, ultimo: -1, posiciones: new Map() });

  useLayoutEffect(() => {
    const e = estado.current;
    // Volvió atrás (o dio la vuelta): se arma todo de nuevo.
    if (f < e.ultimo) {
      e.hechos = 0;
      e.ultimo = f;
      e.posiciones.clear();
      setVuelta((v) => v + 1);
      return;
    }
    e.ultimo = f;
    const r = raiz.current;
    const a = api.current;
    if (!r || !a) return;

    // 1) Lo que toca hacer en este cuadro: a lo sumo un paso, para que la pantalla alcance a dibujarse.
    const siguiente = guion[e.hechos];
    if (siguiente && siguiente.f <= f) {
      if (esTramo(siguiente)) {
        const t = Math.min(1, (f - siguiente.f) / Math.max(1, siguiente.hasta - siguiente.f));
        siguiente.tramo(a, t);
        if (t >= 1) e.hechos += 1;
      } else {
        const el = buscar(r, siguiente.en);
        if (siguiente.clic && el) el.click();
        siguiente.hacer?.(a);
        e.hechos += 1;
      }
    }

    // 2) La mano: viaja al próximo movimiento, toca, y se queda.
    const nodo = mano.current;
    const escenario = r.closest<HTMLElement>('.tu-escenario');
    if (!nodo || !escenario) return;
    let i = -1;
    for (let k = 0; k < guion.length; k++) if (guion[k].f - VIAJE <= f) i = k;
    if (i < 0 || f > fin(guion[guion.length - 1]) + 45) {
      nodo.style.opacity = '0';
      return;
    }
    const m = guion[i];
    const el = buscar(r, m.en);
    let destino = e.posiciones.get(i);
    if (el) {
      if (f < m.f) asomar(el, r);
      const t = esTramo(m) ? Math.min(1, Math.max(0, (f - m.f) / Math.max(1, m.hasta - m.f))) : 0;
      const fx = esTramo(m) && m.fxDe ? m.fxDe(t) : (m.fx ?? 0.5);
      destino = punto(el, escenario, fx, m.fy ?? 0.5);
      if (f >= m.f) e.posiciones.set(i, destino);
    }
    if (!destino) return;
    const desde = e.posiciones.get(i - 1) ?? { x: 1320, y: 780 };
    const avance = suave(Math.min(1, Math.max(0, (f - (m.f - VIAJE)) / VIAJE)));
    const x = desde.x + (destino.x - desde.x) * avance;
    const y = desde.y + (destino.y - desde.y) * avance;
    nodo.style.opacity = '1';
    nodo.style.transform = `translate(${x}px, ${y}px)`;
  });

  // El gesto de tocar: se calcula con el cuadro, no hace falta medir.
  let toca = 0;
  for (const m of guion) {
    if (esTramo(m)) {
      if (f >= m.f && f <= m.hasta) toca = Math.max(toca, 0.55);
    } else if (!m.senalar) {
      toca = Math.max(toca, 1 - Math.abs(f - m.f) / 6);
    }
  }

  return { vuelta, api, raiz, mano, toca: Math.max(0, toca) };
}

/** La mano de caricatura, movida por `useGuion` (su posición la pone el guion). */
export function ManoReal({ refMano, toca }: { refMano: RefObject<HTMLDivElement | null>; toca: number }) {
  return (
    <div ref={refMano} className="tu-mano-real" style={{ opacity: 0 }}>
      <Mano x={0} y={0} toca={toca} />
    </div>
  );
}

// ------------------------------------------------------------ la pantalla

interface PropsPantalla {
  /** La pantalla de la app que se muestra (una referencia fija, para no redibujarla en cada cuadro). */
  Pantalla: ComponentType;
  /** El proyecto con que arranca. */
  inicial: () => Proyecto;
  api: RefObject<ApiDemo | null>;
  raiz: RefObject<HTMLDivElement | null>;
  /** Cambia para rearmarla desde el principio. */
  vuelta: number;
  x: number;
  y: number;
  /** Tamaño de la pantalla en píxeles de la app (antes de escalarla). */
  ancho: number;
  alto: number;
  escala: number;
}

/**
 * Monta una pantalla real de la app en el escenario, como una tablet. No
 * recibe toques: solo el guion la maneja. Está memorizada: se vuelve a
 * dibujar cuando cambia su proyecto, no en cada cuadro del video.
 */
export const PantallaReal = memo(function PantallaReal({ Pantalla, inicial, api, raiz, vuelta, x, y, ancho, alto, escala }: PropsPantalla) {
  return (
    <div
      className="tu-tableta"
      style={{ left: x - 12, top: y - 12, width: ancho * escala + 24, height: alto * escala + 24 }}
      // Los clics del guion no deben llegar al reproductor (que pausaría el video).
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={raiz}
        className="nv nv--incrustado tu-real"
        aria-hidden="true"
        style={{ width: ancho, height: alto, transform: `scale(${escala})` }}
      >
        <EnDemo.Provider value={true}>
          <ContextoNube.Provider value={null}>
            <ProveedorDemo key={vuelta} inicial={inicial} api={api as { current: ApiDemo | null }}>
              <Pantalla />
            </ProveedorDemo>
          </ContextoNube.Provider>
        </EnDemo.Provider>
      </div>
    </div>
  );
});

/**
 * Un aro que late sobre un elemento de la pantalla, con un letrero: para
 * mostrar lo que en el video no puede pasar de verdad (grabar con el micrófono).
 */
export function Halo({
  raiz,
  en,
  desde,
  hasta,
  texto,
  color = '#ff4d6d',
}: {
  raiz: RefObject<HTMLDivElement | null>;
  en: Donde;
  desde: number;
  hasta: number;
  texto: (f: number) => string;
  color?: string;
}) {
  const f = useFotograma();
  const nodo = useRef<HTMLDivElement>(null);
  const dentro = f >= desde && f < hasta;

  useLayoutEffect(() => {
    const r = raiz.current;
    const n = nodo.current;
    const escenario = r?.closest<HTMLElement>('.tu-escenario');
    if (!r || !n || !escenario || !dentro) return;
    const el = buscar(r, en);
    if (!el) return;
    const p = punto(el, escenario);
    n.style.transform = `translate(${p.x}px, ${p.y}px)`;
  });

  if (!dentro) return null;
  const late = 1 + 0.12 * Math.sin((f - desde) / 3);
  return (
    <div ref={nodo} className="tu-halo" style={{ ['--color' as string]: color }}>
      <span className="tu-halo__aro" style={{ transform: `translate(-50%, -50%) scale(${late})` }} />
      <span className="tu-halo__texto">{texto(f - desde)}</span>
    </div>
  );
}

/** Un fondo tranquilo para los tutoriales con la interfaz de verdad. */
export function FondoReal({ children }: { children?: ReactNode }) {
  return <div className="tu-fondo-real">{children}</div>;
}
