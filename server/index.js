// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * SONORA en la nube: un solo servidor Node que sirve la app compilada
 * (`npm run build:nube`) y la API de los equipos.
 *
 * Cada equipo entra con su nombre y su contraseña; con el nombre «Admin» y la
 * contraseña del panel se entra al panel de administración. El proyecto de
 * cada equipo vive en una sala en tiempo real (`salas.js`, WebSocket en
 * /api/sala): lo que cambia una tablet se ve al instante en las demás.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { abrirArchivos } from './archivos.js';
import { abrirDatos } from './datos/index.js';
import { crearSalas } from './salas.js';
import { COOKIE_ADMIN, adminVigente, crearAdmin, esAdmin, rankingActual, rankingPublico } from './admin.js';
import {
  COOKIE,
  DURACION_SESION,
  NOMBRE_ADMIN,
  claveCorrecta,
  crearLimite,
  crearSesiones,
  leerCookie,
  normalizarNombre,
} from './seguridad.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT ?? 3000);
const APP = process.env.SONORA_APP ?? path.join(aqui, '..', 'dist-nube');

const secreto = process.env.SESION_SECRETO;
if (!secreto) console.warn('Sin SESION_SECRETO: las sesiones se pierden al reiniciar el servidor.');
const sesiones = crearSesiones(secreto ?? crypto.randomBytes(32).toString('hex'));
const limite = crearLimite();
const datos = await abrirDatos();
const salas = crearSalas(datos);
const almacen = await abrirArchivos();

const app = express();
// Container Apps pone un proxy delante: la IP real viene en X-Forwarded-For.
app.set('trust proxy', 1);
// La firma va en cada respuesta, sin mostrarse en la app.
app.use((_req, res, siguiente) => {
  res.set('X-Hecho-Por', 'Juan Esteban Trillos - www.linkedin.com/in/juan-esteban-trillos');
  siguiente();
});
app.use(express.json({ limit: '15mb' }));

const enProduccion = process.env.NODE_ENV === 'production';
const opcionesCookie = { httpOnly: true, secure: enProduccion, sameSite: 'lax', path: '/' };

/** Deja pasar solo con sesión de equipo; deja el id en req.equipoId. */
function conEquipo(req, res, siguiente) {
  const id = sesiones.leer(leerCookie(req, COOKIE));
  if (typeof id !== 'number') return res.status(401).json({ error: 'Entra con el nombre de tu equipo.' });
  req.equipoId = id;
  siguiente();
}

/** Un archivo lo abre su equipo; el panel, cualquiera (para ver y descargar). */
function conEquipoOPanel(req, res, siguiente) {
  if (esAdmin(req, sesiones)) {
    req.esAdmin = true;
    return siguiente();
  }
  conEquipo(req, res, siguiente);
}

const registrar = (...args) => datos.registrar(...args).catch((e) => console.error('actividad:', e.message));

app.get('/api/salud', (_req, res) => res.json({ ok: true }));

// ---------- entrar: un equipo, o el panel con el nombre «Admin» ----------

app.post('/api/entrar', async (req, res) => {
  const normal = normalizarNombre(req.body?.equipo);
  const clave = String(req.body?.clave ?? '');
  const llave = `${req.ip}|${normal}`;
  if (limite.bloqueado(llave)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' });
  }
  const fallar = (equipoId) => {
    limite.fallo(llave);
    void registrar(equipoId ?? null, 'entrada-fallida', `${normal} desde ${req.ip}`);
    res.status(401).json({ error: 'El nombre del equipo o la contraseña no coinciden.' });
  };

  /** Al panel: con «admin» (la cuenta maestra, ADMIN_CLAVE) o con una cuenta de admin de la base. */
  const alPanel = (sesion, nombre) => {
    limite.limpiar(llave);
    res.cookie(COOKIE_ADMIN, sesiones.emitir(sesion), { ...opcionesCookie, maxAge: DURACION_SESION });
    res.clearCookie(COOKIE, opcionesCookie);
    void registrar(null, 'admin-entrada', `${nombre} desde ${req.ip}`);
    res.json({ admin: true, nombre });
  };
  if (normal === NOMBRE_ADMIN) {
    const delPanel = process.env.ADMIN_CLAVE;
    const igual = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());
    if (!delPanel || !igual(clave, delPanel)) return fallar(null);
    return alPanel('admin', 'Admin');
  }
  const cuenta = normal && clave ? await datos.adminPorNombre(normal) : null;
  if (cuenta) {
    if (!claveCorrecta(clave, cuenta.claveHash)) return fallar(null);
    return alPanel(`admin:${cuenta.id}`, cuenta.nombre);
  }

  const equipo = normal && clave ? await datos.equipoPorNombre(normal) : null;
  if (!equipo || !claveCorrecta(clave, equipo.claveHash)) return fallar(equipo?.id);
  limite.limpiar(llave);
  res.cookie(COOKIE, sesiones.emitir(equipo.id), { ...opcionesCookie, maxAge: DURACION_SESION });
  res.clearCookie(COOKIE_ADMIN, opcionesCookie);
  void registrar(equipo.id, 'entrada', req.ip);
  res.json({ equipo: { id: equipo.id, nombre: equipo.nombre } });
});

