/**
 * La pestaña Música de una escena, o de toda la pieza (General).
 *
 * Arriba, las herramientas a un toque: Sonidos (con qué suena cada pista),
 * Datos (solo IA: qué se mueve solo), y la edición fina de golpes y
 * melodía. Debajo, la mecánica del lab: IA arma con reglas (tiras y
 * cuadro), Música Urbana samplea y toca (capas y tocar en vivo).
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
import { VentanaSonidosPistas } from './VentanaSonidosPistas';

type Herramienta = { tipo: 'golpes' } | { tipo: 'melodia' } | { tipo: 'datos' } | { tipo: 'sonidos'; pista?: string };

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
      <div className="nv-herramientas">
        <button type="button" className="nv-herramienta" data-tour="sonidos" onClick={() => alSonidos()}>
          <span className="nv-herramienta__icono">♪</span>
          <span>
            <strong>Sonidos</strong>
            <span className="nv-tenue nv-chico">biblioteca y tus efectos</span>
          </span>
        </button>
        {esIA && (
          <button type="button" className="nv-herramienta nv-herramienta--ia" data-tour="datos" onClick={() => setHerramienta({ tipo: 'datos' })}>
            <span className="nv-herramienta__icono">↯</span>
            <span>
              <strong>Datos</strong>
              <span className="nv-tenue nv-chico">
                {datosActivos === 0 ? 'nada se mueve solo' : `${datosActivos} ${datosActivos === 1 ? 'parámetro se mueve' : 'parámetros se mueven'} solos`}
              </span>
            </span>
          </button>
        )}
        <span className="nv-espacio" />
        <span className="nv-herramientas__editar" data-tour="editar">
          <button type="button" className="nv-boton nv-boton--suave" onClick={() => setHerramienta({ tipo: 'golpes' })}>
            Editar golpes a mano
          </button>
          <button type="button" className="nv-boton nv-boton--suave" onClick={() => setHerramienta({ tipo: 'melodia' })}>
            Editar melodía
          </button>
        </span>
      </div>

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
        </div>
      )}

      {esIA ? (
        <MusicaIA escena={escena} alSonidos={alSonidos} />
      ) : (
        <MusicaMU escena={escena} indice={indice} alSonidos={alSonidos} />
      )}

      {herramienta?.tipo === 'golpes' && <VentanaGolpes alCerrar={cerrar} />}
      {herramienta?.tipo === 'melodia' && <VentanaMatriz alCerrar={cerrar} />}
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
