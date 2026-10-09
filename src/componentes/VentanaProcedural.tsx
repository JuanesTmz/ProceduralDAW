/**
 * La ventana Procedural: un solo panel arrastrable.
 *
 * Había seis cuadros X/Y a la vez y ninguno cabía. Ahora hay uno, grande, y
 * lo que cambia es de quién es: se elige la pista a la derecha y el panel se
 * tiñe de su color. Arriba, la tira de 16 muestra cómo queda repartida esa
 * pista en los tiempos — se ve el resultado de la regla antes de oírlo.
 *
 * Dentro del cuadro: a la derecha más golpes, hacia arriba más azar. Eso es
 * toda la interfaz del motor generativo, y los tres modos de antes
 * —euclidiano, probabilístico, a mano— son sus esquinas.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { generarPasos, volverASembrar } from '../generativo/motorGenerativo';
import type { ReglaFila } from '../estado/tipos';
import { CuadroXY } from './CuadroXY';
import { ListaPistas } from './ListaPistas';
import { Ventana } from './Ventana';

const COLOR_MATRIZ = '#5fd4ff';
/** Id con el que la matriz tonal entra en la lista de pistas. */
const ID_MATRIZ = '__matriz__';

interface Tira {
  casillas: number[];
  seguros: number;
  dudosos: number;
}

/** Lo que la regla deja en los pasos, para dibujarlo antes de oírlo. */
function tiraDeRegla(
  regla: ReglaFila,
  cantidadPasos: number,
  pasos: boolean[],
  probabilidad: number[],
): Tira {
  const generado = regla.activa ? generarPasos(regla, cantidadPasos, 0, 'vista') : null;
  const activos = generado?.pasos ?? pasos;
  const probs = generado?.probabilidad ?? probabilidad;

  let seguros = 0;
  let dudosos = 0;
  const casillas = activos.map((activo, i) => {
    if (!activo) return 0;
    if ((probs[i] ?? 1) > 0.92) {
      seguros += 1;
      return 2;
    }
    dudosos += 1;
    return 1;
  });
  return { casillas, seguros, dudosos };
}

