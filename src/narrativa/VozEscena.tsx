/**
 * La voz de una escena: grabar, escuchar y repetir.
 * Se usa en el paso Voz y dentro de cada escena.
 */
import { useEffect } from 'react';
import { useVistaPrevia, vistaPrevia } from '../audio/vistaPrevia';
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import { EMOCIONES } from '../estado/escenas';
import type { Escena } from '../estado/tipos';
import { useGrabadora } from '../hooks/useGrabadora';

/** Barras de onda falsas pero estables: salen del id, no del azar. */
export function Onda({ semilla, color, barras = 70 }: { semilla: string; color: string; barras?: number }) {
  let h = 0;
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const alturas = Array.from({ length: barras }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const pausa = i % 23 > 19;
    return pausa ? 6 : 20 + ((h >>> 8) % 80) * (0.6 + 0.4 * Math.abs(Math.sin(i * 0.3)));
  });
  return (
    <span className="nv-onda" aria-hidden="true">
      {alturas.map((a, i) => (
        <span key={i} style={{ height: `${Math.min(100, a)}%`, background: color }} />
      ))}
    </span>
  );
}

export function VozEscena({ escena, grande = false }: { escena: Escena; grande?: boolean }) {
  const { actualizar } = useProyecto();
  const { suena, oir } = useVistaPrevia();
  const claveVoz = `voz:${escena.id}`;
  const oyendo = suena(claveVoz);
  const color = EMOCIONES[escena.emocion].color;

  // Al salir (o cambiar de escena) se corta su voz, y solo la suya.
  useEffect(
    () => () => {
      if (vistaPrevia.activa === claveVoz) vistaPrevia.parar();
    },
    [claveVoz],
  );

  const { estado, segundos, error, empezar, parar } = useGrabadora((g) => {
    actualizar((p) => {
      const e = p.escenas.find((x) => x.id === escena.id);
      if (!e) return;
      e.vozUrl = g.url;
      e.vozDuracion = g.duracion;
      e.vozDesde = undefined;
    });
  });
  const grabando = estado === 'grabando';

  const escuchar = () => {
    if (!escena.vozUrl) return;
    // Un tramo de la grabación de corrido suena solo su parte.
    oir(claveVoz, escena.vozUrl, escena.vozDesde !== undefined ? { desde: escena.vozDesde, duracion: escena.vozDuracion } : {});
  };

  if (grabando) {
    return (
      <div className={`nv-voz ${grande ? 'nv-voz--grande' : ''}`}>
        <span className="nv-voz__vivo">
          <span className="nv-punto nv-punto--rojo" /> Grabando · {formatearReloj(segundos)}
        </span>
        <span className="nv-espacio" />
        <button type="button" className="nv-boton nv-boton--rojo" onClick={parar}>
          ■  Parar
        </button>
      </div>
    );
  }

  if (!escena.vozUrl) {
    return (
      <div className={`nv-voz ${grande ? 'nv-voz--grande' : ''}`}>
        <span className="nv-voz__vacia">{error ?? 'Todavía no está grabada'}</span>
        <button
          type="button"
          className="nv-boton nv-boton--rojo"
          disabled={estado === 'pidiendo'}
          onClick={() => void empezar()}
        >
          <span className="nv-punto nv-punto--blanco" />
          {estado === 'pidiendo' ? 'Pidiendo micrófono…' : 'Grabar'}
        </button>
      </div>
    );
  }

  return (
    <div className={`nv-voz ${grande ? 'nv-voz--grande' : ''}`}>
      <button type="button" className="nv-redondo" onClick={escuchar} aria-label={oyendo ? 'Pausar' : 'Escuchar'}>
        {oyendo ? '❚❚' : '▶'}
      </button>
      <Onda semilla={escena.vozUrl} color={color} />
      <span className="nv-mono">{formatearReloj(escena.vozDuracion)}</span>
      <button type="button" className="nv-boton nv-boton--chico" onClick={() => void empezar()}>
        Repetir
      </button>
    </div>
  );
}
