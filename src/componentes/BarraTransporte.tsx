/**
 * Transport / Mixer maestro: play/stop, BPM y volumen general.
 * La barra espaciadora arranca y para, como en cualquier programa de música.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import type { ModoReproduccion } from '../estado/tipos';

const MODOS: { id: ModoReproduccion; etiqueta: string; ayuda: string }[] = [
  { id: 'patron', etiqueta: 'Bucle', ayuda: 'El patrón se repite sin parar, para armarlo.' },
  {
    id: 'pieza',
    etiqueta: 'Pieza',
    ayuda: 'Recorre Intro → Cuerpo → Giro → Cierre en orden y termina.',
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
  // arranca desde la vista de Secciones o se detiene sola al terminar.
  // React descarta el set si el valor no cambió, así que no re-renderiza por paso.
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

  const cambiarModo = (modo: ModoReproduccion) => {
    actualizar((p) => {
      p.modoReproduccion = modo;
    });
    motorAudio.cambiarModo(modo);
  };

  const cambiarBpm = (bpm: number) => {
    const valor = Math.min(200, Math.max(50, bpm));
    actualizar((p) => {
      p.bpm = valor;
    });
  };

  const cambiarVolumen = (volumen: number) => {
    actualizar((p) => {
      p.volumenMaestro = volumen;
    });
  };

  return (
    <section className="panel">
      <div className="transporte">
        <button
          type="button"
          className={`boton boton--primario boton--tocar ${sonando ? 'boton--sonando' : ''}`}
          onClick={() => void alternar()}
        >
          {sonando ? '⏹ Parar' : '▶ Tocar'}
        </button>

        <div className="grupo-segmentado">
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

        <div className="transporte__separador" />

        <div className="transporte__bpm">
          <div className="campo">
            <span className="campo__etiqueta">Tempo</span>
            <span className="campo__valor">{proyecto.bpm} BPM</span>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={1}
            value={proyecto.bpm}
            onChange={(e) => cambiarBpm(Number(e.target.value))}
            aria-label="Tempo en pulsos por minuto"
          />
        </div>

        <div className="transporte__separador" />

        <div className="transporte__bpm">
          <div className="campo">
            <span className="campo__etiqueta">Volumen</span>
            <span className="campo__valor">{Math.round(proyecto.volumenMaestro * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={proyecto.volumenMaestro}
            onChange={(e) => cambiarVolumen(Number(e.target.value))}
            aria-label="Volumen general"
          />
        </div>

        <span className="transporte__pista">
          <span className="tecla">espacio</span> para tocar y parar
        </span>
      </div>
    </section>
  );
}
