/**
 * Lab de Música Urbana: samplear y tocar.
 *
 * Todo es a mano: suena exactamente lo que se dibujó. Cada capa es una
 * fila con su sonido (se toca para cambiarlo), si suena o no en esta
 * escena y su edición de golpes. La intensidad es una sola, la de la
 * escena, y está arriba junto a la emoción. Dentro de una escena se
 * puede tocar en vivo y grabar el gesto.
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
import { origenSonido, Suena } from './FilaSonido';
import { CeldasCapas } from './CeldasCapas';

type Vista = 'lista' | 'celdas';
const CLAVE_VISTA = 'sonora-vista-capas';

/** Cómo quiere ver las capas quien usa esta tablet (una comodidad, no parte del proyecto). */
function leerVista(): Vista {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'celdas' ? 'celdas' : 'lista';
  } catch {
    return 'lista';
  }
}

interface Props {
  escena: Escena | null;
  indice: number;
  alSonidos: (pista: string) => void;
  /** Abre la edición de una capa: sus golpes, o la matriz si es la melodía. */
  alEditar: (pista: string) => void;
  /** Abre la biblioteca de Sonidos para agregar una capa nueva. */
  alAgregar: () => void;
}

const COLOR_MELODIA = '#5fd4ff';

export function MusicaMU({ escena, indice, alSonidos, alEditar, alAgregar }: Props) {
  const [vista, setVista] = useState<Vista>(leerVista);
  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      // Sin almacenamiento solo se olvida la preferencia.
    }
  };
  const { proyecto, actualizar } = useProyecto();
  const seccion = escena ? proyecto.secciones.find((s) => s.id === escena.id) : undefined;
  const { patron } = proyecto;

  const suena = (id: string) => {
    if (!seccion) return true;
    if (id === ID_MELODIA) return seccion.melodiaActiva;
    return nivelDeCapa(seccion, id) > 0;
  };

  const alternar = (id: string) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (!e) return;
      const clave = id === ID_MELODIA ? 'melodia' : id;
      if (!e.niveles) {
        // Primera vez: se parte de lo que sonaba, para no apagar las demás.
        e.niveles = {};
        for (const f of p.patron.filas) e.niveles[f.id] = suena(f.id) ? 2 : 0;
        e.niveles.melodia = suena(ID_MELODIA) ? 2 : 0;
      }
      e.niveles[clave] = (e.niveles[clave] ?? 0) > 0 ? 0 : 2;
    });

  const filas = [
    ...patron.filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      origen: origenSonido(f.tipo, f.sampleUrl),
      color: f.color,
      volumen: f.volumen,
      editar: '✎ Golpes',
    })),
    {
      id: ID_MELODIA,
      nombre: 'Melodía',
      origen:
        patron.melodia.instrumento === 'sample'
          ? `con ${patron.melodia.nombreSample ?? 'tu sonido'}`
          : 'con sintetizador',
      color: COLOR_MELODIA,
      volumen: patron.melodia.volumen,
      editar: '✎ Notas',
    },
  ];

  return (
    <div className={`nv-musica ${escena ? '' : 'nv-musica--sola'}`}>
      <div className="nv-tarjeta nv-musica__principal">
        <div className="nv-campo__fila">
          <strong className="nv-subtitulo">{escena ? 'Capas de esta escena' : 'Capas de toda la pieza'}</strong>
          <div className="nv-selector nv-selector--vista" role="group" aria-label="Cómo ver las capas">
            <button
              type="button"
              className={`nv-selector__op ${vista === 'lista' ? 'nv-selector__op--activa' : ''}`}
              aria-pressed={vista === 'lista'}
              onClick={() => cambiarVista('lista')}
              title="Ver las capas como lista"
            >
              ☰ Lista
            </button>
            <button
              type="button"
              className={`nv-selector__op ${vista === 'celdas' ? 'nv-selector__op--activa' : ''}`}
              aria-pressed={vista === 'celdas'}
              onClick={() => cambiarVista('celdas')}
              title="Ver los golpes de cada capa en celdas"
            >
              ▦ Celdas
            </button>
          </div>
          <span className="nv-espacio" />
          {escena?.niveles && (
            <button
              type="button"
              className="nv-enlace nv-chico"
              onClick={() =>
                actualizar((p) => {
                  const e = buscarEscena(p, escena.id);
                  if (e) e.niveles = undefined;
                })
              }
            >
              Volver a como estaba
            </button>
          )}
        </div>
        {vista === 'celdas' ? (
          <CeldasCapas
            capas={filas}
            suena={escena ? suena : undefined}
            alSuena={escena ? alternar : undefined}
            alSonidos={alSonidos}
            alNotas={() => alEditar(ID_MELODIA)}
          />
        ) : (
        <div className="nv-lista-sonidos">
          {filas.map((f, k) => (
            <div key={f.id} className={`nv-fila-son ${suena(f.id) ? '' : 'nv-fila-son--muda'}`}>
              <button
                type="button"
                className="nv-fila-son__elegir"
                style={{ ['--color' as string]: f.color }}
                onClick={() => alSonidos(f.id)}
                title="Cambiar el sonido"
              >
                <span className="nv-fila-son__punto" />
                <span className="nv-fila-son__texto">
                  <strong>{f.nombre}</strong>
                  <span>{f.origen}</span>
                </span>
                <span className="nv-fila-son__flecha">▾</span>
              </button>
              <span className="nv-espacio" />
              {escena ? (
                <Suena encendido={suena(f.id)} color={f.color} alCambiar={() => alternar(f.id)} />
              ) : (
                <input
                  type="range"
                  className="nv-fila-son__volumen"
                  min={0}
                  max={1}
                  step={0.01}
                  value={f.volumen}
                  aria-label={`Volumen de ${f.nombre}`}
                  style={{ accentColor: f.color }}
                  onChange={(ev) =>
                    actualizar((p) => {
                      const v = Number(ev.target.value);
                      if (f.id === ID_MELODIA) p.patron.melodia.volumen = v;
                      const x = p.patron.filas.find((y) => y.id === f.id);
                      if (x) x.volumen = v;
                    })
                  }
                />
              )}
              <button
                type="button"
                className="nv-boton nv-boton--chico nv-fila-son__accion"
                data-tour={k === 0 ? 'editar' : undefined}
                onClick={() => alEditar(f.id)}
              >
                {f.editar}
              </button>
            </div>
          ))}
        </div>
        )}
        <div className="nv-capas__pie">
          <button type="button" className="nv-boton nv-boton--chico nv-agregar-capa" data-tour="sonidos" onClick={alAgregar}>
            + Agregar sonido
          </button>
        </div>
      </div>

      {escena && (
        <aside className="nv-tarjeta nv-musica__lado">
          <TocarEnVivo escena={escena} indice={indice} />
        </aside>
      )}
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
      <div className="nv-campo__fila">
        <strong className="nv-subtitulo">Tocar en vivo</strong>
      </div>
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
