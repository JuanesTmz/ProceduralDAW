import { ProveedorProyecto } from './estado/ProyectoContext';
import { AppNarrativa } from './narrativa/AppNarrativa';

export default function App() {
  return (
    <ProveedorProyecto>
      <AppNarrativa />
      {/* Solo se ve con la tablet en vertical (ver narrativa.css). */}
      <div className="nv-girar" role="alert">
        <span>⟳</span>
        SONORA solo se usa en horizontal
        <small>Gira la tablet para acostarla (y revisa que el giro automático esté activado).</small>
      </div>
    </ProveedorProyecto>
  );
}
