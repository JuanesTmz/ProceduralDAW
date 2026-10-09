/**
 * El arco: un semicírculo hueco donde cada sección ocupa el ángulo que le
 * toca del tiempo total y crece hacia afuera según su energía.
 *
 * Es un solo dibujo para dos cosas que antes iban en pantallas distintas:
 * cuánto dura cada parte (el ángulo) y qué tan llena suena (el grosor).
 * Arrastrar un punto del borde reparte el tiempo entre dos partes vecinas.
 */
import { useEffect, useRef } from 'react';
import type { PointerEvent as EventoPuntero, KeyboardEvent as EventoTeclado } from 'react';
import { motorAudio } from '../audio/motorAudio';
import type { NombreSeccion, Seccion } from '../estado/tipos';

/** Un color por sección, los mismos del resto de la app. */
export const COLOR_SECCION: Record<NombreSeccion, string> = {
  intro: 'var(--azul)',
  estrofa: 'var(--coral)',
  coro: 'var(--verde)',
  cierre: 'var(--lila)',
};

const ANCHO = 440;
const ALTO = 252;
const CX = ANCHO / 2;
const CY = 224;
const RADIO_INTERIOR = 94;
/** Grosor con energía 0: la sección se ve aunque esté apagada. */
const GROSOR_MINIMO = 32;
/** Lo que suma la energía al grosor. */
const GROSOR_ENERGIA = 52;
const RADIO_MAXIMO = RADIO_INTERIOR + GROSOR_MINIMO + GROSOR_ENERGIA;
/** Las asas van dentro del anillo, a la altura del borde interior. */
const RADIO_ASA = RADIO_INTERIOR + 16;
/** Aire entre secciones, en fracción del semicírculo. */
const SEPARACION = 0.006;

function radioExterior(intensidad: number): number {
  return RADIO_INTERIOR + GROSOR_MINIMO + GROSOR_ENERGIA * Math.max(0, Math.min(1, intensidad));
}

/** Fracción 0..1 del semicírculo → punto en el lienzo. */
function punto(fraccion: number, radio: number): { x: number; y: number } {
  const angulo = Math.PI * (1 - fraccion);
  return { x: CX + radio * Math.cos(angulo), y: CY - radio * Math.sin(angulo) };
}

