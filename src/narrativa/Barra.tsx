/**
 * La barra de arriba: los cuatro pasos, el medidor de 2:30, escuchar la
 * pieza y el lab. Es lo único que se queda fijo en toda la app.
 */
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionPieza, formatearReloj } from '../estado/proyecto';
import { DURACION_MAXIMA } from '../estado/escenas';
import type { ReactNode } from 'react';
import { useReproduccion } from './useReproduccion';
import { BotonTutorial } from './BotonTutorial';

export type Paso = 'historia' | 'voz' | 'escenas' | 'funcion';

export const PASOS: { id: Paso; etiqueta: string }[] = [
  { id: 'historia', etiqueta: 'Historia' },
  { id: 'voz', etiqueta: 'Voz' },
  { id: 'escenas', etiqueta: 'Escenas' },
  { id: 'funcion', etiqueta: 'Función' },
];

interface Props {
  paso: Paso;
  alCambiar: (paso: Paso) => void;
  /** Dentro de una escena se escucha solo la escena, desde su propia barra. */
  enEscena?: boolean;
  /** El botón de la guía de la pantalla actual. */
  guia?: ReactNode;
}

export function Barra({ paso, alCambiar, enEscena, guia }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { sonando } = useReproduccion();
  const hayEscenas = proyecto.escenas.length > 0;
  const total = hayEscenas ? duracionPieza(proyecto) : 0;
  const pasado = total > DURACION_MAXIMA;
  const esIA = proyecto.track === 'ia';

  return (
    <header className="nv-barra">
      <span className="nv-logo">SONORA</span>
      <nav className="nv-pasos" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`nv-paso ${p.id === paso ? 'nv-paso--activo' : ''}`}
            onClick={() => alCambiar(p.id)}
          >
            <span className="nv-paso__num">{i + 1}</span>
            {p.etiqueta}
          </button>
        ))}
      </nav>
      <span className="nv-espacio" />
      {hayEscenas && (
        <div className={`nv-medidor ${pasado ? 'nv-medidor--pasado' : ''}`}>
          <span className="nv-mono">
            {formatearReloj(total)} de {formatearReloj(DURACION_MAXIMA)}
          </span>
          <span className="nv-medidor__pista">
            <span
              className="nv-medidor__lleno"
              style={{ width: `${Math.min(100, (total / DURACION_MAXIMA) * 100)}%` }}
            />
          </span>
        </div>
      )}
      {paso !== 'funcion' && !enEscena && (
        <button
          type="button"
          className="nv-boton nv-boton--primario"
          disabled={!hayEscenas}
          onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirPieza())}
          title={hayEscenas ? 'Escuchar toda la pieza' : 'Primero escribe y parte tu texto'}
        >
          {sonando ? '■  Parar' : '▶  Escuchar'}
        </button>
      )}
      <BotonTutorial texto="Tutoriales" chico />
      {guia}
      <button
        type="button"
        className={`nv-lab ${esIA ? 'nv-lab--ia' : 'nv-lab--mu'}`}
        title="Cambiar de Urban Lab. No pierdes nada."
        onClick={() =>
          actualizar((p) => {
            p.track = null;
          })
        }
      >
        <span className="nv-punto" />
        {esIA ? 'Lab IA' : 'Lab Música Urbana'}
      </button>
    </header>
  );
}
