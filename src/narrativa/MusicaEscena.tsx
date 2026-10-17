/**
 * La pestaña Música de una escena, o de toda la pieza (General).
 *
 * Arriba, las herramientas a un toque: Sonidos (con qué suena cada pista)
 * y Datos (solo IA: qué se mueve solo). Debajo, la mecánica del lab: IA
 * arma con reglas (un pad por sonido), Música Urbana dibuja a mano y toca
 * en vivo (la edición de golpes y notas va en cada capa).
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { aplicarPreset, PRESETS } from '../estado/musica';
import type { Escena } from '../estado/tipos';
import { VentanaGolpes } from '../componentes/VentanaGolpes';
import { VentanaMatriz } from '../componentes/VentanaMatriz';
import { Ventana } from '../componentes/Ventana';
import { MusicaIA, parametrosMusica } from './MusicaIA';
import { MusicaMU } from './MusicaMU';
import { ParametrosDatos } from './ParametrosDatos';
import { ID_MELODIA, PISTA_NUEVA, VentanaSonidosPistas } from './VentanaSonidosPistas';

type Herramienta = { tipo: 'golpes'; pista?: string } | { tipo: 'melodia' } | { tipo: 'datos' } | { tipo: 'sonidos'; pista?: string };

interface Props {
  escena: Escena | null;
  indice: number;
}

export function MusicaEscena({ escena, indice }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  const esIA = proyecto.track === 'ia';
  const cerrar = () => setHerramienta(null);
  const alSonidos = (pista?: string) => setHerramienta({ tipo: 'sonidos', pista });
  const datosActivos = proyecto.conexiones.length;

  return (
    <div className="nv-pestana">
      {/* En Música Urbana los sonidos se agregan desde el pie de las capas. */}
      {esIA && (
      <div className="nv-herramientas">
        <button type="button" className="nv-herramienta" data-tour="sonidos" onClick={() => alSonidos()}>
          <span className="nv-herramienta__icono">♪</span>
          <span>
            <strong>Sonidos</strong>
            <span className="nv-tenue nv-chico">biblioteca y tus efectos</span>
          </span>
        </button>
        <button type="button" className="nv-herramienta nv-herramienta--ia" data-tour="datos" onClick={() => setHerramienta({ tipo: 'datos' })}>
            <span className="nv-herramienta__icono">↯</span>
            <span>
              <strong>Datos</strong>
              <span className="nv-tenue nv-chico">
                {datosActivos === 0 ? 'nada se mueve solo' : `${datosActivos} ${datosActivos === 1 ? 'parámetro se mueve' : 'parámetros se mueven'} solos`}
              </span>
            </span>
          </button>
      </div>
      )}

      {!escena && (
        <div className="nv-presets">
          <span className="nv-campo__titulo">Punto de partida</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`nv-preset ${proyecto.preset === p.id ? 'nv-preset--activo' : ''}`}
              title={p.descripcion}
              onClick={() => actualizar((borrador) => aplicarPreset(borrador, p.id))}
            >
              <strong>{p.nombre}</strong>
              <span>{p.descripcion}</span>
            </button>
          ))}
          <label className="nv-preset nv-preset--tempo">
            <strong>Tempo · {proyecto.bpm}</strong>
            <input
              type="range"
              min={60}
              max={140}
              step={1}
              value={proyecto.bpm}
              onChange={(ev) => actualizar((p) => (p.bpm = Number(ev.target.value)))}
            />
          </label>
          {!esIA && (
            <label className="nv-preset nv-preset--tempo">
              <strong>Swing · {proyecto.swing < 0.05 ? 'cuadrado' : proyecto.swing < 0.3 ? 'suelto' : 'cojo'}</strong>
              <input
                type="range"
                min={0}
                max={0.6}
                step={0.01}
                value={proyecto.swing}
                onChange={(ev) => actualizar((p) => (p.swing = Number(ev.target.value)))}
              />
            </label>
          )}
        </div>
      )}

      {esIA ? (
        <MusicaIA escena={escena} alSonidos={alSonidos} alNotas={() => setHerramienta({ tipo: 'melodia' })} />
      ) : (
        <MusicaMU
          escena={escena}
          indice={indice}
          alSonidos={alSonidos}
          alEditar={(pista) => setHerramienta(pista === ID_MELODIA ? { tipo: 'melodia' } : { tipo: 'golpes', pista })}
          alAgregar={() => alSonidos(PISTA_NUEVA)}
        />
      )}

      {herramienta?.tipo === 'golpes' && <VentanaGolpes inicial={herramienta.pista} escena={indice} alCerrar={cerrar} />}
      {herramienta?.tipo === 'melodia' && <VentanaMatriz escena={indice} alCerrar={cerrar} />}
      {herramienta?.tipo === 'sonidos' && <VentanaSonidosPistas pista={herramienta.pista} alCerrar={cerrar} />}
      {herramienta?.tipo === 'datos' && (
        <Ventana
          titulo="Datos"
          guia="ventana-datos"
          nota="Elige qué parámetros se mueven solos con un dato. Valen para toda la pieza."
          ancha
          alCerrar={cerrar}
        >
          <div className="nv nv--incrustado">
            <ParametrosDatos clave="conexiones" grupos={parametrosMusica(proyecto, actualizar)} />
          </div>
        </Ventana>
      )}
    </div>
  );
}
