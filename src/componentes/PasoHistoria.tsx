/**
 * Mi historia: las dos preguntas que sostienen todo el reto.
 * Va primero a propósito — la música y el visual son el vehículo,
 * el relato es el destino.
 */
import { useProyecto } from '../estado/ProyectoContext';

const EJEMPLOS = [
  'El señor de los tintos de la 70 que se sabe el nombre de todos.',
  'La última silletera que amarra el arreglo como su abuela.',
  'El metro a las 6 a. m.: mil personas calladas yendo al mismo sitio.',
  'Una palabra en parlache que ya casi nadie dice.',
];

export function PasoHistoria() {
  const { proyecto, actualizar } = useProyecto();
  const { historia } = proyecto;

  return (
    <section className="panel">
      <div className="panel__cabecera">
        <h2 className="panel__titulo">Mi historia</h2>
        <span className="panel__nota">Lo primero, y lo más importante</span>
      </div>

      <div className="panel__cuerpo">
        <div className="paso">
          <label className="campo" htmlFor="historia-que">
            <span className="paso__pregunta">¿Qué historia de Medellín vas a contar?</span>
            <span className="paso__ayuda">
              Un tema, una persona, una esquina, un recuerdo, una tensión. No tiene que ser
              grande: mientras más concreto, mejor.
            </span>
            <textarea
              id="historia-que"
              className="paso__texto"
              rows={4}
              placeholder="Escribe aquí en pocas frases de qué va tu historia…"
              value={historia.que}
              onChange={(e) =>
                actualizar((p) => {
                  p.historia.que = e.target.value;
                })
              }
            />
          </label>

          <div className="paso__ejemplos">
            <span className="campo__etiqueta">Para arrancar</span>
            <ul>
              {EJEMPLOS.map((ejemplo) => (
                <li key={ejemplo}>{ejemplo}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="paso">
          <label className="campo" htmlFor="historia-porque">
            <span className="paso__pregunta">¿Por qué es Medellín?</span>
            <span className="paso__ayuda">
              El jurado va a preguntar esto. ¿Qué tiene tu tema que solo se entiende aquí? Puede
              ser histórico, cultural, del barrio o del habla.
            </span>
            <textarea
              id="historia-porque"
              className="paso__texto"
              rows={4}
              placeholder="Explica por qué esta historia es de Medellín y no de otra ciudad…"
              value={historia.porQue}
              onChange={(e) =>
                actualizar((p) => {
                  p.historia.porQue = e.target.value;
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
  );
}
