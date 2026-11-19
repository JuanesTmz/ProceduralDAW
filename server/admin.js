// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El panel de administración: la API que usa la app cuando se entra con el
 * nombre «Admin» y la contraseña del panel (ADMIN_CLAVE).
 *
 * Desde aquí se crean, editan y borran equipos, se ve quién está conectado y
 * dónde, se cierra y abre la edición, se guardan y restauran versiones, se
 * sueltan bloqueos atascados y se ve la galería de videos finales.
 */
import express from 'express';
import { NOMBRE_ADMIN, claveValida, hashClave, leerCookie, normalizarNombre } from './seguridad.js';
import { armarRanking, limpiarNotas } from './compartido/rubrica.js';

export const COOKIE_ADMIN = 'sonora_admin';

/**
 * Si la petición viene del panel (rápido, sin la base: para archivos y salas).
 * La sesión es «admin» (la cuenta maestra) o «admin:<id>» (una cuenta de la base).
 */
export function esAdmin(req, sesiones) {
  const s = sesiones.leer(leerCookie(req, COOKIE_ADMIN));
  return typeof s === 'string' && (s === 'admin' || s.startsWith('admin:'));
}

/** Quién es el admin de esta sesión, revisando que su cuenta siga existiendo; null si no. */
export async function adminVigente(req, sesiones, datos) {
  const s = sesiones.leer(leerCookie(req, COOKIE_ADMIN));
  if (s === 'admin') return { id: null, nombre: 'Admin' };
  if (typeof s !== 'string' || !s.startsWith('admin:')) return null;
  return datos.adminPorId(Number(s.slice(6)));
}

/** El nombre como se muestra: sin espacios de más, pero con sus mayúsculas y tildes. */
const limpiarNombre = (nombre) => String(nombre ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);

/** Con qué se reconoce a cada jurado en sus calificaciones: «admin» (la maestra) o «admin:<id>». */
const juezDe = (admin) => (admin.id === null ? 'admin' : `admin:${admin.id}`);

/** Si el ranking se ve desde la entrada (lo deciden los admins). */
export const AJUSTE_RANKING = 'ranking-publico';
export async function rankingPublico(datos) {
  return (await datos.leerAjuste(AJUSTE_RANKING)) === 'si';
}

/** El ranking con los equipos que existen hoy. */
export async function rankingActual(datos) {
  const [equipos, calificaciones] = await Promise.all([datos.listarEquipos(), datos.listarCalificaciones()]);
  return armarRanking(equipos, calificaciones);
}

