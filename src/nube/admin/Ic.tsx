// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los íconos del panel de admin: Iconify con el set Phosphor (MIT), el mismo
 * del diseño. Cada ícono se importa como dato (no se pide a la API de
 * Iconify): funciona sin internet y solo se empaquetan los que se usan.
 */
import { Icon } from '@iconify/react';
import arrowUUpLeft from '@iconify-icons/ph/arrow-u-up-left-bold';
import bookOpenText from '@iconify-icons/ph/book-open-text-fill';
import caretDown from '@iconify-icons/ph/caret-down-bold';
import caretLeft from '@iconify-icons/ph/caret-left-bold';
import check from '@iconify-icons/ph/check-bold';
import clockCounter from '@iconify-icons/ph/clock-counter-clockwise-fill';
import confetti from '@iconify-icons/ph/confetti-fill';
import crown from '@iconify-icons/ph/crown-simple-fill';
import dots from '@iconify-icons/ph/dots-three-bold';
import download from '@iconify-icons/ph/download-simple-bold';
import eye from '@iconify-icons/ph/eye-fill';
import filmSlate from '@iconify-icons/ph/film-slate-fill';
import filmStrip from '@iconify-icons/ph/film-strip-fill';
import images from '@iconify-icons/ph/images-fill';
import key from '@iconify-icons/ph/key-fill';
import lock from '@iconify-icons/ph/lock-simple-fill';
import lockOpen from '@iconify-icons/ph/lock-simple-open-fill';
import mapPin from '@iconify-icons/ph/map-pin-fill';
import medal from '@iconify-icons/ph/medal-fill';
import microphone from '@iconify-icons/ph/microphone-fill';
import minus from '@iconify-icons/ph/minus-bold';
import musicNotes from '@iconify-icons/ph/music-notes-fill';
import palette from '@iconify-icons/ph/palette-fill';
import pencil from '@iconify-icons/ph/pencil-simple-fill';
import play from '@iconify-icons/ph/play-fill';
import plus from '@iconify-icons/ph/plus-bold';
import power from '@iconify-icons/ph/power-bold';
import speakerHigh from '@iconify-icons/ph/speaker-high-fill';
import star from '@iconify-icons/ph/star-fill';
import trash from '@iconify-icons/ph/trash-fill';
import tray from '@iconify-icons/ph/tray-fill';
import trophy from '@iconify-icons/ph/trophy-fill';
import usersThree from '@iconify-icons/ph/users-three-fill';
import x from '@iconify-icons/ph/x-bold';

const ICONOS = {
  atras: caretLeft,
  bajar: download,
  basura: trash,
  bandeja: tray,
  calificar: filmSlate,
  candado: lock,
  candadoAbierto: lockOpen,
  cerrar: x,
  check,
  corona: crown,
  equipos: usersThree,
  estrella: star,
  fiesta: confetti,
  flecha: caretDown,
  galeria: images,
  lapiz: pencil,
  llave: key,
  luego: arrowUUpLeft,
  mas: plus,
  medalla: medal,
  menos: minus,
  menu: dots,
  ojo: eye,
  play,
  salir: power,
  trofeo: trophy,
  versiones: clockCounter,
  // Los criterios de la rúbrica.
  relato: bookOpenText,
  medellin: mapPin,
  voz: microphone,
  musica: musicNotes,
  sonidos: speakerHigh,
  visual: palette,
  pieza: filmStrip,
};

export type NombreIc = keyof typeof ICONOS;

/** Un ícono del panel, del color del texto. */
export function Ic({ n, tam = 18, className }: { n: NombreIc; tam?: number; className?: string }) {
  return <Icon icon={ICONOS[n]} width={tam} height={tam} className={`ic ${className ?? ''}`} aria-hidden />;
}

/** El ícono de cada criterio de la rúbrica (por su id). */
export const icCriterio = (id: string): NombreIc => (id in ICONOS ? (id as NombreIc) : 'estrella');
