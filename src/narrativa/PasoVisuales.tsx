// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Paso Visuales.
 *
 * Arriba, una franja dice dónde se está: TODA LA OBRA (ámbar) o una escena
 * (de su color), con sus flechas. Debajo, a la izquierda, la receta en
 * cuatro pasos —Estilo, Colores, Movimiento y Golpes— con «Listo · sigue
 * con…» al pie (ninguno se bloquea). A la derecha, la vista previa (con un
 * botón en la esquina para verla en grande), la frase y la emoción. Abajo,
 * la tira de película: a la izquierda «Ver la obra» (suena en la vista previa,
 * sin agrandarla), una línea de tiempo donde se toca para saltar y, debajo,
 * toda la obra y cada escena, con cuánto llevan y por dónde va lo que suena.
 *
 * Toda la obra pone el estilo, los colores, el movimiento y los golpes de
 * todas las escenas. En una escena se le puede cambiar su estilo, sus
 * colores, su foto de fondo y sus golpes; «Como la obra» lo devuelve.
 *
 * En Movimiento y Golpes hace falta espacio para las cajas y las celdas: la
 * receta se agranda y la vista previa se hace chica.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { duracionSeccion, formatearReloj } from '../estado/proyecto';
import { buscarEscena, EMOCIONES, recorrido } from '../estado/escenas';
import { NOMBRE_ESTILO, ORDEN_ESTILOS, sorprender } from '../estado/imagen';
import { leerArchivoDatos } from '../estado/musica';
import type { Emocion, Escena, Proyecto } from '../estado/tipos';
import { PALETA_FOTO, PALETA_POR_DEFECTO, PALETAS } from '../visual/paletas';
import { PASOS_VISUAL } from './Barra';
import { BarraEscena } from './BarraEscena';
import { Escenario } from './Escenario';
import { Icono } from './Icono';
import { Golpes, Mover } from './ImagenEscena';
import { fondoEscena } from './LineaObra';
import { PanelEmocion } from './PanelEmocion';
import { BotonPista, PistaMano, usePista } from './PistaMano';
import { fijar, useCuadro } from './useCuadro';
import { useReproduccion } from './useReproduccion';

const PASOS = ['Estilo', 'Colores', 'Movimiento', 'Golpes'] as const;

/** La paleta que sugiere cada emoción. */
const SUGERIDA: Record<Emocion, string> = {
  calma: 'aurora',
  alegria: 'sonora',
  tension: 'magma',
  nostalgia: 'metro',
  misterio: 'iris',
  euforia: 'nebulosa',
};

/** Si la imagen de la escena tiene algo propio, distinto de toda la obra. */
function propiaDe(e: Escena): boolean {
  return Boolean(e.algoritmo || e.paleta || e.imagenUrl || e.efectosPasos);
}

/** Qué paso de la receta cambió la escena (para marcarlo con un punto). */
function cambiadoEn(e: Escena | null, paso: number): boolean {
  if (!e) return false;
  if (paso === 0) return Boolean(e.algoritmo || e.imagenUrl);
  if (paso === 1) return Boolean(e.paleta);
  if (paso === 3) return Boolean(e.efectosPasos);
  return false;
}

interface Props {
  /** La escena abierta, o 'general' para toda la obra. */
  abierta: string;
  alIr: (id: string) => void;
}

