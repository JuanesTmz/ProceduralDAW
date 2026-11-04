// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La conversación con el servidor de SONORA. Solo existe en la versión de la
 * nube (`--mode nube`); la de GitHub Pages sigue guardando solo en la tablet.
 */
export const EN_NUBE = import.meta.env.MODE === 'nube';

export interface Equipo {
  id: number;
  nombre: string;
}

/** Quién entró: un equipo, o el panel (con el nombre «Admin»). */
export type Sesion = { equipo: Equipo; admin?: undefined } | { admin: true; equipo?: undefined };

/** `estado` 0 quiere decir que no se llegó al servidor. */
export class ErrorApi extends Error {
  readonly estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: string): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api/${ruta}`, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo,
    });
  } catch {
    throw new ErrorApi(0, 'No hay conexión con SONORA.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos.error ?? 'Algo falló. Prueba otra vez.');
  return datos as T;
}

export const api = {
  sesion: () => pedir<Sesion>('GET', 'sesion'),
  entrar: (equipo: string, clave: string) => pedir<Sesion>('POST', 'entrar', JSON.stringify({ equipo, clave })),
  salir: () => pedir<unknown>('POST', 'salir'),
};
