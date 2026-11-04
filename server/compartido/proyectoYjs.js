// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El proyecto de SONORA dentro de un documento Yjs, y de vuelta.
 *
 * Lo usan las tablets (para mandar solo lo que cambió y armar lo que llega)
 * y el servidor (para guardar una copia en JSON que se pueda leer). Recibe
 * Yjs como parámetro para que cada lado use su propia copia de la librería.
 *
 * Cómo se reparte:
 * - Los objetos son mapas: dos personas que tocan claves distintas no se pisan.
 * - Las listas de cosas con id (escenas, pistas, conexiones…) son un mapa por
 *   elemento más una lista con el orden: editar dos escenas a la vez se junta
 *   bien, y agregar una no corre las demás.
 * - Las demás listas (pasos de una capa, notas, puntos de un gesto) viajan
 *   enteras: las edita una persona a la vez.
 * - Lo que cada tablet calcula sola (`secciones`) no viaja.
 */

const COLECCIONES = new Set([
  'escenas',
  'respiros',
  'patron.filas',
  'conexiones',
  'conexionesVisual',
  'archivosDatos',
  'sonidos',
  'escenas.*.cajitas',
  'escenas.*.reacciones',
  'respiros.*.cajitas',
  'respiros.*.reacciones',
]);
const DERIVADOS = new Set(['secciones']);
const ORDEN = 'orden';
const ITEMS = 'items';
/** El mapa raíz del documento. */
export const RAIZ = 'proyecto';

const esPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const esColeccion = (ruta) => COLECCIONES.has(ruta.join('.'));
const saltar = (ruta, clave) => ruta.length === 0 && DERIVADOS.has(clave);

export function iguales(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!iguales(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!iguales(a[k], b[k])) return false;
  return true;
}

export function crearConversor(Y) {
  /** Un valor del proyecto convertido a lo que se guarda en el documento. */
  function aY(valor, ruta) {
    if (Array.isArray(valor) && esColeccion(ruta)) {
      const mapa = new Y.Map();
      const orden = new Y.Array();
      const items = new Y.Map();
      orden.push(valor.map((e) => e.id));
      for (const e of valor) items.set(e.id, aY(e, [...ruta, '*']));
      mapa.set(ORDEN, orden);
      mapa.set(ITEMS, items);
      return mapa;
    }
    if (esPlano(valor)) {
      const mapa = new Y.Map();
      for (const [k, v] of Object.entries(valor)) {
        if (v !== undefined && !saltar(ruta, k)) mapa.set(k, aY(v, [...ruta, k]));
      }
      return mapa;
    }
    // Números, textos y listas sueltas van enteros.
    return valor;
  }

  /** Lo guardado en el documento, de vuelta a un objeto común. */
  function aJson(valor, ruta) {
    if (!(valor instanceof Y.Map)) return valor;
    if (esColeccion(ruta)) {
      const items = valor.get(ITEMS);
      const lista = [];
      if (!(items instanceof Y.Map)) return lista;
      const vistos = new Set();
      const orden = valor.get(ORDEN);
      for (const id of orden instanceof Y.Array ? orden.toArray() : []) {
        if (vistos.has(id) || !items.has(id)) continue;
        vistos.add(id);
        lista.push(aJson(items.get(id), [...ruta, '*']));
      }
      // Lo que quedó sin lugar en el orden (dos personas reordenando a la vez) va al final.
      for (const id of [...items.keys()].sort()) {
        if (!vistos.has(id)) lista.push(aJson(items.get(id), [...ruta, '*']));
      }
      return lista;
    }
    const objeto = {};
    for (const [k, v] of valor.entries()) objeto[k] = aJson(v, [...ruta, k]);
    return objeto;
  }

  /**
   * Escribe en `mapa` lo que cambió de `antes` a `ahora`. Lo que llegó de
   * otras tablets y aquí no se tocó (no cambió entre antes y ahora) queda.
   */
  function aplicar(mapa, antes, ahora, ruta) {
    for (const k of Object.keys(antes)) {
      if (ahora[k] === undefined && antes[k] !== undefined && mapa.has(k)) mapa.delete(k);
    }
    for (const [k, v] of Object.entries(ahora)) {
      if (v === undefined || saltar(ruta, k)) continue;
      const r = [...ruta, k];
      const actual = mapa.get(k);
      const previo = antes[k];
      if (actual === undefined) mapa.set(k, aY(v, r));
      else if (iguales(previo, v)) continue;
      else if (actual instanceof Y.Map && Array.isArray(v) && esColeccion(r)) {
        aplicarColeccion(actual, Array.isArray(previo) ? previo : [], v, r);
      } else if (actual instanceof Y.Map && esPlano(v) && !esColeccion(r)) {
        aplicar(actual, esPlano(previo) ? previo : {}, v, r);
      } else mapa.set(k, aY(v, r));
    }
  }

  function aplicarColeccion(mapa, antes, ahora, ruta) {
    const items = mapa.get(ITEMS);
    const orden = mapa.get(ORDEN);
    if (!(items instanceof Y.Map) || !(orden instanceof Y.Array)) {
      mapa.set(ITEMS, aY(ahora, ruta).get(ITEMS));
      return;
    }
    const previos = new Map(antes.map((e) => [e.id, e]));
    const idsAhora = ahora.map((e) => e.id);
    const quedan = new Set(idsAhora);

    // Lo que se borró aquí.
    for (const e of antes) {
      if (quedan.has(e.id)) continue;
      items.delete(e.id);
      const lugar = orden.toArray().indexOf(e.id);
      if (lugar >= 0) orden.delete(lugar, 1);
    }
    // Lo nuevo y lo que cambió por dentro.
    for (const e of ahora) {
      const actual = items.get(e.id);
      const previo = previos.get(e.id);
      if (!(actual instanceof Y.Map)) items.set(e.id, aY(e, [...ruta, '*']));
      else if (!iguales(previo, e)) aplicar(actual, previo ?? {}, e, [...ruta, '*']);
    }
    // El orden: si solo se agregaron, cada nuevo va detrás de su vecino; si se movieron, se reescribe.
    const idsAntes = antes.map((e) => e.id).filter((id) => quedan.has(id));
    const seMovieron = !iguales(
      idsAntes,
      idsAhora.filter((id) => previos.has(id)),
    );
    if (seMovieron) {
      orden.delete(0, orden.length);
      orden.push(idsAhora);
      return;
    }
    idsAhora.forEach((id, i) => {
      if (previos.has(id)) return;
      const lista = orden.toArray();
      const anterior = i > 0 ? lista.indexOf(idsAhora[i - 1]) : -1;
      orden.insert(anterior + 1, [id]);
    });
  }

  return {
    /** El proyecto como objeto, o null si el documento está vacío. */
    leer(doc) {
      const raiz = doc.getMap(RAIZ);
      return raiz.size === 0 ? null : aJson(raiz, []);
    },
    /** Escribe en el documento lo que cambió (`antes` es lo último que se escribió o leyó). */
    escribir(doc, antes, ahora, origen) {
      doc.transact(() => aplicar(doc.getMap(RAIZ), antes ?? {}, ahora, []), origen);
    },
  };
}
