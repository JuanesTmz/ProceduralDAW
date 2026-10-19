/**
 * Los mandos del estilo, a mano: un deslizador por cada uno (o un selector,
 * si es una elección como la figura) y el botón «Sorprenderme».
 *
 * En el lab de Música Urbana es la única forma de ajustar el estilo; en el
 * de IA los mandos viven en la lista de datos, donde además se pueden
 * conectar a algo.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { sorprender } from '../estado/imagen';
import { algoritmoDe, valoresPorDefecto } from '../visual/algoritmos';
import { SelectorOpciones } from './SelectorOpciones';

export function AjustesEstilo() {
  const { proyecto, actualizar } = useProyecto();
  const alg = algoritmoDe(proyecto.visual.algoritmo);
  const valores = { ...valoresPorDefecto(alg), ...(proyecto.visual.parametros[alg.id] ?? {}) };
  const poner = (id: string, v: number) =>
    actualizar((p) => {
      (p.visual.parametros[alg.id] ??= {})[id] = v;
    });

  return (
    <details className="nv-ajustes">
      <summary>
        <span>Ajustar el estilo</span>
        <span className="nv-tenue nv-chico">{alg.mandos.length} mandos</span>
      </summary>
      <div className="nv-ajustes__acciones">
        <button type="button" className="nv-boton nv-boton--chico nv-boton--sorpresa" onClick={() => actualizar(sorprender)}>
          ✦ Sorprenderme
        </button>
        <button
          type="button"
          className="nv-enlace nv-chico"
          onClick={() =>
            actualizar((p) => {
              delete p.visual.parametros[alg.id];
            })
          }
        >
          Restablecer
        </button>
      </div>
      <div className="nv-ajustes__lista">
        {alg.mandos.map((m) => (
          <label key={m.id} className="nv-ajuste">
            <span className="nv-ajuste__nombre">{m.etiqueta}</span>
            {m.opciones ? (
              <SelectorOpciones
                opciones={m.opciones}
                valor={valores[m.id]}
                etiqueta={m.etiqueta}
                alCambiar={(i) => poner(m.id, i)}
              />
            ) : (
              <>
                <input
                  type="range"
                  min={m.min}
                  max={m.max}
                  step={m.paso}
                  value={valores[m.id]}
                  onChange={(ev) => poner(m.id, Number(ev.target.value))}
                />
                <span className="nv-mono nv-chico nv-tenue nv-ajuste__lectura">
                  {m.lectura ? m.lectura(valores[m.id]) : valores[m.id].toFixed(2)}
                </span>
              </>
            )}
          </label>
        ))}
      </div>
    </details>
  );
}
