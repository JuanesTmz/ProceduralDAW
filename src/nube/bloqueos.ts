// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Bloqueos: una pieza del proyecto la mueve una persona a la vez.
 *
 * Cada pieza que se puede tocar lleva `data-bloqueo="<nombre>"` en el HTML
 * (por ejemplo `escena:<id>:capa:<pista>`). Al tocarla, esta tablet le pide
 * la pieza al servidor, que se la da a la primera que llega; al levantar el
 * dedo o salir del texto, la suelta. Mientras otra persona la tiene, aquí se
 * ve atenuada, con su nombre y su color, y no responde (ver nube.css).
 *
 * Así cada componente solo tiene que nombrar sus piezas: tomar, renovar,
 * soltar y pintar lo hace este módulo para toda la app.
 */
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { WebsocketProvider } from 'y-websocket';
import type { Persona } from './contexto';

const BLOQUEOS = 10;

export type TipoBloqueo = 'toque' | 'texto' | 'voz';

/** Cuánto dura cada tipo sin renovar, y cada cuánto se renueva. */
const VIDA: Record<TipoBloqueo, number> = { toque: 6_000, texto: 60_000, voz: 30_000 };
const RENOVAR: Record<TipoBloqueo, number> = { toque: 2_000, texto: 15_000, voz: 10_000 };

const AVISO: Record<string, string> = {
  toque: 'lo está moviendo',
  texto: 'está escribiendo',
  voz: 'está grabando',
};

export interface Dueno {
  id: number;
  nombre: string;
  color: string;
  tipo: string;
}

export interface Bloqueos {
  /** Quién tiene la pieza, si es otra persona. */
  ajeno(clave: string): Dueno | null;
  /** Toma la pieza por un motivo; devuelve false si ya es de otra persona. */
  tomar(clave: string, tipo: TipoBloqueo): boolean;
  soltar(clave: string, tipo: TipoBloqueo): void;
  /** Suelta todo lo de esta tablet (al salir de la página). */
  soltarTodo(): void;
  suscribir(oyente: () => void): () => void;
  cambiarPersona(persona: Persona): void;
  cerrar(): void;
}

export function crearBloqueos(proveedor: WebsocketProvider, persona: Persona): Bloqueos {
  let tabla: Record<string, Dueno> = {};
  let yo = persona;
  const miId = proveedor.doc.clientID;
  // Lo que esta tablet tiene, con los motivos (un texto se toca y además tiene el foco).
  const mias = new Map<string, { motivos: Set<TipoBloqueo>; reloj: number }>();
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach((o) => o());

  function mandar(datos: object) {
    const ws = proveedor.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, BLOQUEOS);
    encoding.writeVarString(e, JSON.stringify(datos));
    ws.send(encoding.toUint8Array(e));
  }

  const vida = (motivos: Set<TipoBloqueo>) => Math.max(...[...motivos].map((m) => VIDA[m]));
  const tipoDe = (motivos: Set<TipoBloqueo>) => (motivos.has('voz') ? 'voz' : motivos.has('texto') ? 'texto' : 'toque');
  const pedir = (clave: string, motivos: Set<TipoBloqueo>) =>
    mandar({ op: 'pedir', clave, ttl: vida(motivos), tipo: tipoDe(motivos), id: miId, nombre: yo.nombre, color: yo.color });

  proveedor.messageHandlers[BLOQUEOS] = (_e, d) => {
    try {
      tabla = (JSON.parse(decoding.readVarString(d)) as { tabla: Record<string, Dueno> }).tabla ?? {};
    } catch {
      return;
    }
    avisar();
  };

  // Al reconectar, el servidor ya soltó lo de esta tablet: se vuelve a pedir lo que se sigue usando.
  const alEstado = ({ status }: { status: string }) => {
    if (status === 'connected') for (const [clave, m] of mias) pedir(clave, m.motivos);
    else tabla = {};
    avisar();
  };
  proveedor.on('status', alEstado);

  const ajeno = (clave: string) => {
    const d = tabla[clave];
    return d && d.id !== miId ? d : null;
  };

  return {
    ajeno,
    tomar(clave, tipo) {
      if (ajeno(clave)) return false;
      const mia = mias.get(clave);
      if (mia) {
        mia.motivos.add(tipo);
      } else {
        const motivos = new Set<TipoBloqueo>([tipo]);
        const reloj = window.setInterval(() => pedir(clave, motivos), RENOVAR[tipo]);
        mias.set(clave, { motivos, reloj });
      }
      pedir(clave, mias.get(clave)!.motivos);
      return true;
    },
    soltar(clave, tipo) {
      const mia = mias.get(clave);
      if (!mia) return;
      mia.motivos.delete(tipo);
      if (mia.motivos.size > 0) return;
      window.clearInterval(mia.reloj);
      mias.delete(clave);
      mandar({ op: 'soltar', clave });
    },
    soltarTodo() {
      for (const [clave, m] of mias) {
        window.clearInterval(m.reloj);
        mandar({ op: 'soltar', clave });
      }
      mias.clear();
    },
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    cambiarPersona(p) {
      yo = p;
    },
    cerrar() {
      proveedor.off('status', alEstado);
      for (const m of mias.values()) window.clearInterval(m.reloj);
      mias.clear();
    },
  };
}

