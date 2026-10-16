/**
 * Las escenas del relato y cómo se vuelven música.
 *
 * El estudiante parte su monólogo en escenas y a cada una le da una emoción
 * y una fuerza. El motor de audio no sabe nada de eso: sigue tocando
 * «secciones». Este archivo es el puente: rehace las secciones a partir de
 * las escenas cada vez que algo cambia, así que lo que manda es el relato.
 *
 * La voz pone el tiempo: una escena dura lo que dura su grabación (o, si
 * todavía no está grabada, lo que tardaría en decirse). La música se estira
 * en vueltas enteras del patrón hasta cubrirla.
 */
import type { NombreEscala } from '../generativo/escalas';
import { nuevoId, palabrasDe, segundosPorVuelta } from './proyecto';
import type { Emocion, Escena, Fuerza, Proyecto, Seccion } from './tipos';

/** Límite de la pieza completa, en segundos. */
export const DURACION_MAXIMA = 150;

/** Palabras por segundo al narrar con calma: lo que se estima sin grabación. */
const PALABRAS_POR_SEGUNDO = 2.3;

export interface PerfilEmocion {
  etiqueta: string;
  color: string;
  /** La escala con que suena la melodía en esta emoción. */
  escala: NombreEscala;
  /** Empujón de tempo respecto al general. */
  tempo: number;
  /** Energía de partida; la fuerza la sube o la baja. */
  base: number;
}

export const EMOCIONES: Record<Emocion, PerfilEmocion> = {
  calma: { etiqueta: 'Calma', color: '#6ec8ff', escala: 'mayor', tempo: 0.94, base: 0.32 },
  alegria: { etiqueta: 'Alegría', color: '#ffd166', escala: 'mayor', tempo: 1.05, base: 0.6 },
  tension: { etiqueta: 'Tensión', color: '#ff6b81', escala: 'frigia', tempo: 1.04, base: 0.55 },
  nostalgia: { etiqueta: 'Nostalgia', color: '#b182ff', escala: 'dorica', tempo: 0.96, base: 0.4 },
  misterio: { etiqueta: 'Misterio', color: '#7d8cff', escala: 'menor', tempo: 0.98, base: 0.36 },
  euforia: {
    etiqueta: 'Euforia',
    color: '#ff9f43',
    escala: 'menorPentatonica',
    tempo: 1.08,
    base: 0.75,
  },
};

export const ORDEN_EMOCIONES: Emocion[] = [
  'calma',
  'alegria',
  'tension',
  'nostalgia',
  'misterio',
  'euforia',
];

export const NOMBRE_FUERZA: Record<Fuerza, string> = { 1: 'Suave', 2: 'Media', 3: 'Fuerte' };

function nuevaEscena(numero: number, respiro = false): Escena {
  return {
    id: nuevoId(respiro ? 'respiro' : 'escena'),
    nombre: respiro ? 'Respiro' : `Escena ${numero}`,
    texto: '',
    respiro,
    emocion: respiro ? 'misterio' : 'calma',
    fuerza: 2,
    vozDuracion: 0,
    duracionRespiro: 8,
    despuesDe: -1,
    version: 0,
    propuestasDesde: 0,
  };
}

/**
 * Rehace las escenas con voz a partir del texto y los cortes.
 *
 * Las escenas se conservan por posición: si se mueve un corte, la escena 2
 * sigue siendo la escena 2 con su emoción, su foto y su voz; solo cambia el
 * trozo de texto que le toca. Si aparece una nueva, nace con valores neutros.
 */
export function sincronizarEscenas(p: Proyecto): void {
  const palabras = palabrasDe(p.narracion.texto);
  const cortes = [...new Set(p.cortesEscena)]
    .filter((c) => c > 0 && c < palabras.length)
    .sort((a, b) => a - b);
  p.cortesEscena = cortes;

  const limites = [0, ...cortes, palabras.length];
  const cuantas = palabras.length === 0 ? 0 : limites.length - 1;
  const escenas: Escena[] = [];
  for (let i = 0; i < cuantas; i++) {
    const previa = p.escenas[i] ?? nuevaEscena(i + 1);
    escenas.push({ ...previa, texto: palabras.slice(limites[i], limites[i + 1]).join(' ') });
  }
  p.escenas = escenas;
  // Un respiro colgado de una escena que ya no existe se va al final.
  for (const r of p.respiros) {
    if (r.despuesDe >= escenas.length) r.despuesDe = escenas.length - 1;
  }
}

/** Mueve el límite número `k` a la palabra `indice`, sin cruzar a sus vecinos. */
export function moverCorte(p: Proyecto, k: number, indice: number): void {
  const total = palabrasDe(p.narracion.texto).length;
  const cortes = [...p.cortesEscena].sort((a, b) => a - b);
  const minimo = (cortes[k - 1] ?? 0) + 1;
  const maximo = (cortes[k + 1] ?? total) - 1;
  cortes[k] = Math.max(minimo, Math.min(maximo, indice));
  p.cortesEscena = cortes;
  sincronizarEscenas(p);
}

