// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Crear un equipo, o cambiarle la contraseña si ya existe (lo normal es
 * hacerlo desde el panel, entrando como Admin):
 *
 *   npm run equipo -- "Los Truenos" "una contraseña"
 *
 * Usa los mismos datos que el servidor: Azure SQL si SQL_SERVIDOR está
 * definido (con la sesión de `az login`), o la carpeta local si no.
 */
import { abrirDatos } from '../datos/index.js';
import { NOMBRE_ADMIN, claveValida, hashClave, normalizarNombre } from '../seguridad.js';

const [nombreDado, clave] = process.argv.slice(2);
const nombre = String(nombreDado ?? '').trim().replace(/\s+/g, ' ');
const normal = normalizarNombre(nombre);
if (!normal || normal === NOMBRE_ADMIN || !claveValida(clave)) {
  console.error('Uso: npm run equipo -- "Nombre del equipo" "contraseña"   (contraseña de 4 a 64 caracteres; «Admin» está reservado)');
  process.exit(1);
}

const datos = await abrirDatos();
const existente = await datos.equipoPorNombre(normal);
if (existente) {
  await datos.actualizarEquipo(existente.id, { claveHash: hashClave(clave) });
  console.log(`Actualizado: ${existente.nombre} · contraseña nueva · id ${existente.id}`);
} else {
  const id = await datos.crearEquipo({ nombre, normal, claveHash: hashClave(clave) });
  await datos.registrar(id, 'equipo-creado', nombre);
  console.log(`Creado: ${nombre} · id ${id}`);
}
await datos.cerrar();
