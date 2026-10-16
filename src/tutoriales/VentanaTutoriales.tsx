/**
 * La ventana de los tutoriales: la galería con todos, o uno abierto en el
 * reproductor. Se carga aparte (React.lazy) para que la app no pese más
 * hasta que alguien abre un tutorial.
 */
import { useState } from 'react';
import { Ventana } from '../componentes/Ventana';
import { FPS, Reproductor } from './motor';
import { TUTORIALES, tutorial } from './catalogo';

interface Props {
  /** El tutorial con que abre; sin él, abre la galería. */
  id?: string;
  alCerrar: () => void;
}

export default function VentanaTutoriales({ id, alCerrar }: Props) {
  const [abierto, setAbierto] = useState<string | undefined>(id);
  const comp = abierto ? tutorial(abierto) : undefined;

  return (
    <Ventana
      titulo={comp ? comp.titulo : 'Tutoriales'}
      nota={comp ? comp.descripcion : 'Animaciones cortas que explican cómo funciona cada parte'}
      ancha
      alCerrar={alCerrar}
      pie={
        comp && !id ? (
          <button type="button" className="boton" onClick={() => setAbierto(undefined)}>
            ← Todos los tutoriales
          </button>
        ) : undefined
      }
    >
      <div className="nv nv--incrustado tu-ventana">
        {comp ? (
          <Reproductor key={comp.id} comp={comp} />
        ) : (
          <div className="tu-galeria">
            {TUTORIALES.map((t) => (
              <button key={t.id} type="button" className="tu-ficha" onClick={() => setAbierto(t.id)}>
                <span className="tu-ficha__play">▶</span>
                <strong>{t.titulo}</strong>
                <span className="nv-tenue nv-chico">{t.descripcion}</span>
                <span className="nv-mono nv-chico nv-tenue">{Math.round(t.duracion / FPS)} s</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Ventana>
  );
}
