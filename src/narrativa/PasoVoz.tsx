/**
 * Paso 2: la voz.
 *
 * Una escena a la vez, como un apuntador: el texto en grande para leerlo
 * y un solo botón grande para grabar. Arriba, las escenas como pasos con
 * su estado (grabada o no). Al terminar una, se sigue a la próxima.
 * Los respiros no aparecen: no tienen voz.
 */
import { BotonTutorial } from './BotonTutorial';
import { useEffect, useRef, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import { EMOCIONES } from '../estado/escenas';
import { useGrabadora } from '../hooks/useGrabadora';
import { Onda } from './VozEscena';
import { VozCorrida } from './VozCorrida';

export function PasoVoz({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { escenas } = proyecto;
  const [indice, setIndice] = useState(() => {
    const primera = escenas.findIndex((e) => !e.vozUrl);
    return primera < 0 ? 0 : primera;
  });
  const escena = escenas[Math.min(indice, escenas.length - 1)];
  const audio = useRef<HTMLAudioElement | null>(null);
  const [oyendo, setOyendo] = useState(false);

  const { estado, segundos, error, empezar, parar } = useGrabadora((g) => {
    const id = escena?.id;
    actualizar((p) => {
      const e = p.escenas.find((x) => x.id === id);
      if (!e) return;
      e.vozUrl = g.url;
      e.vozDuracion = g.duracion;
      e.vozDesde = undefined;
    });
  });

  // Al cambiar de escena se corta lo que estuviera sonando.
  useEffect(() => {
    audio.current?.pause();
    setOyendo(false);
  }, [indice]);

  if (!escena) {
    return (
      <div className="nv-pagina nv-vacio">
        <h1 className="nv-titulo">Graba tu voz</h1>
        <p className="nv-sub">Primero escribe tu monólogo y pártelo en escenas en el paso Historia.</p>
      </div>
    );
  }

  const color = EMOCIONES[escena.emocion].color;
  const grabando = estado === 'grabando';
  const grabadas = escenas.filter((e) => e.vozUrl).length;
  const esUltima = indice >= escenas.length - 1;

  const escuchar = () => {
    if (!escena.vozUrl) return;
    if (oyendo) {
      audio.current?.pause();
      setOyendo(false);
      return;
    }
    audio.current = new Audio(escena.vozUrl);
    audio.current.onended = () => setOyendo(false);
    void audio.current.play();
    setOyendo(true);
  };

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-cabeza">
        <div>
          <h1 className="nv-titulo">Graba tu voz</h1>
          <p className="nv-sub">
            {proyecto.modoVoz === 'corrido'
              ? 'Todo el monólogo de una vez; después marcas dónde cambia cada escena.'
              : 'Una escena a la vez. Léela despacio: se dice, no se canta.'}
          </p>
        </div>
        <span className="nv-espacio" />
        {proyecto.modoVoz === 'escena' && (
          <span className="nv-tenue">
            {grabadas} de {escenas.length} grabadas
          </span>
        )}
        <div className="nv-selector" data-tour="modo-voz">
          {(['escena', 'corrido'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={grabando}
              className={`nv-selector__op ${proyecto.modoVoz === m ? 'nv-selector__op--activa' : ''}`}
              onClick={() => actualizar((p) => (p.modoVoz = m))}
            >
              {m === 'escena' ? 'Por escena' : 'Todo de corrido'}
            </button>
          ))}
        </div>
        <BotonTutorial id="vozcorrida" texto="Grabar de corrido" chico />
      </div>

      {proyecto.modoVoz === 'corrido' ? (
        <VozCorrida alSeguir={alSeguir} />
      ) : (
      <>

      <nav className="nv-pasos-voz" aria-label="Escenas">
        {escenas.map((e, i) => {
          const c = EMOCIONES[e.emocion].color;
          return (
            <button
              key={e.id}
              type="button"
              disabled={grabando}
              className={`nv-paso-voz ${i === indice ? 'nv-paso-voz--activo' : ''}`}
              style={{ ['--color' as string]: c }}
              onClick={() => setIndice(i)}
            >
              <span className={`nv-paso-voz__marca ${e.vozUrl ? 'nv-paso-voz__marca--lista' : ''}`}>
                {e.vozUrl ? '✓' : i + 1}
              </span>
              <span className="nv-paso-voz__nombre">{e.nombre}</span>
            </button>
          );
        })}
      </nav>

      <section className="nv-apuntador" style={{ ['--color' as string]: color }}>
        <span className="nv-etiqueta nv-apuntador__etiqueta">
          ESCENA {indice + 1} DE {escenas.length} · {escena.nombre.toUpperCase()}
        </span>
        <p className={`nv-apuntador__texto ${grabando ? 'nv-apuntador__texto--vivo' : ''}`}>
          {escena.texto}
        </p>

        <div className="nv-apuntador__control">
          {grabando ? (
            <>
              <button type="button" className="nv-grabar nv-grabar--vivo" onClick={parar} aria-label="Parar">
                <span className="nv-grabar__cuadro" />
              </button>
              <span className="nv-mono nv-apuntador__tiempo">{formatearReloj(segundos)}</span>
              <span className="nv-tenue">Toca para parar</span>
            </>
          ) : escena.vozUrl ? (
            <>
              <button type="button" className="nv-redondo nv-redondo--grande" onClick={escuchar} aria-label="Escuchar">
                {oyendo ? '■' : '▶'}
              </button>
              <div className="nv-apuntador__onda">
                <Onda semilla={escena.vozUrl} color={color} barras={90} />
              </div>
              <span className="nv-mono">{formatearReloj(escena.vozDuracion)}</span>
              <button type="button" className="nv-boton" onClick={() => void empezar()}>
                Grabar de nuevo
              </button>
              <button
                type="button"
                className="nv-boton nv-boton--primario"
                onClick={() => (esUltima ? alSeguir() : setIndice(indice + 1))}
              >
                {esUltima ? 'Ir a Escenas  →' : 'Siguiente escena  →'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="nv-grabar"
                disabled={estado === 'pidiendo'}
                onClick={() => void empezar()}
                aria-label="Grabar"
              >
                <span className="nv-grabar__punto" />
              </button>
              <span className="nv-tenue">
                {estado === 'pidiendo' ? 'Pidiendo el micrófono…' : error ?? 'Toca para grabar esta escena'}
              </span>
            </>
          )}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
