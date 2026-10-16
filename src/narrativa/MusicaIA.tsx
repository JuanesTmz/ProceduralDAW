/**
 * Lab de IA: la música se arma con reglas, como en la versión anterior.
 *
 * Cada pista es una tira de 16 casillas que muestra cómo quedan repartidos
 * sus golpes, y un cuadro que la gobierna: a la derecha más golpes, hacia
 * arriba más azar. En General el cuadro vale para toda la pieza; dentro de
 * una escena, lo que se mueve vale solo para ella.
 *
 * Los sonidos se eligen en la ventana Sonidos, y qué parámetros se mueven
 * solos con un dato, en la ventana Datos.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import { COLOR_GRUPO, fuente, moverReglaGeneral } from '../estado/musica';
import { nivelDeCapa } from '../generativo/motorGenerativo';
import type { Escena, Proyecto } from '../estado/tipos';
import { CuadroXY } from '../componentes/CuadroXY';
import type { Parametro } from './ParametrosDatos';
import { ID_MELODIA } from './VentanaSonidosPistas';

const COLOR_MELODIA = '#5fd4ff';

interface Props {
  escena: Escena | null;
  alSonidos: (pista: string) => void;
}

interface Pista {
  id: string;
  nombre: string;
  sonido: string;
  color: string;
  /** 0 vacía, 1 suena a veces, 2 suena siempre. */
  casillas: number[];
  golpes: number;
  azar: number;
  suena: boolean;
  propia: boolean;
}

