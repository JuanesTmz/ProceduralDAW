/**
 * El mapa de reglas, en lenguaje llano.
 * Es uno de los entregables del reto: el estudiante lo lee y explica
 * ante el jurado cómo funciona su máquina.
 */
import type { MapaReglas } from '../generativo/mapaReglas';

export function MapaDeReglas({ mapa }: { mapa: MapaReglas }) {
  return (
    <section className="panel">
      <div className="panel__cabecera">
        <h2 className="panel__titulo">Mapa de reglas</h2>
        <span className="panel__nota">Se escribe solo, a partir de lo que armaste</span>
      </div>

      <div className="panel__cuerpo">
        <p className="mapa__resumen">{mapa.resumen}</p>

        <ul className="mapa__lista">
          {mapa.lineas.map((linea) => (
            <li className="mapa__linea" key={linea.id}>
              <span className="punto-color" style={{ background: linea.color }} />
              <div className="mapa__texto">
                <strong>{linea.nombre}</strong>
                <span className="mapa__regla">{linea.regla}</span>
                {linea.detalles.length > 0 && (
                  <span className="mapa__detalles">{linea.detalles.join(' · ')}</span>
                )}
              </div>
              <span className={`insignia ${linea.varia ? 'insignia--varia' : ''}`}>
                {linea.varia ? 'varía con la semilla' : 'fija'}
              </span>
            </li>
          ))}
        </ul>

        <footer className="mapa__pie">
          Semilla <strong>{mapa.semilla}</strong> · {mapa.cantidadPasos} pasos · {mapa.bpm} BPM
        </footer>
      </div>
    </section>
  );
}