export function PasoVisuales({ abierta, alIr }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [paso, setPaso] = useState(0);
  const [enGrande, setEnGrande] = useState(false);
  const lista = recorrido(proyecto);
  const escena = abierta === 'general' ? null : (buscarEscena(proyecto, abierta) ?? null);
  const indice = escena ? lista.findIndex((e) => e.id === escena.id) : -1;
  const hechos = escena ? (escena.pasosVisual ?? 0) : (proyecto.visual.pasosVisual ?? 0);
  const ancha = paso >= 2;
  const color = escena ? EMOCIONES[escena.emocion].color : 'var(--nv-acento)';

  const marcar = (n: number) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) e.pasosVisual = Math.max(e.pasosVisual ?? 0, n);
      else p.visual.pasosVisual = Math.max(p.visual.pasosVisual ?? 0, n);
    });

  /** «Listo · sigue con…»: da el paso por hecho y pasa al siguiente (o a la siguiente escena). */
  const listo = () => {
    marcar(paso + 1);
    if (paso < PASOS.length - 1) return setPaso(paso + 1);
    const siguiente = lista[indice + 1];
    setPaso(0);
    if (siguiente) alIr(siguiente.id);
  };
  const siguienteEscena = lista[indice + 1];
  const textoListo =
    paso < PASOS.length - 1
      ? `Listo · sigue con ${PASOS[paso + 1]}`
      : siguienteEscena
        ? `Listo · sigue con ${siguienteEscena.respiro ? 'el respiro' : `la escena ${indice + 2}`}`
        : escena
          ? 'Listo'
          : lista[0]
            ? 'Listo · ir a la escena 1'
            : 'Listo';

  return (
    <div
      className={`nv-paso-visual ${ancha ? 'nv-paso-visual--ancha' : ''} ${escena ? 'nv-paso-visual--escena' : 'nv-paso-visual--obra'}`}
      style={{ ['--contexto' as string]: color }}
    >
      <div className="nv-paso-visual__arriba">
        <section className="nv-receta">
          <div className="nv-receta__pasos" role="tablist" aria-label="Pasos de Visuales">
            {PASOS.map((nombre, i) => {
              const hecho = i < hechos;
              return (
                <button
                  key={nombre}
                  type="button"
                  role="tab"
                  aria-selected={i === paso}
                  className={`nv-receta__paso ${i === paso ? 'nv-receta__paso--actual' : ''} ${hecho ? 'nv-receta__paso--hecho' : ''}`}
                  onClick={() => setPaso(i)}
                >
                  <span className="nv-receta__num">{hecho && i !== paso ? <Icono n="check-bold" tam={11} /> : i + 1}</span>
                  {nombre}
                  {cambiadoEn(escena, i) && <span className="nv-receta__propio" title="Cambiado en esta escena" />}
                </button>
              );
            })}
          </div>

          <div className={`nv-receta__cuerpo ${paso === 2 ? 'nv-receta__cuerpo--mover' : ''}`}>
            {paso === 0 && <PasoEstilo escena={escena} />}
            {paso === 1 && <PasoColores escena={escena} />}
            {paso === 2 && (
              <>
                <div className="nv-receta__encabezado nv-receta__encabezado--fila">
                  <h2 className="nv-receta__titulo">Mover la imagen</h2>
                  {escena && <span className="nv-receta__de-obra">vale para toda la obra</span>}
                  <span className="nv-espacio" />
                  <BotonPista clave="cajitas" />
                </div>
                <Mover escena={escena} estante />
              </>
            )}
            {paso === 3 && (
              <>
                <div className="nv-receta__encabezado nv-receta__encabezado--fila">
                  <h2 className="nv-receta__titulo">Golpes de la imagen</h2>
                  {escena && (
                    <span className="nv-receta__de-obra">{escena.efectosPasos ? 'propios de esta escena' : 'por ahora, los de toda la obra'}</span>
                  )}
                  <span className="nv-espacio" />
                  <BotonPista clave="golpes" />
                </div>
                <Golpes escena={escena} pista />
              </>
            )}
          </div>

          <footer className="nv-receta__pie">
            <span className="nv-receta__cuantos">
              <span className="nv-etiqueta nv-tenue">Paso {paso + 1} de 4</span>
              <span className="nv-receta__puntos">
                {PASOS.map((n, i) => (
                  <span key={n} className={i < hechos ? 'nv-receta__punto--hecho' : i === paso ? 'nv-receta__punto--actual' : ''} />
                ))}
              </span>
            </span>
            <span className="nv-espacio" />
            {escena && propiaDe(escena) && (
              <button
                type="button"
                className="nv-boton nv-receta__como"
                onClick={() =>
                  actualizar((p) => {
                    const e = buscarEscena(p, escena.id);
                    if (!e) return;
                    e.algoritmo = undefined;
                    e.paleta = undefined;
                    e.imagenUrl = undefined;
                    e.efectosPasos = undefined;
                  })
                }
                title="Quitar lo propio de esta escena: vuelve a verse como toda la obra"
              >
                <Icono n="arrow-counter-clockwise-bold" tam={13} /> Como la obra
              </button>
            )}
            <button type="button" className="nv-boton nv-boton--primario nv-receta__listo" onClick={listo}>
              {textoListo}
            </button>
          </footer>
        </section>

        <aside className="nv-paso-visual__lado">
          <Vista
            escena={escena}
            numero={escena ? proyecto.escenas.findIndex((e) => e.id === escena.id) + 1 : 0}
            fuera={enGrande}
            alAgrandar={() => setEnGrande(true)}
          />
          {escena && <BarraEscena escena={escena} indice={indice} tipos={['imagen']} />}
          {escena && <PanelEmocion escena={escena} para="visual" />}
        </aside>
      </div>

      <Cinta actual={escena ? escena.id : 'general'} alIr={alIr} />

      {enGrande && <VisualEnGrande escena={escena} indice={indice} alCerrar={() => setEnGrande(false)} />}
    </div>
  );
}

// ------------------------------------------------------------ dónde se está

// ------------------------------------------------------------ la vista previa

