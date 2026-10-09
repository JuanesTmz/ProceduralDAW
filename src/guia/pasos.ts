/**
 * La autoguía: una misión corta por pantalla, escrita en el idioma del Urban Lab.
 *
 * Lo que cambia entre tracks es el ORDEN en que se recorren las mesas y el
 * LENGUAJE de la guía. El acceso no cambia: los dos tracks pueden usar todas
 * las herramientas, siempre.
 */
import type { Fase, Vista } from '../estado/tipos';

export type Track = 'ia' | 'musica';

export const NOMBRE_TRACK: Record<Track, string> = {
  ia: 'Inteligencia Artificial',
  musica: 'Música Urbana',
};

export const NOMBRE_CORTO_TRACK: Record<Track, string> = {
  ia: 'IA',
  musica: 'Música Urbana',
};

export const NOMBRE_FASE: Record<Fase, string> = {
  concepto: 'Conceptualización',
  produccion: 'Producción',
  visual: 'Visual',
};

export const LEMA_FASE: Record<Fase, string> = {
  concepto: 'Qué vas a contar',
  produccion: 'Cómo suena',
  visual: 'Cómo se ve',
};

export interface PasoGuia {
  id: Vista;
  etiqueta: string;
  /** La misión: qué hay que lograr aquí. */
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
  cancion: {
    id: 'cancion',
    etiqueta: 'La canción',
    mision: {
      ia: 'Mira tu pieza completa y reparte el tiempo: cuánto dura cada parte y con cuánta energía suena.',
      musica:
        'Arma la estructura: cuánto dura la intro, la estrofa, el coro y el cierre, y qué tan fuerte va cada una.',
    },
    porQue: {
      ia: 'Esta es la vista de toda la pieza. Aquí se ve el arco completo, que es lo que separa una canción de un loop.',
      musica:
        'Sin estructura la pista es un loop plano. Con estructura tiene entrada, subida y salida — y el coro se nota.',
    },
  },
  golpes: {
    id: 'golpes',
    etiqueta: 'Golpes',
    mision: {
      ia: 'Arma la grilla: cada fila es un sonido, cada columna un paso. Este es el material que las reglas van a transformar.',
      musica:
        'Arma el beat en la grilla. Ojo al bombo y al hi-hat: son los que sostienen todo lo demás.',
    },
    porQue: {
      ia: 'El patrón es el ladrillo. Sin material de base, las reglas generativas no tienen sobre qué operar.',
      musica: 'Aquí se define el groove. Si la grilla camina, la pista camina.',
    },
  },
  matriz: {
    id: 'matriz',
    etiqueta: 'Matriz',
    mision: {
      ia: 'Monta la melodía en la matriz. Las filas ya están afinadas: lo que pongas va a sonar en escala.',
      musica:
        'Monta tu línea de bajo o tu melodía. Elige la escala y toca: todo lo que caiga ahí suena afinado.',
    },
    porQue: {
      ia: 'Guardar el grado de la escala y no la nota suelta es lo que permite cambiar de escala sin desafinar la pieza.',
      musica:
        'La melodía es lo que la gente se lleva tarareando. Con la escala puesta, no hay manera de que suene mal.',
    },
  },
  procedural: {
    id: 'procedural',
    etiqueta: 'Procedural',
    mision: {
      ia: 'Entrena tu máquina: dale una regla a cada sonido y comprueba que al cambiar la semilla el resultado cambia.',
      musica:
        'Haz que tu loop no se repita igual. Mueve las reglas, cambia la semilla y escucha cómo respira.',
    },
    porQue: {
      ia: 'Esto es lo mismo que hace una IA generativa: reglas + material + azar controlado. Es el 20% de la nota.',
      musica:
        'Un loop idéntico cansa al oído. Que varíe solo es lo que separa una pista viva de una plantilla.',
    },
  },
  sonidos: {
    id: 'sonidos',
    etiqueta: 'Sonidos',
    mision: {
      ia: 'Graba un sonido real, recórtalo y súmalo al proyecto: es el dato de entrada de tu sistema.',
      musica: 'Ármate el kit: graba lo que te rodea, recórtalo y súmalo para repartirlo en la pista.',
    },
    porQue: {
      ia: 'Capturar el mundo y convertirlo en material es lo que hace que el sistema hable de Medellín y no de nada.',
      musica: 'Samplear lo que te rodea es la base del hip hop desde el día uno. Sal y grábalo.',
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
 * El recorrido. El relato es igual para los dos tracks; lo que cambia es por
 * dónde se entra a Producción.
 *
 * En IA primero se planea el sistema —la canción completa— y luego se llena
 * de material. En Música Urbana primero se arma el beat, y una vez camina se
 * decide cómo se reparte en el tiempo y se le enseña a variar.
 */
const ORDEN: Record<Track, Vista[]> = {
  ia: ['historia', 'monologo', 'cancion', 'golpes', 'matriz', 'procedural', 'sonidos', 'visual', 'exportar'],
  musica: ['historia', 'monologo', 'sonidos', 'golpes', 'matriz', 'cancion', 'procedural', 'visual', 'exportar'],
};

/**
 * Por dónde entra cada track al llegar a Producción.
 *
 * Producción es una sola pantalla, así que entrar es siempre llegar a la
 * pista; lo que cambia según el Urban Lab es qué ventana se sugiere primero.
 */
export const MESA_DE_ENTRADA: Record<Track, Vista> = {
  ia: 'cancion',
  musica: 'cancion',
};

/**
 * El recorrido de pantallas, de principio a fin.
 *
 * Producción es una sola pantalla —la pista repartida— y por eso aparece una
 * sola vez: las herramientas no son pasos, son ventanas que se abren encima.
 */
export const RECORRIDO: Vista[] = ['historia', 'monologo', 'cancion', 'visual', 'exportar'];

/** El orden en que la guía propone las herramientas, según el track. */
export const ORDEN_HERRAMIENTAS: Record<Track, Vista[]> = {
  ia: ['golpes', 'matriz', 'procedural', 'sonidos'],
  musica: ['sonidos', 'golpes', 'matriz', 'procedural'],
};

export function pasosDelTrack(track: Track): PasoGuia[] {
  return ORDEN[track].map((id) => PASOS[id]);
}

export function pasoDe(vista: Vista): PasoGuia {
  return PASOS[vista];
}
