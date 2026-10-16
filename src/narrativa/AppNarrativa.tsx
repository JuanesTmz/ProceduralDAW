/**
 * SONORA, narrativa primero.
 *
 * La historia es la pantalla y la música y la imagen la siguen. Cuatro
 * pasos —Historia, Voz, Escenas, Función— y dentro de Escenas, cada escena
 * se abre directo en sus dos pestañas: Música y Visuales.
 */
import { useEffect, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import type { Track } from '../guia/pasos';
import { Barra, type Paso } from './Barra';
import { EditorEscena, type Pestana } from './EditorEscena';
import { conexionesVisualIniciales } from '../estado/imagen';
import { aplicarPreset, conexionesIniciales, sincronizarReglas } from '../estado/musica';
import { recorrido } from '../estado/escenas';
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
      // En IA el cuadro de cada pista arranca donde está su patrón.
      if (track === 'ia') sincronizarReglas(p);
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
  const { proyecto, cargando } = useProyecto();
  const [paso, setPaso] = useState<Paso>('historia');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('musica');
  useSincronizarAudio();

  // Barra espaciadora: escuchar o parar, salvo mientras se escribe.
  // Dentro de una escena suena solo esa escena; afuera, la pieza.
  const indiceAbierta = abierta ? recorrido(proyecto).findIndex((e) => e.id === abierta) : -1;
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (ev.code !== 'Space' || t.closest('input, textarea, [contenteditable]')) return;
      ev.preventDefault();
      if (motorAudio.estaSonando) motorAudio.detener();
      else if (indiceAbierta >= 0) void motorAudio.reproducirEscena(indiceAbierta);
      else if (proyecto.escenas.length > 0) void motorAudio.reproducirPieza();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [proyecto.escenas.length, indiceAbierta]);

  if (cargando) return <div className="nv" />;
  if (!proyecto.track) return <ElegirLab />;

  const ir = (p: Paso) => {
    setAbierta(null);
    setPaso(p);
  };

  return (
    <div className="nv">
      <Barra paso={paso} alCambiar={ir} enEscena={Boolean(abierta)} />
      <main className="nv-contenido">
        {paso === 'historia' && <PasoHistoria alSeguir={() => ir('voz')} />}
        {paso === 'voz' && <PasoVoz alSeguir={() => ir('escenas')} />}
        {paso === 'escenas' &&
          (abierta ? (
            <EditorEscena
              id={abierta}
              pestana={pestana}
              alPestana={setPestana}
              alIr={setAbierta}
              alVolver={() => setAbierta(null)}
            />
          ) : (
            <PasoEscenas alEntrar={setAbierta} alGeneral={() => setAbierta('general')} />
          ))}
        {paso === 'funcion' && <PasoFuncion />}
      </main>
    </div>
  );
}
