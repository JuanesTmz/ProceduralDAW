/**
 * Efectos del bus maestro: reverb (sala), filtro y delay (eco).
 * Nombres en lenguaje llano, sin jerga de ingeniería de sonido.
 */
import { useProyecto } from '../estado/ProyectoContext';

export function PanelEfectos() {
  const { proyecto, actualizar } = useProyecto();
  const fx = proyecto.efectos;

  return (
    <div className="efectos">
      <span className="campo__etiqueta">Efectos</span>

      <label className="efectos__control">
        <span>
          Sala <small>(reverb)</small>
        </span>
        <input
          type="range"
          min={0}
          max={0.8}
          step={0.01}
          value={fx.reverbCantidad}
          onChange={(e) =>
            actualizar((p) => {
              p.efectos.reverbCantidad = Number(e.target.value);
            })
          }
        />
        <span className="campo__valor">{Math.round((fx.reverbCantidad / 0.8) * 100)}%</span>
      </label>

      <label className="efectos__control">
        <span>
          Eco <small>(delay)</small>
        </span>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.01}
          value={fx.delayCantidad}
          onChange={(e) =>
            actualizar((p) => {
              p.efectos.delayCantidad = Number(e.target.value);
            })
          }
        />
        <span className="campo__valor">{Math.round((fx.delayCantidad / 0.6) * 100)}%</span>
      </label>

      <label className="efectos__control efectos__control--ancho">
        <span>Filtro</span>
        <div className="grupo-segmentado grupo-segmentado--chico">
          <button
            type="button"
            aria-pressed={fx.filtroTipo === 'lowpass'}
            onClick={() =>
              actualizar((p) => {
                p.efectos.filtroTipo = 'lowpass';
              })
            }
          >
            Grave
          </button>
          <button
            type="button"
            aria-pressed={fx.filtroTipo === 'highpass'}
            onClick={() =>
              actualizar((p) => {
                p.efectos.filtroTipo = 'highpass';
              })
            }
          >
            Agudo
          </button>
        </div>
        {/* Escala logarítmica: el oído percibe la frecuencia así, no lineal. */}
        <input
          type="range"
          min={Math.log(60)}
          max={Math.log(18000)}
          step={0.01}
          value={Math.log(fx.filtroFrecuencia)}
          onChange={(e) =>
            actualizar((p) => {
              p.efectos.filtroFrecuencia = Math.round(Math.exp(Number(e.target.value)));
            })
          }
        />
        <span className="campo__valor">
          {fx.filtroFrecuencia >= 1000
            ? `${(fx.filtroFrecuencia / 1000).toFixed(1)} kHz`
            : `${fx.filtroFrecuencia} Hz`}
        </span>
      </label>
    </div>
  );
}
