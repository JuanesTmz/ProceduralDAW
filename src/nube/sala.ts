// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La sala en tiempo real del equipo, vista desde una tablet.
 *
 * Cada tablet tiene una copia del proyecto en un documento Yjs conectado al
 * servidor por WebSocket. Lo que cambia aquí se escribe en el documento (solo
 * la diferencia) y viaja a las demás; lo que llega de las demás se arma de
 * nuevo como proyecto y reemplaza el de la pantalla.
 *
 * El documento también se guarda en la tablet (IndexedDB): sin conexión se
 * sigue editando, se puede recargar la página y nada se pierde; al volver la
 * conexión, Yjs junta todo solo.
 */
import { useSyncExternalStore } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as decoding from 'lib0/decoding';
import { IndexeddbPersistence } from 'y-indexeddb';
import { crearConversor, RAIZ } from '../../server/compartido/proyectoYjs.js';
import type { Proyecto } from '../estado/tipos';
import type { Persona } from './contexto';
import { crearBloqueos, type Bloqueos } from './bloqueos';

const conversor = crearConversor(Y);
/** Marca de los cambios hechos en esta tablet, para no volver a aplicarlos. */
const LOCAL = Symbol('local');
/** Cada cuánto, como mucho, se escribe lo propio en el documento (arrastres). */
const CADA_ESCRITURA = 40;
/** Cada cuánto, como mucho, se arma lo que llega de otros. */
const CADA_LECTURA = 30;

export type EstadoConexion = 'conectando' | 'en-vivo' | 'sin-conexion';

/** Lo que el servidor dice de esta sala para esta tablet. */
export interface EstadoSala {
  /** El panel cerró la edición (al final de la hackatón). */
  congelado: boolean;
  /** Es el panel mirando: no se cambia nada. */
  soloLectura: boolean;
}

/** Propio de SONORA: el servidor avisa si la sala está congelada o si solo se mira. */
const ESTADO_SALA = 11;

/** Dónde está cada persona: en qué paso y, dentro de Escenas, qué escena y qué pestaña. */
export interface Lugar {
  paso: string;
  escena?: string | null;
  pestana?: string;
  /** La ventana de edición abierta, si hay (por ejemplo `golpes:<pista>`). */
  ventana?: string | null;
}

export interface Presente {
  id: number;
  nombre: string;
  color: string;
  yo: boolean;
  lugar?: Lugar;
}

