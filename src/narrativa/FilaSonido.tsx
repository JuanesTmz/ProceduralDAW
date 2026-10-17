/**
 * Piezas compartidas por las filas de sonidos de los dos labs: de dónde
 * viene el sonido (para nombrarlo de verdad) y el interruptor «suena aquí».
 */
import { SONOTECA } from '../audio/sonoteca';
import type { TipoSonido } from '../estado/tipos';

/** De dónde sale el sonido de una pista, en palabras. */
export function origenSonido(tipo: TipoSonido, url?: string): string {
  if (tipo !== 'sample') return 'batería';
  if (SONOTECA.some((s) => s.url === url)) return 'Sonoteca';
  return 'tu grabación';
}

/** El interruptor de si una pista suena en la escena. */
export function Suena({ encendido, color, alCambiar }: { encendido: boolean; color: string; alCambiar: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      className={`nv-suena ${encendido ? 'nv-suena--on' : ''}`}
      style={{ ['--color' as string]: color }}
      onClick={alCambiar}
    >
      <span className="nv-suena__perilla" />
      {encendido ? 'Suena' : 'Callada'}
    </button>
  );
}

/** ▶ de una capa: la toca sola, aislada. Otra vez (o cualquier otro play) la para. */
export function BotonSolo({ sonando, nombre, alTocar }: { sonando: boolean; nombre: string; alTocar: () => void }) {
  return (
    <button
      type="button"
      className={`nv-solo ${sonando ? 'nv-solo--on' : ''}`}
      aria-pressed={sonando}
      aria-label={sonando ? `Parar ${nombre}` : `Oír solo ${nombre}`}
      title={sonando ? 'Parar' : 'Oír solo este sonido'}
      onClick={alTocar}
    >
      {sonando ? '❚❚' : '▶'}
    </button>
  );
}
