/**
 * El Ecualizador: cuánto suena cada pista y cómo suena el conjunto.
 *
 * Son los mandos que vivían pegados a cada fila de la rejilla vieja —la M de
 * silenciar, el volumen— más los efectos del bus maestro. Pegados a la
 * rejilla eran seis botones diminutos repetidos en cada fila; aquí son una
 * lista que se lee de un vistazo, y solo se abre cuando hace falta.
 *
 * Y tiene su parte procedural, como todo lo demás: la perilla «Se mueve
 * solo» le entrega el timbre a la máquina, que cierra el filtro en las
 * partes de poca energía y lo abre en el coro. Quien quiera dejarlo quieto,
 * la deja en cero.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { PanelEfectos } from './PanelEfectos';
import { Perilla } from './Perilla';
import { Ventana } from './Ventana';

const COLOR_MATRIZ = '#5fd4ff';

/** Lo que dice la perilla, en palabras y no en porcentajes. */
const LECTURA_MOVIMIENTO = (v: number): string => {
  if (v <= 0.02) return 'quieto · suena igual siempre';
  if (v < 0.35) return 'se abre un poco en el coro';
  if (v < 0.7) return 'se nota el cambio entre partes';
  return 'mucho · la intro suena lejos';
};

export function VentanaMezcla({ alCerrar }: { alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { patron } = proyecto;

  const canales = [
    ...patron.filas.map((fila, indice) => ({
      id: fila.id,
      nombre: fila.nombre,
      color: fila.color,
      volumen: fila.volumen,
      silenciada: fila.silenciada,
      silenciar: () =>
        actualizar((p) => {
          const f = p.patron.filas[indice];
          f.silenciada = !f.silenciada;
        }),
      ponerVolumen: (v: number) =>
        actualizar((p) => {
          p.patron.filas[indice].volumen = v;
        }),
    })),
    {
      id: '__matriz__',
      nombre: 'Matriz',
      color: COLOR_MATRIZ,
      volumen: patron.melodia.volumen,
      silenciada: patron.melodia.silenciada,
      silenciar: () =>
        actualizar((p) => {
          p.patron.melodia.silenciada = !p.patron.melodia.silenciada;
        }),
      ponerVolumen: (v: number) =>
        actualizar((p) => {
          p.patron.melodia.volumen = v;
        }),
    },
  ];

  return (
    <Ventana
      titulo="Ecualizador"
      nota="Cuánto suena cada pista y cómo suena el conjunto"
      ancha
      alCerrar={alCerrar}
    >
      <div className="mezcla">
        <div className="mezcla__canales">
          {canales.map((canal) => (
            <div key={canal.id} className="canal" style={{ color: canal.color }}>
              <span className="punto-color" style={{ background: canal.color }} />
              <span className="canal__nombre">{canal.nombre}</span>
              <button
                type="button"
                className={`mini ${canal.silenciada ? 'mini--activo' : ''}`}
                aria-pressed={canal.silenciada}
                aria-label={`Silenciar ${canal.nombre}`}
                onClick={canal.silenciar}
              >
                M
              </button>
              <input
                type="range"
                className="canal__volumen"
                min={0}
                max={1}
                step={0.01}
                value={canal.volumen}
                aria-label={`Volumen de ${canal.nombre}`}
                onChange={(e) => canal.ponerVolumen(Number(e.target.value))}
              />
            </div>
          ))}
        </div>

        <aside className="pistas mezcla__efectos">
          <h3 className="pistas__titulo">El conjunto</h3>
          <PanelEfectos />

          <Perilla
            valor={proyecto.efectos.movimiento ?? 0}
            etiqueta="Se mueve solo"
            lectura={LECTURA_MOVIMIENTO(proyecto.efectos.movimiento ?? 0)}
            color="var(--matriz)"
            alMover={(v) =>
              actualizar((p) => {
                p.efectos.movimiento = v;
              })
            }
          />

          <label className="corrida">
            <span>Swing</span>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.02}
              value={proyecto.swing ?? 0}
              aria-label="Cuánto cojea el ritmo"
              onChange={(e) =>
                actualizar((p) => {
                  p.swing = Number(e.target.value);
                })
              }
            />
            <span className="corrida__valor">
              {(proyecto.swing ?? 0) === 0 ? 'recto' : `${Math.round((proyecto.swing ?? 0) * 100)}%`}
            </span>
          </label>
        </aside>
      </div>
    </Ventana>
  );
}
