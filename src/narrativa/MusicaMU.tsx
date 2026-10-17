/**
 * Lab de Música Urbana: samplear y tocar.
 *
 * Todo es a mano: suena exactamente lo que se dibujó. Cada capa es una
 * fila con su sonido (se toca para cambiarlo), si suena o no en esta
 * escena, su edición de golpes y un ▶ para oírla sola. La intensidad es
 * una sola, la de la escena, y está arriba junto a la emoción.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import { nivelDeCapa } from '../generativo/motorGenerativo';
import type { Escena } from '../estado/tipos';
import { ID_MELODIA } from './VentanaSonidosPistas';
import { BotonSolo, origenSonido, Suena } from './FilaSonido';
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
  alSonidos: (pista: string) => void;
  /** Abre la edición de una capa: sus golpes, o la matriz si es la melodía. */
  alEditar: (pista: string) => void;
  /** Abre la biblioteca de Sonidos para agregar una capa nueva. */
  alAgregar: () => void;
}

const COLOR_MELODIA = '#5fd4ff';

export function MusicaMU({ escena, indice, alSonidos, alEditar, alAgregar }: Props) {
  const solo = useSolo(escena ? indice : -1);
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
            capas={filas}
            suena={escena ? suena : undefined}
            alSuena={escena ? alternar : undefined}
            alSonidos={alSonidos}
            alNotas={() => alEditar(ID_MELODIA)}
            solo={solo.sonando}
            alSolo={solo.alternar}
          />
        ) : (
        <div className="nv-lista-sonidos">
          {filas.map((f, k) => (
            <div key={f.id} className={`nv-fila-son ${suena(f.id) ? '' : 'nv-fila-son--muda'}`}>
              <BotonSolo sonando={solo.sonando === f.id} nombre={f.nombre} alTocar={() => solo.alternar(f.id)} />
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

    </div>
  );
}