export function crearAdmin({ datos, salas, almacen, sesiones, registrar }) {
  const rutas = express.Router();
  rutas.use(async (req, res, siguiente) => {
    req.admin = await adminVigente(req, sesiones, datos);
    if (!req.admin) return res.status(401).json({ error: 'Entra como Admin.' });
    siguiente();
  });
  const idDe = (req) => Number(req.params.id);

  /**
   * Revisa un nombre nuevo: que no esté vacío, que no sea «Admin» y que nadie
   * más lo tenga (ni equipo ni admin: se entra con el nombre, no puede repetirse).
   * `yo` es quien se está renombrando, para no chocar consigo mismo.
   */
  async function nombreLibre(nombre, yo = {}) {
    const normal = normalizarNombre(nombre);
    if (!normal) return { error: 'Falta el nombre.' };
    if (normal === NOMBRE_ADMIN) return { error: '«Admin» está reservado para la cuenta maestra del panel.' };
    const equipo = await datos.equipoPorNombre(normal);
    if (equipo && equipo.id !== yo.equipo) return { error: `Ya existe el equipo «${equipo.nombre}».` };
    const admin = await datos.adminPorNombre(normal);
    if (admin && admin.id !== yo.admin) return { error: `Ya existe el admin «${admin.nombre}».` };
    return { normal };
  }

  /** Todo lo que el panel muestra, de una vez: equipos, admins, salas en vivo y galería. */
  rutas.get('/estado', async (req, res) => {
    const [equipos, videos, admins] = await Promise.all([datos.listarEquipos(), datos.listarVideos(), datos.listarAdmins()]);
    res.json({
      yo: req.admin,
      admins,
      equipos: equipos.map((e) => ({ id: e.id, nombre: e.nombre, congelado: Boolean(e.congelado), creado: e.creado })),
      salas: salas.resumen(),
      videos,
    });
  });

  rutas.post('/equipos', async (req, res) => {
    const nombre = limpiarNombre(req.body?.nombre);
    const clave = String(req.body?.clave ?? '');
    const revisado = await nombreLibre(nombre);
    if (revisado.error) return res.status(400).json({ error: revisado.error });
    if (!claveValida(clave)) return res.status(400).json({ error: 'La contraseña debe tener de 4 a 64 caracteres.' });
    const id = await datos.crearEquipo({ nombre, normal: revisado.normal, claveHash: hashClave(clave) });
    void registrar(id, 'equipo-creado', nombre);
    res.status(201).json({ id });
  });

  /** Cambia el nombre, la contraseña o las dos. */
  rutas.put('/equipos/:id', async (req, res) => {
    const id = idDe(req);
    const actual = await datos.equipoPorId(id);
    if (!actual) return res.status(404).json({ error: 'Ese equipo ya no existe.' });
    const cambios = {};
    const nombre = limpiarNombre(req.body?.nombre);
    if (nombre && nombre !== actual.nombre) {
      const revisado = await nombreLibre(nombre, { equipo: id });
      if (revisado.error) return res.status(400).json({ error: revisado.error });
      Object.assign(cambios, { nombre, normal: revisado.normal });
    }
    const clave = String(req.body?.clave ?? '');
    if (clave) {
      if (!claveValida(clave)) return res.status(400).json({ error: 'La contraseña debe tener de 4 a 64 caracteres.' });
      cambios.claveHash = hashClave(clave);
    }
    await datos.actualizarEquipo(id, cambios);
    void registrar(id, 'equipo-cambiado', [cambios.nombre && `nombre: ${cambios.nombre}`, cambios.claveHash && 'contraseña nueva'].filter(Boolean).join(', '));
    res.json({ ok: true });
  });

  /** Borra el equipo con su proyecto, sus versiones, sus archivos y sus videos. */
  rutas.delete('/equipos/:id', async (req, res) => {
    const id = idDe(req);
    const equipo = await datos.equipoPorId(id);
    if (!equipo) return res.status(404).json({ error: 'Ese equipo ya no existe.' });
    salas.expulsar(id);
    const restos = await datos.borrarEquipo(id);
    for (const ruta of restos) await almacen.borrar(ruta).catch((e) => console.error('No se pudo borrar', ruta, e.message));
    void registrar(null, 'equipo-borrado', `${equipo.nombre} (id ${id}, ${restos.length} archivo(s))`);
    res.json({ ok: true });
  });

  rutas.post('/congelar', async (req, res) => {
    const valor = Boolean(req.body?.valor);
    await datos.congelar(null, valor);
    for (const e of await datos.listarEquipos()) salas.congelar(e.id, valor);
    void registrar(null, valor ? 'congelar-todo' : 'descongelar-todo', null);
    res.json({ ok: true });
  });

  rutas.post('/equipos/:id/congelar', async (req, res) => {
    const valor = Boolean(req.body?.valor);
    await datos.congelar(idDe(req), valor);
    salas.congelar(idDe(req), valor);
    void registrar(idDe(req), valor ? 'congelar' : 'descongelar', null);
    res.json({ ok: true });
  });

  rutas.get('/equipos/:id/proyecto', async (req, res) => {
    const enVivo = salas.proyecto(idDe(req));
    if (enVivo) return res.json({ proyecto: enVivo });
    const fila = await datos.cargarProyecto(idDe(req));
    res.json({ proyecto: fila ? JSON.parse(fila.contenido) : null });
  });

  rutas.get('/equipos/:id/versiones', async (req, res) => {
    res.json({ versiones: await datos.listarVersiones(idDe(req)) });
  });

  rutas.post('/equipos/:id/versiones', async (req, res) => {
    await salas.guardarVersion(idDe(req), 'panel');
    res.json({ ok: true });
  });

  rutas.post('/equipos/:id/restaurar', async (req, res) => {
    const version = await datos.versionPorId(idDe(req), String(req.body?.version ?? ''));
    if (!version?.contenido) return res.status(404).json({ error: 'Esa versión no existe.' });
    await salas.restaurar(idDe(req), version.contenido);
    void registrar(idDe(req), 'restaurar', String(req.body.version));
    res.json({ ok: true });
  });

  rutas.post('/equipos/:id/soltar', (req, res) => {
    const ok = salas.soltarBloqueo(idDe(req), String(req.body?.clave ?? ''));
    if (ok) void registrar(idDe(req), 'soltar-bloqueo', String(req.body.clave));
    res.json({ ok });
  });

  // ---------- cuentas del panel ----------

  rutas.post('/admins', async (req, res) => {
    const nombre = limpiarNombre(req.body?.nombre);
    const clave = String(req.body?.clave ?? '');
    const revisado = await nombreLibre(nombre);
    if (revisado.error) return res.status(400).json({ error: revisado.error });
    if (!claveValida(clave)) return res.status(400).json({ error: 'La contraseña debe tener de 4 a 64 caracteres.' });
    const id = await datos.crearAdmin({ nombre, normal: revisado.normal, claveHash: hashClave(clave) });
    void registrar(null, 'admin-creado', `${nombre} (por ${req.admin.nombre})`);
    res.status(201).json({ id });
  });

  rutas.put('/admins/:id', async (req, res) => {
    const id = idDe(req);
    const actual = await datos.adminPorId(id);
    if (!actual) return res.status(404).json({ error: 'Ese admin ya no existe.' });
    const cambios = {};
    const nombre = limpiarNombre(req.body?.nombre);
    if (nombre && nombre !== actual.nombre) {
      const revisado = await nombreLibre(nombre, { admin: id });
      if (revisado.error) return res.status(400).json({ error: revisado.error });
      Object.assign(cambios, { nombre, normal: revisado.normal });
    }
    const clave = String(req.body?.clave ?? '');
    if (clave) {
      if (!claveValida(clave)) return res.status(400).json({ error: 'La contraseña debe tener de 4 a 64 caracteres.' });
      cambios.claveHash = hashClave(clave);
    }
    await datos.actualizarAdmin(id, cambios);
    void registrar(null, 'admin-cambiado', `${actual.nombre} (por ${req.admin.nombre})`);
    res.json({ ok: true });
  });

  /** Borra una cuenta de admin. La maestra («Admin») no está en la base: no se puede borrar. */
  rutas.delete('/admins/:id', async (req, res) => {
    const id = idDe(req);
    const actual = await datos.adminPorId(id);
    if (!actual) return res.status(404).json({ error: 'Ese admin ya no existe.' });
    await datos.borrarAdmin(id);
    void registrar(null, 'admin-borrado', `${actual.nombre} (por ${req.admin.nombre})`);
    res.json({ ok: true, eraYo: req.admin.id === id });
  });

  // ---------- calificar ----------

  /** Todas las calificaciones, el ranking y si está a la vista. */
  rutas.get('/calificaciones', async (req, res) => {
    const [calificaciones, ranking, publico] = await Promise.all([
      datos.listarCalificaciones(),
      rankingActual(datos),
      rankingPublico(datos),
    ]);
    res.json({ yo: juezDe(req.admin), calificaciones, ranking, publico });
  });

  /** Guarda la calificación de este admin a un equipo (se reemplaza cada vez). */
  rutas.put('/equipos/:id/calificacion', async (req, res) => {
    const id = idDe(req);
    if (!(await datos.equipoPorId(id))) return res.status(404).json({ error: 'Ese equipo ya no existe.' });
    await datos.guardarCalificacion({
      equipoId: id,
      juez: juezDe(req.admin),
      juezNombre: req.admin.nombre,
      notas: limpiarNotas(req.body?.notas),
      comentario: String(req.body?.comentario ?? '').slice(0, 2000),
    });
    res.json({ ok: true });
  });

  rutas.post('/ranking', async (req, res) => {
    const valor = Boolean(req.body?.publico);
    await datos.guardarAjuste(AJUSTE_RANKING, valor ? 'si' : 'no');
    void registrar(null, valor ? 'ranking-abierto' : 'ranking-cerrado', req.admin.nombre);
    res.json({ ok: true });
  });

  rutas.delete('/videos/:id', async (req, res) => {
    const ruta = await datos.borrarVideo(String(req.params.id));
    if (!ruta) return res.status(404).json({ error: 'Ese video ya no existe.' });
    await almacen.borrar(ruta).catch((e) => console.error('No se pudo borrar', ruta, e.message));
    void registrar(null, 'video-borrado', String(req.params.id));
    res.json({ ok: true });
  });

  return rutas;
}
