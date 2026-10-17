/**
 * Lab de IA: la música se arma con reglas.
 *
 * La vista es una lista limpia de sonidos. Cada uno se cambia tocándolo,
 * se enciende o se calla en la escena, y tiene su Pad: un cuadro donde el
 * punto ES la regla (a la derecha más golpes, hacia arriba más cambio).
 * Nada se dibuja a mano: en IA todo sale de las reglas y los datos.
 * En General vale para toda la pieza; dentro de una escena, solo para ella.
 */
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTecla, PointerEvent as EventoPuntero } from 'react';
import { motorAudio, type Reproduccion } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena, recorrido } from '../estado/escenas';
import { COLOR_GRUPO, fuente, moverReglaGeneral } from '../estado/musica';
import { nivelDeCapa } from '../generativo/motorGenerativo';
import type { Escena, Proyecto } from '../estado/tipos';
import { Ventana } from '../componentes/Ventana';
import { useEscucha } from '../componentes/useEscucha';
import type { Parametro } from './ParametrosDatos';
import { ID_MELODIA } from './VentanaSonidosPistas';
import { BotonSolo, origenSonido, Suena } from './FilaSonido';
import { useSolo } from '../componentes/useSolo';

const COLOR_MELODIA = '#5fd4ff';

interface Props {
  escena: Escena | null;
  alSonidos: (pista: string) => void;
  /** Abre la matriz para escribir la melodía a mano. */
  alNotas: () => void;
}

interface Pista {
  id: string;
  nombre: string;
  origen: string;
  color: string;
  golpes: number;
  azar: number;
  /** Lo que reparte el pad en una vuelta: 0 silencio, 1 a veces, 2 siempre. */
  casillas: number[];
  suena: boolean;
  propia: boolean;
}

/** Las pistas tal como suenan en la escena (o en General). */
function usePistas(escena: Escena | null): Pista[] {
  const { proyecto } = useProyecto();
  const { patron } = proyecto;
  const seccion = escena ? proyecto.secciones.find((s) => s.id === escena.id) : undefined;
  const m = patron.melodia;
  const rm = escena?.reglas?.melodia ?? m.regla;
  const n = patron.cantidadPasos;
  const notas = seccion?.notas ?? m.notas;
  return [
    ...patron.filas.map((f) => {
      const r = escena?.reglas?.[f.id] ?? f.regla;
      const propios = seccion?.pasosFilas?.[f.id];
      const pasos = propios?.pasos ?? f.pasos;
      const prob = propios?.probabilidad ?? f.probabilidad;
      return {
        id: f.id,
        nombre: f.nombre,
        origen: origenSonido(f.tipo, f.sampleUrl),
        color: f.color,
        golpes: r.golpes,
        azar: r.azar,
        casillas: pasos.map((on, i) => (!on ? 0 : (prob[i] ?? 1) > 0.92 ? 2 : 1)),
        suena: seccion ? nivelDeCapa(seccion, f.id) > 0 : true,
        propia: Boolean(escena?.reglas?.[f.id]),
      };
    }),
    {
      id: ID_MELODIA,
      nombre: 'Melodía',
      origen: m.instrumento === 'sample' ? `con ${m.nombreSample ?? 'tu sonido'}` : 'con sintetizador',
      color: COLOR_MELODIA,
      golpes: rm.golpes,
      azar: rm.azar,
      casillas: Array.from({ length: n }, (_, i) => (notas.some((x) => x.paso === i) ? 2 : 0)),
      suena: seccion ? seccion.melodiaActiva : true,
      propia: Boolean(escena?.reglas?.melodia),
    },
  ];
}

function useDato(id: string) {
  const { proyecto } = useProyecto();
  const c = proyecto.conexiones.find((x) => x.destino === (id === ID_MELODIA ? 'melodia' : `golpes:${id}`));
  return c ? fuente(proyecto, c.fuente) : undefined;
}

