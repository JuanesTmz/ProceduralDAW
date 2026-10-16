/**
 * Paso 1: la historia. Qué cuentan, por qué es de Medellín, el monólogo y
 * dónde se parte en escenas.
 *
 * Partir es un solo gesto: tocar una palabra pone un corte justo antes de
 * ella (y tocarla otra vez lo quita). Cada tramo queda del color de su
 * escena, así se ve de un vistazo cómo quedó repartido el relato.
 */
import { Fragment } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import {
  alternarCorte,
  cargarEjemplo,
  EMOCIONES,
  sincronizarEscenas,
} from '../estado/escenas';
import { MAXIMO_PALABRAS, MINIMO_PALABRAS } from '../estado/tipos';

export function PasoHistoria({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { historia, narracion } = proyecto;
  const palabras = palabrasDe(narracion.texto);
  const total = palabras.length;

  // A qué escena pertenece cada palabra.
  const cortes = proyecto.cortesEscena;
  const escenaDe = (i: number) => cortes.filter((c) => c <= i).length;

  const contador =
    total === 0
      ? 'Escribe tu monólogo'
      : total < MINIMO_PALABRAS
        ? `${total} palabras · te faltan ${MINIMO_PALABRAS - total}`
        : total > MAXIMO_PALABRAS
          ? `${total} palabras · recorta ${total - MAXIMO_PALABRAS}`
          : `${total} palabras · buen tamaño`;

  return (
    <div className="nv-pagina">
      <div className="nv-cabeza">
        <div>
          <h1 className="nv-titulo">Tu historia</h1>
          <p className="nv-sub">Lo primero y lo más importante: qué vas a contar de Medellín.</p>
        </div>
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-boton"
          onClick={() => actualizar((p) => cargarEjemplo(p))}
        >
          Usar un ejemplo
        </button>
      </div>

      <div className="nv-historia">
        <div className="nv-tarjeta nv-historia__preguntas">
          <label className="nv-campo">
            <span className="nv-campo__titulo">¿Qué vas a contar?</span>
            <textarea
              rows={3}
              placeholder="Una persona, una esquina, un recuerdo, una palabra…"
              value={historia.que}
              onChange={(e) =>
                actualizar((p) => {
                  p.historia.que = e.target.value;
                })
              }
            />
          </label>
          <label className="nv-campo">
            <span className="nv-campo__titulo">¿Por qué es de Medellín?</span>
            <textarea
              rows={3}
              placeholder="Qué tiene esta historia que solo se entiende aquí…"
              value={historia.porQue}
              onChange={(e) =>
                actualizar((p) => {
                  p.historia.porQue = e.target.value;
                })
              }
            />
          </label>
        </div>

        <div className="nv-tarjeta nv-historia__texto">
          <label className="nv-campo">
            <span className="nv-campo__fila">
              <span className="nv-campo__titulo">Tu monólogo</span>
              <span className="nv-espacio" />
              <span className="nv-mono nv-tenue">{contador}</span>
            </span>
            <textarea
              rows={6}
              placeholder="Unas 100 palabras, para decirlas, no para cantarlas…"
              value={narracion.texto}
              onChange={(e) =>
                actualizar((p) => {
                  p.narracion.texto = e.target.value;
                  sincronizarEscenas(p);
                })
              }
            />
          </label>
        </div>
      </div>

      {total > 0 && (
        <div className="nv-tarjeta nv-partir">
          <div className="nv-campo__fila">
            <span className="nv-campo__titulo">Parte tu texto en escenas</span>
            <span className="nv-tenue">
              Toca la palabra con la que empieza cada escena. Tócala otra vez para quitar el corte.
            </span>
            <span className="nv-espacio" />
            <span className="nv-mono nv-tenue">
              {proyecto.escenas.length} {proyecto.escenas.length === 1 ? 'escena' : 'escenas'}
            </span>
          </div>
          <p className="nv-partir__texto">
            {palabras.map((palabra, i) => {
              const n = escenaDe(i);
              const escena = proyecto.escenas[n];
              const color = escena ? EMOCIONES[escena.emocion].color : '#8b91a5';
              const empieza = i > 0 && cortes.includes(i);
              return (
                <Fragment key={i}>
                <span className="nv-partir__grupo">
                  {empieza && <span className="nv-partir__corte" style={{ background: color }}>{n + 1}</span>}
                  <button
                    type="button"
                    className="nv-palabra"
                    style={{ color, borderColor: empieza ? color : 'transparent' }}
                    disabled={i === 0}
                    onClick={() => actualizar((p) => alternarCorte(p, i))}
                  >
                    {palabra}
                  </button>
                </span>{' '}
                </Fragment>
              );
            })}
          </p>
        </div>
      )}

      <div className="nv-pie">
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-boton nv-boton--primario"
          disabled={proyecto.escenas.length === 0}
          onClick={alSeguir}
        >
          Seguir a Voz  →
        </button>
      </div>
    </div>
  );
}
