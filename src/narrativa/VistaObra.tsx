// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La entrega de un equipo, tocándose de verdad: `/?entrega=<video>`.
 *
 * Los equipos exportan y mandan su video a la galería como siempre. Al
 * mandarlo, el servidor guarda una copia del proyecto en ese momento, y eso es
 * lo que reciben los jurados: el panel la pone en la carta del mazo y en el
 * visor de la galería, en vez del video (que llega pesado y en baja calidad).
 * Es el mismo escenario de Función, con el motor visual y el de audio de la
 * app: se ve tan fluido y nítido como en la tablet. La copia vive solo en
 * memoria: no se guarda ni toca el proyecto del equipo.
 *
 * Abajo, una barra para tocar o parar y saltar a cualquier punto de la obra.
 */
import { useEffect, useRef, useState } from 'react';
import type { Proyecto } from '../estado/tipos';
import { motorAudio } from '../audio/motorAudio';
import { ProveedorDemo, completarProyecto, useProyecto, type ApiDemo } from '../estado/ProyectoContext';
import { duracionSeccion, formatearReloj } from '../estado/proyecto';
import { EMOCIONES, recorrido } from '../estado/escenas';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import { Escenario } from './Escenario';
import { fijar, useCuadro } from './useCuadro';
import { useReproduccion } from './useReproduccion';
import '../estilos/obra.css';

/** Trae la copia de la entrega y la reproduce. */
export function ObraEntregada({ video }: { video: string }) {
  const [obra, setObra] = useState<Proyecto | null | 'error'>(null);
  const api = useRef<ApiDemo | null>(null);
  useEffect(() => {
    fetch(`/api/videos/${encodeURIComponent(video)}/obra`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((r: { proyecto: Proyecto | null }) => setObra(r.proyecto ? completarProyecto(r.proyecto) : 'error'))
      .catch(() => setObra('error'));
  }, [video]);
  if (obra === null) return <div className="vo vo--cargando">Abriendo la obra…</div>;
  if (obra === 'error') return <div className="vo vo--cargando">No se pudo abrir esta entrega.</div>;
  return (
    <ProveedorDemo inicial={() => obra} api={api}>
      <VistaObra />
    </ProveedorDemo>
  );
}

export function VistaObra() {
  const { proyecto, cargando } = useProyecto();
  useSincronizarAudio();
  const { sonandoPieza: sonando, seccion } = useReproduccion();
  const lista = recorrido(proyecto);
  const duraciones = proyecto.secciones.map((s) => duracionSeccion(proyecto, s));
  const total = duraciones.reduce((a, b) => a + b, 0);
  const llenos = useRef<(HTMLSpanElement | null)[]>([]);
  const reloj = useRef<HTMLSpanElement>(null);
  const durRef = useRef(duraciones);
  durRef.current = duraciones;

  // Las barras y el reloj siguen lo que se oye, cuadro a cuadro.
  useCuadro(() => {
    const pos = motorAudio.estaSonando ? motorAudio.posicionOida : null;
    const dur = durRef.current;
    dur.forEach((d, i) => {
      const lleno = !pos ? 0 : i < pos.indice ? 1 : i === pos.indice ? Math.min(1, pos.segundos / Math.max(0.1, d)) : 0;
      fijar(llenos.current[i] ?? undefined, 'width', `${(lleno * 100).toFixed(1)}%`);
    });
    const t = pos ? dur.slice(0, pos.indice).reduce((a, b) => a + b, 0) + pos.segundos : 0;
    fijar(reloj.current ?? undefined, 'texto', `${formatearReloj(Math.min(t, total))} / ${formatearReloj(total)}`);
  });

  const tocar = () => (sonando ? motorAudio.detener() : void motorAudio.reproducirPieza());

  // Espacio: tocar o parar.
  const tocarRef = useRef(tocar);
  tocarRef.current = tocar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      tocarRef.current();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  // Al cerrarse (se quita del panel), deja de sonar.
  useEffect(() => () => motorAudio.detener(), []);

  if (cargando) return <div className="vo vo--cargando">Abriendo la obra…</div>;
  if (lista.length === 0) return <div className="vo vo--cargando">Este equipo todavía no tiene escenas.</div>;

  const actual = lista[seccion] ?? lista[0];

  return (
    <div className="nv vo">
      <div className="vo-escenario">
        <Escenario escenaFija={lista[0]?.id} />
        {sonando && (
          <span className="vo-escena" style={{ color: EMOCIONES[actual.emocion].color }}>
            {actual.respiro ? 'Respiro' : actual.nombre}
          </span>
        )}
        {!sonando && (
          <button type="button" className="vo-empezar" onClick={tocar} aria-label="Ver la obra">
            <svg viewBox="0 0 256 256" width="34" height="34" aria-hidden>
              <path fill="currentColor" d="M240 128a15.74 15.74 0 0 1-7.6 13.51L88.32 229.65a16 16 0 0 1-16.2.3A15.86 15.86 0 0 1 64 216.13V39.87a15.86 15.86 0 0 1 8.12-13.82a16 16 0 0 1 16.2.3l144.08 88.14A15.74 15.74 0 0 1 240 128" />
            </svg>
          </button>
        )}
      </div>
      <div className="vo-barra">
        <button type="button" className="vo-tocar" onClick={tocar} aria-label={sonando ? 'Parar' : 'Ver la obra'}>
          <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden>
            {sonando ? (
              <path fill="currentColor" d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" />
            ) : (
              <path fill="currentColor" d="M240 128a15.74 15.74 0 0 1-7.6 13.51L88.32 229.65a16 16 0 0 1-16.2.3A15.86 15.86 0 0 1 64 216.13V39.87a15.86 15.86 0 0 1 8.12-13.82a16 16 0 0 1 16.2.3l144.08 88.14A15.74 15.74 0 0 1 240 128" />
            )}
          </svg>
        </button>
        <div className="vo-linea">
          {lista.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className={`vo-tramo ${i === seccion && sonando ? 'vo-tramo--aqui' : ''}`}
              style={{ flexGrow: Math.max(1, duraciones[i] ?? 1), ['--c' as string]: EMOCIONES[e.emocion].color }}
              title={e.respiro ? 'Respiro' : e.nombre}
              onClick={(ev) => {
                // Tocar un punto de la línea: la obra suena desde ahí.
                const caja = ev.currentTarget.getBoundingClientRect();
                const fraccion = Math.max(0, Math.min(1, (ev.clientX - caja.left) / Math.max(1, caja.width)));
                const d = duraciones[i] ?? 0;
                void motorAudio.reproducirPieza(i, Math.max(0, Math.min(fraccion * d, d - 0.3)));
              }}
            >
              <span className="vo-tramo__lleno" ref={(n) => void (llenos.current[i] = n)} />
            </button>
          ))}
        </div>
        <span ref={reloj} className="vo-reloj" />
      </div>
    </div>
  );
}