export function MusicaIA({ escena, alSonidos, alNotas }: Props) {
  const { actualizar } = useProyecto();
  const pistas = usePistas(escena);
  const [pad, setPad] = useState<string | null>(null);
  const { proyecto } = useProyecto();
  const solo = useSolo(escena ? recorrido(proyecto).findIndex((e) => e.id === escena.id) : -1);

  const alternarSuena = (id: string) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      const s = escena && p.secciones.find((x) => x.id === escena.id);
      if (!e || !s) return;
      const clave = id === ID_MELODIA ? 'melodia' : id;
      if (!e.niveles) {
        // Primera vez: se parte de lo que sonaba, para no apagar las demás.
        e.niveles = {};
        for (const f of p.patron.filas) e.niveles[f.id] = nivelDeCapa(s, f.id) > 0 ? 2 : 0;
        e.niveles.melodia = s.melodiaActiva ? 2 : 0;
      }
      e.niveles[clave] = (e.niveles[clave] ?? 0) > 0 ? 0 : 2;
    });

  return (
    <div className="nv-tarjeta nv-musica__principal">
      <strong className="nv-subtitulo">{escena ? 'Sonidos de esta escena' : 'Sonidos de toda la pieza'}</strong>
      <div className="nv-lista-sonidos">
        {pistas.map((p, k) => (
          <FilaPista
            key={p.id}
            pista={p}
            escena={escena}
            primera={k === 0}
            alSonidos={() => alSonidos(p.id)}
            alSuena={() => alternarSuena(p.id)}
            alPad={() => setPad(p.id)}
            solo={solo.suena(p.id)}
            alSolo={() => solo.alternar(p.id)}
            alNotas={p.id === ID_MELODIA ? alNotas : undefined}
          />
        ))}
      </div>
      {pad && <VentanaPad id={pad} escena={escena} alCerrar={() => setPad(null)} />}
    </div>
  );
}

function FilaPista({
  pista,
  escena,
  primera,
  alSonidos,
  alSuena,
  alPad,
  alNotas,
  solo,
  alSolo,
}: {
  pista: Pista;
  escena: Escena | null;
  primera: boolean;
  alSonidos: () => void;
  alSuena: () => void;
  alPad: () => void;
  alNotas?: () => void;
  solo: boolean;
  alSolo: () => void;
}) {
  const dato = useDato(pista.id);
  return (
    <div className={`nv-fila-son ${pista.suena ? '' : 'nv-fila-son--muda'}`}>
      <BotonSolo sonando={solo} nombre={pista.nombre} alTocar={alSolo} />
      <button
        type="button"
        className="nv-fila-son__elegir"
        style={{ ['--color' as string]: pista.color }}
        onClick={alSonidos}
        title="Cambiar el sonido"
      >
        <span className="nv-fila-son__punto" />
        <span className="nv-fila-son__texto">
          <strong>{pista.nombre}</strong>
          <span>{pista.origen}</span>
        </span>
        <span className="nv-fila-son__flecha">▾</span>
      </button>
      {dato && (
        <span className="nv-fila-son__dato" style={{ color: COLOR_GRUPO[dato.grupo] }}>
          ↯ {dato.etiqueta}
        </span>
      )}
      <span className="nv-espacio" />
      {escena && <Suena encendido={pista.suena} color={pista.color} alCambiar={alSuena} />}
      {alNotas && (
        <button type="button" className="nv-boton nv-boton--chico nv-fila-son__accion" onClick={alNotas}>
          ✎ Notas
        </button>
      )}
      <button
        type="button"
        className={`nv-boton nv-boton--chico nv-fila-son__accion ${pista.propia ? 'nv-fila-son__accion--propia' : ''}`}
        data-tour={primera ? 'editar' : undefined}
        title={pista.propia ? 'Pad cambiado en esta escena' : 'Abrir el pad'}
        onClick={alPad}
      >
        <MiniPad x={pista.golpes} y={pista.azar} color={pista.color} />
        Pad
      </button>
    </div>
  );
}

