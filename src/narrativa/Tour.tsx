/**
 * El tour guiado: ilumina una parte de la pantalla y una burbuja explica
 * qué es y para qué sirve. Es el mismo sistema de NeuralOracle, sin
 * personaje: la burbuja se mueve hasta lo que señala para llevar la mirada.
 *
 * La burbuja nunca se sale de la pantalla: se arman varias posiciones
 * posibles (debajo, encima, a los lados, al pie) y se elige la que menos
 * tape lo señalado. Solo el texto se desplaza por dentro; el título y los
 * botones quedan siempre a la vista.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PasoTour } from './pasosGuia';

const MARGEN = 14;
const BORDE = 12;
/** Anchos que prueba la burbuja, del más angosto al más ancho. */
const ANCHOS = [400, 480, 560, 680];
const ANCHO = ANCHOS[0];

interface Caja {
  left: number;
  top: number;
  ancho: number;
  alto: number;
}

interface Props {
  pasos: PasoTour[];
  abierto: boolean;
  alCerrar: () => void;
}

const acotar = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function Tour({ pasos, abierto, alCerrar }: Props) {
  const [i, setI] = useState(0);
  const [detalle, setDetalle] = useState(false);
  const [foco, setFoco] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [pos, setPos] = useState<Caja | null>(null);
  const burbuja = useRef<HTMLDivElement>(null);
  const cuerpo = useRef<HTMLDivElement>(null);
  const paso = pasos[i];

  const ubicar = useCallback(() => {
    const b = burbuja.current;
    if (!b) return;
    // El área visible de verdad (sin la barra de desplazamiento de la página).
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // El alto que necesita la burbuja para mostrar TODO su texto con cada
    // ancho posible: nunca se recorta ni se desplaza; si no cabe, se ensancha.
    // Se mide sobre una copia invisible: tocar la burbuja de verdad dispararía
    // su observador de tamaño y la animación, y se quedaría trabada.
    const copia = b.cloneNode(true) as HTMLDivElement;
    copia.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;transition:none;max-height:none';
    b.parentElement?.appendChild(copia);
    const medidas = [...new Set(ANCHOS.map((w) => Math.min(w, vw - BORDE * 2)))].map((ancho) => {
      copia.style.width = `${ancho}px`;
      return { ancho, alto: copia.offsetHeight };
    });
    copia.remove();

    const encajar = (c: Caja): Caja => ({
      ...c,
      left: acotar(c.left, BORDE, vw - c.ancho - BORDE),
      top: acotar(c.top, BORDE, vh - c.alto - BORDE),
    });
    const tapado = (c: Caja, z: DOMRect | null) => {
      if (!z || z.width < 1 || z.height < 1) return 0;
      const x = Math.min(c.left + c.ancho, z.right) - Math.max(c.left, z.left);
      const y = Math.min(c.top + c.alto, z.bottom) - Math.max(c.top, z.top);
      return x > 0 && y > 0 ? (x * y) / (z.width * z.height) : 0;
    };
    const poner = (c: Caja) =>
      setPos((p) => {
        const n = { left: Math.round(c.left), top: Math.round(c.top), ancho: c.ancho, alto: c.alto };
        return p && p.left === n.left && p.top === n.top && p.ancho === n.ancho && p.alto === n.alto ? p : n;
      });
    const caben = medidas.filter((m) => m.alto <= vh - BORDE * 2);
    const mayor = medidas[medidas.length - 1];

    const el = paso?.objetivo ? document.querySelector(paso.objetivo) : null;
    if (!el) {
      setFoco(null);
      const m = caben[0] ?? mayor;
      return poner(encajar({ left: (vw - m.ancho) / 2, top: (vh - m.alto) / 2, ancho: m.ancho, alto: m.alto }));
    }
    const r = el.getBoundingClientRect();
    setFoco({ left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 });

    // Candidatos: con cada ancho, debajo, encima, a los lados y al pie. Solo
    // valen los que caben enteros; gana el primero que no tapa lo señalado
    // (los anchos más angostos primero), si no, el que menos lo tapa.
    const candidatos: Caja[] = [];
    for (const { ancho, alto } of caben) {
      const centroX = r.left + r.width / 2 - ancho / 2;
      if (vh - r.bottom - MARGEN - BORDE >= alto) candidatos.push(encajar({ left: centroX, top: r.bottom + MARGEN, ancho, alto }));
      if (r.top - MARGEN - BORDE >= alto) candidatos.push(encajar({ left: centroX, top: r.top - alto - MARGEN, ancho, alto }));
      const centroY = r.top + r.height / 2 - alto / 2;
      if (vw - r.right - MARGEN - BORDE >= ancho) candidatos.push(encajar({ left: r.right + MARGEN, top: centroY, ancho, alto }));
      if (r.left - MARGEN - BORDE >= ancho) candidatos.push(encajar({ left: r.left - ancho - MARGEN, top: centroY, ancho, alto }));
    }
    for (const { ancho, alto } of caben) {
      candidatos.push(encajar({ left: r.left + r.width / 2 - ancho / 2, top: vh - alto - BORDE, ancho, alto }));
      candidatos.push(encajar({ left: r.left + r.width / 2 - ancho / 2, top: BORDE, ancho, alto }));
    }
    let elegido: Caja | null = null;
    let menor = Infinity;
    for (const c of candidatos) {
      const t = tapado(c, r);
      if (t === 0) {
        elegido = c;
        break;
      }
      if (t < menor) {
        menor = t;
        elegido = c;
      }
    }
    poner(elegido ?? encajar({ left: (vw - mayor.ancho) / 2, top: BORDE, ancho: mayor.ancho, alto: Math.min(mayor.alto, vh - BORDE * 2) }));
  }, [paso]);

  // Al cambiar de paso: traer lo señalado a la vista y ubicar la burbuja.
  useEffect(() => {
    if (!abierto) return;
    setDetalle(false);
    const el = paso?.objetivo ? document.querySelector(paso.objetivo) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const t1 = window.setTimeout(ubicar, 60);
    const t2 = window.setTimeout(ubicar, 420);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [abierto, i, paso, ubicar]);

  useLayoutEffect(() => {
    if (abierto) ubicar();
  }, [detalle, abierto, ubicar]);

  useEffect(() => {
    if (!abierto) return;
    const mover = () => ubicar();
    const ro = new ResizeObserver(mover);
    if (burbuja.current) ro.observe(burbuja.current);
    if (cuerpo.current) ro.observe(cuerpo.current);
    window.addEventListener('resize', mover);
    window.addEventListener('scroll', mover, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', mover);
      window.removeEventListener('scroll', mover, true);
    };
  }, [abierto, ubicar]);

  const cerrar = useCallback(() => {
    setI(0);
    alCerrar();
  }, [alCerrar]);
  const avanzar = useCallback(() => {
    if (i >= pasos.length - 1) cerrar();
    else setI((n) => n + 1);
  }, [i, pasos.length, cerrar]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        cerrar();
      }
      if (e.key === 'ArrowRight') avanzar();
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [abierto, avanzar, cerrar]);

  useEffect(() => {
    if (cuerpo.current) cuerpo.current.scrollTop = 0;
  }, [i]);

  if (!abierto || !paso) return null;

  return createPortal(
    <div className="nv nv--incrustado nv-tour" role="dialog" aria-modal="true" aria-label="Guía de SONORA">
      <div
        className={`nv-tour__foco ${foco ? '' : 'nv-tour__foco--sin'}`}
        style={foco ? { left: foco.left, top: foco.top, width: foco.width, height: foco.height } : undefined}
      />
      <div
        ref={burbuja}
        className="nv-tour__burbuja"
        style={{
          left: pos?.left ?? 0,
          top: pos?.top ?? 0,
          width: pos?.ancho ?? ANCHO,
          // Solo en pantallas diminutas, donde ni el ancho mayor alcanza, se limita el alto.
          maxHeight: pos && pos.alto >= document.documentElement.clientHeight - BORDE * 2 ? pos.alto : undefined,
          opacity: pos ? 1 : 0,
        }}
      >
        <div className="nv-tour__cabeza">
          <span className="nv-etiqueta nv-acento">
            {paso.seccion ?? 'GUÍA'} · {i + 1} de {pasos.length}
          </span>
          <strong className="nv-tour__titulo">{paso.titulo}</strong>
        </div>
        <div className="nv-tour__cuerpo" ref={cuerpo}>
          <p className="nv-tour__texto" dangerouslySetInnerHTML={{ __html: paso.texto }} />
          {detalle && paso.detalle && <p className="nv-tour__detalle" dangerouslySetInnerHTML={{ __html: paso.detalle }} />}
          {paso.detalle && (
            <button type="button" className="nv-tour__mas" onClick={() => setDetalle(!detalle)} aria-expanded={detalle}>
              {detalle ? '▲ Ya entendí' : '✦ Explícame más'}
            </button>
          )}
        </div>
        <div className="nv-tour__pie">
          <div className="nv-tour__puntos">
            {pasos.map((p, ix) => (
              <i key={p.id} className={ix === i ? 'nv-tour__punto--on' : ''} />
            ))}
          </div>
          <span className="nv-espacio" />
          {i > 0 && (
            <button type="button" className="nv-boton nv-boton--chico" onClick={() => setI(i - 1)} aria-label="Paso anterior">
              ←
            </button>
          )}
          <button type="button" className="nv-boton nv-boton--chico nv-tour__saltar" onClick={cerrar}>
            Saltar
          </button>
          <button type="button" className="nv-boton nv-boton--chico nv-boton--primario" onClick={avanzar}>
            {i === pasos.length - 1 ? paso.final ?? '¡Listo!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
