/**
 * Pantalla 0: ¿de qué Urban Lab eres?
 *
 * Elegir track cambia dos cosas: por dónde arranca la guía y en qué idioma
 * habla. No cambia el acceso — las dos rutas pueden usar todo, siempre.
 * Es reversible desde la cabecera.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { NOMBRE_TRACK, type Track } from '../guia/pasos';

const OPCIONES: {
  id: Track;
  icono: string;
  entrada: string;
  prioriza: string;
  idioma: string;
}[] = [
  {
    id: 'ia',
    icono: '⚙️',
    entrada: 'Entras por el sistema: la grilla, las reglas y la semilla.',
    prioriza: 'El motor generativo aparece apenas armas el patrón.',
    idioma: 'La guía te habla de reglas, patrones y de entrenar tu máquina.',
  },
  {
    id: 'musica',
    icono: '🎧',
    entrada: 'Entras por el sonido: el beat, el sampleo y la voz.',
    prioriza: 'Primero que suene bien; después le enseñas a variar sola.',
    idioma: 'La guía te habla de beat, groove, flow y sampleo.',
  },
];

export function PantallaTrack() {
  const { actualizar } = useProyecto();

  const elegir = (track: Track) => {
    actualizar((p) => {
      p.track = track;
    });
  };

  return (
    <div className="pantalla0">
      <div className="pantalla0__caja">
        <span className="marca__logo pantalla0__logo">SONORA</span>
        <h1 className="pantalla0__titulo">¿De qué Urban Lab eres?</h1>
        <p className="pantalla0__bajada">
          Sirve para saber por dónde empezar y cómo explicarte las cosas. Lo puedes cambiar cuando
          quieras, y <strong>las dos rutas pueden usar todas las herramientas</strong>.
        </p>

        <div className="pantalla0__opciones">
          {OPCIONES.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className="track"
              onClick={() => elegir(opcion.id)}
            >
              <span className="track__icono" aria-hidden="true">
                {opcion.icono}
              </span>
              <strong className="track__nombre">{NOMBRE_TRACK[opcion.id]}</strong>
              <span className="track__linea">{opcion.entrada}</span>
              <span className="track__linea track__linea--tenue">{opcion.prioriza}</span>
              <span className="track__linea track__linea--tenue">{opcion.idioma}</span>
            </button>
          ))}
        </div>

        <p className="pantalla0__pie">
          Sea cual sea tu lab, la pieza lleva lo mismo: una historia de Medellín, un monólogo
          narrado, música que se genera por reglas y varía, estructura y un visual.
        </p>
      </div>
    </div>
  );
}
