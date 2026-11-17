// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Sonidos: con qué suena cada pista, en un solo lugar.
 *
 * A la izquierda las capas; a la derecha, todo lo que puede sonar en la
 * elegida: la batería, la Sonoteca y tus efectos. Tocar un sonido lo elige
 * y lo hace sonar; «Guardar sonido» lo pone en la capa (así lo pidieron
 * en la prueba: elegir y guardar, como un paso claro). Si falta uno, se
 * graba o se sube aquí mismo, se recorta, y queda puesto en la capa.
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

import { useEnVentana } from '../nube/Caras';
import { useEnDemo } from '../componentes/demo';

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
  useEnVentana(`sonidos:${elegida}`);
  const actual = fila ? valorSonido(proyecto, fila.tipo, fila.sampleUrl) : '';
  /** El sonido tocado, que todavía no se guarda en la capa. */
  const [candidato, setCandidato] = useState<{ valor: string; nombre: string; url?: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cambiarCapa = (id: string) => {
    setElegida(id);
    setCandidato(null);
    setAviso(null);
  };

  // Dentro de un tutorial no suena nada: el video tiene su propio sonido.
  const demo = useEnDemo();

  /** Tocar un sonido: se oye y queda escogido, sin cambiar la capa todavía. */
  const probar = (valor: string, nombre: string, url?: string) => {
    setCandidato({ valor, nombre, url });
    setAviso(null);
    if (demo) return;
    vistaPrevia.parar();
    if (url) oirUrl(url);
    else vistaPrevia.golpe(`tipo:${valor}`, () => void motorAudio.probarTipo(valor as TipoSonido));
  };

  /** Pone un sonido en la capa (o crea la capa nueva con él). */
  const guardar = (valor: string, nombre: string) => {
    let id = elegida;
    const nueva = elegida === NUEVA;
    if (nueva) {
      actualizar((p) => (id = agregarPista(p, valor)));
      window.setTimeout(() => setElegida(id), 0);
    } else {
      actualizar((p) => ponerSonido(p, elegida, valor));
    }
    setCandidato(null);
    setAviso(
      nueva
        ? `✓ Guardado: nueva capa con ${nombre}. Cierra esta ventana y toca sus casillas para que suene.`
        : `✓ Guardado: esta capa ahora suena con ${nombre}.`,
    );
  };

  return (
    <Ventana titulo="Sonidos" nota="Toca un sonido para oírlo y luego «Guardar sonido»" ancha alta alCerrar={alCerrar} guia="ventana-sonidos">
      <div className="nv nv--incrustado nv-sonidos">
        <div className="nv-sonidos__pistas">
          <span className="nv-etiqueta nv-tenue">CAPAS</span>
          <div className={`nv-sonidos__pista ${esMelodia ? 'nv-sonidos__pista--activa' : ''}`}>
            <button type="button" onClick={() => cambiarCapa(ID_MELODIA)}>
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
              <button type="button" onClick={() => cambiarCapa(f.id)} style={{ ['--color' as string]: f.color }}>
                <span className="nv-punto" style={{ background: f.color }} />
                <span className="nv-sonidos__nombre">{f.nombre}</span>
              </button>
              {filas.length > 1 && (
                <button
                  type="button"
                  className="nv-quitar"
                  aria-label={`Quitar la capa ${f.nombre}`}
                  title="Quitar esta capa"
                  onClick={() => {
                    actualizar((p) => quitarPista(p, f.id));
                    if (elegida === f.id) cambiarCapa(filas.find((x) => x.id !== f.id)?.id ?? ID_MELODIA);
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
            onClick={() => cambiarCapa(NUEVA)}
          >
            +  Nueva capa
          </button>
        </div>

        {/* Elegir el sonido de una pista es de una persona a la vez. */}
        <div className="nv-sonidos__catalogo" data-bloqueo={`sonido:${elegida}`}>
          {elegida === NUEVA && (
            <p className="nv-sonidos__aviso">Toca el sonido para la capa nueva y luego «Guardar sonido».</p>
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
                  <Ficha key={t} clave={`tipo:${t}`} activa={actual === t} elegida={candidato?.valor === t} onClick={() => probar(t, NOMBRES_SONIDO[t])}>
                    {NOMBRES_SONIDO[t]}
                  </Ficha>
                ))}
              </Grupo>
              {(['biblioteca', 'percusion', 'ciudad', 'melodico'] as const).map((g) => (
                <Grupo key={g} titulo={NOMBRE_GRUPO[g]}>
                  {SONOTECA.filter((x) => x.grupo === g).map((x) => (
                    <Ficha key={x.id} clave={`url:${x.url}`} activa={actual === `sonoteca:${x.id}`} elegida={candidato?.valor === `sonoteca:${x.id}`} onClick={() => probar(`sonoteca:${x.id}`, x.nombre, x.url)}>
                      {x.nombre}
                    </Ficha>
                  ))}
                </Grupo>
              ))}
            </>
          )}
          <EfectosPropios
            actual={actual}
            candidato={candidato?.valor}
            alProbar={esMelodia ? undefined : (id, nombre, url) => probar(`propio:${id}`, nombre, url)}
            alGrabado={esMelodia ? undefined : (id, nombre) => guardar(`propio:${id}`, nombre)}
          />
        </div>
        {!esMelodia && (candidato || aviso) && (
          <div className={`nv-guardar-sonido ${candidato ? '' : 'nv-guardar-sonido--hecho'}`}>
            {candidato ? (
              <>
                <span className="nv-guardar-sonido__texto">
                  Escogiste <strong>{candidato.nombre}</strong>
                  {elegida === NUEVA ? ' para la capa nueva' : fila ? ` para «${fila.nombre}»` : ''}
                </span>
                <button type="button" className="nv-boton" onClick={() => setCandidato(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="nv-boton nv-boton--primario nv-guardar-sonido__boton"
                  onClick={() => guardar(candidato.valor, candidato.nombre)}
                >
                  ✓ Guardar sonido
                </button>
              </>
            ) : (
              <span className="nv-guardar-sonido__texto">{aviso}</span>
            )}
          </div>
        )}
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

/**
 * Un sonido. Tocarlo lo hace sonar y lo deja escogido (resaltado); el que
 * ya tiene la capa lleva ✓. Se guarda con el botón de abajo.
 */
function Ficha({
  activa,
  elegida,
  onClick,
  clave,
  children,
}: {
  activa: boolean;
  elegida: boolean;
  onClick: () => void;
  /** Con qué nombre suena en el centro de escucha (para saber si es este el que suena). */
  clave: string;
  children: React.ReactNode;
}) {
  const { suena } = useVistaPrevia();
  const sonando = suena(clave);
  return (
    <span className={`nv-sonido ${activa ? 'nv-sonido--activo' : ''} ${elegida ? 'nv-sonido--elegida' : ''}`}>
      <button type="button" className="nv-sonido__elegir" onClick={onClick} title="Escuchar y escoger">
        <span className="nv-sonido__icono" aria-hidden="true">
          {sonando ? '♪' : activa ? '✓' : '▶'}
        </span>
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
 * quedan aquí; al guardar el recorte entran directo en la capa elegida.
 * Grabar va en su propio recuadro, para que no se confunda con elegir.
 */
function EfectosPropios({
  actual,
  candidato,
  alProbar,
  alGrabado,
}: {
  actual: string;
  candidato?: string;
  alProbar?: (id: string, nombre: string, url: string) => void;
  alGrabado?: (id: string, nombre: string) => void;
}) {
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
    // Espera a que exista en el proyecto para ponerlo en la capa.
    if (alGrabado) window.setTimeout(() => alGrabado(id, comoSeLlama), 0);
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
    <>
      {proyecto.sonidos.length > 0 && (
        <div className="nv-sonidos__grupo">
          <span className="nv-etiqueta nv-tenue">TUS EFECTOS</span>
          <div className="nv-sonidos__fichas">
        {proyecto.sonidos.map((s) =>
          alProbar ? (
            <Ficha key={s.id} clave={`url:${s.url}`} activa={actual === `propio:${s.id}`} elegida={candidato === `propio:${s.id}`} onClick={() => alProbar(s.id, s.nombre, s.url)}>
              🎙 {s.nombre}
            </Ficha>
          ) : (
            <span key={s.id} className="nv-sonido nv-sonido--quieto">
              <BotonOir url={s.url} />
              <span className="nv-sonido__elegir">🎙 {s.nombre}</span>
            </span>
          ),
        )}
          </div>
        </div>
      )}
      <div className="nv-sonidos__grupo nv-sonidos__propios">
      <span className="nv-etiqueta nv-acento">¿NO ESTÁ EL SONIDO QUE BUSCAS? GRÁBALO</span>
      <span className="nv-tenue nv-chico">Una reja, una olla, un pito… Grabas, recortas y queda guardado en esta capa.</span>
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
      {!alProbar && proyecto.sonidos.length > 0 && (
        <span className="nv-tenue nv-chico">Para la melodía, elige tu efecto arriba en «Tus grabaciones».</span>
      )}
      </div>
    </>
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