/** Un almacén mínimo para que React se entere de cambios fuera de él. */
function almacen<T>(inicial: T) {
  let valor = inicial;
  const oyentes = new Set<() => void>();
  return {
    obtener: () => valor,
    poner(nuevo: T) {
      valor = nuevo;
      for (const o of oyentes) o();
    },
    suscribir(o: () => void) {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
  };
}

export interface Sala {
  /** Se cumple con el proyecto tras la primera sincronía (null si el equipo aún no tiene). */
  listo: Promise<Proyecto | null>;
  /** El proyecto cambió en esta tablet. */
  local(proyecto: Proyecto): void;
  /** Avisa cuando llegan cambios de otras tablets; devuelve cómo dejar de escuchar. */
  alCambiarRemoto(aviso: () => void): () => void;
  /** Escribe lo propio pendiente y arma el proyecto con todo lo que hay. */
  leer(): Proyecto | null;
  cambiarPersona(persona: Persona): void;
  cambiarLugar(lugar: Lugar): void;
  cambiarVentana(ventana: string | null): void;
  estado: ReturnType<typeof almacen<EstadoSala>>;
  /** Si ahora no se puede cambiar nada (congelada o solo mirando). */
  quieta(): boolean;
  bloqueos: Bloqueos;
  conexion: ReturnType<typeof almacen<EstadoConexion>>;
  presentes: ReturnType<typeof almacen<Presente[]>>;
  cerrar(): void;
}

export function abrirSala(persona: Persona, equipoId: number, { ver = false } = {}): Sala {
  const doc = new Y.Doc();
  // La copia de la tablet, una por equipo. El panel, que solo mira, no guarda copia.
  const enTablet = ver ? null : new IndexeddbPersistence(`sonora-sala-${equipoId}`, doc);
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  // La URL queda `/api/sala`: el servidor sabe el equipo por la cookie.
  const proveedor = new WebsocketProvider(`${protocolo}//${location.host}/api`, 'sala', doc, {
    disableBc: true,
    params: ver ? { ver: String(equipoId) } : {},
  });
  const estado = almacen<EstadoSala>({ congelado: false, soloLectura: ver });
  proveedor.messageHandlers[ESTADO_SALA] = (_e, d) => {
    try {
      estado.poner(JSON.parse(decoding.readVarString(d)) as EstadoSala);
    } catch {
      // Un aviso roto no cambia nada.
    }
  };
  const conexion = almacen<EstadoConexion>('conectando');
  const presentes = almacen<Presente[]>([]);

  // Lo último que el documento y la pantalla tienen en común.
  let ultimo: Proyecto | null = null;
  let pendiente: Proyecto | null = null;
  let relojEscritura: number | null = null;
  let relojLectura: number | null = null;
  let abierta = false;
  const avisos = new Set<() => void>();

  function escribir() {
    if (relojEscritura !== null) window.clearTimeout(relojEscritura);
    relojEscritura = null;
    if (!pendiente) return;
    conversor.escribir(doc, ultimo, pendiente, LOCAL);
    ultimo = pendiente;
    pendiente = null;
  }

  doc.on('update', (_cambio: Uint8Array, origen: unknown) => {
    if (origen === LOCAL || !abierta || relojLectura !== null) return;
    relojLectura = window.setTimeout(() => {
      relojLectura = null;
      for (const aviso of avisos) aviso();
    }, CADA_LECTURA);
  });

  // ---------- conexión y presencia ----------

  let sincronizado = false;
  // Al abrir con la copia de la tablet, los primeros segundos cuentan como «conectando».
  let paciencia = true;
  const relojPaciencia = window.setTimeout(() => {
    paciencia = false;
    actualizarConexion();
  }, 6_000);
  const actualizarConexion = () =>
    conexion.poner(
      proveedor.wsconnected && sincronizado ? 'en-vivo' : abierta && !paciencia ? 'sin-conexion' : 'conectando',
    );
  proveedor.on('status', ({ status }: { status: string }) => {
    if (status !== 'connected') sincronizado = false;
    actualizarConexion();
  });
  proveedor.on('sync', (listo: boolean) => {
    sincronizado = listo;
    if (listo) paciencia = false;
    actualizarConexion();
  });

  const quienes = proveedor.awareness;
  // El panel mira sin aparecer entre los presentes.
  if (!ver) quienes.setLocalStateField('persona', persona);
  const leerPresentes = () => {
    const lista: Presente[] = [];
    quienes.getStates().forEach((estado, id) => {
      const p = estado.persona as Persona | undefined;
      // La ventana va aparte del lugar: la anuncia la ventana misma mientras está abierta.
      const lugar = estado.lugar ? { ...(estado.lugar as Lugar), ventana: (estado.ventana as string | null) ?? null } : undefined;
      if (p) lista.push({ id, nombre: p.nombre, color: p.color, yo: id === doc.clientID, lugar });
    });
    presentes.poner(lista.sort((a, b) => Number(b.yo) - Number(a.yo) || a.nombre.localeCompare(b.nombre)));
  };
  quienes.on('change', leerPresentes);
  leerPresentes();

  const bloqueos = crearBloqueos(proveedor, persona);

  // Se abre con lo que llegue primero: el servidor, o la copia de la tablet si
  // tiene algo (sin conexión, o mientras el servidor despierta). Una tablet sin
  // copia espera al servidor, para no crear un proyecto nuevo encima del del equipo.
  const listo = new Promise<Proyecto | null>((cumplir) => {
    const abrir = () => {
      if (abierta) return;
      proveedor.off('sync', alSincronizar);
      ultimo = conversor.leer(doc) as Proyecto | null;
      abierta = true;
      actualizarConexion();
      cumplir(ultimo);
    };
    const alSincronizar = (si: boolean) => si && abrir();
    proveedor.on('sync', alSincronizar);
    void enTablet?.whenSynced.then(() => {
      if (doc.getMap(RAIZ).size > 0) abrir();
    });
  });

  // Al cambiar de app o apagar la pantalla, lo pendiente sale ya.
  const alOcultar = () => document.visibilityState === 'hidden' && escribir();
  document.addEventListener('visibilitychange', alOcultar);

  return {
    listo,
    local(proyecto) {
      if (proyecto === ultimo) return;
      pendiente = proyecto;
      relojEscritura ??= window.setTimeout(escribir, CADA_ESCRITURA);
    },
    alCambiarRemoto(aviso) {
      avisos.add(aviso);
      return () => avisos.delete(aviso);
    },
    leer() {
      escribir();
      ultimo = conversor.leer(doc) as Proyecto | null;
      return ultimo;
    },
    cambiarPersona(p) {
      quienes.setLocalStateField('persona', p);
      bloqueos.cambiarPersona(p);
    },
    cambiarLugar(lugar) {
      quienes.setLocalStateField('lugar', lugar);
    },
    cambiarVentana(ventana) {
      quienes.setLocalStateField('ventana', ventana);
    },
    bloqueos,
    estado,
    quieta: () => estado.obtener().congelado || estado.obtener().soloLectura,
    conexion,
    presentes,
    cerrar() {
      escribir();
      document.removeEventListener('visibilitychange', alOcultar);
      window.clearTimeout(relojPaciencia);
      bloqueos.cerrar();
      proveedor.destroy();
      void enTablet?.destroy();
      doc.destroy();
    },
  };
}

export function useConexion(sala: Sala): EstadoConexion {
  return useSyncExternalStore(sala.conexion.suscribir, sala.conexion.obtener);
}

export function useEstadoSala(sala: Sala): EstadoSala {
  return useSyncExternalStore(sala.estado.suscribir, sala.estado.obtener);
}

export function usePresentes(sala: Sala): Presente[] {
  return useSyncExternalStore(sala.presentes.suscribir, sala.presentes.obtener);
}
