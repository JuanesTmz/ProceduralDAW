/**
 * El visual: preset procedural, imagen del tema y texto cinético.
 * Todo por controles — ni una línea de código a la vista.
 */
import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import { semillaAleatoria } from '../generativo/rng';
import { PRESETS, type NombrePreset } from '../visual/presets';
import { LienzoVisual } from './LienzoVisual';

export function PasoVisual() {
  const { proyecto, actualizar } = useProyecto();
  const { visual, secciones } = proyecto;
  const entradaImagen = useRef<HTMLInputElement>(null);

  const subirImagen = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    actualizar((p) => {
      if (p.visual.imagenUrl) URL.revokeObjectURL(p.visual.imagenUrl);
      p.visual.imagenUrl = url;
      p.visual.nombreImagen = archivo.name;
    });
    evento.target.value = '';
  };

  const quitarImagen = () => {
    actualizar((p) => {
      if (p.visual.imagenUrl) URL.revokeObjectURL(p.visual.imagenUrl);
      p.visual.imagenUrl = undefined;
      p.visual.nombreImagen = undefined;
    });
  };

  return (
    <>
      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">El visual</h2>
          <span className="panel__nota">Se genera por reglas y reacciona al sonido</span>
          <div className="panel__acciones">
            <button
              type="button"
              className="boton boton--primario"
              onClick={() => {
                motorAudio.cambiarModo('pieza');
                void motorAudio.reproducir();
              }}
            >
              ▶ Ver la pieza
            </button>
          </div>
        </div>

        <div className="panel__cuerpo">
          <LienzoVisual />

          <div className="visual__presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`forma ${visual.preset === preset.id ? 'forma--activa' : ''}`}
                aria-pressed={visual.preset === preset.id}
                onClick={() =>
                  actualizar((p) => {
                    p.visual.preset = preset.id;
                  })
                }
              >
                <strong>{preset.etiqueta}</strong>
                <span>{preset.descripcion}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">La imagen y el texto</h2>
          <span className="panel__nota">La foto de tu tema, deformándose con el sonido</span>
          <div className="panel__acciones">
            <button
              type="button"
              className="boton"
              onClick={() => entradaImagen.current?.click()}
            >
              🖼 Subir imagen
            </button>
            <input
              ref={entradaImagen}
              type="file"
              accept="image/*"
              onChange={subirImagen}
              hidden
            />
            {visual.imagenUrl && (
              <button type="button" className="boton boton--peligro" onClick={quitarImagen}>
                Quitar
              </button>
            )}
          </div>
        </div>

        <div className="panel__cuerpo">
          <div className="visual__ajustes">
            {visual.imagenUrl ? (
              <div className="visual__miniatura">
                <img src={visual.imagenUrl} alt="" />
                <span>{visual.nombreImagen}</span>
              </div>
            ) : (
              <p className="paso__ayuda visual__sinimagen">
                Sin imagen, el visual es puro dibujo por reglas. Si subes una foto, pasa a ser la
                fuente: se deforma, se tiñe y late con la música.
              </p>
            )}

            <label className="efectos__control">
              <span>Deformación</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={visual.mezclaImagen}
                disabled={!visual.imagenUrl}
                onChange={(e) =>
                  actualizar((p) => {
                    p.visual.mezclaImagen = Number(e.target.value);
                  })
                }
              />
              <span className="campo__valor">{Math.round(visual.mezclaImagen * 100)}%</span>
            </label>

            <label className="interruptor">
              <input
                type="checkbox"
                checked={visual.textoVisible}
                onChange={(e) =>
                  actualizar((p) => {
                    p.visual.textoVisible = e.target.checked;
                  })
                }
              />
              <span>Mostrar el monólogo sobre el visual</span>
            </label>
          </div>

          <div className="visual__semilla">
            <label className="interruptor">
              <input
                type="checkbox"
                checked={visual.semillaPropia}
                onChange={(e) =>
                  actualizar((p) => {
                    p.visual.semillaPropia = e.target.checked;
                  })
                }
              />
              <span>Semilla propia para el visual</span>
            </label>

            {visual.semillaPropia ? (
              <>
                <input
                  type="number"
                  className="seccion__semilla"
                  value={visual.semilla}
                  onChange={(e) =>
                    actualizar((p) => {
                      p.visual.semilla = Number(e.target.value) || 0;
                    })
                  }
                />
                <button
                  type="button"
                  className="mini"
                  title="Otra semilla para el visual"
                  onClick={() =>
                    actualizar((p) => {
                      p.visual.semilla = semillaAleatoria();
                    })
                  }
                >
                  🎲
                </button>
              </>
            ) : (
              <span className="panel__nota">
                Comparte la semilla de la música ({proyecto.semilla}): si varías el sonido, cambia
                también el visual.
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">El visual por sección</h2>
          <span className="panel__nota">
            La intensidad del arco ya lo mueve; aquí puedes cambiarle el preset
          </span>
        </div>

        <div className="panel__cuerpo">
          <div className="secciones">
            {secciones.map((seccion, indice) => (
              <article className="seccion" key={seccion.id} data-seccion={seccion.id}>
                <header className="seccion__cabecera">
                  <span className="seccion__orden">{indice + 1}</span>
                  <h3 className="seccion__nombre">{seccion.etiqueta}</h3>
                  <span className="seccion__duracion">
                    {Math.round(seccion.intensidad * 100)}%
                  </span>
                </header>

                <div className="grupo-segmentado grupo-segmentado--chico visual__eleccion">
                  <button
                    type="button"
                    aria-pressed={!seccion.presetVisual}
                    onClick={() =>
                      actualizar((p) => {
                        p.secciones[indice].presetVisual = undefined;
                      })
                    }
                  >
                    Igual
                  </button>
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={seccion.presetVisual === preset.id}
                      onClick={() =>
                        actualizar((p) => {
                          p.secciones[indice].presetVisual = preset.id as NombrePreset;
                        })
                      }
                    >
                      {preset.etiqueta}
                    </button>
                  ))}
                </div>

                <p className="seccion__intencion">
                  {seccion.desvanecer
                    ? 'El visual y el texto se apagan con la música.'
                    : `Se ve al ${Math.round(seccion.intensidad * 100)}% de fuerza.`}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
