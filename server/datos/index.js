// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Dónde viven los datos. Con SQL_SERVIDOR definido, en Azure SQL; si no, en
 * una carpeta local (desarrollo y plan C).
 *
 * La base serverless se duerme cuando nadie la usa y despertarla puede tardar
 * un minuto: por eso esto se entrega enseguida y la base se abre por detrás.
 * El servidor ya responde (la app, la salud) y solo lo que necesita la base
 * espera a que esté lista.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirArchivo } from './archivo.js';
import { abrirSql } from './sql.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));

export function abrirDatos() {
  const listos = (async () => {
    const datos = process.env.SQL_SERVIDOR
      ? await abrirSql({
          servidor: process.env.SQL_SERVIDOR,
          base: process.env.SQL_BASE,
          clientId: process.env.AZURE_CLIENT_ID,
        })
      : await abrirArchivo(process.env.DATOS_CARPETA ?? path.join(aqui, '..', '.datos'));
    await datos.iniciar();
    return datos;
  })();
  listos.catch((error) => console.error('No se pudo abrir la base:', error.message));

  // Cada función espera a que la base esté lista. (`then` queda sin definir: si
  // no, quien hiciera `await abrirDatos()` esperaría a la base.)
  return new Proxy(
    {},
    {
      get: (_objeto, nombre) =>
        nombre === 'then' ? undefined : async (...argumentos) => (await listos)[nombre](...argumentos),
    },
  );
}