/** El pad en miniatura: dónde quedó el punto, para leerlo sin abrirlo. */
function MiniPad({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <span className="nv-minipad" aria-hidden="true">
      <span style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%`, background: color }} />
    </span>
  );
}

/**
 * Las casillas de una vuelta: lo que el pad reparte. Llena = suena siempre,
 * con borde = suena a veces, vacía = silencio. Tienen tamaño fijo y solo
 * cambian de color, así que mover el punto no reacomoda nada.
 */
function Casillas({ casillas, paso, melodia }: { casillas: number[]; paso: number; melodia: boolean }) {
  const siempre = casillas.filter((c) => c === 2).length;
  const aVeces = casillas.filter((c) => c === 1).length;
  return (
    <div className="pad__casillas">
      <div className="pad__fila" style={{ gridTemplateColumns: `repeat(${casillas.length}, 1fr)` }}>
        {casillas.map((c, i) => (
          <span
            key={i}
            className={`pad__casilla pad__casilla--${c === 2 ? 'siempre' : c === 1 ? 'aveces' : 'nada'} ${
              i % 4 === 0 ? 'pad__casilla--tiempo' : ''
            } ${i === paso ? 'pad__casilla--cabeza' : ''}`}
          />
        ))}
      </div>
      <div className="pad__leyenda">
        <span>
          <i className="pad__casilla pad__casilla--siempre" /> {siempre} {melodia ? (siempre === 1 ? 'nota' : 'notas') : 'siempre'}
        </span>
        {!melodia && (
          <span>
            <i className="pad__casilla pad__casilla--aveces" /> {aVeces} a veces
          </span>
        )}
        <span className="pad__vuelta">una vuelta</span>
      </div>
    </div>
  );
}

/** Lo que dice el punto del pad, en palabras. */
function describir(x: number, y: number, melodia: boolean): string {
  const cuanto = x < 0.34 ? 'Pocos' : x < 0.67 ? 'Bastantes' : 'Muchos';
  const que = melodia ? `${x < 0.34 ? 'Pocas' : x < 0.67 ? 'Bastantes' : 'Muchas'} notas` : `${cuanto} golpes`;
  const cambio = y < 0.34 ? 'que se repiten igual' : y < 0.67 ? 'que cambian un poco' : 'que cambian cada vez';
  return `${que}, ${cambio}`;
}

/** La ventana del pad de un sonido: un cuadro, un punto y una frase. */
function VentanaPad({ id, escena, alCerrar }: { id: string; escena: Escena | null; alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const pista = usePistas(escena).find((p) => p.id === id);
  const dato = useDato(id);
  const escucha = useEscucha();
  const [paso, setPaso] = useState(-1);
  useEffect(() => motorAudio.alCambiarPaso(setPaso), []);
  const caja = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);
  if (!pista) return null;
  const esMelodia = id === ID_MELODIA;

  const mover = (x: number, y: number) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) e.reglas = { ...(e.reglas ?? {}), [id]: { golpes: x, azar: y } };
      else moverReglaGeneral(p, id, x, y);
    });

  const leer = (ev: EventoPuntero<HTMLDivElement>) => {
    const r = caja.current!.getBoundingClientRect();
    mover(
      Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height)),
    );
  };

  // Con teclado se mueve de a poco, y con Mayús a saltos grandes.
  const teclear = (ev: EventoTecla<HTMLDivElement>) => {
    const d = ev.shiftKey ? 0.12 : 0.04;
    const mov: Record<string, [number, number]> = {
      ArrowRight: [d, 0],
      ArrowLeft: [-d, 0],
      ArrowUp: [0, d],
      ArrowDown: [0, -d],
    };
    const m = mov[ev.key];
    if (!m) return;
    ev.preventDefault();
    mover(Math.max(0, Math.min(1, pista.golpes + m[0])), Math.max(0, Math.min(1, pista.azar + m[1])));
  };

  const volverGeneral = () =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e?.reglas) {
        delete e.reglas[id];
        if (Object.keys(e.reglas).length === 0) e.reglas = undefined;
      }
    });

  const indiceEscena = escena ? recorrido(proyecto).findIndex((e) => e.id === escena.id) : -1;
  const queSuena: Reproduccion = indiceEscena >= 0 ? { tipo: 'escena', indice: indiceEscena } : { tipo: 'bucle' };
  const oir = () => escucha.alternar(queSuena);

  const donde = { left: `${pista.golpes * 100}%`, top: `${(1 - pista.azar) * 100}%` };

  return (
    <Ventana
      titulo={`Pad · ${pista.nombre}`}
      nota={escena ? `Solo para «${escena.respiro ? 'Respiro' : escena.nombre}»` : 'Para toda la pieza'}
      color={pista.color}
      guia="ventana-pad"
      alCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="boton" onClick={oir}>
            {escucha.suena(queSuena) ? '❚❚ Pausar' : escena ? '▶ Oír la escena' : '▶ Oír la pieza'}
          </button>
          <span className="pie__hueco" />
          {escena && pista.propia && (
            <button type="button" className="boton" onClick={volverGeneral}>
              Volver a lo general
            </button>
          )}
        </>
      }
    >
      <div className="nv nv--incrustado pad" style={{ ['--color' as string]: pista.color }}>
        <Casillas casillas={pista.casillas} paso={paso} melodia={esMelodia} />
        <div className="pad__marco">
          <span className="pad__eje pad__eje--y">
            <span>cambia cada vez</span>
            <span>siempre igual</span>
          </span>
          <div
            ref={caja}
            className="pad__cuadro"
            role="slider"
            tabIndex={0}
            aria-label={`Pad de ${pista.nombre}`}
            aria-valuetext={describir(pista.golpes, pista.azar, esMelodia)}
            onPointerDown={(ev) => {
              arrastrando.current = true;
              leer(ev);
              try {
                ev.currentTarget.setPointerCapture(ev.pointerId);
              } catch {
                // Sin captura el arrastre sigue mientras el dedo no se salga.
              }
            }}
            onPointerMove={(ev) => {
              if (arrastrando.current) leer(ev);
            }}
            onPointerUp={() => (arrastrando.current = false)}
            onPointerCancel={() => (arrastrando.current = false)}
            onKeyDown={teclear}
          >
            <span className="pad__luz" style={donde} />
            <span className="pad__punto" style={donde} />
          </div>
          <span />
          <span className="pad__eje pad__eje--x">
            <span>{esMelodia ? 'pocas notas' : 'pocos golpes'}</span>
            <span>{esMelodia ? 'muchas notas' : 'muchos golpes'}</span>
          </span>
        </div>
        <p className="pad__frase">{describir(pista.golpes, pista.azar, esMelodia)}.</p>
        {dato && (
          <p className="pad__dato" style={{ color: COLOR_GRUPO[dato.grupo] }}>
            ↯ Además, {dato.etiqueta.toLowerCase()} lo mueve mientras suena.
          </p>
        )}
      </div>
    </Ventana>
  );
}

/** Los parámetros de la música que se pueden volver datos, para la ventana Datos. */
export function parametrosMusica(
  proyecto: Proyecto,
  actualizar: (receta: (p: Proyecto) => void) => void,
): { titulo: string; parametros: Parametro[] }[] {
  return [
    {
      titulo: 'Los sonidos',
      parametros: [
        ...proyecto.patron.filas.map((f) => ({
          clave: `golpes:${f.id}`,
          etiqueta: `Golpes · ${f.nombre}`,
          notaMano: 'lo pones en su pad',
        })),
        { clave: 'melodia', etiqueta: 'Notas de la melodía', notaMano: 'lo pones en su pad' },
      ],
    },
    {
      titulo: 'El sonido',
      parametros: [
        {
          clave: 'brillo',
          etiqueta: 'Brillo',
          mano: {
            valor: Math.log2(proyecto.efectos.filtroFrecuencia / 200) / Math.log2(90),
            poner: (v) => actualizar((p) => (p.efectos.filtroFrecuencia = Math.round(200 * Math.pow(90, v)))),
          },
        },
        {
          clave: 'eco',
          etiqueta: 'Eco',
          mano: {
            valor: proyecto.efectos.delayCantidad / 0.6,
            poner: (v) => actualizar((p) => (p.efectos.delayCantidad = v * 0.6)),
          },
        },
        { clave: 'escala', etiqueta: 'Qué tan luminosa es la escala', notaMano: 'la pone la emoción' },
        { clave: 'volumen', etiqueta: 'Volumen de la música', notaMano: 'queda fijo' },
        { clave: 'apartar', etiqueta: 'La música se aparta', notaMano: 'no se aparta' },
      ],
    },
  ];
}