function Vista({ escena: editada, numero: numeroEditada, fuera, alAgrandar }: { escena: Escena | null; numero: number; fuera: boolean; alAgrandar: () => void }) {
  const { proyecto } = useProyecto();
  const { activa, seccion } = useReproduccion();
  // Cuando suena toda la obra, la vista previa la va mostrando y el rótulo dice qué escena suena.
  const suenaObra = activa === 'pieza' && seccion >= 0;
  const suena = suenaObra ? recorrido(proyecto)[seccion] : undefined;
  const escena = suena ?? editada;
  const numero = suena ? proyecto.escenas.findIndex((e) => e.id === suena.id) + 1 : numeroEditada;
  const perfil = escena ? EMOCIONES[escena.emocion] : null;
  return (
    <div className="nv-vista">
      {/* Mientras se ve en grande, aquí no se dibuja: hay un solo motor visual. */}
      {fuera ? <div className="nv-vista__fuera">Viéndose en grande</div> : <Escenario escenaFija={editada?.id} texto={false} />}
      <span className={`nv-vista__chip ${suenaObra ? 'nv-vista__chip--suena' : ''}`}>
        {suenaObra && <Icono n="play-fill" tam={12} />}
        {escena ? (
          <>
            <strong style={{ color: perfil!.color }}>{escena.respiro ? '·' : numero}</strong>
            <strong>{escena.respiro ? 'Respiro' : escena.nombre}</strong>
            <span className="nv-vista__emo" style={{ color: perfil!.color, background: `${perfil!.color}2e` }}>
              <span className="nv-punto" style={{ background: perfil!.color }} /> {perfil!.etiqueta}
            </span>
          </>
        ) : (
          <>
            <Icono n="star-fill" tam={12} /> <strong>Toda la obra</strong>
          </>
        )}
      </span>
      <button type="button" className="nv-vista__agrandar" onClick={alAgrandar} aria-label="Ver la visual en grande" title="Ver en grande">
        <Icono n="corners-out-bold" tam={18} />
      </button>
    </div>
  );
}

