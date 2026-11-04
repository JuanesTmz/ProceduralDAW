// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Pruebas del servicio completo: un servidor de verdad (con datos en una
 * carpeta temporal) y peticiones como las de la app y el panel.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CLAVE_ADMIN, conectarSala, entrar, esperarQue, levantarServidor, pedir } from './ayudas.js';

let servidor;
let url;
let admin;

before(async () => {
  servidor = await levantarServidor();
  url = servidor.url;
  admin = await entrar(url, 'Admin', CLAVE_ADMIN);
});
after(() => servidor?.apagar());

describe('entrar', () => {
  test('el panel entra con «Admin» sin importar mayúsculas', async () => {
    const r = await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'ADMIN', clave: CLAVE_ADMIN } });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.admin, true);
    const sesion = await pedir(url, 'GET', '/api/sesion', { cookie: r.cookie });
    assert.equal(sesion.datos.admin, true);
  });

  test('con la contraseña equivocada no entra nadie', async () => {
    const r = await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'Admin', clave: 'mala' } });
    assert.equal(r.estado, 401);
    assert.equal(r.cookie, null);
  });

  test('sin sesión no se ve nada', async () => {
    assert.equal((await pedir(url, 'GET', '/api/sesion')).estado, 401);
    assert.equal((await pedir(url, 'GET', '/api/admin/estado')).estado, 401);
    assert.equal((await pedir(url, 'GET', '/api/proyecto')).estado, 401);
  });
});

describe('equipos', () => {
  test('se crea un equipo y entra con su nombre escrito de cualquier forma', async () => {
    const creado = await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Los Truenos', clave: 'del barrio' } });
    assert.equal(creado.estado, 201);
    const r = await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: '  los   TRUENÓS ', clave: 'del barrio' } });
    assert.equal(r.estado, 200);
    assert.equal(r.datos.equipo.nombre, 'Los Truenos');
  });

  test('no se repiten nombres ni se usa «Admin»', async () => {
    const repetido = await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'LOS TRUENOS', clave: 'otra cosa' } });
    assert.equal(repetido.estado, 400);
    const reservado = await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'admin', clave: 'otra cosa' } });
    assert.equal(reservado.estado, 400);
    const corta = await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Corta', clave: '123' } });
    assert.equal(corta.estado, 400);
  });

  test('un equipo no puede usar el panel', async () => {
    const equipo = await entrar(url, 'los truenos', 'del barrio');
    assert.equal((await pedir(url, 'GET', '/api/admin/estado', { cookie: equipo })).estado, 401);
  });

  test('renombrar y cambiar la contraseña', async () => {
    const { datos } = await pedir(url, 'GET', '/api/admin/estado', { cookie: admin });
    const id = datos.equipos.find((e) => e.nombre === 'Los Truenos').id;
    const r = await pedir(url, 'PUT', `/api/admin/equipos/${id}`, { cookie: admin, cuerpo: { nombre: 'Truenos del Barrio', clave: 'nueva clave' } });
    assert.equal(r.estado, 200);
    assert.equal((await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'los truenos', clave: 'del barrio' } })).estado, 401);
    assert.equal((await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'truenos del barrio', clave: 'nueva clave' } })).estado, 200);
  });

  test('tras 8 intentos fallidos hay que esperar', async () => {
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Bloqueo', clave: 'la buena' } });
    for (let i = 0; i < 8; i++) await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'bloqueo', clave: 'mala' } });
    const r = await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'bloqueo', clave: 'la buena' } });
    assert.equal(r.estado, 429);
  });
});

describe('admins', () => {
  test('se crea otro admin y entra al panel con su nombre', async () => {
    const r = await pedir(url, 'POST', '/api/admin/admins', { cookie: admin, cuerpo: { nombre: 'Coordinación', clave: 'clave coordi' } });
    assert.equal(r.estado, 201);
    const otro = await entrar(url, 'coordinacion', 'clave coordi');
    const estado = await pedir(url, 'GET', '/api/admin/estado', { cookie: otro });
    assert.equal(estado.estado, 200);
    assert.equal(estado.datos.yo.nombre, 'Coordinación');
  });

  test('un admin no puede llamarse como un equipo', async () => {
    const r = await pedir(url, 'POST', '/api/admin/admins', { cookie: admin, cuerpo: { nombre: 'Truenos del Barrio', clave: 'xxxxx' } });
    assert.equal(r.estado, 400);
  });

  test('al borrar un admin, su sesión deja de valer', async () => {
    const creado = await pedir(url, 'POST', '/api/admin/admins', { cookie: admin, cuerpo: { nombre: 'Temporal', clave: 'temporal' } });
    const sesion = await entrar(url, 'temporal', 'temporal');
    assert.equal((await pedir(url, 'DELETE', `/api/admin/admins/${creado.datos.id}`, { cookie: admin })).estado, 200);
    assert.equal((await pedir(url, 'GET', '/api/admin/estado', { cookie: sesion })).estado, 401);
  });
});

