/**
 * La ayuda: un solo botón «?» por pantalla (y por ventana).
 *
 * Abre un menú corto con el recorrido guiado de esa pantalla, los videos
 * que tocan ahí y la galería con todos. Así la ayuda está siempre en el
 * mismo sitio y no compite con los botones de trabajo.
 *
 * La primera vez que se entra a una pantalla el recorrido arranca solo;
 * después se repite desde el menú. Lo ya visto se recuerda en este
 * navegador (es una comodidad de quien usa la tablet, no parte del
 * proyecto: empezar de cero no vuelve a mostrar los recorridos).
 */
import { useEffect, useRef, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import type { Track } from '../guia/pasos';
import { MenuFlotante } from './MenuFlotante';
import { pasosDe, type Pantalla, type PasoTour } from './pasosGuia';
import { Tour } from './Tour';
import { VisorTutorial } from './BotonTutorial';

const CLAVE = 'sonora-guia-vista';

/** Los videos, con su nombre corto para el menú (el catálogo se carga solo al abrir uno). */
const NOMBRES: Record<string, string> = {
  narrativa: '¿Qué es narrativa musical?',
  vozcorrida: 'Grabar la voz de corrido',
  respiros: 'Los respiros',
  emocion: 'La emoción cambia la música',
  cajitas: 'Las cajitas',
  golpes: 'Las celdas de golpes',
  matriz: 'La matriz y las escalas',
  instrumento: 'Tu sonido se vuelve instrumento',
  envivo: 'Tocar y grabar en vivo',
  pad: 'El Pad',
  datos: 'Los datos',
  visual: 'El visual reacciona',
};

/** Qué videos tocan en cada pantalla. */
function videosDe(pantalla: Pantalla, track: Track | null): string[] {
  const ia = track === 'ia';
  switch (pantalla) {
    case 'historia':
      return ['narrativa'];
    case 'voz':
      return ['vozcorrida'];
    case 'escenas':
      return ['respiros', 'emocion'];
    case 'escena-musica':
      return ia ? ['emocion', 'pad', 'datos', 'cajitas'] : ['emocion', 'golpes', 'matriz', 'envivo', 'cajitas'];
    case 'escena-visual':
      return ['visual', 'cajitas'];
    case 'ventana-golpes':
      return ['golpes'];
    case 'ventana-matriz':
      return ['matriz', 'instrumento'];
    case 'ventana-pad':
      return ['pad'];
    case 'ventana-sonidos':
      return ['instrumento'];
    case 'ventana-datos':
      return ['datos'];
    default:
      return [];
  }
}

function leerVistas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function marcarVista(clave: string): void {
  try {
    const vistas = leerVistas();
    vistas.add(clave);
    localStorage.setItem(CLAVE, JSON.stringify([...vistas]));
  } catch {
    // Sin almacenamiento la guía sigue funcionando; solo se volverá a ofrecer.
  }
}

/** Solo los pasos cuyo elemento está en pantalla (o que no señalan nada). */
function visibles(pasos: PasoTour[]): PasoTour[] {
  return pasos.filter((p) => !p.objetivo || document.querySelector(p.objetivo));
}

export function Guia({ pantalla }: { pantalla: Pantalla }) {
  const { proyecto } = useProyecto();
  const clave = `${pantalla}:${proyecto.track ?? ''}`;
  const [pasos, setPasos] = useState<PasoTour[] | null>(null);
  const [vista, setVista] = useState(() => leerVistas().has(clave));
  const [menu, setMenu] = useState(false);
  /** El video abierto: un id, 'todos' para la galería, o nada. */
  const [video, setVideo] = useState<string | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const videos = videosDe(pantalla, proyecto.track);

  const recorrido = () => {
    setMenu(false);
    setPasos(visibles(pasosDe(pantalla, proyecto.track)));
  };

  // Al entrar a una pantalla nueva, el recorrido arranca solo si nunca se vio.
  useEffect(() => {
    setPasos(null);
    const yaVista = leerVistas().has(clave);
    setVista(yaVista);
    if (yaVista) return;
    // Espera a que la pantalla termine de armarse para medir bien.
    const t = window.setTimeout(() => setPasos(visibles(pasosDe(pantalla, proyecto.track))), 700);
    return () => window.clearTimeout(t);
  }, [clave, pantalla, proyecto.track]);

  const cerrar = () => {
    setPasos(null);
    marcarVista(clave);
    setVista(true);
  };

  const abrirVideo = (id: string) => {
    setMenu(false);
    setVideo(id);
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={`nv-ayuda ${vista ? '' : 'nv-ayuda--nueva'} ${menu ? 'nv-ayuda--abierta' : ''}`}
        onClick={() => setMenu(!menu)}
        aria-label="Ayuda"
        aria-expanded={menu}
        title="Ayuda"
      >
        ?
      </button>
      {menu && boton.current && (
        <MenuFlotante ancla={boton.current} alCerrar={() => setMenu(false)} className="nv-ayuda__menu">
          <button type="button" className="nv-ayuda__item nv-ayuda__item--principal" onClick={recorrido}>
            <span className="nv-ayuda__icono">◎</span>
            Recorrido guiado
          </button>
          {videos.length > 0 && <span className="nv-ayuda__titulo">Videos</span>}
          {videos.map((id) => (
            <button key={id} type="button" className="nv-ayuda__item" onClick={() => abrirVideo(id)}>
              <span className="nv-ayuda__icono">▶</span>
              {NOMBRES[id] ?? id}
            </button>
          ))}
          <button type="button" className="nv-ayuda__item nv-ayuda__item--todos" onClick={() => abrirVideo('todos')}>
            Ver todos los videos
          </button>
        </MenuFlotante>
      )}
      {video && <VisorTutorial id={video === 'todos' ? undefined : video} alCerrar={() => setVideo(null)} />}
      <Tour pasos={pasos ?? []} abierto={Boolean(pasos && pasos.length > 0)} alCerrar={cerrar} />
    </>
  );
}
