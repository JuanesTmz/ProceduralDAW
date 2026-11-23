// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
import { ProveedorProyecto } from './estado/ProyectoContext';
import { AppNarrativa } from './narrativa/AppNarrativa';
import { ObraEntregada } from './narrativa/VistaObra';
import { PuertaNube } from './nube/Puerta';

/** `?entrega=<video>`: solo la obra que mandó un equipo, tocándose, para el panel de admin. */
const ENTREGA = new URLSearchParams(location.search).get('entrega');

export default function App() {
  if (ENTREGA) return <ObraEntregada video={ENTREGA} />;
  return (
    // En la nube, antes de la app se entra con el equipo; en Pages, pasa directo.
    <PuertaNube>
      <ProveedorProyecto>
        <AppNarrativa />
        {/* Solo se ve con la tablet en vertical (ver narrativa.css). */}
        <div className="nv-girar" role="alert">
          <span>⟳</span>
          SONORA solo se usa en horizontal
          <small>Gira la tablet para acostarla (y revisa que el giro automático esté activado).</small>
        </div>
      </ProveedorProyecto>
    </PuertaNube>
  );
}
