/**
 * La ventana de Sonidos: la Librería y el Estudio, que eran dos mesas, en una.
 *
 * Estaban separadas por una razón que solo tenía sentido por dentro: una
 * guardaba y la otra grababa. Para el estudiante es un solo gesto —conseguir
 * un sonido para su pista—, así que es una sola ventana: a la izquierda lo que
 * hay, a la derecha de dónde sacar lo que falte.
 *
 * Un sonido entra de dos maneras, grabándolo o subiendo un archivo, y las dos
 * pasan por el recortador: ahí se le quita el silencio de los bordes y queda
 * solo el pedazo que sirve. Y se puede volver a recortar después, porque a la
 * primera casi nunca queda.
 *
 * El micrófono solo funciona si la página se abrió por HTTPS. Por eso la
 * prueba vive aquí mismo, a un toque: conviene descubrirlo semanas antes del
 * taller y no el día del evento.
 */
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { crearFila, NOMBRES_SONIDO, nuevoId } from '../estado/proyecto';
import { useGrabadora } from '../hooks/useGrabadora';
import { Recortador } from './Recortador';
import { Ventana } from './Ventana';
import type { TipoSonido } from '../estado/tipos';

const KIT: { tipo: TipoSonido; descripcion: string }[] = [
  { tipo: 'bombo', descripcion: 'El golpe grave que sostiene todo' },
  { tipo: 'redoblante', descripcion: 'El golpe seco del contratiempo' },
  { tipo: 'hihat', descripcion: 'El tic agudo que marca la velocidad' },
  { tipo: 'palma', descripcion: 'Palmas cortas, como de gente' },
  { tipo: 'tom', descripcion: 'Tambor afinado, bueno para remates' },
  { tipo: 'aro', descripcion: 'Metal corto y brillante' },
];

