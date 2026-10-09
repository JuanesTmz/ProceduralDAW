/**
 * La columna de pistas: el mismo selector en la ventana de Golpes y en la
 * de Procedural.
 *
 * Es el patrón de NeuralOracle llevado aquí: lo grande —la celda, el
 * cuadro— vive a la izquierda y manda; a la derecha se elige sobre qué
 * actúa. Como el elegido tiñe el panel de su color, nunca hay duda de qué
 * se está tocando.
 */
import type { ReactNode } from 'react';

export interface PistaElegible {
  id: string;
  nombre: string;
  color: string;
  /** Línea pequeña: el estado de esa pista, no una explicación. */
  nota?: string;
}

interface Props {
  titulo: string;
  pistas: PistaElegible[];
  elegida: string | null;
  alElegir: (id: string) => void;
  /** Lo que va debajo de la lista: agregar una pista, por ejemplo. */
  pie?: ReactNode;
}

export function ListaPistas({ titulo, pistas, elegida, alElegir, pie }: Props) {
  return (
    <aside className="pistas">
      <h3 className="pistas__titulo">{titulo}</h3>

      <div className="pistas__lista">
        {pistas.map((pista) => {
          const actual = pista.id === elegida;
          return (
            <button
              key={pista.id}
              type="button"
              className={`pista ${actual ? 'pista--actual' : ''}`}
              style={{ color: pista.color }}
              aria-pressed={actual}
              onClick={() => alElegir(pista.id)}
            >
              <span className="punto-color" style={{ background: pista.color }} />
              <span className="pista__textos">
                <span className="pista__nombre">{pista.nombre}</span>
                {pista.nota && <span className="pista__nota">{pista.nota}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {pie && <div className="pistas__pie">{pie}</div>}
    </aside>
  );
}
