/**
 * Secuenciador de patrón: filas = sonidos, columnas = pasos.
 * El modelo de interacción es el clásico de las cajas de ritmos
 * (una celda = un golpe); la implementación es propia.
 */
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { colorPorIndice, crearFila, NOMBRES_SONIDO, redimensionarPatron } from '../estado/proyecto';
import type { TipoSonido } from '../estado/tipos';
import { useCabezaLectora } from '../hooks/useCabezaLectora';
import type { Track } from '../guia/pasos';
import { MatrizTonal } from './MatrizTonal';
import { PanelEfectos } from './PanelEfectos';

const OPCIONES_PASOS: (16 | 32 | 64)[] = [16, 32, 64];

/** Ancho de celda según cuántos pasos haya: con 64 pasos las celdas se achican. */
export const ANCHO_CELDA: Record<number, number> = { 16: 42, 32: 28, 64: 19 };

/** Ancho de la columna de nombres, igual que en el CSS. */
const ANCHO_ENCABEZADO = 270;

const SONIDOS_DISPONIBLES: TipoSonido[] = ['bombo', 'redoblante', 'hihat', 'palma', 'tom', 'aro'];

export function Secuenciador() {
  const { proyecto, actualizar } = useProyecto();
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const cabeza = useRef<HTMLDivElement>(null);
  const [pintando, setPintando] = useState<boolean | null>(null);
  const [modoEdicion, setModoEdicion] = useState<'golpes' | 'probabilidad'>('golpes');

  const { patron } = proyecto;
  const anchoCelda = ANCHO_CELDA[patron.cantidadPasos] ?? 28;
  useCabezaLectora(cabeza, anchoCelda);

  const columnas = `repeat(${patron.cantidadPasos}, var(--ancho-celda))`;

  const alternarPaso = (idFila: string, paso: number, forzar?: boolean) => {
    actualizar((p) => {
      const fila = p.patron.filas.find((f) => f.id === idFila);
      if (!fila) return;
      fila.pasos[paso] = forzar ?? !fila.pasos[paso];
    });
  };

  /** En modo probabilidad, cada clic baja un escalón: 100 → 75 → 50 → 25 → 100. */
  const ciclarProbabilidad = (idFila: string, paso: number) => {
    actualizar((p) => {
      const fila = p.patron.filas.find((f) => f.id === idFila);
      if (!fila) return;
      if (!fila.pasos[paso]) {
        fila.pasos[paso] = true;
        fila.probabilidad[paso] = 1;
        return;
      }
      const actual = fila.probabilidad[paso] ?? 1;
      const siguiente = Number((actual - 0.25).toFixed(2));
      if (siguiente <= 0) {
        fila.pasos[paso] = false;
        fila.probabilidad[paso] = 1;
      } else {
        fila.probabilidad[paso] = siguiente;
      }
    });
    void motorAudio.escucharFila(idFila);
  };

  const iniciarPintado = (idFila: string, paso: number) => {
    const fila = patron.filas.find((f) => f.id === idFila);
    if (!fila) return;
    const nuevo = !fila.pasos[paso];
    setPintando(nuevo);
    alternarPaso(idFila, paso, nuevo);
    if (nuevo) void motorAudio.escucharFila(idFila);
  };

  // Arrastrar por la grilla pinta varias celdas seguidas, como en un DAW.
  const continuarPintado = (idFila: string, paso: number) => {
    if (pintando === null) return;
    alternarPaso(idFila, paso, pintando);
  };

  const cambiarPasos = (cantidad: 16 | 32 | 64) => {
    actualizar((p) => {
      p.patron = redimensionarPatron(p.patron, cantidad);
    });
  };

  const agregarFila = (tipo: TipoSonido) => {
    actualizar((p) => {
      const fila = crearFila(tipo, p.patron.cantidadPasos, {
        color: colorPorIndice(p.patron.filas.length),
      });
      p.patron.filas.push(fila);
      // La fila nueva entra en todas las secciones para que se oiga desde ya.
      for (const seccion of p.secciones) seccion.capasActivas.push(fila.id);
    });
  };

  const quitarFila = (idFila: string) => {
    actualizar((p) => {
      p.patron.filas = p.patron.filas.filter((f) => f.id !== idFila);
      for (const seccion of p.secciones) {
        seccion.capasActivas = seccion.capasActivas.filter((id) => id !== idFila);
      }
    });
  };

  const subirSample = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const nombre = archivo.name.replace(/\.[^.]+$/, '').slice(0, 16);
    actualizar((p) => {
      const fila = crearFila('sample', p.patron.cantidadPasos, {
        nombre: nombre || 'Mi sample',
        color: colorPorIndice(p.patron.filas.length),
        sampleUrl: url,
      });
      p.patron.filas.push(fila);
      for (const seccion of p.secciones) seccion.capasActivas.push(fila.id);
    });
    evento.target.value = '';
  };

  const limpiar = () => {
    actualizar((p) => {
      for (const fila of p.patron.filas) fila.pasos = fila.pasos.map(() => false);
      p.patron.melodia.notas = [];
    });
  };

  return (
    <section
      className="panel"
      onPointerUp={() => setPintando(null)}
      onPointerLeave={() => setPintando(null)}
    >
      <div className="panel__cabecera">
        <h2 className="panel__titulo">El patrón</h2>
        <span className="panel__nota">Filas = sonidos · Columnas = pasos</span>

        <div className="panel__acciones">
          <div className="campo campo--horizontal">
            <span className="campo__etiqueta">Pasos</span>
            <div className="grupo-segmentado">
              {OPCIONES_PASOS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={patron.cantidadPasos === n}
                  onClick={() => cambiarPasos(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="campo campo--horizontal">
            <span className="campo__etiqueta">Editar</span>
            <div className="grupo-segmentado">
              <button
                type="button"
                aria-pressed={modoEdicion === 'golpes'}
                onClick={() => setModoEdicion('golpes')}
                title="Encender y apagar golpes"
              >
                Golpes
              </button>
              <button
                type="button"
                aria-pressed={modoEdicion === 'probabilidad'}
                onClick={() => setModoEdicion('probabilidad')}
                title="Cada clic baja la probabilidad de que ese golpe suene"
              >
                Probabilidad
              </button>
            </div>
          </div>

          <button type="button" className="boton" onClick={() => entradaArchivo.current?.click()}>
            ⬆ Subir sample
          </button>
          <input
            ref={entradaArchivo}
            type="file"
            accept="audio/*,.wav,.mp3,.ogg,.m4a"
            onChange={subirSample}
            hidden
          />

          <button type="button" className="boton boton--peligro" onClick={limpiar}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="panel__cuerpo">
        {/* Lo que se resalta cambia con el Urban Lab; el acceso no. */}
        <p className="destacado">
          {(proyecto.track as Track) === 'musica'
            ? '🎧 Empieza por el groove: mueve el bombo y el hi-hat hasta que camine. Con ⬆ Subir sample metes un sonido tuyo como una fila más.'
            : '⚙️ Cada celda que enciendes es un dato de entrada. Deja el patrón armado y en el paso siguiente le pones las reglas que lo transformen.'}
        </p>

        <div className="grilla" style={{ ['--ancho-celda' as string]: `${anchoCelda}px` }}>
          <div className="grilla__interior">
            {/* La cabeza lectora es una sola capa que se desplaza: no re-dibuja la grilla. */}
            <div
              ref={cabeza}
              className="cabeza-lectora"
              style={{ left: `${ANCHO_ENCABEZADO}px`, opacity: 0 }}
              aria-hidden="true"
            />

            <div className="grilla__fila grilla__fila--regla">
              <div className="grilla__encabezado grilla__encabezado--regla">Paso</div>
              <div className="grilla__pasos" style={{ gridTemplateColumns: columnas }}>
                {Array.from({ length: patron.cantidadPasos }, (_, i) => (
                  <div
                    key={i}
                    className={`regla__paso ${i % 4 === 0 ? 'regla__paso--fuerte' : ''}`}
                  >
                    {i % 4 === 0 ? i + 1 : ''}
                  </div>
                ))}
              </div>
            </div>

            {patron.filas.map((fila, indice) => (
              <div className="grilla__fila" key={fila.id}>
                <div className="grilla__encabezado">
                  <span className="punto-color" style={{ background: fila.color }} />
                  <button
                    type="button"
                    className="grilla__nombre"
                    onClick={() => void motorAudio.escucharFila(fila.id)}
                    title="Escuchar este sonido"
                  >
                    {fila.nombre}
                  </button>

                  <div className="grilla__controles">
                    <button
                      type="button"
                      className={`mini ${fila.silenciada ? 'mini--activo' : ''}`}
                      title="Silenciar"
                      aria-pressed={fila.silenciada}
                      onClick={() =>
                        actualizar((p) => {
                          const f = p.patron.filas[indice];
                          f.silenciada = !f.silenciada;
                        })
                      }
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`mini ${fila.soloActivo ? 'mini--solo' : ''}`}
                      title="Solo"
                      aria-pressed={fila.soloActivo}
                      onClick={() =>
                        actualizar((p) => {
                          const f = p.patron.filas[indice];
                          f.soloActivo = !f.soloActivo;
                        })
                      }
                    >
                      S
                    </button>
                    <input
                      type="range"
                      className="mini-volumen"
                      min={0}
                      max={1}
                      step={0.01}
                      value={fila.volumen}
                      aria-label={`Volumen de ${fila.nombre}`}
                      onChange={(e) =>
                        actualizar((p) => {
                          p.patron.filas[indice].volumen = Number(e.target.value);
                        })
                      }
                    />
                    {patron.filas.length > 1 && (
                      <button
                        type="button"
                        className="mini mini--quitar"
                        title={`Quitar ${fila.nombre}`}
                        onClick={() => quitarFila(fila.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="grilla__pasos" style={{ gridTemplateColumns: columnas }}>
                  {fila.pasos.map((activo, i) => {
                    const prob = fila.probabilidad[i] ?? 1;
                    const dudoso = activo && prob < 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`celda ${activo ? 'celda--activa' : ''} ${
                          i % 4 === 0 ? 'celda--fuerte' : ''
                        } ${dudoso ? 'celda--probable' : ''}`}
                        style={
                          activo
                            ? { background: fila.color, opacity: 0.35 + 0.65 * prob }
                            : undefined
                        }
                        aria-label={`${fila.nombre}, paso ${i + 1}${
                          dudoso ? `, suena ${Math.round(prob * 100)}% de las veces` : ''
                        }`}
                        aria-pressed={activo}
                        onPointerDown={() =>
                          modoEdicion === 'probabilidad'
                            ? ciclarProbabilidad(fila.id, i)
                            : iniciarPintado(fila.id, i)
                        }
                        onPointerEnter={() =>
                          modoEdicion === 'golpes' ? continuarPintado(fila.id, i) : undefined
                        }
                      >
                        {dudoso && anchoCelda >= 28 ? (
                          <span className="celda__probabilidad">{Math.round(prob * 100)}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="agregar-sonido">
          <span className="campo__etiqueta">Agregar sonido</span>
          {SONIDOS_DISPONIBLES.map((tipo) => (
            <button key={tipo} type="button" className="chip" onClick={() => agregarFila(tipo)}>
              + {NOMBRES_SONIDO[tipo]}
            </button>
          ))}
        </div>

        <MatrizTonal anchoCelda={anchoCelda} anchoEncabezado={ANCHO_ENCABEZADO} />
        <PanelEfectos />
      </div>
    </section>
  );
}
