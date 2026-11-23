// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El armazón de la lección Historia (Figma, Ronda 8): una cabeza propia con
 * salir, «Paso n de 4», las cuatro barras de avance, el equipo y la ayuda; el
 * cuerpo; y un pie con el mensaje de cómo va y el botón para seguir.
 *
 * Cada pantalla pone su pie con <Pie>, que se dibuja en el hueco del pie del
 * armazón: así el mensaje y el botón siempre quedan en el mismo lugar.
 */
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNube } from '../nube/contexto';
import type { Sala } from '../nube/sala';
import { Icono } from './Icono';

export const HuecoPie = createContext<HTMLElement | null>(null);

interface PropsPie {
  mensaje: ReactNode;
  /** Color del mensaje (por defecto, verde). */
  color?: string;
  /** El círculo con el chulo a la izquierda. */
  ok?: boolean;
  /** Algo antes del mensaje (por ejemplo, la pastilla de la emoción). */
  antes?: ReactNode;
  boton: string;
  alTocar: () => void;
  desactivado?: boolean;
}

export function Pie({ mensaje, color, ok = true, antes, boton, alTocar, desactivado }: PropsPie) {
  const hueco = useContext(HuecoPie);
  if (!hueco) return null;
  return createPortal(
    <>
      <span className="nv-lec__mensaje" style={color ? { color } : undefined}>
        {ok && (
          <span className="nv-lec__ok">
            <Icono n="check-bold" tam={15} />
          </span>
        )}
        {antes}
        <span>{mensaje}</span>
      </span>
      <button type="button" className="nv-lec__seguir" onClick={alTocar} disabled={desactivado}>
        {boton}
      </button>
    </>,
    hueco,
  );
}

const COLORES = ['#6ec8ff', '#ff6b81', '#2ee6a8', '#ffd166', '#b182ff', '#ff9f43', '#7d8cff'];

/** Un color fijo para cada nombre: la misma persona siempre se ve igual. */
export function colorDe(nombre: string): string {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES[h % COLORES.length];
}

/** La cara redonda con la inicial. */
export function Inicial({ nombre, tam = 18, gris = false }: { nombre: string; tam?: number; gris?: boolean }) {
  return (
    <span
      className="nv-lec__inicial"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.5), background: gris ? '#2d3244' : colorDe(nombre), color: gris ? '#8b91a5' : '#14171f' }}
      title={nombre}
    >
      {nombre.trim().slice(0, 1).toUpperCase() || '?'}
    </span>
  );
}

/** Quién está usando esta tablet: la persona de la nube o «Equipo». */
export function useAutor(): string {
  return useNube()?.persona.nombre ?? 'Equipo';
}

/** Quiénes del equipo están conectados (fuera de la nube, nadie). */
const NADIE: never[] = [];
const sinSala = { suscribir: () => () => {}, obtener: () => NADIE };

export function useEquipo(): { nombre: string; color: string }[] {
  const sala: Sala | undefined = useNube()?.sala;
  const almacen = sala ? sala.presentes : sinSala;
  const presentes = useSyncExternalStore(almacen.suscribir, almacen.obtener);
  return presentes.map((p) => ({ nombre: p.nombre, color: p.color }));
}

/** Las caras del equipo en la cabeza de la lección. */
export function CarasEquipo() {
  const equipo = useEquipo();
  if (equipo.length === 0) return null;
  return (
    <span className="nv-lec__equipo" title={equipo.map((p) => p.nombre).join(', ')}>
      {equipo.slice(0, 4).map((p, i) => (
        <span key={i} className="nv-lec__cara" style={{ background: p.color }}>
          {p.nombre.slice(0, 2).toUpperCase()}
        </span>
      ))}
      {equipo.length > 4 && <span className="nv-lec__cara nv-lec__cara--mas">+{equipo.length - 4}</span>}
    </span>
  );
}
