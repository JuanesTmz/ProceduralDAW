/**
 * Paso 3: las escenas. La pantalla principal de la app.
 *
 * Arriba, una tarjeta corta por escena (y por respiro): solo lo esencial,
 * y se toca para entrar. Abajo, la pieza completa en el tiempo: la voz pone
 * cuánto dura cada escena, la música sube o baja con su energía y la imagen
 * cambia con ella. La escala es fija, de 0 a 2:30, para que se vea cuánto
 * queda.
 */
import { BotonTutorial } from './BotonTutorial';
import { useRef } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion, formatearReloj } from '../estado/proyecto';
import {
  agregarRespiro,
  DURACION_MAXIMA,
  EMOCIONES,
  intensidadDeEscena,
  quitarRespiro,
  recorrido,
  reordenar,
} from '../estado/escenas';
import { useOrdenArrastrable } from './useOrdenArrastrable';
import { PRESETS } from '../estado/musica';
import type { Escena } from '../estado/tipos';
import { useReproduccion } from './useReproduccion';
import { useCuadro } from './useCuadro';
import { Onda } from './VozEscena';

export function fondoEscena(e: Escena): string {
  if (e.imagenUrl) return `center / cover no-repeat url(${e.imagenUrl})`;
  const c = EMOCIONES[e.emocion].color;
  return `linear-gradient(135deg, #12141c 0%, ${c}88 60%, ${c} 100%)`;
}

