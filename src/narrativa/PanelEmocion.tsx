// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Lo que siente la escena, abajo a la izquierda (en Música y en Visuales).
 *
 * La emoción elegida va en grande, con lo que le hace al sonido o a la
 * imagen; las otras cinco quedan a un toque, y la fuerza son tres barritas.
 * En un respiro, en vez de la fuerza va cuánto dura y moverlo de lugar.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import { buscarEscena, EMOCIONES, moverRespiro, NOMBRE_FUERZA, ORDEN_EMOCIONES } from '../estado/escenas';
import type { Emocion, Escena, Fuerza } from '../estado/tipos';
import { Icono, type NombreIcono } from './Icono';

export const ICONO_EMOCION: Record<Emocion, NombreIcono> = {
  calma: 'leaf-fill',
  alegria: 'sun-fill',
  tension: 'lightning-fill',
  nostalgia: 'moon-fill',
  misterio: 'eye-fill',
  euforia: 'fire-fill',
};

const COMO_SUENA: Record<Emocion, string> = {
  calma: 'lenta y suave',
  alegria: 'brillante y saltarina',
  tension: 'oscura y apurada',
  nostalgia: 'dulce y lejana',
  misterio: 'grave, en suspenso',
  euforia: 'a tope, todo explota',
};

const COMO_SE_VE: Record<Emocion, string> = {
  calma: 'quieta y de colores fríos',
  alegria: 'viva y de colores cálidos',
  tension: 'tiembla y se mueve brusca',
  nostalgia: 'lenta y de colores gastados',
  misterio: 'sombras que se mueven',
  euforia: 'explota de color',
};

interface Props {
  escena: Escena;
  /** En Música dice cómo suena; en Visuales, cómo se ve. */
  para: 'musica' | 'visual';
}

export function PanelEmocion({ escena, para }: Props) {
  const { actualizar } = useProyecto();
  const perfil = EMOCIONES[escena.emocion];
  const cambiar = (receta: (e: Escena) => void) =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (e) receta(e);
    });

  return (
    <div className="nv-emo" style={{ ['--color' as string]: perfil.color }} data-bloqueo={`escena:${escena.id}:sentir`}>
      <div className="nv-emo__elegida">
        <span className="nv-emo__icono">
          <Icono n={ICONO_EMOCION[escena.emocion]} tam={22} />
        </span>
        <span className="nv-emo__textos">
          <strong>{perfil.etiqueta}</strong>
          <span>{(para === 'musica' ? COMO_SUENA : COMO_SE_VE)[escena.emocion]}</span>
        </span>
      </div>
      <span className="nv-emo__separa" aria-hidden="true" />
      <div className="nv-emo__otras" role="group" aria-label="Cambiar la emoción">
        {ORDEN_EMOCIONES.filter((e) => e !== escena.emocion).map((e) => (
          <button
            key={e}
            type="button"
            className="nv-emo__otra"
            style={{ ['--c' as string]: EMOCIONES[e].color }}
            onClick={() => cambiar((x) => (x.emocion = e))}
            title={`${EMOCIONES[e].etiqueta}: ${(para === 'musica' ? COMO_SUENA : COMO_SE_VE)[e]}`}
          >
            <span className="nv-emo__circulo">
              <Icono n={ICONO_EMOCION[e]} tam={15} />
            </span>
            <span className="nv-emo__nombre">{EMOCIONES[e].etiqueta}</span>
          </button>
        ))}
      </div>
      <span className="nv-emo__separa" aria-hidden="true" />
      {escena.respiro ? (
        <div className="nv-emo__respiro">
          <span className="nv-emo__rotulo">DURA {formatearReloj(escena.duracionRespiro)}</span>
          <input
            type="range"
            min={2}
            max={20}
            step={1}
            value={escena.duracionRespiro}
            aria-label="Cuánto dura el respiro"
            onChange={(ev) => cambiar((e) => (e.duracionRespiro = Number(ev.target.value)))}
          />
          <span className="nv-emo__respiro-botones">
            <button type="button" className="nv-boton nv-boton--chico" onClick={() => actualizar((p) => moverRespiro(p, escena.id, -1))} aria-label="Mover antes">
              <Icono n="caret-left-bold" tam={12} />
            </button>
            <button type="button" className="nv-boton nv-boton--chico" onClick={() => actualizar((p) => moverRespiro(p, escena.id, 1))} aria-label="Mover después">
              <Icono n="caret-right-bold" tam={12} />
            </button>
          </span>
        </div>
      ) : (
        <div className="nv-emo__fuerza" role="group" aria-label="Fuerza de la escena">
          <span className="nv-emo__rotulo">FUERZA</span>
          <span className="nv-emo__barras">
            {([1, 2, 3] as Fuerza[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`nv-emo__nivel ${f === escena.fuerza ? 'nv-emo__nivel--activo' : ''}`}
                aria-pressed={f === escena.fuerza}
                title={NOMBRE_FUERZA[f]}
                onClick={() => cambiar((e) => (e.fuerza = f))}
              >
                {[1, 2, 3].map((b) => (
                  <span key={b} className={b <= f ? 'nv-emo__barra--on' : ''} style={{ height: 3 + b * 4 }} />
                ))}
              </button>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
