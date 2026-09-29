/**
 * Las secciones: Intro → Cuerpo → Giro → Cierre.
 *
 * Aquí vive el arco. El patrón es el ladrillo; las secciones deciden
 * cuánto de ese patrón suena, con qué fuerza y con qué semilla, para que
 * la pieza avance de principio a fin en vez de repetirse plana.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import { duracionPieza, sugerirArreglo } from '../estado/proyecto';
import { semillaAleatoria } from '../generativo/rng';
import { BarraPieza } from './BarraPieza';
import type { Seccion } from '../estado/tipos';

function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

export function SeccionesArreglo() {
  const { proyecto, actualizar } = useProyecto();
  const { secciones, patron } = proyecto;

  const editar = (indice: number, cambio: (s: Seccion) => void) => {
    actualizar((p) => cambio(p.secciones[indice]));
  };

  const alternarCapa = (indice: number, idFila: string) => {
    editar(indice, (s) => {
      s.capasActivas = s.capasActivas.includes(idFila)
        ? s.capasActivas.filter((id) => id !== idFila)
        : [...s.capasActivas, idFila];
    });
  };

  const tocarPieza = () => {
    actualizar((p) => {
      p.modoReproduccion = 'pieza';
    });
    motorAudio.cambiarModo('pieza');
    void motorAudio.reproducir();
  };

  return (
    <>
      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">Las secciones</h2>
          <span className="panel__nota">El arco de la pieza</span>

          <div className="panel__acciones">
            <span className="panel__nota">
              Dura {formatearDuracion(duracionPieza(proyecto))}
            </span>
            <button
              type="button"
              className="boton"
              onClick={() => actualizar((p) => sugerirArreglo(p))}
              title="Vuelve a aplicar el arco sugerido, sin tocar las semillas"
            >
              ✨ Sugerir arreglo
            </button>
            <button type="button" className="boton boton--primario" onClick={tocarPieza}>
              ▶ Tocar la pieza
            </button>
          </div>
        </div>

        <div className="panel__cuerpo">
          <BarraPieza />

          <div className="secciones">
            {secciones.map((seccion, indice) => (
              <article className="seccion" key={seccion.id} data-seccion={seccion.id}>
                <header className="seccion__cabecera">
                  <span className="seccion__orden">{indice + 1}</span>
                  <h3 className="seccion__nombre">{seccion.etiqueta}</h3>
                  <span className="seccion__duracion">
                    {seccion.compases} {seccion.compases === 1 ? 'vuelta' : 'vueltas'}
                  </span>
                </header>

                <p className="seccion__intencion">{seccion.intencion}</p>

                <label className="efectos__control">
                  <span>Vueltas</span>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={seccion.compases}
                    onChange={(e) =>
                      editar(indice, (s) => {
                        s.compases = Number(e.target.value);
                      })
                    }
                  />
                  <span className="campo__valor">{seccion.compases}</span>
                </label>

                <label className="efectos__control">
                  <span>Intensidad</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={seccion.intensidad}
                    onChange={(e) =>
                      editar(indice, (s) => {
                        s.intensidad = Number(e.target.value);
                      })
                    }
                  />
                  <span className="campo__valor">{Math.round(seccion.intensidad * 100)}%</span>
                </label>

                <label className="efectos__control">
                  <span>Tempo</span>
                  <input
                    type="range"
                    min={0.85}
                    max={1.15}
                    step={0.01}
                    value={seccion.factorTempo}
                    onChange={(e) =>
                      editar(indice, (s) => {
                        s.factorTempo = Number(e.target.value);
                      })
                    }
                  />
                  <span className="campo__valor">
                    {Math.round(proyecto.bpm * seccion.factorTempo)} BPM
                  </span>
                </label>

                <div className="seccion__capas">
                  <span className="campo__etiqueta">Capas que suenan</span>
                  <div className="seccion__chips">
                    {patron.filas.map((fila) => {
                      const activa = seccion.capasActivas.includes(fila.id);
                      return (
                        <button
                          key={fila.id}
                          type="button"
                          className={`capa ${activa ? 'capa--activa' : ''}`}
                          style={activa ? { borderColor: fila.color, color: fila.color } : undefined}
                          aria-pressed={activa}
                          onClick={() => alternarCapa(indice, fila.id)}
                        >
                          <span className="punto-color" style={{ background: fila.color }} />
                          {fila.nombre}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={`capa ${seccion.melodiaActiva ? 'capa--activa' : ''}`}
                      style={
                        seccion.melodiaActiva
                          ? { borderColor: 'var(--matriz)', color: 'var(--matriz)' }
                          : undefined
                      }
                      aria-pressed={seccion.melodiaActiva}
                      onClick={() =>
                        editar(indice, (s) => {
                          s.melodiaActiva = !s.melodiaActiva;
                        })
                      }
                    >
                      <span className="punto-color" style={{ background: 'var(--matriz)' }} />
                      Matriz
                    </button>
                  </div>
                </div>

                <div className="seccion__pie">
                  <label className="campo campo--horizontal">
                    <span className="campo__etiqueta">Semilla</span>
                    <input
                      type="number"
                      className="seccion__semilla"
                      value={seccion.semilla}
                      onChange={(e) =>
                        editar(indice, (s) => {
                          s.semilla = Number(e.target.value) || 0;
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="mini"
                    title="Otra semilla para esta sección"
                    onClick={() =>
                      editar(indice, (s) => {
                        s.semilla = semillaAleatoria();
                      })
                    }
                  >
                    🎲
                  </button>
                  <button
                    type="button"
                    className={`capa ${seccion.desvanecer ? 'capa--activa' : ''}`}
                    aria-pressed={seccion.desvanecer}
                    onClick={() =>
                      editar(indice, (s) => {
                        s.desvanecer = !s.desvanecer;
                      })
                    }
                  >
                    Desvanecer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
