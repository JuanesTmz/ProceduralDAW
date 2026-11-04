// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Darle a la identidad administrada del servidor acceso a la base de datos.
 * Se corre una sola vez, con la sesión de `az login` de quien es
 * administrador del servidor SQL:
 *
 *   SQL_SERVIDOR=... SQL_BASE=... node scripts/acceso-sql.js id-upb-dev-sonora-01
 *
 * Lee, escribe y crea las tablas que faltan (las crea el servidor al arrancar).
 */
import sql from 'mssql';
import { AzureCliCredential } from '@azure/identity';

const identidad = process.argv[2];
if (!identidad || !process.env.SQL_SERVIDOR || !process.env.SQL_BASE) {
  console.error('Uso: SQL_SERVIDOR=... SQL_BASE=... node scripts/acceso-sql.js <nombre-de-la-identidad>');
  process.exit(1);
}
// El nombre va entre corchetes en el T-SQL: no puede traer corchetes.
if (/[[\]]/.test(identidad)) throw new Error('Nombre de identidad no válido.');

const pool = await new sql.ConnectionPool({
  server: process.env.SQL_SERVIDOR,
  database: process.env.SQL_BASE,
  options: { encrypt: true },
  authentication: { type: 'token-credential', options: { credential: new AzureCliCredential() } },
  connectionTimeout: 60_000,
}).connect();

await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'${identidad}')
  CREATE USER [${identidad}] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [${identidad}];
ALTER ROLE db_datawriter ADD MEMBER [${identidad}];
ALTER ROLE db_ddladmin ADD MEMBER [${identidad}];
`);
console.log(`Listo: ${identidad} puede leer, escribir y crear tablas en ${process.env.SQL_BASE}.`);
await pool.close();
