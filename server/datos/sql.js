// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los datos en Azure SQL. El servidor entra con su identidad administrada
 * (sin contraseña); en el computador de desarrollo, con la sesión de `az login`.
 *
 * El proyecto se guarda como JSON legible en `contenido`: así se puede mirar
 * desde el editor de consultas del portal sin herramientas especiales.
 */
import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';
import { normalizarNombre } from '../seguridad.js';

const ESQUEMA = `
IF OBJECT_ID('dbo.equipos') IS NULL
  CREATE TABLE dbo.equipos (
    id INT IDENTITY PRIMARY KEY,
    nombre NVARCHAR(80) NOT NULL,
    codigo NVARCHAR(20) NOT NULL UNIQUE,
    pin_hash NVARCHAR(200) NOT NULL,
    creado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
IF OBJECT_ID('dbo.proyectos') IS NULL
  CREATE TABLE dbo.proyectos (
    id INT IDENTITY PRIMARY KEY,
    equipo_id INT NOT NULL UNIQUE REFERENCES dbo.equipos(id),
    contenido NVARCHAR(MAX) NOT NULL,
    version INT NOT NULL,
    autor NVARCHAR(40) NULL,
    actualizado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
IF OBJECT_ID('dbo.versiones') IS NULL
BEGIN
  CREATE TABLE dbo.versiones (
    id INT IDENTITY PRIMARY KEY,
    proyecto_id INT NOT NULL REFERENCES dbo.proyectos(id),
    contenido NVARCHAR(MAX) NOT NULL,
    version INT NOT NULL,
    motivo NVARCHAR(40) NOT NULL,
    fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX ix_versiones_proyecto ON dbo.versiones (proyecto_id, fecha);
END
-- Fase 3: el documento Yjs, junto al JSON legible.
IF COL_LENGTH('dbo.proyectos', 'estado_yjs') IS NULL
  ALTER TABLE dbo.proyectos ADD estado_yjs VARBINARY(MAX) NULL;
IF COL_LENGTH('dbo.versiones', 'estado_yjs') IS NULL
  ALTER TABLE dbo.versiones ADD estado_yjs VARBINARY(MAX) NULL;
-- Fase 6: congelar la edición de un equipo desde el panel.
IF COL_LENGTH('dbo.equipos', 'congelado') IS NULL
  ALTER TABLE dbo.equipos ADD congelado BIT NOT NULL CONSTRAINT df_equipos_congelado DEFAULT 0;
-- Se entra con el nombre del equipo: la columna codigo guarda ese nombre normalizado
-- (sin mayúsculas ni tildes), así que necesita el largo de un nombre.
IF COL_LENGTH('dbo.equipos', 'codigo') < 160
BEGIN
  DECLARE @unico sysname = (SELECT name FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.equipos') AND type = 'UQ');
  IF @unico IS NOT NULL EXEC('ALTER TABLE dbo.equipos DROP CONSTRAINT ' + @unico);
  ALTER TABLE dbo.equipos ALTER COLUMN codigo NVARCHAR(80) NOT NULL;
  ALTER TABLE dbo.equipos ADD CONSTRAINT uq_equipos_nombre UNIQUE (codigo);
END
-- Las cuentas del panel (además de «Admin», que vive en ADMIN_CLAVE).
IF OBJECT_ID('dbo.admins') IS NULL
  CREATE TABLE dbo.admins (
    id INT IDENTITY PRIMARY KEY,
    nombre NVARCHAR(80) NOT NULL,
    normal NVARCHAR(80) NOT NULL UNIQUE,
    clave_hash NVARCHAR(200) NOT NULL,
    creado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
-- La galería: los videos finales que mandan los equipos.
IF OBJECT_ID('dbo.videos') IS NULL
  CREATE TABLE dbo.videos (
    id NVARCHAR(36) PRIMARY KEY,
    equipo_id INT NOT NULL REFERENCES dbo.equipos(id),
    ruta NVARCHAR(200) NOT NULL,
    tipo NVARCHAR(100) NOT NULL,
    bytes BIGINT NOT NULL,
    persona NVARCHAR(40) NULL,
    creado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
-- Fase 2: los archivos de cada equipo (el contenido va en Blob Storage).
IF OBJECT_ID('dbo.archivos') IS NULL
  CREATE TABLE dbo.archivos (
    id NVARCHAR(36) PRIMARY KEY,
    equipo_id INT NOT NULL REFERENCES dbo.equipos(id),
    ruta NVARCHAR(200) NOT NULL,
    tipo NVARCHAR(100) NOT NULL,
    bytes BIGINT NOT NULL,
    persona NVARCHAR(40) NULL,
    creado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
-- La calificación de cada jurado (admin) a cada equipo, con la rúbrica de compartido/rubrica.js.
IF OBJECT_ID('dbo.calificaciones') IS NULL
  CREATE TABLE dbo.calificaciones (
    id INT IDENTITY PRIMARY KEY,
    equipo_id INT NOT NULL REFERENCES dbo.equipos(id),
    juez NVARCHAR(40) NOT NULL,
    juez_nombre NVARCHAR(80) NOT NULL,
    notas NVARCHAR(1000) NOT NULL,
    comentario NVARCHAR(2000) NULL,
    actualizado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_calificaciones UNIQUE (equipo_id, juez)
  );
-- Ajustes sueltos del panel (por ahora: si el ranking se ve desde la entrada).
IF OBJECT_ID('dbo.ajustes') IS NULL
  CREATE TABLE dbo.ajustes (
    clave NVARCHAR(40) PRIMARY KEY,
    valor NVARCHAR(400) NOT NULL
  );
IF OBJECT_ID('dbo.actividad') IS NULL
  CREATE TABLE dbo.actividad (
    id BIGINT IDENTITY PRIMARY KEY,
    equipo_id INT NULL,
    tipo NVARCHAR(30) NOT NULL,
    detalle NVARCHAR(400) NULL,
    fecha DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
`;

