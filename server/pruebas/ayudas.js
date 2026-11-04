// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Lo que comparten las pruebas: levantar un servidor de prueba (con datos en
 * una carpeta temporal, nunca Azure), entrar como equipo o como admin, y
 * conectarse a la sala en tiempo real como lo haría una tablet.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Y from 'yjs';
import * as sync from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import WebSocket from 'ws';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const CLAVE_ADMIN = 'clave-de-prueba';

/** Un servidor propio para las pruebas, en un puerto libre y con datos que se borran al final. */
export async function levantarServidor() {
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'sonora-prueba-'));
  const puerto = 40_000 + Math.floor(Math.random() * 20_000);
  const proceso = spawn(process.execPath, [path.join(aqui, '..', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(puerto),
      DATOS_CARPETA: carpeta,
      ADMIN_CLAVE: CLAVE_ADMIN,
      SESION_SECRETO: 'secreto-de-prueba',
      NODE_ENV: 'test',
      SQL_SERVIDOR: '',
      BLOB_CUENTA: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let salida = '';
  await new Promise((listo, falla) => {
    const reloj = setTimeout(() => falla(new Error(`El servidor no arrancó:\n${salida}`)), 15_000);
    const leer = (d) => {
      salida += d;
      if (salida.includes('escuchando')) {
        clearTimeout(reloj);
        listo();
      }
    };
    proceso.stdout.on('data', leer);
    proceso.stderr.on('data', leer);
    proceso.on('exit', (codigo) => falla(new Error(`El servidor se cerró (${codigo}):\n${salida}`)));
  });
  return {
    url: `http://localhost:${puerto}`,
    async apagar() {
      proceso.kill();
      await new Promise((r) => proceso.once('exit', r));
      await fs.rm(carpeta, { recursive: true, force: true });
    },
  };
}

/** Una petición JSON; devuelve el estado, el cuerpo y la cookie que haya mandado el servidor. */
export async function pedir(url, metodo, ruta, { cuerpo, cookie, tipo, crudo } = {}) {
  const r = await fetch(url + ruta, {
    method: metodo,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(cuerpo !== undefined || crudo ? { 'Content-Type': tipo ?? 'application/json' } : {}),
    },
    body: crudo ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined),
  });
  const texto = await r.text();
  let datos = texto;
  try {
    datos = JSON.parse(texto);
  } catch {
    // No era JSON (un archivo): queda el texto.
  }
  const galleta = r.headers.getSetCookie().find((c) => !/Expires=Thu, 01 Jan 1970/.test(c));
  return { estado: r.status, datos, cookie: galleta?.split(';')[0] ?? null };
}

export async function entrar(url, equipo, clave) {
  const r = await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo, clave } });
  if (r.estado !== 200) throw new Error(`No se pudo entrar como ${equipo}: ${JSON.stringify(r.datos)}`);
  return r.cookie;
}

/**
 * Una «tablet» de prueba conectada a la sala del equipo: un documento Yjs que
 * se sincroniza con el servidor por el mismo protocolo que la app.
 */
export function conectarSala(url, cookie) {
  const doc = new Y.Doc();
  const ws = new WebSocket(url.replace(/^http/, 'ws') + '/api/sala', { headers: { cookie, origin: url } });
  ws.binaryType = 'arraybuffer';
  const enviar = (escribir) => {
    if (ws.readyState !== ws.OPEN) return;
    const e = encoding.createEncoder();
    escribir(e);
    ws.send(encoding.toUint8Array(e));
  };
  doc.on('update', (cambio, origen) => {
    if (origen !== ws) enviar((e) => (encoding.writeVarUint(e, 0), sync.writeUpdate(e, cambio)));
  });
  return new Promise((listo, falla) => {
    ws.on('unexpected-response', (_q, r) => falla(new Error(`La sala respondió ${r.statusCode}`)));
    ws.on('error', falla);
    ws.on('open', () => enviar((e) => (encoding.writeVarUint(e, 0), sync.writeSyncStep1(e, doc))));
    ws.on('message', (m) => {
      const d = decoding.createDecoder(new Uint8Array(m));
      if (decoding.readVarUint(d) !== 0) return; // presencia, bloqueos y estado: no hacen falta aquí
      const e = encoding.createEncoder();
      encoding.writeVarUint(e, 0);
      const tipo = sync.readSyncMessage(d, e, doc, ws);
      if (encoding.length(e) > 1) ws.send(encoding.toUint8Array(e));
      if (tipo === sync.messageYjsSyncStep2) listo({ doc, ws, cerrar: () => ws.close() });
    });
  });
}

/** Espera a que algo se cumpla (o falla a los `ms`). */
export async function esperarQue(condicion, ms = 5_000) {
  const hasta = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > hasta) throw new Error('Se acabó el tiempo esperando');
    await new Promise((r) => setTimeout(r, 20));
  }
}
