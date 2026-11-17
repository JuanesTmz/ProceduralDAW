// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La ayuda: un solo botón «?» por pantalla (y por ventana).
 *
 * Desde nov. 2026 lo primero son los tutoriales en video: en la prueba nadie
 * leyó el recorrido guiado (todos tocaban «Saltar»), así que la primera vez
 * que se entra a una parte se abre su tutorial, que muestra la interfaz de
 * verdad en movimiento. El «?» lista los tutoriales de esa parte, la galería
 * con todos y, al final, el recorrido guiado escrito: sigue ahí para quien
 * lo busque, pero ya no arranca solo.
 *
 * Lo ya visto se recuerda en este navegador (es una comodidad de quien usa
 * la tablet, no parte del proyecto).
 */
import { useEffect, useRef, useState } from 'react';
import { MenuFlotante } from './MenuFlotante';
import { pasosDe, type Pantalla, type PasoTour } from './pasosGuia';
import { VisorTutorial } from './BotonTutorial';
import { Tour } from './Tour';

const CLAVE = 'sonora-videos-vistos';

/** Los tutoriales, con su nombre corto para el menú (el catálogo se carga solo al abrir uno). */
const NOMBRES: Record<string, string> = {
  historia: 'Escribe tu historia',
  voz: 'Graba tu voz',
  musica: 'La música: base y golpes',
  sonidos: 'Cambiar y grabar sonidos',
  mezcla: 'La mezcla',
  narrativa: '¿Qué es narrativa sonora?',
  respiros: 'Los respiros',
  emocion: 'La emoción cambia la música',
  cajitas: 'Las cajitas',
  golpes: 'Las celdas de golpes',
  matriz: 'La matriz y las escalas',
  instrumento: 'Tu sonido se vuelve instrumento',
  visuales: 'Visuales: fotos y cajitas',
  visual: 'El visual reacciona',
};

/** Qué tutoriales tocan en cada pantalla. El primero se abre solo la primera vez. */
function videosDe(pantalla: Pantalla): string[] {
  switch (pantalla) {
    case 'historia':
      return ['historia', 'narrativa'];
    case 'voz':
      return ['voz'];
    case 'escenas':
      return ['emocion', 'respiros'];
    case 'escena-musica':
      return ['musica', 'sonidos', 'mezcla', 'matriz', 'cajitas'];
    case 'escena-visual':
      return ['visuales', 'visual', 'cajitas'];
    case 'ventana-golpes':
      return ['golpes'];
    case 'ventana-matriz':
      return ['matriz', 'instrumento'];
    case 'ventana-sonidos':
      return ['sonidos', 'instrumento'];
    case 'ventana-datos':
      return ['visual'];
    case 'ventana-mezcla':
      return ['mezcla'];
    default:
      return [];
  }
}

function leerVistos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** Solo los pasos cuyo elemento está en pantalla (o que no señalan nada). */
function visibles(pasos: PasoTour[]): PasoTour[] {
  return pasos.filter((p) => !p.objetivo || document.querySelector(p.objetivo));
}

function marcarVisto(clave: string): void {
  try {
    const vistos = leerVistos();
    vistos.add(clave);
    localStorage.setItem(CLAVE, JSON.stringify([...vistos]));
  } catch {
    // Sin almacenamiento la ayuda sigue funcionando; solo se volverá a abrir.
  }
}

export function Guia({ pantalla }: { pantalla: Pantalla }) {
  const videos = videosDe(pantalla);
  const [visto, setVisto] = useState(() => leerVistos().has(pantalla));
  const [menu, setMenu] = useState(false);
  /** El tutorial abierto: un id, 'todos' para la galería, o nada. */
  const [video, setVideo] = useState<string | null>(null);
  /** El recorrido escrito, solo cuando se pide desde el menú. */
  const [pasos, setPasos] = useState<PasoTour[] | null>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // La primera vez que se entra a una parte, su tutorial se abre solo.
  useEffect(() => {
    setVideo(null);
    setPasos(null);
    const yaVisto = leerVistos().has(pantalla);
    setVisto(yaVisto);
    const primero = videosDe(pantalla)[0];
    if (yaVisto || !primero) return;
    const t = window.setTimeout(() => {
      // Si otro tutorial ya está abierto (una ventana sobre otra), no se apilan.
      if (document.querySelector('.tu-ventana')) return;
      setVideo(primero);
      marcarVisto(pantalla);
      setVisto(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, [pantalla]);

  const abrir = (id: string) => {
    setMenu(false);
    setVideo(id);
    marcarVisto(pantalla);
    setVisto(true);
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={`nv-ayuda ${visto ? '' : 'nv-ayuda--nueva'} ${menu ? 'nv-ayuda--abierta' : ''}`}
        onClick={() => setMenu(!menu)}
        aria-label="Tutoriales"
        aria-expanded={menu}
        title="Tutoriales"
      >
        ?
      </button>
      {menu && boton.current && (
        <MenuFlotante ancla={boton.current} alCerrar={() => setMenu(false)} className="nv-ayuda__menu">
          {videos.length > 0 && <span className="nv-ayuda__titulo">Tutoriales de esta parte</span>}
          {videos.map((id, i) => (
            <button
              key={id}
              type="button"
              className={`nv-ayuda__item ${i === 0 ? 'nv-ayuda__item--principal' : ''}`}
              onClick={() => abrir(id)}
            >
              <span className="nv-ayuda__icono">▶</span>
              {NOMBRES[id] ?? id}
            </button>
          ))}
          <button type="button" className="nv-ayuda__item nv-ayuda__item--todos" onClick={() => abrir('todos')}>
            Ver todos los tutoriales
          </button>
          {pasosDe(pantalla).length > 0 && (
            <button
              type="button"
              className="nv-ayuda__item"
              onClick={() => {
                setMenu(false);
                setPasos(visibles(pasosDe(pantalla)));
              }}
            >
              <span className="nv-ayuda__icono">◎</span>
              Recorrido guiado (escrito)
            </button>
          )}
        </MenuFlotante>
      )}
      {video && <VisorTutorial id={video === 'todos' ? undefined : video} alCerrar={() => setVideo(null)} />}
      <Tour pasos={pasos ?? []} abierto={Boolean(pasos && pasos.length > 0)} alCerrar={() => setPasos(null)} />
    </>
  );
}
