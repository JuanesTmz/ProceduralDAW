/**
 * Estado global del proyecto. Un solo objeto Proyecto, y una función
 * actualizar(receta) que recibe una copia mutable: así los componentes
 * escriben cambios legibles ("fila.pasos[i] = true") sin clonar a mano.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Proyecto } from './tipos';
import { crearProyectoInicial } from './proyecto';

interface ContextoProyecto {
  proyecto: Proyecto;
  actualizar: (receta: (borrador: Proyecto) => void) => void;
  reemplazar: (proyecto: Proyecto) => void;
}

const Contexto = createContext<ContextoProyecto | null>(null);

export function ProveedorProyecto({ children }: { children: ReactNode }) {
  const [proyecto, setProyecto] = useState<Proyecto>(crearProyectoInicial);

  const actualizar = useCallback((receta: (borrador: Proyecto) => void) => {
    setProyecto((anterior) => {
      const borrador = structuredClone(anterior) as Proyecto;
      receta(borrador);
      return borrador;
    });
  }, []);

  const valor = useMemo(
    () => ({ proyecto, actualizar, reemplazar: setProyecto }),
    [proyecto, actualizar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useProyecto(): ContextoProyecto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useProyecto debe usarse dentro de ProveedorProyecto');
  return valor;
}
