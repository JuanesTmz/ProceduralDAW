// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Paso Música.
 *
 * Arriba, la línea de la obra: la base y una tarjeta por escena. Abajo, la
 * mesa de lo elegido:
 *  - La base (lo que suena en todas las escenas): la velocidad, sus golpes y,
 *    al pie, las plantillas de géneros.
 *  - Una escena: sus golpes (lo grande), sus palabras —cada una puede llevar
 *    un sonido o un silencio— y, abajo, la emoción a la izquierda y las
 *    herramientas a la derecha: Graba un sonido, Añadir capa y Volumen.
 *
 * Nada se bloquea. «Lista» marca la escena como terminada en el camino.
 */
import { useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion, formatearReloj } from '../estado/proyecto';
import { buscarEscena, EMOCIONES, quitarRespiro, recorrido } from '../estado/escenas';
import { aplicarPreset, BASES, hayEscenasRetocadas, nombreBase } from '../estado/musica';
import type { Escena } from '../estado/tipos';
import { VentanaMatriz } from '../componentes/VentanaMatriz';
import { useSolo } from '../componentes/useSolo';
import { CeldasCapas } from './CeldasCapas';
import { Icono } from './Icono';
import { LineaObra, musicaRetocada } from './LineaObra';
import { MenuFlotante } from './MenuFlotante';
import { Fila, MAXIMO_VOZ } from './Mezcla';
import { usePistas } from './PadMusica';
import { PalabrasEscena } from './PalabrasEscena';
import { PanelEmocion } from './PanelEmocion';
import { BotonPista, PistaMano, usePista } from './PistaMano';
import { fijar, useCuadro } from './useCuadro';
import { useReproduccion } from './useReproduccion';
import { VentanaGrabar, type DestinoGrabacion } from './VentanaGrabar';
import { VentanaSonidosCapa } from './VentanaSonidosCapa';
import { ID_MELODIA, PISTA_NUEVA } from './VentanaSonidosPistas';

type Herramienta =
  | { tipo: 'sonidos'; pista: string }
  | { tipo: 'grabar'; destino: DestinoGrabacion; archivo?: { url: string; nombre: string } }
  | { tipo: 'melodia' };

interface Props {
  /** La escena abierta, o 'general' para la base. */
  abierta: string;
  alIr: (id: string) => void;
}

export function PasoMusica({ abierta, alIr }: Props) {
  const { proyecto } = useProyecto();
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  const escena = abierta === 'general' ? null : (buscarEscena(proyecto, abierta) ?? null);
  const indice = escena ? recorrido(proyecto).findIndex((e) => e.id === escena.id) : -1;
  const cerrar = () => setHerramienta(null);
  const color = escena ? EMOCIONES[escena.emocion].color : 'var(--nv-acento)';

  const acciones = {
    alSonidos: (pista: string) => setHerramienta({ tipo: 'sonidos', pista }),
    alNotas: () => setHerramienta({ tipo: 'melodia' }),
    alGrabar: () => setHerramienta({ tipo: 'grabar', destino: { tipo: 'nueva' } }),
    alCapa: () => setHerramienta({ tipo: 'sonidos', pista: PISTA_NUEVA }),
  };

  return (
    <div className="nv-paso-musica">
      <LineaObra actual={escena ? escena.id : 'general'} alIr={alIr} />
      {!escena && <Plantillas />}
      <section className="nv-mesa" style={{ ['--color' as string]: color }}>
        {escena ? (
          <MesaEscena
            key={escena.id}
            escena={escena}
            indice={indice}
            {...acciones}
            alGrabarPalabra={(palabra) => setHerramienta({ tipo: 'grabar', destino: { tipo: 'palabra', escenaId: escena.id, palabra } })}
            alSalir={() => alIr('general')}
          />
        ) : (
          <MesaBase {...acciones} />
        )}
      </section>

      {herramienta?.tipo === 'melodia' && <VentanaMatriz escena={indice} alCerrar={cerrar} />}
      {herramienta?.tipo === 'sonidos' && (
        <VentanaSonidosCapa
          pista={herramienta.pista}
          alCerrar={cerrar}
          alGrabar={(archivo) =>
            setHerramienta({
              tipo: 'grabar',
              destino: herramienta.pista === PISTA_NUEVA || herramienta.pista === ID_MELODIA ? { tipo: 'nueva' } : { tipo: 'capa', id: herramienta.pista },
              archivo,
            })
          }
        />
      )}
      {herramienta?.tipo === 'grabar' && <VentanaGrabar destino={herramienta.destino} archivo={herramienta.archivo} alCerrar={cerrar} />}
    </div>
  );
}