/**
 * Una escena más: parte la más larga, buscando el final de frase más
 * cercano a su mitad para que el corte caiga en un lugar natural.
 */
export function agregarCorte(p: Proyecto): void {
  const palabras = palabrasDe(p.narracion.texto);
  const limites = [0, ...[...p.cortesEscena].sort((a, b) => a - b), palabras.length];
  let mejor = -1;
  let largo = 1;
  for (let i = 0; i < limites.length - 1; i++) {
    const l = limites[i + 1] - limites[i];
    if (l > largo) {
      largo = l;
      mejor = i;
    }
  }
  if (mejor < 0) return;
  const desde = limites[mejor];
  const hasta = limites[mejor + 1];
  const mitad = Math.round((desde + hasta) / 2);
  let corte = mitad;
  let distancia = Infinity;
  for (let i = desde + 1; i < hasta; i++) {
    if (/[.,;:!?…]$/.test(palabras[i - 1]) && Math.abs(i - mitad) < distancia) {
      distancia = Math.abs(i - mitad);
      corte = i;
    }
  }
  p.cortesEscena = [...p.cortesEscena, corte];
  sincronizarEscenas(p);
}

/** Una escena menos: junta la última con la anterior. */
export function quitarCorte(p: Proyecto, k?: number): void {
  const cortes = [...p.cortesEscena].sort((a, b) => a - b);
  cortes.splice(k ?? cortes.length - 1, 1);
  p.cortesEscena = cortes;
  sincronizarEscenas(p);
}

/**
 * Cambia el orden de la pieza. Las escenas con voz arrastran su trozo de
 * texto: el monólogo se reescribe en el orden nuevo, así el texto y la
 * pieza nunca se contradicen. Los respiros se cuelgan de la escena que
 * les queda delante.
 */
export function reordenar(p: Proyecto, ids: string[]): void {
  const porId = new Map(recorrido(p).map((e) => [e.id, e]));
  const nueva = ids.map((id) => porId.get(id)).filter((e): e is Escena => Boolean(e));
  const conVoz = nueva.filter((e) => !e.respiro);
  p.narracion.texto = conVoz.map((e) => e.texto).join(' ');
  const cortes: number[] = [];
  let acumulado = 0;
  conVoz.forEach((e, i) => {
    if (i > 0) cortes.push(acumulado);
    acumulado += palabrasDe(e.texto).length;
  });
  p.cortesEscena = cortes;
  p.escenas = conVoz;
  let ultima = -1;
  const respiros: Escena[] = [];
  for (const e of nueva) {
    if (e.respiro) {
      e.despuesDe = ultima;
      respiros.push(e);
    } else {
      ultima += 1;
    }
  }
  p.respiros = respiros;
  sincronizarEscenas(p);
}

/** Pone o quita un corte antes de la palabra `indice`. */
export function alternarCorte(p: Proyecto, indice: number): void {
  if (p.cortesEscena.includes(indice)) {
    p.cortesEscena = p.cortesEscena.filter((c) => c !== indice);
  } else {
    p.cortesEscena = [...p.cortesEscena, indice];
  }
  sincronizarEscenas(p);
}

/** El recorrido completo, en orden: escenas y respiros intercalados. */
export function recorrido(p: Pick<Proyecto, 'escenas' | 'respiros'>): Escena[] {
  const salida: Escena[] = [];
  const respirosDetras = (i: number) => p.respiros.filter((r) => r.despuesDe === i);
  salida.push(...respirosDetras(-1));
  p.escenas.forEach((escena, i) => {
    salida.push(escena);
    salida.push(...respirosDetras(i));
  });
  return salida;
}

/** Busca una escena o un respiro por id. */
export function buscarEscena(p: Proyecto, id: string): Escena | undefined {
  return p.escenas.find((e) => e.id === id) ?? p.respiros.find((e) => e.id === id);
}

export function agregarRespiro(p: Proyecto, despuesDe: number): string {
  const r = nuevaEscena(0, true);
  r.despuesDe = Math.max(-1, Math.min(p.escenas.length - 1, despuesDe));
  p.respiros.push(r);
  return r.id;
}

export function moverRespiro(p: Proyecto, id: string, delta: number): void {
  const r = p.respiros.find((e) => e.id === id);
  if (!r) return;
  r.despuesDe = Math.max(-1, Math.min(p.escenas.length - 1, r.despuesDe + delta));
}

export function quitarRespiro(p: Proyecto, id: string): void {
  p.respiros = p.respiros.filter((e) => e.id !== id);
}

