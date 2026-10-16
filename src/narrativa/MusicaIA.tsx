/**
 * Lab de IA: la música se arma con reglas.
 *
 * La vista es una lista limpia de sonidos. Cada uno tiene su botón «Pad»,
 * que abre la ventana de siempre: la tira de 16 casillas con cómo quedan
 * repartidos sus golpes y el cuadro que los gobierna (a la derecha más
 * golpes, hacia arriba más azar). En General vale para toda la pieza;
 * dentro de una escena, solo para ella.
 *
 * Los sonidos se eligen en la ventana Sonidos, y qué se mueve solo con un
 * dato, en la ventana Datos.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import { COLOR_GRUPO, fuente, moverReglaGeneral } from '../estado/musica';
import { nivelDeCapa } from '../generativo/motorGenerativo';
import type { Escena, Proyecto } from '../estado/tipos';
import { CuadroXY } from '../componentes/CuadroXY';
import { Ventana } from '../componentes/Ventana';
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

/** Las pistas tal como suenan en la escena (o en General). */
function usarPistas(escena: Escena | null): Pista[] {
  const { proyecto } = useProyecto();
  const { patron } = proyecto;
  const n = patron.cantidadPasos;
  const seccion = escena ? proyecto.secciones.find((s) => s.id === escena.id) : undefined;
  const m = patron.melodia;
  const notas = seccion?.notas ?? m.notas;
  const rm = escena?.reglas?.melodia ?? m.regla;
  return [
    ...patron.filas.map((f) => {
      const propios = seccion?.pasosFilas?.[f.id];
      const pasos = propios?.pasos ?? f.pasos;
      const prob = propios?.probabilidad ?? f.probabilidad;
      const r = escena?.reglas?.[f.id] ?? f.regla;
      return {
        id: f.id,
        nombre: f.nombre,
        sonido: f.tipo === 'sample' ? f.nombre : 'Batería',
        color: f.color,
        casillas: pasos.map((on, i) => (!on ? 0 : (prob[i] ?? 1) > 0.92 ? 2 : 1)),
        golpes: r.golpes,
        azar: r.azar,
        suena: seccion ? nivelDeCapa(seccion, f.id) > 0 : true,
        propia: Boolean(escena?.reglas?.[f.id]),
      };
    }),
    {
      id: ID_MELODIA,
      nombre: 'Melodía',
      sonido: m.instrumento === 'sample' ? m.nombreSample ?? 'Tu sonido' : 'Sintetizador',
      color: COLOR_MELODIA,
      casillas: Array.from({ length: n }, (_, i) => (notas.some((x) => x.paso === i) ? 2 : 0)),
      golpes: rm.golpes,
      azar: rm.azar,
      suena: seccion ? seccion.melodiaActiva : true,
      propia: Boolean(escena?.reglas?.melodia),
    },
  ];
}

function usarDato(id: string) {
  const { proyecto } = useProyecto();
  const c = proyecto.conexiones.find((x) => x.destino === (id === ID_MELODIA ? 'melodia' : `golpes:${id}`));
  return c ? fuente(proyecto, c.fuente) : undefined;
}

export function MusicaIA({ escena, alSonidos }: Props) {
  const { actualizar } = useProyecto();
  const pistas = usarPistas(escena);
  const [pad, setPad] = useState<string | null>(null);

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

  return (
    <div className="nv-tarjeta nv-musica__principal">
      <strong className="nv-subtitulo">{escena ? 'Sonidos de esta escena' : 'Sonidos de toda la pieza'}</strong>
      <div className="nv-capas">
        <div className="nv-capa nv-capa--ia nv-capa--cabeza">
          <span>Sonido</span>
          <span>Suena con</span>
          <span>Lo mueve un dato</span>
          <span>{escena ? 'En esta escena' : ''}</span>
          <span>Pad</span>
        </div>
        {pistas.map((p) => (
          <FilaPista
            key={p.id}
            pista={p}
            escena={escena}
            alSonidos={() => alSonidos(p.id)}
            alSuena={() => alternarSuena(p.id)}
            alPad={() => setPad(p.id)}
          />
        ))}
      </div>
      <span className="nv-tenue nv-chico">
        {escena
          ? 'Lo que muevas en el pad de una escena vale solo para ella.'
          : 'Esto es el sonido de toda la pieza. Dentro de cada escena puedes cambiarlo solo para ella.'}
      </span>
      {pad && <VentanaPad id={pad} escena={escena} alCerrar={() => setPad(null)} />}
    </div>
  );
}

