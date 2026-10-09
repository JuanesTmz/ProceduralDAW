/**
 * El transporte: la fila que no se va nunca mientras se produce.
 *
 * Reúne lo que siempre tiene que estar a un toque de distancia —tocar,
 * bucle o pieza, tempo, volumen— y la semilla con Variar y Mutar, que son
 * el corazón del motor generativo y antes vivían escondidos en una pantalla.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { mutar, volverASembrar } from '../generativo/motorGenerativo';
import { semillaAleatoria } from '../generativo/rng';
import type { ModoReproduccion } from '../estado/tipos';

const MODOS: { id: ModoReproduccion; etiqueta: string; ayuda: string }[] = [
  { id: 'patron', etiqueta: 'Bucle', ayuda: 'El patrón se repite sin parar, para armarlo.' },
  {
    id: 'pieza',
    etiqueta: 'Pieza',
    ayuda: 'Recorre Intro → Estrofa → Coro → Cierre en orden y termina.',
  },
];

export function BarraTransporte() {
  const { proyecto, actualizar } = useProyecto();
  const [sonando, setSonando] = useState(false);

  const alternar = async () => {
    if (motorAudio.estaSonando) {
      motorAudio.detener();
      setSonando(false);
    } else {
      await motorAudio.reproducir();
      setSonando(true);
    }
  };

  // El botón sigue al motor, no al revés: así refleja también cuando la pieza
  // se detiene sola al terminar. React descarta el set si el valor no cambió.
  useEffect(() => motorAudio.alCambiarPaso((paso) => setSonando(paso >= 0)), []);

  // Barra espaciadora global, salvo cuando se está escribiendo en un campo.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const destino = e.target as HTMLElement | null;
      const etiqueta = destino?.tagName;
      if (
        etiqueta === 'INPUT' ||
        etiqueta === 'TEXTAREA' ||
        etiqueta === 'SELECT' ||
        destino?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      void alternar();
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  // Si ninguna pista está en manos de la máquina, Variar y Mutar no tienen
  // sobre qué actuar: se apagan, y al tocarlos dicen dónde se arregla.
  const hayMaquina =
    proyecto.patron.filas.some((f) => f.regla.activa) || proyecto.patron.melodia.regla.activa;

  const cambiarModo = (modo: ModoReproduccion) => {
    actualizar((p) => {
      p.modoReproduccion = modo;
    });
    motorAudio.cambiarModo(modo);
  };

  return (
    <div className="transporte">
      <button
        type="button"
        className={`tocar ${sonando ? 'tocar--sonando' : ''}`}
        onClick={() => void alternar()}
        aria-label={sonando ? 'Parar' : 'Tocar'}
      >
        <span className="tocar__icono" aria-hidden="true">
          {sonando ? '■' : '▶'}
        </span>
        {sonando ? 'Parar' : 'Tocar'}
      </button>

      <div className="segmentado" role="group" aria-label="Modo de reproducción">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={proyecto.modoReproduccion === m.id}
            title={m.ayuda}
            onClick={() => cambiarModo(m.id)}
          >
            {m.etiqueta}
          </button>
        ))}
      </div>

      <label className="mando-barra">
        <span className="mando-barra__nombre">Tempo</span>
        <input
          type="range"
          min={50}
          max={200}
          step={1}
          value={proyecto.bpm}
          aria-label="Tempo en pulsos por minuto"
          onChange={(e) =>
            actualizar((p) => {
              p.bpm = Math.min(200, Math.max(50, Number(e.target.value)));
            })
          }
        />
        <span className="mando-barra__valor">{proyecto.bpm} BPM</span>
      </label>

      <label className="mando-barra mando-barra--corto">
        <span className="mando-barra__nombre">Volumen</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={proyecto.volumenMaestro}
          aria-label="Volumen general"
          onChange={(e) =>
            actualizar((p) => {
              p.volumenMaestro = Number(e.target.value);
            })
          }
        />
      </label>

      <div className="motor-barra">
        <span className="motor-barra__rotulo">semilla</span>
        <input
          type="number"
          className="motor-barra__display"
          min={0}
          max={99999}
          value={proyecto.semilla}
          aria-label="Semilla del motor generativo"
          onChange={(e) => actualizar((p) => volverASembrar(p, Number(e.target.value) || 0))}
        />
        <button
          type="button"
          className="boton boton--motor"
          disabled={!hayMaquina}
          title={hayMaquina ? 'Otra semilla, otra versión de la misma pieza' : 'Entrégale una pista a la máquina en Procedural'}
          onClick={() => actualizar((p) => volverASembrar(p, semillaAleatoria()))}
        >
          🎲 Variar
        </button>
        <button
          type="button"
          className="boton boton--motor"
          disabled={!hayMaquina}
          title={hayMaquina ? 'Cambia unos pocos golpes, sin empezar de cero' : 'Entrégale una pista a la máquina en Procedural'}
          onClick={() => actualizar((p) => mutar(p, p.semilla))}
        >
          ✦ Mutar
        </button>
      </div>

      <span className="transporte__pista">
        <span className="tecla">espacio</span> toca y para
      </span>
    </div>
  );
}