interface Acciones {
  alSonidos: (pista: string) => void;
  alNotas: () => void;
  alGrabar: () => void;
  alCapa: () => void;
}

// ------------------------------------------------------------ una escena

function MesaEscena({
  escena,
  indice,
  alSonidos,
  alNotas,
  alGrabar,
  alCapa,
  alGrabarPalabra,
  alSalir,
}: Acciones & { escena: Escena; indice: number; alGrabarPalabra: (palabra: number) => void; alSalir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const solo = useSolo(indice);
  const pistas = usePistas(escena);
  const { color } = EMOCIONES[escena.emocion];
  const numero = proyecto.escenas.findIndex((e) => e.id === escena.id) + 1;
  const retocada = musicaRetocada(escena);

  const cambiar = (receta: (e: Escena) => void) =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (e) receta(e);
    });

  // Callar o encender una capa SOLO en esta escena.
  const alternar = (id: string) =>
    cambiar((e) => {
      const clave = id === ID_MELODIA ? 'melodia' : id;
      if (!e.niveles) {
        // Primera vez: se parte de lo que sonaba, para no apagar las demás.
        e.niveles = {};
        for (const pista of pistas) e.niveles[pista.id === ID_MELODIA ? 'melodia' : pista.id] = pista.suena ? 2 : 0;
      }
      e.niveles[clave] = (e.niveles[clave] ?? 0) > 0 ? 0 : 2;
    });
  const suena = (id: string) => pistas.find((x) => x.id === id)?.suena ?? true;

  return (
    <>
      <header className="nv-mesa__cabeza" data-bloqueo={`escena:${escena.id}:nombre`}>
        <span className="nv-mesa__num" style={{ color }}>
          {escena.respiro ? '·' : numero}
        </span>
        {escena.respiro ? (
          <h2 className="nv-mesa__nombre">Respiro</h2>
        ) : (
          <input
            className="nv-mesa__nombre nv-mesa__nombre--editable"
            value={escena.nombre}
            aria-label="Nombre de la escena"
            onChange={(ev) => cambiar((e) => (e.nombre = ev.target.value))}
          />
        )}
        <BotonEscena indice={indice} />
        <span className="nv-espacio" />
        {retocada && (
          <>
            <span className="nv-mesa__retocada">
              <Icono n="pencil-simple-fill" tam={12} /> Retocada
            </span>
            <button
              type="button"
              className="nv-enlace nv-mesa__volver"
              title="Esta escena vuelve a sonar igual que la base"
              onClick={() =>
                cambiar((e) => {
                  e.niveles = undefined;
                  e.golpes = undefined;
                  e.notas = undefined;
                })
              }
            >
              <Icono n="arrow-counter-clockwise-bold" tam={13} /> Como la base
            </button>
          </>
        )}
        {escena.respiro && (
          <button
            type="button"
            className="nv-boton nv-mesa__quitar"
            onClick={() => {
              actualizar((p) => quitarRespiro(p, escena.id));
              alSalir();
            }}
          >
            <Icono n="trash-bold" tam={14} /> Quitar respiro
          </button>
        )}
        <button
          type="button"
          className={`nv-mesa__lista ${escena.listaMusica ? 'nv-mesa__lista--on' : ''}`}
          aria-pressed={Boolean(escena.listaMusica)}
          onClick={() => cambiar((e) => (e.listaMusica = !e.listaMusica || undefined))}
          title="Márquenla cuando la música de esta escena esté como la quieren"
        >
          <span className="nv-mesa__lista-caja">{escena.listaMusica && <Icono n="check-bold" tam={13} />}</span>
          {escena.listaMusica ? (escena.respiro ? 'Respiro listo' : 'Escena lista') : escena.respiro ? 'Marcar respiro listo' : 'Marcar escena lista'}
        </button>
      </header>

      <div className="nv-mesa__golpes">
        <div className="nv-mesa__titulo">
          <strong className="nv-mesa__rotulo">Golpes</strong>
          <span className="nv-mesa__pista">Toca una casilla para poner o quitar un golpe · toca el nombre de una capa para cambiar su sonido</span>
          <span className="nv-espacio" />
          <BotonPista clave="golpes-musica" />
        </div>
        <PistaGolpesMusica />
        <CeldasCapas
          capas={pistas}
          escenaId={escena.id}
          suena={suena}
          alSuena={alternar}
          alSonidos={alSonidos}
          alNotas={alNotas}
          suenaSolo={solo.suena}
          alSolo={solo.alternar}
        />
      </div>

      {!escena.respiro && <PalabrasEscena escena={escena} indice={indice} alGrabar={alGrabarPalabra} />}

      <footer className="nv-mesa__pie">
        <PanelEmocion escena={escena} para="musica" />
        <span className="nv-espacio" />
        <Herramientas alGrabar={alGrabar} alCapa={alCapa} />
      </footer>
    </>
  );
}

