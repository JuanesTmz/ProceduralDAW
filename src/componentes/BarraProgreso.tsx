/**
 * La barra de progreso: el recorrido completo, siempre visible.
 * Reemplaza a las pestañas — es a la vez mapa, navegación y estado.
 *
 * El orden lo pone el track; los vistos buenos los calcula la puerta
 * de exportación, así que nadie tiene que marcar nada a mano.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { pasosDelTrack, type Track } from '../guia/pasos';
import { pasoCompleto } from '../guia/requisitos';
import type { Vista } from '../estado/tipos';

interface Props {
  vista: Vista;
  alCambiar: (vista: Vista) => void;
}

export function BarraProgreso({ vista, alCambiar }: Props) {
  const { proyecto } = useProyecto();
  const track = (proyecto.track ?? 'ia') as Track;
  const pasos = pasosDelTrack(track);

  const hechos = pasos.filter((paso) => pasoCompleto(proyecto, paso.id)).length;

  return (
    <nav className="progreso" aria-label="Pasos del proyecto">
      <ol className="progreso__lista">
        {pasos.map((paso, i) => {
          const completo = pasoCompleto(proyecto, paso.id);
          const actual = vista === paso.id;
          return (
            <li key={paso.id} className="progreso__elemento">
              <button
                type="button"
                className={`progreso__paso ${actual ? 'progreso__paso--actual' : ''} ${
                  completo ? 'progreso__paso--hecho' : ''
                }`}
                aria-current={actual ? 'step' : undefined}
                onClick={() => alCambiar(paso.id)}
              >
                <span className="progreso__marca" aria-hidden="true">
                  {completo ? '✓' : i + 1}
                </span>
                <span className="progreso__nombre">{paso.etiqueta}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <span className="progreso__cuenta">
        {hechos} de {pasos.length}
      </span>
    </nav>
  );
}
