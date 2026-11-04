// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Plan C, antes: copia de Azure a server/.datos todo lo que el portátil
 * necesita para reemplazar a la nube: los equipos (con sus PIN), el proyecto
 * de cada uno y sus archivos. Se corre con internet, con la sesión de
 * `az login` de quien tiene acceso a la base y al almacenamiento:
 *
 *   SQL_SERVIDOR=... SQL_BASE=... BLOB_CUENTA=... npm --prefix server run traer-de-azure
 *
 * Lo que hubiera en server/.datos se guarda antes en server/.datos-antes-<fecha>.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { abrirSql } from '../datos/sql.js';
import { abrirArchivos } from '../archivos.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.join(aqui, '..', '.datos');
if (!process.env.SQL_SERVIDOR || !process.env.SQL_BASE || !process.env.BLOB_CUENTA) {
  console.error('Faltan SQL_SERVIDOR, SQL_BASE o BLOB_CUENTA (ver server/README.md).');
  process.exit(1);
}

const sql = await abrirSql({ servidor: process.env.SQL_SERVIDOR, base: process.env.SQL_BASE });
const almacen = await abrirArchivos();

// Lo que había no se borra: se aparta (el certificado del plan C se conserva).
// (Se copia y se vacía en vez de renombrar: en Windows renombrar una carpeta en uso falla.)
if (fs.existsSync(carpeta)) {
  const aparte = `${carpeta}-antes-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
  await fsp.cp(carpeta, aparte, { recursive: true });
  console.log(`Lo anterior quedó en ${aparte}`);
  for (const nombre of await fsp.readdir(carpeta)) {
    if (nombre !== 'plan-c') await fsp.rm(path.join(carpeta, nombre), { recursive: true, force: true, maxRetries: 3 });
  }
}
await fsp.mkdir(path.join(carpeta, 'proyectos'), { recursive: true });

const equipos = await sql.listarEquipos();
await fsp.writeFile(path.join(carpeta, 'equipos.json'), JSON.stringify(equipos, null, 2));
console.log(`${equipos.length} equipo(s).`);

const proyectos = await sql.listarProyectos();
for (const p of proyectos) {
  await fsp.writeFile(
    path.join(carpeta, 'proyectos', `${p.equipoId}.json`),
    JSON.stringify({ contenido: p.contenido, version: p.version, actualizado: p.actualizado }, null, 2),
  );
  if (p.estado) await fsp.writeFile(path.join(carpeta, 'proyectos', `${p.equipoId}.yjs`), p.estado);
}
console.log(`${proyectos.length} proyecto(s).`);

const archivos = await sql.listarArchivos();
let bytes = 0;
for (const a of archivos) {
  const destino = path.join(carpeta, 'archivos', a.ruta);
  await fsp.mkdir(path.dirname(destino), { recursive: true });
  if (a.bytes > 0) await pipeline(await almacen.leer(a.ruta, 0, a.bytes), fs.createWriteStream(destino));
  else await fsp.writeFile(destino, '');
  bytes += a.bytes;
}
await fsp.writeFile(path.join(carpeta, 'archivos.json'), JSON.stringify(archivos, null, 2));
console.log(`${archivos.length} archivo(s), ${(bytes / 1024 / 1024).toFixed(1)} MB.`);
console.log('Listo: el plan C ya tiene lo de Azure.');
await sql.cerrar();
