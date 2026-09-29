/**
 * El motor: semilla, reglas por fila y mapa de reglas.
 * Todo por controles — el estudiante nunca ve ni escribe código.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { semillaAleatoria } from '../generativo/rng';
import { mutar, volverASembrar } from '../generativo/motorGenerativo';
import { construirMapaReglas } from '../generativo/mapaReglas';
import type { ModoRegla } from '../estado/tipos';
import { MapaDeReglas } from './MapaDeReglas';

const MODOS: { id: ModoRegla; etiqueta: string; ayuda: string }[] = [
  { id: 'manual', etiqueta: 'A mano', ayuda: 'Los golpes que pusiste en la grilla. No cambian.' },
  {
    id: 'euclidiano',
    etiqueta: 'Euclidiano',
    ayuda: 'Reparte los pulsos lo más parejo posible. Así nacen muchos ritmos del mundo.',
  },
  {
    id: 'probabilistico',
    etiqueta: 'Probabilístico',
    ayuda: 'La semilla decide qué pasos se encienden. Es lo que más varía.',
  },
];

export function PanelGenerativo() {
  const { proyecto, actualizar } = useProyecto();
  const { patron } = proyecto;
  const mapa = construirMapaReglas(proyecto);

  const variar = () => {
    actualizar((p) => volverASembrar(p, semillaAleatoria()));
  };

  const cambiarSemilla = (valor: number) => {
    actualizar((p) => volverASembrar(p, valor));
  };

  const mutarPatron = () => {
    actualizar((p) => mutar(p, p.semilla));
  };

  return (
    <>
      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">El motor</h2>
          <span className="panel__nota">Las reglas que hacen la música</span>
        </div>

        <div className="panel__cuerpo">
          <div className="semilla">
            <div className="campo">
              <label className="campo__etiqueta" htmlFor="campo-semilla">
                Semilla
              </label>
              <input
                id="campo-semilla"
                type="number"
                className="semilla__campo"
                min={0}
                max={99999}
                value={proyecto.semilla}
                onChange={(e) => cambiarSemilla(Number(e.target.value) || 0)}
              />
            </div>

            <button type="button" className="boton boton--primario" onClick={variar}>
              🎲 Variar
            </button>
            <button type="button" className="boton" onClick={mutarPatron}>
              ✦ Mutar
            </button>

            <p className="semilla__ayuda">
              La <strong>semilla</strong> es el azar con memoria: con el mismo número, la pieza
              suena igual siempre. <strong>Variar</strong> cambia el número y vuelve a generar lo
              que sigue una regla. <strong>Mutar</strong> mueve unos pocos pasos sin perder el
              carácter. Lo que esté con 🔒 no se toca.
            </p>
          </div>

          <div className="reglas">
            {patron.filas.map((fila, indice) => (
              <article className="regla-fila" key={fila.id}>
                <header className="regla-fila__cabecera">
                  <span className="punto-color" style={{ background: fila.color }} />
                  <h3 className="regla-fila__nombre">{fila.nombre}</h3>
                  <button
                    type="button"
                    className={`mini ${fila.protegida ? 'mini--solo' : ''}`}
                    title={fila.protegida ? 'Quitar candado' : 'Proteger de Variar y Mutar'}
                    aria-pressed={fila.protegida}
                    onClick={() =>
                      actualizar((p) => {
                        p.patron.filas[indice].protegida = !p.patron.filas[indice].protegida;
                      })
                    }
                  >
                    {fila.protegida ? '🔒' : '🔓'}
                  </button>
                </header>

                <div className="grupo-segmentado grupo-segmentado--chico">
                  {MODOS.map((modo) => (
                    <button
                      key={modo.id}
                      type="button"
                      title={modo.ayuda}
                      aria-pressed={fila.regla.modo === modo.id}
                      onClick={() =>
                        actualizar((p) => {
                          p.patron.filas[indice].regla.modo = modo.id;
                        })
                      }
                    >
                      {modo.etiqueta}
                    </button>
                  ))}
                </div>

                {fila.regla.modo === 'euclidiano' && (
                  <div className="regla-fila__controles">
                    <label className="efectos__control">
                      <span>Pulsos</span>
                      <input
                        type="range"
                        min={0}
                        max={patron.cantidadPasos}
                        step={1}
                        value={fila.regla.pulsos}
                        onChange={(e) =>
                          actualizar((p) => {
                            p.patron.filas[indice].regla.pulsos = Number(e.target.value);
                          })
                        }
                      />
                      <span className="campo__valor">
                        {fila.regla.pulsos}/{patron.cantidadPasos}
                      </span>
                    </label>
                    <label className="efectos__control">
                      <span>Rotación</span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, patron.cantidadPasos - 1)}
                        step={1}
                        value={fila.regla.rotacion}
                        onChange={(e) =>
                          actualizar((p) => {
                            p.patron.filas[indice].regla.rotacion = Number(e.target.value);
                          })
                        }
                      />
                      <span className="campo__valor">{fila.regla.rotacion}</span>
                    </label>
                  </div>
                )}

                {fila.regla.modo === 'probabilistico' && (
                  <div className="regla-fila__controles">
                    <label className="efectos__control">
                      <span>Densidad</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={fila.regla.densidad}
                        onChange={(e) =>
                          actualizar((p) => {
                            p.patron.filas[indice].regla.densidad = Number(e.target.value);
                          })
                        }
                      />
                      <span className="campo__valor">
                        {Math.round(fila.regla.densidad * 100)}%
                      </span>
                    </label>
                  </div>
                )}

                <div className="regla-fila__controles">
                  <label className="efectos__control">
                    <span>Cuánto muta</span>
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.02}
                      value={fila.regla.mutabilidad}
                      onChange={(e) =>
                        actualizar((p) => {
                          p.patron.filas[indice].regla.mutabilidad = Number(e.target.value);
                        })
                      }
                    />
                    <span className="campo__valor">
                      {Math.round(fila.regla.mutabilidad * 100)}%
                    </span>
                  </label>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MapaDeReglas mapa={mapa} />
    </>
  );
}
