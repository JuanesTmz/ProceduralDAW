/**
 * SONORA, narrativa primero.
 *
 * La historia es la pantalla y la música y la imagen la siguen. Cuatro
 * pasos —Historia, Voz, Escenas, Función— y dentro de Escenas, cada escena
 * se abre directo en sus dos pestañas: Música y Visuales.
 */
import { useEffect, useState } from 'react';
import { vistaPrevia } from '../audio/vistaPrevia';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import type { Proyecto } from '../estado/tipos';
import { Barra, type Paso } from './Barra';
import { EditorEscena, type Pestana } from './EditorEscena';
import { conexionesVisualIniciales, visualInicial } from '../estado/imagen';
import { aplicarPreset, conexionesIniciales, sincronizarReglas } from '../estado/musica';
import { recorrido } from '../estado/escenas';
import { PasoEscenas } from './PasoEscenas';
import { PasoFuncion } from './PasoFuncion';
import { PasoHistoria } from './PasoHistoria';
import { PasoVoz } from './PasoVoz';
import { Guia } from './Guia';
import type { Pantalla } from './pasosGuia';

/** Lo que lleva un proyecto nuevo para sonar y verse bien desde el primer momento. */
function iniciarProyecto(p: Proyecto) {
  // Se marca como iniciado: lo demás (música, datos, reacciones) es igual para todos.
  p.track = 'ia';
  // Cada proyecto nuevo arranca con un estilo, una paleta y unos mandos distintos.
  if (Object.keys(p.visual.parametros).length === 0 && !p.visual.imagenUrl) visualInicial(p);
  // La primera vez se arranca desde el preset: ya suena con golpes y melodía.
  if (p.patron.melodia.notas.length === 0) aplicarPreset(p, p.preset);
  sincronizarReglas(p);
  // Y con un ejemplo de datos conectados que ya funciona.
  if (p.conexiones.length === 0) p.conexiones = conexionesIniciales(p);
  if (p.conexionesVisual.length === 0) p.conexionesVisual = conexionesVisualIniciales(p.visual.algoritmo);
}

export function AppNarrativa() {
  const { proyecto, cargando } = useProyecto();
  const [paso, setPaso] = useState<Paso>('historia');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('musica');
  useSincronizarAudio();
  const { actualizar } = useProyecto();

  // Ya no se elige lab: un proyecto sin iniciar se prepara solo.
  useEffect(() => {
    if (!cargando && !proyecto.track) actualizar(iniciarProyecto);
  }, [cargando, proyecto.track, actualizar]);

  // Barra espaciadora: escuchar o parar, salvo mientras se escribe.
  // Dentro de una escena suena solo esa escena; afuera, la pieza.
  const indiceAbierta = abierta ? recorrido(proyecto).findIndex((e) => e.id === abierta) : -1;
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

  const pantalla: Pantalla =
    paso === 'escenas' && abierta ? (pestana === 'musica' ? 'escena-musica' : 'escena-visual') : paso;

  const ir = (p: Paso) => {
    setAbierta(null);
    setPaso(p);
  };

  return (
    <div className="nv">
      <Barra paso={paso} alCambiar={ir} enEscena={Boolean(abierta)} guia={<Guia pantalla={pantalla} />} />
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