/**
 * El ranking, para la pantalla de entrada: solo cuando los admins lo abren.
 * Sale el puesto, el equipo y los puntos; los comentarios de los jurados no.
 */
app.get('/api/ranking', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!(await rankingPublico(datos))) return res.json({ activo: false });
  const ranking = (await rankingActual(datos)).map(({ puesto, nombre, total, criterios }) => ({ puesto, nombre, total, criterios }));
  res.json({ activo: true, ranking });
});

app.post('/api/salir', (_req, res) => {
  res.clearCookie(COOKIE, opcionesCookie);
  res.clearCookie(COOKIE_ADMIN, opcionesCookie);
  res.json({ ok: true });
});

/** Con quién está esta tablet: un equipo, o el panel. */
app.get('/api/sesion', async (req, res) => {
  if (esAdmin(req, sesiones)) {
    const quien = await adminVigente(req, sesiones, datos);
    if (quien) return res.json({ admin: true, nombre: quien.nombre });
  }
  const id = sesiones.leer(leerCookie(req, COOKIE));
  const equipo = typeof id === 'number' ? await datos.equipoPorId(id) : null;
  if (!equipo) return res.status(401).json({ error: 'Entra con el nombre de tu equipo.' });
  res.json({ equipo: { id: equipo.id, nombre: equipo.nombre } });
});

app.get('/api/proyecto', conEquipo, async (req, res) => {
  const fila = await datos.cargarProyecto(req.equipoId);
  res.json(fila ? { proyecto: JSON.parse(fila.contenido), version: fila.version } : { proyecto: null, version: 0 });
});

// ---------- archivos y videos ----------

/** El nombre viene codificado: los encabezados no aceptan cualquier letra. */
function leerPersona(valor) {
  try {
    return decodeURIComponent(String(valor ?? '')).slice(0, 40) || null;
  } catch {
    return null;
  }
}

/**
 * Recibe el cuerpo de la petición como archivo y lo guarda en el almacén.
 * Devuelve lo que hay que anotar en la base, o null si ya respondió un error.
 */
async function recibirArchivo(req, res, { tipos, maximo, carpeta }) {
  const tipo = String(req.headers['content-type'] ?? '').split(';')[0].trim() || 'application/octet-stream';
  const largo = Number(req.headers['content-length']);
  if (!tipos.test(tipo)) return void res.status(415).json({ error: 'Ese tipo de archivo no se puede subir.' });
  if (!largo || largo > maximo) return void res.status(413).json({ error: 'El archivo es demasiado grande.' });
  const id = crypto.randomUUID();
  const ruta = `equipo-${req.equipoId}/${carpeta}${id}`;
  // Se cuenta lo que entra, por si el tamaño anunciado no era cierto.
  let bytes = 0;
  const medido = new Transform({
    transform(trozo, _cod, listo) {
      bytes += trozo.length;
      listo(bytes > maximo ? new Error('Archivo demasiado grande') : null, trozo);
    },
  });
  await almacen.guardar(ruta, req.pipe(medido), tipo);
  return { id, equipoId: req.equipoId, ruta, tipo, bytes, persona: leerPersona(req.headers['x-sonora-persona']) };
}