function FilaPista({
  pista,
  escena,
  alSonidos,
  alSuena,
  alPad,
}: {
  pista: Pista;
  escena: Escena | null;
  alSonidos: () => void;
  alSuena: () => void;
  alPad: () => void;
}) {
  const dato = usarDato(pista.id);
  return (
    <div className={`nv-capa nv-capa--ia ${pista.suena ? '' : 'nv-capa--muda'}`}>
      <span className="nv-capa__nombre">
        <span className="nv-punto" style={{ background: pista.color }} />
        {pista.nombre}
      </span>
      <button
        type="button"
        className={`nv-select nv-select--boton ${pista.sonido !== 'Batería' && pista.sonido !== 'Sintetizador' ? 'nv-select--propio' : ''}`}
        onClick={alSonidos}
        title="Cambiar el sonido"
      >
        ♪ {pista.sonido} ▾
      </button>
      <span>
        {dato ? (
          <span className="nv-chip nv-chip--chico" style={{ color: COLOR_GRUPO[dato.grupo] }}>
            ↯ {dato.etiqueta}
          </span>
        ) : (
          <span className="nv-tenue nv-chico">—</span>
        )}
      </span>
      <span>
        {escena && (
          <button
            type="button"
            role="switch"
            aria-checked={pista.suena}
            className={`nv-interruptor nv-interruptor--ia ${pista.suena ? 'nv-interruptor--on' : ''}`}
            title={pista.suena ? 'Suena en esta escena' : 'Callada en esta escena'}
            onClick={alSuena}
          >
            <span />
          </button>
        )}
      </span>
      <button
        type="button"
        className={`nv-boton nv-boton--chico nv-boton--ia ${pista.propia ? 'nv-boton--ia-activo' : ''}`}
        onClick={alPad}
        title="Abrir el pad de este sonido"
      >
        ⊞ Pad{pista.propia ? ' · aquí' : ''}
      </button>
    </div>
  );
}

/** La ventana del pad de un sonido: la tira repartida arriba y el cuadro que la gobierna. */
function VentanaPad({ id, escena, alCerrar }: { id: string; escena: Escena | null; alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const pista = usarPistas(escena).find((p) => p.id === id);
  const dato = usarDato(id);
  const [paso, setPaso] = useState(-1);
  useEffect(() => motorAudio.alCambiarPaso(setPaso), []);
  if (!pista) return null;

  const n = proyecto.patron.cantidadPasos;
  const cuantos = pista.casillas.filter(Boolean).length;
  const aVeces = pista.casillas.filter((c) => c === 1).length;
  const esMelodia = id === ID_MELODIA;

  const mover = (x: number, y: number) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) e.reglas = { ...(e.reglas ?? {}), [id]: { golpes: x, azar: y } };
      else moverReglaGeneral(p, id, x, y);
    });

  const volverGeneral = () =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e?.reglas) {
        delete e.reglas[id];
        if (Object.keys(e.reglas).length === 0) e.reglas = undefined;
      }
    });

  return (
    <Ventana
      titulo={`Pad · ${pista.nombre}`}
      nota={escena ? `Solo para la escena «${escena.respiro ? 'Respiro' : escena.nombre}»` : 'Para toda la pieza'}
      color={pista.color}
      ancha
      guia="ventana-pad"
      alCerrar={alCerrar}
      pie={
        <>
          {!esMelodia && (
            <button type="button" className="boton" onClick={() => void motorAudio.escucharFila(id)}>
              ▶ Oír el sonido
            </button>
          )}
          {escena && pista.propia && (
            <button type="button" className="boton" onClick={volverGeneral}>
              Volver a lo general
            </button>
          )}
        </>
      }
    >
      <div className="procedural-ventana nv-pad">
        <div className="tira tira--grande" style={{ color: pista.color }}>
          {pista.casillas.map((estado, i) => (
            <span key={i} className="tira__casilla" data-estado={estado} data-cabeza={i === paso ? 'si' : undefined} />
          ))}
        </div>
        <p className="tira__cuenta">
          {esMelodia ? (
            <>
              <strong>{cuantos}</strong> {cuantos === 1 ? 'nota' : 'notas'} por vuelta
            </>
          ) : (
            <>
              <strong>{cuantos}</strong> de {n} golpes
              {aVeces > 0 ? (
                <>
                  {' · '}
                  <strong>{aVeces}</strong> suenan a veces
                </>
              ) : (
                ' · todos suenan siempre'
              )}
            </>
          )}
        </p>
        <div className="nv-pad__cuadro">
          <CuadroXY
            x={pista.golpes}
            y={pista.azar}
            color={pista.color}
            activo
            etiqueta={`Pad de ${pista.nombre}: a la derecha más golpes, hacia arriba más azar`}
            alMover={mover}
          />
        </div>
        <p className="nv-pad__nota">
          A la derecha más golpes, hacia arriba más azar.
          {dato && (
            <span style={{ color: COLOR_GRUPO[dato.grupo] }}> Además, {dato.etiqueta.toLowerCase()} le quita o le pone golpes mientras suena.</span>
          )}
        </p>
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
