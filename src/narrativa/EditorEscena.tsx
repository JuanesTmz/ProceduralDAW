/**
 * Dentro de una escena: dos pestañas, Música y Visuales, y nada más.
 *
 * A la izquierda queda siempre el riel con todas las escenas, para saltar
 * de una a otra sin volver atrás y sin perder de vista cuáles faltan.
 * Arriba, lo que siente la escena (emoción y fuerza), que mueve las dos
 * cosas a la vez. Debajo, la frase y la barra de tiempo de la escena.
 */
import { useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import {
  buscarEscena,
  EMOCIONES,
  moverRespiro,
  NOMBRE_FUERZA,
  ORDEN_EMOCIONES,
  quitarRespiro,
  recorrido,
} from '../estado/escenas';
import type { Escena, Fuerza } from '../estado/tipos';
import { BarraEscena } from './BarraEscena';
import { ImagenEscena } from './ImagenEscena';
import { MusicaEscena } from './MusicaEscena';
import { useReproduccion } from './useReproduccion';

export type Pestana = 'musica' | 'visual';

interface Props {
  /** El id de la escena, o 'general' para toda la pieza. */
  id: string;
  pestana: Pestana;
  alPestana: (p: Pestana) => void;
  alIr: (id: string) => void;
  alVolver: () => void;
}

export function EditorEscena({ id, pestana, alPestana, alIr, alVolver }: Props) {
  const { proyecto } = useProyecto();
  const general = id === 'general';
  const escena = general ? null : buscarEscena(proyecto, id) ?? null;
  const lista = recorrido(proyecto);
  const indice = escena ? lista.findIndex((e) => e.id === escena.id) : -1;

  if (!general && !escena) {
    return (
      <div className="nv-pagina nv-vacio">
        <p className="nv-sub">Esta escena ya no existe.</p>
        <button type="button" className="nv-boton" onClick={alVolver}>← Escenas</button>
      </div>
    );
  }

  return (
    <div className="nv-editor">
      <Riel actual={id} alIr={alIr} alVolver={alVolver} />
      <div className="nv-editor__cuerpo">
        <div className="nv-cabeza nv-cabeza--editor">
          <Nombre escena={escena} />
          {escena && <Sentir escena={escena} />}
          <span className="nv-espacio" />
          <div className="nv-selector nv-selector--pestanas">
            <button
              type="button"
              className={`nv-selector__op ${pestana === 'musica' ? 'nv-selector__op--activa' : ''}`}
              onClick={() => alPestana('musica')}
            >
              ♫  Música
            </button>
            <button
              type="button"
              className={`nv-selector__op ${pestana === 'visual' ? 'nv-selector__op--activa' : ''}`}
              onClick={() => alPestana('visual')}
            >
              ◐  Visuales
            </button>
          </div>
          {general && <EscucharPieza />}
        </div>
        {escena && (
          <BarraEscena
            escena={escena}
            indice={indice}
            tipos={pestana === 'musica' ? ['sonido', 'silencio'] : ['imagen']}
          />
        )}
        {pestana === 'musica' ? (
          <MusicaEscena escena={escena} indice={indice} />
        ) : (
          <ImagenEscena escena={escena} indice={indice} />
        )}
      </div>
    </div>
  );
}

function EscucharPieza() {
  const { sonando } = useReproduccion();
  return (
    <button
      type="button"
      className="nv-boton nv-boton--primario"
      onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirPieza())}
    >
      {sonando ? '■  Parar' : '▶  Escuchar la pieza'}
    </button>
  );
}

/** Todas las escenas en una columna: se ve cuál está abierta y cuáles ya se tocaron. */
function Riel({ actual, alIr, alVolver }: { actual: string; alIr: (id: string) => void; alVolver: () => void }) {
  const { proyecto } = useProyecto();
  const { seccion } = useReproduccion();
  const lista = recorrido(proyecto);

  return (
    <nav className="nv-riel" aria-label="Escenas">
      <button type="button" className="nv-riel__volver" onClick={alVolver}>
        ← Todas las escenas
      </button>
      <button
        type="button"
        className={`nv-riel__item nv-riel__item--general ${actual === 'general' ? 'nv-riel__item--activo' : ''}`}
        onClick={() => alIr('general')}
      >
        <span className="nv-riel__num">✦</span>
        <span className="nv-riel__texto">
          <strong>General</strong>
          <span className="nv-tenue">toda la pieza</span>
        </span>
      </button>
      {lista.map((e, i) => {
        const { color } = EMOCIONES[e.emocion];
        const numero = proyecto.escenas.findIndex((x) => x.id === e.id) + 1;
        const musica = Boolean(e.niveles || e.gesto || e.reglas || e.cajitas?.some((c) => c.tipo !== 'imagen'));
        const imagen = Boolean(e.gestoVisual || e.golpesVisuales || e.reaccion || e.imagenUrl || e.cajitas?.some((c) => c.tipo === 'imagen'));
        return (
          <button
            key={e.id}
            type="button"
            className={`nv-riel__item ${actual === e.id ? 'nv-riel__item--activo' : ''} ${e.respiro ? 'nv-riel__item--respiro' : ''}`}
            style={{ ['--color' as string]: color }}
            onClick={() => alIr(e.id)}
          >
            <span className="nv-riel__num">{e.respiro ? '·' : numero}</span>
            <span className="nv-riel__texto">
              <strong>{e.respiro ? 'Respiro' : e.nombre}</strong>
              <span className="nv-tenue">
                {EMOCIONES[e.emocion].etiqueta}
                {musica && <span className="nv-riel__marca" title="Música editada"> ♫</span>}
                {imagen && <span className="nv-riel__marca" title="Visual editado"> ◐</span>}
              </span>
            </span>
            {seccion === i && <span className="nv-riel__sonando" aria-label="Sonando" />}
          </button>
        );
      })}
    </nav>
  );
}

