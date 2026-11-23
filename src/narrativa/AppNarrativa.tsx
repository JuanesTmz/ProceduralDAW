// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * SONORA, narrativa primero.
 *
 * La historia es la pantalla y la música y la imagen la siguen. Cinco
 * pasos —Historia, Voz, Música, Visuales y Función—. Música y Visuales
 * comparten la escena abierta: al pasar de uno a otro se sigue en la misma.
 */
import { useEffect, useState } from 'react';
import { vistaPrevia } from '../audio/vistaPrevia';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import type { Proyecto } from '../estado/tipos';
import { Barra, type Paso } from './Barra';
import { conexionesVisualIniciales, visualInicial } from '../estado/imagen';
import { aplicarPreset, sincronizarReglas } from '../estado/musica';
import { buscarEscena, recorrido } from '../estado/escenas';
import { PasoMusica } from './PasoMusica';
import { PasoVisuales } from './PasoVisuales';
import { PasoFuncion } from './PasoFuncion';
import { PasoHistoria } from './PasoHistoria';
import { PasoVoz } from './PasoVoz';
import { Guia } from './Guia';
import { Animo } from './Animo';
import type { Pantalla } from './pasosGuia';

import { useLugar } from '../nube/Caras';

/** Lo que lleva un proyecto nuevo para sonar y verse bien desde el primer momento. */
function iniciarProyecto(p: Proyecto) {
  // Se marca como iniciado: lo demás (música, datos, reacciones) es igual para todos.
  p.track = 'ia';
  // Cada proyecto nuevo arranca con un estilo, una paleta y unos mandos distintos.
  if (Object.keys(p.visual.parametros).length === 0 && !p.visual.imagenUrl) visualInicial(p);
  // La primera vez se arranca desde una base: ya suena con golpes y melodía.
  if (p.patron.melodia.notas.length === 0) aplicarPreset(p, p.preset);
  sincronizarReglas(p);
  // La música ya no se mueve con datos (se quitó en nov. 2026): solo celdas.
  p.conexiones = [];
  // La imagen arranca con unas cajitas ya puestas, para que se vea la idea sin explicarla.
  if (p.conexionesVisual.length === 0) p.conexionesVisual = conexionesVisualIniciales(p.visual.algoritmo);
}

export function AppNarrativa() {
  const { proyecto, cargando } = useProyecto();
  const [paso, setPaso] = useState<Paso>('historia');
  /** La escena abierta en Música y Visuales, o 'general' (la base / toda la obra). */
  const [elegida, setElegida] = useState('general');
  const enEscenas = paso === 'musica' || paso === 'visuales';
  // Si la escena elegida ya no existe (se borró un respiro, se rehízo el corte), se vuelve a la base.
  const abierta = elegida !== 'general' && !buscarEscena(proyecto, elegida) ? 'general' : elegida;
  useSincronizarAudio();
  // En la nube, las demás tablets ven en qué paso y escena está esta persona.
  useLugar({ paso, escena: enEscenas ? abierta : null, pestana: paso === 'musica' ? 'musica' : paso === 'visuales' ? 'visual' : undefined });
  const { actualizar } = useProyecto();

  // Ya no se elige lab: un proyecto sin iniciar se prepara solo.
  useEffect(() => {
    if (!cargando && !proyecto.track) actualizar(iniciarProyecto);
  }, [cargando, proyecto.track, actualizar]);

  // Barra espaciadora: escuchar o parar, salvo mientras se escribe.
  // Con una escena abierta suena solo esa escena; si no, la obra.
  const indiceAbierta = enEscenas && abierta !== 'general' ? recorrido(proyecto).findIndex((e) => e.id === abierta) : -1;
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (ev.code !== 'Space' || t.closest('input, textarea, [contenteditable]')) return;
      ev.preventDefault();
      // Si algo suena (la pieza, una escena o una vista previa), la barra lo para.
      if (motorAudio.claveActiva || vistaPrevia.activa) vistaPrevia.pararTodo();
      // Con una ventana abierta no arranca nada: la ventana manda.
      else if (document.querySelector('[role="dialog"]')) return;
      else if (indiceAbierta >= 0) void motorAudio.reproducirEscena(indiceAbierta);
      else if (proyecto.escenas.length > 0) void motorAudio.reproducirPieza();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [proyecto.escenas.length, indiceAbierta]);

  if (cargando || !proyecto.track) return <div className="nv" />;

  const pantalla: Pantalla = paso === 'musica' ? 'escena-musica' : paso === 'visuales' ? 'escena-visual' : paso;

  /** Cambiar de paso. Visuales empieza por toda la obra mientras esta no esté lista. */
  const ir = (p: Paso) => {
    if (p === 'visuales' && paso !== 'visuales' && (proyecto.visual.pasosVisual ?? 0) < 4) setElegida('general');
    setPaso(p);
  };

  return (
    <div className="nv">
      <Barra paso={paso} alCambiar={ir} guia={<Guia pantalla={pantalla} />} />
      <main className={`nv-contenido ${enEscenas || paso === 'historia' ? 'nv-contenido--fijo' : ''}`}>
        {paso === 'historia' && <PasoHistoria alSeguir={() => ir('voz')} />}
        {paso === 'voz' && <PasoVoz alSeguir={() => ir('musica')} />}
        {paso === 'musica' && <PasoMusica abierta={abierta} alIr={setElegida} />}
        {paso === 'visuales' && <PasoVisuales abierta={abierta} alIr={setElegida} />}
        {paso === 'funcion' && <PasoFuncion />}
      </main>
      <Animo />
    </div>
  );
}