export function MusicaIA({ escena, alSonidos }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [elegida, setElegida] = useState(proyecto.patron.filas[0]?.id ?? ID_MELODIA);
  const [paso, setPaso] = useState(-1);
  useEffect(() => motorAudio.alCambiarPaso(setPaso), []);

  const { patron } = proyecto;
  const n = patron.cantidadPasos;
  const seccion = escena ? proyecto.secciones.find((s) => s.id === escena.id) : undefined;

  const pistas: Pista[] = [
    ...patron.filas.map((f) => {
      const propios = seccion?.pasosFilas?.[f.id];
      const pasos = propios?.pasos ?? f.pasos;
      const prob = propios?.probabilidad ?? f.probabilidad;
      const r = escena?.reglas?.[f.id] ?? f.regla;
      return {
        id: f.id,
        nombre: f.nombre,
        sonido: f.tipo === 'sample' ? f.nombre : 'batería',
        color: f.color,
        casillas: pasos.map((on, i) => (!on ? 0 : (prob[i] ?? 1) > 0.92 ? 2 : 1)),
        golpes: r.golpes,
        azar: r.azar,
        suena: seccion ? nivelDeCapa(seccion, f.id) > 0 : true,
        propia: Boolean(escena?.reglas?.[f.id]),
      };
    }),
    (() => {
      const m = patron.melodia;
      const notas = seccion?.notas ?? m.notas;
      const r = escena?.reglas?.melodia ?? m.regla;
      return {
        id: ID_MELODIA,
        nombre: 'Melodía',
        sonido: m.instrumento === 'sample' ? m.nombreSample ?? 'tu sonido' : 'sintetizador',
        color: COLOR_MELODIA,
        casillas: Array.from({ length: n }, (_, i) => (notas.some((x) => x.paso === i) ? 2 : 0)),
        golpes: r.golpes,
        azar: r.azar,
        suena: seccion ? seccion.melodiaActiva : true,
        propia: Boolean(escena?.reglas?.melodia),
      };
    })(),
  ];
  const actual = pistas.find((p) => p.id === elegida) ?? pistas[0];
  const datoDe = (id: string) => {
    const c = proyecto.conexiones.find((x) => x.destino === (id === ID_MELODIA ? 'melodia' : `golpes:${id}`));
    return c ? fuente(proyecto, c.fuente) : undefined;
  };

  const mover = (x: number, y: number) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) {
        e.reglas = { ...(e.reglas ?? {}), [actual.id]: { golpes: x, azar: y } };
      } else {
        moverReglaGeneral(p, actual.id, x, y);
      }
    });

  const alternarSuena = (id: string) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      const s = escena && p.secciones.find((x) => x.id === escena.id);
      if (!e || !s) return;
      if (!e.niveles) {
        // Primera vez: se parte de lo que sonaba, para no apagar las demás.
        e.niveles = {};
        for (const f of p.patron.filas) e.niveles[f.id] = nivelDeCapa(s, f.id);
        e.niveles.melodia = s.melodiaActiva ? 2 : 0;
      }
      e.niveles[id] = (e.niveles[id] ?? 0) > 0 ? 0 : 2;
    });

  const cuantos = actual.casillas.filter(Boolean).length;
  const aVeces = actual.casillas.filter((c) => c === 1).length;
  const dato = datoDe(actual.id);

  return (
    <div className="nv-musica">
      <div className="nv-tarjeta nv-musica__principal nv-pistas">
        {pistas.map((p) => {
          const d = datoDe(p.id);
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`nv-pista ${p.id === actual.id ? 'nv-pista--activa' : ''} ${p.suena ? '' : 'nv-pista--muda'}`}
              style={{ ['--color' as string]: p.color }}
              onClick={() => setElegida(p.id)}
              onKeyDown={(ev) => ev.key === 'Enter' && setElegida(p.id)}
            >
              <span className="nv-pista__nombre">
                <span className="nv-punto" style={{ background: p.color }} />
                <strong>{p.nombre}</strong>
              </span>
              <button
                type="button"
                className="nv-pista__sonido"
                title="Cambiar el sonido"
                onClick={(ev) => {
                  ev.stopPropagation();
                  alSonidos(p.id);
                }}
              >
                ♪ {p.sonido}
              </button>
              <div className="nv-tira">
                {p.casillas.map((c, i) => (
                  <span key={i} className="nv-tira__casilla" data-estado={c} data-cabeza={i === paso ? 'si' : undefined} />
                ))}
              </div>
              <span className="nv-pista__marcas">
                {d && (
                  <span className="nv-chip nv-chip--chico" style={{ color: COLOR_GRUPO[d.grupo] }}>
                    ↯ {d.etiqueta}
                  </span>
                )}
                {p.propia && <span className="nv-chip nv-chip--chico nv-ia">solo aquí</span>}
              </span>
              {escena && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.suena}
                  className={`nv-interruptor ${p.suena ? 'nv-interruptor--on' : ''}`}
                  title={p.suena ? 'Suena en esta escena' : 'Callada en esta escena'}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    alternarSuena(p.id);
                  }}
                >
                  <span />
                </button>
              )}
            </div>
          );
        })}
        <span className="nv-tenue nv-chico">
          {escena
            ? 'El interruptor de la derecha calla una pista solo en esta escena.'
            : 'Esto es el sonido de toda la pieza. Dentro de cada escena puedes cambiarlo solo para ella.'}
        </span>
      </div>

      <aside className="nv-tarjeta nv-musica__lado nv-regla" style={{ ['--color' as string]: actual.color }}>
        <div className="nv-campo__fila">
          <strong className="nv-subtitulo" style={{ color: actual.color }}>
            {actual.nombre}
          </strong>
          <span className="nv-espacio" />
          {actual.propia && escena && (
            <button
              type="button"
              className="nv-chip nv-chip--borde"
              onClick={() =>
                actualizar((p) => {
                  const e = buscarEscena(p, escena.id);
                  if (e?.reglas) {
                    delete e.reglas[actual.id];
                    if (Object.keys(e.reglas).length === 0) e.reglas = undefined;
                  }
                })
              }
            >
              volver a lo general
            </button>
          )}
        </div>
        <span className="nv-tenue nv-chico">
          {actual.id === ID_MELODIA
            ? `${cuantos} ${cuantos === 1 ? 'nota' : 'notas'} por vuelta`
            : `${cuantos} de ${n} golpes${aVeces ? ` · ${aVeces} suenan a veces` : ' · todos suenan siempre'}`}
        </span>
        <div className="nv-regla__cuadro">
          <CuadroXY
            x={actual.golpes}
            y={actual.azar}
            color={actual.color}
            activo
            etiqueta={`Regla de ${actual.nombre}: a la derecha más golpes, hacia arriba más azar`}
            alMover={mover}
          />
        </div>
        {dato && (
          <span className="nv-chico" style={{ color: COLOR_GRUPO[dato.grupo] }}>
            ↯ Además, {dato.etiqueta.toLowerCase()} le quita o le pone golpes mientras suena.
          </span>
        )}
        <span className="nv-tenue nv-chico">
          {escena ? 'Lo que muevas aquí vale solo para esta escena.' : 'Lo que muevas aquí vale para toda la pieza.'}
        </span>
      </aside>
    </div>
  );
}

/** Los parámetros de la música que se pueden volver datos, para la ventana Datos. */
export function parametrosMusica(
  proyecto: Proyecto,
  actualizar: (receta: (p: Proyecto) => void) => void,
): { titulo: string; parametros: Parametro[] }[] {
  return [
    {
      titulo: 'Las pistas',
      parametros: [
        ...proyecto.patron.filas.map((f) => ({
          clave: `golpes:${f.id}`,
          etiqueta: `Golpes · ${f.nombre}`,
          notaMano: 'lo pones en el cuadro',
        })),
        { clave: 'melodia', etiqueta: 'Notas de la melodía', notaMano: 'lo pones en el cuadro' },
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
