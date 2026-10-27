/**
 * La pestaña Música de una escena, o de toda la pieza (General).
 *
 * Las capas (cada una con su Pad, sus celdas y su sonido), y abajo a la derecha
 * las herramientas: Sonidos y Datos. El Pad escribe las celdas y las celdas se
 * retocan a mano.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { aplicarPreset, PRESETS } from '../estado/musica';
import type { Escena } from '../estado/tipos';
import { VentanaGolpes } from '../componentes/VentanaGolpes';
import { VentanaMatriz } from '../componentes/VentanaMatriz';
import { Ventana } from '../componentes/Ventana';
import { MusicaCapas } from './MusicaCapas';
import { parametrosMusica } from './PadMusica';
import { ParametrosDatos } from './ParametrosDatos';
import { ID_MELODIA, VentanaSonidosPistas } from './VentanaSonidosPistas';

type Herramienta = { tipo: 'golpes'; pista?: string } | { tipo: 'melodia' } | { tipo: 'datos' } | { tipo: 'sonidos'; pista?: string };

interface Props {
  escena: Escena | null;
  indice: number;
}

export function MusicaEscena({ escena, indice }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  const cerrar = () => setHerramienta(null);
  const alSonidos = (pista?: string) => setHerramienta({ tipo: 'sonidos', pista });
  const datosActivos = proyecto.conexiones.length;

  return (
    <div className="nv-pestana">
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
          {(
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

      <MusicaCapas
        escena={escena}
        indice={indice}
        alSonidos={alSonidos}
        alEditar={(pista) => setHerramienta(pista === ID_MELODIA ? { tipo: 'melodia' } : { tipo: 'golpes', pista })}
        alDatos={() => setHerramienta({ tipo: 'datos' })}
        datosActivos={datosActivos}
      />

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
          <div className="nv nv--incrustado nv-datos-ventana">
            <ParametrosDatos clave="conexiones" grupos={parametrosMusica(proyecto, actualizar)} />
          </div>
        </Ventana>
      )}
    </div>
  );
}
