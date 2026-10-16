/**
 * El botón «▶ Ver cómo funciona»: abre un tutorial animado.
 * Sin `id`, abre la galería con todos.
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

interface Props {
  id?: string;
  texto?: string;
  /** Más chico, para cabeceras y pies de ventana. */
  chico?: boolean;
}

export function BotonTutorial({ id, texto = 'Ver cómo funciona', chico }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`nv-tutorial-boton ${chico ? 'nv-tutorial-boton--chico' : ''}`}
        onClick={() => setAbierto(true)}
        title="Ver un tutorial animado"
      >
        <span className="nv-tutorial-boton__icono">▶</span>
        {texto}
      </button>
      {abierto && (
        <Atajo alFallar={() => setAbierto(false)}>
          <Suspense fallback={null}>
            <VentanaTutoriales id={id} alCerrar={() => setAbierto(false)} />
          </Suspense>
        </Atajo>
      )}
    </>
  );
}