export function VentanaProcedural({ alCerrar }: { alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { patron } = proyecto;
  const [pasoActual, setPasoActual] = useState(-1);
  const [elegida, setElegida] = useState<string>(patron.filas[0]?.id ?? ID_MATRIZ);

  useEffect(() => motorAudio.alCambiarPaso(setPasoActual), []);

  const melodia = patron.melodia;

  const tocarRegla = (idFila: string, cambio: (regla: ReglaFila) => void) => {
    actualizar((p) => {
      if (idFila === ID_MATRIZ) {
        cambio(p.patron.melodia.regla);
        if (p.patron.melodia.regla.activa) volverASembrar(p, p.semilla);
        return;
      }
      const fila = p.patron.filas.find((f) => f.id === idFila);
      if (!fila) return;
      cambio(fila.regla);
      const generado = generarPasos(fila.regla, p.patron.cantidadPasos, p.semilla, fila.id);
      if (generado) {
        fila.pasos = generado.pasos;
        fila.probabilidad = generado.probabilidad;
      }
    });
  };

  const candidatas = [
    ...patron.filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      color: fila.color,
      regla: fila.regla,
      tira: tiraDeRegla(fila.regla, patron.cantidadPasos, fila.pasos, fila.probabilidad),
      esMatriz: false,
    })),
    {
      id: ID_MATRIZ,
      nombre: 'Matriz',
      color: COLOR_MATRIZ,
      regla: melodia.regla,
      tira: tiraDeRegla(
        melodia.regla,
        patron.cantidadPasos,
        Array.from({ length: patron.cantidadPasos }, (_, i) =>
          melodia.notas.some((n) => n.paso === i),
        ),
        new Array(patron.cantidadPasos).fill(1),
      ),
      esMatriz: true,
    },
  ];

  const actual = candidatas.find((c) => c.id === elegida) ?? candidatas[0];
  const hayMaquina = candidatas.some((c) => c.regla.activa);

  return (
    <Ventana
      titulo="Procedural"
      nota={
        hayMaquina
          ? 'Arrastra el punto: a la derecha más golpes, hacia arriba más azar'
          : 'Entrégale una pista a la máquina y la canción empezará a variar sola'
      }
      color={actual.color}
      ancha
      alta
      alCerrar={alCerrar}
      pie={
        !actual.esMatriz && (
          <button
            type="button"
            className="boton"
            onClick={() => void motorAudio.escucharFila(actual.id)}
          >
            ▶ Oír el sonido de {actual.nombre}
          </button>
        )
      }
    >
      <div className="procedural-ventana">
        {/* La tira de arriba: cómo queda repartida esta pista en los tiempos. */}
        <div className="tira tira--grande" style={{ color: actual.color }}>
          {actual.tira.casillas.map((estado, i) => (
            <span
              key={i}
              className="tira__casilla"
              data-estado={estado}
              data-cabeza={i === pasoActual ? 'si' : undefined}
            />
          ))}
        </div>

        <p className="tira__cuenta">
          {actual.esMatriz ? (
            <>
              <strong>{melodia.notas.length}</strong>{' '}
              {melodia.notas.length === 1 ? 'nota puesta' : 'notas puestas'}
            </>
          ) : (
            <>
              <strong>{actual.tira.seguros + actual.tira.dudosos}</strong> de{' '}
              {patron.cantidadPasos} golpes
              {actual.tira.dudosos > 0 ? (
                <>
                  {' · '}
                  <strong>{actual.tira.dudosos}</strong> suenan a veces
                </>
              ) : (
                ' · todos suenan siempre'
              )}
            </>
          )}
        </p>

        <div className="procedural-ventana__cuerpo">
          <div
            className={`procedural-ventana__cuadro ${
              actual.regla.activa ? '' : 'procedural-ventana__cuadro--cerrado'
            }`}
          >
            <CuadroXY
              x={actual.regla.golpes}
              y={actual.regla.azar}
              color={actual.color}
              activo={actual.regla.activa}
              etiqueta={`Regla de ${actual.nombre}: a la derecha más golpes, hacia arriba más azar`}
              alMover={(x, y) =>
                tocarRegla(actual.id, (r) => {
                  r.golpes = x;
                  r.azar = y;
                })
              }
            />

            <label className="corrida">
              <span>Correr</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, patron.cantidadPasos - 1)}
                step={1}
                value={actual.regla.rotacion}
                disabled={!actual.regla.activa}
                aria-label={`Correr el patrón de ${actual.nombre}`}
                onChange={(e) => tocarRegla(actual.id, (r) => (r.rotacion = Number(e.target.value)))}
              />
              <span className="corrida__valor">{actual.regla.rotacion}</span>
            </label>
          </div>

          <div className="procedural-ventana__mandos">
            {/* Este botón es la puerta: hasta que la pista no sea de la
                máquina, el cuadro no hace nada. Pasaba desapercibido en el
                pie, así que ahora es lo primero y dice qué desbloquea. */}
            <button
              type="button"
              className={`interruptor ${actual.regla.activa ? 'interruptor--maquina' : ''}`}
              style={{ color: actual.color }}
              aria-pressed={actual.regla.activa}
              onClick={() => tocarRegla(actual.id, (r) => (r.activa = !r.activa))}
            >
              <span className="interruptor__palanca" aria-hidden="true">
                <span className="interruptor__bolita" />
              </span>
              <span className="interruptor__textos">
                <span className="interruptor__estado">
                  {actual.regla.activa ? '⚙ La arma la máquina' : '✋ La armas tú'}
                </span>
                <span className="interruptor__pista">
                  {actual.regla.activa
                    ? `Mueve el cuadro y ${actual.nombre} cambia`
                    : 'Enciéndelo para poder mover el cuadro'}
                </span>
              </span>
            </button>

            <ListaPistas
              titulo="Pistas"
              pistas={candidatas.map((c) => ({
                id: c.id,
                nombre: c.nombre,
                color: c.color,
                nota: c.regla.activa ? '⚙ la máquina' : '✋ la armas tú',
              }))}
              elegida={actual.id}
              alElegir={setElegida}
            />
          </div>
        </div>
      </div>
    </Ventana>
  );
}
