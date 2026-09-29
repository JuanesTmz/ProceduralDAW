/**
 * Barra de avance de la pieza: muestra en qué sección va y cuánto falta.
 * Cada sección ocupa un ancho proporcional a su duración, así se ve el arco.
 *
 * El relleno se mueve escribiendo el ancho en el DOM, no por estado de React:
 * avanza varias veces por segundo y no vale la pena re-renderizar por eso.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';

export function BarraPieza() {
  const { proyecto } = useProyecto();
  const relleno = useRef<HTMLDivElement>(null);
  const [seccionActiva, setSeccionActiva] = useState(motorAudio.seccionActual);

  useEffect(() => motorAudio.alCambiarSeccion(setSeccionActiva), []);

  useEffect(
    () =>
      motorAudio.alCambiarPaso(() => {
        const barra = relleno.current;
        if (!barra) return;
        barra.style.width = `${motorAudio.progresoPieza * 100}%`;
      }),
    [],
  );

  const total = proyecto.secciones.reduce((suma, s) => suma + s.compases, 0) || 1;

  return (
    <div className="pieza">
      <div className="pieza__pista">
        <div ref={relleno} className="pieza__relleno" style={{ width: '0%' }} />
        {proyecto.secciones.map((seccion, i) => (
          <div
            key={seccion.id}
            className={`pieza__tramo ${seccionActiva === i ? 'pieza__tramo--activo' : ''}`}
            style={{ flexGrow: seccion.compases }}
          >
            <span className="pieza__etiqueta">{seccion.etiqueta}</span>
          </div>
        ))}
      </div>
      <p className="pieza__pie">
        {seccionActiva >= 0
          ? `Sonando: ${proyecto.secciones[seccionActiva]?.etiqueta ?? ''}`
          : `La pieza recorre las ${proyecto.secciones.length} secciones en orden y termina — no es un bucle.`}
        {' · '}
        {total} vueltas del patrón en total
      </p>
    </div>
  );
}
