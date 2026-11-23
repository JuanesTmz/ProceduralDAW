// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La línea de la obra, arriba de Música: escuchar toda la obra, la base
 * (lo que suena en todas las escenas) y una tarjeta por escena con la onda
 * de su voz. Cada tarjeta ocupa lo que dura su escena, muestra si ya está
 * lista (✓) o retocada (✎), y por dónde va mientras suena.
 *
 * Se toca para entrar y se arrastra para cambiar el orden. El «+» del final
 * agrega un respiro: un momento sin voz donde la música cuenta sola.
 */
import { useRef } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionPieza, duracionSeccion, formatearReloj } from '../estado/proyecto';
import { agregarRespiro, EMOCIONES, quitarRespiro, recorrido, reordenar } from '../estado/escenas';
import { nombreBase } from '../estado/musica';
import type { Escena } from '../estado/tipos';
import { Caras } from '../nube/Caras';
import { Icono } from './Icono';
import { BotonPista, PistaMano, usePista } from './PistaMano';
import { fijar, useCuadro } from './useCuadro';
import { useOrdenArrastrable } from './useOrdenArrastrable';
import { useReproduccion } from './useReproduccion';
import { Onda } from './VozEscena';

/** El fondo de la miniatura de una escena: su foto, o un degradado de su emoción. */
export function fondoEscena(e: Escena): string {
  if (e.imagenUrl) return `center / cover no-repeat url(${e.imagenUrl})`;
  const c = EMOCIONES[e.emocion].color;
  return `linear-gradient(135deg, #12141c 0%, ${c}88 60%, ${c} 100%)`;
}

/** Si la música de la escena tiene algo propio (golpes, notas o capas calladas). */
export function musicaRetocada(e: Escena): boolean {
  return Boolean(e.niveles || (e.golpes && Object.keys(e.golpes).length > 0) || e.notas);
}

interface Props {
  /** La escena abierta, o 'general' para la base. */
  actual: string;
  alIr: (id: string) => void;
}

