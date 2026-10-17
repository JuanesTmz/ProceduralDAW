/**
 * El visor de los tutoriales animados. Se abre desde el menú de ayuda.
 * Con `id` va directo a ese video; sin él, a la galería con todos.
 * El catálogo se carga solo cuando se abre, para no pesar al arrancar.
 */
import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

const VentanaTutoriales = lazy(() => import('../tutoriales/VentanaTutoriales'));

/** Si el tutorial falla al cargar, se cierra solo en vez de tumbar la app. */
class Atajo extends Component<{ alFallar: () => void; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch() {
    this.props.alFallar();
  }
  render() {
    return this.state.fallo ? null : this.props.children;
  }
}

export function VisorTutorial({ id, alCerrar }: { id?: string; alCerrar: () => void }) {
  return (
    <Atajo alFallar={alCerrar}>
      <Suspense fallback={null}>
        <VentanaTutoriales id={id} alCerrar={alCerrar} />
      </Suspense>
    </Atajo>
  );
}