/** ▶ Escena, con por dónde va: solo suena esta escena, nunca la obra entera. */
function BotonEscena({ indice }: { indice: number }) {
  const { proyecto } = useProyecto();
  const { activa } = useReproduccion();
  const clave = `escena:${indice}`;
  const sonando = activa === clave;
  const reloj = useRef<HTMLSpanElement>(null);
  const seccion = proyecto.secciones[indice];
  const total = seccion ? duracionSeccion(proyecto, seccion) : 0;
  useCuadro(() => {
    const pos = motorAudio.claveActiva === clave ? motorAudio.posicionOida : null;
    const t = pos && pos.indice === indice ? pos.segundos : 0;
    fijar(reloj.current, 'texto', `${formatearReloj(t)} / ${formatearReloj(total)}`);
  });
  return (
    <button
      type="button"
      className="nv-boton nv-boton--primario nv-mesa__escuchar"
      onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirEscena(indice))}
    >
      <Icono n={sonando ? 'stop-fill' : 'play-fill'} tam={14} />
      Escena
      <span ref={reloj} className="nv-mono nv-mesa__reloj" />
    </button>
  );
}

// ------------------------------------------------------------ la base

function MesaBase({ alSonidos, alNotas, alGrabar, alCapa }: Acciones) {
  const { proyecto, actualizar } = useProyecto();
  const { activa } = useReproduccion();
  const solo = useSolo(-1);
  const pistas = usePistas(null);
  const sonando = activa === 'bucle';

  return (
    <>
      <header className="nv-mesa__cabeza">
        <span className="nv-mesa__estrella">
          <Icono n="star-fill" tam={18} />
        </span>
        <h2 className="nv-mesa__nombre">Base de toda la obra</h2>
        <span className="nv-mesa__pista nv-mesa__pista--cabeza">Suena en cada escena que no retoquen.</span>
        <span className="nv-espacio" />
        <label className="nv-mesa__velocidad" data-bloqueo="general:ritmo">
          <span>Velocidad</span>
          <input
            type="range"
            min={60}
            max={140}
            step={1}
            value={proyecto.bpm}
            onChange={(ev) => actualizar((p) => (p.bpm = Number(ev.target.value)))}
          />
          <span className="nv-mono">{proyecto.bpm}</span>
        </label>
        <button
          type="button"
          className="nv-boton nv-boton--primario nv-mesa__escuchar"
          onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirBucle())}
        >
          <Icono n={sonando ? 'stop-fill' : 'play-fill'} tam={14} /> Base
        </button>
      </header>

      <div className="nv-mesa__golpes">
        <div className="nv-mesa__titulo">
          <strong className="nv-mesa__rotulo">Golpes {nombreBase(proyecto.preset) ? `del ${nombreBase(proyecto.preset)}` : 'de la base'}</strong>
          <span className="nv-mesa__pista">Toca una casilla para poner o quitar un golpe · toca el nombre de una capa para cambiar su sonido</span>
          <span className="nv-espacio" />
          <BotonPista clave="golpes-musica" />
        </div>
        <PistaGolpesMusica />
        <CeldasCapas capas={pistas} escenaId={null} alSonidos={alSonidos} alNotas={alNotas} suenaSolo={solo.suena} alSolo={solo.alternar} />
      </div>

      <footer className="nv-mesa__pie">
        <span className="nv-espacio" />
        <Herramientas alGrabar={alGrabar} alCapa={alCapa} />
      </footer>
    </>
  );
}

