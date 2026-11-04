// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Pruebas de las piezas sueltas: nombres, contraseñas, sesiones y cómo se
 * juntan en Yjs las ediciones de dos tablets.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { claveCorrecta, crearLimite, crearSesiones, hashClave, normalizarNombre } from '../seguridad.js';
import { crearConversor, iguales } from '../compartido/proyectoYjs.js';

test('el nombre del equipo da igual con mayúsculas, tildes o espacios de más', () => {
  assert.equal(normalizarNombre('  Los   TRUENÓS '), 'los truenos');
  assert.equal(normalizarNombre('Equipo de Prueba'), normalizarNombre('equipo de prueba'));
  assert.equal(normalizarNombre('Ñandú'), 'nandu');
  assert.equal(normalizarNombre(''), '');
  assert.equal(normalizarNombre(undefined), '');
});

test('las contraseñas se guardan con hash y solo la correcta entra', () => {
  const hash = hashClave('una contraseña larga');
  assert.notEqual(hash, 'una contraseña larga');
  assert.ok(claveCorrecta('una contraseña larga', hash));
  assert.ok(!claveCorrecta('Una contraseña larga', hash));
  assert.ok(!claveCorrecta('x', 'basura'));
  // Dos hashes de la misma contraseña son distintos (cada uno con su sal).
  assert.notEqual(hashClave('igual'), hashClave('igual'));
});

test('una sesión firmada no se puede falsificar ni dura para siempre', () => {
  const sesiones = crearSesiones('secreto');
  const token = sesiones.emitir(7);
  assert.equal(sesiones.leer(token), 7);
  assert.equal(crearSesiones('otro secreto').leer(token), null);
  const [datos, firma] = token.split('.');
  const otroEquipo = Buffer.from(JSON.stringify({ e: 8, v: Date.now() + 1e6 })).toString('base64url');
  assert.equal(sesiones.leer(`${otroEquipo}.${firma}`), null);
  const vencida = Buffer.from(JSON.stringify({ e: 7, v: Date.now() - 1 })).toString('base64url');
  assert.equal(sesiones.leer(`${vencida}.${firma}`), null);
  assert.equal(sesiones.leer(datos), null);
});

test('tras 8 fallos hay que esperar, y entrar bien limpia la cuenta', () => {
  const limite = crearLimite();
  for (let i = 0; i < 7; i++) limite.fallo('ip|equipo');
  assert.ok(!limite.bloqueado('ip|equipo'));
  limite.fallo('ip|equipo');
  assert.ok(limite.bloqueado('ip|equipo'));
  assert.ok(!limite.bloqueado('otra-ip|equipo'));
  limite.limpiar('ip|equipo');
  assert.ok(!limite.bloqueado('ip|equipo'));
});

const proyecto = () => ({
  nombre: 'p',
  secciones: [{ x: 1 }],
  historia: { que: 'a', porQue: 'b' },
  patron: { filas: [{ id: 'f1', pasos: [true, false] }, { id: 'f2', pasos: [false, false] }] },
  escenas: [{ id: 'e1', texto: 'uno', cajitas: [{ id: 'c1', v: 1 }] }, { id: 'e2', texto: 'dos' }],
  respiros: [],
  conexiones: [],
  conexionesVisual: [],
  archivosDatos: [],
  sonidos: [],
});

test('dos tablets que editan cosas distintas a la vez terminan con lo mismo, sin perder nada', () => {
  const c = crearConversor(Y);
  const a = new Y.Doc();
  const b = new Y.Doc();
  c.escribir(a, null, proyecto());
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
  const la = c.leer(a);
  const lb = c.leer(b);
  assert.ok(!('secciones' in la), 'lo que cada tablet calcula sola no viaja');

  const a2 = structuredClone(la);
  a2.escenas[0].texto = 'UNO';
  a2.escenas.splice(1, 0, { id: 'e3', texto: 'tres' });
  const b2 = structuredClone(lb);
  b2.escenas[1].texto = 'DOS';
  b2.patron.filas = b2.patron.filas.filter((f) => f.id !== 'f2');
  b2.historia.que = 'nuevo';
  c.escribir(a, la, a2);
  c.escribir(b, lb, b2);
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

  const ra = c.leer(a);
  assert.ok(iguales(ra, c.leer(b)), 'las dos copias convergen');
  assert.deepEqual(
    ra.escenas.map((e) => [e.id, e.texto]),
    [['e1', 'UNO'], ['e3', 'tres'], ['e2', 'DOS']],
  );
  assert.deepEqual(ra.patron.filas.map((f) => f.id), ['f1']);
  assert.equal(ra.historia.que, 'nuevo');
  assert.equal(ra.historia.porQue, 'b');
});

test('cambiar una celda manda muy poco', () => {
  const c = crearConversor(Y);
  const doc = new Y.Doc();
  c.escribir(doc, null, proyecto());
  const antes = c.leer(doc);
  const ahora = structuredClone(antes);
  ahora.patron.filas[0].pasos[1] = true;
  let bytes = 0;
  doc.on('update', (u) => (bytes += u.length));
  c.escribir(doc, antes, ahora);
  assert.deepEqual(c.leer(doc).patron.filas[0].pasos, [true, true]);
  assert.ok(bytes < 200, `mandó ${bytes} bytes`);
});
