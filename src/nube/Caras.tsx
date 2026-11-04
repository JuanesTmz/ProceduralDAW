// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Presencia: las caras de quienes están en un lugar de la app (un paso, una
 * escena, una pestaña), como los avatares de Figma. Fuera de la nube no
 * muestra nada, así que se puede poner en cualquier componente.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useNube } from './contexto';
import { usePresentes, type Lugar, type Sala } from './sala';
import type { TipoBloqueo } from './bloqueos';

interface Props {
  /** Qué lugares cuentan. */
  en: (lugar: Lugar) => boolean;
  /** Cuántas caras antes del «+N». */
  maximo?: number;
}

export function Caras(props: Props) {
  const nube = useNube();
  return nube ? <CarasEnSala sala={nube.sala} {...props} /> : null;
}

function CarasEnSala({ sala, en, maximo = 3 }: Props & { sala: Sala }) {
  const aqui = usePresentes(sala).filter((p) => !p.yo && p.lugar && en(p.lugar));
  if (aqui.length === 0) return null;
  return (
    <span className="nu-caras nu-caras--lugar" title={aqui.map((p) => p.nombre).join(', ')}>
      {aqui.slice(0, maximo).map((p) => (
        <span key={p.id} className="nu-avatar nu-avatar--mini nu-cara" style={{ background: p.color }}>
          {p.nombre.charAt(0).toUpperCase()}
        </span>
      ))}
      {aqui.length > maximo && <span className="nu-cara nu-cara--mas nu-cara--mini">+{aqui.length - maximo}</span>}
    </span>
  );
}

/**
 * Para que los demás vean qué ventana de edición tiene abierta esta persona
 * (`golpes:<pista>`, `pad:<pista>`, `notas`, `sonidos:<pista>`, `datos`).
 * Solo avisa: los demás pueden abrir la misma ventana y ver la edición en vivo.
 */
export function useEnVentana(ventana: string | null) {
  const sala = useNube()?.sala;
  useEffect(() => {
    if (!sala || !ventana) return;
    sala.cambiarVentana(ventana);
    return () => sala.cambiarVentana(null);
  }, [sala, ventana]);
}

/** Para avisarle a la sala dónde está esta persona. */
export function useLugar(lugar: Lugar) {
  const sala = useNube()?.sala;
  const { paso, escena, pestana } = lugar;
  useEffect(() => {
    sala?.cambiarLugar({ paso, escena, pestana });
  }, [sala, paso, escena, pestana]);
}

const nada = () => () => {};

/**
 * Retiene una pieza mientras `activo` sea cierto (por ejemplo, mientras se
 * graba). Devuelve el nombre de quien la tiene si es otra persona.
 */
export function useBloqueoMientras(clave: string, activo: boolean, tipo: TipoBloqueo = 'voz'): string | null {
  const bloqueos = useNube()?.sala.bloqueos;
  useEffect(() => {
    if (!bloqueos || !activo) return;
    bloqueos.tomar(clave, tipo);
    return () => bloqueos.soltar(clave, tipo);
  }, [bloqueos, clave, activo, tipo]);
  return useSyncExternalStore(bloqueos?.suscribir ?? nada, () => bloqueos?.ajeno(clave)?.nombre ?? null);
}
