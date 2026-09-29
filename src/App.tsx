import { ProveedorProyecto } from './estado/ProyectoContext';
import { AppShell } from './componentes/AppShell';

export default function App() {
  return (
    <ProveedorProyecto>
      <AppShell />
    </ProveedorProyecto>
  );
}