export function VentanaSonidos({ alCerrar }: { alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();

  /** El audio que está esperando que lo recorten. */
  const [cruda, setCruda] = useState<string | null>(null);
  /** Si se está recortando otra vez uno que ya estaba guardado, cuál. */
  const [rehaciendo, setRehaciendo] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [recienGuardado, setRecienGuardado] = useState<string | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const grabadora = useGrabadora((grabacion) => {
    setRehaciendo(null);
    setCruda(grabacion.url);
  });

  // --- el micrófono -------------------------------------------------------

  const [micro, setMicro] = useState<'sin-probar' | 'funciona' | 'falla'>('sin-probar');
  const [fallo, setFallo] = useState<string | null>(null);
  const barra = useRef<HTMLDivElement>(null);
  const soltarMicro = useRef<(() => void) | null>(null);

  // En equipos compartidos, un micrófono tomado por una pestaña es un problema.
  useEffect(() => () => soltarMicro.current?.(), []);

  const probarMicro = async () => {
    soltarMicro.current?.();
    setFallo(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicro('falla');
      setFallo(
        window.isSecureContext
          ? 'Este navegador no ofrece micrófono.'
          : 'La página no se abrió por HTTPS, y sin HTTPS el navegador no deja usar el micrófono.',
      );
      return;
    }

    try {
      const flujo = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const ctx = new AudioContext();
      const fuente = ctx.createMediaStreamSource(flujo);
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 1024;
      fuente.connect(analizador);

      const datos = new Uint8Array(analizador.frequencyBinCount);
      let vivo = true;
      const medir = () => {
        if (!vivo) return;
        analizador.getByteTimeDomainData(datos);
        let suma = 0;
        for (const v of datos) {
          const centrado = (v - 128) / 128;
          suma += centrado * centrado;
        }
        const nivel = Math.min(1, Math.sqrt(suma / datos.length) * 4);
        if (barra.current) barra.current.style.width = `${Math.round(nivel * 100)}%`;
        requestAnimationFrame(medir);
      };
      medir();

      soltarMicro.current = () => {
        vivo = false;
        flujo.getTracks().forEach((t) => t.stop());
        void ctx.close();
        if (barra.current) barra.current.style.width = '0%';
        soltarMicro.current = null;
      };
      setMicro('funciona');
    } catch {
      setMicro('falla');
      setFallo(
        window.isSecureContext
          ? 'No diste permiso, o el micrófono lo tiene otra aplicación.'
          : 'La página no se abrió por HTTPS. En las tablets hay que entrar por la dirección de internet, no por la IP del salón.',
      );
    }
  };

  // --- traer audio --------------------------------------------------------

  /** Un archivo del aparato entra igual que una grabación: por el recortador. */
  const subirArchivo = (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setRehaciendo(null);
    setNombre(archivo.name.replace(/\.[^.]+$/, '').slice(0, 18));
    setCruda(crearUrl(archivo));
    evento.target.value = '';
  };

  /** Volver a recortar uno que ya está guardado: a la primera casi nunca queda. */
  const recortarOtraVez = (id: string) => {
    const sonido = proyecto.sonidos.find((s) => s.id === id);
    if (!sonido) return;
    setRehaciendo(id);
    setNombre(sonido.nombre);
    setCruda(sonido.url);
  };

  const guardarRecorte = (recorte: Blob, duracion: number) => {
    const url = crearUrl(recorte);
    const comoSeLlama = nombre.trim().slice(0, 18) || `Sonido ${proyecto.sonidos.length + 1}`;

    actualizar((p) => {
      if (rehaciendo) {
        const sonido = p.sonidos.find((s) => s.id === rehaciendo);
        if (!sonido) return;
        const anterior = sonido.url;
        sonido.nombre = comoSeLlama;
        sonido.url = url;
        sonido.duracion = duracion;
        // Lo que ya usaba ese sonido pasa al recorte nuevo: si no, las pistas
        // seguirían sonando con la versión vieja y nadie entendería por qué.
        for (const fila of p.patron.filas) {
          if (fila.sampleUrl === anterior) {
            fila.sampleUrl = url;
            fila.nombre = comoSeLlama;
          }
        }
        if (p.patron.melodia.sampleUrl === anterior) {
          p.patron.melodia.sampleUrl = url;
          p.patron.melodia.nombreSample = comoSeLlama;
        }
        return;
      }
      p.sonidos.push({ id: nuevoId('sonido'), nombre: comoSeLlama, url, duracion });
    });

    setCruda(null);
    setRehaciendo(null);
    setNombre('');
    setRecienGuardado(comoSeLlama);
  };

  /** Lo lleva al patrón como una pista más, lista para repartirla en Golpes. */
  const usarComoPista = (idSonido: string) => {
    const sonido = proyecto.sonidos.find((s) => s.id === idSonido);
    if (!sonido) return;
    actualizar((p) => {
      const fila = crearFila('sample', p.patron.cantidadPasos, {
        nombre: sonido.nombre,
        sampleUrl: sonido.url,
      });
      p.patron.filas.push(fila);
      for (const seccion of p.secciones) seccion.capasActivas.push(fila.id);
    });
  };

  const cerrar = () => {
    soltarMicro.current?.();
    alCerrar();
  };

  const grabando = grabadora.estado === 'grabando';
  const enUso = (url: string) => proyecto.patron.filas.some((f) => f.sampleUrl === url);

  return (
    <Ventana
      titulo="Sonidos"
      nota={
        proyecto.sonidos.length > 0
          ? `${proyecto.sonidos.length} ${proyecto.sonidos.length === 1 ? 'sonido tuyo' : 'sonidos tuyos'} y el kit de la app`
          : 'Graba lo que te rodea y vuélvelo el golpe de tu beat'
      }
      ancha
      alCerrar={cerrar}
    >
      {/* Recortar ocupa toda la ventana: es un gesto que pide precisión. */}
      {cruda ? (
        <div className="recorte">
          <div className="recorte__cabecera">
            <h3 className="pistas__titulo">
              {rehaciendo ? 'Vuelve a recortarlo' : 'Recorta tu sonido'} · lo verde es lo que te
              quedas
            </h3>
            <label className="campo campo--horizontal">
              <span className="campo__etiqueta">Cómo se llama</span>
              <input
                type="text"
                value={nombre}
                placeholder="reja del metro, olla, palmas…"
                maxLength={18}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
          </div>
          <Recortador
            url={cruda}
            alGuardar={guardarRecorte}
            alDescartar={() => {
              setCruda(null);
              setRehaciendo(null);
              setRecienGuardado(null);
            }}
          />
        </div>
      ) : (
        <div className="sonidos">
          {/* ---------------- lo que hay ---------------- */}
          <div className="sonidos__estantes">
            <h3 className="pistas__titulo">Mis sonidos</h3>
            {proyecto.sonidos.length === 0 ? (
              <p className="pista__nota">
                Todavía ninguno. Grábalo o sube un archivo a la derecha, y aparecerá aquí.
              </p>
            ) : (
              <div className="fichas">
                {proyecto.sonidos.map((sonido) => (
                  <article key={sonido.id} className="ficha ficha--sonido">
                    <span className="ficha__nombre">{sonido.nombre}</span>
                    <span className="ficha__descripcion">
                      {sonido.duracion.toFixed(2)} s{enUso(sonido.url) ? ' · en una pista' : ''}
                    </span>
                    <div className="ficha__acciones">
                      <button
                        type="button"
                        className="boton boton--chico"
                        title={`Oír ${sonido.nombre}`}
                        onClick={() => void new Audio(sonido.url).play()}
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        className="boton boton--chico"
                        onClick={() => recortarOtraVez(sonido.id)}
                      >
                        ✂ Recortar
                      </button>
                      <button
                        type="button"
                        className="boton boton--chico boton--primario"
                        onClick={() => usarComoPista(sonido.id)}
                      >
                        + Usar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <h3 className="pistas__titulo">Kit de la app</h3>
            <div className="fichas">
              {KIT.map((sonido) => (
                <button
                  key={sonido.tipo}
                  type="button"
                  className="ficha"
                  onClick={() => void motorAudio.probarSonido()}
                >
                  <span className="ficha__nombre">{NOMBRES_SONIDO[sonido.tipo]}</span>
                  <span className="ficha__descripcion">{sonido.descripcion}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ---------------- traer uno nuevo ---------------- */}
          <aside className="pistas sonidos__grabar">
            <h3 className="pistas__titulo">Traer un sonido</h3>

            <button
              type="button"
              className={`grabar__boton ${grabando ? 'grabar__boton--grabando' : ''}`}
              onClick={() => (grabando ? grabadora.parar() : void grabadora.empezar())}
              disabled={grabadora.estado === 'pidiendo'}
            >
              <span className="grabar__punto" aria-hidden="true" />
              {grabando ? `Parar · ${grabadora.segundos.toFixed(1)} s` : 'Grabar'}
            </button>

            <button type="button" className="boton" onClick={() => entradaArchivo.current?.click()}>
              ⬆ Subir un archivo
            </button>
            <input
              ref={entradaArchivo}
              type="file"
              accept="audio/*,.wav,.mp3,.ogg,.m4a"
              onChange={subirArchivo}
              hidden
            />

            {grabadora.error && <p className="aviso aviso--malo">{grabadora.error}</p>}
            {recienGuardado && <p className="aviso aviso--bueno">Guardado «{recienGuardado}».</p>}

            <div className="medidor" aria-hidden="true">
              <div ref={barra} className="medidor__nivel" style={{ width: '0%' }} />
            </div>

            <button
              type="button"
              className="boton boton--chico"
              onClick={() => (micro === 'funciona' ? soltarMicro.current?.() : void probarMicro())}
            >
              🎙 {micro === 'funciona' ? 'Soltar el micrófono' : 'Probar el micrófono'}
            </button>

            {fallo && <p className="aviso aviso--malo">{fallo}</p>}
          </aside>
        </div>
      )}
    </Ventana>
  );
}