/** La base serverless se pausa sola; al despertar rechaza conexiones un rato (error 40613). */
async function conReintentos(abrir) {
  for (let intento = 1; ; intento++) {
    try {
      return await abrir();
    } catch (error) {
      const despertando = /40613|not currently available|ETIMEOUT/i.test(String(error?.message ?? error));
      if (!despertando || intento >= 8) throw error;
      console.log(`La base está despertando, reintento ${intento}…`);
      await new Promise((listo) => setTimeout(listo, 10_000));
    }
  }
}

export async function abrirSql({ servidor, base, clientId }) {
  const credential = new DefaultAzureCredential(clientId ? { managedIdentityClientId: clientId } : {});
  let pool = null;

  async function conexion() {
    if (pool?.connected) return pool;
    pool = await conReintentos(() =>
      new sql.ConnectionPool({
        server: servidor,
        database: base,
        options: { encrypt: true },
        authentication: { type: 'token-credential', options: { credential } },
        pool: { max: 10, idleTimeoutMillis: 60_000 },
        connectionTimeout: 30_000,
      }).connect(),
    );
    return pool;
  }

  const pedir = async () => (await conexion()).request();

  return {
    async iniciar() {
      await (await pedir()).batch(ESQUEMA);
      // Equipos de antes: su nombre normalizado pasa a ser con lo que se entra.
      const r = await (await pedir()).query('SELECT id, nombre, codigo FROM dbo.equipos');
      for (const e of r.recordset) {
        const normal = normalizarNombre(e.nombre);
        if (normal === e.codigo) continue;
        await (await pedir())
          .input('id', sql.Int, e.id)
          .input('c', sql.NVarChar(80), normal)
          .query('UPDATE dbo.equipos SET codigo = @c WHERE id = @id')
          .catch((error) => console.error(`No se pudo normalizar el equipo ${e.id}:`, error.message));
      }
    },

    /** `normal` es el nombre ya normalizado (ver normalizarNombre). */
    async equipoPorNombre(normal) {
      const r = await (await pedir())
        .input('n', sql.NVarChar(80), normal)
        .query('SELECT id, nombre, codigo, pin_hash AS claveHash FROM dbo.equipos WHERE codigo = @n');
      return r.recordset[0] ?? null;
    },

    async equipoPorId(id) {
      const r = await (await pedir())
        .input('id', sql.Int, id)
        .query('SELECT id, nombre, codigo, congelado FROM dbo.equipos WHERE id = @id');
      return r.recordset[0] ?? null;
    },

    async crearEquipo({ nombre, normal, claveHash }) {
      const r = await (await pedir())
        .input('nombre', sql.NVarChar(80), nombre)
        .input('n', sql.NVarChar(80), normal)
        .input('c', sql.NVarChar(200), claveHash)
        .query('INSERT INTO dbo.equipos (nombre, codigo, pin_hash) OUTPUT inserted.id VALUES (@nombre, @n, @c)');
      return r.recordset[0].id;
    },

    /** Cambia el nombre (y su forma normalizada) o la contraseña; lo que no venga queda igual. */
    async actualizarEquipo(id, { nombre = null, normal = null, claveHash = null }) {
      await (await pedir())
        .input('id', sql.Int, id)
        .input('nombre', sql.NVarChar(80), nombre)
        .input('n', sql.NVarChar(80), normal)
        .input('c', sql.NVarChar(200), claveHash)
        .query(`UPDATE dbo.equipos SET nombre = COALESCE(@nombre, nombre), codigo = COALESCE(@n, codigo),
                 pin_hash = COALESCE(@c, pin_hash) WHERE id = @id`);
    },

    /** Borra el equipo con todo lo suyo. Devuelve las rutas de sus archivos y videos, para borrarlos del almacén. */
    async borrarEquipo(id) {
      const p = await conexion();
      const t = new sql.Transaction(p);
      await t.begin();
      try {
        const q = (texto) => new sql.Request(t).input('e', sql.Int, id).query(texto);
        const rutas = [
          ...(await q('SELECT ruta FROM dbo.archivos WHERE equipo_id = @e')).recordset,
          ...(await q('SELECT ruta FROM dbo.videos WHERE equipo_id = @e')).recordset,
        ].map((f) => f.ruta);
        await q(`DELETE v FROM dbo.versiones v JOIN dbo.proyectos p ON p.id = v.proyecto_id WHERE p.equipo_id = @e;
                 DELETE FROM dbo.proyectos WHERE equipo_id = @e;
                 DELETE FROM dbo.archivos WHERE equipo_id = @e;
                 DELETE FROM dbo.videos WHERE equipo_id = @e;
                 DELETE FROM dbo.actividad WHERE equipo_id = @e;
                 DELETE FROM dbo.calificaciones WHERE equipo_id = @e;
                 DELETE FROM dbo.equipos WHERE id = @e;`);
        await t.commit();
        return rutas;
      } catch (error) {
        await t.rollback().catch(() => {});
        throw error;
      }
    },

    // ---------- cuentas del panel ----------

    async listarAdmins() {
      const r = await (await pedir()).query('SELECT id, nombre, creado FROM dbo.admins ORDER BY id');
      return r.recordset;
    },

    async adminPorNombre(normal) {
      const r = await (await pedir())
        .input('n', sql.NVarChar(80), normal)
        .query('SELECT id, nombre, clave_hash AS claveHash FROM dbo.admins WHERE normal = @n');
      return r.recordset[0] ?? null;
    },

    async adminPorId(id) {
      const r = await (await pedir()).input('id', sql.Int, id).query('SELECT id, nombre FROM dbo.admins WHERE id = @id');
      return r.recordset[0] ?? null;
    },

    async crearAdmin({ nombre, normal, claveHash }) {
      const r = await (await pedir())
        .input('nombre', sql.NVarChar(80), nombre)
        .input('n', sql.NVarChar(80), normal)
        .input('c', sql.NVarChar(200), claveHash)
        .query('INSERT INTO dbo.admins (nombre, normal, clave_hash) OUTPUT inserted.id VALUES (@nombre, @n, @c)');
      return r.recordset[0].id;
    },

    async actualizarAdmin(id, { nombre = null, normal = null, claveHash = null }) {
      await (await pedir())
        .input('id', sql.Int, id)
        .input('nombre', sql.NVarChar(80), nombre)
        .input('n', sql.NVarChar(80), normal)
        .input('c', sql.NVarChar(200), claveHash)
        .query(`UPDATE dbo.admins SET nombre = COALESCE(@nombre, nombre), normal = COALESCE(@n, normal),
                 clave_hash = COALESCE(@c, clave_hash) WHERE id = @id`);
    },

    async borrarAdmin(id) {
      await (await pedir()).input('id', sql.Int, id).query('DELETE FROM dbo.admins WHERE id = @id');
    },

    // ---------- calificaciones y ranking ----------

    async listarCalificaciones() {
      const r = await (await pedir()).query(`
        SELECT equipo_id AS equipoId, juez, juez_nombre AS juezNombre, notas, comentario, actualizado
        FROM dbo.calificaciones ORDER BY actualizado`);
      return r.recordset.map((c) => ({ ...c, notas: JSON.parse(c.notas) }));
    },

    /** Crea o reemplaza la calificación de ese jurado a ese equipo. */
    async guardarCalificacion({ equipoId, juez, juezNombre, notas, comentario }) {
      await (await pedir())
        .input('e', sql.Int, equipoId)
        .input('j', sql.NVarChar(40), juez)
        .input('jn', sql.NVarChar(80), juezNombre)
        .input('n', sql.NVarChar(1000), JSON.stringify(notas))
        .input('c', sql.NVarChar(2000), comentario || null).query(`
          MERGE dbo.calificaciones WITH (HOLDLOCK) AS t
          USING (SELECT @e AS equipo_id, @j AS juez) AS s ON t.equipo_id = s.equipo_id AND t.juez = s.juez
          WHEN MATCHED THEN UPDATE SET juez_nombre = @jn, notas = @n, comentario = @c, actualizado = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT (equipo_id, juez, juez_nombre, notas, comentario) VALUES (@e, @j, @jn, @n, @c);`);
    },

    async leerAjuste(clave) {
      const r = await (await pedir()).input('k', sql.NVarChar(40), clave).query('SELECT valor FROM dbo.ajustes WHERE clave = @k');
      return r.recordset[0]?.valor ?? null;
    },

    async guardarAjuste(clave, valor) {
      await (await pedir())
        .input('k', sql.NVarChar(40), clave)
        .input('v', sql.NVarChar(400), String(valor)).query(`
          MERGE dbo.ajustes WITH (HOLDLOCK) AS t USING (SELECT @k AS clave) AS s ON t.clave = s.clave
          WHEN MATCHED THEN UPDATE SET valor = @v
          WHEN NOT MATCHED THEN INSERT (clave, valor) VALUES (@k, @v);`);
    },

    // ---------- la galería ----------

    async registrarVideo({ id, equipoId, ruta, tipo, bytes, persona }) {
      await (await pedir())
        .input('id', sql.NVarChar(36), id)
        .input('e', sql.Int, equipoId)
        .input('r', sql.NVarChar(200), ruta)
        .input('t', sql.NVarChar(100), tipo)
        .input('b', sql.BigInt, bytes)
        .input('p', sql.NVarChar(40), persona)
        .query('INSERT INTO dbo.videos (id, equipo_id, ruta, tipo, bytes, persona) VALUES (@id, @e, @r, @t, @b, @p)');
    },

    async listarVideos() {
      const r = await (await pedir()).query(`
        SELECT v.id, v.equipo_id AS equipoId, e.nombre AS equipo, v.tipo, v.bytes, v.persona, v.creado
        FROM dbo.videos v JOIN dbo.equipos e ON e.id = v.equipo_id ORDER BY v.creado DESC`);
      return r.recordset.map((v) => ({ ...v, bytes: Number(v.bytes) }));
    },

    async videoPorId(id) {
      const r = await (await pedir())
        .input('id', sql.NVarChar(36), id)
        .query('SELECT id, equipo_id AS equipoId, ruta, tipo, bytes FROM dbo.videos WHERE id = @id');
      const fila = r.recordset[0];
      return fila ? { ...fila, bytes: Number(fila.bytes) } : null;
    },

    /** Devuelve la ruta del video borrado (o null). */
    async borrarVideo(id) {
      const r = await (await pedir())
        .input('id', sql.NVarChar(36), id)
        .query('DELETE FROM dbo.videos OUTPUT deleted.ruta WHERE id = @id');
      return r.recordset[0]?.ruta ?? null;
    },

    async cargarProyecto(equipoId) {
      const r = await (await pedir())
        .input('e', sql.Int, equipoId)
        .query('SELECT contenido, version, actualizado FROM dbo.proyectos WHERE equipo_id = @e');
      return r.recordset[0] ?? null;
    },

    /** Lo que la sala en tiempo real necesita para abrir: el documento Yjs, o al menos el JSON. */
    async cargarSala(equipoId) {
      const r = await (await pedir())
        .input('e', sql.Int, equipoId)
        .query('SELECT estado_yjs AS estado, contenido FROM dbo.proyectos WHERE equipo_id = @e');
      return r.recordset[0] ?? null;
    },

    /** Guarda el documento de la sala y su JSON; con `copia`, deja además una versión. */
    async guardarSala(equipoId, estado, contenido, copia) {
      const p = await conexion();
      const t = new sql.Transaction(p);
      await t.begin();
      try {
        const escrito = await new sql.Request(t)
          .input('e', sql.Int, equipoId)
          .input('c', sql.NVarChar(sql.MAX), contenido ?? '{}')
          .input('y', sql.VarBinary(sql.MAX), estado).query(`
            MERGE dbo.proyectos WITH (HOLDLOCK) AS t USING (SELECT @e AS equipo_id) AS s ON t.equipo_id = s.equipo_id
            WHEN MATCHED THEN UPDATE SET contenido = @c, estado_yjs = @y, version = t.version + 1, actualizado = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT (equipo_id, contenido, estado_yjs, version) VALUES (@e, @c, @y, 1)
            OUTPUT inserted.id, inserted.version;`);
        const { id, version } = escrito.recordset[0];
        if (copia) {
          await new sql.Request(t)
            .input('p', sql.Int, id)
            .input('c', sql.NVarChar(sql.MAX), contenido ?? '{}')
            .input('y', sql.VarBinary(sql.MAX), estado)
            .input('v', sql.Int, version)
            .input('m', sql.NVarChar(40), copia)
            .query('INSERT INTO dbo.versiones (proyecto_id, contenido, estado_yjs, version, motivo) VALUES (@p, @c, @y, @v, @m)');
        }
        await t.commit();
      } catch (error) {
        await t.rollback().catch(() => {});
        throw error;
      }
    },

    // ---------- para llevar y traer todo (plan C) ----------

    async listarEquipos() {
      const r = await (await pedir()).query(
        'SELECT id, nombre, codigo, pin_hash AS claveHash, congelado, creado FROM dbo.equipos ORDER BY id',
      );
      return r.recordset;
    },

    /** Congela (o descongela) un equipo, o todos si `equipoId` es null. */
    async congelar(equipoId, valor) {
      const r = (await pedir()).input('v', sql.Bit, valor);
      if (equipoId === null) await r.query('UPDATE dbo.equipos SET congelado = @v');
      else await r.input('e', sql.Int, equipoId).query('UPDATE dbo.equipos SET congelado = @v WHERE id = @e');
    },

    async listarVersiones(equipoId) {
      const r = await (await pedir()).input('e', sql.Int, equipoId).query(`
        SELECT TOP 200 v.id, v.version, v.motivo, v.fecha
        FROM dbo.versiones v JOIN dbo.proyectos p ON p.id = v.proyecto_id
        WHERE p.equipo_id = @e ORDER BY v.fecha DESC`);
      return r.recordset.map((v) => ({ ...v, id: String(v.id) }));
    },

    async versionPorId(equipoId, id) {
      const r = await (await pedir()).input('e', sql.Int, equipoId).input('id', sql.Int, Number(id)).query(`
        SELECT v.contenido FROM dbo.versiones v JOIN dbo.proyectos p ON p.id = v.proyecto_id
        WHERE p.equipo_id = @e AND v.id = @id`);
      return r.recordset[0] ?? null;
    },

    async listarProyectos() {
      const r = await (await pedir()).query(
        'SELECT equipo_id AS equipoId, contenido, estado_yjs AS estado, version, actualizado FROM dbo.proyectos',
      );
      return r.recordset;
    },

    async listarArchivos() {
      const r = await (await pedir()).query(
        'SELECT id, equipo_id AS equipoId, ruta, tipo, bytes, persona, creado FROM dbo.archivos',
      );
      return r.recordset.map((a) => ({ ...a, bytes: Number(a.bytes) }));
    },

    async registrarArchivo({ id, equipoId, ruta, tipo, bytes, persona }) {
      await (await pedir())
        .input('id', sql.NVarChar(36), id)
        .input('e', sql.Int, equipoId)
        .input('r', sql.NVarChar(200), ruta)
        .input('t', sql.NVarChar(100), tipo)
        .input('b', sql.BigInt, bytes)
        .input('p', sql.NVarChar(40), persona)
        .query('INSERT INTO dbo.archivos (id, equipo_id, ruta, tipo, bytes, persona) VALUES (@id, @e, @r, @t, @b, @p)');
    },

    async archivoPorId(id) {
      const r = await (await pedir())
        .input('id', sql.NVarChar(36), id)
        .query('SELECT id, equipo_id AS equipoId, ruta, tipo, bytes FROM dbo.archivos WHERE id = @id');
      const fila = r.recordset[0];
      return fila ? { ...fila, bytes: Number(fila.bytes) } : null;
    },

    async registrar(equipoId, tipo, detalle) {
      await (await pedir())
        .input('e', sql.Int, equipoId ?? null)
        .input('t', sql.NVarChar(30), tipo)
        .input('d', sql.NVarChar(400), detalle?.slice(0, 400) ?? null)
        .query('INSERT INTO dbo.actividad (equipo_id, tipo, detalle) VALUES (@e, @t, @d)');
    },

    async cerrar() {
      await pool?.close();
    },
  };
}
