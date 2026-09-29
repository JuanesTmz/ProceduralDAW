/**
 * El lienzo: dos canvas apilados.
 *  - abajo, Hydra dibujando el visual procedural reactivo;
 *  - encima, un canvas 2D con el texto cinético.
 *
 * Van separados a propósito: Hydra manda en su canvas, y así el texto
 * se dibuja nítido y se podrá componer al exportar el video.
 */
import { useEffect, useRef } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import { ALTO_VISUAL, ANCHO_VISUAL, motorVisual } from '../visual/motorVisual';
import { analizador } from '../visual/analizador';
import { dibujarTexto, palabrasReveladas } from '../visual/textoCinetico';
import { fragmentosNarracion, palabrasDe } from '../estado/proyecto';

export function LienzoVisual() {
  const { proyecto } = useProyecto();
  const lienzoHydra = useRef<HTMLCanvasElement>(null);
  const lienzoTexto = useRef<HTMLCanvasElement>(null);
  const datos = useRef(proyecto);
  datos.current = proyecto;

  // Hydra arranca una sola vez, con el canvas montado.
  useEffect(() => {
    const canvas = lienzoHydra.current;
    if (!canvas) return;
    motorVisual.iniciar(canvas);
    return () => motorVisual.detener();
  }, []);

  // Cada cambio del proyecto se refleja en el motor visual.
  useEffect(() => {
    const { visual } = proyecto;
    motorVisual.cargarImagen(visual.imagenUrl);
    motorVisual.actualizar({
      preset: visual.preset,
      semilla: visual.semillaPropia ? visual.semilla : proyecto.semilla,
    });
  }, [proyecto]);

  // Bucle del texto y del seguimiento de sección.
  useEffect(() => {
    const canvas = lienzoTexto.current;
    if (!canvas) return;
    canvas.width = ANCHO_VISUAL;
    canvas.height = ALTO_VISUAL;

    let cuadro = 0;
    let presetAnterior = '';

    const paso = () => {
      const p = datos.current;
      const indice = motorAudio.seccionActual;
      const seccion = indice >= 0 ? p.secciones[indice] : undefined;

      // El visual sigue el arco: preset, intensidad y desvanecido de la sección.
      const preset = seccion?.presetVisual ?? p.visual.preset;
      const intensidad = seccion?.intensidad ?? 1;
      if (preset !== presetAnterior) {
        presetAnterior = preset;
        motorVisual.actualizar({ preset });
      }
      motorVisual.actualizar({ intensidad, mezclaImagen: p.visual.mezclaImagen });

      // Texto: solo el fragmento de la sección que suena, revelado con la voz.
      const bandas = analizador.valores;
      if (!p.visual.textoVisible) {
        dibujarTexto(canvas, { palabras: [], reveladas: 0, opacidad: 0 }, bandas);
      } else {
        const transcurrido = motorAudio.segundosDeNarracion;
        const totalPalabras = palabrasDe(p.narracion.texto);
        const fragmentos = fragmentosNarracion(p.narracion);
        const indiceFragmento = indice >= 0 ? indice : 0;
        const palabras = palabrasDe(fragmentos[indiceFragmento] ?? '');

        // Las reveladas se calculan sobre el monólogo completo y luego se
        // recortan al fragmento: así el texto no se reinicia en cada sección.
        const reveladasGlobales = palabrasReveladas(
          transcurrido,
          p.narracion.duracion,
          totalPalabras.length,
        );
        const comienzoFragmento = [0, ...p.narracion.cortes][indiceFragmento] ?? 0;
        const reveladas =
          transcurrido < 0
            ? 0
            : Math.max(0, Math.min(palabras.length, reveladasGlobales - comienzoFragmento));

        dibujarTexto(
          canvas,
          {
            palabras,
            reveladas,
            // El cierre apaga el texto junto con la música.
            opacidad: seccion?.desvanecer ? Math.max(0, intensidad) : 1,
          },
          bandas,
        );
      }

      cuadro = requestAnimationFrame(paso);
    };

    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, []);

  return (
    <div className="lienzo">
      <canvas ref={lienzoHydra} className="lienzo__capa" />
      <canvas ref={lienzoTexto} className="lienzo__capa lienzo__capa--texto" />
      {!motorAudio.estaSonando && (
        <p className="lienzo__pista">Dale a ▶ Pieza para ver el visual reaccionar</p>
      )}
    </div>
  );
}
