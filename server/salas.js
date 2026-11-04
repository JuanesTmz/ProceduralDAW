// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Las salas en tiempo real: una por equipo, con su documento Yjs en memoria.
 *
 * Habla el protocolo de y-websocket: mensajes de sincronía (0), de presencia
 * (1: quién está y con qué color), de pedir la presencia (3) y, propio de
 * SONORA, de bloqueos (10: quién tiene tomada cada pieza) y estado de la sala (11: congelada o
 * solo para mirar). Todo cambio
 * que llega se reparte a las demás tablets de la sala; el documento se
 * guarda en la base un ratito después y cuando se va el último.
 *
 * Funciona con una sola réplica: todas las tablets de un equipo tienen que
 * llegar al mismo proceso.
 */
import * as Y from 'yjs';
import * as sync from 'y-protocols/sync';
import * as presencia from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocketServer } from 'ws';
import { crearConversor } from './compartido/proyectoYjs.js';

const conversor = crearConversor(Y);

const SINCRONIA = 0;
const PRESENCIA = 1;
const PEDIR_PRESENCIA = 3;
/** Propio de SONORA: pedir y soltar bloqueos, y la tabla de quién tiene qué. */
const BLOQUEOS = 10;
/** Propio de SONORA: el estado de la sala para esta conexión (congelada, solo mirar). */
const ESTADO_SALA = 11;
/** Nadie retiene una pieza más que esto sin renovarla. */
const BLOQUEO_MAXIMO = 120_000;

const ESPERA_GUARDADO = 2_000;
const MAXIMO_SIN_GUARDAR = 10_000;
const CADA_COPIA = 5 * 60 * 1000;
/** Container Apps corta conexiones calladas: un ping cada tanto las mantiene y descubre las muertas. */
const LATIDO = 25_000;

function mensaje(tipo, escribir) {
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, tipo);
  escribir(e);
  return encoding.toUint8Array(e);
}

function enviar(ws, datos) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(datos, (error) => error && ws.close());
}

