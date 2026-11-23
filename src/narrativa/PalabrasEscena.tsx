// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Las palabras de la escena, encima de los golpes de la Música.
 *
 * Cada palabra puede llevar un sonido (suena una vez, justo cuando la voz
 * la dice) o un silencio (la música se calla en ese instante). Tocar una
 * palabra abre una ventanita pegada a ella para elegir. Mientras suena la
 * escena, la palabra que se está diciendo se enciende.
 *
 * Las cajitas de imagen (golpes de imagen en una palabra) se ponen en
 * Visuales: aquí no se ven ni se tocan.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { vistaPrevia } from '../audio/vistaPrevia';
import { SONOTECA } from '../audio/sonoteca';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion, nuevoId, palabrasDe } from '../estado/proyecto';
import { buscarEscena } from '../estado/escenas';
import { inicioPalabra, palabrasDichas } from '../estado/ritmoVoz';
import type { Cajita, Escena } from '../estado/tipos';
import { Icono } from './Icono';
import { MenuFlotante } from './MenuFlotante';
import { BotonPista, PistaMano, usePista } from './PistaMano';
import { useCuadro } from './useCuadro';

const TIPOS: Cajita['tipo'][] = ['sonido', 'silencio'];

interface Props {
  escena: Escena;
  indice: number;
  /** «Graba uno»: abre la grabadora para esta palabra. */
  alGrabar: (palabra: number) => void;
}

export function PalabrasEscena({ escena, indice, alGrabar }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [abierta, setAbierta] = useState<{ i: number; ancla: HTMLElement } | null>(null);
  const [dichas, setDichas] = useState(-1);
  const caja = useRef<HTMLParagraphElement>(null);
  const palabras = palabrasDe(escena.texto);
  const cajitas = (escena.cajitas ?? []).filter((c) => TIPOS.includes(c.tipo));
  const deLaPalabra = (i: number) => cajitas.find((c) => c.palabra === i);
  const seccion = proyecto.secciones[indice];
  const total = seccion ? duracionSeccion(proyecto, seccion) : 1;
  // La mano señala una palabra; se va cuando le ponen algo (o tocan una palabra).
  const pista = usePista('palabras', cajitas.length > 0, 4, '.nv-palabra', palabras.length > 0);

  // La palabra que se está diciendo, mientras suena esta escena (sola o dentro de la obra).
  useCuadro(() => {
    const pos = motorAudio.estaSonando ? motorAudio.posicionOida : null;
    const n = pos && pos.indice === indice ? palabrasDichas(escena, pos.segundos) : -1;
    setDichas(n);
  });

  // La palabra que se dice, siempre a la vista dentro de su caja (en el celular
  // las palabras van en una franja que se desliza de lado). Solo mueve la caja, no la página.
  useEffect(() => {
    const c = caja.current;
    const p = dichas > 0 ? (c?.children[dichas - 1] as HTMLElement | undefined) : undefined;
    if (!c || !p) return;
    const dx = p.offsetLeft; // la caja es su offsetParent (position: relative)
    const dy = p.offsetTop;
    if (dx < c.scrollLeft || dx + p.offsetWidth > c.scrollLeft + c.clientWidth - 28) c.scrollLeft = dx - c.clientWidth / 3;
    if (dy < c.scrollTop || dy + p.offsetHeight > c.scrollTop + c.clientHeight) c.scrollTop = dy - 4;
  }, [dichas]);

  const poner = (palabra: number, datos: Omit<Cajita, 'id' | 'palabra'> | null) =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (!e) return;
      // Solo se reemplaza el sonido o silencio: la misma palabra puede tener un golpe de imagen.
      const resto = (e.cajitas ?? []).filter((c) => c.palabra !== palabra || !TIPOS.includes(c.tipo));
      e.cajitas = datos ? [...resto, { id: nuevoId('cajita'), palabra, ...datos }] : resto;
    });

  /** Oír la escena desde un poco antes de la palabra, con la voz. */
  const probar = (palabra: number) => {
    const t = inicioPalabra(escena, palabra);
    void motorAudio.reproducirEscena(indice, Math.max(0, Math.min(total - 0.5, t - 1.2)));
  };

  if (palabras.length === 0) return null;

  return (
    <div className="nv-palabras">
      <div className="nv-palabras__cabeza">
        <strong className="nv-mesa__rotulo">Palabras</strong>
        <span className="nv-mesa__pista">Toca una palabra para darle un sonido, o para que la música se calle justo cuando se dice</span>
        <span className="nv-espacio" />
        <span className="nv-palabras__leyenda nv-palabras__leyenda--sonido">
          <Icono n="speaker-high-fill" tam={12} /> Sonido
        </span>
        <span className="nv-palabras__leyenda nv-palabras__leyenda--silencio">
          <Icono n="speaker-slash-fill" tam={12} /> Silencio
        </span>
        <BotonPista clave="palabras" corto />
      </div>
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca una palabra: ponle un sonido que suene justo cuando la dicen, o un silencio para que la música se calle ahí."
          origen={() => null}
          destinos={() => {
            // Una palabra con cuerpo (no «y», «el»…), de las primeras.
            const todas = [...document.querySelectorAll('.nv-palabras .nv-palabra')];
            const larga = todas.find((p, i) => i >= 2 && (p.textContent ?? '').length >= 6) ?? todas[0];
            return larga ? [larga] : [];
          }}
          alCerrar={pista.cerrar}
        />
      )}
      <p className="nv-palabras__texto" ref={caja}>
        {palabras.map((palabra, i) => {
          const c = deLaPalabra(i);
          const dicha = dichas >= 0 && i === dichas - 1;
          return (
            <button
              key={i}
              type="button"
              className={`nv-palabra ${c ? `nv-palabra--${c.tipo}` : ''} ${dicha ? 'nv-palabra--dicha' : ''} ${abierta?.i === i ? 'nv-palabra--abierta' : ''}`}
              onClick={(ev) => setAbierta(abierta?.i === i ? null : { i, ancla: ev.currentTarget })}
              title={c ? (c.tipo === 'sonido' ? `Suena: ${c.nombre ?? ''}` : 'La música se calla') : undefined}
            >
              {c && <Icono n={c.tipo === 'sonido' ? 'speaker-high-fill' : 'speaker-slash-fill'} tam={12} />}
              {palabra}
            </button>
          );
        })}
      </p>
      {abierta && (
        <MenuFlotante ancla={abierta.ancla} className="nv-ventanita" alLado alCerrar={() => setAbierta(null)}>
          <Ventanita
            palabra={palabras[abierta.i]}
            cajita={deLaPalabra(abierta.i)}
            alPoner={(datos) => poner(abierta.i, datos)}
            alProbar={() => probar(abierta.i)}
            alGrabar={() => {
              alGrabar(abierta.i);
              setAbierta(null);
            }}
            alCerrar={() => setAbierta(null)}
          />
        </MenuFlotante>
      )}
    </div>
  );
}

