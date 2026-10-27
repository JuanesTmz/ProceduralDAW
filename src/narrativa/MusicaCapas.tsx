/**
 * Las capas de la música: una sola mecánica para todos.
 *
 * Cada capa es una fila con su sonido (se toca para cambiarlo), si suena o
 * no en esta escena, su edición a mano (golpes o notas), su Pad y un ▶ para
 * oírla sola. Las celdas son lo que suena: el Pad las escribe y se retocan
 * a mano. La intensidad es una sola, la de la escena, arriba junto a la emoción.
 * La vista de celdas muestra lo mismo como una rejilla (sin Pad).
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import type { Escena } from '../estado/tipos';
import { COLOR_GRUPO } from '../estado/musica';
import { ID_MELODIA } from './VentanaSonidosPistas';
import { BotonSolo, Suena } from './FilaSonido';
import { PieHerramientas } from './PieHerramientas';
import { MiniPad, usePistas, useDato, VentanaPad, type Pista } from './PadMusica';
import { useSolo } from '../componentes/useSolo';
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
  alSonidos: (pista?: string) => void;
  /** Abre la edición de una capa: sus golpes, o la matriz si es la melodía. */
  alEditar: (pista: string) => void;
  /** Abre la ventana Datos (qué se mueve solo). */
  alDatos: () => void;
  datosActivos: number;
}

export function MusicaCapas({ escena, indice, alSonidos, alEditar, alDatos, datosActivos }: Props) {
  const solo = useSolo(escena ? indice : -1);
  const [vista, setVista] = useState<Vista>(leerVista);
  const [pad, setPad] = useState<string | null>(null);
  const cambiarVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      // Sin almacenamiento solo se olvida la preferencia.
    }
  };
  const { actualizar } = useProyecto();
  const pistas = usePistas(escena);

  const alternar = (id: string) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (!e) return;
      const clave = id === ID_MELODIA ? 'melodia' : id;
      if (!e.niveles) {
        // Primera vez: se parte de lo que sonaba, para no apagar las demás.
        e.niveles = {};
        for (const pista of pistas) e.niveles[pista.id === ID_MELODIA ? 'melodia' : pista.id] = pista.suena ? 2 : 0;
      }
      e.niveles[clave] = (e.niveles[clave] ?? 0) > 0 ? 0 : 2;
    });

  const suena = (id: string) => pistas.find((x) => x.id === id)?.suena ?? true;

  return (
    <div className="nv-musica nv-musica--sola">
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
            capas={pistas}
            escenaId={escena?.id ?? null}
            suena={escena ? suena : undefined}
            alSuena={escena ? alternar : undefined}
            alSonidos={alSonidos}
            alNotas={() => alEditar(ID_MELODIA)}
            suenaSolo={solo.suena}
            alSolo={solo.alternar}
          />
        ) : (
          <div className="nv-lista-sonidos">
            {pistas.map((f, k) => (
              <FilaCapa
                key={f.id}
                pista={f}
                escena={escena}
                primera={k === 0}
                alSonidos={() => alSonidos(f.id)}
                alSuena={() => alternar(f.id)}
                alEditar={() => alEditar(f.id)}
                alPad={() => setPad(f.id)}
                solo={solo.suena(f.id)}
                alSolo={() => solo.alternar(f.id)}
              />
            ))}
          </div>
        )}
        <PieHerramientas alSonidos={() => alSonidos()} alDatos={alDatos} datosActivos={datosActivos} />
      </div>
      {pad && <VentanaPad id={pad} escena={escena} alCerrar={() => setPad(null)} />}
    </div>
  );
}

function FilaCapa({
  pista,
  escena,
  primera,
  alSonidos,
  alSuena,
  alEditar,
  alPad,
  solo,
  alSolo,
}: {
  pista: Pista;
  escena: Escena | null;
  primera: boolean;
  alSonidos: () => void;
  alSuena: () => void;
  alEditar: () => void;
  alPad: () => void;
  solo: boolean;
  alSolo: () => void;
}) {
  const { actualizar } = useProyecto();
  const dato = useDato(pista.id);
  const esMelodia = pista.id === ID_MELODIA;
  return (
    <div className={`nv-fila-son ${pista.suena ? '' : 'nv-fila-son--muda'}`}>
      <BotonSolo sonando={solo} nombre={pista.nombre} alTocar={alSolo} />
      <button
        type="button"
        className="nv-fila-son__elegir"
        style={{ ['--color' as string]: pista.color }}
        onClick={alSonidos}
        title="Cambiar el sonido"
      >
        <span className="nv-fila-son__punto" />
        <span className="nv-fila-son__texto">
          <strong>{pista.nombre}</strong>
          <span>{pista.origen}</span>
        </span>
        <span className="nv-fila-son__flecha">▾</span>
      </button>
      {dato && (
        <span className="nv-fila-son__dato" style={{ color: COLOR_GRUPO[dato.grupo] }}>
          ↯ {dato.etiqueta}
        </span>
      )}
      <span className="nv-espacio" />
      {escena ? (
        <Suena encendido={pista.suena} color={pista.color} alCambiar={alSuena} />
      ) : (
        <label className="nv-fila-son__vol" title="Volumen de esta capa en toda la pieza">
          <span aria-hidden="true">🔈</span>
          <input
            type="range"
            className="nv-fila-son__volumen"
            min={0}
            max={1}
            step={0.01}
            value={pista.volumen}
            aria-label={`Volumen de ${pista.nombre}`}
            style={{ accentColor: pista.color }}
            onChange={(ev) =>
              actualizar((p) => {
                const v = Number(ev.target.value);
                if (esMelodia) p.patron.melodia.volumen = v;
                const x = p.patron.filas.find((y) => y.id === pista.id);
                if (x) x.volumen = v;
              })
            }
          />
        </label>
      )}
      <button
        type="button"
        className="nv-boton nv-boton--chico nv-fila-son__accion"
        data-tour={primera ? 'editar' : undefined}
        onClick={alEditar}
      >
        {esMelodia ? '✎ Notas' : '✎ Golpes'}
      </button>
      <button
        type="button"
        className={`nv-boton nv-boton--chico nv-fila-son__accion ${pista.propia ? 'nv-fila-son__accion--propia' : ''}`}
        title={pista.propia ? 'Celdas propias de esta escena' : 'Abrir el pad'}
        onClick={alPad}
      >
        <MiniPad x={pista.golpes} y={pista.azar} color={pista.color} />
        Pad
      </button>
    </div>
  );
}
