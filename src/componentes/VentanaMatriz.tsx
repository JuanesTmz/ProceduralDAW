/**
 * La ventana de la Matriz: la melodía a la izquierda, la escala a la derecha.
 *
 * La matriz vieja tenía ancho de celda fijo en píxeles, así que con 32 o 64
 * pasos se salía de la pantalla y tocaba desplazarla. Aquí la rejilla es una
 * rejilla de verdad: ocupa la caja que tiene y las casillas se reparten lo
 * que haya. Entra entera, siempre, sin desplazar nada.
 *
 * Lo musical no cambia: cada fila es un grado de la escala, así que
 * cualquier cosa que el estudiante dibuje suena afinada.
 */
import { useEffect, useRef } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { SelectorInstrumento } from '../narrativa/SelectorInstrumento';
import { useCabezaLectora } from '../hooks/useCabezaLectora';
import { usePintarArrastrando } from '../hooks/usePintarArrastrando';
import { FILAS_MATRIZ } from '../estado/tipos';
import {
  ETIQUETAS_ESCALA,
  gradosPorOctava,
  nombreNota,
  notasDeEscala,
  type NombreEscala,
} from '../generativo/escalas';
import { Ventana } from './Ventana';
import { BotonTutorial } from '../narrativa/BotonTutorial';

const ESCALAS: NombreEscala[] = ['menorPentatonica', 'menor', 'dorica', 'frigia', 'mayor'];

/**
 * En qué nota se considera grabado el sonido propio. Se nombra por el oído
 * porque nadie sabe en qué nota quedó un «ey» grabado con una tablet.
 */

const COLOR_MATRIZ = '#5fd4ff';