/** Lo que dura la voz de una escena: la grabación, o una estimación por palabras. */
export function duracionVoz(escena: Escena): number {
  if (escena.respiro) return 0;
  if (escena.vozUrl && escena.vozDuracion > 0) return escena.vozDuracion;
  return palabrasDe(escena.texto).length / PALABRAS_POR_SEGUNDO;
}

/** Energía de la escena, 0..1: la emoción da la base y la fuerza la mueve. */
export function intensidadDeEscena(escena: Escena): number {
  const base = EMOCIONES[escena.emocion].base;
  return Math.max(0.12, Math.min(1, base + (escena.fuerza - 2) * 0.22));
}

/**
 * Las secciones que toca el motor, una por escena o respiro.
 *
 * Aquí vive la traducción del relato a música: la emoción decide la escala
 * y el empujón de tempo; la emoción y la fuerza juntas, cuánta energía hay,
 * cuántas capas suenan y con qué golpe.
 */
export function escenasASecciones(p: Proyecto): Seccion[] {
  const ids = p.patron.filas.map((f) => f.id);
  const lista = recorrido(p);
  return lista.map((escena, i) => {
    const perfil = EMOCIONES[escena.emocion];
    const intensidad = intensidadDeEscena(escena);
    const factorTempo = perfil.tempo;
    const segundos = escena.respiro ? escena.duracionRespiro : duracionVoz(escena) + 0.8;
    const compases = Math.max(1, Math.ceil(segundos / segundosPorVuelta(p, factorTempo)));
    let capasActivas: string[];
    const niveles: Record<string, number> = {};
    if (escena.niveles) {
      // La escena se editó a mano: manda lo que dejó el estudiante.
      capasActivas = ids.filter((id) => (escena.niveles?.[id] ?? 0) > 0);
      for (const id of capasActivas) niveles[id] = escena.niveles[id];
    } else {
      const cuantasCapas = Math.max(1, Math.round(ids.length * (0.25 + 0.75 * intensidad)));
      capasActivas = ids.slice(0, cuantasCapas);
      for (const id of capasActivas) niveles[id] = escena.fuerza;
    }
    return {
      id: escena.id,
      etiqueta: escena.nombre,
      modo: 'procedural',
      compases,
      semilla: (p.semilla + i * 37 + escena.version * 1009) % 10000,
      intensidad,
      capasActivas,
      niveles,
      melodiaActiva: escena.niveles ? (escena.niveles.melodia ?? 2) > 0 : intensidad > 0.2,
      factorTempo,
      intencion: '',
      // La última parte se apaga sola, como un cierre.
      desvanecer: i === lista.length - 1 && lista.length > 1,
      escala: perfil.escala,
      emocion: escena.emocion,
      fuerza: escena.fuerza,
      gesto: escena.gesto,
      voz:
        escena.vozUrl && !escena.respiro
          ? { url: escena.vozUrl, duracion: escena.vozDuracion }
          : undefined,
    };
  });
}

/** Un texto de ejemplo para probar sin escribir. */
export const TEXTO_EJEMPLO =
  'A las cuatro, cuando Medellín todavía no ha decidido despertar, don Arturo prende la chiva. ' +
  'El motor tose como un abuelo. Sube la loma con la gente apretada, los canastos y la radio ' +
  'sonando un tango que nadie pidió. Un día llegó el metrocable. Nadie le avisó a la chiva. ' +
  'Se quedó quieta en el parqueadero, oyendo pasar las cabinas por encima. Todavía, a las ' +
  'cuatro, don Arturo prende el motor. No va a ningún lado. Solo quiere que la loma sepa que ' +
  'sigue ahí.';

/** Carga el ejemplo ya partido en cuatro escenas con sus emociones. */
export function cargarEjemplo(p: Proyecto): void {
  p.historia.que = 'La última chiva de la loma, que se quedó quieta cuando llegó el metrocable.';
  p.historia.porQue =
    'Las chivas y el metrocable son dos maneras de subir las lomas de Medellín: una se fue y la otra llegó.';
  p.narracion.texto = TEXTO_EJEMPLO;
  const palabras = palabrasDe(TEXTO_EJEMPLO);
  const empieza = (frase: string) =>
    palabras.findIndex((_, i) => palabras.slice(i).join(' ').startsWith(frase));
  p.cortesEscena = [empieza('Sube la loma'), empieza('Un día llegó'), empieza('Todavía, a las')];
  p.escenas = [];
  p.respiros = [];
  sincronizarEscenas(p);
  const datos: [string, Emocion, Fuerza][] = [
    ['La madrugada', 'calma', 1],
    ['La subida', 'alegria', 3],
    ['El silencio', 'tension', 2],
    ['Lo que queda', 'nostalgia', 1],
  ];
  p.escenas.forEach((e, i) => {
    const [nombre, emocion, fuerza] = datos[i] ?? [e.nombre, e.emocion, e.fuerza];
    e.nombre = nombre;
    e.emocion = emocion;
    e.fuerza = fuerza;
  });
}
