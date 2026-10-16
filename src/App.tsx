import { ProveedorProyecto } from './estado/ProyectoContext';
import { AppNarrativa } from './narrativa/AppNarrativa';

export default function App() {
  return (
    <ProveedorProyecto>
      <AppNarrativa />
    </ProveedorProyecto>
  );
}
