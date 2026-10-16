/**
 * SONORA, narrativa primero.
 *
 * La historia es la pantalla y la música y la imagen la siguen. Cuatro
 * pasos —Historia, Voz, Escenas, Función— y dentro de Escenas, cada escena
 * se abre para editarla.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import type { Track } from '../guia/pasos';
import { Barra, type Paso } from './Barra';
import { DentroEscena } from './DentroEscena';
import { MusicaEscena } from './MusicaEscena';
import { ImagenEscena } from './ImagenEscena';
import { conexionesVisualIniciales } from '../estado/imagen';
import { aplicarPreset, conexionesIniciales } from '../estado/musica';
import { PasoEscenas } from './PasoEscenas';
import { PasoFuncion } from './PasoFuncion';
import { PasoHistoria } from './PasoHistoria';
import { PasoVoz } from './PasoVoz';

function ElegirLab() {
  const { actualizar } = useProyecto();
  const elegir = (track: Track) =>
    actualizar((p) => {
      p.track = track;
      // La primera vez se arranca desde el preset: ya suena con golpes y melodía.
      if (p.patron.melodia.notas.length === 0) aplicarPreset(p, p.preset);
      // El lab de IA arranca con un ejemplo de conexiones que ya funciona.
      if (track === 'ia' && p.conexiones.length === 0) p.conexiones = conexionesIniciales(p);
      if (track === 'ia' && p.conexionesVisual.length === 0) {
        p.conexionesVisual = conexionesVisualIniciales(p.visual.algoritmo);
      }
    });
  return (
    <div className="nv nv-lab-pantalla">
      <span className="nv-logo nv-logo--grande">SONORA</span>
      <h1 className="nv-titulo nv-titulo--grande">¿De qué Urban Lab eres?</h1>
      <p className="nv-sub">
        Los dos cuentan una historia de Medellín. Lo que cambia es cómo le dan sonido e imagen.
      </p>
      <div className="nv-lab-opciones">
        <button type="button" className="nv-lab-opcion nv-lab-opcion--ia" onClick={() => elegir('ia')}>
          <span className="nv-etiqueta">LAB IA</span>
          <strong>Dirigir con datos</strong>
          <span className="nv-tenue">Decides de qué depende la música y la imagen: la voz, la emoción, un archivo.</span>
        </button>
        <button type="button" className="nv-lab-opcion nv-lab-opcion--mu" onClick={() => elegir('musica')}>
          <span className="nv-etiqueta">LAB MÚSICA URBANA</span>
          <strong>Samplear y tocar</strong>
          <span className="nv-tenue">Cambias sonidos por tus grabaciones, editas a mano y tocas en vivo.</span>
        </button>
      </div>
    </div>
  );
}

export function AppNarrativa() {
  const { proyecto } = useProyecto();
  const [paso, setPaso] = useState<Paso>('historia');
  const [escenaAbierta, setEscenaAbierta] = useState<string | null>(null);
  const [editor, setEditor] = useState<'musica' | 'imagen' | null>(null);
  useSincronizarAudio();

  // Barra espaciadora: escuchar o parar la pieza, salvo mientras se escribe.
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (ev.code !== 'Space' || t.closest('input, textarea, [contenteditable]')) return;
      ev.preventDefault();
      if (motorAudio.estaSonando) motorAudio.detener();
      else if (proyecto.escenas.length > 0) void motorAudio.reproducirPieza();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [proyecto.escenas.length]);

  if (!proyecto.track) return <ElegirLab />;

  const ir = (p: Paso) => {
    setEscenaAbierta(null);
    setEditor(null);
    setPaso(p);
  };

  return (
    <div className="nv">
      <Barra paso={paso} alCambiar={ir} />
      <main className="nv-contenido">
        {paso === 'historia' && <PasoHistoria alSeguir={() => ir('voz')} />}
        {paso === 'voz' && <PasoVoz alSeguir={() => ir('escenas')} />}
        {paso === 'escenas' &&
          (escenaAbierta && editor ? (
            editor === 'musica' ? (
              <MusicaEscena
                id={escenaAbierta}
                alVolver={() => {
                  setEditor(null);
                  if (escenaAbierta === 'general') setEscenaAbierta(null);
                }}
                alImagen={() => setEditor('imagen')}
              />
            ) : (
              <ImagenEscena
                id={escenaAbierta}
                alVolver={() => {
                  setEditor(null);
                  if (escenaAbierta === 'general') setEscenaAbierta(null);
                }}
                alMusica={() => setEditor('musica')}
              />
            )
          ) : escenaAbierta ? (
            <DentroEscena
              id={escenaAbierta}
              alVolver={() => setEscenaAbierta(null)}
              alIr={setEscenaAbierta}
              alMusica={() => setEditor('musica')}
              alImagen={() => setEditor('imagen')}
            />
          ) : (
            <PasoEscenas
              alEntrar={setEscenaAbierta}
              alGeneral={() => {
                setEscenaAbierta('general');
                setEditor('musica');
              }}
            />
          ))}
        {paso === 'funcion' && <PasoFuncion />}
      </main>
    </div>
  );
}
