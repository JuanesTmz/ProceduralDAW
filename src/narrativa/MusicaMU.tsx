/**
 * Lab de Música Urbana: samplear y tocar.
 *
 * Se parte del preset y se transforma con las manos: cambiar el sonido de
 * una capa por una grabación propia, subir o bajar cada capa en la escena,
 * editar golpes y melodía. Lo procedural es un solo interruptor por capa,
 * «Máquina»: con él encendido, la capa improvisa sobre lo dibujado.
 * Los sonidos se cambian en la ventana Sonidos (tocando el de cada capa).
 * Dentro de una escena se puede tocar en vivo y grabar el gesto.
 */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import { nivelDeCapa } from '../generativo/motorGenerativo';
import type { Escena, PuntoGesto } from '../estado/tipos';
import { ID_MELODIA } from './VentanaSonidosPistas';
import { useReproduccion } from './useReproduccion';

interface Props {
  escena: Escena | null;
  indice: number;
  alSonidos: (pista: string) => void;
}

const NIVELES = ['Apagada', 'Suave', 'Media', 'Fuerte'];

function Interruptor({ encendido, alCambiar }: { encendido: boolean; alCambiar: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      className={`nv-interruptor ${encendido ? 'nv-interruptor--on' : ''}`}
      onClick={alCambiar}
      title={encendido ? 'La máquina improvisa esta capa' : 'Suena tal cual la dibujaste'}
    >
      <span />
    </button>
  );
}