export function VentanaMatriz({ alCerrar }: { alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { melodia, cantidadPasos } = proyecto.patron;
  const celdas = useRef(new Map<string, HTMLButtonElement>());
  const pintando = useRef<boolean | null>(null);
  const cabeza = useRef<HTMLDivElement>(null);

  useCabezaLectora(cabeza, cantidadPasos);

  // Las notas vivas se leen desde el reloj de audio sin re-dibujar React.
  const notasVivas = useRef(melodia.notas);
  notasVivas.current = melodia.notas;

  // Al pasar la cabeza lectora, las casillas encendidas de esa columna laten.
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
  // De agudo a grave, como en un pentagrama.
  const filas = Array.from({ length: FILAS_MATRIZ }, (_, i) => FILAS_MATRIZ - 1 - i);
  const encendidas = new Set(melodia.notas.map((n) => `${n.grado}:${n.paso}`));

  const escribir = (grado: number, paso: number, encender: boolean) => {
    actualizar((p) => {
      const m = p.patron.melodia;
      const existe = m.notas.some((n) => n.grado === grado && n.paso === paso);
      if (encender && !existe) m.notas.push({ grado, paso });
      else if (!encender && existe) {
        m.notas = m.notas.filter((n) => !(n.grado === grado && n.paso === paso));
      }
    });
  };

  const empezarAPintar = (grado: number, paso: number) => {
    const encender = !encendidas.has(`${grado}:${paso}`);
    pintando.current = encender;
    escribir(grado, paso, encender);
    if (encender) void motorAudio.escucharNota(grado, melodia.escala, melodia.octavaBase);
  };

  const pintar = usePintarArrastrando((clave) => {
    if (pintando.current === null) return;
    const [grado, paso] = clave.split(':').map(Number);
    if (pintando.current === encendidas.has(clave)) return;
    escribir(grado, paso, pintando.current);
    if (pintando.current) void motorAudio.escucharNota(grado, melodia.escala, melodia.octavaBase);
  });

  const soltar = () => {
    pintando.current = null;
    pintar.alSoltar();
  };

  const oir = () => {
    actualizar((p) => {
      p.patron.melodia.soloActivo = true;
      for (const f of p.patron.filas) f.soloActivo = false;
      p.modoReproduccion = 'patron';
    });
    motorAudio.cambiarModo('patron');
    void motorAudio.reproducir();
  };

  const cerrar = () => {
    actualizar((p) => {
      p.patron.melodia.soloActivo = false;
    });
    alCerrar();
  };

  return (
    <Ventana
      titulo="Matriz"
      guia="ventana-matriz"
      nota={`${melodia.notas.length} ${melodia.notas.length === 1 ? 'nota' : 'notas'} · todo lo que pongas suena en escala`}
      color={COLOR_MATRIZ}
      ancha
      alta
      alCerrar={cerrar}
      pie={
        <>
          <BotonTutorial id="matriz" chico />
          <BotonTutorial id="instrumento" texto="Tu sonido como instrumento" chico />
          <button type="button" className="boton" onClick={oir}>
            ▶ Oír la melodía
          </button>
          <span className="pie__hueco" />
          <button
            type="button"
            className="boton boton--peligro"
            disabled={melodia.notas.length === 0}
            onClick={() =>
              actualizar((p) => {
                p.patron.melodia.notas = [];
              })
            }
          >
            Borrar las notas
          </button>
        </>
      }
    >
      <div className="matriz-ventana" onPointerUp={soltar} onPointerCancel={soltar}>
        {/* ---------------- la rejilla, que se lleva el sitio ---------------- */}
        <div className="matriz-rejilla">
          <div className="matriz-rejilla__notas">
            {filas.map((grado) => (
              <span
                key={grado}
                className={`matriz-rejilla__nota ${
                  grado % porOctava === 0 ? 'matriz-rejilla__nota--fuerte' : ''
                }`}
              >
                {nombreNota(semitonos[grado], melodia.octavaBase)}
              </span>
            ))}
          </div>

          <div
            className="matriz-rejilla__celdas"
            style={{
              gridTemplateColumns: `repeat(${cantidadPasos}, 1fr)`,
              gridTemplateRows: `repeat(${FILAS_MATRIZ}, 1fr)`,
            }}
          >
            <div ref={cabeza} className="cabeza-rejilla" style={{ opacity: 0 }} aria-hidden="true" />
            {filas.map((grado) =>
              Array.from({ length: cantidadPasos }, (_, paso) => {
                const activa = encendidas.has(`${grado}:${paso}`);
                return (
                  <button
                    key={`${grado}:${paso}`}
                    type="button"
                    ref={(el) => {
                      const clave = `${grado}:${paso}`;
                      if (el) celdas.current.set(clave, el);
                      else celdas.current.delete(clave);
                    }}
                    className={`celda celda--matriz ${activa ? 'celda--encendida' : ''} ${
                      paso % 4 === 0 ? 'celda--fuerte' : ''
                    }`}
                    aria-label={`${nombreNota(semitonos[grado], melodia.octavaBase)}, paso ${paso + 1}`}
                    aria-pressed={activa}
                    data-pintar={`${grado}:${paso}`}
                    onPointerDown={(e) => {
                      empezarAPintar(grado, paso);
                      pintar.alBajar(e, `${grado}:${paso}`);
                    }}
                    onPointerMove={pintar.alMover}
                  />
                );
              }),
            )}
          </div>
        </div>

        {/* ---------------- la escala y el timbre, al lado ---------------- */}
        <aside className="pistas">
          <h3 className="pistas__titulo">Escala</h3>
          <div className="pistas__lista">
            {ESCALAS.map((escala) => (
              <button
                key={escala}
                type="button"
                className={`pista ${melodia.escala === escala ? 'pista--actual' : ''}`}
                style={{ color: COLOR_MATRIZ }}
                aria-pressed={melodia.escala === escala}
                onClick={() =>
                  actualizar((p) => {
                    p.patron.melodia.escala = escala;
                  })
                }
              >
                <span className="pista__textos">
                  <span className="pista__nombre">{ETIQUETAS_ESCALA[escala]}</span>
                </span>
              </button>
            ))}
          </div>

          <h3 className="pistas__titulo">Con qué suena</h3>
          <SelectorInstrumento />

          <label className="corrida">
            <span>Volumen</span>
            <input
              type="range"
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
          </label>
        </aside>
      </div>
    </Ventana>
  );
}
