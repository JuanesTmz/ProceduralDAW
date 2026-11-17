// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Paso 1: la historia. Cinco casillas, una por estación del SmartFest, para
 * anotar lo que encontraron en cada una; con eso escriben el monólogo final
 * y lo parten en escenas.
 *
 * Partir el texto vive en PartirTexto: tramos resaltados con límites que
 * se arrastran.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import { cargarEjemplo, sincronizarEscenas } from '../estado/escenas';
import { PartirTexto } from './PartirTexto';
import { MAXIMO_PALABRAS, MINIMO_PALABRAS } from '../estado/tipos';
import { ESTACIONES, notasEstaciones } from '../estado/estaciones';

export function PasoHistoria({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar, empezarDeNuevo } = useProyecto();
  const [seguro, setSeguro] = useState(false);
  const { narracion } = proyecto;
  const notas = notasEstaciones(proyecto.historia.estaciones);
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
          <p className="nv-sub">Anota lo que encontraste en cada estación y con eso escribe tu monólogo.</p>
        </div>
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

      <div className="nv-estaciones">
        {ESTACIONES.map((e, i) => (
          <label key={e.nombre} className="nv-tarjeta nv-campo nv-estacion" data-bloqueo={`historia:estacion:${i}`}>
            <span className="nv-estacion__num">{i + 1}</span>
            <span className="nv-campo__titulo">{e.nombre}</span>
            <textarea
              rows={3}
              placeholder={e.pregunta}
              value={notas[i]}
              onChange={(ev) =>
                actualizar((p) => {
                  const lista = notasEstaciones(p.historia.estaciones);
                  lista[i] = ev.target.value;
                  p.historia.estaciones = lista;
                })
              }
            />
          </label>
        ))}
      </div>

      <div className="nv-tarjeta nv-historia__texto">
        <label className="nv-campo" data-bloqueo="historia:monologo">
          <span className="nv-campo__fila">
            <span className="nv-campo__titulo">Tu monólogo final</span>
            <span className="nv-tenue nv-chico">Junta lo de las estaciones en una sola historia, para decirla en voz alta.</span>
            <span className="nv-espacio" />
            <span className="nv-mono nv-tenue">{contador}</span>
          </span>
          <textarea
            rows={5}
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
