/**
 * La autoguía: una misión corta por paso, escrita en el idioma del Urban Lab.
 *
 * Lo que cambia entre tracks es el ORDEN en que se priorizan los pasos
 * y el LENGUAJE de la guía. El acceso no cambia: los dos tracks pueden
 * usar todas las herramientas, siempre.
 */
import type { Vista } from '../estado/tipos';

export type Track = 'ia' | 'musica';

export const NOMBRE_TRACK: Record<Track, string> = {
  ia: 'Inteligencia Artificial',
  musica: 'Música Urbana',
};

export const NOMBRE_CORTO_TRACK: Record<Track, string> = {
  ia: 'IA',
  musica: 'Música Urbana',
};

export interface PasoGuia {
  id: Vista;
  etiqueta: string;
  /** La misión: qué hay que lograr en este paso. */
  mision: Record<Track, string>;
  /** El porqué, para quien quiera entender antes de tocar. */
  porQue: Record<Track, string>;
}

const PASOS: Record<Vista, PasoGuia> = {
  historia: {
    id: 'historia',
    etiqueta: 'Historia',
    mision: {
      ia: 'Escribe qué vas a contar de Medellín y por qué es de aquí. Sin esto, el sistema no tiene a qué servir.',
      musica:
        'Escribe qué vas a contar de Medellín y por qué es de aquí. El beat viene después: primero la historia.',
    },
    porQue: {
      ia: 'Todo lo que construyas —reglas, semillas, visuales— está al servicio de este relato. Es el 25% de la calificación.',
      musica:
        'Por buena que suene la pista, si no cuenta algo no hay pieza. El relato es lo que más pesa en la rúbrica.',
    },
  },
  monologo: {
    id: 'monologo',
    etiqueta: 'Monólogo',
    mision: {
      ia: 'Escribe unas 100 palabras y grábalas. Esa pista de voz es la entrada principal del sistema.',
      musica:
        'Escribe unas 100 palabras y grábalas. Es spoken word: se dice, no se canta. Cuida el flow al leerlo.',
    },
    porQue: {
      ia: 'La narración marca la duración y el ritmo de toda la pieza; el resto se acomoda a ella.',
      musica:
        'La voz es la columna. Como en Giorgio by Moroder: la música sostiene lo que la voz va diciendo.',
    },
  },
  arco: {
    id: 'arco',
    etiqueta: 'Arco',
    mision: {
      ia: 'Dibuja el recorrido de tu historia. Cada punto escribe la intensidad y las capas de una sección.',
      musica:
        'Marca cómo sube y baja tu historia. Eso define qué tan llena suena cada parte de la pista.',
    },
    porQue: {
      ia: 'El arco es el parámetro de alto nivel: mueve a la vez densidad, volumen y número de capas.',
      musica:
        'Sin arco, la pista es un loop plano de tres minutos. Con arco, tiene entrada, subida y salida.',
    },
  },
  patron: {
    id: 'patron',
    etiqueta: 'Patrón',
    mision: {
      ia: 'Arma la grilla: cada fila es un sonido, cada columna un paso. Este es el material que las reglas van a transformar.',
      musica:
        'Arma el beat en la grilla. Sube un sample tuyo para que suene a tu tema, y monta la línea en la matriz.',
    },
    porQue: {
      ia: 'El patrón es el ladrillo. Sin material de base, las reglas generativas no tienen sobre qué operar.',
      musica:
        'Aquí se define el groove. Ojo al bombo y al hi-hat: son los que sostienen todo lo demás.',
    },
  },
  motor: {
    id: 'motor',
    etiqueta: 'Motor',
    mision: {
      ia: 'Entrena tu máquina: dale reglas a cada fila —euclidiana o probabilística— y comprueba que la semilla cambia el resultado.',
      musica:
        'Haz que tu loop no se repita igual. Mueve estas reglas, cambia la semilla y escucha cómo respira.',
    },
    porQue: {
      ia: 'Esto es lo mismo que hace una IA generativa: reglas + material + azar controlado. Es el 20% de la nota.',
      musica:
        'Un loop idéntico cansa al oído. Que varíe solo es lo que separa una pista viva de una plantilla — y es obligatorio también para Música Urbana.',
    },
  },
  secciones: {
    id: 'secciones',
    etiqueta: 'Secciones',
    mision: {
      ia: 'Ajusta Intro → Cuerpo → Giro → Cierre. Cada una tiene sus capas, su intensidad y su propia semilla.',
      musica:
        'Arma la estructura: intro, cuerpo, giro y cierre. Que cada parte suene distinta de la anterior.',
    },
    porQue: {
      ia: 'La pieza recorre las secciones en orden y termina. No es un bucle: tiene principio y final.',
      musica:
        'Es el arreglo de toda la vida. Si el giro no se nota, el público no siente que pasó nada.',
    },
  },
  visual: {
    id: 'visual',
    etiqueta: 'Visual',
    mision: {
      ia: 'Elige un preset, sube la foto de tu tema y mira cómo el análisis de frecuencias mueve la imagen.',
      musica:
        'Ponle cara a la pista: elige un visual, súbele una foto de tu tema y que se mueva con el bombo.',
    },
    porQue: {
      ia: 'El visual lee el espectro en vivo y comparte la semilla del audio: es el mismo sistema, en otro medio.',
      musica:
        'La rúbrica pide que el visual acompañe la historia, no un preset suelto. Por eso la foto importa.',
    },
  },
  exportar: {
    id: 'exportar',
    etiqueta: 'Exportar',
    mision: {
      ia: 'Revisa que estén los mínimos y exporta la pieza con su mapa de reglas.',
      musica: 'Revisa que esté todo y exporta la pieza para presentarla.',
    },
    porQue: {
      ia: 'El mapa de reglas es lo que le permite al jurado ver cómo funciona tu máquina.',
      musica: 'Sin el archivo exportado no hay qué mostrar el día del SmartFest.',
    },
  },
};

/**
 * El recorrido. El núcleo narrativo es igual para los dos tracks;
 * lo que cambia es dónde entra el motor generativo.
 *
 * En IA va justo después de la grilla: primero el sistema, luego el gusto.
 * En Música Urbana va después de las secciones: primero que suene bien,
 * y una vez suena, se le enseña a variar.
 */
const ORDEN: Record<Track, Vista[]> = {
  ia: ['historia', 'monologo', 'arco', 'patron', 'motor', 'secciones', 'visual', 'exportar'],
  musica: ['historia', 'monologo', 'arco', 'patron', 'secciones', 'motor', 'visual', 'exportar'],
};

export function pasosDelTrack(track: Track): PasoGuia[] {
  return ORDEN[track].map((id) => PASOS[id]);
}

export function pasoDe(vista: Vista): PasoGuia {
  return PASOS[vista];
}
