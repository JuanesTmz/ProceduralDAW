/**
 * Estructura de la canción: una sola pantalla para el arco y las secciones.
 *
 * Antes eran dos pasos distintos —la curva por un lado, las partes por el
 * otro— y en realidad son lo mismo: el arco ES la estructura. Aquí se ve
 * como un semicírculo hueco donde cada parte ocupa el tiempo que le toca y
 * crece según su energía.
 *
 * Lo que suena en cada parte NO se decide aquí: se toca directamente en la
 * pista repartida, que es donde se ve. Esta ventana es solo el reparto del
 * tiempo y la energía.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import {
  ajustarPuntoDelArco,
  aplicarProporciones,
  duracionPieza,
  duracionSeccion,
  fijarVueltasTotales,
  formatearReloj,
  moverLimite,
  proporcionesDeSecciones,
  vueltasParaDuracion,
  vueltasTotales,
  VUELTAS_MAXIMAS,
  VUELTAS_MINIMAS,
} from '../estado/proyecto';
import { semillaAleatoria } from '../generativo/rng';
import { ArcoDona, COLOR_SECCION } from './ArcoDona';
import type { NombreSeccion } from '../estado/tipos';

interface Forma {
  nombre: string;
  descripcion: string;
  /** Intro, Estrofa, Coro, Cierre: qué parte del tiempo se lleva cada una. */
  proporciones: number[];
  intensidades: Record<NombreSeccion, number>;
}

const FORMAS: Forma[] = [
  {
    nombre: 'Crece y se apaga',
    descripcion: 'Entra bajito, llena, estalla y se va.',
    proporciones: [0.15, 0.4, 0.25, 0.2],
    intensidades: { intro: 0.3, estrofa: 0.75, coro: 1, cierre: 0.45 },
  },
  {
    nombre: 'Estalla en el coro',
    descripcion: 'Contenida hasta que algo pasa en el coro.',
    proporciones: [0.2, 0.35, 0.3, 0.15],
    intensidades: { intro: 0.25, estrofa: 0.45, coro: 1, cierre: 0.3 },
  },
  {
    nombre: 'Empieza fuerte',
    descripcion: 'Golpea de entrada y se va desinflando.',
    proporciones: [0.25, 0.35, 0.2, 0.2],
    intensidades: { intro: 0.95, estrofa: 0.7, coro: 0.5, cierre: 0.2 },
  },
  {
    nombre: 'Se va apretando',
    descripcion: 'Sube parejo, sin respiro, hasta el final.',
    proporciones: [0.2, 0.3, 0.25, 0.25],
    intensidades: { intro: 0.3, estrofa: 0.6, coro: 0.85, cierre: 1 },
  },
];

/** Duraciones de atajo, en segundos. */
const DURACIONES = [60, 90, 120, 180];

