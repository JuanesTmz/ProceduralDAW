/**
 * La puerta de exportación.
 *
 * En esta fase revisa los mínimos y dice exactamente qué falta y dónde
 * arreglarlo. Los botones de exportar de verdad llegan en la Fase 7.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { evaluarRequisitos, puedeExportar } from '../guia/requisitos';
import { construirMapaReglas } from '../generativo/mapaReglas';
import { duracionPieza, palabrasDe } from '../estado/proyecto';
import type { Vista } from '../estado/tipos';

interface Props {
  alIrA: (vista: Vista) => void;
}

export function PasoExportar({ alIrA }: Props) {
  const { proyecto } = useProyecto();
  const requisitos = evaluarRequisitos(proyecto);
  const listo = puedeExportar(proyecto);
  const faltan = requisitos.filter((r) => r.bloqueante && !r.cumplido);
  const mapa = construirMapaReglas(proyecto);

  return (
    <>
      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">Exportar</h2>
          <span className="panel__nota">Lo que se lleva el jurado</span>
        </div>

        <div className="panel__cuerpo">
          <div className={`puerta ${listo ? 'puerta--abierta' : ''}`}>
            <span className="puerta__icono" aria-hidden="true">
              {listo ? '🎉' : '🔒'}
            </span>
            <div>
              <h3 className="puerta__titulo">
                {listo ? 'Tu pieza cumple los mínimos' : `Te faltan ${faltan.length} cosas`}
              </h3>
              <p className="puerta__texto">
                {listo
                  ? 'Ya puedes exportarla. Revisa igual los recomendados: son los que más pesan en la calificación.'
                  : 'La exportación se abre cuando estén los mínimos. Toca cada pendiente para ir a arreglarlo.'}
              </p>
            </div>
          </div>

          <ul className="requisitos">
            {requisitos.map((requisito) => (
              <li
                key={requisito.id}
                className={`requisito ${requisito.cumplido ? 'requisito--hecho' : ''}`}
              >
                <span className="requisito__marca" aria-hidden="true">
                  {requisito.cumplido ? '✓' : requisito.bloqueante ? '○' : '◇'}
                </span>
                <div className="requisito__texto">
                  <strong>{requisito.etiqueta}</strong>
                  {!requisito.cumplido && <span>{requisito.pista}</span>}
                </div>
                {!requisito.bloqueante && <span className="insignia">recomendado</span>}
                {!requisito.cumplido && (
                  <button
                    type="button"
                    className="boton boton--icono"
                    onClick={() => alIrA(requisito.paso)}
                  >
                    Ir →
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="exportar__acciones">
            <button type="button" className="boton boton--primario" disabled={!listo}>
              ⬇ Exportar audio (WAV)
            </button>
            <button type="button" className="boton" disabled={!listo}>
              ⬇ Exportar video
            </button>
            <button type="button" className="boton" disabled={!listo}>
              📄 Ficha del jurado
            </button>
            <span className="panel__nota">
              Los tres llegan en la próxima entrega; la puerta ya funciona.
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">Resumen de la pieza</h2>
          <span className="panel__nota">Lo que se va a exportar</span>
        </div>

        <div className="panel__cuerpo">
          <dl className="resumen">
            <div>
              <dt>Historia</dt>
              <dd>{proyecto.historia.que || '—'}</dd>
            </div>
            <div>
              <dt>Por qué es Medellín</dt>
              <dd>{proyecto.historia.porQue || '—'}</dd>
            </div>
            <div>
              <dt>Monólogo</dt>
              <dd>{palabrasDe(proyecto.narracion.texto).length} palabras</dd>
            </div>
            <div>
              <dt>Narración</dt>
              <dd>
                {proyecto.narracion.origen === 'ninguno'
                  ? 'sin grabar'
                  : `${proyecto.narracion.origen} · ${proyecto.narracion.duracion.toFixed(1)} s`}
              </dd>
            </div>
            <div>
              <dt>Duración de la pieza</dt>
              <dd>{duracionPieza(proyecto).toFixed(1)} s</dd>
            </div>
            <div>
              <dt>Semilla</dt>
              <dd>{proyecto.semilla}</dd>
            </div>
            <div>
              <dt>Reglas</dt>
              <dd>{mapa.resumen}</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
