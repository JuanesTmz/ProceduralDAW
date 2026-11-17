// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El visor de los tutoriales animados. Se abre desde el menú de ayuda o
 * desde un botón «▶ Video» puesto justo en la parte que explica.
 * Con `id` va directo a ese video; sin él, a la galería con todos.
 * El catálogo se carga solo cuando se abre, para no pesar al arrancar.
 */
import { Component, lazy, Suspense, useState } from 'react';
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

/**
 * «▶ Video»: abre el video corto de esta parte, ahí mismo. Va en las zonas
 * que más cuesta entender a la primera (datos, el Pad, reacciones…).
 */
export function BotonVideo({ id, texto = 'Ver tutorial' }: { id: string; texto?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className="nv-video" onClick={() => setAbierto(true)} title="Un tutorial corto que lo explica">
        <span className="nv-video__icono" aria-hidden="true">▶</span>
        {texto}
      </button>
      {abierto && <VisorTutorial id={id} alCerrar={() => setAbierto(false)} />}
    </>
  );
}
