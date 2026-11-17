// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La pestaña Música de una escena, o de toda la pieza (General).
 *
 * En General, arriba, las bases (reggaetón, trap, bachata…) y el tempo.
 * Debajo, las capas como celdas: se tocan para poner y quitar golpes, y el
 * nombre de cada capa abre los sonidos. La melodía abre su matriz.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { aplicarPreset, BASES, hayEscenasRetocadas } from '../estado/musica';
import type { Escena } from '../estado/tipos';
import { VentanaMatriz } from '../componentes/VentanaMatriz';
import { MusicaCapas } from './MusicaCapas';
import { VentanaSonidosPistas } from './VentanaSonidosPistas';

type Herramienta = { tipo: 'melodia' } | { tipo: 'sonidos'; pista?: string };

interface Props {
  escena: Escena | null;
  indice: number;
}

export function MusicaEscena({ escena, indice }: Props) {
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  const cerrar = () => setHerramienta(null);

  return (
    <div className="nv-pestana">
      {!escena && <Bases />}

      <MusicaCapas
        escena={escena}
        indice={indice}
        alSonidos={(pista) => setHerramienta({ tipo: 'sonidos', pista })}
        alNotas={() => setHerramienta({ tipo: 'melodia' })}
      />

      {herramienta?.tipo === 'melodia' && <VentanaMatriz escena={indice} alCerrar={cerrar} />}
      {herramienta?.tipo === 'sonidos' && (
        <VentanaSonidosPistas pista={herramienta.pista} alCerrar={cerrar} />
      )}
    </div>
  );
}

/**
 * Las bases musicales, como tarjetas. Si alguna escena ya tiene golpes
 * propios, cambiar de base los borra: se pide tocar dos veces.
 */
function Bases() {
  const { proyecto, actualizar } = useProyecto();
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const retocadas = hayEscenasRetocadas(proyecto);

  const elegir = (id: string) => {
    if (retocadas && porConfirmar !== id) {
      setPorConfirmar(id);
      window.setTimeout(() => setPorConfirmar((x) => (x === id ? null : x)), 3500);
      return;
    }
    setPorConfirmar(null);
    actualizar((p) => aplicarPreset(p, id));
  };

  return (
    <div className="nv-bases" data-bloqueo="general:ritmo">
      <div className="nv-campo__fila">
        <span className="nv-campo__titulo">Elige una base</span>
        <span className="nv-tenue nv-chico">Suena en toda la pieza. Después la cambias tocando las casillas.</span>
        <span className="nv-espacio" />
        <label className="nv-bases__tempo">
          <span>Velocidad · {proyecto.bpm}</span>
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
      <div className="nv-bases__lista">
        {BASES.map((b) => {
          const activa = proyecto.preset === b.id;
          const confirmar = porConfirmar === b.id;
          return (
            <button
              key={b.id}
              type="button"
              className={`nv-base ${activa ? 'nv-base--activa' : ''} ${confirmar ? 'nv-base--confirmar' : ''}`}
              title={b.descripcion}
              onClick={() => elegir(b.id)}
            >
              <span className="nv-base__icono" aria-hidden="true">{b.icono}</span>
              <strong>{b.nombre}</strong>
              <span className="nv-base__nota">
                {confirmar ? 'Borra los golpes de las escenas. ¿Seguro? Toca otra vez' : activa ? '✓ Sonando' : b.descripcion}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
