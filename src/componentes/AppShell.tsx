/**
 * AppShell: el cascarón.
 *
 * Tres fases —Conceptualización, Producción, Visual— y una sola pantalla por
 * fase. Producción ya no es un montón de mesas con pestañas: es el taller,
 * con la pista repartida a la vista y las herramientas en ventanas.
 *
 * Por eso la navegación de aquí es corta: historia → monólogo → la canción →
 * visual → exportar. Cuando algo de fuera pide ir a una herramienta —el
 * repaso de Exportar, por ejemplo— se abre el taller con esa ventana puesta.
 */
import { useEffect, useState } from 'react';
import {
  esMesa,
  FASE_DE_VISTA,
  type Fase,
  type Herramienta,
  type NombreSeccion,
  type Vista,
} from '../estado/tipos';
import { useProyecto } from '../estado/ProyectoContext';
import { useSincronizarAudio } from '../hooks/useSincronizarAudio';
import { NOMBRE_CORTO_TRACK, pasoDe, RECORRIDO, type Track } from '../guia/pasos';
import { BarraFases } from './BarraFases';
import { BarraTransporte } from './BarraTransporte';
import { Mision } from './Mision';
import { PantallaTrack } from './PantallaTrack';
import { PasoHistoria } from './PasoHistoria';
import { PasoMonologo } from './PasoMonologo';
import { PasoVisual } from './PasoVisual';
import { PasoExportar } from './PasoExportar';
import { Taller } from './Taller';

/** La pantalla con la que abre cada fase. */
function entradaDeFase(fase: Fase): Vista {
  if (fase === 'concepto') return 'historia';
  if (fase === 'visual') return 'visual';
  return 'cancion';
}

export function AppShell() {
  const { proyecto, actualizar } = useProyecto();
  const track = proyecto.track as Track | null;
  const [vista, setVista] = useState<Vista>('historia');
  const [parte, setParte] = useState<NombreSeccion>('intro');
  /** Qué ventana del taller está abierta. null = solo la pista. */
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  useSincronizarAudio();

  /**
   * Ir a una pantalla. Las antiguas mesas ya no son pantallas: pedir 'matriz'
   * es pedir el taller con la matriz abierta.
   */
  const irA = (destino: Vista) => {
    if (esMesa(destino)) {
      setHerramienta(destino === 'cancion' ? null : (destino as Herramienta));
      setVista('cancion');
      return;
    }
    setHerramienta(null);
    setVista(destino);
  };

  const indice = RECORRIDO.indexOf(vista);
  const siguiente = indice >= 0 ? RECORRIDO[indice + 1] : undefined;
  const anterior = indice > 0 ? RECORRIDO[indice - 1] : undefined;

  // Al cambiar de pantalla se sube la vista: en tablet la pantalla es corta.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [vista]);

  if (!track) return <PantallaTrack />;

  const fase = FASE_DE_VISTA[vista];
  const enProduccion = fase === 'produccion';

  const navegacion = (
    <nav className="pasos-nav" aria-label="Ir a la pantalla anterior o siguiente">
      {anterior && (
        <button type="button" className="boton" onClick={() => irA(anterior)}>
          ← {pasoDe(anterior).etiqueta}
        </button>
      )}
      {siguiente && (
        <button type="button" className="boton boton--primario" onClick={() => irA(siguiente)}>
          {pasoDe(siguiente).etiqueta} →
        </button>
      )}
    </nav>
  );

  return (
    <div className="app" data-fase={fase} data-parte={parte}>
      <header className="cabecera">
        <div className="marca">
          <span className="marca__logo">SONORA</span>
          <span className="marca__lema">narrativa sonora · Medellín</span>
        </div>

        <BarraFases
          vista={vista}
          alCambiarFase={(f) => irA(entradaDeFase(f))}
          alExportar={() => irA('exportar')}
        />

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
          {NOMBRE_CORTO_TRACK[track]} ⇄
        </button>
      </header>

      {/* El transporte es lo único que se queda fijo mientras se produce:
          tocar, bucle o pieza, tempo, volumen y la semilla. */}
      {enProduccion && (
        <div className="marco">
          <BarraTransporte />
        </div>
      )}

      <main className="contenido">
        {!enProduccion && <Mision vista={vista} />}

        <div className="area">
          {vista === 'historia' && <PasoHistoria />}
          {vista === 'monologo' && <PasoMonologo />}
          {enProduccion && (
            <Taller
              parte={parte}
              alElegirParte={setParte}
              herramienta={herramienta}
              alAbrir={setHerramienta}
            />
          )}
          {vista === 'visual' && <PasoVisual />}
          {vista === 'exportar' && <PasoExportar alIrA={irA} />}
        </div>

        {!enProduccion && navegacion}
      </main>
    </div>
  );
}
