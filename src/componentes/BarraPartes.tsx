/**
 * La banda de partes: Intro · Estrofa · Coro · Cierre, siempre visible
 * mientras se produce.
 *
 * Hace tres cosas a la vez y por eso no se va nunca:
 *  - dice en qué parte de la canción estás trabajando,
 *  - deja saltar a otra con un toque,
 *  - y mientras suena, la cabeza lectora la recorre de principio a fin.
 *
 * El ancho de cada parte es el tiempo que se lleva, así que la banda
 * también es el mapa de la pieza.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion, formatearReloj } from '../estado/proyecto';
import type { NombreSeccion } from '../estado/tipos';

interface Props {
  parte: NombreSeccion;
  alElegirParte: (parte: NombreSeccion) => void;
}

export function BarraPartes({ parte, alElegirParte }: Props) {
  const { proyecto } = useProyecto();
  const cabeza = useRef<HTMLDivElement>(null);
  const [sonando, setSonando] = useState(motorAudio.seccionActual);

  useEffect(() => motorAudio.alCambiarSeccion(setSonando), []);

  // La cabeza se mueve escribiendo en el DOM: avanza varias veces por segundo
  // y no vale la pena volver a dibujar React por eso.
  useEffect(
    () =>
      motorAudio.alCambiarPaso((paso) => {
        const nodo = cabeza.current;
        if (!nodo) return;
        if (paso < 0) {
          // Se esconde y vuelve al principio: si no, al darle play otra vez
          // parpadea un fotograma donde quedó la vez pasada.
          nodo.style.opacity = '0';
          nodo.style.left = '0%';
          return;
        }
        nodo.style.opacity = proyecto.modoReproduccion === 'pieza' ? '1' : '0';
        nodo.style.left = `${motorAudio.progresoPieza * 100}%`;
      }),
    [proyecto.modoReproduccion],
  );

  return (
    <div className="banda-partes">
      <div className="banda-partes__pista">
        <div ref={cabeza} className="banda-partes__cabeza" style={{ opacity: 0 }} aria-hidden="true" />

        {proyecto.secciones.map((seccion, i) => {
          const elegida = seccion.id === parte;
          return (
            <button
              key={seccion.id}
              type="button"
              className={`parte-banda ${elegida ? 'parte-banda--elegida' : ''} ${
                sonando === i ? 'parte-banda--suena' : ''
              }`}
              data-seccion={seccion.id}
              style={{ flexGrow: seccion.compases }}
              aria-pressed={elegida}
              onClick={() => alElegirParte(seccion.id)}
            >
              <span className="parte-banda__nombre">{seccion.etiqueta}</span>
              <span className="parte-banda__dato">
                {formatearReloj(duracionSeccion(proyecto, seccion))}
              </span>
              <span
                className="parte-banda__energia"
                style={{ height: `${Math.round(seccion.intensidad * 100)}%` }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

    </div>
  );
}
