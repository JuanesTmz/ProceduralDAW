/**
 * Paso 1: la historia. Qué cuentan, por qué es de Medellín, el monólogo y
 * dónde se parte en escenas.
 *
 * Partir el texto vive en PartirTexto: tramos resaltados con límites que
 * se arrastran.
 */
import { BotonTutorial } from './BotonTutorial';
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import { cargarEjemplo, sincronizarEscenas } from '../estado/escenas';
import { PartirTexto } from './PartirTexto';
import { MAXIMO_PALABRAS, MINIMO_PALABRAS } from '../estado/tipos';

export function PasoHistoria({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar, empezarDeNuevo } = useProyecto();
  const [seguro, setSeguro] = useState(false);
  const { historia, narracion } = proyecto;
  const palabras = palabrasDe(narracion.texto);
  const total = palabras.length;

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
        <BotonTutorial id="narrativa" texto="¿Qué es narrativa musical?" />
        <span className="nv-espacio" />
        <button
          type="button"
          className={`nv-boton ${seguro ? 'nv-boton--peligro' : ''}`}
          onClick={() => {
            if (!seguro) {
              setSeguro(true);
              window.setTimeout(() => setSeguro(false), 3000);
              return;
            }
            setSeguro(false);
            empezarDeNuevo();
          }}
        >
          {seguro ? '¿Seguro? Toca otra vez' : 'Empezar de cero'}
        </button>
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

      <PartirTexto />

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
