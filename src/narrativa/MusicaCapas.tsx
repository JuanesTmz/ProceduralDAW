// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Las capas de la música, como celdas: una fila de casillas por sonido.
 *
 * Es lo único que hay para editar la música (desde nov. 2026 no hay vista
 * de lista, ni Pad, ni datos): en la prueba con los chicos, lo que más
 * usaron fueron los golpes. Se toca una casilla para poner o quitar un
 * golpe, el nombre de la capa abre los sonidos, y abajo se agrega una capa.
 * Dentro de una escena, cada capa además se enciende o se calla.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import type { Escena } from '../estado/tipos';
import { ID_MELODIA, PISTA_NUEVA } from './VentanaSonidosPistas';
import { PieHerramientas } from './PieHerramientas';
import { usePistas } from './PadMusica';
import { useSolo } from '../componentes/useSolo';
import { CeldasCapas } from './CeldasCapas';

interface Props {
  escena: Escena | null;
  indice: number;
  /** Abre los sonidos, con una capa elegida (o PISTA_NUEVA para agregar una). */
  alSonidos: (pista?: string) => void;
  /** Abre la matriz de notas de la melodía. */
  alNotas: () => void;
}

export function MusicaCapas({ escena, indice, alSonidos, alNotas }: Props) {
  const solo = useSolo(escena ? indice : -1);
  const { actualizar } = useProyecto();
  const pistas = usePistas(escena);

  const alternar = (id: string) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (!e) return;
      const clave = id === ID_MELODIA ? 'melodia' : id;
      if (!e.niveles) {
        // Primera vez: se parte de lo que sonaba, para no apagar las demás.
        e.niveles = {};
        for (const pista of pistas) e.niveles[pista.id === ID_MELODIA ? 'melodia' : pista.id] = pista.suena ? 2 : 0;
      }
      e.niveles[clave] = (e.niveles[clave] ?? 0) > 0 ? 0 : 2;
    });

  const suena = (id: string) => pistas.find((x) => x.id === id)?.suena ?? true;
  const retocada = Boolean(escena && (escena.niveles || (escena.golpes && Object.keys(escena.golpes).length > 0) || escena.notas));

  return (
    <div className="nv-musica nv-musica--sola">
      <div className="nv-tarjeta nv-musica__principal">
        <div className="nv-campo__fila">
          <strong className="nv-subtitulo">{escena ? 'Los golpes de esta escena' : 'Los golpes de toda la pieza'}</strong>
          <span className="nv-tenue nv-chico nv-musica__pista">
            Toca una casilla para poner o quitar un golpe · toca el nombre para cambiar el sonido
          </span>
          <span className="nv-espacio" />
          {escena && retocada && (
            <button
              type="button"
              className="nv-enlace nv-chico"
              onClick={() =>
                actualizar((p) => {
                  const e = buscarEscena(p, escena.id);
                  if (!e) return;
                  e.niveles = undefined;
                  e.golpes = undefined;
                  e.notas = undefined;
                })
              }
              title="Esta escena vuelve a sonar igual que General"
            >
              Volver a como suena toda la pieza
            </button>
          )}
        </div>
        <CeldasCapas
          capas={pistas}
          escenaId={escena?.id ?? null}
          suena={escena ? suena : undefined}
          alSuena={escena ? alternar : undefined}
          alSonidos={alSonidos}
          alNotas={alNotas}
          suenaSolo={solo.suena}
          alSolo={solo.alternar}
        />
        <PieHerramientas alAgregar={() => alSonidos(PISTA_NUEVA)} alSonidos={() => alSonidos()} />
      </div>
    </div>
  );
}
