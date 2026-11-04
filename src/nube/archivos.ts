// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Que las voces, fotos y sonidos viajen entre tablets.
 *
 * Al grabar o elegir un archivo, la app lo usa con una URL «blob:» que solo
 * existe en esta tablet. Aquí se buscan esas URLs en el proyecto, se sube
 * cada archivo al servidor y se cambia la URL por la suya (`/api/archivos/…`),
 * que el resto del equipo sí puede abrir. Si la subida falla, se reintenta.
 */
import type { Proyecto } from '../estado/tipos';
import { archivoDe } from '../estado/guardado';

const REINTENTO = 15_000;
const URL_LOCAL = /blob:[^"\\\s]+/g;

/** Las que ya se están subiendo, para no subir dos veces. */
const enCamino = new Set<string>();

async function subir(blob: Blob, persona: string): Promise<string> {
  const respuesta = await fetch('/api/archivos', {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
      'X-Sonora-Persona': encodeURIComponent(persona),
    },
    body: blob,
  });
  if (!respuesta.ok) throw new Error(`Subida rechazada (${respuesta.status})`);
  return ((await respuesta.json()) as { url: string }).url;
}

/**
 * Sube los archivos locales que el proyecto usa y que aún no están en la
 * nube. `alSubir` cambia la URL local por la de la nube; `alFallar` pide
 * volver a revisar más tarde.
 */
export function subirLocales(
  proyecto: Proyecto,
  persona: string,
  alSubir: (local: string, nube: string) => void,
  alFallar: () => void,
) {
  const usadas = new Set(JSON.stringify(proyecto).match(URL_LOCAL) ?? []);
  for (const local of usadas) {
    const blob = archivoDe(local);
    // Una URL «blob:» que esta tablet no conoce vino de otra que aún no la subió.
    if (!blob || enCamino.has(local)) continue;
    enCamino.add(local);
    subir(blob, persona)
      .then((nube) => alSubir(local, nube))
      .catch(() => window.setTimeout(alFallar, REINTENTO))
      .finally(() => enCamino.delete(local));
  }
}

/** Cambia, en todo el proyecto, cada texto igual a `de` por `a`. */
export function cambiarUrl(valor: unknown, de: string, a: string): void {
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => {
      if (v === de) valor[i] = a;
      else cambiarUrl(v, de, a);
    });
  } else if (valor && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    for (const [k, v] of Object.entries(objeto)) {
      if (v === de) objeto[k] = a;
      else cambiarUrl(v, de, a);
    }
  }
}
