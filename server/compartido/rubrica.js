// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La rúbrica con la que los admins califican la pieza final de cada equipo.
 * La usan el servidor (para promediar y ordenar el ranking) y el panel (para
 * mostrarla). Es la del documento «Rúbrica de calificación · Reto final».
 *
 * Cada criterio recibe una nota escrita de 1 a 5, con máximo un decimal. Las
 * descripciones de Logrado (5), Parcial (3) y No logrado (1) son la guía. La
 * nota final también va de 1 a 5: el promedio de los criterios, cada uno con
 * su peso (los pesos suman 100).
 *
 * `pregunta` es lo que mira el jurado en ese criterio; `icono`, cómo se ve en
 * el panel.
 */

export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;

/** Los tres niveles de la rúbrica, como guía de qué nota poner. */
export const GUIAS = [
  { id: 'logrado', nombre: 'Logrado', nota: 5 },
  { id: 'parcial', nombre: 'Parcial', nota: 3 },
  { id: 'no', nombre: 'No logrado', nota: 1 },
];

export const CRITERIOS = [
  {
    id: 'relato',
    nombre: 'El relato',
    corto: 'Relato',
    peso: 25,
    icono: '📖',
    pregunta: '¿El monólogo cuenta una historia que vale la pena, con inicio, giro y cierre, y las escenas siguen ese arco?',
    guias: {
      logrado: 'El monólogo (unas 100 palabras) cuenta una historia que vale la pena, con inicio, giro y cierre claros. Las escenas siguen ese arco.',
      parcial: 'Hay historia, pero se dispersa, se queda en descripción o el arco no se nota.',
      no: 'No hay monólogo o es una lista de ideas sueltas.',
    },
  },
  {
    id: 'medellin',
    nombre: 'Arraigo en Medellín',
    corto: 'Medellín',
    peso: 15,
    icono: '📍',
    pregunta: '¿Se reconoce Medellín en el tema y en la pieza: lugares, palabras, personas, sonidos o fotos del territorio?',
    guias: {
      logrado: 'El tema es reconocible de Medellín y la pieza muestra por qué: lugares, palabras, personas, sonidos o fotos del territorio.',
      parcial: 'Se menciona la ciudad, pero la historia podría pasar en cualquier lugar.',
      no: 'Nada en la pieza la conecta con Medellín.',
    },
  },
  {
    id: 'voz',
    nombre: 'La voz',
    corto: 'Voz',
    peso: 15,
    icono: '🎙️',
    pregunta: '¿Cada escena tiene su narración, se entiende y el tono acompaña lo que se cuenta?',
    guias: {
      logrado: 'Cada escena tiene su narración, se entiende bien y el tono acompaña lo que se cuenta. La voz coincide con el texto.',
      parcial: 'Se oye la voz, pero hay escenas sin narrar, partes que no se entienden o un tono plano.',
      no: 'No hay voz grabada o casi no se escucha.',
    },
  },
  {
    id: 'musica',
    nombre: 'Música al servicio del relato',
    corto: 'Música',
    peso: 15,
    icono: '🎵',
    pregunta: '¿La música cambia de una escena a otra con la emoción y la fuerza del momento, sin tapar la voz?',
    guias: {
      logrado: 'La música cambia entre escenas según la emoción y la intensidad del momento, y la base está retocada con intención.',
      parcial: 'Hay música, pero suena igual en toda la pieza o choca con lo que se cuenta.',
      no: 'No hay música o tapa la voz todo el tiempo.',
    },
  },
  {
    id: 'sonidos',
    nombre: 'Material sonoro',
    corto: 'Sonidos',
    peso: 10,
    icono: '🔊',
    pregunta: '¿Usan sonidos propios o de la Sonoteca que tienen que ver con la historia y suenan en el momento justo?',
    guias: {
      logrado: 'Usan sonidos grabados por el equipo o de la Sonoteca que tienen que ver con la historia y aparecen en el momento justo.',
      parcial: 'Hay sonidos propios o elegidos, pero sin relación clara con el tema.',
      no: 'Solo suenan los sonidos por defecto.',
    },
  },
  {
    id: 'visual',
    nombre: 'Visual',
    corto: 'Visual',
    peso: 15,
    icono: '🎨',
    pregunta: '¿La imagen tiene que ver con el tema, reacciona al sonido y cambia con las escenas?',
    guias: {
      logrado: 'Hay imágenes del tema, el visual reacciona al sonido y cambia con las escenas; los parámetros asignados se notan.',
      parcial: 'Hay visual, pero es el de partida casi sin cambios o no acompaña la historia.',
      no: 'No hay visual o es una pantalla fija sin relación.',
    },
  },
  {
    id: 'pieza',
    nombre: 'Pieza terminada',
    corto: 'Pieza',
    peso: 5,
    icono: '🎬',
    pregunta: '¿El video está completo, dura 2:30 o menos y la voz se oye sobre la música?',
    guias: {
      logrado: 'El video está en la galería, dura 2:30 o menos, se ve completo y la mezcla deja oír la voz sobre la música.',
      parcial: 'El video existe, pero está cortado, se pasa del tiempo o la mezcla falla en partes.',
      no: 'No enviaron el video.',
    },
  },
];

