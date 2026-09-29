/**
 * La matriz tonal: grilla cuadrada donde las filas son notas de la escala
 * y las columnas son pasos, igual que en el secuenciador de arriba.
 *
 * Sigue el modelo de interacción de ToneMatrix —celdas que se encienden,
 * acordes por columna, latido al pasar la cabeza lectora— con implementación
 * propia. La clave musical: las filas ya son grados de la escala, así que
 * cualquier combinación de celdas suena afinada.
 */
import { useEffect, useRef } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import { FILAS_MATRIZ } from '../estado/tipos';
import {
  ETIQUETAS_ESCALA,
  gradosPorOctava,
  nombreNota,
  notasDeEscala,
  type NombreEscala,
} from '../generativo/escalas';
import { useCabezaLectora } from '../hooks/useCabezaLectora';

interface Props {
  anchoCelda: number;
  anchoEncabezado: number;
}

const ESCALAS_OFRECIDAS: NombreEscala[] = [
  'menorPentatonica',
  'menor',
  'dorica',
  'frigia',
  'mayor',
];

export function MatrizTonal({ anchoCelda, anchoEncabezado }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const cabeza = useRef<HTMLDivElement>(null);
  const celdas = useRef(new Map<string, HTMLButtonElement>());
  const pintando = useRef<boolean | null>(null);
  const { melodia, cantidadPasos } = proyecto.patron;

  useCabezaLectora(cabeza, anchoCelda);

  // Las notas vivas, leídas desde el reloj de audio sin re-renderizar nada.
  const notasVivas = useRef(melodia.notas);
  notasVivas.current = melodia.notas;

  // Latido: al pasar la cabeza, las celdas encendidas de esa columna destellan.
  useEffect(
    () =>
      motorAudio.alCambiarPaso((paso) => {
        if (paso < 0) return;
        for (const nota of notasVivas.current) {
          if (nota.paso !== paso) continue;
          const elemento = celdas.current.get(`${nota.grado}:${paso}`);
          if (!elemento) continue;
          elemento.classList.remove('celda--latido');
          void elemento.offsetWidth; // reinicia la animación
          elemento.classList.add('celda--latido');
        }
      }),
    [],
  );

  const semitonos = notasDeEscala(melodia.escala, FILAS_MATRIZ);
  const porOctava = gradosPorOctava(melodia.escala);
  // De agudo a grave: la nota más alta arriba, como en un pentagrama.
  const filas = Array.from({ length: FILAS_MATRIZ }, (_, i) => FILAS_MATRIZ - 1 - i);
  const encendidas = new Set(melodia.notas.map((n) => `${n.grado}:${n.paso}`));

  const escribir = (grado: number, paso: number, encender: boolean) => {
    actualizar((p) => {
      const m = p.patron.melodia;
      const existe = m.notas.some((n) => n.grado === grado && n.paso === paso);
      if (encender && !existe) {
        // Varias notas por columna forman un acorde: no se borra lo que ya hay.
        m.notas.push({ grado, paso });
      } else if (!encender && existe) {
        m.notas = m.notas.filter((n) => !(n.grado === grado && n.paso === paso));
      }
    });
  };

  const iniciarPintado = (grado: number, paso: number) => {
    const encender = !encendidas.has(`${grado}:${paso}`);
    pintando.current = encender;
    escribir(grado, paso, encender);
    if (encender) void motorAudio.escucharNota(grado, melodia.escala, melodia.octavaBase);
  };

  const continuarPintado = (grado: number, paso: number) => {
    if (pintando.current === null) return;
    const yaEsta = encendidas.has(`${grado}:${paso}`);
    if (pintando.current === yaEsta) return;
    escribir(grado, paso, pintando.current);
    if (pintando.current) void motorAudio.escucharNota(grado, melodia.escala, melodia.octavaBase);
  };

  return (
    <div className="matriz" onPointerUp={() => (pintando.current = null)}>
      <div className="matriz__cabecera">
        <button
          type="button"
          className="piano__plegar"
          aria-expanded={melodia.visible}
          onClick={() =>
            actualizar((p) => {
              p.patron.melodia.visible = !p.patron.melodia.visible;
            })
          }
        >
          {melodia.visible ? '▾' : '▸'} La matriz
        </button>
        <span className="panel__nota">Filas = notas · Una columna con varias celdas = acorde</span>

        {melodia.visible && (
          <div className="matriz__controles">
            <label className="campo campo--horizontal">
              <span className="campo__etiqueta">Escala</span>
              <select
                value={melodia.escala}
                onChange={(e) =>
                  actualizar((p) => {
                    p.patron.melodia.escala = e.target.value as NombreEscala;
                  })
                }
              >
                {ESCALAS_OFRECIDAS.map((escala) => (
                  <option key={escala} value={escala}>
                    {ETIQUETAS_ESCALA[escala]}
                  </option>
                ))}
              </select>
            </label>

            <div className="grilla__controles">
              <button
                type="button"
                className={`mini ${melodia.silenciada ? 'mini--activo' : ''}`}
                title="Silenciar"
                aria-pressed={melodia.silenciada}
                onClick={() =>
                  actualizar((p) => {
                    p.patron.melodia.silenciada = !p.patron.melodia.silenciada;
                  })
                }
              >
                M
              </button>
              <input
                type="range"
                className="mini-volumen"
                min={0}
                max={1}
                step={0.01}
                value={melodia.volumen}
                aria-label="Volumen de la matriz"
                onChange={(e) =>
                  actualizar((p) => {
                    p.patron.melodia.volumen = Number(e.target.value);
                  })
                }
              />
              <button
                type="button"
                className="mini mini--quitar"
                title="Borrar todas las notas"
                onClick={() =>
                  actualizar((p) => {
                    p.patron.melodia.notas = [];
                  })
                }
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {melodia.visible && (
        <div
          className="grilla"
          style={{
            ['--ancho-celda' as string]: `${anchoCelda}px`,
            ['--alto-celda' as string]: `${anchoCelda}px`,
          }}
        >
          <div className="grilla__interior">
            <div
              ref={cabeza}
              className="cabeza-lectora"
              style={{ left: `${anchoEncabezado}px`, opacity: 0 }}
              aria-hidden="true"
            />
            {filas.map((grado) => {
              // La tónica de cada octava se marca: es la referencia del oído.
              const esTonica = grado % porOctava === 0;
              return (
                <div className="grilla__fila grilla__fila--matriz" key={grado}>
                  <div className="matriz__etiqueta">
                    <span className={`matriz__nota ${esTonica ? 'matriz__nota--fuerte' : ''}`}>
                      {nombreNota(semitonos[grado], melodia.octavaBase)}
                    </span>
                  </div>
                  <div
                    className="grilla__pasos"
                    style={{ gridTemplateColumns: `repeat(${cantidadPasos}, var(--ancho-celda))` }}
                  >
                    {Array.from({ length: cantidadPasos }, (_, paso) => {
                      const activa = encendidas.has(`${grado}:${paso}`);
                      return (
                        <button
                          key={paso}
                          type="button"
                          ref={(el) => {
                            const clave = `${grado}:${paso}`;
                            if (el) celdas.current.set(clave, el);
                            else celdas.current.delete(clave);
                          }}
                          className={`celda celda--matriz ${activa ? 'celda--encendida' : ''} ${
                            paso % 4 === 0 ? 'celda--fuerte' : ''
                          }`}
                          aria-label={`${nombreNota(semitonos[grado], melodia.octavaBase)}, paso ${
                            paso + 1
                          }`}
                          aria-pressed={activa}
                          onPointerDown={() => iniciarPintado(grado, paso)}
                          onPointerEnter={() => continuarPintado(grado, paso)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
