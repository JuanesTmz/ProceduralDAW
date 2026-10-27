/**
 * Las capas vistas como celdas, al estilo de la línea de tiempo original:
 * una fila de casillas por sonido, que se encienden tocando o arrastrando
 * el dedo. Es la otra forma de ver la misma lista de capas.
 *
 * Los golpes son del patrón (valen para toda la pieza, como en la ventana
 * Golpes); lo que es de la escena es si cada capa suena o se calla aquí.
 * La melodía se muestra como una fila más: tocarla abre la matriz.
 * La cabeza lectora es una sola raya encima de todas las filas, movida
 * directo en el DOM para no redibujar las casillas en cada paso.
 */
import { useRef } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { useCabezaLectora } from '../hooks/useCabezaLectora';
import { usePintarArrastrando } from '../hooks/usePintarArrastrando';
import { golpesDe, notasDe, ponerGolpe } from '../estado/patronEscena';
import { ID_MELODIA } from './VentanaSonidosPistas';
import { BotonSolo, Suena } from './FilaSonido';

export interface CapaCeldas {
  id: string;
  nombre: string;
  origen: string;
  color: string;
}

interface Props {
  capas: CapaCeldas[];
  /** La escena cuyas celdas se ven, o null en General. */
  escenaId: string | null;
  /** Solo dentro de una escena: si cada capa suena aquí. */
  suena?: (id: string) => boolean;
  alSuena?: (id: string) => void;
  alSonidos: (id: string) => void;
  alNotas: () => void;
  /** Si una capa suena sola ahora, y cómo pedirla. */
  suenaSolo: (id: string) => boolean;
  alSolo: (id: string) => void;
}

const esMelodiaId = (id: string) => id === ID_MELODIA;

export function CeldasCapas({ capas, escenaId, suena, alSuena, alSonidos, alNotas, suenaSolo, alSolo }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { patron } = proyecto;
  const n = patron.cantidadPasos;
  const cabeza = useRef<HTMLDivElement>(null);
  const pintando = useRef<boolean | null>(null);
  useCabezaLectora(cabeza, n);

  const pasosDe = (id: string): boolean[] => {
    if (id === ID_MELODIA) {
      const notas = notasDe(proyecto, escenaId);
      return Array.from({ length: n }, (_, i) => notas.some((x) => x.paso === i));
    }
    return golpesDe(proyecto, escenaId, id).pasos;
  };

  const marcar = (id: string, paso: number, encender: boolean) =>
    actualizar((p) => ponerGolpe(p, escenaId, id, paso, encender));

  const pintar = usePintarArrastrando((clave) => {
    if (pintando.current === null) return;
    const [id, paso] = clave.split('|');
    if (id === ID_MELODIA) return;
    marcar(id, Number(paso), pintando.current);
  });

  const soltar = () => {
    pintando.current = null;
    pintar.alSoltar();
  };

  return (
    <div
      className="nv-celdas"
      style={{ gridTemplateRows: `repeat(${capas.length}, auto)` }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <div className="nv-celdas__cabeza" style={{ gridRow: `1 / ${capas.length + 1}` }} aria-hidden="true">
        <div ref={cabeza} className="cabeza-rejilla" style={{ opacity: 0 }} />
      </div>
      {capas.map((c, k) => {
        const fila = k + 1;
        const pasos = pasosDe(c.id);
        const probs = esMelodiaId(c.id) ? [] : golpesDe(proyecto, escenaId, c.id).probabilidad;
        const callada = suena ? !suena(c.id) : false;
        const esMelodia = c.id === ID_MELODIA;
        return (
          <div key={c.id} className={`nv-celdas__fila ${callada ? 'nv-celdas__fila--muda' : ''}`} style={{ ['--color' as string]: c.color }}>
            <span className="nv-celdas__nombre" style={{ gridRow: fila }}>
              <BotonSolo sonando={suenaSolo(c.id)} nombre={c.nombre} alTocar={() => alSolo(c.id)} />
              <button type="button" className="nv-celdas__sonido" onClick={() => alSonidos(c.id)} title="Cambiar el sonido">
                <span className="nv-fila-son__punto" />
                <span className="nv-fila-son__texto">
                  <strong>{c.nombre}</strong>
                  <span>{c.origen}</span>
                </span>
              </button>
            </span>
            <div
              className={`nv-celdas__pasos ${esMelodia ? 'nv-celdas__pasos--melodia' : ''}`}
              style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridRow: fila }}
              onClick={esMelodia ? alNotas : undefined}
              title={esMelodia ? 'Abrir la matriz de notas' : undefined}
            >
              {pasos.map((on, i) => (
                <button
                  key={i}
                  type="button"
                  className={`nv-celda ${on ? 'nv-celda--on' : ''} ${on && (probs[i] ?? 1) < 0.92 ? 'nv-celda--aveces' : ''} ${i % 4 === 0 ? 'nv-celda--tiempo' : ''}`}
                  aria-label={`${c.nombre}, paso ${i + 1}`}
                  aria-pressed={on}
                  data-pintar={esMelodia ? undefined : `${c.id}|${i}`}
                  tabIndex={esMelodia ? -1 : 0}
                  onPointerDown={
                    esMelodia
                      ? undefined
                      : (e) => {
                          pintando.current = !on;
                          marcar(c.id, i, !on);
                          if (!on) void motorAudio.escucharFila(c.id);
                          pintar.alBajar(e, `${c.id}|${i}`);
                        }
                  }
                  onPointerMove={esMelodia ? undefined : pintar.alMover}
                />
              ))}
            </div>
            <span className="nv-celdas__suena" style={{ gridRow: fila }}>
              {suena && alSuena && <Suena encendido={!callada} color={c.color} alCambiar={() => alSuena(c.id)} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
