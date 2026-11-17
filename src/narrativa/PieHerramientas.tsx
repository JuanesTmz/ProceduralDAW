// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los botones al pie de las capas: agregar una capa nueva y abrir los
 * sonidos (la biblioteca y los efectos que graba el equipo). Son grandes y
 * de color a propósito: son lo que más se busca.
 */
import { Caras } from '../nube/Caras';

interface Props {
  alSonidos: () => void;
  /** Si viene, aparece «+ Añadir capa». */
  alAgregar?: () => void;
}

export function PieHerramientas({ alSonidos, alAgregar }: Props) {
  return (
    <div className="nv-pie-herr">
      {alAgregar && (
        <button type="button" className="nv-pie-herr__boton nv-pie-herr__boton--agregar" data-tour="nueva-pista" onClick={alAgregar}>
          <span className="nv-pie-herr__icono">+</span>
          <span className="nv-pie-herr__texto">
            <strong>Añadir capa</strong>
            <span>un sonido más</span>
          </span>
        </button>
      )}
      <button type="button" className="nv-pie-herr__boton nv-pie-herr__boton--sonidos" data-tour="sonidos" onClick={alSonidos}>
        <span className="nv-pie-herr__icono">♪</span>
        <span className="nv-pie-herr__texto">
          <strong>Sonidos</strong>
          <span>cambiar o grabar los tuyos</span>
        </span>
        <Caras en={(l) => Boolean(l.ventana?.startsWith('sonidos:'))} />
      </button>
    </div>
  );
}