export function crearSalas(datos) {
  const salas = new Map();
  /** Las salas ya abiertas (sin esperar), para el panel. */
  const abiertas = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 20 * 1024 * 1024 });

  // ---------- guardar ----------

  function programarGuardado(sala) {
    sala.sucio = true;
    sala.desde ||= Date.now();
    if (sala.reloj) clearTimeout(sala.reloj);
    const espera = Math.min(ESPERA_GUARDADO, MAXIMO_SIN_GUARDAR - (Date.now() - sala.desde));
    sala.reloj = setTimeout(() => void guardar(sala), Math.max(0, espera));
  }

  /** Guarda lo pendiente; con `motivo`, además deja una versión con ese motivo. */
  function guardar(sala, motivo = null) {
    if (sala.reloj) clearTimeout(sala.reloj);
    sala.reloj = null;
    if (!sala.sucio && !motivo) return sala.guardando;
    sala.sucio = false;
    sala.desde = 0;
    const estado = Buffer.from(Y.encodeStateAsUpdate(sala.doc));
    const proyecto = conversor.leer(sala.doc);
    const contenido = proyecto ? JSON.stringify(proyecto) : null;
    const copia = motivo ?? (Date.now() - sala.ultimaCopia > CADA_COPIA ? 'automatica' : null);
    sala.guardando = sala.guardando
      .then(() => datos.guardarSala(sala.equipoId, estado, contenido, copia))
      .then(() => {
        if (copia) sala.ultimaCopia = Date.now();
      })
      .catch((error) => {
        console.error(`No se pudo guardar la sala ${sala.equipoId}:`, error.message);
        programarGuardado(sala);
      });
    return sala.guardando;
  }

  // ---------- abrir y cerrar salas ----------

  async function crearSala(equipoId) {
    const doc = new Y.Doc();
    const guardado = await datos.cargarSala(equipoId);
    if (guardado?.estado) Y.applyUpdate(doc, guardado.estado);
    // Un proyecto de la fase 1 (solo JSON) entra al documento la primera vez.
    else if (guardado?.contenido) conversor.escribir(doc, null, JSON.parse(guardado.contenido));

    const quienes = new presencia.Awareness(doc);
    quienes.setLocalState(null);
    const sala = {
      equipoId,
      // Al cierre de la hackatón: se puede mirar, no cambiar.
      congelado: Boolean((await datos.equipoPorId(equipoId))?.congelado),
      doc,
      quienes,
      conexiones: new Map(),
      // clave de la pieza → { ws, id, nombre, color, tipo, hasta }
      bloqueos: new Map(),
      sucio: false,
      desde: 0,
      reloj: null,
      ultimaCopia: 0,
      guardando: Promise.resolve(),
    };

    doc.on('update', (cambio) => {
      const m = mensaje(SINCRONIA, (e) => sync.writeUpdate(e, cambio));
      for (const ws of sala.conexiones.keys()) enviar(ws, m);
      programarGuardado(sala);
    });
    quienes.on('update', ({ added, updated, removed }, ws) => {
      // Se anota qué clientes vienen por cada conexión para borrarlos cuando se cae.
      const ids = ws ? sala.conexiones.get(ws) : null;
      if (ids) {
        for (const id of added) ids.add(id);
        for (const id of removed) ids.delete(id);
      }
      const cambiados = [...added, ...updated, ...removed];
      const m = mensaje(PRESENCIA, (e) =>
        encoding.writeVarUint8Array(e, presencia.encodeAwarenessUpdate(quienes, cambiados)),
      );
      for (const otro of sala.conexiones.keys()) enviar(otro, m);
    });
    abiertas.set(equipoId, sala);
    return sala;
  }

  function obtenerSala(equipoId) {
    let sala = salas.get(equipoId);
    if (!sala) {
      sala = crearSala(equipoId);
      salas.set(equipoId, sala);
      sala.catch(() => salas.delete(equipoId));
    }
    return sala;
  }

  // ---------- bloqueos: la primera tablet que pide una pieza se la queda ----------

  function tablaBloqueos(sala) {
    const tabla = {};
    for (const [clave, b] of sala.bloqueos) tabla[clave] = { id: b.id, nombre: b.nombre, color: b.color, tipo: b.tipo };
    return mensaje(BLOQUEOS, (e) => encoding.writeVarString(e, JSON.stringify({ tabla })));
  }

  function repartirBloqueos(sala) {
    const m = tablaBloqueos(sala);
    for (const ws of sala.conexiones.keys()) enviar(ws, m);
  }

  function pedidoDeBloqueo(sala, ws, texto) {
    let pedido;
    try {
      pedido = JSON.parse(texto);
    } catch {
      return;
    }
    const clave = String(pedido?.clave ?? '').slice(0, 200);
    if (!clave) return;
    const actual = sala.bloqueos.get(clave);
    const ahora = Date.now();
    if (pedido.op === 'pedir') {
      // Ocupada por otra tablet que sigue vigente: no se da (la tabla ya lo dice).
      if (actual && actual.ws !== ws && actual.hasta > ahora) return;
      const nuevo = !actual || actual.ws !== ws;
      sala.bloqueos.set(clave, {
        ws,
        id: Number(pedido.id) || 0,
        nombre: String(pedido.nombre ?? '').slice(0, 40),
        color: String(pedido.color ?? '').slice(0, 20),
        tipo: String(pedido.tipo ?? 'toque').slice(0, 20),
        hasta: ahora + Math.min(Number(pedido.ttl) || 5_000, BLOQUEO_MAXIMO),
      });
      // Renovar no cambia la tabla: solo se reparte cuando cambia de dueño.
      if (nuevo) repartirBloqueos(sala);
    } else if (pedido.op === 'soltar' && actual?.ws === ws) {
      sala.bloqueos.delete(clave);
      repartirBloqueos(sala);
    }
  }

  /** Suelta lo que tenga una conexión (o, sin conexión, lo vencido). */
  function liberar(sala, ws) {
    let cambio = false;
    const ahora = Date.now();
    for (const [clave, b] of sala.bloqueos) {
      if (ws ? b.ws === ws : b.hasta <= ahora) {
        sala.bloqueos.delete(clave);
        cambio = true;
      }
    }
    if (cambio) repartirBloqueos(sala);
  }

  async function soltar(sala, ws) {
    const ids = sala.conexiones.get(ws);
    sala.conexiones.delete(ws);
    if (ids?.size) presencia.removeAwarenessStates(sala.quienes, [...ids], null);
    liberar(sala, ws);
    if (sala.conexiones.size > 0) return;
    await guardar(sala);
    cerrarSiVacia(sala);
  }

  /** Una sala sin nadie se guarda y sale de la memoria. */
  function cerrarSiVacia(sala) {
    // Si alguien volvió mientras se guardaba, la sala sigue abierta.
    if (sala.conexiones.size > 0 || !abiertas.has(sala.equipoId)) return;
    salas.delete(sala.equipoId);
    abiertas.delete(sala.equipoId);
    sala.quienes.destroy();
    sala.doc.destroy();
  }

  function estadoPara(sala, ws) {
    return mensaje(ESTADO_SALA, (e) =>
      encoding.writeVarString(e, JSON.stringify({ congelado: sala.congelado, soloLectura: Boolean(ws.soloLectura) })),
    );
  }

  // ---------- mensajes ----------

  function recibir(sala, ws, datosRecibidos) {
    const d = decoding.createDecoder(datosRecibidos);
    const tipo = decoding.readVarUint(d);
    // Quien solo mira (el panel) o una sala congelada: se responde lo que piden, no se aplica lo que mandan.
    const quieto = ws.soloLectura || sala.congelado;
    if (tipo === SINCRONIA && quieto) {
      if (decoding.readVarUint(d) !== sync.messageYjsSyncStep1) return;
      const e = encoding.createEncoder();
      encoding.writeVarUint(e, SINCRONIA);
      sync.readSyncStep1(d, e, sala.doc);
      enviar(ws, encoding.toUint8Array(e));
    } else if (tipo === SINCRONIA) {
      const e = encoding.createEncoder();
      encoding.writeVarUint(e, SINCRONIA);
      sync.readSyncMessage(d, e, sala.doc, ws);
      if (encoding.length(e) > 1) enviar(ws, encoding.toUint8Array(e));
    } else if (tipo === PRESENCIA) {
      if (ws.soloLectura) return;
      presencia.applyAwarenessUpdate(sala.quienes, decoding.readVarUint8Array(d), ws);
    } else if (tipo === BLOQUEOS) {
      if (quieto) return;
      pedidoDeBloqueo(sala, ws, decoding.readVarString(d));
    } else if (tipo === PEDIR_PRESENCIA) {
      const todos = [...sala.quienes.getStates().keys()];
      enviar(ws, mensaje(PRESENCIA, (e) => encoding.writeVarUint8Array(e, presencia.encodeAwarenessUpdate(sala.quienes, todos))));
    }
  }

  function conectar(ws, equipoId, soloLectura) {
    ws.binaryType = 'arraybuffer';
    ws.soloLectura = soloLectura;
    ws.vivo = true;
    ws.on('pong', () => (ws.vivo = true));
    // Mientras la sala se abre (la base puede estar despertando) los mensajes esperan.
    let sala = null;
    let cerrado = false;
    const enEspera = [];
    ws.on('message', (m) => {
      const datosRecibidos = new Uint8Array(m);
      if (!sala) return void enEspera.push(datosRecibidos);
      try {
        recibir(sala, ws, datosRecibidos);
      } catch (error) {
        console.error('Mensaje inválido:', error.message);
      }
    });
    ws.on('close', () => {
      cerrado = true;
      if (sala) void soltar(sala, ws);
    });

    obtenerSala(equipoId).then(
      (s) => {
        if (cerrado) return;
        sala = s;
        s.conexiones.set(ws, new Set());
        enviar(ws, mensaje(SINCRONIA, (e) => sync.writeSyncStep1(e, s.doc)));
        const todos = [...s.quienes.getStates().keys()];
        if (todos.length > 0) {
          enviar(ws, mensaje(PRESENCIA, (e) => encoding.writeVarUint8Array(e, presencia.encodeAwarenessUpdate(s.quienes, todos))));
        }
        enviar(ws, tablaBloqueos(s));
        enviar(ws, estadoPara(s, ws));
        for (const m of enEspera.splice(0)) recibir(s, ws, m);
      },
      (error) => {
        console.error(`No se pudo abrir la sala ${equipoId}:`, error.message);
        ws.close(1011, 'No se pudo abrir el proyecto');
      },
    );
  }

  // Lo que nadie renovó (un dedo que se fue sin avisar, un texto abandonado) se suelta solo.
  const barrido = setInterval(() => {
    for (const s of salas.values()) void s.then((sala) => liberar(sala, null), () => {});
  }, 1_000);

  const latido = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.vivo) {
        ws.terminate();
        continue;
      }
      ws.vivo = false;
      ws.ping();
    }
  }, LATIDO);

  return {
    /** Recibe un `upgrade` ya autorizado para el equipo `equipoId` (el panel entra a solo mirar). */
    entrar(req, socket, cabeza, equipoId, soloLectura = false) {
      wss.handleUpgrade(req, socket, cabeza, (ws) => conectar(ws, equipoId, soloLectura));
    },

    // ---------- para el panel de administración ----------

    /** Quién está en cada sala abierta, dónde, y qué piezas tiene tomadas. */
    resumen() {
      return [...abiertas.values()].map((sala) => {
        const proyecto = conversor.leer(sala.doc);
        const escenas = Object.fromEntries((proyecto?.escenas ?? []).map((e, i) => [e.id, `${i + 1} · ${e.nombre}`]));
        for (const r of proyecto?.respiros ?? []) escenas[r.id] = 'Respiro';
        const personas = [...sala.quienes.getStates().values()]
          .filter((s) => s.persona)
          .map((s) => ({ ...s.persona, lugar: s.lugar ?? null, ventana: s.ventana ?? null }));
        const bloqueos = [...sala.bloqueos].map(([clave, b]) => ({ clave, nombre: b.nombre, color: b.color, tipo: b.tipo }));
        const mirando = [...sala.conexiones.keys()].filter((ws) => ws.soloLectura).length;
        return { equipoId: sala.equipoId, congelado: sala.congelado, personas, bloqueos, escenas, mirando };
      });
    },

    /** El proyecto como está ahora en la sala, o null si nadie la tiene abierta. */
    proyecto(equipoId) {
      const sala = abiertas.get(equipoId);
      return sala ? conversor.leer(sala.doc) : null;
    },

    /** Congela o descongela una sala abierta (lo guardado en la base lo hace quien llama). */
    congelar(equipoId, valor) {
      const sala = abiertas.get(equipoId);
      if (!sala) return;
      sala.congelado = valor;
      if (valor) {
        sala.bloqueos.clear();
        repartirBloqueos(sala);
      }
      for (const ws of sala.conexiones.keys()) {
        enviar(ws, estadoPara(sala, ws));
        // Al descongelar, se pide a cada tablet lo que haya hecho mientras tanto.
        if (!valor && !ws.soloLectura) enviar(ws, mensaje(SINCRONIA, (e) => sync.writeSyncStep1(e, sala.doc)));
      }
    },

    /** Al borrar un equipo: se cierra su sala sin guardar y se desconecta a quien esté adentro. */
    expulsar(equipoId) {
      const sala = abiertas.get(equipoId);
      if (!sala) return;
      salas.delete(equipoId);
      abiertas.delete(equipoId);
      if (sala.reloj) clearTimeout(sala.reloj);
      for (const ws of sala.conexiones.keys()) ws.close(4403, 'El equipo ya no existe');
      sala.conexiones.clear();
      sala.quienes.destroy();
      sala.doc.destroy();
    },

    soltarBloqueo(equipoId, clave) {
      const sala = abiertas.get(equipoId);
      if (!sala?.bloqueos.delete(clave)) return false;
      repartirBloqueos(sala);
      return true;
    },

    /** Deja ya una versión del proyecto con ese motivo. */
    async guardarVersion(equipoId, motivo) {
      const sala = await obtenerSala(equipoId);
      await guardar(sala, motivo);
      cerrarSiVacia(sala);
    },

    /**
     * Vuelve el proyecto a como estaba en una versión. No borra la historia:
     * antes se deja una versión de cómo estaba, y la vuelta se escribe como un
     * cambio más, que llega en vivo a las tablets conectadas.
     */
    async restaurar(equipoId, contenido) {
      const sala = await obtenerSala(equipoId);
      await guardar(sala, 'antes-de-restaurar');
      conversor.escribir(sala.doc, conversor.leer(sala.doc), JSON.parse(contenido), 'panel');
      await guardar(sala, 'restaurada');
      cerrarSiVacia(sala);
    },
    /** Al apagar el servidor: guardar todas las salas. */
    async cerrar() {
      clearInterval(latido);
      clearInterval(barrido);
      const abiertas = await Promise.allSettled([...salas.values()]);
      await Promise.allSettled(abiertas.filter((r) => r.status === 'fulfilled').map((r) => guardar(r.value)));
      for (const ws of wss.clients) ws.terminate();
    },
  };
}