/** Sector de corona circular entre dos fracciones. */
function sector(f0: number, f1: number, ri: number, ro: number): string {
  const a = punto(f0, ro);
  const b = punto(f1, ro);
  const c = punto(f1, ri);
  const d = punto(f0, ri);
  return [
    `M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
    `A ${ro} ${ro} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`,
    `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`,
    `A ${ri} ${ri} 0 0 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * El avance que publica el motor está en vueltas del patrón; el dibujo está
 * en tiempo. Esta conversión evita que la aguja se desfase del borde cuando
 * una sección corre a otro tempo.
 */
function fraccionDeTiempo(avance: number, compases: number[], proporciones: number[]): number {
  const total = compases.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let vueltas = avance * total;
  let acumulado = 0;
  for (let i = 0; i < compases.length; i++) {
    if (vueltas <= compases[i] || i === compases.length - 1) {
      return acumulado + proporciones[i] * Math.min(1, vueltas / compases[i]);
    }
    vueltas -= compases[i];
    acumulado += proporciones[i];
  }
  return 1;
}

interface Props {
  secciones: Seccion[];
  /** Qué parte del tiempo total ocupa cada sección (suman 1). */
  proporciones: number[];
  seleccionada: number;
  alSeleccionar: (indice: number) => void;
  /** Arrastre: el límite `indice` se mueve a esta fracción del total. */
  alMoverLimite: (indice: number, fraccion: number) => void;
  /** Teclado: el límite `indice` se corre `delta` vueltas. */
  alAjustarLimite: (indice: number, delta: number) => void;
}

export function ArcoDona({
  secciones,
  proporciones,
  seleccionada,
  alSeleccionar,
  alMoverLimite,
  alAjustarLimite,
}: Props) {
  const lienzo = useRef<SVGSVGElement>(null);
  const aguja = useRef<SVGGElement>(null);

  // La aguja se mueve varias veces por segundo: se escribe en el DOM
  // directamente, sin pasar por el estado de React.
  const compases = secciones.map((s) => s.compases);
  const datos = useRef({ compases, proporciones });
  datos.current = { compases, proporciones };

  useEffect(
    () =>
      motorAudio.alCambiarPaso(() => {
        const g = aguja.current;
        if (!g) return;
        if (!motorAudio.estaSonando || motorAudio.seccionActual < 0) {
          g.style.opacity = '0';
          return;
        }
        const { compases: c, proporciones: p } = datos.current;
        const fraccion = fraccionDeTiempo(motorAudio.progresoPieza, c, p);
        g.style.opacity = '1';
        g.setAttribute('transform', `rotate(${(fraccion * 180).toFixed(2)} ${CX} ${CY})`);
      }),
    [],
  );

  /** Dónde cae el puntero, en fracción del semicírculo. */
  const fraccionDesde = (evento: EventoPuntero<SVGCircleElement>): number => {
    const svg = lienzo.current;
    if (!svg) return 0;
    const caja = svg.getBoundingClientRect();
    const escala = ANCHO / caja.width;
    const x = (evento.clientX - caja.left) * escala;
    const y = (evento.clientY - caja.top) * escala;
    let angulo = Math.atan2(CY - y, x - CX);
    // Por debajo de la línea del centro no hay arco: se pega al extremo.
    if (angulo < 0) angulo = x < CX ? Math.PI : 0;
    return Math.max(0, Math.min(1, 1 - angulo / Math.PI));
  };

  const teclas = (indice: number) => (evento: EventoTeclado<SVGCircleElement>) => {
    const paso =
      evento.key === 'ArrowLeft' || evento.key === 'ArrowDown'
        ? -1
        : evento.key === 'ArrowRight' || evento.key === 'ArrowUp'
          ? 1
          : 0;
    if (paso === 0) return;
    evento.preventDefault();
    alAjustarLimite(indice, paso);
  };

  // Acumulado para saber dónde empieza y termina cada sección.
  const limites: number[] = [0];
  for (const p of proporciones) limites.push(limites[limites.length - 1] + p);

  return (
    <svg
      ref={lienzo}
      className="dona"
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="group"
      aria-label="Estructura de la canción: cuánto dura cada parte"
    >
      {/* Techo de energía: hasta dónde puede crecer una sección. */}
      <path className="dona__techo" d={sector(0, 1, RADIO_MAXIMO - 1, RADIO_MAXIMO)} />

      {secciones.map((seccion, i) => {
        const inicio = limites[i];
        const fin = limites[i + 1];
        const aire = Math.min(SEPARACION, (fin - inicio) / 3);
        const ro = radioExterior(seccion.intensidad);
        const medio = (inicio + fin) / 2;
        const etiqueta = punto(medio, (RADIO_INTERIOR + ro) / 2);
        const porcentaje = Math.round(proporciones[i] * 100);
        return (
          <g
            key={seccion.id}
            className={`dona__parte ${seleccionada === i ? 'dona__parte--elegida' : ''}`}
            style={{ color: COLOR_SECCION[seccion.id] }}
            onClick={() => alSeleccionar(i)}
          >
            <path
              className="dona__sector"
              d={sector(inicio + aire, fin - aire, RADIO_INTERIOR, ro)}
            >
              <title>
                {seccion.etiqueta}: {porcentaje}% de la canción
              </title>
            </path>
            {fin - inicio > 0.08 && (
              <text className="dona__porcentaje" x={etiqueta.x} y={etiqueta.y}>
                {porcentaje}%
              </text>
            )}
          </g>
        );
      })}

      {/* Un asa por cada límite entre dos secciones vecinas. */}
      {secciones.slice(0, -1).map((seccion, i) => {
        const f = limites[i + 1];
        const centro = punto(f, RADIO_ASA);
        const dentro = punto(f, RADIO_INTERIOR - 4);
        const fuera = punto(f, RADIO_MAXIMO + 4);
        return (
          <g key={`limite-${seccion.id}`} className="dona__limite">
            <line className="dona__guia" x1={dentro.x} y1={dentro.y} x2={fuera.x} y2={fuera.y} />
            <circle
              className="dona__asa"
              cx={centro.x}
              cy={centro.y}
              r="11"
              tabIndex={0}
              role="slider"
              aria-label={`Reparto entre ${seccion.etiqueta} y ${secciones[i + 1].etiqueta}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(f * 100)}
              aria-valuetext={`${Math.round(f * 100)}% de la canción`}
              onKeyDown={teclas(i)}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                e.stopPropagation();
              }}
              onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                alMoverLimite(i, fraccionDesde(e));
              }}
              onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
            />
          </g>
        );
      })}

      {/* La aguja: por dónde va la pieza mientras suena. */}
      <g ref={aguja} className="dona__aguja" style={{ opacity: 0 }}>
        <line x1={CX - RADIO_INTERIOR + 10} y1={CY} x2={CX - RADIO_MAXIMO - 6} y2={CY} />
        <circle cx={CX - RADIO_MAXIMO - 6} cy={CY} r="3.5" />
      </g>
    </svg>
  );
}
