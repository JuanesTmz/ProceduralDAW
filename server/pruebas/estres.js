// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Prueba de estrés: muchas «tablets» de muchos equipos editando a la vez.
 *
 *   npm --prefix server run estres                       # contra un servidor local de prueba
 *   npm --prefix server run estres -- --equipos 10 --tablets 10 --segundos 60 --ritmo 5
 *   npm --prefix server run estres -- --url https://…azurecontainerapps.io --admin-clave …
 *
 * Cada tablet se conecta a la sala de su equipo y cambia su propia pieza
 * `ritmo` veces por segundo, como alguien arrastrando un control. Se mide
 * cuánto tarda cada cambio en llegar a las demás tablets del equipo, si se
 * pierde alguno, y cuánto tarda el servidor en responder mientras tanto.
 *
 * Contra un servidor real crea equipos temporales («estres-…») y los borra
 * al terminar, aunque algo falle. No toca los equipos de verdad.
 */
import { parseArgs } from 'node:util';
import { CLAVE_ADMIN, conectarSala, entrar, levantarServidor, pedir } from './ayudas.js';

const { values: op } = parseArgs({
  options: {
    url: { type: 'string' },
    'admin-clave': { type: 'string' },
    equipos: { type: 'string', default: '5' },
    tablets: { type: 'string', default: '8' },
    segundos: { type: 'string', default: '20' },
    ritmo: { type: 'string', default: '5' },
  },
});
const EQUIPOS = Number(op.equipos);
const TABLETS = Number(op.tablets);
const SEGUNDOS = Number(op.segundos);
const RITMO = Number(op.ritmo);

const percentil = (lista, p) => {
  if (lista.length === 0) return NaN;
  const orden = [...lista].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
};
const ms = (n) => (Number.isFinite(n) ? `${Math.round(n)} ms` : '—');

const local = op.url ? null : await levantarServidor();
const url = (op.url ?? local.url).replace(/\/$/, '');
const claveAdmin = op['admin-clave'] ?? process.env.ADMIN_CLAVE ?? (local ? CLAVE_ADMIN : null);
if (!claveAdmin) {
  console.error('Contra un servidor real hace falta --admin-clave (para crear y borrar los equipos de prueba).');
  process.exit(1);
}

console.log(`\nSONORA · prueba de estrés contra ${url}`);
console.log(`${EQUIPOS} equipos × ${TABLETS} tablets = ${EQUIPOS * TABLETS} conexiones, ${RITMO} cambios/s cada una, ${SEGUNDOS} s\n`);

const marca = Math.random().toString(36).slice(2, 7);
const admin = await entrar(url, 'Admin', claveAdmin);
const creados = [];
const tablets = [];
const latencias = [];
const salud = [];
let enviados = 0;
let recibidos = 0;
let caidas = 0;
const fallasConexion = [];

