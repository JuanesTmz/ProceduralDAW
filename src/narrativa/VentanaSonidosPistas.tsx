/**
 * Sonidos: con qué suena cada pista, en un solo lugar.
 *
 * A la izquierda las pistas; a la derecha, todo lo que puede sonar en la
 * elegida: la batería, la Sonoteca y tus efectos. Tocar un sonido lo pone
 * en la pista y lo hace sonar. Si falta uno, se graba o se sube aquí
 * mismo, se recorta, y queda puesto en la pista.
 *
 * Aquí solo se graban efectos para samplear: la voz se graba en el paso Voz.
 */
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useVistaPrevia, vistaPrevia } from '../audio/vistaPrevia';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { NOMBRES_SONIDO, nuevoId } from '../estado/proyecto';
import { agregarPista, ponerSonido, quitarPista, valorSonido } from '../estado/musica';
import type { TipoSonido } from '../estado/tipos';
import { NOMBRE_GRUPO, SONOTECA } from '../audio/sonoteca';
import { useGrabadora } from '../hooks/useGrabadora';
import { Recortador } from '../componentes/Recortador';
import { Ventana } from '../componentes/Ventana';
import { SelectorInstrumento } from './SelectorInstrumento';

const KIT: TipoSonido[] = ['bombo', 'redoblante', 'hihat', 'palma', 'tom', 'aro'];
export const ID_MELODIA = 'melodia';
/** Abre la biblioteca lista para agregar una capa nueva. */
export const PISTA_NUEVA = '__nueva__';
const NUEVA = PISTA_NUEVA;

interface Props {
  /** La pista que llega elegida al abrir. */
  pista?: string;
  alCerrar: () => void;
}

