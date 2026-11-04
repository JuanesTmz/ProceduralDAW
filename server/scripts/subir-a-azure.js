// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Plan C, después: devuelve a Azure lo que se hizo en el portátil. No pisa:
 * junta cada proyecto del portátil con el de Azure (son documentos Yjs, así
 * que se suman los cambios de los dos lados) y sube los archivos que Azure
 * aún no tiene.
 *
 *   SQL_SERVIDOR=... SQL_BASE=... BLOB_CUENTA=... npm --prefix server run subir-a-azure
 *
 * Correrlo cuando ninguna tablet esté conectada a Azure: una sala abierta en
 * la nube guardaría encima su propia versión. Si hace falta, reiniciar la app
 * en Azure después de correrlo.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Y from 'yjs';
import { abrirSql } from '../datos/sql.js';
import { abrirArchivos } from '../archivos.js';
import { crearConversor } from '../compartido/proyectoYjs.js';

const conversor = crearConversor(Y);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.join(aqui, '..', '.datos');
if (!process.env.SQL_SERVIDOR || !process.env.SQL_BASE || !process.env.BLOB_CUENTA) {
  console.error('Faltan SQL_SERVIDOR, SQL_BASE o BLOB_CUENTA (ver server/README.md).');
  process.exit(1);
}
const leer = async (nombre, siNo) => {
  try {
    return JSON.parse(await fsp.readFile(path.join(carpeta, nombre), 'utf8'));
  } catch {
    return siNo;
  }
};

const sql = await abrirSql({ servidor: process.env.SQL_SERVIDOR, base: process.env.SQL_BASE });
const almacen = await abrirArchivos();

// Cada equipo del portátil con el suyo en Azure (por nombre); si no existe, se crea.
const enAzure = await sql.listarEquipos();
const idEnAzure = new Map();
for (const e of await leer('equipos.json', [])) {
  let destino = enAzure.find((x) => x.codigo === e.codigo);
  if (!destino) {
    const id = await sql.crearEquipo({ nombre: e.nombre, normal: e.codigo, claveHash: e.claveHash ?? e.pinHash });
    destino = { id };
    console.log(`Equipo nuevo en Azure: ${e.nombre}.`);
  }
  idEnAzure.set(e.id, destino.id);
}

// Los archivos que Azure no tiene.
let subidos = 0;
for (const a of await leer('archivos.json', [])) {
  if (await sql.archivoPorId(a.id)) continue;
  const origen = path.join(carpeta, 'archivos', a.ruta);
  if (!fs.existsSync(origen)) continue;
  await almacen.guardar(a.ruta, fs.createReadStream(origen), a.tipo);
  await sql.registrarArchivo({ ...a, equipoId: idEnAzure.get(a.equipoId) ?? a.equipoId });
  subidos++;
}
console.log(`${subidos} archivo(s) subido(s).`);

// Los proyectos: el de Azure más lo del portátil.
let juntados = 0;
for (const [idLocal, idAzure] of idEnAzure) {
  const yjs = path.join(carpeta, 'proyectos', `${idLocal}.yjs`);
  if (!fs.existsSync(yjs)) continue;
  const doc = new Y.Doc();
  const nube = await sql.cargarSala(idAzure);
  if (nube?.estado) Y.applyUpdate(doc, nube.estado);
  else if (nube?.contenido) conversor.escribir(doc, null, JSON.parse(nube.contenido));
  Y.applyUpdate(doc, await fsp.readFile(yjs));
  const proyecto = conversor.leer(doc);
  await sql.guardarSala(idAzure, Buffer.from(Y.encodeStateAsUpdate(doc)), proyecto ? JSON.stringify(proyecto) : null, 'plan-c');
  juntados++;
}
console.log(`${juntados} proyecto(s) juntado(s) con Azure.`);
await sql.cerrar();
