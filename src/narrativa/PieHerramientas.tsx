/**
 * Los botones de herramientas al pie de las capas, abajo a la derecha:
 * Sonidos (con qué suena cada pista) y Datos (qué se mueve solo).
 * Son grandes y de color a propósito: son lo que más se busca.
 */
interface Props {
  alSonidos: () => void;
  /** Texto del botón de sonidos. */
  textoSonidos?: string;
  /** Si viene, aparece el botón de Datos. */
  alDatos?: () => void;
  datosActivos?: number;
}

export function PieHerramientas({ alSonidos, textoSonidos = 'Sonidos', alDatos, datosActivos = 0 }: Props) {
  return (
    <div className="nv-pie-herr">
      {alDatos && (
        <button type="button" className="nv-pie-herr__boton nv-pie-herr__boton--datos" data-tour="datos" onClick={alDatos}>
          <span className="nv-pie-herr__icono">↯</span>
          <span className="nv-pie-herr__texto">
            <strong>Datos</strong>
            <span>{datosActivos === 0 ? 'nada se mueve solo' : `${datosActivos} se mueven solos`}</span>
          </span>
        </button>
      )}
      <button type="button" className="nv-pie-herr__boton nv-pie-herr__boton--sonidos" data-tour="sonidos" onClick={alSonidos}>
        <span className="nv-pie-herr__icono">♪</span>
        <span className="nv-pie-herr__texto">
          <strong>{textoSonidos}</strong>
          <span>biblioteca y tus efectos</span>
        </span>
      </button>
    </div>
  );
}
