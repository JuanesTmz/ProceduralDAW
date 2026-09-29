/**
 * El monólogo: el texto de ~100 palabras y su grabación.
 * También reparte el texto entre las secciones, para que la narración
 * avance con el arco en vez de quedarse pegada al principio.
 */
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import {
  MAXIMO_PALABRAS,
  META_PALABRAS,
  MINIMO_PALABRAS,
  type NombreSeccion,
} from '../estado/tipos';
import {
  fragmentosNarracion,
  moverCorte,
  palabrasDe,
  repartirNarracionAuto,
} from '../estado/proyecto';
import { Grabadora } from './Grabadora';

function estadoDelContador(palabras: number) {
  if (palabras === 0) return { clase: 'contador--vacio', mensaje: 'Escribe tu monólogo.' };
  if (palabras < MINIMO_PALABRAS) {
    return {
      clase: 'contador--corto',
      mensaje: `Te faltan ${MINIMO_PALABRAS - palabras} palabras para llegar al mínimo.`,
    };
  }
  if (palabras > MAXIMO_PALABRAS) {
    return {
      clase: 'contador--largo',
      mensaje: `Te pasaste por ${palabras - MAXIMO_PALABRAS}. Recorta: la fuerza está en decir poco.`,
    };
  }
  return { clase: 'contador--bien', mensaje: 'Buen tamaño. Léelo en voz alta y ajusta.' };
}

export function PasoMonologo() {
  const { proyecto, actualizar } = useProyecto();
  const { narracion, secciones } = proyecto;
  const subida = useRef<HTMLInputElement>(null);

  const palabras = palabrasDe(narracion.texto);
  const total = palabras.length;
  const estado = estadoDelContador(total);
  const fragmentos = fragmentosNarracion(narracion);

  const escribirTexto = (texto: string) => {
    actualizar((p) => {
      p.narracion.texto = texto;
      const nuevoTotal = palabrasDe(texto).length;
      // Si el reparto se queda fuera de rango al editar, se recalcula solo.
      if (p.narracion.cortes.some((c) => c > nuevoTotal) || p.narracion.cortes[2] === 0) {
        p.narracion.cortes = repartirNarracionAuto(p);
      }
    });
  };

  const subirAudio = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const elemento = new Audio(url);
    elemento.addEventListener('loadedmetadata', () => {
      actualizar((p) => {
        p.narracion.audioUrl = url;
        p.narracion.origen = 'subido';
        p.narracion.duracion = Number.isFinite(elemento.duration) ? elemento.duration : 0;
      });
    });
    evento.target.value = '';
  };

  return (
    <>
      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">El monólogo</h2>
          <span className="panel__nota">Unas 100 palabras, para decir — no para cantar</span>
        </div>

        <div className="panel__cuerpo">
          <div className="monologo">
            <textarea
              className="paso__texto paso__texto--grande"
              rows={9}
              placeholder="Escribe aquí tu monólogo. Piensa que lo vas a decir en voz alta sobre la música…"
              value={narracion.texto}
              onChange={(e) => escribirTexto(e.target.value)}
            />

            <aside className={`contador ${estado.clase}`}>
              <span className="contador__numero">{total}</span>
              <span className="contador__meta">de ~{META_PALABRAS} palabras</span>
              <div className="contador__barra">
                <div
                  className="contador__relleno"
                  style={{ width: `${Math.min(100, (total / MAXIMO_PALABRAS) * 100)}%` }}
                />
                <div
                  className="contador__marca"
                  style={{ left: `${(META_PALABRAS / MAXIMO_PALABRAS) * 100}%` }}
                />
              </div>
              <p className="contador__mensaje">{estado.mensaje}</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">Tu voz</h2>
          <span className="panel__nota">Esta pista es la columna: todo lo demás se le acomoda</span>
          <div className="panel__acciones">
            <button type="button" className="boton" onClick={() => subida.current?.click()}>
              ⬆ Subir un audio
            </button>
            <input
              ref={subida}
              type="file"
              accept="audio/*"
              onChange={subirAudio}
              hidden
            />
          </div>
        </div>

        <div className="panel__cuerpo">
          <Grabadora />

          <div className="voz-ajustes">
            <label className="efectos__control">
              <span>Entra en</span>
              <select
                value={narracion.seccionInicio}
                onChange={(e) =>
                  actualizar((p) => {
                    p.narracion.seccionInicio = e.target.value as NombreSeccion;
                  })
                }
              >
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.etiqueta}
                  </option>
                ))}
              </select>
            </label>

            <label className="efectos__control">
              <span>Espera</span>
              <input
                type="range"
                min={0}
                max={8}
                step={0.25}
                value={narracion.desfase}
                onChange={(e) =>
                  actualizar((p) => {
                    p.narracion.desfase = Number(e.target.value);
                  })
                }
              />
              <span className="campo__valor">{narracion.desfase.toFixed(2)} s</span>
            </label>

            <label className="efectos__control">
              <span>Volumen</span>
              <input
                type="range"
                min={0}
                max={1.4}
                step={0.02}
                value={narracion.volumen}
                onChange={(e) =>
                  actualizar((p) => {
                    p.narracion.volumen = Number(e.target.value);
                  })
                }
              />
              <span className="campo__valor">{Math.round(narracion.volumen * 100)}%</span>
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__cabecera">
          <h2 className="panel__titulo">La narración por secciones</h2>
          <span className="panel__nota">Qué parte del texto cae en cada momento de la pieza</span>
          <div className="panel__acciones">
            <button
              type="button"
              className="boton"
              onClick={() =>
                actualizar((p) => {
                  p.narracion.cortes = repartirNarracionAuto(p);
                })
              }
            >
              Repartir automáticamente
            </button>
          </div>
        </div>

        <div className="panel__cuerpo">
          {total === 0 ? (
            <p className="paso__ayuda">Escribe el monólogo y aquí verás cómo se reparte.</p>
          ) : (
            <div className="reparto">
              {secciones.map((seccion, i) => (
                <article className="reparto__bloque" key={seccion.id} data-seccion={seccion.id}>
                  <header className="reparto__cabecera">
                    <h3>{seccion.etiqueta}</h3>
                    <span className="reparto__cuenta">
                      {palabrasDe(fragmentos[i]).length} palabras
                    </span>
                  </header>
                  <p className="reparto__texto">{fragmentos[i] || '—'}</p>
                  {i < 3 && (
                    <div className="reparto__mando">
                      <button
                        type="button"
                        className="mini"
                        title={`Pasar una palabra a ${secciones[i + 1].etiqueta}`}
                        onClick={() => actualizar((p) => moverCorte(p.narracion, i, -1))}
                      >
                        ◀
                      </button>
                      <span className="reparto__corte">corte con {secciones[i + 1].etiqueta}</span>
                      <button
                        type="button"
                        className="mini"
                        title={`Traer una palabra desde ${secciones[i + 1].etiqueta}`}
                        onClick={() => actualizar((p) => moverCorte(p.narracion, i, 1))}
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
