// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Graba tu sonido: grabar (o subir) un efecto, recortarlo, ponerle nombre y
 * decidir dónde va: en una capa nueva, en lugar del sonido de otra capa,
 * en una palabra del relato, o solo guardarlo en «Tuyos» para después.
 *
 * Aquí solo se graban efectos: la voz se graba en el paso Voz.
 */
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { nuevoId } from '../estado/proyecto';
import { buscarEscena } from '../estado/escenas';
import { agregarPista, ponerSonido } from '../estado/musica';
import { useGrabadora } from '../hooks/useGrabadora';
import { Recortador } from '../componentes/Recortador';
import { Ventana } from '../componentes/Ventana';
import { Icono } from './Icono';

export type DestinoGrabacion =
  | { tipo: 'capa'; id?: string }
  | { tipo: 'nueva' }
  | { tipo: 'palabra'; escenaId: string; palabra: number };

type Donde = 'nueva' | 'reemplazar' | 'guardar';

interface Props {
  destino: DestinoGrabacion;
  /** Un archivo ya elegido: se salta la grabación y va directo a recortar. */
  archivo?: { url: string; nombre: string };
  alCerrar: () => void;
}

export function VentanaGrabar({ destino, archivo, alCerrar }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const filas = proyecto.patron.filas;
  const [cruda, setCruda] = useState<string | null>(archivo?.url ?? null);
  const [nombre, setNombre] = useState(archivo?.nombre ?? '');
  const [donde, setDonde] = useState<Donde>(destino.tipo === 'capa' && destino.id ? 'reemplazar' : 'nueva');
  const [capa, setCapa] = useState(destino.tipo === 'capa' && destino.id ? destino.id : (filas[0]?.id ?? ''));
  const grabadora = useGrabadora((g) => setCruda(g.url));
  const grabando = grabadora.estado === 'grabando';

  const subir = (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setNombre(f.name.replace(/\.[^.]+$/, '').slice(0, 18));
    setCruda(crearUrl(f));
    ev.target.value = '';
  };

  const guardar = (recorte: Blob, duracion: number) => {
    const url = crearUrl(recorte);
    const id = nuevoId('sonido');
    const comoSeLlama = nombre.trim().slice(0, 18) || `Efecto ${proyecto.sonidos.length + 1}`;
    actualizar((p) => {
      p.sonidos.push({ id, nombre: comoSeLlama, url, duracion });
      if (destino.tipo === 'palabra') {
        const e = buscarEscena(p, destino.escenaId);
        if (!e) return;
        const resto = (e.cajitas ?? []).filter((c) => c.palabra !== destino.palabra || c.tipo === 'imagen');
        e.cajitas = [...resto, { id: nuevoId('cajita'), palabra: destino.palabra, tipo: 'sonido', url, nombre: comoSeLlama }];
        return;
      }
      if (donde === 'nueva') agregarPista(p, `propio:${id}`);
      if (donde === 'reemplazar' && capa) ponerSonido(p, capa, `propio:${id}`);
    });
    alCerrar();
  };

  return (
    <Ventana titulo="Graba tu sonido" nota="Grábalo, recorta lo que sobra y ponle nombre." alCerrar={alCerrar} ancha>
      <div className="nv nv--incrustado nv-grabadora">
        {!cruda ? (
          <div className="nv-grabadora__micro">
            <button
              type="button"
              className={`nv-grabadora__boton ${grabando ? 'nv-grabadora__boton--grabando' : ''}`}
              disabled={grabadora.estado === 'pidiendo'}
              onClick={() => (grabando ? grabadora.parar() : void grabadora.empezar())}
              aria-label={grabando ? 'Parar' : 'Grabar'}
            >
              <Icono n={grabando ? 'stop-fill' : 'microphone-fill'} tam={34} />
            </button>
            <strong className="nv-grabadora__estado">{grabando ? `Grabando… ${grabadora.segundos.toFixed(1)} s` : 'Toca para grabar'}</strong>
            <span className="nv-tenue">Una reja, una olla, un pito… acerquen la tablet al sonido.</span>
            {grabadora.error && <span className="nv-rojo nv-chico">{grabadora.error}</span>}
            <label className="nv-boton">
              <Icono n="upload-simple-bold" tam={15} /> Subir un archivo
              <input type="file" accept="audio/*,.wav,.mp3,.ogg,.m4a" hidden onChange={subir} />
            </label>
          </div>
        ) : (
          <>
            <label className="nv-grabadora__campo">
              <span className="nv-grabadora__pregunta">¿Cómo se llama?</span>
              <input className="nv-entrada" value={nombre} maxLength={18} placeholder="Reja del parque, olla, pito…" onChange={(ev) => setNombre(ev.target.value)} />
            </label>
            {destino.tipo !== 'palabra' && (
              <div className="nv-grabadora__donde">
                <span className="nv-grabadora__pregunta">¿Dónde lo ponen?</span>
                <div className="nv-grabadora__opciones">
                  <Opcion activa={donde === 'nueva'} icono="plus-bold" titulo="En una capa nueva" nota="suena junto a las demás" alTocar={() => setDonde('nueva')} />
                  <Opcion activa={donde === 'reemplazar'} icono="arrow-counter-clockwise-bold" titulo="En lugar de otro sonido" nota="eligen qué capa cambia" alTocar={() => setDonde('reemplazar')} />
                  <Opcion activa={donde === 'guardar'} icono="music-notes-fill" titulo="Solo guardarlo" nota="queda en «Tuyos» para después" alTocar={() => setDonde('guardar')} />
                </div>
                {donde === 'reemplazar' && (
                  <div className="nv-grabadora__capas">
                    {filas.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`nv-grabadora__capa ${capa === f.id ? 'nv-grabadora__capa--activa' : ''}`}
                        style={{ ['--color' as string]: f.color }}
                        onClick={() => setCapa(f.id)}
                      >
                        <span className="nv-punto" style={{ background: f.color }} />
                        {f.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="nv-grabadora__recorte">
              <span className="nv-etiqueta nv-tenue">Recorta · lo verde es lo que queda</span>
              <Recortador url={cruda} alGuardar={guardar} alDescartar={() => setCruda(null)} />
            </div>
          </>
        )}
      </div>
    </Ventana>
  );
}

function Opcion({ activa, icono, titulo, nota, alTocar }: { activa: boolean; icono: 'plus-bold' | 'arrow-counter-clockwise-bold' | 'music-notes-fill'; titulo: string; nota: string; alTocar: () => void }) {
  return (
    <button type="button" className={`nv-grabadora__opcion ${activa ? 'nv-grabadora__opcion--activa' : ''}`} onClick={alTocar} aria-pressed={activa}>
      <strong>
        <Icono n={icono} tam={13} /> {titulo}
      </strong>
      <span>{nota}</span>
    </button>
  );
}
