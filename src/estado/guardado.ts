/**
 * Guardar la pieza en el propio navegador, para que recargar no la borre.
 *
 * El proyecto es JSON y va a localStorage. Lo que no cabe ahí son los
 * archivos —las voces grabadas, las fotos, los sonidos propios—, que viven
 * como URLs «blob:» que mueren al cerrar la pestaña. Por eso cada archivo
 * que entra a la app pasa por `crearUrl`, que lo anota; al guardar, los que
 * el proyecto usa se copian a IndexedDB, y al volver se recrean con URLs
 * nuevas y se reemplazan en el JSON.
 */
import type { Proyecto } from './tipos';

const CLAVE = 'sonora-narrativa';
const BASE = 'sonora-archivos';
const ALMACEN = 'archivos';

const archivos = new Map<string, Blob>();
const yaGuardados = new Set<string>();

/** Crea la URL de un archivo y la anota para poder guardarlo después. */
export function crearUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  archivos.set(url, blob);
  return url;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((listo, falla) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => listo(pedido.result);
    pedido.onerror = () => falla(pedido.error);
  });
}

async function conAlmacen<T>(modo: IDBTransactionMode, hacer: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((listo, falla) => {
    const pedido = hacer(db.transaction(ALMACEN, modo).objectStore(ALMACEN));
    pedido.onsuccess = () => listo(pedido.result);
    pedido.onerror = () => falla(pedido.error);
  });
}

/** Guarda el proyecto y los archivos que usa. */
export async function guardar(proyecto: Proyecto): Promise<void> {
  const texto = JSON.stringify(proyecto);
  try {
    localStorage.setItem(CLAVE, texto);
  } catch {
    return;
  }
  for (const [url, blob] of archivos) {
    if (yaGuardados.has(url) || !texto.includes(url)) continue;
    try {
      await conAlmacen('readwrite', (a) => a.put(blob, url));
      yaGuardados.add(url);
    } catch {
      // Sin espacio: el proyecto queda guardado igual, sin ese archivo.
    }
  }
}

/** Recupera la última pieza, con sus archivos. null si no había nada. */
export async function cargar(): Promise<Proyecto | null> {
  let texto: string | null = null;
  try {
    texto = localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
  if (!texto) return null;
  try {
    const claves = (await conAlmacen('readonly', (a) => a.getAllKeys())) as string[];
    for (const vieja of claves) {
      if (!texto.includes(vieja)) continue;
      const blob = (await conAlmacen('readonly', (a) => a.get(vieja))) as Blob | undefined;
      if (!blob) continue;
      const nueva = crearUrl(blob);
      yaGuardados.add(nueva);
      // La URL vieja ya no existe; se guarda el archivo con la nueva.
      void conAlmacen('readwrite', (a) => a.put(blob, nueva));
      void conAlmacen('readwrite', (a) => a.delete(vieja));
      texto = texto.split(vieja).join(nueva);
    }
  } catch {
    // Sin IndexedDB se recupera el texto; las grabaciones habrá que repetirlas.
  }
  return JSON.parse(texto) as Proyecto;
}

/** Borra todo: la pieza y sus archivos. */
export async function borrarTodo(): Promise<void> {
  try {
    localStorage.removeItem(CLAVE);
    await conAlmacen('readwrite', (a) => a.clear());
  } catch {
    // Nada que hacer.
  }
  yaGuardados.clear();
}