/** La visual en grande: ocupa toda la pantalla. El botón de la misma esquina la achica. */
function VisualEnGrande({ escena, indice, alCerrar }: { escena: Escena | null; indice: number; alCerrar: () => void }) {
  const { activa } = useReproduccion();
  const clave = escena ? `escena:${indice}` : 'pieza';
  const sonando = activa === clave;

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => ev.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [alCerrar]);

  return createPortal(
    <div className="nv nv--incrustado nv-grande" role="dialog" aria-label="La visual en grande">
      <Escenario escenaFija={escena?.id} />
      <span className="nv-grande__chip">
        {escena ? (
          <>
            <strong>{escena.respiro ? 'Respiro' : escena.nombre}</strong>
            <span style={{ color: EMOCIONES[escena.emocion].color }}>● {EMOCIONES[escena.emocion].etiqueta}</span>
          </>
        ) : (
          <strong>Toda la obra</strong>
        )}
      </span>
      <div className="nv-grande__pie">
        <button
          type="button"
          className="nv-boton nv-boton--primario"
          onClick={() => (sonando ? motorAudio.detener() : void (escena ? motorAudio.reproducirEscena(indice) : motorAudio.reproducirPieza()))}
        >
          <Icono n={sonando ? 'stop-fill' : 'play-fill'} tam={14} /> {escena ? 'Escena' : 'La obra'}
        </button>
        <span className="nv-espacio" />
        <button type="button" className="nv-grande__achicar" onClick={alCerrar} aria-label="Achicar la visual" title="Achicar">
          <Icono n="corners-in-bold" tam={22} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------ la tira de película

/**
 * La cinta de abajo: una cinta métrica de la obra.
 *
 * El «Escuchar» de arriba es el único botón de reproducir (suena en la vista
 * previa). Aquí hay una regla con los segundos y, justo debajo, las escenas: cada una tan ancha como
 * dura, con su foto, su número y cuánto lleva de sus 4 pasos. Una marca blanca
 * recorre la cinta mientras suena.
 *
 *  - Se toca la regla (o se arrastra) para saltar a ese momento de la obra.
 *  - Se toca una escena para darle su propia imagen (y, si suena la obra,
 *    suena desde ahí); la que se edita sube y se enmarca, y la que suena se
 *    va llenando.
 *
 * «Toda la obra» es la pieza dorada del comienzo: no es una escena, es la
 * base de todas.
 */
function Cinta({ actual, alIr }: { actual: string; alIr: (id: string) => void }) {
  const { proyecto } = useProyecto();
  const { activa, seccion } = useReproduccion();
  const lista = recorrido(proyecto);
  const pista = usePista('escenas-visual', false, 1, '.nv-cinta__escena', lista.length > 0);
  const listas = lista.filter((e) => (e.pasosVisual ?? 0) >= PASOS_VISUAL).length;
  const duraciones = proyecto.secciones.map((s) => duracionSeccion(proyecto, s));
  const sonandoObra = activa === 'pieza';
  const durRef = useRef(duraciones);
  durRef.current = duraciones;
  const sonandoRef = useRef(sonandoObra);
  sonandoRef.current = sonandoObra;
  const celdas = useRef(new Map<number, HTMLElement>());
  const llenos = useRef(new Map<number, HTMLElement>());
  const cabezal = useRef<HTMLSpanElement>(null);
  const fantasma = useRef<HTMLSpanElement>(null);
  const reloj = useRef<HTMLSpanElement>(null);
  const cinta = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);
  const saltado = useRef(false);

  useCuadro(() => {
    const pos = motorAudio.estaSonando ? motorAudio.posicionOida : null;
    const dur = durRef.current;
    for (let i = 0; i < dur.length; i++) {
      const aqui = pos !== null && pos.indice === i;
      const fraccion = aqui ? Math.min(1, pos.segundos / Math.max(0.1, dur[i] ?? 1)) : 0;
      // Dentro de la obra lo que ya pasó queda lleno; si suena una sola escena, solo esa.
      const lleno = pos !== null && sonandoRef.current && i < pos.indice ? 1 : fraccion;
      fijar(llenos.current.get(i), 'width', `${(lleno * 100).toFixed(1)}%`);
      const celda = celdas.current.get(i);
      if (aqui && celda) fijar(cabezal.current, 'left', `${(celda.offsetLeft + fraccion * celda.offsetWidth).toFixed(1)}px`);
    }
    fijar(cabezal.current, 'display', pos ? 'block' : 'none');
    const suma = dur.reduce((a, b) => a + b, 0);
    const t = pos ? dur.slice(0, pos.indice).reduce((a, b) => a + b, 0) + pos.segundos : 0;
    fijar(reloj.current, 'texto', `${formatearReloj(Math.min(t, suma))} / ${formatearReloj(suma)}`);
  });

  // Mientras suena la obra, la escena que suena se mantiene a la vista.
  useEffect(() => {
    if (!sonandoObra || seccion < 0) return;
    celdas.current.get(seccion)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [sonandoObra, seccion]);

  // Con el mouse, la rueda desplaza la cinta de lado cuando no cabe.
  useEffect(() => {
    const el = cinta.current;
    if (!el) return;
    const rueda = (ev: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
      ev.preventDefault();
      el.scrollLeft += ev.deltaY;
    };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => el.removeEventListener('wheel', rueda);
  }, []);

  /** A qué escena y a qué segundo de ella corresponde un punto de la regla. */
  const puntoEn = (x: number): { i: number; fraccion: number } | null => {
    let mejor: { i: number; fraccion: number; d: number } | null = null;
    for (const [i, celda] of celdas.current) {
      const caja = celda.getBoundingClientRect();
      const d = x < caja.left ? caja.left - x : x > caja.right ? x - caja.right : 0;
      if (!mejor || d < mejor.d) mejor = { i, d, fraccion: Math.max(0, Math.min(1, (x - caja.left) / Math.max(1, caja.width))) };
    }
    return mejor;
  };
  const marcar = (x: number) => {
    const p = puntoEn(x);
    const celda = p && celdas.current.get(p.i);
    if (!p || !celda) return;
    fijar(fantasma.current, 'left', `${(celda.offsetLeft + p.fraccion * celda.offsetWidth).toFixed(1)}px`);
  };
  const saltar = (x: number) => {
    const p = puntoEn(x);
    if (!p) return;
    const dur = duraciones[p.i] ?? 0;
    void motorAudio.reproducirPieza(p.i, Math.max(0, Math.min(p.fraccion * dur, dur - 0.3)));
  };

  let inicio = 0;
  return (
    <nav className="nv-pelicula" aria-label="Escenas">
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca una escena para darle su propia imagen. Lo que no cambies sigue como en «Toda la obra»."
          origen={() => null}
          destinos={() => [[...document.querySelectorAll('.nv-cinta__escena:not(.nv-cinta__escena--aqui)')][0]].filter((e): e is Element => !!e)}
          alCerrar={pista.cerrar}
        />
      )}
      <div className="nv-cinta" ref={cinta}>
        <div className="nv-cinta__interior">
          <button
            type="button"
            className={`nv-cinta__obra ${actual === 'general' ? 'nv-cinta__obra--aqui' : ''}`}
            onClick={() => alIr('general')}
            aria-current={actual === 'general' ? 'true' : undefined}
            title="Lo que se elige aquí vale para todas las escenas"
          >
            <Icono n="star-fill" tam={20} />
            <strong>Toda la obra</strong>
            <span className="nv-cinta__pasos" aria-label={`${Math.min(proyecto.visual.pasosVisual ?? 0, PASOS_VISUAL)} de ${PASOS_VISUAL} pasos`}>
              {Array.from({ length: PASOS_VISUAL }, (_, k) => (
                <span key={k} className={k < (proyecto.visual.pasosVisual ?? 0) ? 'nv-cinta__paso--hecho' : ''} />
              ))}
            </span>
          </button>

          <div className="nv-cinta__tramos">
            <div
              className="nv-cinta__reglas"
              title="Toca la regla para saltar a ese momento de la obra"
              onPointerDown={(ev) => {
                saltado.current = false;
                ev.currentTarget.setPointerCapture(ev.pointerId);
                arrastrando.current = true;
                fijar(fantasma.current, 'display', 'block');
                marcar(ev.clientX);
              }}
              onPointerMove={(ev) => arrastrando.current && marcar(ev.clientX)}
              onPointerUp={(ev) => {
                if (!arrastrando.current) return;
                arrastrando.current = false;
                fijar(fantasma.current, 'display', 'none');
                saltado.current = true;
                saltar(ev.clientX);
              }}
              onClick={(ev) => {
                // Si el puntero no alcanzó a avisar, el clic salta igual.
                if (!saltado.current) saltar(ev.clientX);
                saltado.current = false;
              }}
              onPointerCancel={() => {
                arrastrando.current = false;
                fijar(fantasma.current, 'display', 'none');
              }}
            >
              {lista.map((e, i) => {
                const desde = inicio;
                inicio += duraciones[i] ?? 0;
                return (
                  <span
                    key={e.id}
                    className="nv-cinta__celda nv-cinta__regla"
                    ref={(n) => {
                      if (n) celdas.current.set(i, n);
                      else celdas.current.delete(i);
                    }}
                    style={{ flexGrow: Math.max(1, duraciones[i] ?? 1), ['--dur' as string]: Math.max(1, duraciones[i] ?? 1) }}
                  >
                    <span className="nv-cinta__marcas" />
                    <span className="nv-cinta__hora">{formatearReloj(desde)}</span>
                  </span>
                );
              })}
            </div>
            <div className="nv-cinta__filas">
              {lista.map((e, i) => {
                const numero = proyecto.escenas.findIndex((x) => x.id === e.id) + 1;
                const pasos = e.pasosVisual ?? 0;
                const aqui = actual === e.id;
                return (
                  <span key={e.id} className="nv-cinta__celda" style={{ flexGrow: Math.max(1, duraciones[i] ?? 1) }}>
                    <button
                      type="button"
                      className={`nv-cinta__escena ${aqui ? 'nv-cinta__escena--aqui' : ''} ${seccion === i ? 'nv-cinta__escena--suena' : ''} ${e.respiro ? 'nv-cinta__escena--respiro' : ''}`}
                      style={{ ['--color' as string]: EMOCIONES[e.emocion].color }}
                      onClick={(ev) => {
                        alIr(e.id);
                        // Con algo sonando (la obra o una escena sola), tocar una escena lleva la obra a ese punto.
                        if (!motorAudio.claveActiva) return;
                        const caja = ev.currentTarget.getBoundingClientRect();
                        const dur = duraciones[i] ?? 0;
                        const fraccion = Math.max(0, Math.min(1, (ev.clientX - caja.left) / Math.max(1, caja.width)));
                        void motorAudio.reproducirPieza(i, Math.max(0, Math.min(fraccion * dur, dur - 0.3)));
                      }}
                      aria-current={aqui ? 'true' : undefined}
                    >
                      <span className="nv-cinta__foto" style={{ background: fondoEscena(e) }} />
                      <span
                        className="nv-cinta__lleno"
                        ref={(n) => {
                          if (n) llenos.current.set(i, n);
                          else llenos.current.delete(i);
                        }}
                      />
                      <span className="nv-cinta__nombre">
                        <span className="nv-cinta__num">{e.respiro ? '·' : numero}</span>
                        <span className="nv-cinta__texto">{e.respiro ? 'Respiro' : e.nombre}</span>
                        {pasos >= PASOS_VISUAL && (
                          <span className="nv-cinta__lista">
                            <Icono n="check-bold" tam={10} />
                          </span>
                        )}
                      </span>
                      <span className="nv-cinta__pie">
                        <span className="nv-cinta__pasos" aria-label={`${Math.min(pasos, PASOS_VISUAL)} de ${PASOS_VISUAL} pasos`}>
                          {Array.from({ length: PASOS_VISUAL }, (_, k) => (
                            <span key={k} className={k < pasos ? 'nv-cinta__paso--hecho' : ''} />
                          ))}
                        </span>
                        {propiaDe(e) && <span className="nv-cinta__propia" title="Tiene cambios propios" />}
                      </span>
                    </button>
                  </span>
                );
              })}
            </div>
            <span ref={fantasma} className="nv-cinta__fantasma" style={{ display: 'none' }} />
            <span ref={cabezal} className="nv-cinta__cabezal" style={{ display: 'none' }} />
          </div>
        </div>
      </div>

      <span className="nv-pelicula__resumen">
        <span ref={reloj} className="nv-mono nv-pelicula__reloj" />
        <strong>
          {listas} de {lista.length}
        </strong>
        <span>escenas listas</span>
      </span>
      <BotonPista clave="escenas-visual" corto />
    </nav>
  );
}

