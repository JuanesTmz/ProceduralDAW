// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los datos en una carpeta del disco: para desarrollar sin Azure y para el
 * plan C (el servidor en un portátil en el lugar del evento). Mismas
 * funciones que `sql.js`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizarNombre } from '../seguridad.js';

export async function abrirArchivo(carpeta) {
  const ruta = (...partes) => path.join(carpeta, ...partes);

  async function leer(nombre, siNo) {
    try {
      return JSON.parse(await fs.readFile(ruta(nombre), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return siNo;
      throw error;
    }
  }

  // Se escribe a un temporal y se renombra: un corte a mitad no deja el archivo roto.
  async function escribir(nombre, valor) {
    const destino = ruta(nombre);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(`${destino}.tmp`, JSON.stringify(valor, null, 2));
    await fs.rename(`${destino}.tmp`, destino);
  }

  const equipos = () => leer('equipos.json', []);

  return {
    async iniciar() {
      await fs.mkdir(carpeta, { recursive: true });
      // Equipos de antes: su nombre normalizado pasa a ser con lo que se entra.
      const lista = await equipos();
      let cambio = false;
      for (const e of lista) {
        if (e.pinHash && !e.claveHash) {
          e.claveHash = e.pinHash;
          delete e.pinHash;
          cambio = true;
        }
        const normal = normalizarNombre(e.nombre);
        if (e.codigo !== normal) {
          e.codigo = normal;
          cambio = true;
        }
      }
      if (cambio) await escribir('equipos.json', lista);
    },

    async equipoPorNombre(normal) {
      return (await equipos()).find((e) => e.codigo === normal) ?? null;
    },

    async equipoPorId(id) {
      const e = (await equipos()).find((x) => x.id === id);
      return e ? { id: e.id, nombre: e.nombre, codigo: e.codigo, congelado: Boolean(e.congelado) } : null;
    },

    async crearEquipo({ nombre, normal, claveHash }) {
      const lista = await equipos();
      if (lista.some((e) => e.codigo === normal)) throw new Error('Ya existe un equipo con ese nombre.');
      const id = Math.max(0, ...lista.map((e) => e.id)) + 1;
      lista.push({ id, nombre, codigo: normal, claveHash, creado: new Date().toISOString() });
      await escribir('equipos.json', lista);
      return id;
    },

    async actualizarEquipo(id, { nombre = null, normal = null, claveHash = null }) {
      const lista = await equipos();
      const e = lista.find((x) => x.id === id);
      if (!e) return;
      if (nombre) e.nombre = nombre;
      if (normal) e.codigo = normal;
      if (claveHash) e.claveHash = claveHash;
      await escribir('equipos.json', lista);
    },

    async borrarEquipo(id) {
      const archivos = await leer('archivos.json', []);
      const videos = await leer('videos.json', []);
      const rutas = [...archivos, ...videos].filter((a) => a.equipoId === id).map((a) => a.ruta);
      await escribir('archivos.json', archivos.filter((a) => a.equipoId !== id));
      await escribir('videos.json', videos.filter((a) => a.equipoId !== id));
      await escribir('equipos.json', (await equipos()).filter((e) => e.id !== id));
      for (const sobra of [path.join('proyectos', `${id}.json`), path.join('proyectos', `${id}.yjs`), path.join('versiones', String(id))]) {
        await fs.rm(ruta(sobra), { recursive: true, force: true });
      }
      return rutas;
    },

    async listarAdmins() {
      return (await leer('admins.json', [])).map(({ id, nombre, creado }) => ({ id, nombre, creado }));
    },

    async adminPorNombre(normal) {
      return (await leer('admins.json', [])).find((a) => a.normal === normal) ?? null;
    },

    async adminPorId(id) {
      return (await leer('admins.json', [])).find((a) => a.id === id) ?? null;
    },

    async crearAdmin({ nombre, normal, claveHash }) {
      const lista = await leer('admins.json', []);
      if (lista.some((a) => a.normal === normal)) throw new Error('Ya existe un admin con ese nombre.');
      const id = Math.max(0, ...lista.map((a) => a.id)) + 1;
      lista.push({ id, nombre, normal, claveHash, creado: new Date().toISOString() });
      await escribir('admins.json', lista);
      return id;
    },

    async actualizarAdmin(id, { nombre = null, normal = null, claveHash = null }) {
      const lista = await leer('admins.json', []);
      const a = lista.find((x) => x.id === id);
      if (!a) return;
      if (nombre) a.nombre = nombre;
      if (normal) a.normal = normal;
      if (claveHash) a.claveHash = claveHash;
      await escribir('admins.json', lista);
    },

    async borrarAdmin(id) {
      await escribir('admins.json', (await leer('admins.json', [])).filter((a) => a.id !== id));
    },

    async registrarVideo(video) {
      const lista = await leer('videos.json', []);
      lista.push({ ...video, creado: new Date().toISOString() });
      await escribir('videos.json', lista);
    },

    async listarVideos() {
      const nombres = new Map((await equipos()).map((e) => [e.id, e.nombre]));
      return (await leer('videos.json', []))
        .map(({ ruta: _r, ...v }) => ({ ...v, equipo: nombres.get(v.equipoId) ?? '¿?' }))
        .sort((a, b) => b.creado.localeCompare(a.creado));
    },

    async videoPorId(id) {
      return (await leer('videos.json', [])).find((v) => v.id === id) ?? null;
    },

    async borrarVideo(id) {
      const lista = await leer('videos.json', []);
      const video = lista.find((v) => v.id === id);
      if (!video) return null;
      await escribir('videos.json', lista.filter((v) => v.id !== id));
      return video.ruta;
    },

    async listarEquipos() {
      return equipos();
    },

    async congelar(equipoId, valor) {
      const lista = await equipos();
      for (const e of lista) if (equipoId === null || e.id === equipoId) e.congelado = valor;
      await escribir('equipos.json', lista);
    },

    async listarVersiones(equipoId) {
      const dir = ruta('versiones', String(equipoId));
      let nombres = [];
      try {
        nombres = await fs.readdir(dir);
      } catch {
        return [];
      }
      const lista = [];
      for (const nombre of nombres.filter((n) => n.endsWith('.json'))) {
        const fila = JSON.parse(await fs.readFile(path.join(dir, nombre), 'utf8'));
        lista.push({ id: nombre, version: fila.version, motivo: nombre.replace(/^\d+-|\.json$/g, ''), fecha: fila.actualizado });
      }
      return lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    },

    async versionPorId(equipoId, id) {
      if (!/^[\w.-]+$/.test(id)) return null;
      return leer(path.join('versiones', String(equipoId), id), null);
    },

    async cargarProyecto(equipoId) {
      return leer(path.join('proyectos', `${equipoId}.json`), null);
    },

    async cargarSala(equipoId) {
      const fila = await this.cargarProyecto(equipoId);
      let estado = null;
      try {
        estado = await fs.readFile(ruta('proyectos', `${equipoId}.yjs`));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return fila || estado ? { estado, contenido: fila?.contenido ?? null } : null;
    },

    async guardarSala(equipoId, estado, contenido, copia) {
      const actual = await this.cargarProyecto(equipoId);
      const fila = { contenido: contenido ?? '{}', version: (actual?.version ?? 0) + 1, actualizado: new Date().toISOString() };
      await fs.mkdir(ruta('proyectos'), { recursive: true });
      await fs.writeFile(ruta('proyectos', `${equipoId}.yjs.tmp`), estado);
      await fs.rename(ruta('proyectos', `${equipoId}.yjs.tmp`), ruta('proyectos', `${equipoId}.yjs`));
      await escribir(path.join('proyectos', `${equipoId}.json`), fila);
      if (copia) await escribir(path.join('versiones', String(equipoId), `${fila.version}-${copia}.json`), fila);
    },

    async registrarArchivo(archivo) {
      const lista = await leer('archivos.json', []);
      lista.push({ ...archivo, creado: new Date().toISOString() });
      await escribir('archivos.json', lista);
    },

    async archivoPorId(id) {
      return (await leer('archivos.json', [])).find((a) => a.id === id) ?? null;
    },

    async registrar(equipoId, tipo, detalle) {
      const linea = JSON.stringify({ fecha: new Date().toISOString(), equipoId, tipo, detalle });
      await fs.appendFile(ruta('actividad.log'), `${linea}\n`);
    },

    async cerrar() {},
  };
}