/** Lo que se puede poner en una palabra: un sonido de la lista, uno grabado o un silencio. */
function Ventanita({
  palabra,
  cajita,
  alPoner,
  alProbar,
  alGrabar,
  alCerrar,
}: {
  palabra: string;
  cajita?: Cajita;
  alPoner: (datos: Omit<Cajita, 'id' | 'palabra'> | null) => void;
  alProbar: () => void;
  alGrabar: () => void;
  alCerrar: () => void;
}) {
  const { proyecto } = useProyecto();
  const [modo, setModo] = useState<'sonido' | 'silencio'>(cajita?.tipo === 'silencio' ? 'silencio' : 'sonido');
  const grupos = [
    { titulo: 'Tuyos', sonidos: proyecto.sonidos.map((s) => ({ url: s.url, nombre: s.nombre })) },
    { titulo: 'Ciudad', sonidos: SONOTECA.filter((s) => s.grupo === 'ciudad') },
    { titulo: 'Hechos en SONORA', sonidos: SONOTECA.filter((s) => s.grupo === 'biblioteca') },
    { titulo: 'Percusión', sonidos: SONOTECA.filter((s) => s.grupo === 'percusion') },
  ].filter((g) => g.sonidos.length > 0);

  const elegir = (url: string, nombre: string) => {
    vistaPrevia.oir(`url:${url}`, url);
    alPoner({ tipo: 'sonido', url, nombre });
  };

  return (
    <div className="nv-ventanita__caja">
      <div className="nv-ventanita__cabeza">
        <span className="nv-tenue">En la palabra</span>
        <strong className="nv-ventanita__palabra">{palabra}</strong>
        <span className="nv-espacio" />
        <button type="button" className="nv-cierre" onClick={alCerrar} aria-label="Cerrar">
          <Icono n="x-bold" tam={13} />
        </button>
      </div>
      <div className="nv-ventanita__modos" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'sonido'}
          className={`nv-ventanita__modo ${modo === 'sonido' ? 'nv-ventanita__modo--activo' : ''}`}
          onClick={() => setModo('sonido')}
        >
          <Icono n="speaker-high-fill" tam={15} /> Poner un sonido
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === 'silencio'}
          className={`nv-ventanita__modo nv-ventanita__modo--silencio ${modo === 'silencio' ? 'nv-ventanita__modo--activo' : ''}`}
          onClick={() => {
            setModo('silencio');
            alPoner({ tipo: 'silencio' });
          }}
        >
          <Icono n="speaker-slash-fill" tam={15} /> Silenciar la música
        </button>
      </div>
      {modo === 'sonido' ? (
        <>
          <span className="nv-ventanita__nota">Suena una vez, justo cuando la voz dice «{palabra}».</span>
          <div className="nv-ventanita__sonidos">
            {grupos.map((g) => (
              <div key={g.titulo} className="nv-ventanita__grupo">
                <span className="nv-ventanita__grupo-titulo">{g.titulo}</span>
                <div className="nv-ventanita__rejilla">
                  {g.sonidos.map((s) => {
                    const puesto = cajita?.tipo === 'sonido' && cajita.url === s.url;
                    return (
                      <button
                        key={s.url}
                        type="button"
                        className={`nv-ventanita__sonido ${puesto ? 'nv-ventanita__sonido--puesto' : ''}`}
                        onClick={() => elegir(s.url, s.nombre)}
                      >
                        <Icono n="waveform-bold" tam={18} />
                        <span>{s.nombre}</span>
                      </button>
                    );
                  })}
                  {g.titulo === grupos[0].titulo && (
                    <button type="button" className="nv-ventanita__sonido nv-ventanita__sonido--grabar" onClick={alGrabar}>
                      <Icono n="microphone-fill" tam={18} />
                      <span>Graba uno</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <span className="nv-ventanita__nota">La música se calla justo cuando la voz dice «{palabra}», y vuelve enseguida.</span>
      )}
      <div className="nv-ventanita__pie">
        <button type="button" className="nv-boton" onClick={alProbar}>
          <Icono n="play-fill" tam={13} /> Probar con la voz
        </button>
        {cajita && (
          <button type="button" className="nv-enlace nv-chico" onClick={() => alPoner(null)}>
            Quitar
          </button>
        )}
        <span className="nv-espacio" />
        <button type="button" className="nv-boton nv-boton--primario" onClick={alCerrar}>
          <Icono n="check-bold" tam={13} /> Listo
        </button>
      </div>
    </div>
  );
}