// ------------------------------------------------------------ paso 1: estilo (y foto de fondo)

function PasoEstilo({ escena }: { escena: Escena | null }) {
  const { proyecto, actualizar } = useProyecto();
  const v = proyecto.visual;
  const actual = escena?.algoritmo ?? v.algoritmo;
  // La primera vez, la mano toca tres estilos: cada uno se ve en el escenario de la derecha.
  const pista = usePista('estilo-visual', false, 2, '[data-bloqueo="visual:estilo"] .nv-eleccion');

  const elegir = (a: (typeof ORDEN_ESTILOS)[number]) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      // En una escena, elegir el mismo de la obra quita lo propio.
      if (e) e.algoritmo = a === p.visual.algoritmo ? undefined : a;
      else p.visual.algoritmo = a;
    });

  const sorpresa = () =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (!e) return sorprender(p);
      const otros = ORDEN_ESTILOS.filter((a) => a !== (e.algoritmo ?? p.visual.algoritmo));
      e.algoritmo = otros[Math.floor(Math.random() * otros.length)];
      e.paleta = PALETAS[Math.floor(Math.random() * PALETAS.length)].id;
    });

  return (
    <>
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca un estilo y míralo en el escenario de la derecha. Prueben varios antes de quedarse con uno."
          origen={() => null}
          destinos={() => [...document.querySelectorAll('[data-bloqueo="visual:estilo"] .nv-eleccion:not(.nv-eleccion--activa):not(.nv-eleccion--sorpresa)')].slice(0, 3)}
          alCerrar={pista.cerrar}
        />
      )}
      <FotoDeFondo escena={escena} />
      <div className="nv-receta__encabezado">
        <h2 className="nv-receta__titulo">{escena ? '¿Con qué estilo se dibuja esta escena?' : '¿Con qué estilo se dibuja la obra?'}</h2>
        <span className="nv-receta__nota">
          {escena ? 'El que dice «toda la obra» es el de las demás escenas; si eligen otro, solo cambia esta.' : 'Cada estilo dibuja la escena a su manera. Toquen uno y mírenlo en el escenario.'}
        </span>
      </div>
      <div className="nv-receta__rejilla" data-bloqueo="visual:estilo">
        {ORDEN_ESTILOS.map((a) => (
          <button key={a} type="button" className={`nv-eleccion nv-estilo--${a} ${actual === a ? 'nv-eleccion--activa' : ''}`} onClick={() => elegir(a)}>
            <span className="nv-estilo__muestra nv-eleccion__muestra" />
            <span className="nv-eleccion__nombre">
              {NOMBRE_ESTILO[a]}
              {escena && a === v.algoritmo && <span className="nv-eleccion__obra">toda la obra</span>}
            </span>
          </button>
        ))}
        <button type="button" className="nv-eleccion nv-eleccion--sorpresa" onClick={sorpresa}>
          <Icono n="sparkle-fill" tam={16} /> Sorpréndeme
        </button>
      </div>
    </>
  );
}

