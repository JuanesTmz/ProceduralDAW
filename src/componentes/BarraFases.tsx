/**
 * Las tres fases del recorrido, siempre arriba: Conceptualización, Producción
 * y Visual. Reemplaza a la barra de nueve pasos: tres destinos se recuerdan,
 * nueve no.
 *
 * Exportar va al margen derecho, separado, porque no es una fase del trabajo
 * sino la salida.
 */
import { FASE_DE_VISTA, type Fase, type Vista } from '../estado/tipos';
import { useProyecto } from '../estado/ProyectoContext';
import { LEMA_FASE, NOMBRE_FASE } from '../guia/pasos';
import { pasoCompleto, puedeExportar } from '../guia/requisitos';

const FASES: Fase[] = ['concepto', 'produccion', 'visual'];

/** Las pantallas de cada fase, para saber si la fase está resuelta. */
const VISTAS_DE_FASE: Record<Fase, Vista[]> = {
  concepto: ['historia', 'monologo'],
  produccion: ['cancion', 'golpes', 'matriz', 'procedural'],
  visual: ['visual'],
};

interface Props {
  vista: Vista;
  alCambiarFase: (fase: Fase) => void;
  alExportar: () => void;
}

export function BarraFases({ vista, alCambiarFase, alExportar }: Props) {
  const { proyecto } = useProyecto();
  const faseActual = FASE_DE_VISTA[vista];
  const listo = puedeExportar(proyecto);

  return (
    <nav className="fases" aria-label="Fases del proyecto">
      <ol className="fases__lista">
        {FASES.map((fase, i) => {
          const hecha = VISTAS_DE_FASE[fase].every((v) => pasoCompleto(proyecto, v));
          const actual = fase === faseActual;
          return (
            <li key={fase}>
              <button
                type="button"
                className={`fase ${actual ? 'fase--actual' : ''} ${hecha ? 'fase--hecha' : ''}`}
                data-fase={fase}
                aria-current={actual ? 'step' : undefined}
                onClick={() => alCambiarFase(fase)}
              >
                <span className="fase__marca" aria-hidden="true">
                  {hecha ? '✓' : i + 1}
                </span>
                <span className="fase__textos">
                  <span className="fase__nombre">{NOMBRE_FASE[fase]}</span>
                  <span className="fase__lema">{LEMA_FASE[fase]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className={`fases__exportar ${vista === 'exportar' ? 'fases__exportar--actual' : ''} ${
          listo ? 'fases__exportar--listo' : ''
        }`}
        onClick={alExportar}
        title={listo ? 'Tu pieza cumple los mínimos' : 'Todavía faltan cosas por cumplir'}
      >
        <span aria-hidden="true">{listo ? '✓' : '⤓'}</span> Exportar
      </button>
    </nav>
  );
}
