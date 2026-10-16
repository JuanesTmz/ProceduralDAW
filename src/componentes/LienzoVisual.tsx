/**
 * El lienzo de la obra: dos capas apiladas.
 *
 *  - Abajo, el canvas del algoritmo. No lo crea React: lo planta el motor,
 *    porque al cambiar de algoritmo hay que cambiar de canvas —uno que ya
 *    dio contexto 2D no puede dar WebGL después.
 *  - Encima, un canvas 2D con el texto del monólogo, que se dibuja aparte
 *    para que salga nítido y se pueda componer al exportar.
 */
import { useEffect, useRef, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { motorAudio } from '../audio/motorAudio';
import { motorVisual } from '../visual/motorVisual';
import { analizador } from '../visual/analizador';
import { dibujarTexto, palabrasReveladas } from '../visual/textoCinetico';
import { fragmentosNarracion, palabrasDe } from '../estado/proyecto';

const ANCHO_TEXTO = 960;
const ALTO_TEXTO = 540;

export function LienzoVisual({ alFallar }: { alFallar?: (m: string | null) => void }) {
  const { proyecto } = useProyecto();
  const contenedor = useRef<HTMLDivElement>(null);
  const lienzoTexto = useRef<HTMLCanvasElement>(null);
  const datos = useRef(proyecto);
  datos.current = proyecto;
  const [sonando, setSonando] = useState(false);

  useEffect(() => motorAudio.alCambiarPaso((paso) => setSonando(paso >= 0)), []);

  // El motor arranca una vez y se queda con el contenedor.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    motorVisual.iniciar(nodo, (mensaje) => alFallar?.(mensaje));
    return () => motorVisual.detener();
    // alFallar se deja fuera a propósito: recrear el motor en cada render
    // reiniciaría la obra a cada pulsación de un mando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El texto va en su propio bucle: el del motor es del algoritmo.
  useEffect(() => {
    const lienzo = lienzoTexto.current;
    if (!lienzo) return;
    lienzo.width = ANCHO_TEXTO;
    lienzo.height = ALTO_TEXTO;

    let cuadro = 0;
    const paso = () => {
      const p = datos.current;
      const indice = motorAudio.seccionActual;
      const seccion = indice >= 0 ? p.secciones[indice] : undefined;
      const bandas = analizador.valores;

      if (!p.visual.textoVisible) {
        dibujarTexto(lienzo, { palabras: [], reveladas: 0, opacidad: 0 }, bandas);
      } else {
        const transcurrido = motorAudio.segundosDeNarracion;
        const totales = palabrasDe(p.narracion.texto);
        const fragmentos = fragmentosNarracion(p.narracion);
        const iFragmento = indice >= 0 ? indice : 0;
        const palabras = palabrasDe(fragmentos[iFragmento] ?? '');

        // Las reveladas se cuentan sobre el monólogo entero y luego se
        // recortan al fragmento: así el texto no se reinicia en cada parte.
        const reveladasGlobales = palabrasReveladas(
          transcurrido,
          p.narracion.duracion,
          totales.length,
        );
        const comienzo = [0, ...p.narracion.cortes][iFragmento] ?? 0;
        const reveladas =
          transcurrido < 0
            ? 0
            : Math.max(0, Math.min(palabras.length, reveladasGlobales - comienzo));

        dibujarTexto(
          lienzo,
          {
            palabras,
            reveladas,
            opacidad: seccion?.desvanecer ? Math.max(0, seccion.intensidad) : 1,
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
    <div className="obra">
      <div ref={contenedor} className="obra__capa" />
      <canvas ref={lienzoTexto} className="obra__capa obra__capa--texto" />
      {!sonando && (
        <p className="obra__pista">
          La obra ya corre sola. Dale a <strong>▶ Ver la pieza</strong> para que la música la
          mueva.
        </p>
      )}
    </div>
  );
}