/** Las fotos del proyecto (las imágenes subidas). */
function fotosDe(p: Proyecto) {
  return p.archivosDatos.filter((a) => a.tipo === 'imagen');
}

/**
 * Pone (o quita) la foto de fondo de una escena o de toda la obra. Al
 * ponerla, los colores pasan a ser los de la foto; si después se cambian,
 * es porque eligieron otra paleta o una cajita en «Colores».
 */
function ponerFotoFondo(p: Proyecto, escenaId: string | null, url: string | undefined): void {
  // Poner una foto es pedir sus colores: una cajita que movía «Colores» se quita.
  if (url) p.conexionesVisual = p.conexionesVisual.filter((c) => c.destino !== 'paleta');
  const e = escenaId ? buscarEscena(p, escenaId) : undefined;
  if (e) {
    e.imagenUrl = url;
    if (url && (e.paleta ?? p.visual.paleta) !== PALETA_FOTO) e.paleta = PALETA_FOTO;
    if (!url && e.paleta === PALETA_FOTO) e.paleta = undefined;
    return;
  }
  p.visual.imagenUrl = url;
  if (url) {
    p.visual.paleta = PALETA_FOTO;
    p.visual.paletaPropia = undefined;
  } else if (p.visual.paleta === PALETA_FOTO) {
    p.visual.paleta = PALETA_POR_DEFECTO;
  }
}

