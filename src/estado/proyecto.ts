/**
 * Proyecto por defecto y utilidades para transformarlo.
 * El proyecto arranca con un patrón mínimo que ya suena: el estudiante
 * nunca ve una pantalla en silencio.
 */
import type {
  Fila,
  NombreSeccion,
  Narracion,
  Patron,
  Proyecto,
  Seccion,
  TipoSonido,
} from './tipos';

export const COLORES_FILA = [
  '#ffb020',
  '#ff5d73',
  '#2ee6a8',
  '#7aa2ff',
  '#c792ea',
  '#ffd479',
] as const;

export const NOMBRES_SONIDO: Record<TipoSonido, string> = {
  bombo: 'Bombo',
  redoblante: 'Redoblante',
  hihat: 'Hi-hat',
  palma: 'Palma',
  tom: 'Tom',
  aro: 'Aro',
  sample: 'Sample',
};

let contadorId = 0;
export function nuevoId(prefijo = 'fila'): string {
  contadorId += 1;
  return `${prefijo}-${contadorId}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Color para una fila nueva, rotando la paleta. */
export function colorPorIndice(indice: number): string {
  return COLORES_FILA[indice % COLORES_FILA.length];
}

/** La paleta de los sonidos propios: tonos que no se confunden con el kit. */
export const COLORES_SAMPLE = [
  '#5fd4ff',
  '#ff9f68',
  '#9bff6b',
  '#ff6bd6',
  '#6bffe0',
  '#d6ff5f',
] as const;

/** Cada sonido del kit tiene SU color, siempre el mismo. */
const COLOR_DE_TIPO: Record<TipoSonido, string> = {
  bombo: COLORES_FILA[0],
  redoblante: COLORES_FILA[1],
  hihat: COLORES_FILA[2],
  palma: COLORES_FILA[3],
  tom: COLORES_FILA[4],
  aro: COLORES_FILA[5],
  sample: COLORES_SAMPLE[0],
};

/**
 * El color de una pista sale de SU SONIDO, no del orden en que se creó.
 *
 * Antes rotaba la paleta por posición, así que cuatro bombos salían de
 * cuatro colores y el color no decía nada. Ahora dos bombos son del mismo
 * amarillo y lo que distingue los colores es el sonido: en la pista
 * repartida se lee de un vistazo qué suena, sin leer los nombres.
 */
export function colorDeSonido(tipo: TipoSonido, sampleUrl?: string): string {
  if (tipo !== 'sample' || !sampleUrl) return COLOR_DE_TIPO[tipo];
  // El mismo sonido da siempre el mismo color: se saca del propio sonido.
  let mezcla = 2166136261;
  for (let i = 0; i < sampleUrl.length; i++) {
    mezcla ^= sampleUrl.charCodeAt(i);
    mezcla = Math.imul(mezcla, 16777619);
  }
  return COLORES_SAMPLE[Math.abs(mezcla) % COLORES_SAMPLE.length];
}

export function crearFila(
  tipo: TipoSonido,
  cantidadPasos: number,
  opciones: Partial<Fila> = {},
): Fila {
  return {
    id: nuevoId(tipo),
    nombre: NOMBRES_SONIDO[tipo],
    tipo,
    color: colorDeSonido(tipo, opciones.sampleUrl),
    pasos: new Array(cantidadPasos).fill(false),
    probabilidad: new Array(cantidadPasos).fill(1),
    volumen: 0.8,
    silenciada: false,
    soloActivo: false,
    // Arranca a mano: lo primero que hace el estudiante es dibujar su beat,
    // y la máquina entra cuando él lo decide en la mesa Procedural.
    regla: { activa: false, golpes: 0.25, azar: 0.3, rotacion: 0, mutabilidad: 0.12 },
    ...opciones,
  };
}

/** Marca pasos concretos (útil para los patrones de arranque). */
function conPasos(fila: Fila, indices: number[]): Fila {
  const pasos = [...fila.pasos];
  for (const i of indices) {
    if (i < pasos.length) pasos[i] = true;
  }
  return { ...fila, pasos };
}

/**
 * El arco por defecto: cada sección tiene un papel distinto en el relato.
 * Son sugerencias — el estudiante las edita y el botón "Sugerir arreglo"
 * las vuelve a aplicar.
 */
const PERFILES_SECCION: Record<
  NombreSeccion,
  Omit<Seccion, 'id' | 'capasActivas' | 'semilla'> & { proporcionCapas: number }
> = {
  intro: {
    etiqueta: 'Intro',
    modo: 'procedural',
    intencion: 'Entra en puntas de pie: pocas capas, deja espacio a la voz.',
    compases: 2,
    intensidad: 0.35,
    melodiaActiva: true,
    factorTempo: 1,
    desvanecer: false,
    proporcionCapas: 0.4,
  },
  estrofa: {
    etiqueta: 'Estrofa',
    modo: 'procedural',
    intencion: 'La pieza en pleno: todas las capas sosteniendo la historia.',
    compases: 4,
    intensidad: 0.8,
    melodiaActiva: true,
    factorTempo: 1,
    desvanecer: false,
    proporcionCapas: 1,
  },
  coro: {
    etiqueta: 'Coro',
    modo: 'procedural',
    intencion: 'Aquí cambia algo: más intensidad y un empujón de tempo.',
    compases: 2,
    intensidad: 1,
    melodiaActiva: true,
    factorTempo: 1.05,
    desvanecer: false,
    proporcionCapas: 1,
  },
  cierre: {
    etiqueta: 'Cierre',
    modo: 'procedural',
    intencion: 'Se apaga: quedan pocas capas y la pieza se desvanece.',
    compases: 2,
    intensidad: 0.5,
    melodiaActiva: true,
    factorTempo: 1,
    desvanecer: true,
    proporcionCapas: 0.5,
  },
};

export const ORDEN_SECCIONES: NombreSeccion[] = ['intro', 'estrofa', 'coro', 'cierre'];

export function crearPatronInicial(): Patron {
  const pasos = 16;
  const bombo = conPasos(
    crearFila('bombo', pasos, { color: COLORES_FILA[0], volumen: 0.95 }),
    [0, 8],
  );
  const redoblante = conPasos(
    crearFila('redoblante', pasos, { color: COLORES_FILA[1], volumen: 0.7 }),
    [4, 12],
  );
  const hihat = conPasos(
    crearFila('hihat', pasos, { color: COLORES_FILA[2], volumen: 0.6 }),
    [2, 6, 10, 14],
  );
  const palma = crearFila('palma', pasos, { color: COLORES_FILA[3], volumen: 0.6 });
  const tom = crearFila('tom', pasos, { color: COLORES_FILA[4], volumen: 0.6 });

  return {
    cantidadPasos: pasos,
    filas: [bombo, redoblante, hihat, palma, tom],
    melodia: {
      octavaBase: 2,
      instrumento: 'sintetizador',
      notaSample: 'C3',
      notas: [],
      volumen: 0.7,
      silenciada: false,
      soloActivo: false,
      escala: 'menorPentatonica',
      regla: { activa: false, golpes: 0.3, azar: 0.35, rotacion: 0, mutabilidad: 0.2 },
      visible: true,
    },
  };
}

export function crearSecciones(semillaBase: number, idsFilas: string[]): Seccion[] {
  return ORDEN_SECCIONES.map((id, i) => {
    const { proporcionCapas, ...perfil } = PERFILES_SECCION[id];
    return {
      id,
      ...perfil,
      semilla: (semillaBase + i * 37) % 10000,
      capasActivas: repartirCapas(idsFilas, proporcionCapas),
    };
  });
}

/** Las primeras capas de la lista: la base rítmica antes que los adornos. */
function repartirCapas(idsFilas: string[], proporcion: number): string[] {
  if (proporcion >= 1) return [...idsFilas];
  const cuantas = Math.max(1, Math.round(idsFilas.length * proporcion));
  return idsFilas.slice(0, cuantas);
}

/**
 * Vuelve a aplicar el arco sugerido sin tocar las semillas:
 * intro suave → estrofa plena → coro marcado → cierre en fade.
 */
export function sugerirArreglo(proyecto: Proyecto): void {
  const ids = proyecto.patron.filas.map((f) => f.id);
  for (const seccion of proyecto.secciones) {
    const { proporcionCapas, ...perfil } = PERFILES_SECCION[seccion.id];
    // El modo lo eligió el estudiante: sugerir un arreglo no se lo cambia.
    const modoElegido = seccion.modo;
    Object.assign(seccion, perfil);
    seccion.modo = modoElegido;
    seccion.capasActivas = repartirCapas(ids, proporcionCapas);
  }
}

/** Cuánto dura la pieza completa, en vueltas del patrón. */
export function vueltasTotales(proyecto: Proyecto): number {
  return proyecto.secciones.reduce((total, s) => total + s.compases, 0);
}

/** Duración de la pieza en segundos, para la barra y la exportación. */
export function duracionPieza(proyecto: Proyecto): number {
  const segundosPorPaso = 60 / proyecto.bpm / 4;
  return proyecto.secciones.reduce(
    (total, s) =>
      total + (s.compases * proyecto.patron.cantidadPasos * segundosPorPaso) / s.factorTempo,
    0,
  );
}

// ------------------------------------------------- La estructura en el tiempo

/**
 * El reparto del tiempo. La unidad real de la pieza es la VUELTA del patrón
 * —el motor cuenta vueltas, no segundos—, así que estas funciones traducen
 * entre lo que el estudiante ve (minutos y porcentajes) y lo que el motor
 * necesita (vueltas enteras por sección).
 */

/** Vueltas mínimas y máximas de la pieza completa. */
export const VUELTAS_MINIMAS = 8;
export const VUELTAS_MAXIMAS = 200;

/** Segundos que dura una vuelta del patrón, con el tempo de la sección. */
export function segundosPorVuelta(proyecto: Proyecto, factorTempo = 1): number {
  const segundosPorPaso = 60 / proyecto.bpm / 4;
  return (proyecto.patron.cantidadPasos * segundosPorPaso) / factorTempo;
}

/** Cuánto dura una sección, en segundos. */
export function duracionSeccion(proyecto: Proyecto, seccion: Seccion): number {
  return seccion.compases * segundosPorVuelta(proyecto, seccion.factorTempo);
}

/** Qué parte del total ocupa cada sección (0..1, suman 1). */
export function proporcionesDeSecciones(proyecto: Proyecto): number[] {
  const duraciones = proyecto.secciones.map((s) => duracionSeccion(proyecto, s));
  const total = duraciones.reduce((a, b) => a + b, 0);
  if (total <= 0) return duraciones.map(() => 1 / (duraciones.length || 1));
  return duraciones.map((d) => d / total);
}

/**
 * Reparte un total de vueltas según unas proporciones.
 * Cada sección se lleva al menos una vuelta (si no, desaparecería de la pieza)
 * y la sobra se reparte por resto mayor, que es lo que menos deforma los
 * porcentajes pedidos.
 */
export function repartirVueltas(proporciones: number[], total: number): number[] {
  const cuantas = proporciones.length;
  if (cuantas === 0) return [];
  const suma = proporciones.reduce((a, b) => a + b, 0) || 1;
  const repartibles = Math.max(0, Math.round(total) - cuantas);
  const exactos = proporciones.map((p) => (p / suma) * repartibles);
  const enteros = exactos.map((v) => Math.floor(v));
  let sobra = repartibles - enteros.reduce((a, b) => a + b, 0);

  const porDecimal = exactos
    .map((v, i) => ({ i, decimal: v - Math.floor(v) }))
    .sort((a, b) => b.decimal - a.decimal);
  for (const { i } of porDecimal) {
    if (sobra <= 0) break;
    enteros[i] += 1;
    sobra -= 1;
  }
  return enteros.map((v) => v + 1);
}

/** Cambia la duración total de la pieza conservando los porcentajes actuales. */
export function fijarVueltasTotales(proyecto: Proyecto, total: number): void {
  const limitado = Math.max(VUELTAS_MINIMAS, Math.min(VUELTAS_MAXIMAS, Math.round(total)));
  const reparto = repartirVueltas(proporcionesDeSecciones(proyecto), limitado);
  proyecto.secciones.forEach((seccion, i) => {
    seccion.compases = reparto[i];
  });
}

/** Aplica unos porcentajes sin tocar la duración total. */
export function aplicarProporciones(proyecto: Proyecto, proporciones: number[]): void {
  const reparto = repartirVueltas(proporciones, vueltasTotales(proyecto));
  proyecto.secciones.forEach((seccion, i) => {
    seccion.compases = reparto[i];
  });
}

/**
 * Mueve el límite entre dos secciones vecinas: lo que gana una lo pierde la
 * otra, así arrastrar el punto del arco reparte el tiempo sin alargar la pieza.
 */
export function moverLimite(proyecto: Proyecto, indice: number, vueltasIzquierda: number): void {
  const izquierda = proyecto.secciones[indice];
  const derecha = proyecto.secciones[indice + 1];
  if (!izquierda || !derecha) return;
  const par = izquierda.compases + derecha.compases;
  const nueva = Math.max(1, Math.min(par - 1, Math.round(vueltasIzquierda)));
  izquierda.compases = nueva;
  derecha.compases = par - nueva;
}

/** Cuántas vueltas hacen falta para que la pieza dure, más o menos, N segundos. */
export function vueltasParaDuracion(proyecto: Proyecto, segundos: number): number {
  const vueltas = vueltasTotales(proyecto);
  const actual = duracionPieza(proyecto);
  const porVuelta = vueltas > 0 && actual > 0 ? actual / vueltas : segundosPorVuelta(proyecto);
  return Math.round(segundos / porVuelta);
}

/** Segundos en formato reloj: 2:05. */
export function formatearReloj(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

export function crearProyectoInicial(): Proyecto {
  const patron = crearPatronInicial();
  const semilla = 2310;
  return {
    nombre: 'Mi pieza',
    track: null,
    modoReproduccion: 'patron',
    historia: { que: '', porQue: '' },
    narracion: {
      texto: '',
      origen: 'ninguno',
      duracion: 0,
      seccionInicio: 'intro',
      desfase: 0,
      volumen: 1,
      cortes: [0, 0, 0],
    },
    visual: {
      preset: 'pulso',
      mezclaImagen: 0.6,
      textoVisible: true,
      semillaPropia: false,
      semilla,
    },
    bpm: 100,
    swing: 0,
    semilla,
    generacionMutacion: 0,
    volumenMaestro: 0.85,
    patron,
    efectos: {
      reverbCantidad: 0.16,
      filtroFrecuencia: 18000,
      filtroTipo: 'lowpass',
      delayCantidad: 0,
      movimiento: 0,
    },
    secciones: crearSecciones(semilla, patron.filas.map((f) => f.id)),
    sonidos: [],
  };
}

/** Ajusta el largo de todos los arreglos de pasos cuando cambia 16/32/64. */
export function redimensionarPatron(patron: Patron, cantidad: 16 | 32 | 64): Patron {
  const filas = patron.filas.map((fila) => ({
    ...fila,
    pasos: redimensionar(fila.pasos, cantidad, false),
    probabilidad: redimensionar(fila.probabilidad, cantidad, 1),
  }));
  return {
    ...patron,
    cantidadPasos: cantidad,
    filas,
    melodia: {
      ...patron.melodia,
      notas: patron.melodia.notas.filter((n) => n.paso < cantidad),
    },
  };
}

/**
 * Al crecer, repite el contenido para que el patrón no se quede a medias;
 * al encoger, recorta.
 */
function redimensionar<T>(arreglo: T[], largo: number, relleno: T): T[] {
  if (arreglo.length === largo) return [...arreglo];
  if (arreglo.length > largo) return arreglo.slice(0, largo);
  const salida: T[] = [];
  for (let i = 0; i < largo; i++) {
    salida.push(arreglo.length > 0 ? arreglo[i % arreglo.length] : relleno);
  }
  return salida;
}


// ---------------------------------------------------------------- La voz

/** Las palabras del monólogo, sin espacios vacíos. */
export function palabrasDe(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

/**
 * Reparte el monólogo entre las secciones en proporción a lo que dura cada una.
 * Es el punto de partida; después el estudiante mueve los cortes a mano.
 */
export function repartirNarracionAuto(proyecto: Proyecto): [number, number, number] {
  const total = palabrasDe(proyecto.narracion.texto).length;
  const vueltas = proyecto.secciones.reduce((suma, s) => suma + s.compases, 0) || 1;
  let acumulado = 0;
  const cortes: number[] = [];
  for (let i = 0; i < 3; i++) {
    acumulado += proyecto.secciones[i]?.compases ?? 0;
    cortes.push(Math.round((acumulado / vueltas) * total));
  }
  return [cortes[0], cortes[1], cortes[2]] as [number, number, number];
}

/** El trozo de monólogo que le toca a cada sección. */
export function fragmentosNarracion(narracion: Narracion): string[] {
  const palabras = palabrasDe(narracion.texto);
  const [a, b, c] = narracion.cortes;
  const limites = [0, a, b, c, palabras.length].map((n) =>
    Math.max(0, Math.min(palabras.length, n)),
  );
  return [0, 1, 2, 3].map((i) => palabras.slice(limites[i], limites[i + 1]).join(' '));
}

/** Mueve un corte sin dejar que se cruce con sus vecinos. */
export function moverCorte(narracion: Narracion, indice: number, delta: number): void {
  const total = palabrasDe(narracion.texto).length;
  const cortes = narracion.cortes;
  const minimo = indice === 0 ? 0 : cortes[indice - 1];
  const maximo = indice === 2 ? total : cortes[indice + 1];
  cortes[indice] = Math.max(minimo, Math.min(maximo, cortes[indice] + delta));
}

/**
 * Mueve un punto del arco. Además de la intensidad ajusta las capas,
 * que es lo que de verdad hace que una sección suene llena o vacía.
 */
export function ajustarPuntoDelArco(
  proyecto: Proyecto,
  id: NombreSeccion,
  intensidad: number,
  ajustarCapas: boolean,
): void {
  const seccion = proyecto.secciones.find((s) => s.id === id);
  if (!seccion) return;
  seccion.intensidad = intensidad;
  if (!ajustarCapas) return;

  const ids = proyecto.patron.filas.map((f) => f.id);
  // A más intensidad, más capas: de una sola arriba hasta todas.
  const cuantas = Math.max(1, Math.round(ids.length * (0.25 + 0.75 * intensidad)));
  seccion.capasActivas = ids.slice(0, cuantas);
  seccion.melodiaActiva = intensidad > 0.15;
}

/** Cuánto tarda la pieza en llegar al comienzo de una sección. */
export function segundosHastaSeccion(proyecto: Proyecto, id: NombreSeccion): number {
  const segundosPorPaso = 60 / proyecto.bpm / 4;
  let total = 0;
  for (const seccion of proyecto.secciones) {
    if (seccion.id === id) break;
    total +=
      (seccion.compases * proyecto.patron.cantidadPasos * segundosPorPaso) / seccion.factorTempo;
  }
  return total;
}
