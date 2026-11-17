// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Estado global del proyecto. Un solo objeto Proyecto, y una función
 * actualizar(receta) que recibe una copia mutable: así los componentes
 * escriben cambios legibles ("fila.pasos[i] = true") sin clonar a mano.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Proyecto } from './tipos';
import { colorDeSonido, crearProyectoInicial } from './proyecto';
import { escenasASecciones } from './escenas';
import { aplicarPad } from './patronEscena';
import { migrarReacciones } from './efectos';
import { conexionesVisualIniciales } from './imagen';
import { borrarTodo, cargar, guardar, rehidratar } from './guardado';
import { useNube } from '../nube/contexto';
import type { Sala } from '../nube/sala';
import { cambiarUrl, subirLocales } from '../nube/archivos';

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

/** Lo que hay en la sala ahora, con las URLs de los archivos que esta tablet tiene guardados. */
async function deLaSala(sala: Sala): Promise<Proyecto | null> {
  const enSala = sala.leer();
  return enSala ? (JSON.parse(await rehidratar(JSON.stringify(enSala))) as Proyecto) : null;
}

export function ProveedorProyecto({ children }: { children: ReactNode }) {
  const [proyecto, setProyecto] = useState<Proyecto>(crearProyectoInicial);
  // El proyecto vigente también fuera del ciclo de React: los cambios propios y
  // los que llegan de la sala se encadenan sobre él sin pisarse.
  const actual = useRef(proyecto);
  const [cargando, setCargando] = useState(true);
  const reloj = useRef<number | null>(null);
  // En la nube, el proyecto es del equipo y su copia en la tablet va aparte.
  const nube = useNube();
  const sala = nube?.sala;
  const clave = nube ? `sonora-nube-${nube.equipo.id}` : undefined;

  /** Deja un proyecto como el vigente. Lo que no vino de la sala se le manda. */
  const poner = useCallback(
    (p: Proyecto, deLaSala = false) => {
      actual.current = p;
      // Con la sala congelada (o desde el panel, que solo mira) nada sale de aquí.
      if (!deLaSala && !sala?.quieta()) sala?.local(p);
      setProyecto(p);
    },
    [sala],
  );

  // Al abrir, se recupera la última pieza. Lo que falte (campos nuevos) sale del proyecto vacío.
  // En la nube sale de la sala del equipo (con las grabaciones que esta tablet
  // tenga guardadas); si no, de la tablet.
  useEffect(() => {
    let vigente = true;
    (sala ? deLaSala(sala) : cargar())
      .then((guardado) => {
        if (!vigente || !guardado) return;
        const base = crearProyectoInicial();
        const completo = {
          ...base,
          ...guardado,
          visual: { ...base.visual, ...guardado.visual },
          historia: { ...base.historia, ...guardado.historia },
        };
        // Ya no hay dos labs: un proyecto de antes abre como cualquiera, con los datos de ejemplo si no tenía.
        if (completo.track) {
          completo.track = 'ia';
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
        // Noviembre 2026: la música ya no se mueve con datos, y la voz se graba
        // solo escena por escena (las grabadas de corrido siguen sonando).
        completo.conexiones = [];
        completo.modoVoz = 'escena';
        // Los golpes de la imagen por sonido pasan a celdas.
        migrarReacciones(completo);
        if (!completo.historia.estaciones) completo.historia.estaciones = ['', '', '', '', ''];
        if (completo.escenas.length > 0) completo.secciones = escenasASecciones(completo);
        // El color de cada pista sale de su sonido: así las guardadas toman la paleta vigente.
        for (const f of completo.patron.filas) f.color = colorDeSonido(f.tipo, f.sampleUrl);
        poner(completo);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // Se abre una sola vez: la puerta monta un proveedor nuevo por equipo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lo que cambian las otras tablets del equipo llega aquí y reemplaza lo de la pantalla.
  useEffect(() => {
    if (!sala || cargando) return;
    const alLlegar = () => {
      // Lo propio que aún no viajó va primero, para no perderlo.
      sala.local(actual.current);
      const llegado = { ...sala.leer(), secciones: actual.current.secciones } as Proyecto;
      if (llegado.escenas.length > 0) llegado.secciones = escenasASecciones(llegado);
      poner(llegado, true);
    };
    const dejar = sala.alCambiarRemoto(alLlegar);
    // Por si algo llegó mientras la pieza se abría.
    alLlegar();
    return dejar;
  }, [sala, cargando, poner]);

  // En la nube, los archivos grabados aquí se suben y el proyecto pasa a usar su URL de la nube.
  const persona = nube?.persona.nombre;
  const subirArchivos = useCallback(() => {
    if (!sala || persona === undefined || sala.quieta()) return;
    subirLocales(
      actual.current,
      persona,
      (local, enNube) => {
        const borrador = structuredClone(actual.current) as Proyecto;
        cambiarUrl(borrador, local, enNube);
        poner(borrador);
      },
      () => subirArchivos(),
    );
  }, [sala, persona, poner]);

  // Cada cambio se guarda también en la tablet, un ratito después para no escribir en cada tecla.
  useEffect(() => {
    if (cargando) return;
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => {
      void guardar(proyecto, clave);
      subirArchivos();
    }, 700);
  }, [proyecto, cargando, clave, subirArchivos]);

  const empezarDeNuevo = useCallback(() => {
    void borrarTodo(clave).then(() => poner(crearProyectoInicial()));
  }, [clave, poner]);

  const actualizar = useCallback(
    (receta: (borrador: Proyecto) => void) => {
      if (sala?.quieta()) return;
      const borrador = structuredClone(actual.current) as Proyecto;
      receta(borrador);
      // Con relato, las secciones del motor salen siempre de las escenas.
      if (borrador.escenas.length > 0) borrador.secciones = escenasASecciones(borrador);
      poner(borrador);
    },
    [poner, sala],
  );

  // Solo en desarrollo: tocar el estado desde la consola para diagnosticar.
  if (import.meta.env.DEV) {
    (globalThis as Record<string, unknown>).__sonoraProyecto = { proyecto, actualizar };
  }

  const valor = useMemo(
    () => ({ proyecto, actualizar, reemplazar: (p: Proyecto) => poner(p), cargando, empezarDeNuevo }),
    [proyecto, actualizar, poner, cargando, empezarDeNuevo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Lo que un tutorial puede hacerle a su proyecto de demostración. */
export interface ApiDemo {
  actualizar: (receta: (borrador: Proyecto) => void) => void;
  proyecto: () => Proyecto;
}

/**
 * El proyecto de un tutorial: vive solo en memoria, no se guarda ni viaja a
 * la sala. Las pantallas de verdad lo leen y lo cambian como si fuera el de
 * siempre, y el guion del tutorial lo maneja por `api`.
 */
export function ProveedorDemo({ inicial, api, children }: { inicial: () => Proyecto; api: { current: ApiDemo | null }; children: ReactNode }) {
  const [proyecto, setProyecto] = useState<Proyecto>(inicial);
  const actual = useRef(proyecto);
  const actualizar = useCallback((receta: (borrador: Proyecto) => void) => {
    const borrador = structuredClone(actual.current) as Proyecto;
    receta(borrador);
    if (borrador.escenas.length > 0) borrador.secciones = escenasASecciones(borrador);
    actual.current = borrador;
    setProyecto(borrador);
  }, []);
  api.current = { actualizar, proyecto: () => actual.current };
  const valor = useMemo(
    () => ({ proyecto, actualizar, reemplazar: () => {}, cargando: false, empezarDeNuevo: () => {} }),
    [proyecto, actualizar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useProyecto(): ContextoProyecto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useProyecto debe usarse dentro de ProveedorProyecto');
  return valor;
}
