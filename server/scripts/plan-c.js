// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Plan C: el servidor de SONORA en un portátil conectado al router del
 * evento, para cuando Azure o internet se caen por mucho tiempo.
 *
 *   npm --prefix server run plan-c
 *
 * Sirve por HTTPS (con un certificado propio, que las tablets aceptan una vez
 * en «Avanzado → Continuar») porque sin HTTPS no se puede grabar. Usa los
 * datos de server/.datos: antes del evento, con internet, conviene correr
 * `npm --prefix server run traer-de-azure` para tener aquí los equipos y sus
 * proyectos. Los pasos completos están en docs/plan-c.md.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import selfsigned from 'selfsigned';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = path.join(process.env.DATOS_CARPETA ?? path.join(aqui, '..', '.datos'), 'plan-c');
fs.mkdirSync(carpeta, { recursive: true });

/** Las direcciones del portátil en la red local: las que las tablets escriben. */
const direcciones = Object.values(os.networkInterfaces())
  .flat()
  .filter((d) => d && d.family === 'IPv4' && !d.internal)
  .map((d) => d.address);

const cert = path.join(carpeta, 'cert.pem');
const llave = path.join(carpeta, 'llave.pem');
const anotadas = path.join(carpeta, 'direcciones.json');
const antes = fs.existsSync(anotadas) ? JSON.parse(fs.readFileSync(anotadas, 'utf8')) : [];
// Si el portátil cambió de red, el certificado se rehace con sus direcciones nuevas.
if (!fs.existsSync(cert) || direcciones.some((d) => !antes.includes(d))) {
  const vence = new Date();
  vence.setFullYear(vence.getFullYear() + 1);
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'SONORA plan C' }], {
    keyType: 'ec',
    algorithm: 'sha256',
    notAfterDate: vence,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [{ type: 2, value: 'localhost' }, ...direcciones.map((ip) => ({ type: 7, ip }))],
      },
    ],
  });
  fs.writeFileSync(cert, pems.cert);
  fs.writeFileSync(llave, pems.private);
  fs.writeFileSync(anotadas, JSON.stringify(direcciones));
}

// Un secreto fijo: si el portátil se reinicia, las tablets siguen con su sesión.
const secreto = path.join(carpeta, 'secreto');
if (!fs.existsSync(secreto)) fs.writeFileSync(secreto, crypto.randomBytes(32).toString('hex'));

const puerto = process.env.PORT ?? '3443';
Object.assign(process.env, {
  PORT: puerto,
  HTTPS_CERT: cert,
  HTTPS_KEY: llave,
  SESION_SECRETO: fs.readFileSync(secreto, 'utf8').trim(),
  NODE_ENV: 'production',
});
// Todo local: nada de Azure.
delete process.env.SQL_SERVIDOR;
delete process.env.BLOB_CUENTA;

console.log('\nPlan C · las tablets entran a:');
for (const d of direcciones) console.log(`   https://${d}:${puerto}`);
console.log('');
await import('../index.js');