/** Manda un archivo del almacén; acepta pedidos por pedazos (para adelantar un audio o un video). */
async function servirArchivo(req, res, ficha, cache) {
  res.set({ 'Content-Type': ficha.tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': cache });
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  let desde = 0;
  let hasta = ficha.bytes - 1;
  if (rango && ficha.bytes > 0) {
    desde = rango[1] ? Number(rango[1]) : Math.max(0, ficha.bytes - Number(rango[2]));
    hasta = rango[1] && rango[2] ? Math.min(Number(rango[2]), ficha.bytes - 1) : ficha.bytes - 1;
    if (desde > hasta) return res.status(416).set('Content-Range', `bytes */${ficha.bytes}`).end();
    res.status(206).set('Content-Range', `bytes ${desde}-${hasta}/${ficha.bytes}`);
  }
  if (req.query.descargar) res.attachment(String(req.query.descargar));
  res.set('Content-Length', String(hasta - desde + 1));
  if (ficha.bytes === 0) return res.end();
  await pipeline(await almacen.leer(ficha.ruta, desde, hasta - desde + 1), res);
}

/** Voces, fotos y sonidos: lo que una tablet puede subir. */
const TIPOS_ARCHIVO = /^(audio|image|video)\/|^text\/csv$|^application\/octet-stream$/;
/** Qué equipo tiene cada archivo ya consultado: así cada reproducción no pasa por la base. */
const fichas = new Map();

app.post('/api/archivos', conEquipo, async (req, res) => {
  const archivo = await recibirArchivo(req, res, { tipos: TIPOS_ARCHIVO, maximo: 60 * 1024 * 1024, carpeta: '' });
  if (!archivo) return;
  await datos.registrarArchivo(archivo);
  fichas.set(archivo.id, archivo);
  res.status(201).json({ url: `/api/archivos/${archivo.id}` });
});

app.get('/api/archivos/:id', conEquipoOPanel, async (req, res) => {
  const id = req.params.id;
  let ficha = fichas.get(id);
  if (!ficha && /^[0-9a-f-]{36}$/.test(id)) {
    ficha = await datos.archivoPorId(id);
    if (ficha) fichas.set(id, ficha);
  }
  if (!ficha || (!req.esAdmin && ficha.equipoId !== req.equipoId)) return res.status(404).json({ error: 'No existe.' });
  // Un archivo nunca cambia: la tablet lo guarda en su caché para siempre.
  await servirArchivo(req, res, ficha, 'private, max-age=31536000, immutable');
});

/** El video final que el equipo manda a la galería desde Función (una pieza de 2:30 a 5 Mbps son ~100 MB). */
app.post('/api/videos', conEquipo, async (req, res) => {
  const video = await recibirArchivo(req, res, { tipos: /^video\//, maximo: 400 * 1024 * 1024, carpeta: 'videos/' });
  if (!video) return;
  await datos.registrarVideo(video);
  void registrar(req.equipoId, 'video-enviado', `${(video.bytes / 1024 / 1024).toFixed(1)} MB${video.persona ? ` por ${video.persona}` : ''}`);
  res.status(201).json({ id: video.id });
});

app.get('/api/videos/:id', conEquipoOPanel, async (req, res) => {
  const ficha = /^[0-9a-f-]{36}$/.test(req.params.id) ? await datos.videoPorId(req.params.id) : null;
  if (!ficha || (!req.esAdmin && ficha.equipoId !== req.equipoId)) return res.status(404).json({ error: 'No existe.' });
  await servirArchivo(req, res, ficha, 'private, max-age=3600');
});

app.use('/api/admin', crearAdmin({ datos, salas, almacen, sesiones, registrar }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'No existe.' }));
// Cualquier error de la API responde JSON, no una página.
app.use('/api', (error, _req, res, _siguiente) => {
  console.error(error);
  // Si ya se estaba mandando un archivo, solo queda cortar.
  if (res.headersSent) return res.destroy();
  res.status(500).json({ error: 'Algo falló en el servidor. Prueba otra vez.' });
});

// La app: los archivos con hash en el nombre se guardan para siempre; index.html, nunca.
app.use('/assets', express.static(path.join(APP, 'assets'), { immutable: true, maxAge: '1y' }));
// El service worker se revisa siempre: así una versión nueva llega a las tablets.
app.get('/sw.js', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(APP, 'sw.js'));
});
app.use(express.static(APP, { index: false, maxAge: '1h' }));
app.get('/{*ruta}', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(APP, 'index.html'));
});

// Con certificado (plan C, en un portátil) se sirve por HTTPS: sin él, las tablets no dejan grabar.
const servidor = process.env.HTTPS_CERT
  ? https
      .createServer({ cert: fs.readFileSync(process.env.HTTPS_CERT), key: fs.readFileSync(process.env.HTTPS_KEY) }, app)
      .listen(PUERTO, () => console.log(`SONORA escuchando en https://localhost:${PUERTO}`))
  : app.listen(PUERTO, () => console.log(`SONORA escuchando en http://localhost:${PUERTO}`));
console.log('SONORA · Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos');

// La sala en tiempo real: solo con sesión de equipo y desde la propia página.
servidor.on('upgrade', (req, socket, cabeza) => {
  const rechazar = (estado) => {
    socket.write(`HTTP/1.1 ${estado}\r\n\r\n`);
    socket.destroy();
  };
  if (!req.url?.startsWith('/api/sala')) return rechazar('404 Not Found');
  const origen = req.headers.origin;
  if (enProduccion && (!origen || new URL(origen).host !== req.headers.host)) return rechazar('403 Forbidden');
  // El panel entra a mirar cualquier sala: /api/sala?ver=<equipo>.
  const ver = Number(new URL(req.url, 'http://x').searchParams.get('ver'));
  if (ver) {
    if (!esAdmin(req, sesiones)) return rechazar('401 Unauthorized');
    return salas.entrar(req, socket, cabeza, ver, true);
  }
  const equipoId = sesiones.leer(leerCookie(req, COOKIE));
  if (typeof equipoId !== 'number') return rechazar('401 Unauthorized');
  salas.entrar(req, socket, cabeza, equipoId);
});

for (const senal of ['SIGTERM', 'SIGINT']) {
  process.on(senal, () => {
    // Antes de apagar se guardan las salas abiertas.
    servidor.close();
    void salas
      .cerrar()
      .then(() => datos.cerrar())
      .finally(() => process.exit(0));
  });
}