describe('archivos y galería', () => {
  test('un archivo lo abre su equipo y el panel, no otro equipo', async () => {
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Archivos A', clave: 'clave a' } });
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Archivos B', clave: 'clave b' } });
    const a = await entrar(url, 'archivos a', 'clave a');
    const b = await entrar(url, 'archivos b', 'clave b');
    const contenido = Buffer.alloc(50_000, 7);
    const subida = await pedir(url, 'POST', '/api/archivos', { cookie: a, tipo: 'audio/webm', crudo: contenido });
    assert.equal(subida.estado, 201);
    const bajada = await fetch(url + subida.datos.url, { headers: { cookie: a } });
    assert.equal(bajada.status, 200);
    assert.deepEqual(Buffer.from(await bajada.arrayBuffer()), contenido);
    const pedazo = await fetch(url + subida.datos.url, { headers: { cookie: a, range: 'bytes=10-19' } });
    assert.equal(pedazo.status, 206);
    assert.equal((await pedazo.arrayBuffer()).byteLength, 10);
    assert.equal((await pedir(url, 'GET', subida.datos.url, { cookie: b })).estado, 404);
    assert.equal((await fetch(url + subida.datos.url, { headers: { cookie: admin } })).status, 200);
    const prohibido = await pedir(url, 'POST', '/api/archivos', { cookie: a, tipo: 'application/x-msdownload', crudo: contenido });
    assert.equal(prohibido.estado, 415);
  });

  test('un video enviado aparece en la galería y se borra con el equipo', async () => {
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Con Video', clave: 'con video' } });
    const equipo = await entrar(url, 'con video', 'con video');
    const enviado = await pedir(url, 'POST', '/api/videos', { cookie: equipo, tipo: 'video/webm', crudo: Buffer.alloc(30_000, 1) });
    assert.equal(enviado.estado, 201);
    let { datos } = await pedir(url, 'GET', '/api/admin/estado', { cookie: admin });
    const video = datos.videos.find((v) => v.id === enviado.datos.id);
    assert.equal(video.equipo, 'Con Video');
    const id = video.equipoId;
    assert.equal((await pedir(url, 'DELETE', `/api/admin/equipos/${id}`, { cookie: admin })).estado, 200);
    ({ datos } = await pedir(url, 'GET', '/api/admin/estado', { cookie: admin }));
    assert.ok(!datos.videos.some((v) => v.id === enviado.datos.id));
    assert.equal((await pedir(url, 'POST', '/api/entrar', { cuerpo: { equipo: 'con video', clave: 'con video' } })).estado, 401);
  });
});

describe('sala en tiempo real', () => {
  test('lo que cambia una tablet llega a la otra, y la sala de un equipo no se mezcla con otra', async () => {
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Sala Uno', clave: 'sala uno' } });
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Sala Dos', clave: 'sala dos' } });
    const uno = await entrar(url, 'sala uno', 'sala uno');
    const dos = await entrar(url, 'sala dos', 'sala dos');
    const a = await conectarSala(url, uno);
    const b = await conectarSala(url, uno);
    const c = await conectarSala(url, dos);
    a.doc.getMap('prueba').set('hola', 'mundo');
    await esperarQue(() => b.doc.getMap('prueba').get('hola') === 'mundo');
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(c.doc.getMap('prueba').get('hola'), undefined);
    for (const t of [a, b, c]) t.cerrar();
  });

  test('sin sesión no se entra a la sala', async () => {
    await assert.rejects(conectarSala(url, ''), /401/);
  });

  test('con la edición cerrada, lo que manda una tablet no se aplica', async () => {
    await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre: 'Cerrado', clave: 'cerrado' } });
    const { datos } = await pedir(url, 'GET', '/api/admin/estado', { cookie: admin });
    const id = datos.equipos.find((e) => e.nombre === 'Cerrado').id;
    const sesion = await entrar(url, 'cerrado', 'cerrado');
    const a = await conectarSala(url, sesion);
    await pedir(url, 'POST', `/api/admin/equipos/${id}/congelar`, { cookie: admin, cuerpo: { valor: true } });
    await new Promise((r) => setTimeout(r, 200));
    a.doc.getMap('prueba').set('intento', 1);
    await new Promise((r) => setTimeout(r, 400));
    const b = await conectarSala(url, sesion);
    assert.equal(b.doc.getMap('prueba').get('intento'), undefined);
    a.cerrar();
    b.cerrar();
  });
});
