// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Copia manual del proyecto (plan de emergencia): un .zip con el proyecto y
 * sus archivos (voces, fotos, sonidos). Sirve para mover el trabajo de una
 * tablet a otra sin internet, para traerlo del plan C, o para guardarlo aparte.
 *
 * Dentro del .zip: `proyecto.json` (con cada archivo cambiado por
 * `copia:archivos/<n>`) y la carpeta `archivos/`.
 */
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import type { Proyecto } from '../estado/tipos';
import { crearUrl } from '../estado/guardado';

const ARCHIVOS = /(?:blob:[^"\\\s]+|\/api\/archivos\/[0-9a-f-]{36})/g;
const PREFIJO = 'copia:';

const EXTENSION: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
};

interface Manifiesto {
  formato: 1;
  equipo: string;
  fecha: string;
  /** Archivo dentro del .zip → su tipo. */
  tipos: Record<string, string>;
  proyecto: Proyecto;
}

/** Arma el .zip y lo descarga. Si un archivo no se puede leer, la copia sale sin él. */
export async function descargarCopia(proyecto: Proyecto, equipo: string): Promise<{ faltan: number }> {
  let texto = JSON.stringify(proyecto);
  const urls = [...new Set(texto.match(ARCHIVOS) ?? [])];
  const contenido: Record<string, Uint8Array> = {};
  const tipos: Record<string, string> = {};
  let faltan = 0;
  for (const [i, url] of urls.entries()) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const nombre = `archivos/${i + 1}.${EXTENSION[blob.type.split(';')[0]] ?? 'bin'}`;
      contenido[nombre] = new Uint8Array(await blob.arrayBuffer());
      tipos[nombre] = blob.type;
      texto = texto.split(url).join(PREFIJO + nombre);
    } catch {
      faltan++;
    }
  }
  const fecha = new Date();
  const manifiesto: Manifiesto = { formato: 1, equipo, fecha: fecha.toISOString(), tipos, proyecto: JSON.parse(texto) };
  contenido['proyecto.json'] = strToU8(JSON.stringify(manifiesto, null, 1));
  // Audio e imágenes ya vienen comprimidos: se guardan tal cual, es más rápido en la tablet.
  const zip = zipSync(contenido, { level: 0 });

  const enlace = document.createElement('a');
  const dia = fecha.toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
  enlace.download = `sonora-${equipo.replace(/[^\p{L}\p{N}]+/gu, '-')}-${dia}.zip`;
  enlace.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
  return { faltan };
}

/** Lee un .zip de copia y devuelve el proyecto, con sus archivos listos para usar (y subir). */
export async function leerCopia(archivo: File): Promise<Proyecto> {
  const partes = unzipSync(new Uint8Array(await archivo.arrayBuffer()));
  const json = partes['proyecto.json'];
  if (!json) throw new Error('Ese archivo no es una copia de SONORA.');
  const manifiesto = JSON.parse(strFromU8(json)) as Manifiesto;
  if (manifiesto.formato !== 1 || !manifiesto.proyecto) throw new Error('Ese archivo no es una copia de SONORA.');
  let texto = JSON.stringify(manifiesto.proyecto);
  for (const [nombre, tipo] of Object.entries(manifiesto.tipos)) {
    const datos = partes[nombre];
    if (!datos) continue;
    // `crearUrl` lo anota: así se sube a la nube como cualquier grabación nueva.
    const url = crearUrl(new Blob([datos], { type: tipo }));
    texto = texto.split(PREFIJO + nombre).join(url);
  }
  return JSON.parse(texto) as Proyecto;
}