function Nombre({ escena }: { escena: Escena | null }) {
  const { proyecto, actualizar } = useProyecto();
  if (!escena) {
    return (
      <div className="nv-dentro__nombre">
        <span className="nv-etiqueta nv-acento">EL SONIDO DE TODA LA PIEZA</span>
        <h1 className="nv-titulo">General</h1>
      </div>
    );
  }
  const { color } = EMOCIONES[escena.emocion];
  const numero = proyecto.escenas.findIndex((e) => e.id === escena.id) + 1;
  return (
    <div className="nv-dentro__nombre">
      <span className="nv-etiqueta" style={{ color }}>
        {escena.respiro ? 'RESPIRO' : `ESCENA ${numero}`}
      </span>
      {escena.respiro ? (
        <h1 className="nv-titulo">Respiro</h1>
      ) : (
        <input
          className="nv-titulo nv-titulo--editable"
          value={escena.nombre}
          aria-label="Nombre de la escena"
          onChange={(ev) =>
            actualizar((p) => {
              const e = buscarEscena(p, escena.id);
              if (e) e.nombre = ev.target.value;
            })
          }
        />
      )}
    </div>
  );
}

/** Emoción y fuerza (o, en un respiro, cuánto dura y dónde va). */
function Sentir({ escena }: { escena: Escena }) {
  const { actualizar } = useProyecto();
  const [abierto, setAbierto] = useState(false);
  const perfil = EMOCIONES[escena.emocion];
  const cambiar = (receta: (e: Escena) => void) =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (e) receta(e);
    });

  return (
    <div className="nv-sentir">
      <div className="nv-desplegable">
        <button
          type="button"
          className="nv-emocion nv-emocion--activa"
          style={{ color: perfil.color, borderColor: perfil.color, background: `${perfil.color}26` }}
          onClick={() => setAbierto(!abierto)}
        >
          <span className="nv-punto" style={{ background: perfil.color }} />
          {perfil.etiqueta} ▾
        </button>
        {abierto && (
          <div className="nv-lista-flotante nv-sentir__emociones">
            {ORDEN_EMOCIONES.map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => {
                  cambiar((e) => (e.emocion = emo));
                  setAbierto(false);
                }}
              >
                <span className="nv-punto" style={{ background: EMOCIONES[emo].color }} />
                {EMOCIONES[emo].etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>
      {escena.respiro ? (
        <>
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={escena.duracionRespiro}
            style={{ accentColor: perfil.color, width: 110 }}
            aria-label="Cuánto dura el respiro"
            onChange={(ev) => cambiar((e) => (e.duracionRespiro = Number(ev.target.value)))}
          />
          <span className="nv-mono nv-chico">{formatearReloj(escena.duracionRespiro)}</span>
          <RespiroAcciones id={escena.id} />
        </>
      ) : (
        <div className="nv-selector nv-selector--chico">
          {([1, 2, 3] as Fuerza[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`nv-selector__op ${f === escena.fuerza ? 'nv-selector__op--activa' : ''}`}
              style={f === escena.fuerza ? { color: perfil.color, background: `${perfil.color}38` } : undefined}
              onClick={() => cambiar((e) => (e.fuerza = f))}
            >
              {NOMBRE_FUERZA[f]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RespiroAcciones({ id }: { id: string }) {
  const { actualizar } = useProyecto();
  return (
    <>
      <button type="button" className="nv-boton nv-boton--chico" onClick={() => actualizar((p) => moverRespiro(p, id, -1))}>
        ←
      </button>
      <button type="button" className="nv-boton nv-boton--chico" onClick={() => actualizar((p) => moverRespiro(p, id, 1))}>
        →
      </button>
      <button type="button" className="nv-boton nv-boton--chico nv-boton--peligro" onClick={() => actualizar((p) => quitarRespiro(p, id))}>
        Quitar
      </button>
    </>
  );
}
