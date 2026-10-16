/**
 * Paso 2: la voz. Cada escena se graba por separado y su duración sale
 * sola. Los respiros no se graban: se les da una duración.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import { duracionVoz, EMOCIONES, recorrido } from '../estado/escenas';
import { VozEscena } from './VozEscena';

export function PasoVoz({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const lista = recorrido(proyecto);
  const faltan = proyecto.escenas.filter((e) => !e.vozUrl).length;
  const voz = proyecto.escenas.reduce((s, e) => s + duracionVoz(e), 0);
  const aire = proyecto.respiros.reduce((s, r) => s + r.duracionRespiro, 0);

  if (proyecto.escenas.length === 0) {
    return (
      <div className="nv-pagina nv-vacio">
        <h1 className="nv-titulo">Graba tu voz</h1>
        <p className="nv-sub">Primero escribe tu monólogo y pártelo en escenas en el paso Historia.</p>
      </div>
    );
  }

  let numero = 0;
  return (
    <div className="nv-pagina">
      <div className="nv-cabeza">
        <div>
          <h1 className="nv-titulo">Graba tu voz</h1>
          <p className="nv-sub">Dilo, no lo cantes. Puedes repetir cada escena las veces que quieras.</p>
        </div>
        <span className="nv-espacio" />
        <div className="nv-selector">
          <button type="button" className="nv-selector__op nv-selector__op--activa">
            Por escena
          </button>
          <button type="button" className="nv-selector__op" disabled title="Llega en una fase próxima">
            Todo de corrido
          </button>
        </div>
      </div>

      <div className="nv-lista-voz">
        {lista.map((e) => {
          const color = EMOCIONES[e.emocion].color;
          if (!e.respiro) numero += 1;
          return (
            <div
              key={e.id}
              className={`nv-fila-voz ${!e.respiro && !e.vozUrl ? 'nv-fila-voz--pendiente' : ''}`}
            >
              <span className="nv-fila-voz__barra" style={{ background: color }} />
              <div className="nv-fila-voz__texto">
                <span className="nv-etiqueta" style={{ color }}>
                  {e.respiro ? 'RESPIRO' : `ESCENA ${numero} · ${e.nombre.toUpperCase()}`}
                </span>
                <span className={e.respiro ? 'nv-tenue nv-italica' : ''}>
                  {e.respiro ? 'Sin voz: la música cuenta sola.' : e.texto}
                </span>
              </div>
              {e.respiro ? (
                <div className="nv-fila-voz__respiro">
                  <span className="nv-tenue">Duración</span>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={e.duracionRespiro}
                    style={{ accentColor: color }}
                    onChange={(ev) =>
                      actualizar((p) => {
                        const r = p.respiros.find((x) => x.id === e.id);
                        if (r) r.duracionRespiro = Number(ev.target.value);
                      })
                    }
                  />
                  <span className="nv-mono">{formatearReloj(e.duracionRespiro)}</span>
                </div>
              ) : (
                <VozEscena escena={e} />
              )}
            </div>
          );
        })}
      </div>

      <div className="nv-pie nv-tarjeta">
        <strong>Total</strong>
        <span className="nv-tenue">
          {formatearReloj(voz)} de voz + {formatearReloj(aire)} de respiro
        </span>
        <span className="nv-espacio" />
        {faltan > 0 && (
          <span className="nv-acento">
            Falta grabar {faltan} {faltan === 1 ? 'escena' : 'escenas'}
          </span>
        )}
        <button type="button" className="nv-boton nv-boton--primario" onClick={alSeguir}>
          Seguir a Escenas  →
        </button>
      </div>
    </div>
  );
}
