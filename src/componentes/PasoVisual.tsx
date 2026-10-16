/**
 * El Visual: la obra grande a la izquierda y todo lo que la gobierna al
 * lado, sin desplazar la página.
 *
 * Es la misma forma que ya tiene Producción —lo que se mira manda, lo que
 * lo controla acompaña— y la misma que el laboratorio de arte generativo
 * del que salen los algoritmos.
 *
 * El orden de la columna no es casual: primero de qué está hecha la obra
 * (el algoritmo), luego con qué se alimenta (la música, una imagen, unos
 * datos) y al final cómo se afina (los mandos y el color). De lo que más
 * cambia el resultado a lo que menos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import { semillaAleatoria } from '../generativo/rng';
import { ALGORITMOS, algoritmoDe, NOMBRES_ALFABETO, valoresPorDefecto } from '../visual/algoritmos';
import type { NombreAlgoritmo } from '../visual/algoritmos/tipos';
import { PALETAS, paletaDe } from '../visual/paletas';
import { CampoImagen } from '../visual/imagenDatos';
import { datosDeCsv, datosDeLaCancion, SIN_DATOS, type FuenteDatos } from '../visual/datosVisual';
import { motorVisual } from '../visual/motorVisual';
import { LienzoVisual } from './LienzoVisual';

const FUENTES: { id: FuenteDatos; etiqueta: string; nota: string }[] = [
  { id: 'cancion', etiqueta: 'Tu canción', nota: 'Cada pista del patrón deforma la obra' },
  { id: 'archivo', etiqueta: 'Un archivo', nota: 'Una tabla CSV: cada fila, un punto' },
  { id: 'ninguna', etiqueta: 'Nada', nota: 'Solo ruido: procedural puro' },
];

export function PasoVisual() {
  const { proyecto, actualizar } = useProyecto();
  const { visual } = proyecto;
  const entradaImagen = useRef<HTMLInputElement>(null);
  const entradaDatos = useRef<HTMLInputElement>(null);
  const [imagen, setImagen] = useState<CampoImagen | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [pausado, setPausado] = useState(false);

  const algoritmo = algoritmoDe(visual.algoritmo);
  const paleta = paletaDe(visual.paleta);

  /** Los mandos guardados de este algoritmo, o los de fábrica. */
  const parametros = useMemo(
    () => ({ ...valoresPorDefecto(algoritmo), ...(visual.parametros[visual.algoritmo] ?? {}) }),
    [algoritmo, visual.parametros, visual.algoritmo],
  );

  const datos = useMemo(() => {
    if (visual.fuenteDatos === 'cancion') return datosDeLaCancion(proyecto);
    if (visual.fuenteDatos === 'archivo' && visual.csv) {
      return datosDeCsv(visual.csv, visual.nombreDatos ?? 'tu tabla');
    }
    return SIN_DATOS;
  }, [visual.fuenteDatos, visual.csv, visual.nombreDatos, proyecto]);

  // La imagen se lee una vez y se guarda como campo consultable.
  useEffect(() => {
    let vigente = true;
    if (!visual.imagenUrl) {
      setImagen(null);
      return;
    }
    CampoImagen.desdeUrl(visual.imagenUrl)
      .then((campo) => {
        if (vigente) setImagen(campo);
      })
      .catch(() => {
        if (vigente) setImagen(null);
      });
    return () => {
      vigente = false;
    };
  }, [visual.imagenUrl]);

  // Todo cambio del proyecto baja al motor. Es barato: solo copia ajustes.
  useEffect(() => {
    motorVisual.actualizar({
      algoritmo: visual.algoritmo,
      parametros,
      paleta: paleta.colores,
      alfabeto: visual.alfabeto,
      reaccion: visual.reaccion,
      imagen,
      influenciaImagen: visual.influenciaImagen,
      picos: datos.picos,
      influenciaDatos: visual.influenciaDatos,
      movimientoDatos: datos.movimiento,
      semilla: visual.semillaPropia ? visual.semilla : proyecto.semilla,
    });
  }, [visual, parametros, paleta, imagen, datos, proyecto.semilla]);

  // --------------------------------------------------------------- acciones

  const ponerParametro = (id: string, valor: number) => {
    actualizar((p) => {
      const actuales = p.visual.parametros[p.visual.algoritmo] ?? {};
      p.visual.parametros[p.visual.algoritmo] = { ...actuales, [id]: valor };
    });
  };

  const restaurarMandos = () => {
    actualizar((p) => {
      delete p.visual.parametros[p.visual.algoritmo];
    });
  };

  const subirImagen = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    actualizar((p) => {
      if (p.visual.imagenUrl) URL.revokeObjectURL(p.visual.imagenUrl);
      p.visual.imagenUrl = url;
      p.visual.nombreImagen = archivo.name.slice(0, 24);
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

  const subirDatos = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const texto = await archivo.text();
    actualizar((p) => {
      p.visual.csv = texto;
      p.visual.nombreDatos = archivo.name.slice(0, 24);
      p.visual.fuenteDatos = 'archivo';
    });
    evento.target.value = '';
  };

  const descargar = () => {
    const png = motorVisual.aPng();
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `sonora-${visual.algoritmo}-${Date.now()}.png`;
    a.click();
  };

  const alternarPausa = () => {
    const nuevo = !pausado;
    setPausado(nuevo);
    motorVisual.pausar(nuevo);
  };

  // ----------------------------------------------------------------- vista

  return (
    <div className="estudio-visual">
      {/* ------------------------------- la obra ------------------------------- */}
      <div className="estudio-visual__obra">
        <div className="obra__barra">
          <div className="obras">
            {ALGORITMOS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`obra-chip ${visual.algoritmo === a.id ? 'obra-chip--actual' : ''}`}
                aria-pressed={visual.algoritmo === a.id}
                title={a.descripcion}
                onClick={() =>
                  actualizar((p) => {
                    p.visual.algoritmo = a.id as NombreAlgoritmo;
                  })
                }
              >
                {a.nombre}
              </button>
            ))}
          </div>

          <div className="obra__acciones">
            <button type="button" className="boton boton--chico" onClick={alternarPausa}>
              {pausado ? '▶ Seguir' : '⏸ Pausar'}
            </button>
            <button type="button" className="boton boton--chico" onClick={descargar}>
              ⤓ PNG
            </button>
            <button
              type="button"
              className="boton boton--primario boton--chico"
              onClick={() => {
                motorAudio.cambiarModo('pieza');
                void motorAudio.reproducir();
              }}
            >
              ▶ Ver la pieza
            </button>
          </div>
        </div>

        <LienzoVisual alFallar={setFallo} />

        {fallo ? (
          <p className="aviso aviso--malo">
            {fallo}. Prueba con otra obra: las tres primeras no necesitan tarjeta gráfica.
          </p>
        ) : (
          <p className="obra__lectura">{algoritmo.descripcion}</p>
        )}
      </div>

      {/* ------------------------------ los mandos ----------------------------- */}
      <aside className="estudio-visual__mandos">
        {/* ---- la música ---- */}
        <section className="grupo">
          <h3 className="pistas__titulo">La música</h3>
          <p className="grupo__nota">{algoritmo.escucha}</p>
          <label className="corrida">
            <span>Cuánto le hace caso</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={visual.reaccion}
              onChange={(e) =>
                actualizar((p) => {
                  p.visual.reaccion = Number(e.target.value);
                })
              }
            />
            <span className="corrida__valor">{Math.round(visual.reaccion * 100)}%</span>
          </label>
        </section>

        {/* ---- la imagen ---- */}
        <section className="grupo">
          <h3 className="pistas__titulo">Una imagen</h3>
          <p className="grupo__nota">{algoritmo.conImagen}</p>
          {visual.imagenUrl ? (
            <>
              <div className="grupo__fila">
                <img className="miniatura" src={visual.imagenUrl} alt="" />
                <span className="pista__nota">{visual.nombreImagen}</span>
                <button type="button" className="mini mini--quitar" onClick={quitarImagen}>
                  ×
                </button>
              </div>
              <label className="corrida">
                <span>Cuánto manda</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={visual.influenciaImagen}
                  onChange={(e) =>
                    actualizar((p) => {
                      p.visual.influenciaImagen = Number(e.target.value);
                    })
                  }
                />
                <span className="corrida__valor">
                  {Math.round(visual.influenciaImagen * 100)}%
                </span>
              </label>
            </>
          ) : (
            <button
              type="button"
              className="boton boton--chico"
              onClick={() => entradaImagen.current?.click()}
            >
              🖼 Subir la foto de tu tema
            </button>
          )}
          <input ref={entradaImagen} type="file" accept="image/*" onChange={subirImagen} hidden />
        </section>

        {/* ---- los datos ---- */}
        <section className="grupo">
          <h3 className="pistas__titulo">Los datos</h3>
          <p className="grupo__nota">{algoritmo.conDatos}</p>
          <div className="grupo__opciones">
            {FUENTES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip-sonido ${visual.fuenteDatos === f.id ? 'chip-sonido--actual' : ''}`}
                title={f.nota}
                onClick={() => {
                  if (f.id === 'archivo' && !visual.csv) {
                    entradaDatos.current?.click();
                    return;
                  }
                  actualizar((p) => {
                    p.visual.fuenteDatos = f.id;
                  });
                }}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
          <input
            ref={entradaDatos}
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(e) => void subirDatos(e)}
            hidden
          />

          <p className="pista__nota">{datos.resumen}</p>

          {visual.fuenteDatos === 'archivo' && (
            <button
              type="button"
              className="boton boton--chico"
              onClick={() => entradaDatos.current?.click()}
            >
              ⬆ Cambiar la tabla
            </button>
          )}

          {datos.picos.length > 0 && (
            <label className="corrida">
              <span>Cuánto deforman</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={visual.influenciaDatos}
                onChange={(e) =>
                  actualizar((p) => {
                    p.visual.influenciaDatos = Number(e.target.value);
                  })
                }
              />
              <span className="corrida__valor">{Math.round(visual.influenciaDatos * 100)}%</span>
            </label>
          )}
        </section>

        {/* ---- los mandos del algoritmo ---- */}
        <section className="grupo">
          <div className="grupo__cabecera">
            <h3 className="pistas__titulo">A mano</h3>
            <button type="button" className="boton boton--chico" onClick={restaurarMandos}>
              Volver al original
            </button>
          </div>

          {algoritmo.mandos.map((mando) => (
            <label key={mando.id} className="corrida">
              <span>{mando.etiqueta}</span>
              <input
                type="range"
                min={mando.min}
                max={mando.max}
                step={mando.paso}
                value={parametros[mando.id] ?? mando.valor}
                onChange={(e) => ponerParametro(mando.id, Number(e.target.value))}
              />
              <span className="corrida__valor">
                {(mando.lectura ?? ((v: number) => v.toFixed(2)))(parametros[mando.id] ?? mando.valor)}
              </span>
            </label>
          ))}

          {visual.algoritmo === 'glifos' && (
            <div className="grupo__opciones">
              {NOMBRES_ALFABETO.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`chip-sonido ${visual.alfabeto === a.id ? 'chip-sonido--actual' : ''}`}
                  onClick={() =>
                    actualizar((p) => {
                      p.visual.alfabeto = a.id;
                    })
                  }
                >
                  {a.etiqueta}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---- el color y la semilla ---- */}
        <section className="grupo">
          <h3 className="pistas__titulo">El color</h3>
          <div className="paletas">
            {PALETAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`paleta ${visual.paleta === p.id ? 'paleta--actual' : ''}`}
                title={p.nombre}
                aria-label={p.nombre}
                onClick={() =>
                  actualizar((proy) => {
                    proy.visual.paleta = p.id;
                  })
                }
              >
                {p.colores.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </button>
            ))}
          </div>

          <label className="corrida">
            <span>Texto del monólogo</span>
            <input
              type="checkbox"
              checked={visual.textoVisible}
              onChange={(e) =>
                actualizar((p) => {
                  p.visual.textoVisible = e.target.checked;
                })
              }
            />
          </label>

          <div className="grupo__fila">
            <span className="pista__nota">
              Semilla {visual.semillaPropia ? visual.semilla : proyecto.semilla}
              {visual.semillaPropia ? '' : ' · la de la música'}
            </span>
            <button
              type="button"
              className="mini"
              title="Otra versión de la misma obra"
              onClick={() =>
                actualizar((p) => {
                  p.visual.semillaPropia = true;
                  p.visual.semilla = semillaAleatoria();
                })
              }
            >
              🎲
            </button>
            {visual.semillaPropia && (
              <button
                type="button"
                className="boton boton--chico"
                onClick={() =>
                  actualizar((p) => {
                    p.visual.semillaPropia = false;
                  })
                }
              >
                Volver a la de la música
              </button>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