try {
  // ---------- preparar: equipos temporales y sus tablets ----------
  const tConexion = [];
  for (let e = 0; e < EQUIPOS; e++) {
    const nombre = `estres-${marca}-${e + 1}`;
    const r = await pedir(url, 'POST', '/api/admin/equipos', { cookie: admin, cuerpo: { nombre, clave: 'estres-clave' } });
    if (r.estado !== 201) throw new Error(`No se pudo crear ${nombre}: ${JSON.stringify(r.datos)}`);
    creados.push(r.datos.id);
    const sesion = await entrar(url, nombre, 'estres-clave');
    const conexiones = await Promise.allSettled(
      Array.from({ length: TABLETS }, async (_, t) => {
        const inicio = performance.now();
        const sala = await conectarSala(url, sesion);
        tConexion.push(performance.now() - inicio);
        return { ...sala, equipo: e, id: `t${t}`, vistos: new Map() };
      }),
    );
    for (const c of conexiones) {
      if (c.status === 'fulfilled') tablets.push(c.value);
      else fallasConexion.push(c.reason.message);
    }
  }
  console.log(`Conectadas ${tablets.length}/${EQUIPOS * TABLETS} tablets · conectar: p50 ${ms(percentil(tConexion, 50))}, máx ${ms(Math.max(...tConexion))}`);

  // ---------- medir: cada cambio, cuánto tarda en llegar a las demás ----------
  for (const t of tablets) {
    t.ws.on('close', () => caidas++);
    t.doc.getMap('estres').observe((ev) => {
      const ahora = Date.now();
      for (const clave of ev.keysChanged) {
        if (clave === t.id) continue;
        const valor = ev.target.get(clave);
        if (!valor) continue;
        recibidos++;
        latencias.push(ahora - valor.t);
        t.vistos.set(clave, valor.n);
      }
    });
  }
  const relojes = tablets.map((t) => {
    let n = 0;
    // Cada una arranca en un momento distinto, para no ir todas al mismo compás.
    return setTimeout(
      () =>
        (t.reloj = setInterval(() => {
          n++;
          enviados++;
          t.ultimo = n;
          t.doc.getMap('estres').set(t.id, { t: Date.now(), n });
        }, 1000 / RITMO)),
      Math.random() * (1000 / RITMO),
    );
  });
  const sondeo = setInterval(async () => {
    const inicio = performance.now();
    const r = await fetch(`${url}/api/salud`).catch(() => null);
    salud.push(r?.ok ? performance.now() - inicio : Infinity);
  }, 1000);

  const fin = Date.now() + SEGUNDOS * 1000;
  while (Date.now() < fin) {
    await new Promise((r) => setTimeout(r, 5000));
    const restante = Math.max(0, Math.round((fin - Date.now()) / 1000));
    console.log(`  … ${enviados} cambios enviados, ${recibidos} recibidos, p95 ${ms(percentil(latencias, 95))} (faltan ${restante} s)`);
  }
  relojes.forEach(clearTimeout);
  for (const t of tablets) clearInterval(t.reloj);
  clearInterval(sondeo);
  // Un momento para que llegue lo último.
  await new Promise((r) => setTimeout(r, 2000));

  // ---------- resultado ----------
  // ¿Cada tablet vio el último cambio de cada compañera?
  let perdidos = 0;
  for (const t of tablets) {
    for (const otra of tablets) {
      if (otra === t || otra.equipo !== t.equipo || !otra.ultimo) continue;
      if (t.vistos.get(otra.id) !== otra.ultimo) perdidos++;
    }
  }
  const esperados = tablets.length ? enviados * (TABLETS - 1) : 0;
  const saludOk = salud.filter(Number.isFinite);
  console.log('\nResultado');
  console.table({
    'cambios enviados': enviados,
    'cambios recibidos': `${recibidos} de ~${esperados}`,
    'latencia p50': ms(percentil(latencias, 50)),
    'latencia p95': ms(percentil(latencias, 95)),
    'latencia p99': ms(percentil(latencias, 99)),
    'latencia máxima': ms(Math.max(...latencias)),
    'tablets sin el último cambio de una compañera': perdidos,
    'conexiones que fallaron': fallasConexion.length,
    'conexiones caídas durante la prueba': caidas,
    'servidor responde (p95)': ms(percentil(saludOk, 95)),
    'servidor sin responder': salud.length - saludOk.length,
  });
  if (fallasConexion.length) console.log('Fallas al conectar:', [...new Set(fallasConexion)].join(' · '));
  const bien = perdidos === 0 && fallasConexion.length === 0 && caidas === 0 && percentil(latencias, 95) < 1000;
  console.log(bien ? '\n✔ Aguantó: todo llegó y el 95 % de los cambios tardó menos de 1 s.\n' : '\n✖ Hubo problemas: revisa la tabla.\n');
  process.exitCode = bien ? 0 : 1;
} finally {
  for (const t of tablets) t.cerrar();
  // Los equipos temporales se borran siempre.
  for (const id of creados) await pedir(url, 'DELETE', `/api/admin/equipos/${id}`, { cookie: admin }).catch(() => {});
  if (creados.length) console.log(`Borrados ${creados.length} equipos temporales.`);
  await local?.apagar();
}
