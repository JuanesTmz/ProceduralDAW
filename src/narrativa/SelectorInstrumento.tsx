/**
 * Con qué suena la melodía: el sintetizador, un sonido melódico de la
 * Sonoteca o una grabación propia. Cualquier sonido se afina solo en cada
 * casilla de la matriz; para las grabaciones propias, la app escucha en qué
 * nota están (y se puede corregir a mano).
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { SONOTECA } from '../audio/sonoteca';
import { detectarNota, nombreNota, NOTAS_ELEGIBLES } from '../audio/afinador';

/** Oye un sonido sin elegirlo. Si ya sonaba otro, lo corta. */
let muestra: HTMLAudioElement | null = null;
function oir(url: string) {
  muestra?.pause();
  muestra = new Audio(url);
  void muestra.play();
}

function Oir({ url }: { url: string }) {
  return (
    <button type="button" className="nv-instrumento__oir" aria-label="Escuchar" title="Escuchar sin elegir" onClick={() => oir(url)}>
      ▶
    </button>
  );
}

export function SelectorInstrumento() {
  const { proyecto, actualizar } = useProyecto();
  const { melodia } = proyecto.patron;
  const [escuchando, setEscuchando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const melodicos = SONOTECA.filter((x) => x.grupo === 'melodico');

  const usar = (url: string, nombre: string, nota: string) =>
    actualizar((p) => {
      const m = p.patron.melodia;
      m.instrumento = 'sample';
      m.sampleUrl = url;
      m.nombreSample = nombre;
      m.notaSample = nota;
    });

  const usarPropio = async (url: string, nombre: string) => {
    usar(url, nombre, melodia.notaSample || 'C3');
    setEscuchando(true);
    setAviso(null);
    try {
      const nota = await detectarNota(url);
      if (nota) {
        actualizar((p) => {
          if (p.patron.melodia.sampleUrl === url) p.patron.melodia.notaSample = nota;
        });
        setAviso(`Tu sonido suena en ${nombreNota(nota)}: la matriz lo afina desde ahí.`);
      } else {
        setAviso('No encontré un tono claro: elige a mano en qué nota está.');
      }
    } catch {
      setAviso('No pude escuchar el sonido. Elige la nota a mano.');
    } finally {
      setEscuchando(false);
    }
  };

  const actual = (url?: string) => melodia.instrumento === 'sample' && melodia.sampleUrl === url;

  return (
    <div className="nv-instrumento">
      <div className="nv-instrumento__grupo">
        <span className="nv-instrumento__titulo">De la app</span>
        <div className="nv-instrumento__fichas">
          <button
            type="button"
            className={melodia.instrumento === 'sintetizador' ? 'nv-instrumento__activo' : ''}
            onClick={() => actualizar((p) => (p.patron.melodia.instrumento = 'sintetizador'))}
          >
            Sintetizador
          </button>
          {melodicos.map((x) => (
            <span key={x.id} className="nv-instrumento__par">
              <Oir url={x.url} />
              <button
                type="button"
                className={actual(x.url) ? 'nv-instrumento__activo' : ''}
                onClick={() => {
                  usar(x.url, x.nombre, x.nota ?? 'C4');
                  setAviso(null);
                }}
              >
                {x.nombre}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="nv-instrumento__grupo">
        <span className="nv-instrumento__titulo">Tus grabaciones</span>
        <div className="nv-instrumento__fichas">
          {proyecto.sonidos.length === 0 && (
            <span className="nv-instrumento__nota">Graba un sonido (tu voz, un silbido, un objeto) y aquí se vuelve instrumento.</span>
          )}
          {proyecto.sonidos.map((x) => (
            <span key={x.id} className="nv-instrumento__par">
              <Oir url={x.url} />
              <button
                type="button"
                className={`nv-instrumento__propio ${actual(x.url) ? 'nv-instrumento__activo' : ''}`}
                onClick={() => void usarPropio(x.url, x.nombre)}
              >
                🎙 {x.nombre}
              </button>
            </span>
          ))}
        </div>
      </div>
      {melodia.instrumento === 'sample' && melodia.sampleUrl && (
        <div className="nv-instrumento__afinar">
          <span>{escuchando ? 'Escuchando tu sonido…' : 'Tu sonido está en'}</span>
          <select
            value={melodia.notaSample}
            onChange={(e) => actualizar((p) => (p.patron.melodia.notaSample = e.target.value))}
          >
            {NOTAS_ELEGIBLES.map((n) => (
              <option key={n.nota} value={n.nota}>
                {n.etiqueta}
              </option>
            ))}
          </select>
          {aviso && <span className="nv-instrumento__nota">{aviso}</span>}
        </div>
      )}
    </div>
  );
}
