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

export function crearFila(
  tipo: TipoSonido,
  cantidadPasos: number,
  opciones: Partial<Fila> = {},
): Fila {
  return {
    id: nuevoId(tipo),
    nombre: NOMBRES_SONIDO[tipo],
    tipo,
    color: COLORES_FILA[0],
    pasos: new Array(cantidadPasos).fill(false),
    probabilidad: new Array(cantidadPasos).fill(1),
    volumen: 0.8,
    silenciada: false,
    soloActivo: false,
    protegida: false,
    regla: { modo: 'manual', pulsos: 4, rotacion: 0, densidad: 0.5, mutabilidad: 0.12 },
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
    intencion: 'Entra en puntas de pie: pocas capas, deja espacio a la voz.',
    compases: 2,
    intensidad: 0.35,
    melodiaActiva: true,
    factorTempo: 1,
    desvanecer: false,
    proporcionCapas: 0.4,
  },
  cuerpo: {
    etiqueta: 'Cuerpo',
    intencion: 'La pieza en pleno: todas las capas sosteniendo la historia.',
    compases: 4,
    intensidad: 0.8,
    melodiaActiva: true,
    factorTempo: 1,
    desvanecer: false,
    proporcionCapas: 1,
  },
  giro: {
    etiqueta: 'Giro',
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
    intencion: 'Se apaga: quedan pocas capas y la pieza se desvanece.',
    compases: 2,
    intensidad: 0.5,
    melodiaActiva: true,
    factorTempo: 1,
    desvanecer: true,
    proporcionCapas: 0.5,
  },
};

export const ORDEN_SECCIONES: NombreSeccion[] = ['intro', 'cuerpo', 'giro', 'cierre'];

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
      notas: [],
      volumen: 0.7,
      silenciada: false,
      soloActivo: false,
      escala: 'menorPentatonica',
      regla: { modo: 'manual', pulsos: 5, rotacion: 0, densidad: 0.35, mutabilidad: 0.2 },
      protegida: false,
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
 * intro suave → cuerpo pleno → giro marcado → cierre en fade.
 */
export function sugerirArreglo(proyecto: Proyecto): void {
  const ids = proyecto.patron.filas.map((f) => f.id);
  for (const seccion of proyecto.secciones) {
    const { proporcionCapas, ...perfil } = PERFILES_SECCION[seccion.id];
    Object.assign(seccion, perfil);
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
    semilla,
    volumenMaestro: 0.85,
    patron,
    efectos: {
      reverbCantidad: 0.16,
      filtroFrecuencia: 18000,
      filtroTipo: 'lowpass',
      delayCantidad: 0,
    },
    secciones: crearSecciones(semilla, patron.filas.map((f) => f.id)),
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
