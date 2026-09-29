/**
 * AppShell: cascarón de la app.
 *
 * Sostiene el recorrido guiado —Pantalla 0, barra de progreso, misión del
 * paso— y la barra de transporte, que está disponible en todo momento.
 */
import { useEffect, useState } from 'react';
import type { Vista } from '../estado/tipos';
import { useProyecto } from '../estado/ProyectoContext';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import { NOMBRE_CORTO_TRACK, pasosDelTrack, type Track } from '../guia/pasos';
import { BarraTransporte } from './BarraTransporte';
import { BarraProgreso } from './BarraProgreso';
import { Mision } from './Mision';
import { PantallaTrack } from './PantallaTrack';
import { PasoHistoria } from './PasoHistoria';
import { PasoMonologo } from './PasoMonologo';
import { PasoArco } from './PasoArco';
import { Secuenciador } from './Secuenciador';
import { PanelGenerativo } from './PanelGenerativo';
import { SeccionesArreglo } from './SeccionesArreglo';
import { PasoVisual } from './PasoVisual';
import { PasoExportar } from './PasoExportar';

export function AppShell() {
  const [vista, setVista] = useState<Vista>('historia');
  const { proyecto, actualizar } = useProyecto();
  useSincronizarAudio();

  const track = proyecto.track;
  const pasos = track ? pasosDelTrack(track) : [];
  const indice = pasos.findIndex((p) => p.id === vista);
  const siguiente = indice >= 0 ? pasos[indice + 1] : undefined;
  const anterior = indice > 0 ? pasos[indice - 1] : undefined;

  // Al cambiar de paso se sube la vista: en portátiles la pantalla es corta.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [vista]);

  if (!track) return <PantallaTrack />;

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">
          <span className="marca__logo">SONORA</span>
          <span className="marca__lema">narrativa musical · Medellín</span>
        </div>

        <button
          type="button"
          className="chip chip--track"
          title="Cambiar de Urban Lab. No pierdes nada de lo que llevas."
          onClick={() =>
            actualizar((p) => {
              p.track = null;
            })
          }
        >
          Lab: {NOMBRE_CORTO_TRACK[track as Track]} ⇄
        </button>
      </header>

      <BarraProgreso vista={vista} alCambiar={setVista} />

      <main className="contenido">
        <BarraTransporte />
        <Mision vista={vista} />

        {vista === 'historia' && <PasoHistoria />}
        {vista === 'monologo' && <PasoMonologo />}
        {vista === 'arco' && <PasoArco />}
        {vista === 'patron' && <Secuenciador />}
        {vista === 'motor' && <PanelGenerativo />}
        {vista === 'secciones' && <SeccionesArreglo />}
        {vista === 'visual' && <PasoVisual />}
        {vista === 'exportar' && <PasoExportar alIrA={setVista} />}

        <nav className="pasos-nav" aria-label="Ir al paso anterior o siguiente">
          {anterior ? (
            <button type="button" className="boton" onClick={() => setVista(anterior.id)}>
              ← {anterior.etiqueta}
            </button>
          ) : (
            <span />
          )}
          {siguiente && (
            <button
              type="button"
              className="boton boton--primario"
              onClick={() => setVista(siguiente.id)}
            >
              {siguiente.etiqueta} →
            </button>
          )}
        </nav>
      </main>

      <footer className="pie">
        Proyecto «{proyecto.nombre}» · semilla {proyecto.semilla} · {proyecto.bpm} BPM
      </footer>
    </div>
  );
}