// ---------- en la pantalla ----------

/** Cuánto se espera tras levantar el dedo: así el último cambio llega antes que el aviso de soltar. */
const DESPUES_DEL_TOQUE = 250;
/** Sin escribir este rato, el texto se suelta aunque siga con el foco. */
const TEXTO_QUIETO = 45_000;

const piezaDe = (nodo: EventTarget | null) =>
  nodo instanceof Element ? nodo.closest<HTMLElement>('[data-bloqueo]') : null;
const esTexto = (nodo: EventTarget | null) =>
  nodo instanceof HTMLTextAreaElement ||
  (nodo instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button', 'file', 'color'].includes(nodo.type));

/**
 * Conecta los bloqueos con la página: toma y suelta según lo que toca esta
 * persona, y marca las piezas que tienen las demás. Devuelve cómo apagarlo.
 */
export function instalarBloqueos(bloqueos: Bloqueos): () => void {
  const quietud = new Map<string, number>();

  const alTocar = (ev: PointerEvent) => {
    const pieza = piezaDe(ev.target);
    const clave = pieza?.dataset.bloqueo;
    if (!clave) return;
    if (!bloqueos.tomar(clave, 'toque')) {
      // De otra persona: no llega al control (además de lo que bloquea el CSS).
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    const fin = () => {
      window.removeEventListener('pointerup', fin, true);
      window.removeEventListener('pointercancel', fin, true);
      window.setTimeout(() => bloqueos.soltar(clave, 'toque'), DESPUES_DEL_TOQUE);
    };
    window.addEventListener('pointerup', fin, true);
    window.addEventListener('pointercancel', fin, true);
  };

  const soltarTexto = (clave: string) => {
    window.clearTimeout(quietud.get(clave));
    quietud.delete(clave);
    bloqueos.soltar(clave, 'texto');
  };
  const vigilarTexto = (clave: string) => {
    window.clearTimeout(quietud.get(clave));
    quietud.set(clave, window.setTimeout(() => soltarTexto(clave), TEXTO_QUIETO));
  };
  const alEnfocar = (ev: FocusEvent) => {
    const clave = piezaDe(ev.target)?.dataset.bloqueo;
    if (!clave || !esTexto(ev.target)) return;
    if (!bloqueos.tomar(clave, 'texto')) {
      (ev.target as HTMLElement).blur();
      return;
    }
    vigilarTexto(clave);
  };
  const alDesenfocar = (ev: FocusEvent) => {
    const clave = piezaDe(ev.target)?.dataset.bloqueo;
    if (clave && esTexto(ev.target)) soltarTexto(clave);
  };
  const alEscribir = (ev: Event) => {
    const clave = piezaDe(ev.target)?.dataset.bloqueo;
    if (!clave || !esTexto(ev.target)) return;
    // Volver a escribir tras soltarlo por quietud lo toma de nuevo.
    if (!quietud.has(clave) && !bloqueos.tomar(clave, 'texto')) return;
    vigilarTexto(clave);
  };

  // Pintar: cada pieza de otra persona lleva su nombre y su color.
  let pendiente = 0;
  const pintar = () => {
    pendiente = 0;
    for (const pieza of document.querySelectorAll<HTMLElement>('[data-bloqueo]')) {
      const dueno = bloqueos.ajeno(pieza.dataset.bloqueo!);
      const texto = dueno ? `${dueno.nombre} ${AVISO[dueno.tipo] ?? AVISO.toque}` : null;
      if (texto) {
        if (pieza.dataset.bloqueadoPor !== texto) pieza.dataset.bloqueadoPor = texto;
        pieza.style.setProperty('--bloqueo-color', dueno!.color);
        // También como variable: así el aviso puede ir en un hijo (filas con display: contents).
        pieza.style.setProperty('--bloqueo-texto', JSON.stringify(texto));
      } else if (pieza.dataset.bloqueadoPor !== undefined) {
        delete pieza.dataset.bloqueadoPor;
        pieza.style.removeProperty('--bloqueo-color');
        pieza.style.removeProperty('--bloqueo-texto');
      }
    }
  };
  const programar = () => {
    pendiente ||= window.requestAnimationFrame(pintar);
  };
  // React puede rehacer una pieza en cualquier momento: se vuelve a pintar cuando cambia la página.
  const observador = new MutationObserver(programar);
  observador.observe(document.body, { childList: true, subtree: true });
  const dejar = bloqueos.suscribir(programar);

  document.addEventListener('pointerdown', alTocar, true);
  document.addEventListener('focusin', alEnfocar, true);
  document.addEventListener('focusout', alDesenfocar, true);
  document.addEventListener('input', alEscribir, true);
  // Al cerrar o salir de la página no se espera a que venzan.
  const alSalir = () => bloqueos.soltarTodo();
  window.addEventListener('pagehide', alSalir);
  programar();

  return () => {
    document.removeEventListener('pointerdown', alTocar, true);
    document.removeEventListener('focusin', alEnfocar, true);
    document.removeEventListener('focusout', alDesenfocar, true);
    document.removeEventListener('input', alEscribir, true);
    window.removeEventListener('pagehide', alSalir);
    observador.disconnect();
    dejar();
    window.cancelAnimationFrame(pendiente);
    for (const reloj of quietud.values()) window.clearTimeout(reloj);
  };
}
