/**
 * Una perilla, como la de un controlador MIDI.
 *
 * Se arrastra hacia arriba para subir y hacia abajo para bajar —nunca en
 * círculo, que es el error clásico y con el dedo no funciona— y el arco de
 * color dice cuánto lleva puesto sin tener que leer un número.
 *
 * Es el mismo trato del cuadro X/Y: el gesto ES el valor.
 */
import { useRef } from 'react';

interface Props {
  valor: number;
  /** Qué es esto, para quien no ve el arco. */
  etiqueta: string;
  /** Lo que se lee debajo: el valor dicho en palabras. */
  lectura: string;
  color?: string;
  alMover: (valor: number) => void;
}

/** Cuántos píxeles de arrastre hacen falta para recorrerla entera. */
const RECORRIDO = 170;

export function Perilla({ valor, etiqueta, lectura, color, alMover }: Props) {
  const arrastrando = useRef<{ y: number; desde: number } | null>(null);

  const limitar = (v: number) => Math.min(1, Math.max(0, v));

  const alBajar = (e: React.PointerEvent<HTMLButtonElement>) => {
    arrastrando.current = { y: e.clientY, desde: valor };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // En algunos punteros sintéticos no se puede capturar; el arrastre
      // sigue funcionando igual porque el estado vive en la referencia.
    }
  };

  const alMoverse = (e: React.PointerEvent<HTMLButtonElement>) => {
    const inicio = arrastrando.current;
    if (!inicio) return;
    e.preventDefault();
    alMover(limitar(inicio.desde + (inicio.y - e.clientY) / RECORRIDO));
  };

  const soltar = () => {
    arrastrando.current = null;
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    const paso = e.shiftKey ? 0.01 : 0.05;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') alMover(limitar(valor + paso));
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') alMover(limitar(valor - paso));
    else return;
    e.preventDefault();
  };

  // El arco va de las siete a las cinco del reloj: 270° de recorrido útil.
  const radio = 26;
  const vuelta = 2 * Math.PI * radio;
  const util = vuelta * 0.75;

  return (
    <div className="perilla">
      <button
        type="button"
        className="perilla__mando"
        style={color ? { color } : undefined}
        role="slider"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(valor * 100)}
        aria-valuetext={lectura}
        onPointerDown={alBajar}
        onPointerMove={alMoverse}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={alTeclear}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle
            className="perilla__pista"
            cx="32"
            cy="32"
            r={radio}
            strokeDasharray={`${util} ${vuelta}`}
          />
          <circle
            className="perilla__lleno"
            cx="32"
            cy="32"
            r={radio}
            strokeDasharray={`${util * valor} ${vuelta}`}
          />
          <line
            className="perilla__aguja"
            x1="32"
            y1="32"
            x2="32"
            y2="12"
            // El svg entero va girado 135° para que el arco empiece a las
            // siete; la aguja compensa ese giro y recorre esos mismos 270°.
            transform={`rotate(${-270 + valor * 270} 32 32)`}
          />
        </svg>
      </button>

      <span className="perilla__nombre">{etiqueta}</span>
      <span className="perilla__lectura">{lectura}</span>
    </div>
  );
}