export function VentanaSonidosPistas({ pista, alCerrar }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { filas, melodia } = proyecto.patron;
  const [elegida, setElegida] = useState(pista ?? filas[0]?.id ?? ID_MELODIA);
  const esMelodia = elegida === ID_MELODIA;
  const fila = filas.find((f) => f.id === elegida);
  const actual = fila ? valorSonido(proyecto, fila.tipo, fila.sampleUrl) : '';

  const elegir = (valor: string, url?: string) => {
    let id = elegida;
    if (elegida === NUEVA) {
      actualizar((p) => (id = agregarPista(p, valor)));
      window.setTimeout(() => setElegida(id), 0);
    } else {
      actualizar((p) => ponerSonido(p, elegida, valor));
    }
    // Suena al elegirlo. La batería la toca el motor cuando ya tiene el sonido nuevo.
    vistaPrevia.parar();
    if (url) oirUrl(url);
    else window.setTimeout(() => void motorAudio.escucharFila(id), 150);
  };

  return (
    <Ventana titulo="Sonidos" nota="Elige una pista y toca el sonido con que quieres que suene" ancha alta alCerrar={alCerrar} guia="ventana-sonidos">
      <div className="nv nv--incrustado nv-sonidos">
        <div className="nv-sonidos__pistas">
          <span className="nv-etiqueta nv-tenue">PISTAS</span>
          <div className={`nv-sonidos__pista ${esMelodia ? 'nv-sonidos__pista--activa' : ''}`}>
            <button type="button" onClick={() => setElegida(ID_MELODIA)}>
              <span className="nv-punto" style={{ background: '#5fd4ff' }} />
              <span className="nv-sonidos__nombre">
                Melodía
                <span className="nv-tenue nv-chico">
                  {melodia.instrumento === 'sample' ? melodia.nombreSample ?? 'tu sonido' : 'sintetizador'}
                </span>
              </span>
            </button>
          </div>
          {filas.map((f) => (
            <div key={f.id} className={`nv-sonidos__pista ${elegida === f.id ? 'nv-sonidos__pista--activa' : ''}`}>
              <button type="button" onClick={() => setElegida(f.id)} style={{ ['--color' as string]: f.color }}>
                <span className="nv-punto" style={{ background: f.color }} />
                <span className="nv-sonidos__nombre">{f.nombre}</span>
              </button>
              {filas.length > 1 && (
                <button
                  type="button"
                  className="nv-quitar"
                  aria-label={`Quitar la pista ${f.nombre}`}
                  title="Quitar esta pista"
                  onClick={() => {
                    actualizar((p) => quitarPista(p, f.id));
                    if (elegida === f.id) setElegida(filas.find((x) => x.id !== f.id)?.id ?? ID_MELODIA);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className={`nv-conectar ${elegida === NUEVA ? 'nv-conectar--activo' : ''}`}
            data-tour="nueva-pista"
            onClick={() => setElegida(NUEVA)}
          >
            +  Nueva pista
          </button>
        </div>

        <div className="nv-sonidos__catalogo">
          {elegida === NUEVA && (
            <p className="nv-sonidos__aviso">Toca el sonido con que va a sonar la pista nueva.</p>
          )}
          {esMelodia ? (
            <>
              <p className="nv-tenue nv-chico">
                La melodía afina el sonido en cada casilla de la matriz. Sirve cualquiera: uno de la app o un efecto tuyo.
              </p>
              <SelectorInstrumento />
            </>
          ) : (
            <>
              <Grupo titulo="Batería">
                {KIT.map((t) => (
                  <Ficha key={t} clave={`tipo:${t}`} activa={actual === t} onClick={() => elegir(t)} alOir={() => vistaPrevia.golpe(`tipo:${t}`, () => void motorAudio.probarTipo(t))}>
                    {NOMBRES_SONIDO[t]}
                  </Ficha>
                ))}
              </Grupo>
              {(['percusion', 'ciudad', 'melodico'] as const).map((g) => (
                <Grupo key={g} titulo={NOMBRE_GRUPO[g]}>
                  {SONOTECA.filter((x) => x.grupo === g).map((x) => (
                    <Ficha key={x.id} clave={`url:${x.url}`} activa={actual === `sonoteca:${x.id}`} onClick={() => elegir(`sonoteca:${x.id}`, x.url)} alOir={() => oirUrl(x.url)}>
                      {x.nombre}
                    </Ficha>
                  ))}
                </Grupo>
              ))}
            </>
          )}
          <EfectosPropios
            actual={actual}
            alUsar={esMelodia ? undefined : (id, url) => elegir(`propio:${id}`, url)}
          />
        </div>
      </div>
    </Ventana>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="nv-sonidos__grupo">
      <span className="nv-etiqueta nv-tenue">{titulo.toUpperCase()}</span>
      <div className="nv-sonidos__fichas">{children}</div>
    </div>
  );
}

/** Un sonido: ▶ lo hace sonar sin elegirlo; el nombre lo pone en la pista. */
function Ficha({
  activa,
  onClick,
  alOir,
  clave,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  alOir: () => void;
  /** Con qué nombre suena en el centro de escucha (para saber si es este el que suena). */
  clave: string;
  children: React.ReactNode;
}) {
  const { suena } = useVistaPrevia();
  const sonando = suena(clave);
  return (
    <span className={`nv-sonido ${activa ? 'nv-sonido--activo' : ''}`}>
      <button
        type="button"
        className="nv-sonido__oir"
        aria-label={sonando ? 'Pausar' : 'Escuchar'}
        title={sonando ? 'Pausar' : 'Escuchar sin elegir'}
        onClick={alOir}
      >
        {sonando ? '❚❚' : '▶'}
      </button>
      <button type="button" className="nv-sonido__elegir" onClick={onClick} title="Usar este sonido">
        {activa && '✓ '}
        {children}
      </button>
    </span>
  );
}

/** Oye un archivo de sonido sin elegirlo. Si ya sonaba otro, lo corta; otra vez lo pausa. */
function oirUrl(url: string) {
  vistaPrevia.oir(`url:${url}`, url);
}

/**
 * Tus efectos: los sonidos grabados o subidos. Se graban, se recortan y
 * quedan aquí; si hay una pista elegida, entran directo en ella.
 */
function EfectosPropios({ actual, alUsar }: { actual: string; alUsar?: (id: string, url: string) => void }) {
  const { proyecto, actualizar } = useProyecto();
  const [cruda, setCruda] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const entrada = useRef<HTMLInputElement>(null);
  const grabadora = useGrabadora((g) => setCruda(g.url));
  const grabando = grabadora.estado === 'grabando';

  const subir = (ev: ChangeEvent<HTMLInputElement>) => {
    const archivo = ev.target.files?.[0];
    if (!archivo) return;
    setNombre(archivo.name.replace(/\.[^.]+$/, '').slice(0, 18));
    setCruda(crearUrl(archivo));
    ev.target.value = '';
  };

  const guardar = (recorte: Blob, duracion: number) => {
    const url = crearUrl(recorte);
    const id = nuevoId('sonido');
    const comoSeLlama = nombre.trim().slice(0, 18) || `Efecto ${proyecto.sonidos.length + 1}`;
    actualizar((p) => p.sonidos.push({ id, nombre: comoSeLlama, url, duracion }));
    setCruda(null);
    setNombre('');
    // Espera a que exista en el proyecto para ponerlo en la pista.
    if (alUsar) window.setTimeout(() => alUsar(id, url), 0);
  };

  if (cruda) {
    return (
      <div className="nv-sonidos__grupo nv-sonidos__recorte">
        <span className="nv-etiqueta nv-tenue">RECORTA TU EFECTO · LO VERDE ES LO QUE QUEDA</span>
        <input
          className="nv-entrada"
          value={nombre}
          maxLength={18}
          placeholder="Cómo se llama: reja, olla, pito…"
          onChange={(ev) => setNombre(ev.target.value)}
        />
        <Recortador url={cruda} alGuardar={guardar} alDescartar={() => setCruda(null)} />
      </div>
    );
  }

  return (
    <div className="nv-sonidos__grupo nv-sonidos__propios">
      <span className="nv-etiqueta nv-tenue">TUS EFECTOS</span>
      <div className="nv-sonidos__fichas">
        {proyecto.sonidos.map((s) =>
          alUsar ? (
            <Ficha key={s.id} clave={`url:${s.url}`} activa={actual === `propio:${s.id}`} onClick={() => alUsar(s.id, s.url)} alOir={() => oirUrl(s.url)}>
              🎙 {s.nombre}
            </Ficha>
          ) : (
            <span key={s.id} className="nv-sonido nv-sonido--quieto">
              <BotonOir url={s.url} />
              <span className="nv-sonido__elegir">🎙 {s.nombre}</span>
            </span>
          ),
        )}
        {proyecto.sonidos.length === 0 && (
          <span className="nv-tenue nv-chico nv-italica">
            Graba algo de tu entorno —una reja, una olla, un pito— y vuélvelo sonido de una pista.
          </span>
        )}
      </div>
      <div className="nv-campo__fila">
        <button
          type="button"
          className={`nv-boton nv-boton--rojo ${grabando ? 'nv-latiendo' : ''}`}
          disabled={grabadora.estado === 'pidiendo'}
          onClick={() => (grabando ? grabadora.parar() : void grabadora.empezar())}
        >
          <span className="nv-punto nv-punto--blanco" />
          {grabando ? `Parar · ${grabadora.segundos.toFixed(1)} s` : 'Grabar un efecto'}
        </button>
        <button type="button" className="nv-boton" onClick={() => entrada.current?.click()}>
          ⬆  Subir un archivo
        </button>
        <input ref={entrada} type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a" hidden onChange={subir} />
        {grabadora.error && <span className="nv-rojo nv-chico">{grabadora.error}</span>}
      </div>
      {!alUsar && proyecto.sonidos.length > 0 && (
        <span className="nv-tenue nv-chico">Para la melodía, elige tu efecto arriba en «Tus grabaciones».</span>
      )}
    </div>
  );
}

/** ▶ de un efecto propio: cambia a ❚❚ mientras suena y lo pausa al tocarlo. */
function BotonOir({ url }: { url: string }) {
  const { suena } = useVistaPrevia();
  const sonando = suena(`url:${url}`);
  return (
    <button
      type="button"
      className="nv-sonido__oir"
      aria-label={sonando ? 'Pausar' : 'Escuchar'}
      onClick={() => oirUrl(url)}
    >
      {sonando ? '❚❚' : '▶'}
    </button>
  );
}
