/**
 * El cuadro X/Y: la regla de una pista, en un solo gesto.
 *
 * Reemplaza al selector de tres modos y sus cinco deslizadores. El punto
 * donde el estudiante deja el dedo ES la regla, y las cuatro esquinas son
 * los cuatro caracteres que antes había que elegir por nombre:
 *
 *   arriba-izq  pocos golpes, sueltos      arriba-der  lleno y caótico
 *   abajo-izq   pocos golpes, firmes       abajo-der   lleno y machacado
 *
 * La ventaja no es que ocupe menos: es que se explora moviendo y oyendo, y
 * que el estudiante puede defenderlo ante el jurado señalando con el dedo.
 */
import { useCallback, useRef } from 'react';
import type { KeyboardEvent as EventoTecla, PointerEvent as EventoPuntero } from 'react';

interface Props {
  x: number;
  y: number;
  color: string;
  /** Apagado cuando la pista la arma el estudiante a mano. */
  activo: boolean;
  etiqueta: string;
  alMover: (x: number, y: number) => void;
}

export function CuadroXY({ x, y, color, activo, etiqueta, alMover }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);

  const desdeEvento = useCallback(
    (evento: EventoPuntero<HTMLDivElement>) => {
      const nodo = caja.current;
      if (!nodo) return;
      const r = nodo.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (evento.clientX - r.left) / r.width));
      // El eje Y crece hacia arriba, al revés que los píxeles de la pantalla.
      const ny = Math.max(0, Math.min(1, 1 - (evento.clientY - r.top) / r.height));
      alMover(nx, ny);
    },
    [alMover],
  );

  const alBajar = (evento: EventoPuntero<HTMLDivElement>) => {
    if (!activo) return;
    // Primero mover y después capturar: capturar puede fallar según el
    // navegador y el puntero, y eso no debe impedir que el punto se mueva.
    arrastrando.current = true;
    desdeEvento(evento);
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId);
    } catch {
      // Sin captura el arrastre sigue funcionando mientras el dedo no se salga.
    }
  };

  const alArrastrar = (evento: EventoPuntero<HTMLDivElement>) => {
    if (!activo || !arrastrando.current) return;
    desdeEvento(evento);
  };

  const alSoltar = () => {
    arrastrando.current = false;
  };

  // Con teclado se mueve de a poco, y con Mayús a saltos grandes.
  const alTeclear = (evento: EventoTecla<HTMLDivElement>) => {
    if (!activo) return;
    const paso = evento.shiftKey ? 0.12 : 0.04;
    let nx = x;
    let ny = y;
    if (evento.key === 'ArrowRight') nx = Math.min(1, x + paso);
    else if (evento.key === 'ArrowLeft') nx = Math.max(0, x - paso);
    else if (evento.key === 'ArrowUp') ny = Math.min(1, y + paso);
    else if (evento.key === 'ArrowDown') ny = Math.max(0, y - paso);
    else return;
    evento.preventDefault();
    alMover(nx, ny);
  };

  return (
    <div
      ref={caja}
      className={`cuadro ${activo ? '' : 'cuadro--apagado'}`}
      style={{ color }}
      role="application"
      tabIndex={activo ? 0 : -1}
      aria-label={etiqueta}
      aria-disabled={!activo}
      onPointerDown={alBajar}
      onPointerMove={alArrastrar}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onPointerLeave={alSoltar}
      onKeyDown={alTeclear}
    >
      <span className="cuadro__eje cuadro__eje--arriba" aria-hidden="true">
        más azar
      </span>
      <span className="cuadro__eje cuadro__eje--abajo" aria-hidden="true">
        siempre igual
      </span>
      <span className="cuadro__eje cuadro__eje--izq" aria-hidden="true">
        pocos golpes
      </span>
      <span className="cuadro__eje cuadro__eje--der" aria-hidden="true">
        muchos
      </span>

      {activo ? (
        <>
          <span
            className="cuadro__cruz cuadro__cruz--v"
            style={{ left: `${x * 100}%` }}
            aria-hidden="true"
          />
          <span
            className="cuadro__cruz cuadro__cruz--h"
            style={{ top: `${(1 - y) * 100}%` }}
            aria-hidden="true"
          />
          <span
            className="cuadro__dedo"
            style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }}
            aria-hidden="true"
          />
        </>
      ) : (
        <span className="cuadro__apagado">lo armas tú</span>
      )}
    </div>
  );
}
