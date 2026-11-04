// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * En la barra de arriba: quiénes del equipo están conectados ahora, si esta
 * tablet está en vivo con ellos, y el menú de la persona.
 */
import { useRef, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import type { Proyecto } from '../estado/tipos';
import { descargarCopia, leerCopia } from './copias';
import { useNube } from './contexto';
import { useConexion, useEstadoSala, usePresentes, type EstadoConexion, type Sala } from './sala';

const TEXTO: Record<EstadoConexion, string> = {
  conectando: 'Conectando…',
  'en-vivo': 'En vivo',
  'sin-conexion': 'Sin conexión · se guarda aquí',
};

const AYUDA: Record<EstadoConexion, string> = {
  conectando: 'Entrando a la sala del equipo',
  'en-vivo': 'Lo que cambias se ve al instante en las tablets de tu equipo',
  'sin-conexion': 'Tus cambios se guardan aquí y se juntan con los demás al volver la conexión',
};

/** Cuántas caras se muestran antes del «+N». */
const MAXIMO_CARAS = 5;

export function EstadoNube() {
  const nube = useNube();
  if (!nube) return null;
  return <Estado sala={nube.sala} />;
}

function Estado({ sala }: { sala: Sala }) {
  const nube = useNube()!;
  const conexion = useConexion(sala);
  const presentes = usePresentes(sala);
  const [abierto, setAbierto] = useState(false);
  const { proyecto, reemplazar } = useProyecto();
  const [aviso, setAviso] = useState<string | null>(null);
  const [porCargar, setPorCargar] = useState<Proyecto | null>(null);
  const elegirCopia = useRef<HTMLInputElement>(null);
  const { congelado, soloLectura } = useEstadoSala(sala);
  const otros = presentes.filter((p) => !p.yo);
  const visibles = otros.slice(0, MAXIMO_CARAS);

  return (
    <div className="nu-estado">
      {congelado && !soloLectura && (
        <span className="nu-cerrado" title="El panel cerró la edición: el proyecto se puede mirar y escuchar, no cambiar">
          Edición cerrada
        </span>
      )}
      <span className={`nu-guardado nu-guardado--${conexion}`} title={AYUDA[conexion]}>
        {TEXTO[conexion]}
      </span>
      {otros.length > 0 && (
        <span className="nu-caras" title={otros.map((p) => p.nombre).join(', ')}>
          {visibles.map((p) => (
            <span key={p.id} className="nu-avatar nu-avatar--chico nu-cara" style={{ background: p.color }}>
              {p.nombre.charAt(0).toUpperCase()}
            </span>
          ))}
          {otros.length > MAXIMO_CARAS && <span className="nu-cara nu-cara--mas">+{otros.length - MAXIMO_CARAS}</span>}
        </span>
      )}
      {soloLectura ? (
        <button type="button" className="nv-boton nv-boton--chico nu-mirando" onClick={nube.salir} title="Volver al panel">
          Mirando · {nube.equipo.nombre} · ← Panel
        </button>
      ) : (
        <button
          type="button"
          className="nu-persona"
          aria-expanded={abierto}
          onClick={() => setAbierto((a) => !a)}
          title={`${nube.persona.nombre} · ${nube.equipo.nombre}`}
        >
          <span className="nu-avatar nu-avatar--chico" style={{ background: nube.persona.color }}>
            {nube.persona.nombre.charAt(0).toUpperCase()}
          </span>
          <span className="nu-persona__texto">
            <strong>{nube.persona.nombre}</strong>
            <small>{nube.equipo.nombre}</small>
          </span>
        </button>
      )}
      {abierto && !soloLectura && (
        <div className="nu-menu" role="menu">
          {otros.length > 0 && (
            <div className="nu-menu__quienes">
              <span className="nv-etiqueta nv-tenue">Conectados ahora</span>
              {otros.map((p) => (
                <span key={p.id} className="nu-menu__quien">
                  <span className="nv-punto" style={{ background: p.color }} />
                  {p.nombre}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAviso('Armando la copia…');
              void descargarCopia(proyecto, nube.equipo.nombre).then(({ faltan }) =>
                setAviso(faltan ? `Copia descargada, sin ${faltan} archivo(s) que no se pudieron leer.` : 'Copia descargada.'),
              );
            }}
          >
            Descargar copia del proyecto
          </button>
          <button type="button" role="menuitem" onClick={() => elegirCopia.current?.click()}>
            Cargar una copia…
          </button>
          <input
            ref={elegirCopia}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(ev) => {
              const archivo = ev.target.files?.[0];
              ev.target.value = '';
              if (!archivo) return;
              leerCopia(archivo)
                .then((p) => {
                  setPorCargar(p);
                  setAviso(null);
                })
                .catch((e: Error) => setAviso(e.message));
            }}
          />
          {porCargar && (
            <div className="nu-menu__confirmar">
              <span>Esto reemplaza el proyecto de todo el equipo por la copia.</span>
              <button
                type="button"
                className="nv-boton nv-boton--chico nv-boton--primario"
                onClick={() => {
                  reemplazar(porCargar);
                  setPorCargar(null);
                  setAviso('Copia cargada. Sus archivos se están subiendo.');
                }}
              >
                Sí, reemplazar
              </button>
              <button type="button" className="nv-boton nv-boton--chico" onClick={() => setPorCargar(null)}>
                Cancelar
              </button>
            </div>
          )}
          {aviso && <p className="nu-menu__aviso">{aviso}</p>}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              nube.cambiarPersona();
            }}
          >
            Cambiar de persona
          </button>
          <button type="button" role="menuitem" onClick={nube.salir}>
            Salir del equipo
          </button>
        </div>
      )}
    </div>
  );
}