/** Borra una foto del proyecto: sus cajitas, y de fondo donde estaba puesta. */
function borrarFoto(p: Proyecto, id: string): void {
  const foto = p.archivosDatos.find((a) => a.id === id);
  p.archivosDatos = p.archivosDatos.filter((a) => a.id !== id);
  p.conexionesVisual = p.conexionesVisual.filter((c) => !c.fuente.startsWith(`archivo:${id}`));
  if (!foto?.url) return;
  if (p.visual.imagenUrl === foto.url) ponerFotoFondo(p, null, undefined);
  for (const e of [...p.escenas, ...p.respiros]) if (e.imagenUrl === foto.url) ponerFotoFondo(p, e.id, undefined);
}

/**
 * La foto de fondo: el estilo toma su forma y, de entrada, sus colores. Se
 * elige entre las fotos que ya subieron o se trae una de la galería. El bote
 * de cada foto la borra del proyecto (se toca dos veces, por si acaso).
 */
function FotoDeFondo({ escena }: { escena: Escena | null }) {
  const { proyecto, actualizar } = useProyecto();
  const [leyendo, setLeyendo] = useState(false);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const fotos = fotosDe(proyecto);
  const fondo = escena ? escena.imagenUrl : proyecto.visual.imagenUrl;
  const id = escena?.id ?? null;

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setLeyendo(true);
    try {
      for (const [i, archivo] of Array.from(archivos).entries()) {
        const datos = await leerArchivoDatos(archivo);
        const url = crearUrl(archivo);
        actualizar((p) => {
          p.archivosDatos.push({ ...datos, nombre: `Foto ${fotosDe(p).length + 1}`, url });
          if (i === 0) ponerFotoFondo(p, id, url);
        });
      }
    } finally {
      setLeyendo(false);
    }
  };

  const borrar = (idFoto: string) => {
    if (porBorrar !== idFoto) {
      setPorBorrar(idFoto);
      window.setTimeout(() => setPorBorrar((x) => (x === idFoto ? null : x)), 3000);
      return;
    }
    setPorBorrar(null);
    actualizar((p) => borrarFoto(p, idFoto));
  };

  return (
    <div className="nv-fondo" data-bloqueo="visual:fotos">
      <div className="nv-fondo__cabeza">
        <span className="nv-fondo__icono">
          <Icono n="image-fill" tam={15} />
        </span>
        <strong>Foto de fondo</strong>
        <span className="nv-tenue nv-chico">· el estilo toma su forma y sus colores{escena ? ' en esta escena' : ''}</span>
      </div>
      <div className="nv-fondo__fotos">
        <button type="button" className={`nv-fondo__sin ${!fondo ? 'nv-fondo__sin--activo' : ''}`} onClick={() => actualizar((p) => ponerFotoFondo(p, id, undefined))} aria-pressed={!fondo}>
          Sin foto
        </button>
        {fotos.map((f) => {
          const puesta = Boolean(f.url) && f.url === fondo;
          const seguro = porBorrar === f.id;
          return (
            <span key={f.id} className={`nv-fondo__foto ${puesta ? 'nv-fondo__foto--puesta' : ''}`}>
              <button
                type="button"
                className="nv-fondo__imagen"
                style={f.url ? { backgroundImage: `url(${f.url})` } : undefined}
                onClick={() => f.url && actualizar((p) => ponerFotoFondo(p, id, puesta ? undefined : f.url))}
                title={puesta ? 'Quitar del fondo' : `Poner ${f.nombre} de fondo`}
                aria-pressed={puesta}
              />
              {puesta && (
                <span className="nv-fondo__marca" aria-hidden="true">
                  <Icono n="check-bold" tam={10} />
                </span>
              )}
              <button
                type="button"
                className={`nv-fondo__borrar ${seguro ? 'nv-fondo__borrar--seguro' : ''}`}
                onClick={() => borrar(f.id)}
                aria-label={seguro ? `Sí, borrar ${f.nombre}` : `Borrar ${f.nombre}`}
                title={seguro ? 'Toquen otra vez para borrarla' : 'Borrar esta foto del proyecto'}
              >
                {seguro ? '¿Borrar?' : <Icono n="trash-bold" tam={11} />}
              </button>
            </span>
          );
        })}
        <label className="nv-fondo__subir">
          <Icono n="plus-bold" tam={13} />
          {leyendo ? 'Leyendo…' : 'De la galería'}
          <input type="file" accept="image/*" multiple hidden onChange={(ev) => void subir(ev.target.files)} />
        </label>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ paso 2: colores

function PasoColores({ escena }: { escena: Escena | null }) {
  const { proyecto, actualizar } = useProyecto();
  const v = proyecto.visual;
  const sugerida = escena ? SUGERIDA[escena.emocion] : null;
  const actual = escena?.paleta ?? (v.paletaPropia ? null : v.paleta);
  const cajita = proyecto.conexionesVisual.some((c) => c.destino === 'paleta');
  const pista = usePista('colores-visual', false, 2, '[data-bloqueo="visual:paleta"] .nv-eleccion');
  // La foto que se ve aquí: la de la escena, o la de toda la obra.
  const foto = escena ? (escena.imagenUrl ?? v.imagenUrl) : v.imagenUrl;
  const deFoto = actual === PALETA_FOTO;

  const elegir = (id: string) =>
    actualizar((p) => {
      // Elegir una paleta manda: si una cajita movía los colores, se quita.
      p.conexionesVisual = p.conexionesVisual.filter((c) => c.destino !== 'paleta');
      const e = escena && buscarEscena(p, escena.id);
      if (e) {
        e.paleta = id === p.visual.paleta && !p.visual.paletaPropia ? undefined : id;
        return;
      }
      p.visual.paleta = id;
      p.visual.paletaPropia = undefined;
    });

  return (
    <>
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca una paleta: la imagen se pinta con esos colores. Si pusieron una foto de fondo, «Colores de la foto» usa los suyos."
          origen={() => null}
          destinos={() => [...document.querySelectorAll('[data-bloqueo="visual:paleta"] .nv-eleccion:not(.nv-eleccion--activa):not(.nv-eleccion--sorpresa):not(:disabled)')].slice(0, 3)}
          alCerrar={pista.cerrar}
        />
      )}
      <div className="nv-receta__encabezado">
        <h2 className="nv-receta__titulo">{escena ? '¿Con qué colores va esta escena?' : '¿Con qué colores va la obra?'}</h2>
        <span className="nv-receta__nota">
          {escena ? 'La emoción de la escena sugiere una paleta; pueden elegir otra. La que dice «toda la obra» es la de las demás.' : 'Los colores de todas las escenas. Después cada escena puede tener los suyos.'}
        </span>
      </div>
      {cajita && (
        <p className="nv-receta__aviso">
          <Icono n="sliders-horizontal-bold" tam={13} /> Ahora los colores los mueve una cajita en «Movimiento». Si eligen una paleta, esa cajita se quita.
        </p>
      )}
      {foto && (
        <p className={`nv-receta__aviso ${deFoto ? 'nv-receta__aviso--foto' : ''}`}>
          <Icono n="image-fill" tam={13} />
          {deFoto
            ? 'Están usando los colores originales de la foto. Si eligen una paleta, la foto se tiñe con sus colores.'
            : 'Ojo: con una paleta la foto pierde sus colores originales y se ve con los de la paleta. «Colores de la foto» se los devuelve.'}
        </p>
      )}
      <div className="nv-receta__rejilla" data-bloqueo="visual:paleta">
        <button
          type="button"
          className={`nv-eleccion nv-eleccion--foto ${deFoto ? 'nv-eleccion--activa' : ''}`}
          onClick={() => elegir(PALETA_FOTO)}
          disabled={!foto}
          title={foto ? 'Cada parte de la obra toma el color real de la foto' : 'Primero pongan una foto de fondo (paso Estilo)'}
        >
          <span className="nv-eleccion__paleta nv-eleccion__paleta--foto" style={foto ? { backgroundImage: `url(${foto})` } : undefined}>
            {!foto && <Icono n="image-fill" tam={18} />}
          </span>
          <span className="nv-eleccion__nombre">
            Colores de la foto
            {escena && v.paleta === PALETA_FOTO && <span className="nv-eleccion__obra">toda la obra</span>}
            {!foto && <span className="nv-eleccion__falta">pongan una foto de fondo</span>}
          </span>
        </button>
        {PALETAS.map((pal) => (
          <button key={pal.id} type="button" className={`nv-eleccion ${actual === pal.id ? 'nv-eleccion--activa' : ''}`} onClick={() => elegir(pal.id)}>
            <span className="nv-eleccion__paleta">
              {pal.colores.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="nv-eleccion__nombre">
              {pal.nombre}
              {escena && pal.id === v.paleta && <span className="nv-eleccion__obra">toda la obra</span>}
              {sugerida === pal.id && escena && (
                <span className="nv-eleccion__sugiere" style={{ color: EMOCIONES[escena.emocion].color, background: `${EMOCIONES[escena.emocion].color}26` }}>
                  ● la sugiere {EMOCIONES[escena.emocion].etiqueta}
                </span>
              )}
            </span>
          </button>
        ))}
        <button type="button" className="nv-eleccion nv-eleccion--sorpresa" onClick={() => elegir(PALETAS[Math.floor(Math.random() * PALETAS.length)].id)}>
          <Icono n="sparkle-fill" tam={16} /> Sorpréndeme
        </button>
      </div>
    </>
  );
}
