/**
 * La guía: el botón «Guía» de la esquina y el tour de cada pantalla.
 *
 * La primera vez que se entra a una pantalla el tour arranca solo; después
 * se repite con el botón. Lo ya visto se recuerda en este navegador (es una
 * comodidad de quien usa la tablet, no parte del proyecto: empezar de cero
 * no vuelve a mostrar los tours).
 */
import { useEffect, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { pasosDe, type Pantalla, type PasoTour } from './pasosGuia';
import { Tour } from './Tour';

const CLAVE = 'sonora-guia-vista';

function leerVistas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function marcarVista(clave: string): void {
  try {
    const vistas = leerVistas();
    vistas.add(clave);
    localStorage.setItem(CLAVE, JSON.stringify([...vistas]));
  } catch {
    // Sin almacenamiento la guía sigue funcionando; solo se volverá a ofrecer.
  }
}

/** Solo los pasos cuyo elemento está en pantalla (o que no señalan nada). */
function visibles(pasos: PasoTour[]): PasoTour[] {
  return pasos.filter((p) => !p.objetivo || document.querySelector(p.objetivo));
}

export function Guia({ pantalla }: { pantalla: Pantalla }) {
  const { proyecto } = useProyecto();
  const clave = `${pantalla}:${proyecto.track ?? ''}`;
  const [pasos, setPasos] = useState<PasoTour[] | null>(null);
  const [vista, setVista] = useState(() => leerVistas().has(clave));

  const abrir = () => setPasos(visibles(pasosDe(pantalla, proyecto.track)));

  // Al entrar a una pantalla nueva, el tour arranca solo si nunca se vio.
  useEffect(() => {
    setPasos(null);
    const yaVista = leerVistas().has(clave);
    setVista(yaVista);
    if (yaVista) return;
    // Espera a que la pantalla termine de armarse para medir bien.
    const t = window.setTimeout(() => setPasos(visibles(pasosDe(pantalla, proyecto.track))), 700);
    return () => window.clearTimeout(t);
  }, [clave, pantalla, proyecto.track]);

  const cerrar = () => {
    setPasos(null);
    marcarVista(clave);
    setVista(true);
  };

  return (
    <>
      <button
        type="button"
        className={`nv-guia-boton ${vista ? '' : 'nv-guia-boton--nueva'}`}
        onClick={abrir}
        title="Ver la guía de esta pantalla"
      >
        <span className="nv-guia-boton__icono">?</span>
        Guía
      </button>
      <Tour pasos={pasos ?? []} abierto={Boolean(pasos && pasos.length > 0)} alCerrar={cerrar} />
    </>
  );
}