export function PasoEstructura() {
  const { proyecto, actualizar } = useProyecto();
  const [elegida, setElegida] = useState(0);

  const { secciones, narracion } = proyecto;
  const proporciones = proporcionesDeSecciones(proyecto);
  const total = duracionPieza(proyecto);
  const vueltas = vueltasTotales(proyecto);
  const indice = Math.min(elegida, secciones.length - 1);
  const seccion = secciones[indice];
  const duracionDeLaParte = duracionSeccion(proyecto, seccion);

  const editar = (cambio: (p: typeof proyecto) => void) => actualizar(cambio);

  const alMoverLimite = (limite: number, fraccion: number) => {
    editar((p) => {
      const props = proporcionesDeSecciones(p);
      const antes = props.slice(0, limite).reduce((a, b) => a + b, 0);
      const porcionPar = props[limite] + props[limite + 1];
      const par = p.secciones[limite].compases + p.secciones[limite + 1].compases;
      const dentro = porcionPar > 0 ? (fraccion - antes) / porcionPar : 0;
      moverLimite(p, limite, dentro * par);
    });
  };

  const alAjustarLimite = (limite: number, delta: number) => {
    editar((p) => moverLimite(p, limite, p.secciones[limite].compases + delta));
  };

  const aplicarForma = (forma: Forma) => {
    editar((p) => {
      aplicarProporciones(p, forma.proporciones);
      for (const s of p.secciones) {
        ajustarPuntoDelArco(p, s.id, forma.intensidades[s.id], true);
      }
    });
  };

  const tocarPieza = () => {
    editar((p) => {
      p.modoReproduccion = 'pieza';
    });
    motorAudio.cambiarModo('pieza');
    void motorAudio.reproducir();
  };

  return (
    <section className="panel">
      {/* Sin cabecera propia: el título ya lo pone la ventana, y repetirlo
          costaba 60 px de los 800 que tiene la tablet. */}
      <div className="panel__cuerpo">
        <div className="estructura">
          <div className="estructura__arco">
            <ArcoDona
              secciones={secciones}
              proporciones={proporciones}
              seleccionada={indice}
              alSeleccionar={setElegida}
              alMoverLimite={alMoverLimite}
              alAjustarLimite={alAjustarLimite}
            />
            <div className="estructura__centro">
              <strong className="estructura__reloj">{formatearReloj(total)}</strong>
              <span className="estructura__leyenda">duración total</span>
            </div>
          </div>

          <div className="estructura__mandos">
            <button type="button" className="boton boton--primario" onClick={tocarPieza}>
              ▶ Oír la pieza
            </button>
            <label className="campo">
              <span className="campo__etiqueta">Duración de la canción</span>
              <input
                type="range"
                min={VUELTAS_MINIMAS}
                max={VUELTAS_MAXIMAS}
                step={1}
                value={vueltas}
                aria-label="Duración de la canción"
                onChange={(e) => editar((p) => fijarVueltasTotales(p, Number(e.target.value)))}
              />
            </label>
            <div className="estructura__atajos">
              {DURACIONES.map((segundos) => (
                <button
                  key={segundos}
                  type="button"
                  className="chip"
                  onClick={() =>
                    editar((p) => fijarVueltasTotales(p, vueltasParaDuracion(p, segundos)))
                  }
                >
                  {formatearReloj(segundos)}
                </button>
              ))}
              {narracion.duracion > 0 && (
                <button
                  type="button"
                  className="chip"
                  title="Deja la pieza un poco más larga que tu grabación"
                  onClick={() =>
                    editar((p) =>
                      fijarVueltasTotales(p, vueltasParaDuracion(p, p.narracion.duracion * 1.15)),
                    )
                  }
                >
                  A la medida de mi voz
                </button>
              )}
            </div>

            <p className="estructura__aviso">
              {narracion.duracion > 0
                ? `Tu voz dura ${formatearReloj(narracion.duracion)} y la pieza ${formatearReloj(
                    total,
                  )}: ${
                    total >= narracion.duracion
                      ? `sobran ${formatearReloj(total - narracion.duracion)} de música sola.`
                      : `la voz se sale por ${formatearReloj(narracion.duracion - total)}.`
                  }`
                : `${vueltas} vueltas del patrón en total. Arrastra los puntos del arco para repartir el tiempo entre las partes.`}
            </p>

            <div className="formas">
              <span className="campo__etiqueta">Formas de arco</span>
              <div className="formas__lista formas__lista--compacta">
                {FORMAS.map((forma) => (
                  <button
                    key={forma.nombre}
                    type="button"
                    className="forma"
                    onClick={() => aplicarForma(forma)}
                  >
                    <strong>{forma.nombre}</strong>
                    <span>{forma.descripcion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="partes">
          {secciones.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`parte ${i === indice ? 'parte--elegida' : ''}`}
              data-seccion={s.id}
              aria-pressed={i === indice}
              onClick={() => setElegida(i)}
            >
              <span className="parte__nombre">
                <span className="punto-color" style={{ background: COLOR_SECCION[s.id] }} />
                {s.etiqueta}
              </span>
              <span className="parte__tiempo">{formatearReloj(duracionSeccion(proyecto, s))}</span>
              <span className="parte__dato">
                {Math.round(proporciones[i] * 100)}% · {s.compases}{' '}
                {s.compases === 1 ? 'vuelta' : 'vueltas'}
              </span>
            </button>
          ))}
        </div>

        <article className="detalle" data-seccion={seccion.id}>
          <header className="detalle__cabecera">
            <h3 className="detalle__titulo">
              <span className="punto-color" style={{ background: COLOR_SECCION[seccion.id] }} />
              {seccion.etiqueta}
            </h3>
            <div className="detalle__duracion">
              <button
                type="button"
                className="mini"
                aria-label="Acortar esta parte"
                onClick={() =>
                  editar((p) => {
                    const s = p.secciones[indice];
                    s.compases = Math.max(1, s.compases - 1);
                  })
                }
              >
                −
              </button>
              <span className="detalle__reloj">{formatearReloj(duracionDeLaParte)}</span>
              <button
                type="button"
                className="mini"
                aria-label="Alargar esta parte"
                onClick={() =>
                  editar((p) => {
                    const s = p.secciones[indice];
                    s.compases = Math.min(80, s.compases + 1);
                  })
                }
              >
                +
              </button>
            </div>
          </header>

          <p className="detalle__intencion">{seccion.intencion}</p>

          <label className="efectos__control">
            <span>Energía</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={seccion.intensidad}
              onChange={(e) =>
                editar((p) => {
                  p.secciones[indice].intensidad = Number(e.target.value);
                })
              }
            />
            <span className="campo__valor">{Math.round(seccion.intensidad * 100)}%</span>
          </label>

          <div className="detalle__pie">
            <label className="campo campo--horizontal">
                <span className="campo__etiqueta">Semilla</span>
                <input
                  type="number"
                  className="seccion__semilla"
                  value={seccion.semilla}
                  onChange={(e) =>
                    editar((p) => {
                      p.secciones[indice].semilla = Number(e.target.value) || 0;
                    })
                  }
              />
            </label>
            <button
              type="button"
              className="mini"
              title="Otra versión de esta parte"
              onClick={() =>
                editar((p) => {
                  p.secciones[indice].semilla = semillaAleatoria();
                })
              }
            >
              🎲
            </button>
            <button
              type="button"
              className={`capa ${seccion.desvanecer ? 'capa--activa' : ''}`}
              aria-pressed={seccion.desvanecer}
              title="La parte se apaga poco a poco hasta el silencio"
              onClick={() =>
                editar((p) => {
                  const s = p.secciones[indice];
                  s.desvanecer = !s.desvanecer;
                })
              }
            >
              Desvanecer
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