const PESO_TOTAL = CRITERIOS.reduce((s, c) => s + c.peso, 0);

/**
 * Lee una nota escrita («4», «4,5», «4.5»). Devuelve el número, o null si no
 * es un número entre 1 y 5 con máximo un decimal.
 */
export function leerNota(valor) {
  if (typeof valor === 'number') valor = String(valor);
  if (typeof valor !== 'string') return null;
  const texto = valor.trim().replace(',', '.');
  if (!/^\d(\.\d)?$/.test(texto)) return null;
  const nota = Number(texto);
  return nota >= NOTA_MINIMA && nota <= NOTA_MAXIMA ? nota : null;
}

/** Se queda solo con criterios que existen y notas válidas. */
export function limpiarNotas(notas) {
  const limpio = {};
  for (const c of CRITERIOS) {
    const nota = leerNota(notas?.[c.id]);
    if (nota !== null) limpio[c.id] = nota;
  }
  return limpio;
}

/** Una calificación cuenta para el ranking cuando tiene todos los criterios. */
export function completa(notas) {
  return CRITERIOS.every((c) => leerNota(notas?.[c.id]) !== null);
}

const redondear = (x) => Math.round(x * 100) / 100;

/** La nota final (1 a 5, con dos decimales), o null si falta algún criterio. */
export function notaFinal(notas) {
  if (!completa(notas)) return null;
  return redondear(CRITERIOS.reduce((s, c) => s + leerNota(notas[c.id]) * c.peso, 0) / PESO_TOTAL);
}

/**
 * El ranking: por equipo, el promedio de las notas finales de los jurados que
 * calificaron completo. Empate: gana mejor nota en El relato y, si sigue, en
 * Medellín. Los equipos sin ninguna calificación completa no entran.
 *
 * `equipos`: [{ id, nombre }]; `calificaciones`: [{ equipoId, notas }].
 */
export function armarRanking(equipos, calificaciones) {
  const filas = [];
  for (const e of equipos) {
    const suyas = calificaciones.filter((c) => c.equipoId === e.id && completa(c.notas));
    if (suyas.length === 0) continue;
    const criterios = {};
    for (const c of CRITERIOS) {
      criterios[c.id] = redondear(suyas.reduce((s, x) => s + leerNota(x.notas[c.id]), 0) / suyas.length);
    }
    const total = redondear(suyas.reduce((s, x) => s + notaFinal(x.notas), 0) / suyas.length);
    filas.push({ equipoId: e.id, nombre: e.nombre, total, criterios, jurados: suyas.length });
  }
  filas.sort(
    (a, b) => b.total - a.total || b.criterios.relato - a.criterios.relato || b.criterios.medellin - a.criterios.medellin,
  );
  // Misma nota en todo = mismo puesto.
  filas.forEach((f, i) => {
    const antes = filas[i - 1];
    const igual =
      antes && antes.total === f.total && antes.criterios.relato === f.criterios.relato && antes.criterios.medellin === f.criterios.medellin;
    f.puesto = igual ? antes.puesto : i + 1;
  });
  return filas;
}