/**
 * Las plantillas de géneros. Si alguna escena ya tiene golpes propios,
 * cambiar de plantilla los borra: se pide tocar dos veces.
 */
/** La pista de los golpes: la mano toca tres casillas de una capa. */
function PistaGolpesMusica() {
  const pista = usePista('golpes-musica', false, 2, '.nv-celdas__pasos:not(.nv-celdas__pasos--melodia) .nv-celda');
  if (!pista.visible) return null;
  return (
    <PistaMano
      modo="tocar"
      texto="Toca una casilla para poner un golpe en ese momento de la vuelta. Toca otra vez para quitarlo, o arrastra para pintar varias."
      origen={() => null}
      destinos={() => {
        const filas = [...document.querySelectorAll('.nv-celdas__pasos:not(.nv-celdas__pasos--melodia)')];
        const fila = filas.find((f) => !f.querySelector('.nv-celda--on')) ?? filas[1] ?? filas[0];
        const celdas = fila ? [...fila.querySelectorAll('.nv-celda')] : [];
        return [1, 5, 9].map((i) => celdas[i]).filter(Boolean);
      }}
      alCerrar={pista.cerrar}
    />
  );
}

function Plantillas() {
  const { proyecto, actualizar } = useProyecto();
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  const retocadas = hayEscenasRetocadas(proyecto);
  const pista = usePista('plantillas', false, 1, '.nv-plantilla');

  const elegir = (id: string) => {
    if (retocadas && porConfirmar !== id) {
      setPorConfirmar(id);
      window.setTimeout(() => setPorConfirmar((x) => (x === id ? null : x)), 3500);
      return;
    }
    setPorConfirmar(null);
    actualizar((p) => aplicarPreset(p, id));
  };

  return (
    <section className="nv-plantillas" data-bloqueo="general:ritmo">
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca una plantilla para oírla: los golpes de abajo cambian por los de ese género."
          origen={() => null}
          destinos={() => [[...document.querySelectorAll('.nv-plantilla:not(.nv-plantilla--activa)')][1] ?? document.querySelector('.nv-plantilla')].filter((e): e is Element => !!e)}
          alCerrar={pista.cerrar}
        />
      )}
      <div className="nv-plantillas__cabeza">
        <Icono n="music-notes-fill" tam={16} />
        <strong>Plantillas</strong>
        <span className="nv-mesa__pista">Toquen una para oírla: los golpes de abajo cambian por los de ese género.</span>
        {porConfirmar && (
          <span className="nv-plantillas__aviso">Cambiarla borra los golpes propios de las escenas. Toquen otra vez para confirmar.</span>
        )}
        <span className="nv-espacio" />
        <BotonPista clave="plantillas" />
      </div>
      <div className="nv-plantillas__lista">
        {BASES.map((b) => {
          const activa = proyecto.preset === b.id;
          const confirmar = porConfirmar === b.id;
          return (
            <button
              key={b.id}
              type="button"
              className={`nv-plantilla ${activa ? 'nv-plantilla--activa' : ''} ${confirmar ? 'nv-plantilla--confirmar' : ''}`}
              title={b.descripcion}
              onClick={() => elegir(b.id)}
            >
              <span className="nv-plantilla__icono" aria-hidden="true">
                {b.icono}
              </span>
              <strong>{confirmar ? '¿Seguro?' : b.nombre}</strong>
              {activa && (
                <span className="nv-plantilla__check">
                  <Icono n="check-bold" tam={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ herramientas y volumen

/** Abajo a la derecha: grabar, añadir capa y volumen (la mezcla vive solo aquí). */
function Herramientas({ alGrabar, alCapa }: { alGrabar: () => void; alCapa: () => void }) {
  const [volumen, setVolumen] = useState<HTMLElement | null>(null);
  return (
    <div className="nv-herr">
      <button type="button" className="nv-herr__boton nv-herr__boton--rojo" onClick={alGrabar} data-tour="grabar">
        <span className="nv-herr__icono">
          <Icono n="microphone-fill" tam={18} />
        </span>
        <span className="nv-herr__textos">
          <strong>Graba un sonido</strong>
          <span>una reja, una olla, un pito…</span>
        </span>
      </button>
      <button type="button" className="nv-herr__boton nv-herr__boton--verde" onClick={alCapa} data-tour="nueva-pista">
        <span className="nv-herr__icono">
          <Icono n="plus-bold" tam={18} />
        </span>
        <span className="nv-herr__textos">
          <strong>Añadir capa</strong>
          <span>un sonido más</span>
        </span>
      </button>
      <button
        type="button"
        className={`nv-herr__boton nv-herr__boton--ambar ${volumen ? 'nv-herr__boton--abierto' : ''}`}
        onClick={(ev) => setVolumen(volumen ? null : ev.currentTarget)}
        aria-expanded={Boolean(volumen)}
      >
        <span className="nv-herr__icono">
          <Icono n="sliders-horizontal-bold" tam={18} />
        </span>
        <span className="nv-herr__textos">
          <strong>Volumen</strong>
          <span>de cada capa y la voz</span>
        </span>
      </button>
      {volumen && (
        <MenuFlotante ancla={volumen} className="nv-volumen" alCerrar={() => setVolumen(null)}>
          <Volumen alCerrar={() => setVolumen(null)} />
        </MenuFlotante>
      )}
    </div>
  );
}

function Volumen({ alCerrar }: { alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { filas, melodia } = proyecto.patron;
  return (
    <div className="nv-volumen__caja nv-mezcla" data-bloqueo="mezcla">
      <div className="nv-volumen__cabeza">
        <Icono n="sliders-horizontal-bold" tam={16} />
        <strong>Volumen</strong>
        <span className="nv-espacio" />
        <button type="button" className="nv-cierre" onClick={alCerrar} aria-label="Cerrar">
          <Icono n="x-bold" tam={12} />
        </button>
      </div>
      <span className="nv-tenue nv-chico">Suban o bajen cada capa. Pueden moverlo mientras suena.</span>
      <Fila
        nombre="Voz"
        detalle="su narración"
        color="#ffffff"
        valor={proyecto.narracion.volumen}
        maximo={MAXIMO_VOZ}
        alCambiar={(v) => actualizar((p) => (p.narracion.volumen = v))}
        destacada
      />
      <span className="nv-etiqueta nv-tenue nv-mezcla__titulo">MÚSICA</span>
      <Fila nombre="Melodía" color="#5fd4ff" valor={melodia.volumen} alCambiar={(v) => actualizar((p) => (p.patron.melodia.volumen = v))} />
      {filas.map((f) => (
        <Fila
          key={f.id}
          nombre={f.nombre}
          color={f.color}
          valor={f.volumen}
          alCambiar={(v) =>
            actualizar((p) => {
              const x = p.patron.filas.find((y) => y.id === f.id);
              if (x) x.volumen = v;
            })
          }
        />
      ))}
      <span className="nv-volumen__linea" aria-hidden="true" />
      <Fila nombre="Toda la obra" color="var(--nv-acento)" valor={proyecto.volumenMaestro} alCambiar={(v) => actualizar((p) => (p.volumenMaestro = v))} />
    </div>
  );
}
