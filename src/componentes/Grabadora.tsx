/**
 * Grabar, escuchar y volver a grabar la narración.
 * Botones grandes y un solo camino: no hay forma de perderse.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { useGrabadora } from '../hooks/useGrabadora';

function formatear(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Grabadora() {
  const { proyecto, actualizar } = useProyecto();
  const { narracion } = proyecto;

  const { estado, segundos, error, empezar, parar } = useGrabadora((grabacion) => {
    actualizar((p) => {
      if (p.narracion.audioUrl) URL.revokeObjectURL(p.narracion.audioUrl);
      p.narracion.audioUrl = grabacion.url;
      p.narracion.duracion = grabacion.duracion;
      p.narracion.origen = 'grabado';
    });
  });

  const grabando = estado === 'grabando';
  const tiene = Boolean(narracion.audioUrl);

  const borrar = () => {
    actualizar((p) => {
      if (p.narracion.audioUrl) URL.revokeObjectURL(p.narracion.audioUrl);
      p.narracion.audioUrl = undefined;
      p.narracion.duracion = 0;
      p.narracion.origen = 'ninguno';
    });
  };

  return (
    <div className="grabadora">
      <button
        type="button"
        className={`boton ${grabando ? 'boton--grabando' : 'boton--primario'} grabadora__boton`}
        onClick={() => (grabando ? parar() : void empezar())}
        disabled={estado === 'pidiendo'}
      >
        {grabando ? '⏹ Parar' : estado === 'pidiendo' ? 'Pidiendo micrófono…' : '⏺ Grabar'}
      </button>

      {grabando && (
        <span className="grabadora__tiempo" aria-live="polite">
          <span className="grabadora__punto" />
          {formatear(segundos)}
        </span>
      )}

      {tiene && !grabando && (
        <>
          <audio className="grabadora__audio" src={narracion.audioUrl} controls preload="metadata" />
          <span className="grabadora__dato">
            {narracion.origen === 'subido' ? 'Audio subido' : 'Grabado'}
            {narracion.duracion > 0 ? ` · ${formatear(narracion.duracion)}` : ''}
          </span>
          <button type="button" className="boton boton--peligro" onClick={borrar}>
            Borrar y volver a grabar
          </button>
        </>
      )}

      {!tiene && !grabando && (
        <span className="grabadora__dato">
          Todavía no hay narración. Puedes grabar aquí o narrar con el celular y subir el archivo.
        </span>
      )}

      {error && <p className="grabadora__error">{error}</p>}
    </div>
  );
}
