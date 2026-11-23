// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Paso 1: la historia, como una lección de cuatro tramos (Figma, Ronda 8):
 *  1. Recorrido: el mapa de las 6 estaciones y sus tableros (HistoriaEstaciones).
 *  2. Monólogo: con lo que recogieron escriben su historia, para decirla en voz alta.
 *  3. Recorte: la parten en escenas arrastrando los límites (PartirTexto).
 *  4. Emociones: qué siente cada escena; eso cambia la música y la imagen.
 *
 * Vive dentro del marco normal de la app (la barra de arriba con los pasos). La lección
 * pone encima sus barras de avance («Paso n de 4») y abajo un pie con cómo va y el
 * botón para seguir. Nada se
 * bloquea: las barras de arriba llevan a cualquier tramo.
 */
import { useRef, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import { agregarCorte, buscarEscena, cargarEjemplo, EMOCIONES, NOMBRE_FUERZA, ORDEN_EMOCIONES, quitarCorte, sincronizarEscenas } from '../estado/escenas';
import { ESTACIONES } from '../estado/estaciones';
import { MAXIMO_PALABRAS, MINIMO_PALABRAS, type Emocion, type Escena, type Fuerza } from '../estado/tipos';
import { EstacionVista, MapaEstaciones, progresoEstacion } from './HistoriaEstaciones';
import { HuecoPie, Pie } from './LeccionHistoria';
import { Icono } from './Icono';
import { PartirTexto } from './PartirTexto';
import { BotonPista, PistaMano, usePista } from './PistaMano';

type Tramo = 'recorrido' | 'monologo' | 'recorte' | 'emociones';
const TRAMOS: { id: Tramo; nombre: string }[] = [
  { id: 'recorrido', nombre: 'RECORRIDO' },
  { id: 'monologo', nombre: 'MONÓLOGO' },
  { id: 'recorte', nombre: 'RECORTE' },
  { id: 'emociones', nombre: 'EMOCIONES' },
];
/** Palabras por segundo al decirlo con calma. */
const RITMO = 2.3;

export function PasoHistoria({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto } = useProyecto();
  const [tramo, setTramo] = useState<Tramo>('recorrido');
  const [estacion, setEstacion] = useState<number | null>(null);
  const [escenaEmo, setEscenaEmo] = useState(0);
  const [hueco, setHueco] = useState<HTMLElement | null>(null);

  const total = palabrasDe(proyecto.narracion.texto).length;
  const escenas = proyecto.escenas.length;
  const hechas = ESTACIONES.filter((_, i) => progresoEstacion(proyecto, i).estado === 'hecha').length;
  const actual = TRAMOS.findIndex((t) => t.id === tramo);
  const avance = [hechas / 6, Math.min(1, total / MINIMO_PALABRAS), escenas > 1 ? 1 : escenas ? 0.5 : 0, escenas ? (Math.min(escenaEmo, escenas - 1) + 1) / escenas : 0];
  const ir = (t: Tramo) => {
    setTramo(t);
    setEstacion(null);
  };

  return (
    <HuecoPie.Provider value={hueco}>
      <div className="nv-lec">
        <header className="nv-lec__cabeza">
          <div className="nv-lec__paso">
            <span>HISTORIA</span>
            <strong>Paso {actual + 1} de 4</strong>
          </div>
          <nav className="nv-lec__tramos" aria-label="Tramos de la historia">
            {TRAMOS.map((t, i) => {
              const estado = i < actual ? 'hecho' : i === actual ? 'actual' : 'luego';
              const lleno = estado === 'hecho' ? 1 : estado === 'actual' ? Math.max(0.08, avance[i]) : 0;
              return (
                <button key={t.id} type="button" className={`nv-lec__tramo nv-lec__tramo--${estado}`} onClick={() => ir(t.id)} aria-current={estado === 'actual' ? 'step' : undefined}>
                  <span className="nv-lec__barra">
                    <span style={{ width: `${lleno * 100}%` }} />
                  </span>
                  <span className="nv-lec__nombre">{t.nombre}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className={`nv-lec__cuerpo nv-lec__cuerpo--${tramo}`}>
          {tramo === 'recorrido' &&
            (estacion === null ? <MapaEstaciones alEntrar={setEstacion} alSeguir={() => ir('monologo')} /> : <EstacionVista indice={estacion} alVolver={() => setEstacion(null)} />)}
          {tramo === 'monologo' && <Monologo alSeguir={() => ir('recorte')} />}
          {tramo === 'recorte' && <Recorte alSeguir={() => ir('emociones')} />}
          {tramo === 'emociones' && <Emociones i={escenaEmo} setI={setEscenaEmo} alTerminar={alSeguir} />}
        </div>

        <footer className="nv-lec__pie" ref={setHueco} />
      </div>
    </HuecoPie.Provider>
  );
}

// ------------------------------------------------------------ monólogo

function Monologo({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar, empezarDeNuevo } = useProyecto();
  const [seguro, setSeguro] = useState(false);
  const texto = proyecto.narracion.texto;
  const total = palabrasDe(texto).length;
  const ESCALA = MAXIMO_PALABRAS * 1.23;
  const pct = (n: number) => `${Math.min(100, (n / ESCALA) * 100)}%`;
  const bien = total >= MINIMO_PALABRAS && total <= MAXIMO_PALABRAS;

  return (
    <div className="nv-his-mono">
      <div className="nv-his-cabeza">
        <div>
          <h1 className="nv-his-cabeza__titulo">Escriban su monólogo</h1>
          <p className="nv-his-cabeza__sub">Junten lo que recogieron en una sola historia, para decirla en voz alta.</p>
        </div>
        <span className="nv-espacio" />
        <button
          type="button"
          className={`nv-his-boton ${seguro ? 'nv-his-boton--peligro' : ''}`}
          onClick={() => {
            if (!seguro) {
              setSeguro(true);
              window.setTimeout(() => setSeguro(false), 3000);
              return;
            }
            setSeguro(false);
            empezarDeNuevo();
          }}
        >
          {seguro ? '¿Seguro? Toca otra vez' : 'Empezar de cero'}
        </button>
        <button type="button" className="nv-his-boton" onClick={() => actualizar((p) => cargarEjemplo(p))}>
          Usar un ejemplo
        </button>
      </div>
      <section className="nv-his-mono__texto" data-bloqueo="historia:monologo">
        <div className="nv-his-mono__fila">
          <span className="nv-his-mono__rotulo">TU MONÓLOGO</span>
          <span className="nv-espacio" />
          <span className={`nv-his-mono__cuenta ${bien ? '' : 'nv-his-mono__cuenta--falta'}`}>{total} palabras</span>
          <span className="nv-his-mono__segundos">· ≈ {Math.round(total / RITMO)} s</span>
        </div>
        <textarea
          className="nv-his-mono__campo"
          value={texto}
          spellCheck={false}
          placeholder="Unas 100 palabras, para decirlas, no para cantarlas…"
          onChange={(ev) =>
            actualizar((p) => {
              p.narracion.texto = ev.target.value;
              sincronizarEscenas(p);
            })
          }
        />
        <div className="nv-his-mono__medidor" aria-hidden="true">
          <span className="nv-his-mono__zona" style={{ left: pct(MINIMO_PALABRAS), width: `calc(${pct(MAXIMO_PALABRAS)} - ${pct(MINIMO_PALABRAS)})` }} />
          <span className="nv-his-mono__marca" style={{ left: pct(total) }} />
        </div>
        <div className="nv-his-mono__escala">
          <span style={{ left: pct(MINIMO_PALABRAS) }}>{MINIMO_PALABRAS}</span>
          <span style={{ left: pct(MAXIMO_PALABRAS) }}>{MAXIMO_PALABRAS} palabras</span>
        </div>
      </section>
      <Pie
        ok={bien}
        color={bien || total === 0 ? undefined : '#ffb020'}
        mensaje={
          total === 0
            ? 'Escriban su historia con lo que recogieron'
            : total < MINIMO_PALABRAS
              ? `${total} palabras · les faltan unas ${MINIMO_PALABRAS - total}`
              : total > MAXIMO_PALABRAS
                ? `${total} palabras · recorten unas ${total - MAXIMO_PALABRAS}`
                : '¡Buen tamaño! Ya pueden cortarlo en escenas.'
        }
        boton="Seguir"
        alTocar={alSeguir}
        desactivado={total === 0}
      />
    </div>
  );
}

// ------------------------------------------------------------ recorte

function Recorte({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const palabras = palabrasDe(proyecto.narracion.texto).length;
  const n = proyecto.escenas.length;
  const segundos = n ? Math.max(1, Math.round(palabras / RITMO / n)) : 0;
  // La pista enseña a arrastrar un límite (o, si aún no hay, a agregar un corte con el +).
  const cortes = JSON.stringify(proyecto.cortesEscena);
  const cortesAlEntrar = useRef(cortes);
  const hayLimite = proyecto.cortesEscena.length > 0;
  const pista = usePista('recorte', cortes !== cortesAlEntrar.current, 1, '.nv-limite, .nv-his-contador button', palabras > 0);
  return (
    <div className="nv-his-recorte">
      {pista.visible &&
        (hayLimite ? (
          <PistaMano
            modo="arrastrar"
            texto="Arrastra un límite hacia otra palabra: así decides dónde empieza cada escena."
            origen={() => document.querySelector('.nv-limite__asa')}
            destinos={() => {
              const asa = document.querySelector('.nv-limite__asa');
              if (!asa) return [];
              const r = asa.getBoundingClientRect();
              const cerca = [...document.querySelectorAll('.nv-partir__texto [data-i]')].filter(
                (e) => Math.abs(e.getBoundingClientRect().top - r.top) < 40 && e.getBoundingClientRect().left > r.left + 40,
              );
              const destino = cerca[Math.min(3, cerca.length - 1)];
              return destino ? [destino] : [];
            }}
            alCerrar={pista.cerrar}
          />
        ) : (
          <PistaMano
            modo="tocar"
            texto="Toca el + para agregar un corte: la historia se parte en una escena más."
            origen={() => null}
            destinos={() => [document.querySelector('.nv-his-contador button:last-of-type')].filter((e): e is Element => !!e)}
            alCerrar={pista.cerrar}
          />
        ))}
      <div className="nv-his-cabeza">
        <div>
          <h1 className="nv-his-cabeza__titulo">Córtenlo en escenas</h1>
          <p className="nv-his-cabeza__sub">
            Las escenas son las partes de su narrativa sonora, como la estrofa o el coro de una canción: cada una tendrá su propia música y su propia imagen. Arrastren los
            límites para decidir dónde empieza cada una.
          </p>
        </div>
        <span className="nv-espacio" />
        <BotonPista clave="recorte" />
        {palabras > 0 && (
          <div className="nv-his-contador">
            <button type="button" aria-label="Menos escenas" disabled={proyecto.cortesEscena.length === 0} onClick={() => actualizar((p) => quitarCorte(p))}>
              <Icono n="minus-bold" tam={13} />
            </button>
            <span>
              <strong>{n}</strong> {n === 1 ? 'escena' : 'escenas'}
            </span>
            <button type="button" aria-label="Más escenas" disabled={n >= palabras} onClick={() => actualizar((p) => agregarCorte(p))}>
              <Icono n="plus-bold" tam={13} />
            </button>
          </div>
        )}
      </div>
      {palabras > 0 ? <PartirTexto sinCabeza /> : <p className="nv-his-col__vacio">Primero escriban el monólogo.</p>}
      <Pie
        ok={n > 1}
        color={n > 1 ? undefined : '#ffb020'}
        mensaje={n === 0 ? 'Primero escriban el monólogo' : n === 1 ? 'Una sola escena: agreguen cortes con el +' : `${n} escenas, buen ritmo: unos ${segundos} segundos cada una.`}
        boton="Seguir"
        alTocar={alSeguir}
        desactivado={n === 0}
      />
    </div>
  );
}

// ------------------------------------------------------------ emociones

const DESCRIPCION: Record<Emocion, string> = {
  calma: 'Lenta y suave · colores fríos y quietos',
  alegria: 'Brillante y saltarina · colores vivos',
  tension: 'Oscura y apurada · la imagen tiembla',
  nostalgia: 'Dulce y lejana · colores gastados',
  misterio: 'Grave, en suspenso · sombras que se mueven',
  euforia: 'A tope · todo explota',
};
const EFECTO: Record<Emocion, string> = {
  calma: 'la música se calma y la imagen respira despacio',
  alegria: 'la música brilla y la imagen salta',
  tension: 'la música se aprieta y la imagen tiembla',
  nostalgia: 'la música se aleja y los colores se gastan',
  misterio: 'la música baja y las sombras se mueven',
  euforia: 'la música explota y la imagen también',
};
/** El color oscuro de cada franja (Figma): de él al color de la emoción. */
const FONDO: Record<Emocion, string> = {
  calma: '#0d2236',
  alegria: '#3a2a06',
  tension: '#3a0b16',
  nostalgia: '#22123d',
  misterio: '#10153a',
  euforia: '#3d1d00',
};

function Emociones({ i: indice, setI, alTerminar }: { i: number; setI: (i: number) => void; alTerminar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const escenas = proyecto.escenas;
  const i = Math.min(indice, Math.max(0, escenas.length - 1));
  const escena: Escena | undefined = escenas[i];

  if (!escena) {
    return (
      <div className="nv-his-emo">
        <div className="nv-his-cabeza">
          <div>
            <h1 className="nv-his-cabeza__titulo">¿Qué siente cada escena?</h1>
            <p className="nv-his-cabeza__sub">Primero escriban el monólogo y córtenlo en escenas.</p>
          </div>
        </div>
        <Pie ok={false} color="#ffb020" mensaje="Todavía no hay escenas" boton="Seguir a Voz" alTocar={alTerminar} />
      </div>
    );
  }
  const perfil = EMOCIONES[escena.emocion];
  const ultima = i >= escenas.length - 1;
  const cambiar = (receta: (e: Escena) => void) =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (e) receta(e);
    });

  return (
    <div className="nv-his-emo" style={{ ['--color' as string]: perfil.color }}>
      <div className="nv-his-emo__globo">
        <span className="nv-his-emo__nav">
          <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Escena anterior">
            <Icono n="caret-left-bold" tam={13} />
          </button>
          <button type="button" onClick={() => setI(Math.min(escenas.length - 1, i + 1))} disabled={ultima} aria-label="Escena siguiente">
            <Icono n="caret-right-bold" tam={13} />
          </button>
        </span>
        <div>
          <h1>¿Qué siente la escena {i + 1}?</h1>
          <p>La emoción cambia cómo suena la música y cómo se ve la imagen de esta escena.</p>
        </div>
      </div>
      <div className="nv-his-emo__cuerpo">
        <article className="nv-his-emo__escena">
          <span className="nv-his-emo__rotulo">ESCENA {i + 1}</span>
          <label className="nv-his-emo__nombre">
            <input value={escena.nombre} aria-label="Nombre de la escena" onChange={(ev) => cambiar((e) => (e.nombre = ev.target.value))} size={Math.max(6, escena.nombre.length)} />
            <Icono n="pencil-simple-fill" tam={13} />
          </label>
          <p>«{escena.texto}»</p>
          <span className="nv-his-emo__puntos">
            {escenas.map((x, k) => (
              <button
                key={x.id}
                type="button"
                aria-label={`Escena ${k + 1}`}
                onClick={() => setI(k)}
                style={{ background: k <= i ? EMOCIONES[x.emocion].color : undefined }}
                className={k === i ? 'nv-his-emo__punto--actual' : ''}
              />
            ))}
          </span>
        </article>
        <div className="nv-his-emo__der">
          <div className="nv-his-emo__rejilla">
            {ORDEN_EMOCIONES.map((e) => {
              const p = EMOCIONES[e];
              const on = escena.emocion === e;
              return (
                <button
                  key={e}
                  type="button"
                  className={`nv-his-emocion ${on ? 'nv-his-emocion--on' : ''}`}
                  style={{ ['--c' as string]: p.color, ['--f' as string]: FONDO[e] }}
                  onClick={() => cambiar((x) => (x.emocion = e))}
                  aria-pressed={on}
                >
                  <span className="nv-his-emocion__franja">{on && <Icono n="waveform-bold" tam={22} />}</span>
                  {on && (
                    <span className="nv-his-emocion__check">
                      <Icono n="check-bold" tam={11} />
                    </span>
                  )}
                  <strong>{p.etiqueta}</strong>
                  <span>{DESCRIPCION[e]}</span>
                </button>
              );
            })}
          </div>
          <div className="nv-his-emo__fuerza" role="group" aria-label="Qué tan fuerte">
            <span>¿Qué tan fuerte?</span>
            <span className="nv-his-emo__opciones">
              {([1, 2, 3] as Fuerza[]).map((f) => (
                <button key={f} type="button" className={escena.fuerza === f ? 'nv-his-emo__fuerza--on' : ''} onClick={() => cambiar((e) => (e.fuerza = f))}>
                  {escena.fuerza === f && <Icono n="chart-bar-fill" tam={13} />}
                  {NOMBRE_FUERZA[f]}
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>
      <Pie
        ok={false}
        color={perfil.color}
        antes={
          <span className="nv-his-emo__pastilla" style={{ ['--color' as string]: perfil.color }}>
            ● {perfil.etiqueta}
          </span>
        }
        mensaje={`${NOMBRE_FUERZA[escena.fuerza]}: ${EFECTO[escena.emocion]}.`}
        boton={ultima ? 'Listo · seguir a Voz' : 'Siguiente escena'}
        alTocar={() => (ultima ? alTerminar() : setI(i + 1))}
      />
    </div>
  );
}