export function MusicaMU({ escena, indice, alSonidos }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const seccion = escena ? proyecto.secciones.find((s) => s.id === escena.id) : undefined;
  const { patron } = proyecto;

  const nivelActual = (id: string) => {
    if (!seccion) return 2;
    if (id === 'melodia') return seccion.melodiaActiva ? escena?.niveles?.melodia ?? 2 : 0;
    return nivelDeCapa(seccion, id);
  };

  const fijarNivel = (id: string, nivel: number) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (!e) return;
      if (!e.niveles) {
        // Primera edición: se parte de lo que sonaba, para no cambiar las demás capas.
        e.niveles = {};
        for (const f of p.patron.filas) e.niveles[f.id] = nivelActual(f.id);
        e.niveles.melodia = nivelActual('melodia');
      }
      e.niveles[id] = nivel;
    });

  return (
    <div className="nv-musica">
      <div className="nv-tarjeta nv-musica__principal">
        <div className="nv-campo__fila">
          <strong className="nv-subtitulo">{escena ? 'Capas de esta escena' : 'Capas de toda la pieza'}</strong>
          <span className="nv-espacio" />
          {escena?.niveles && (
            <button
              type="button"
              className="nv-chip nv-chip--borde"
              onClick={() =>
                actualizar((p) => {
                  const e = buscarEscena(p, escena.id);
                  if (e) e.niveles = undefined;
                })
              }
            >
              editada · volver a lo general
            </button>
          )}
        </div>
        <div className="nv-capas">
          <div className="nv-capa nv-capa--cabeza">
            <span>Capa</span>
            <span>Sonido</span>
            <span>{escena ? 'Fuerza en esta escena' : 'Volumen'}</span>
            <span>Máquina</span>
          </div>
          {patron.filas.map((f) => (
            <div key={f.id} className="nv-capa">
              <span className="nv-capa__nombre">
                <span className="nv-punto" style={{ background: f.color }} />
                {f.nombre}
              </span>
              <button
                type="button"
                className={`nv-select nv-select--boton ${f.tipo === 'sample' ? 'nv-select--propio' : ''}`}
                onClick={() => alSonidos(f.id)}
                title="Cambiar el sonido"
              >
                ♪ {f.tipo === 'sample' ? f.nombre : 'Batería'} ▾
              </button>
              {escena ? (
                <div className="nv-selector nv-selector--chico">
                  {NIVELES.map((n, i) => (
                    <button
                      key={n}
                      type="button"
                      className={`nv-selector__op ${nivelActual(f.id) === i ? 'nv-selector__op--activa' : ''}`}
                      style={nivelActual(f.id) === i && i > 0 ? { color: f.color, background: `${f.color}33` } : undefined}
                      onClick={() => fijarNivel(f.id, i)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={f.volumen}
                  style={{ accentColor: f.color }}
                  onChange={(ev) =>
                    actualizar((p) => {
                      const x = p.patron.filas.find((y) => y.id === f.id);
                      if (x) x.volumen = Number(ev.target.value);
                    })
                  }
                />
              )}
              <Interruptor
                encendido={Boolean(f.maquina)}
                alCambiar={() =>
                  actualizar((p) => {
                    const x = p.patron.filas.find((y) => y.id === f.id);
                    if (x) x.maquina = !x.maquina;
                  })
                }
              />
            </div>
          ))}
          <div className="nv-capa">
            <span className="nv-capa__nombre">
              <span className="nv-punto" style={{ background: '#5fd4ff' }} />
              Melodía
            </span>
            <button
              type="button"
              className={`nv-select nv-select--boton ${patron.melodia.instrumento === 'sample' ? 'nv-select--propio' : ''}`}
              onClick={() => alSonidos(ID_MELODIA)}
              title="Elegir con qué suena la melodía"
            >
              ♪ {patron.melodia.instrumento === 'sample' ? patron.melodia.nombreSample ?? 'Tu sonido' : 'Sintetizador'} ▾
            </button>
            {escena ? (
              <div className="nv-selector nv-selector--chico">
                {NIVELES.slice(0, 1).concat('Suena').map((n, i) => {
                  const activo = (nivelActual('melodia') > 0 ? 1 : 0) === i;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`nv-selector__op ${activo ? 'nv-selector__op--activa' : ''}`}
                      onClick={() => fijarNivel('melodia', i === 0 ? 0 : 2)}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={patron.melodia.volumen}
                onChange={(ev) => actualizar((p) => (p.patron.melodia.volumen = Number(ev.target.value)))}
              />
            )}
            <Interruptor
              encendido={Boolean(patron.melodia.maquina)}
              alCambiar={() => actualizar((p) => (p.patron.melodia.maquina = !p.patron.melodia.maquina))}
            />
          </div>
        </div>
      </div>

      <aside className="nv-tarjeta nv-musica__lado">
        {escena ? (
          <TocarEnVivo escena={escena} indice={indice} />
        ) : (
          <>
            <strong className="nv-subtitulo">El pulso</strong>
            <div className="nv-perilla">
              <div className="nv-campo__fila">
                <span>Tempo</span>
                <span className="nv-espacio" />
                <span className="nv-mono">{proyecto.bpm}</span>
              </div>
              <input
                type="range"
                min={60}
                max={140}
                step={1}
                value={proyecto.bpm}
                onChange={(ev) => actualizar((p) => (p.bpm = Number(ev.target.value)))}
              />
            </div>
            <div className="nv-perilla">
              <div className="nv-campo__fila">
                <span>Swing</span>
                <span className="nv-espacio" />
                <span className="nv-tenue nv-chico">{proyecto.swing < 0.05 ? 'cuadrado' : proyecto.swing < 0.3 ? 'suelto' : 'cojo'}</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.6}
                step={0.01}
                value={proyecto.swing}
                onChange={(ev) => actualizar((p) => (p.swing = Number(ev.target.value)))}
              />
            </div>
            <span className="nv-espacio-v" />
            <span className="nv-tenue nv-chico nv-italica">
              Dentro de cada escena puedes tocar en vivo y grabar tu gesto.
            </span>
          </>
        )}
      </aside>
    </div>
  );
}

/**
 * Tocar en vivo: un cuadro X/Y que se mueve mientras suena la escena.
 * El gesto se oye al instante y, si se está grabando, queda guardado en
 * la escena para que suene igual cada vez.
 */
function TocarEnVivo({ escena, indice }: { escena: Escena; indice: number }) {
  const { actualizar } = useProyecto();
  const { sonando } = useReproduccion();
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [grabando, setGrabando] = useState(false);
  const puntos = useRef<PuntoGesto[]>([]);
  const cuadro = useRef<HTMLDivElement>(null);
  const ultimo = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  /** El audio arranca un instante después del toque: no se corta antes de que suene. */
  const yaSono = useRef(false);

  // Al terminar la escena se guarda lo grabado.
  useEffect(() => {
    if (!grabando) return;
    if (sonando) {
      yaSono.current = true;
      return;
    }
    if (!yaSono.current) return;
    const gesto = puntos.current;
    setGrabando(false);
    if (gesto.length > 1) {
      actualizar((p) => {
        const e = buscarEscena(p, escena.id);
        if (e) e.gesto = gesto;
      });
    }
  }, [sonando, grabando, actualizar, escena.id]);

  // Mientras se graba, se toma una muestra del gesto unas 15 veces por segundo.
  useEffect(() => {
    if (!grabando) return;
    const reloj = window.setInterval(() => {
      if (!motorAudio.estaSonando) return;
      puntos.current.push({ t: motorAudio.fraccionSeccion, ...ultimo.current });
    }, 66);
    return () => window.clearInterval(reloj);
  }, [grabando]);

  const leer = (ev: EventoPuntero<HTMLDivElement>) => {
    const caja = cuadro.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (ev.clientX - caja.left) / caja.width));
    const y = Math.max(0, Math.min(1, 1 - (ev.clientY - caja.top) / caja.height));
    ultimo.current = { x, y };
    setPunto({ x, y });
    motorAudio.fijarGestoVivo({ x, y });
  };

  const grabar = () => {
    puntos.current = [];
    yaSono.current = false;
    setGrabando(true);
    void motorAudio.reproducirEscena(indice);
  };

  const gesto = escena.gesto ?? [];

  return (
    <>
      <strong className="nv-subtitulo">Tocar en vivo</strong>
      <span className="nv-tenue nv-chico">Mueve el dedo mientras suena la escena.</span>
      <div
        ref={cuadro}
        className="nv-xy"
        onPointerDown={(ev) => {
          ev.currentTarget.setPointerCapture(ev.pointerId);
          leer(ev);
        }}
        onPointerMove={(ev) => punto && leer(ev)}
        onPointerUp={() => {
          setPunto(null);
          motorAudio.fijarGestoVivo(null);
        }}
        onPointerCancel={() => {
          setPunto(null);
          motorAudio.fijarGestoVivo(null);
        }}
      >
        <span className="nv-xy__eje nv-xy__eje--arriba">intenso</span>
        <span className="nv-xy__eje nv-xy__eje--abajo">suave</span>
        <span className="nv-xy__eje nv-xy__eje--derecha">recargado →</span>
        {punto && (
          <span className="nv-xy__punto" style={{ left: `${punto.x * 100}%`, top: `${(1 - punto.y) * 100}%` }} />
        )}
      </div>
      <button
        type="button"
        className={`nv-boton nv-boton--rojo nv-lleno ${grabando ? 'nv-latiendo' : ''}`}
        onClick={() => (grabando ? motorAudio.detener() : grabar())}
      >
        <span className="nv-punto nv-punto--blanco" />
        {grabando ? 'Grabando… toca para parar' : 'Grabar mientras suena'}
      </button>
      <div className="nv-gesto">
        <div className="nv-campo__fila">
          <span className="nv-tenue nv-chico">Gesto grabado en esta escena</span>
          <span className="nv-espacio" />
          {gesto.length > 0 && (
            <button
              type="button"
              className="nv-enlace nv-chico"
              onClick={() =>
                actualizar((p) => {
                  const e = buscarEscena(p, escena.id);
                  if (e) e.gesto = undefined;
                })
              }
            >
              borrar
            </button>
          )}
        </div>
        {gesto.length === 0 ? (
          <span className="nv-tenue nv-chico nv-italica">Todavía no hay gesto</span>
        ) : (
          <div className="nv-gesto__barras">
            {Array.from({ length: 48 }, (_, i) => {
              const t = i / 47;
              const cerca = gesto.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a), gesto[0]);
              return <span key={i} style={{ height: `${12 + cerca.y * 88}%` }} />;
            })}
          </div>
        )}
      </div>
    </>
  );
}
