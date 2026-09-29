/**
 * La misión del paso: una frase que dice qué hay que lograr aquí,
 * en el idioma del Urban Lab, con un «¿por qué?» desplegable para
 * quien quiera el trasfondo antes de tocar nada.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { pasoDe, type Track } from '../guia/pasos';
import { pasoCompleto } from '../guia/requisitos';
import type { Vista } from '../estado/tipos';

export function Mision({ vista }: { vista: Vista }) {
  const { proyecto } = useProyecto();
  const [abierto, setAbierto] = useState(false);
  const track = (proyecto.track ?? 'ia') as Track;
  const paso = pasoDe(vista);
  const completo = pasoCompleto(proyecto, vista);

  return (
    <section className={`mision ${completo ? 'mision--hecha' : ''}`}>
      <span className="mision__icono" aria-hidden="true">
        {completo ? '✓' : '→'}
      </span>

      <div className="mision__texto">
        <p className="mision__frase">{paso.mision[track]}</p>
        {abierto && <p className="mision__porque">{paso.porQue[track]}</p>}
      </div>

      <button
        type="button"
        className="mision__boton"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? 'Cerrar' : '¿Por qué?'}
      </button>
    </section>
  );
}
