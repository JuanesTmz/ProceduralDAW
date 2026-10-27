/**
 * Estado global del proyecto. Un solo objeto Proyecto, y una función
 * actualizar(receta) que recibe una copia mutable: así los componentes
 * escriben cambios legibles ("fila.pasos[i] = true") sin clonar a mano.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Proyecto } from './tipos';
import { crearProyectoInicial } from './proyecto';
import { escenasASecciones } from './escenas';
import { aplicarPad } from './patronEscena';
import { conexionesIniciales } from './musica';
import { conexionesVisualIniciales } from './imagen';
import { borrarTodo, cargar, guardar } from './guardado';

interface ContextoProyecto {
  proyecto: Proyecto;
  actualizar: (receta: (borrador: Proyecto) => void) => void;
  reemplazar: (proyecto: Proyecto) => void;
  /** Mientras se recupera la pieza guardada. */
  cargando: boolean;
  /** Borra la pieza guardada y vuelve a empezar. */
  empezarDeNuevo: () => void;
}

const Contexto = createContext<ContextoProyecto | null>(null);

export function ProveedorProyecto({ children }: { children: ReactNode }) {
  const [proyecto, setProyecto] = useState<Proyecto>(crearProyectoInicial);
  const [cargando, setCargando] = useState(true);
  const reloj = useRef<number | null>(null);

  // Al abrir, se recupera la última pieza. Lo que falte (campos nuevos) sale del proyecto vacío.
  useEffect(() => {
    let vigente = true;
    cargar()
      .then((guardado) => {
        if (!vigente || !guardado) return;
        const base = crearProyectoInicial();
        const completo = { ...base, ...guardado, visual: { ...base.visual, ...guardado.visual } };
        // Ya no hay dos labs: un proyecto de antes abre como cualquiera, con los datos de ejemplo si no tenía.
        if (completo.track) {
          completo.track = 'ia';
          if (completo.conexiones.length === 0) completo.conexiones = conexionesIniciales(completo);
          if (completo.conexionesVisual.length === 0) completo.conexionesVisual = conexionesVisualIniciales(completo.visual.algoritmo);
        }
        // Proyectos de antes: el cuadro del Pad ahora escribe celdas, así que
        // lo que el cuadro de cada escena generaba se pasa a celdas propias.
        for (const e of [...completo.escenas, ...completo.respiros]) {
          for (const [id, r] of Object.entries(e.reglas ?? {})) {
            const yaTiene = id === 'melodia' ? Boolean(e.notas) : Boolean(e.golpes?.[id]);
            if (!yaTiene) aplicarPad(completo, e.id, id, r.golpes, r.azar);
          }
        }
        if (completo.escenas.length > 0) completo.secciones = escenasASecciones(completo);
        setProyecto(completo);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  // Cada cambio se guarda, un ratito después para no escribir en cada tecla.
  useEffect(() => {
    if (cargando) return;
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => void guardar(proyecto), 700);
  }, [proyecto, cargando]);

  const empezarDeNuevo = useCallback(() => {
    void borrarTodo().then(() => setProyecto(crearProyectoInicial()));
  }, []);

  const actualizar = useCallback((receta: (borrador: Proyecto) => void) => {
    setProyecto((anterior) => {
      const borrador = structuredClone(anterior) as Proyecto;
      receta(borrador);
      // Con relato, las secciones del motor salen siempre de las escenas.
      if (borrador.escenas.length > 0) borrador.secciones = escenasASecciones(borrador);
      return borrador;
    });
  }, []);

  // Solo en desarrollo: tocar el estado desde la consola para diagnosticar.
  if (import.meta.env.DEV) {
    (globalThis as Record<string, unknown>).__sonoraProyecto = { proyecto, actualizar };
  }

  const valor = useMemo(
    () => ({ proyecto, actualizar, reemplazar: setProyecto, cargando, empezarDeNuevo }),
    [proyecto, actualizar, cargando, empezarDeNuevo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useProyecto(): ContextoProyecto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useProyecto debe usarse dentro de ProveedorProyecto');
  return valor;
}
