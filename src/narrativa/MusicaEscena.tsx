/**
 * La música de una escena, o de toda la pieza (la tarjeta General).
 *
 * Lo que hay adentro depende del lab: IA dirige con datos (conexiones) y
 * Música Urbana samplea y toca (capas, «Máquina», tocar en vivo). Las dos
 * comparten el punto de partida —el preset, que se elige en General— y las
 * herramientas de edición fina: la grilla de golpes y la matriz de melodía.
 */
import { useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena, EMOCIONES, recorrido } from '../estado/escenas';
import { aplicarPreset, PRESETS } from '../estado/musica';
import { VentanaGolpes } from '../componentes/VentanaGolpes';
import { VentanaMatriz } from '../componentes/VentanaMatriz';
import { VentanaSonidos } from '../componentes/VentanaSonidos';
import { MusicaIA } from './MusicaIA';
import { MusicaMU } from './MusicaMU';
import { useReproduccion } from './useReproduccion';

export type Herramienta = 'golpes' | 'melodia' | 'sonidos';

interface Props {
  /** El id de la escena, o 'general' para toda la pieza. */
  id: string;
  alVolver: () => void;
}

export function MusicaEscena({ id, alVolver }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { sonando } = useReproduccion();
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  const general = id === 'general';
  const escena = general ? null : buscarEscena(proyecto, id) ?? null;
  const lista = recorrido(proyecto);
  const indice = escena ? lista.findIndex((e) => e.id === escena.id) : -1;
  const esIA = proyecto.track === 'ia';
  const color = escena ? EMOCIONES[escena.emocion].color : '#ffb020';

  const escuchar = () => {
    if (sonando) motorAudio.detener();
    else if (escena) void motorAudio.reproducirEscena(indice);
    else void motorAudio.reproducirPieza();
  };

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-cabeza">
        <button type="button" className="nv-boton" onClick={alVolver}>
          ← {escena ? (escena.respiro ? 'Respiro' : escena.nombre) : 'Escenas'}
        </button>
        <div className="nv-dentro__nombre">
          <span className="nv-etiqueta" style={{ color }}>
            {escena ? 'MÚSICA DE LA ESCENA' : 'MÚSICA DE TODA LA PIEZA'}
          </span>
          <h1 className="nv-titulo">{escena ? (escena.respiro ? 'Respiro' : escena.nombre) : 'General'}</h1>
        </div>
        <span className="nv-espacio" />
        <button type="button" className="nv-boton" onClick={escuchar}>
          {sonando ? '■  Parar' : escena ? '▶  Escuchar esta escena' : '▶  Escuchar la pieza'}
        </button>
      </div>

      {general && (
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
        </div>
      )}

      {esIA ? (
        <MusicaIA escena={escena} indice={indice} alAbrir={setHerramienta} />
      ) : (
        <MusicaMU escena={escena} indice={indice} alAbrir={setHerramienta} />
      )}

      {herramienta === 'golpes' && <VentanaGolpes alCerrar={() => setHerramienta(null)} />}
      {herramienta === 'melodia' && <VentanaMatriz alCerrar={() => setHerramienta(null)} />}
      {herramienta === 'sonidos' && <VentanaSonidos alCerrar={() => setHerramienta(null)} />}
    </div>
  );
}
