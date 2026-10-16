/**
 * Grabar la voz de corrido: todo el monólogo en una sola toma.
 *
 * Después la app reparte la grabación entre las escenas según sus palabras,
 * y el estudiante corrige dónde cambia cada escena arrastrando los límites
 * sobre la onda. Tocar un tramo lo hace sonar, para encontrar el corte de
 * oído.
 */
import { useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import { EMOCIONES, moverLimiteVoz, repartirVozCorrida } from '../estado/escenas';
import { useGrabadora } from '../hooks/useGrabadora';
import { Onda } from './VozEscena';

export function VozCorrida({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { escenas, vozCorrida } = proyecto;
  const barra = useRef<HTMLDivElement>(null);
  const [agarrado, setAgarrado] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const reloj = useRef<number | null>(null);
  const [sonando, setSonando] = useState<number | null>(null);

  const { estado, segundos, error, empezar, parar } = useGrabadora((g) =>
    actualizar((p) => {
      p.vozCorrida = { url: g.url, duracion: g.duracion };
      repartirVozCorrida(p);
    }),
  );
  const grabando = estado === 'grabando';

  const callar = () => {
    audio.current?.pause();
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    setSonando(null);
  };

  const oirTramo = (i: number) => {
    const e = escenas[i];
    if (!vozCorrida || e?.vozDesde === undefined) return;
    if (sonando === i) return callar();
    callar();
    audio.current = new Audio(vozCorrida.url);
    audio.current.currentTime = e.vozDesde;
    void audio.current.play();
    setSonando(i);
    reloj.current = window.setTimeout(callar, e.vozDuracion * 1000);
  };

  const mover = (ev: EventoPuntero<HTMLSpanElement>) => {
    if (agarrado === null || !vozCorrida || !barra.current) return;
    const caja = barra.current.getBoundingClientRect();
    const segundo = ((ev.clientX - caja.left) / caja.width) * vozCorrida.duracion;
    const k = agarrado;
    actualizar((p) => moverLimiteVoz(p, k, segundo));
  };

  return (
    <section className="nv-apuntador nv-apuntador--corrido">
      <span className="nv-etiqueta nv-tenue">TODO EL MONÓLOGO DE CORRIDO</span>
      <p className={`nv-apuntador__texto nv-apuntador__texto--corrido ${grabando ? 'nv-apuntador__texto--vivo' : ''}`}>
        {escenas.map((e, i) => (
          <span key={e.id} style={{ color: sonando === i ? EMOCIONES[e.emocion].color : undefined }}>
            {e.texto}{' '}
          </span>
        ))}
      </p>

      {vozCorrida && !grabando && (
        <div className="nv-reparto">
          <span className="nv-tenue nv-chico">
            Arrastra los límites hasta donde cambia cada escena. Toca un tramo para oírlo.
          </span>
          <div className="nv-reparto__barra" ref={barra}>
            <span className="nv-reparto__onda">
              <Onda semilla={vozCorrida.url} color="#ffffff55" barras={320} />
            </span>
            {escenas.map((e, i) => {
              const izquierda = ((e.vozDesde ?? 0) / vozCorrida.duracion) * 100;
              const ancho = (e.vozDuracion / vozCorrida.duracion) * 100;
              const color = EMOCIONES[e.emocion].color;
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`nv-reparto__tramo ${sonando === i ? 'nv-reparto__tramo--sonando' : ''}`}
                  style={{ left: `${izquierda}%`, width: `${ancho}%`, ['--color' as string]: color }}
                  onClick={() => oirTramo(i)}
                >
                  <span>{i + 1} · {e.nombre}</span>
                </button>
              );
            })}
            {escenas.slice(0, -1).map((e, k) => {
              const x = (((e.vozDesde ?? 0) + e.vozDuracion) / vozCorrida.duracion) * 100;
              return (
                <span
                  key={e.id}
                  className={`nv-limite nv-reparto__limite ${agarrado === k ? 'nv-limite--agarrado' : ''}`}
                  style={{ left: `${x}%`, ['--color' as string]: '#ffffff' }}
                  onPointerDown={(ev) => {
                    ev.currentTarget.setPointerCapture(ev.pointerId);
                    setAgarrado(k);
                  }}
                  onPointerMove={mover}
                  onPointerUp={() => setAgarrado(null)}
                  onPointerCancel={() => setAgarrado(null)}
                >
                  <span className="nv-limite__asa" />
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="nv-apuntador__control">
        {grabando ? (
          <>
            <button type="button" className="nv-grabar nv-grabar--vivo" onClick={parar} aria-label="Parar">
              <span className="nv-grabar__cuadro" />
            </button>
            <span className="nv-mono nv-apuntador__tiempo">{formatearReloj(segundos)}</span>
            <span className="nv-tenue">Lee todo el monólogo y toca para parar</span>
          </>
        ) : vozCorrida ? (
          <>
            <span className="nv-mono">{formatearReloj(vozCorrida.duracion)}</span>
            <span className="nv-espacio" />
            <button type="button" className="nv-boton" onClick={() => void empezar()}>
              Grabar de nuevo
            </button>
            <button type="button" className="nv-boton nv-boton--primario" onClick={alSeguir}>
              Ir a Escenas  →
            </button>
          </>
        ) : (
          <>
            <button type="button" className="nv-grabar" disabled={estado === 'pidiendo'} onClick={() => void empezar()} aria-label="Grabar">
              <span className="nv-grabar__punto" />
            </button>
            <span className="nv-tenue">{estado === 'pidiendo' ? 'Pidiendo el micrófono…' : error ?? 'Toca para grabar todo de una vez'}</span>
          </>
        )}
      </div>
    </section>
  );
}
