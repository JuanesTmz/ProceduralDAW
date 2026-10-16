/**
 * Partir el monólogo en escenas.
 *
 * Cada escena se ve como un tramo resaltado del texto, y entre tramo y
 * tramo hay un límite que se agarra y se arrastra entre las palabras.
 * Con − y + se piden menos o más escenas: el + parte la más larga en el
 * final de frase más cercano a su mitad.
 */
import { useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import {
  agregarCorte,
  EMOCIONES,
  moverCorte,
  quitarCorte,
} from '../estado/escenas';

export function PartirTexto() {
  const { proyecto, actualizar } = useProyecto();
  const palabras = palabrasDe(proyecto.narracion.texto);
  const cortes = [...proyecto.cortesEscena].sort((a, b) => a - b);
  const limites = [0, ...cortes, palabras.length];
  const [agarrado, setAgarrado] = useState<number | null>(null);
  const ultimo = useRef<number | null>(null);

  const agarrar = (k: number) => (ev: EventoPuntero<HTMLSpanElement>) => {
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ultimo.current = cortes[k];
    setAgarrado(k);
  };

  const mover = (ev: EventoPuntero<HTMLSpanElement>) => {
    if (agarrado === null) return;
    const bajo = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .find((el) => el instanceof HTMLElement && el.dataset.i !== undefined) as HTMLElement | undefined;
    if (!bajo) return;
    const caja = bajo.getBoundingClientRect();
    let indice = Number(bajo.dataset.i);
    // Pasada la mitad de la palabra, el límite cae detrás de ella.
    if (ev.clientX > caja.left + caja.width / 2) indice += 1;
    if (indice === ultimo.current) return;
    ultimo.current = indice;
    const k = agarrado;
    actualizar((p) => moverCorte(p, k, indice));
  };

  const soltar = () => setAgarrado(null);

  if (palabras.length === 0) return null;

  return (
    <div className="nv-tarjeta nv-partir">
      <div className="nv-campo__fila">
        <span className="nv-campo__titulo">Tus escenas</span>
        <span className="nv-tenue nv-chico">Arrastra los límites para decidir dónde empieza cada una.</span>
        <span className="nv-espacio" />
        <div className="nv-contador">
          <button
            type="button"
            aria-label="Menos escenas"
            disabled={cortes.length === 0}
            onClick={() => actualizar((p) => quitarCorte(p))}
          >
            −
          </button>
          <span>
            {limites.length - 1} {limites.length - 1 === 1 ? 'escena' : 'escenas'}
          </span>
          <button
            type="button"
            aria-label="Más escenas"
            disabled={limites.length - 1 >= palabras.length}
            onClick={() => actualizar((p) => agregarCorte(p))}
          >
            +
          </button>
        </div>
      </div>

      <p className={`nv-partir__texto ${agarrado !== null ? 'nv-partir__texto--arrastrando' : ''}`}>
        {limites.slice(0, -1).map((desde, n) => {
          const hasta = limites[n + 1];
          const escena = proyecto.escenas[n];
          const color = escena ? EMOCIONES[escena.emocion].color : '#8b91a5';
          return (
            <span key={n} className="nv-tramo-grupo">
              {n > 0 && (
                <span
                  className={`nv-limite ${agarrado === n - 1 ? 'nv-limite--agarrado' : ''}`}
                  style={{ ['--color' as string]: color }}
                  onPointerDown={agarrar(n - 1)}
                  onPointerMove={mover}
                  onPointerUp={soltar}
                  onPointerCancel={soltar}
                  role="slider"
                  aria-label={`Límite entre la escena ${n} y la ${n + 1}`}
                  aria-valuenow={desde}
                >
                  <span className="nv-limite__asa" />
                </span>
              )}
              <span className="nv-tramo" style={{ ['--color' as string]: color }}>
                <span className="nv-tramo__num">{n + 1}</span>
                {palabras.slice(desde, hasta).map((palabra, j) => (
                  <span key={desde + j} data-i={desde + j} className="nv-tramo__palabra">
                    {palabra}{' '}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </p>
    </div>
  );
}