function Fuerza({ n, color }: { n: number; color: string }) {
  return (
    <span className="nv-fuerza" aria-label={`Fuerza ${n}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ height: 4 + i * 3, background: color, opacity: i <= n ? 1 : 0.25 }} />
      ))}
    </span>
  );
}

export function ChipEmocion({ e }: { e: Escena }) {
  const { color, etiqueta } = EMOCIONES[e.emocion];
  return (
    <span className="nv-chip" style={{ color, background: `${color}24` }}>
      <span className="nv-punto" style={{ background: color }} />
      {etiqueta}
      <Fuerza n={e.fuerza} color={color} />
    </span>
  );
}

export function PasoEscenas({ alEntrar, alGeneral }: { alEntrar: (id: string) => void; alGeneral: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { seccion: sonandoAhora } = useReproduccion();
  const cabezal = useRef<HTMLSpanElement>(null);
  const totalRef = useRef(0);
  // El cabezal sigue a lo que se oye, cuadro a cuadro.
  useCuadro(() => {
    const nodo = cabezal.current;
    if (!nodo) return;
    const sonando = motorAudio.estaSonando && motorAudio.posicionOida !== null;
    nodo.style.display = sonando ? '' : 'none';
    if (sonando) nodo.style.left = `calc(76px + (100% - 76px) * ${(motorAudio.progresoPieza * totalRef.current) / DURACION_MAXIMA})`;
  });
  const lista = recorrido(proyecto);
  const { manejadores, agarrada } = useOrdenArrastrable(
    lista.map((e) => e.id),
    (orden) => actualizar((p) => reordenar(p, orden)),
    alEntrar,
  );

  if (lista.length === 0) {
    return (
      <div className="nv-pagina nv-vacio">
        <h1 className="nv-titulo">Tus escenas</h1>
        <p className="nv-sub">Primero escribe tu monólogo y pártelo en escenas en el paso Historia.</p>
      </div>
    );
  }

  const duraciones = proyecto.secciones.map((s) => duracionSeccion(proyecto, s));
  const total = duraciones.reduce((a, b) => a + b, 0);
  totalRef.current = total;
  const pct = (s: number) => `${(s / DURACION_MAXIMA) * 100}%`;
  const queda = DURACION_MAXIMA - total;
  let numero = 0;

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-cabeza">
        <div>
          <h1 className="nv-titulo">{proyecto.nombre === 'Mi pieza' ? 'Tus escenas' : proyecto.nombre}</h1>
          <p className="nv-sub">Toca una escena para entrar · arrástrala para cambiarla de orden.</p>
        </div>
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-boton"
          onClick={() => {
            let id = '';
            actualizar((p) => {
              id = agregarRespiro(p, p.escenas.length - 1);
            });
            if (id) alEntrar(id);
          }}
          data-tour="respiro"
          title="Opcional: un momento sin voz donde la música cuenta sola">
          + Respiro (opcional)
        </button>
        <BotonTutorial id="respiros" texto="¿Para qué sirven?" chico />
      </div>

      <div className="nv-tarjetas">
        <button type="button" className="nv-tarjeta-general" onClick={alGeneral}>
          <span className="nv-tarjeta-escena__arriba">
            <span className="nv-etiqueta nv-acento">GENERAL</span>
            <span className="nv-espacio" />
            <span className="nv-flecha nv-acento">›</span>
          </span>
          <strong>Toda la pieza</strong>
          <span className="nv-espacio-v" />
          <span className="nv-tenue nv-chico">
            {PRESETS.find((x) => x.id === proyecto.preset)?.nombre ?? 'Sonido de base'}
          </span>
        </button>
        {lista.map((e, i) => {
          const { color } = EMOCIONES[e.emocion];
          const activa = i === sonandoAhora;
          if (e.respiro) {
            return (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                className={`nv-tarjeta-respiro ${activa ? 'nv-activa' : ''} ${agarrada === i ? 'nv-agarrada' : ''}`}
                {...manejadores(i)}
                style={{ ...manejadores(i).style, borderColor: color }}
                onKeyDown={(ev) => ev.key === 'Enter' && alEntrar(e.id)}
              >
                <button
                  type="button"
                  className="nv-quitar"
                  aria-label="Quitar este respiro"
                  title="Quitar este respiro"
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onPointerUp={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    actualizar((p) => quitarRespiro(p, e.id));
                  }}
                >
                  ×
                </button>
                <span className="nv-etiqueta" style={{ color }}>RESPIRO</span>
                <span className="nv-mono nv-tenue">{formatearReloj(duraciones[i] ?? 0)}</span>
                <span className="nv-espacio-v" />
                <span className="nv-tenue nv-italica">sin voz</span>
              </div>
            );
          }
          numero += 1;
          return (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              className={`nv-tarjeta-escena ${activa ? 'nv-activa' : ''} ${agarrada === i ? 'nv-agarrada' : ''}`}
              {...manejadores(i)}
              onKeyDown={(ev) => ev.key === 'Enter' && alEntrar(e.id)}
            >
              <span className="nv-tarjeta-escena__arriba">
                <span className="nv-miniatura" style={{ background: fondoEscena(e) }} />
                <span className="nv-tarjeta-escena__nombre">
                  <span className="nv-mono" style={{ color }}>
                    {numero} · {formatearReloj(duraciones[i] ?? 0)}
                  </span>
                  <strong>{e.nombre}</strong>
                </span>
                <span className="nv-flecha">›</span>
              </span>
              <span className="nv-espacio-v" />
              <span className="nv-tarjeta-escena__abajo">
                <ChipEmocion e={e} />
                {!e.vozUrl && <span className="nv-tenue nv-chico">sin voz</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="nv-tarjeta nv-pieza">
        <div className="nv-campo__fila">
          <strong>Tu pieza</strong>
          <span className="nv-tenue">La voz pone el tiempo · máximo 2:30</span>
          <span className="nv-espacio" />
          <span className={`nv-mono ${queda < 0 ? 'nv-rojo' : 'nv-acento'}`}>
            {queda < 0 ? `te pasaste ${formatearReloj(-queda)}` : `quedan ${formatearReloj(queda)}`}
          </span>
        </div>

        <div className="nv-pieza__rejilla">
          <span ref={cabezal} className="nv-pieza__cabezal" style={{ display: 'none' }} />
          <span className="nv-pieza__etiqueta" />
          <div className="nv-pieza__carril">
            {lista.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="nv-pieza__nombre"
                style={{ width: pct(duraciones[i] ?? 0), color: EMOCIONES[e.emocion].color, background: `${EMOCIONES[e.emocion].color}2e` }}
                onClick={() => void motorAudio.reproducirEscena(i)}
                title="Escuchar solo esta escena"
              >
                {e.nombre}
              </button>
            ))}
          </div>

          <span className="nv-pieza__etiqueta">Voz</span>
          <div className="nv-pieza__carril nv-pieza__carril--voz">
            {lista.map((e, i) => (
              <span key={e.id} className="nv-pieza__tramo" style={{ width: pct(duraciones[i] ?? 0) }}>
                {e.respiro ? (
                  <span className="nv-pieza__linea" />
                ) : e.vozUrl ? (
                  <Onda semilla={e.vozUrl} color={EMOCIONES[e.emocion].color} barras={Math.max(8, Math.round((duraciones[i] ?? 0) * 2))} />
                ) : (
                  <span className="nv-pieza__falta">grabar</span>
                )}
              </span>
            ))}
          </div>

          <span className="nv-pieza__etiqueta">Música</span>
          <div className="nv-pieza__carril nv-pieza__carril--musica">
            {lista.map((e, i) => (
              <span key={e.id} className="nv-pieza__tramo" style={{ width: pct(duraciones[i] ?? 0) }}>
                <span
                  className="nv-pieza__energia"
                  style={{ height: `${20 + intensidadDeEscena(e) * 80}%`, background: EMOCIONES[e.emocion].color }}
                />
              </span>
            ))}
          </div>

          <span className="nv-pieza__etiqueta">Imagen</span>
          <div className="nv-pieza__carril nv-pieza__carril--imagen">
            {lista.map((e, i) => (
              <span key={e.id} className="nv-pieza__tramo" style={{ width: pct(duraciones[i] ?? 0) }}>
                <span className="nv-pieza__foto" style={{ background: fondoEscena(e) }} />
              </span>
            ))}
          </div>

          <span className="nv-pieza__etiqueta" />
          <div className="nv-pieza__tiempos nv-mono">
            {['0:00', '0:30', '1:00', '1:30', '2:00', '2:30'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
