/**
 * El recortador: la onda de la grabación y dos tiradores para quedarse con
 * el pedazo que sirve.
 *
 * Casi todo lo que graba un estudiante en un taller empieza con medio segundo
 * de "¿ya está grabando?" y termina con el ruido de soltar el botón. Recortar
 * no es un lujo: es la diferencia entre un sample que suena y uno que llega
 * tarde a cada golpe. Por eso la app propone sola dónde empieza y acaba el
 * sonido, y los tiradores están para afinar esa propuesta, no para hacerla.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { bordesDelSonido, leerAudio, picosDe, recortarAWav } from '../audio/muestras';

const COLUMNAS = 220;

interface Props {
  url: string;
  /** Se llama con el audio ya recortado. */
  alGuardar: (recorte: Blob, duracion: number) => void;
  alDescartar: () => void;
}

export function Recortador({ url, alGuardar, alDescartar }: Props) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [picos, setPicos] = useState<number[]>([]);
  const [inicio, setInicio] = useState(0);
  const [fin, setFin] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const lienzo = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const arrastrando = useRef<'inicio' | 'fin' | null>(null);
  const sonando = useRef<AudioBufferSourceNode | null>(null);

  // Leer la grabación y proponer el recorte.
  useEffect(() => {
    let vivo = true;
    setError(null);
    leerAudio(url)
      .then((b) => {
        if (!vivo) return;
        setBuffer(b);
        setPicos(picosDe(b, COLUMNAS));
        const bordes = bordesDelSonido(b);
        setInicio(bordes.inicio);
        setFin(bordes.fin);
      })
      .catch(() => {
        if (vivo) setError('No se pudo leer la grabación. Intenta grabar otra vez.');
      });
    return () => {
      vivo = false;
    };
  }, [url]);

  // Dibujar la onda, con lo que queda fuera del recorte en gris.
  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas || picos.length === 0 || !buffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ancho = canvas.clientWidth;
    const alto = canvas.clientHeight;
    const densidad = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(ancho * densidad);
    canvas.height = Math.round(alto * densidad);
    ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
    ctx.clearRect(0, 0, ancho, alto);

    const porColumna = ancho / picos.length;
    const medio = alto / 2;
    picos.forEach((pico, i) => {
      const t = (i / picos.length) * buffer.duration;
      const dentro = t >= inicio && t <= fin;
      ctx.fillStyle = dentro ? '#2ee6a8' : '#39414f';
      const altura = Math.max(1.5, pico * (alto - 8));
      ctx.fillRect(i * porColumna, medio - altura / 2, Math.max(1, porColumna - 0.6), altura);
    });
  }, [picos, inicio, fin, buffer]);

  const tiempoDesdeX = useCallback(
    (clientX: number) => {
      const nodo = caja.current;
      if (!nodo || !buffer) return 0;
      const r = nodo.getBoundingClientRect();
      const fraccion = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      return fraccion * buffer.duration;
    },
    [buffer],
  );

  const alBajar = (cual: 'inicio' | 'fin') => (evento: EventoPuntero<HTMLButtonElement>) => {
    arrastrando.current = cual;
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId);
    } catch {
      // Sin captura el arrastre sigue sirviendo mientras el dedo no se salga.
    }
  };

  const alMover = (evento: EventoPuntero<HTMLElement>) => {
    if (!arrastrando.current || !buffer) return;
    const t = tiempoDesdeX(evento.clientX);
    // Los tiradores no se cruzan, y el recorte nunca baja de 50 ms.
    if (arrastrando.current === 'inicio') setInicio(Math.min(t, fin - 0.05));
    else setFin(Math.max(t, inicio + 0.05));
  };

  const alSoltar = () => {
    arrastrando.current = null;
  };

  const escuchar = async () => {
    if (!buffer) return;
    sonando.current?.stop();
    const ctx = new AudioContext();
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.connect(ctx.destination);
    fuente.start(0, inicio, Math.max(0.02, fin - inicio));
    sonando.current = fuente;
    fuente.onended = () => void ctx.close();
  };

  const guardar = async () => {
    if (!buffer) return;
    setGuardando(true);
    try {
      const recorte = await recortarAWav(buffer, inicio, fin);
      alGuardar(recorte, fin - inicio);
    } catch {
      setError('No se pudo recortar. Prueba con una selección más larga.');
    } finally {
      setGuardando(false);
    }
  };

  const duracion = buffer?.duration ?? 1;
  const pct = (t: number) => `${(t / duracion) * 100}%`;

  return (
    <div className="recorte">
      {error && <p className="aviso aviso--malo">{error}</p>}

      {!buffer && !error && <p className="vacio-mesa__ayuda">Leyendo la grabación…</p>}

      {buffer && (
        <>
          <div
            ref={caja}
            className="onda"
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            onPointerLeave={alSoltar}
          >
            <canvas ref={lienzo} className="onda__lienzo" />

            <div className="onda__fuera" style={{ left: 0, width: pct(inicio) }} />
            <div className="onda__fuera" style={{ left: pct(fin), right: 0 }} />

            <button
              type="button"
              className="tirador"
              style={{ left: pct(inicio) }}
              aria-label="Dónde empieza el recorte"
              onPointerDown={alBajar('inicio')}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
            />
            <button
              type="button"
              className="tirador tirador--fin"
              style={{ left: pct(fin) }}
              aria-label="Dónde acaba el recorte"
              onPointerDown={alBajar('fin')}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
            />
          </div>

          <p className="recorte__dato">
            Te quedas con <strong>{(fin - inicio).toFixed(2)} s</strong> de{' '}
            {duracion.toFixed(2)} s · arrastra los tiradores verdes para ajustar
          </p>

          <div className="recorte__acciones">
            <button type="button" className="boton" onClick={() => void escuchar()}>
              ▶ Oír el recorte
            </button>
            <button
              type="button"
              className="boton boton--primario"
              disabled={guardando}
              onClick={() => void guardar()}
            >
              {guardando ? 'Recortando…' : '✓ Guardar este sonido'}
            </button>
            <button type="button" className="boton boton--peligro" onClick={alDescartar}>
              Descartar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
