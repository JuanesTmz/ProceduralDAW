// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El service worker de SONORA en la nube: deja la app guardada en la tablet
 * para que abra sin internet (plan de emergencia).
 *
 * - Al instalarse guarda la app entera y la Sonoteca (la lista la escribe el
 *   build: ver `vite.config.ts`).
 * - La página se pide primero a la red y, sin red, sale de lo guardado.
 * - Los archivos del equipo (`/api/archivos/…`) nunca cambian: el primero que
 *   se baja queda guardado y después sale de ahí.
 * - El resto de la API va siempre a la red.
 */
const VERSION = '__VERSION__';
const PRECARGA = self.__PRECARGA__ ?? [];
const APP = `sonora-app-${VERSION}`;
const ARCHIVOS = 'sonora-archivos';

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches
      .open(APP)
      .then((c) => c.addAll(PRECARGA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('sonora-app-') && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function primeroGuardado(pedido, cache) {
  const guardado = await caches.match(pedido, { ignoreSearch: true });
  if (guardado) return guardado;
  const respuesta = await fetch(pedido);
  if (respuesta.ok && respuesta.status === 200) {
    const copia = respuesta.clone();
    void caches.open(cache).then((c) => c.put(pedido, copia));
  }
  return respuesta;
}

async function primeroRed(pedido) {
  try {
    const respuesta = await fetch(pedido);
    if (respuesta.ok) {
      const copia = respuesta.clone();
      void caches.open(APP).then((c) => c.put('/', copia));
    }
    return respuesta;
  } catch {
    return (await caches.match('/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (ev) => {
  const pedido = ev.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/archivos/')) {
    // Un pedazo (para adelantar) va a la red; sin red, el archivo entero si está guardado.
    if (pedido.headers.has('range')) {
      ev.respondWith(fetch(pedido).catch(() => caches.match(url.pathname).then((r) => r ?? Response.error())));
    } else {
      ev.respondWith(primeroGuardado(new Request(url.pathname), ARCHIVOS));
    }
    return;
  }
  if (url.pathname.startsWith('/api/')) return;
  if (pedido.mode === 'navigate') {
    ev.respondWith(primeroRed(pedido));
    return;
  }
  ev.respondWith(primeroGuardado(pedido, APP));
});
