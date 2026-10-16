/**
 * Paso 4: la función. Ver la pieza como se va a presentar.
 *
 * En esta fase el escenario muestra la foto de la escena que suena (o su
 * color) y su frase. El visual generativo y reactivo entra en la fase 3.
 * «Sin música» deja solo la voz, para oír qué le aporta el sonido al relato.
 */
import { useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion } from '../estado/proyecto';
import { EMOCIONES, recorrido } from '../estado/escenas';
import { fondoEscena } from './PasoEscenas';
import { useReproduccion } from './useReproduccion';

export function PasoFuncion() {
  const { proyecto } = useProyecto();
  const { sonando, seccion, progreso } = useReproduccion();
  const [sinMusica, setSinMusica] = useState(motorAudio.musicaSilenciada);
  const lista = recorrido(proyecto);
  const actual = lista[seccion] ?? lista[0];

  if (!actual) {
    return (
      <div className="nv-pagina nv-vacio">
        <h1 className="nv-titulo">Función</h1>
        <p className="nv-sub">Cuando tengas escenas, aquí ves la pieza completa.</p>
      </div>
    );
  }

  const duraciones = proyecto.secciones.map((s) => duracionSeccion(proyecto, s));
  const total = duraciones.reduce((a, b) => a + b, 0) || 1;
  let acumulado = 0;

  const alternarMusica = (silencio: boolean) => {
    setSinMusica(silencio);
    motorAudio.silenciarMusica(silencio);
  };

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-escenario" style={{ background: fondoEscena(actual) }}>
        <div className="nv-escenario__velo" />
        <p className="nv-escenario__texto">
          {actual.respiro ? '' : sonando ? actual.texto : lista.find((e) => !e.respiro)?.texto}
        </p>
        <span className="nv-etiqueta" style={{ color: EMOCIONES[actual.emocion].color }}>
          {sonando ? actual.nombre.toUpperCase() : 'LISTO PARA EMPEZAR'}
        </span>
      </div>

      <div className="nv-progreso">
        {lista.map((e, i) => {
          const d = duraciones[i] ?? 0;
          const inicio = acumulado / total;
          acumulado += d;
          const fin = acumulado / total;
          const lleno = sonando ? Math.max(0, Math.min(1, (progreso - inicio) / (fin - inicio))) : 0;
          const color = EMOCIONES[e.emocion].color;
          return (
            <div key={e.id} className="nv-progreso__tramo" style={{ flexGrow: d }}>
              <span className="nv-progreso__barra" style={{ background: `${color}40` }}>
                <span style={{ width: `${lleno * 100}%`, background: color }} />
              </span>
              <span className="nv-chico" style={{ color: i === seccion ? color : undefined }}>
                {e.nombre}
              </span>
            </div>
          );
        })}
      </div>

      <div className="nv-pie">
        <button
          type="button"
          className="nv-boton nv-boton--primario"
          onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirPieza())}
        >
          {sonando ? '■  Parar' : '▶  Ver la pieza'}
        </button>
        <div className="nv-selector">
          <button
            type="button"
            className={`nv-selector__op ${!sinMusica ? 'nv-selector__op--activa' : ''}`}
            onClick={() => alternarMusica(false)}
          >
            Con música
          </button>
          <button
            type="button"
            className={`nv-selector__op ${sinMusica ? 'nv-selector__op--activa' : ''}`}
            onClick={() => alternarMusica(true)}
          >
            Sin música
          </button>
        </div>
        <span className="nv-espacio" />
        <button type="button" className="nv-boton" disabled title="Llega en una fase próxima">
          ⤓  Exportar video
        </button>
      </div>
    </div>
  );
}
