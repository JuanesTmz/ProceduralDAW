// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La barra de arriba: el camino de cinco pasos (Historia, Voz, Música,
 * Visuales y Función), cada uno con cómo va; escuchar la obra y el aviso de
 * que todo se guarda solo. Es lo único que se queda fijo en toda la app.
 *
 * Ningún paso se bloquea: el camino sugiere el orden, pero se puede saltar
 * a cualquiera. La mezcla ya no vive aquí: está abajo, en Música («Volumen»).
 *
 * La barra se aprieta sola (`data-apretado`, de 0 a 5) cuando no cabe: según
 * el ancho, cuánta gente hay conectada y si se ve el medidor, va escondiendo
 * primero lo que menos falta hace, hasta que los cinco pasos caben enteros.
 */
import { Fragment, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionPieza, formatearReloj } from '../estado/proyecto';
import { DURACION_MAXIMA, recorrido } from '../estado/escenas';
import type { Proyecto } from '../estado/tipos';
import { useReproduccion } from './useReproduccion';
import { EstadoNube } from '../nube/EstadoNube';
import { useNube } from '../nube/contexto';
import { Caras } from '../nube/Caras';
import { Guardado } from './Animo';
import { Icono } from './Icono';

export type Paso = 'historia' | 'voz' | 'musica' | 'visuales' | 'funcion';

export const PASOS: { id: Paso; etiqueta: string }[] = [
  { id: 'historia', etiqueta: 'Historia' },
  { id: 'voz', etiqueta: 'Voz' },
  { id: 'musica', etiqueta: 'Música' },
  { id: 'visuales', etiqueta: 'Visuales' },
  { id: 'funcion', etiqueta: 'Función' },
];

/** Cuántos pasos de Visuales tiene cada escena (estilo, colores, movimiento, golpes). */
export const PASOS_VISUAL = 4;

/** Cómo va cada paso: si ya está y qué decir debajo de su nombre. */
export function estadoCamino(p: Proyecto): Record<Paso, { hecho: boolean; detalle: string }> {
  const escenas = p.escenas.filter((e) => !e.respiro);
  const lista = recorrido(p);
  const n = lista.length;
  const conVoz = escenas.filter((e) => e.vozUrl).length;
  const musica = lista.filter((e) => e.listaMusica).length;
  const visual = lista.filter((e) => (e.pasosVisual ?? 0) >= PASOS_VISUAL).length;
  const sinEscenas = 'después de la historia';
  return {
    historia: { hecho: escenas.length > 0, detalle: escenas.length > 0 ? 'Lista' : 'Empieza aquí' },
    voz: {
      hecho: escenas.length > 0 && conVoz === escenas.length,
      detalle: escenas.length === 0 ? sinEscenas : conVoz === escenas.length ? 'Lista' : `${conVoz} de ${escenas.length} voces`,
    },
    musica: { hecho: n > 0 && musica === n, detalle: n === 0 ? sinEscenas : `${musica} de ${n} listas` },
    visuales: { hecho: n > 0 && visual === n, detalle: n === 0 ? sinEscenas : `${visual} de ${n} listas` },
    funcion: { hecho: false, detalle: 'cuando quieran' },
  };
}

interface Props {
  paso: Paso;
  alCambiar: (paso: Paso) => void;
  /** El botón de la guía de la pantalla actual. */
  guia?: ReactNode;
}

/** Cuántos niveles de apretado hay (ver el CSS de `.nv-camino[data-apretado]`). */
const NIVELES = 5;

/**
 * Aprieta la barra hasta que todo cabe. Se mide en el DOM, sin pasar por
 * React, cada vez que cambia el ancho o el contenido (alguien se conecta,
 * aparece el medidor, cambia un texto).
 */
function useApretado() {
  const barra = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const b = barra.current;
    const pasos = b?.querySelector<HTMLElement>('.nv-camino__pasos');
    if (!b || !pasos) return;
    const cabe = () => pasos.scrollWidth <= pasos.clientWidth + 1 && b.scrollWidth <= b.clientWidth + 1;
    const ajustar = () => {
      let n = 0;
      b.dataset.apretado = '0';
      while (!cabe() && n < NIVELES) b.dataset.apretado = String(++n);
    };
    ajustar();
    const tamano = new ResizeObserver(ajustar);
    tamano.observe(b);
    // Solo hijos y textos: el atributo que cambia aquí mismo no vuelve a disparar.
    const contenido = new MutationObserver(ajustar);
    contenido.observe(b, { childList: true, subtree: true, characterData: true });
    return () => {
      tamano.disconnect();
      contenido.disconnect();
    };
  }, []);
  return barra;
}

export function Barra({ paso, alCambiar, guia }: Props) {
  const { proyecto } = useProyecto();
  const nube = useNube();
  const barra = useApretado();
  const { sonandoPieza: sonando } = useReproduccion();
  const hayEscenas = proyecto.escenas.length > 0;
  const total = hayEscenas ? duracionPieza(proyecto) : 0;
  const pasado = total > DURACION_MAXIMA;
  const estado = estadoCamino(proyecto);

  return (
    <header ref={barra} className="nv-barra nv-camino">
      <span className="nv-logo">SONORA</span>
      <nav className="nv-camino__pasos" aria-label="Pasos">
        {PASOS.map((p, i) => {
          const actual = p.id === paso;
          const { hecho, detalle } = estado[p.id];
          return (
            <Fragment key={p.id}>
              {i > 0 && <span className={`nv-camino__union ${hecho ? 'nv-camino__union--hecha' : ''}`} aria-hidden="true" />}
              <button
                type="button"
                className={`nv-camino__paso ${actual ? 'nv-camino__paso--actual' : ''} ${hecho ? 'nv-camino__paso--hecho' : ''}`}
                aria-current={actual ? 'step' : undefined}
                onClick={() => alCambiar(p.id)}
              >
                <span className="nv-camino__circulo">
                  {hecho && !actual ? <Icono n="check-bold" tam={14} /> : i + 1}
                  {/* Quién está en este paso: debajo del círculo, sin ensanchar el paso. */}
                  <Caras en={(l) => l.paso === p.id} maximo={2} />
                </span>
                <span className="nv-camino__textos">
                  <strong>{p.etiqueta}</strong>
                  <span>{detalle}</span>
                </span>
              </button>
            </Fragment>
          );
        })}
      </nav>
      <span className="nv-espacio" />
      {hayEscenas && (paso === 'historia' || paso === 'voz') && (
        <div className={`nv-medidor ${pasado ? 'nv-medidor--pasado' : ''}`}>
          <span className="nv-mono">
            {formatearReloj(total)} de {formatearReloj(DURACION_MAXIMA)}
          </span>
          <span className="nv-medidor__pista">
            <span className="nv-medidor__lleno" style={{ width: `${Math.min(100, (total / DURACION_MAXIMA) * 100)}%` }} />
          </span>
        </div>
      )}
      {/* En la nube, «En vivo» ya dice que todo se guarda. */}
      {!nube && <Guardado />}
      {paso !== 'funcion' && (
        <button
          type="button"
          className="nv-boton nv-boton--primario nv-camino__escuchar"
          disabled={!hayEscenas}
          onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirPieza())}
          title={hayEscenas ? 'Escuchar toda la obra' : 'Primero escribe y parte tu texto'}
        >
          <Icono n={sonando ? 'stop-fill' : 'play-fill'} tam={15} />
          <span className="nv-camino__escuchar-texto">{sonando ? 'Parar' : 'Escuchar'}</span>
        </button>
      )}
      {guia}
      <EstadoNube />
    </header>
  );
}