export function LineaObra({ actual, alIr }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { sonandoPieza } = useReproduccion();
  const lista = recorrido(proyecto);
  const pista = usePista('escenas-musica', false, 3, '.nv-linea__escena', lista.length > 1);
  const duraciones = proyecto.secciones.map((s) => duracionSeccion(proyecto, s));
  const total = lista.length > 0 ? duracionPieza(proyecto) : 0;
  const reloj = useRef<HTMLSpanElement>(null);
  const cabezales = useRef(new Map<number, HTMLSpanElement>());
  const durRef = useRef(duraciones);
  durRef.current = duraciones;

  // Por dónde va lo que suena, cuadro a cuadro y sin redibujar las tarjetas.
  useCuadro(() => {
    const pos = motorAudio.estaSonando ? motorAudio.posicionOida : null;
    for (const [i, nodo] of cabezales.current) {
      const aqui = pos !== null && pos.indice === i;
      fijar(nodo, 'display', aqui ? 'block' : 'none');
      if (aqui) fijar(nodo, 'left', `${Math.min(100, (pos.segundos / Math.max(0.1, durRef.current[i] ?? 1)) * 100).toFixed(1)}%`);
    }
    const t = motorAudio.claveActiva === 'pieza' ? motorAudio.progresoPieza * total : 0;
    fijar(reloj.current, 'texto', `${formatearReloj(t)} / ${formatearReloj(total)}`);
  });

  const { manejadores, agarrada } = useOrdenArrastrable(
    lista.map((e) => e.id),
    (orden) => actualizar((p) => reordenar(p, orden)),
    alIr,
  );

  const agregar = () => {
    let id = '';
    actualizar((p) => {
      id = agregarRespiro(p, p.escenas.length - 1);
    });
    if (id) alIr(id);
  };

  return (
    <div className="nv-linea" aria-label="La obra">
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca una escena para oír y cambiar su música. Lo que no cambien sigue sonando como la base."
          origen={() => null}
          destinos={() => [[...document.querySelectorAll('.nv-linea__escena:not(.nv-linea__escena--activa)')][0]].filter((e): e is Element => !!e)}
          alCerrar={pista.cerrar}
        />
      )}
      <button
        type="button"
        className={`nv-linea__obra ${sonandoPieza ? 'nv-linea__obra--sonando' : ''}`}
        disabled={lista.length === 0}
        onClick={() => (sonandoPieza ? motorAudio.detener() : void motorAudio.reproducirPieza())}
      >
        <span className="nv-linea__play">
          <Icono n={sonandoPieza ? 'stop-fill' : 'play-fill'} tam={16} />
        </span>
        <span className="nv-linea__obra-textos">
          <strong>Toda la obra</strong>
          <span ref={reloj} className="nv-mono" />
        </span>
      </button>

      <button
        type="button"
        className={`nv-linea__base ${actual === 'general' ? 'nv-linea__base--activa' : ''}`}
        onClick={() => alIr('general')}
        title="La base suena en todas las escenas que no retoquen"
      >
        <span className="nv-linea__base-rotulo">
          <Icono n="star-fill" tam={11} /> BASE
        </span>
        <strong>{nombreBase(proyecto.preset) ?? 'Elige una'}</strong>
        <Caras en={(l) => l.escena === 'general'} />
      </button>

      <div className="nv-linea__escenas">
        {lista.map((e, i) => {
          const { color } = EMOCIONES[e.emocion];
          const numero = proyecto.escenas.findIndex((x) => x.id === e.id) + 1;
          const m = manejadores(i);
          const dur = duraciones[i] ?? 1;
          return (
            <div
              key={e.id}
              role="button"
              tabIndex={0}
              className={`nv-linea__escena ${actual === e.id ? 'nv-linea__escena--activa' : ''} ${agarrada === i ? 'nv-linea__escena--agarrada' : ''} ${e.respiro ? 'nv-linea__escena--respiro' : ''}`}
              {...m}
              style={{ ...m.style, flexGrow: Math.max(1, dur), ['--color' as string]: color }}
              onKeyDown={(ev) => ev.key === 'Enter' && alIr(e.id)}
            >
              {e.respiro && (
                <button
                  type="button"
                  className="nv-linea__quitar"
                  aria-label="Quitar este respiro"
                  title="Quitar este respiro"
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onPointerUp={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    actualizar((p) => quitarRespiro(p, e.id));
                    if (actual === e.id) alIr('general');
                  }}
                >
                  <Icono n="x-bold" tam={10} />
                </button>
              )}
              <span className="nv-linea__fila">
                <span className="nv-linea__num">{e.respiro ? '·' : numero}</span>
                <strong className="nv-linea__nombre">{e.respiro ? 'Respiro' : e.nombre}</strong>
                {e.listaMusica ? (
                  <span className="nv-linea__marca nv-linea__marca--lista" title="Lista">
                    <Icono n="check-bold" tam={11} />
                  </span>
                ) : (
                  musicaRetocada(e) && (
                    <span className="nv-linea__marca" title="Retocada">
                      <Icono n="pencil-simple-fill" tam={11} />
                    </span>
                  )
                )}
                <span className="nv-espacio" />
                <Caras en={(l) => l.escena === e.id} />
                <span className="nv-mono nv-linea__dura">{formatearReloj(dur)}</span>
              </span>
              <span className="nv-linea__onda">
                {e.respiro ? (
                  <span className="nv-linea__solo">solo música</span>
                ) : (
                  <Onda semilla={e.vozUrl ?? e.id} color={e.vozUrl ? color : '#ffffff30'} barras={Math.max(14, Math.round(dur * 2.4))} />
                )}
                <span
                  className="nv-linea__cabezal"
                  style={{ display: 'none' }}
                  ref={(n) => {
                    if (n) cabezales.current.set(i, n);
                    else cabezales.current.delete(i);
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>

      <button type="button" className="nv-linea__mas" onClick={agregar} title="Agregar un respiro: un momento sin voz donde la música cuenta sola" aria-label="Agregar un respiro">
        <Icono n="plus-bold" tam={16} />
      </button>
      <BotonPista clave="escenas-musica" corto />
    </div>
  );
}
