/**
 * Paso 4: la función. Ver la pieza como se va a presentar.
 *
 * El escenario es el visual generativo de la pieza: sigue a la escena que
 * suena, reacciona al sonido y muestra la frase mientras se dice.
 * «Sin música» deja solo la voz, para oír qué le aporta el sonido al relato.
 */
import { useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion } from '../estado/proyecto';
import { EMOCIONES, recorrido } from '../estado/escenas';
import { Escenario } from './Escenario';
import { descargar, exportarVideo, type Exportacion } from './exportarVideo';
import { useReproduccion } from './useReproduccion';
import { useCuadro } from './useCuadro';

export function PasoFuncion() {
  const { proyecto } = useProyecto();
  const vivo = useRef(proyecto);
  vivo.current = proyecto;
  const [exportando, setExportando] = useState<{ avance: number } | null>(null);
  const exportacion = useRef<Exportacion | null>(null);

  const exportar = async () => {
    setExportando({ avance: 0 });
    const e = exportarVideo(
      () => vivo.current,
      (avance) => setExportando((x) => (x && Math.abs(x.avance - avance) > 0.005 ? { avance } : x)),
    );
    exportacion.current = e;
    const blob = await e.terminado;
    exportacion.current = null;
    setExportando(null);
    if (blob) {
      const nombre = (vivo.current.escenas[0]?.nombre ?? 'pieza').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-');
      descargar(blob, `sonora-${nombre}.webm`);
    }
  };
  const { sonandoPieza: sonando, seccion } = useReproduccion();
  const llenos = useRef<(HTMLSpanElement | null)[]>([]);
  const tramos = useRef<{ inicio: number; fin: number }[]>([]);
  // Las barras se llenan con lo que se oye, cuadro a cuadro.
  useCuadro(() => {
    const progreso = motorAudio.progresoPieza;
    const oye = motorAudio.posicionOida !== null;
    tramos.current.forEach((t, i) => {
      const nodo = llenos.current[i];
      if (!nodo) return;
      const lleno = oye ? Math.max(0, Math.min(1, (progreso - t.inicio) / (t.fin - t.inicio || 1))) : 0;
      nodo.style.width = `${lleno * 100}%`;
    });
  });
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
  tramos.current = duraciones.map((d) => {
    const inicio = acumulado / total;
    acumulado += d;
    return { inicio, fin: acumulado / total };
  });

  const alternarMusica = (silencio: boolean) => {
    setSinMusica(silencio);
    motorAudio.silenciarMusica(silencio);
  };

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-escenario">
        <Escenario escenaFija={lista[0]?.id} />
        <span className="nv-etiqueta nv-escenario__nombre" style={{ color: EMOCIONES[actual.emocion].color }}>
          {sonando ? actual.nombre.toUpperCase() : 'LISTO PARA EMPEZAR'}
        </span>
      </div>

      <div className="nv-progreso">
        {lista.map((e, i) => {
          const d = duraciones[i] ?? 0;
          const color = EMOCIONES[e.emocion].color;
          return (
            <div key={e.id} className="nv-progreso__tramo" style={{ flexGrow: d }}>
              <span className="nv-progreso__barra" style={{ background: `${color}40` }}>
                <span ref={(n) => void (llenos.current[i] = n)} style={{ width: 0, background: color }} />
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
        <button type="button" className="nv-boton nv-boton--suave" data-tour="exportar" disabled={Boolean(exportando)} onClick={() => void exportar()}>
          ⤓  Exportar video
        </button>
      </div>

      {exportando && (
        <div className="nv-exportando">
          <div className="nv-tarjeta nv-exportando__caja">
            <strong className="nv-subtitulo">Grabando tu video…</strong>
            <span className="nv-tenue">La pieza suena entera una vez. No cambies de pantalla hasta que termine.</span>
            <span className="nv-medidor__pista nv-exportando__barra">
              <span className="nv-medidor__lleno" style={{ width: `${Math.round(exportando.avance * 100)}%` }} />
            </span>
            <button type="button" className="nv-boton" onClick={() => exportacion.current?.cancelar()}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
