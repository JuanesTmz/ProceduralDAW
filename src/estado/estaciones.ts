// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Las seis estaciones del SmartFest (Agenda y «Posibles preguntas para
 * estaciones»). Cada equipo pasa por todas, 40 minutos en cada una. Las
 * preguntas son las del documento: no se inventan otras.
 */
export type TipoEstacion = 'tablero' | 'match' | 'personas' | 'fotos';

export interface Estacion {
  nombre: string;
  /** Qué hacen allí, en una frase. */
  verbo: string;
  /** Un texto largo para el encabezado de la estación. */
  descripcion: string;
  /** Color de la estación. */
  color: string;
  icono: 'chats-fill' | 'handshake-fill' | 'monitor-play-fill' | 'footprints-fill' | 'users-three-fill' | 'books-fill';
  tipo: TipoEstacion;
  /** Las preguntas del documento. */
  preguntas: string[];
  /** Una columna de material antes de las preguntas (lo que se graba allí). */
  material?: string;
}

export const ESTACIONES: Estacion[] = [
  {
    nombre: 'Parchando con',
    verbo: 'Conversen con un experto',
    descripcion: 'Conversen con el experto y graben lo que les inspire: frases, historias, anécdotas.',
    color: '#6ec8ff',
    icono: 'chats-fill',
    tipo: 'tablero',
    material: 'Fragmentos de la conversación',
    preguntas: ['¿Qué fue lo que más les gustó de la conversación?', '¿Hubo algo que les inspiró?'],
  },
  {
    nombre: 'Match de oportunidades',
    verbo: 'Encuentren su oportunidad',
    descripcion: 'Conozcan las oportunidades de la ciudad. Cada integrante hace por lo menos un match.',
    color: '#ffd166',
    icono: 'handshake-fill',
    tipo: 'match',
    preguntas: [
      '¿Qué oportunidades identifican en la ciudad?',
      '¿Cómo se ve su futuro en la ciudad?',
      '¿Qué posibilidades consideran que tienen al vivir en Medellín?',
    ],
  },
  {
    nombre: 'Galería Urban Labs',
    verbo: 'Miren lo de otros labs',
    descripcion: 'Exploren las creaciones de los otros labs y busquen lo que hace distinto a cada territorio.',
    color: '#7d8cff',
    icono: 'monitor-play-fill',
    tipo: 'tablero',
    preguntas: [
      '¿Descubrieron territorios nuevos en los productos de otros labs?',
      '¿Qué conocieron de la ciudad que aún no conocían?',
      '¿Qué fue lo que más les gustó de las creaciones de otros equipos?',
      '¿Qué descubrieron de Medellín a través de los experimentos que exploraron?',
    ],
  },
  {
    nombre: 'Laboratorio urbano',
    verbo: 'Recorran el barrio Prado',
    descripcion: 'Recorran el barrio Prado con el colectivo y cuenten lo que encontraron: historias, sonidos, imágenes.',
    color: '#2ee6a8',
    icono: 'footprints-fill',
    tipo: 'tablero',
    preguntas: [
      '¿Cuál fue la historia que más les llamó la atención?',
      '¿Qué resaltan de la historia de Medellín?',
      '¿Qué descubrieron de la ciudad durante el recorrido?',
      '¿Qué quisieran contar del patrimonio y la cultura de Medellín?',
    ],
  },
  {
    nombre: 'La ciudad desde otros ojos',
    verbo: 'Conozcan a otros jóvenes',
    descripcion: 'Conozcan a jóvenes de otros labs y háganles las 7 preguntas sobre Medellín.',
    color: '#b182ff',
    icono: 'users-three-fill',
    tipo: 'personas',
    preguntas: [
      '¿A qué huele Medellín?',
      'En una palabra, ¿cómo defines Medellín?',
      '¿Qué es lo que más te gusta de la ciudad?',
      '¿Qué es lo que menos te gusta de la ciudad?',
      '¿Cómo te imaginas Medellín dentro de 15 años?',
      '¿Cuál es tu mejor recuerdo en esta ciudad?',
      '¿Qué sonido te hace pensar en Medellín?',
    ],
  },
  {
    nombre: 'Siguiendo el rastro de Medellín',
    verbo: 'Busquen imágenes de la ciudad',
    descripcion: 'Busquen imágenes del pasado, el presente y el futuro de la ciudad y súbanlas desde la galería.',
    color: '#ff9f43',
    icono: 'books-fill',
    tipo: 'fotos',
    preguntas: [],
  },
];

/** Las notas de las estaciones, siempre con una casilla por estación (las notas sueltas de antes). */
export function notasEstaciones(estaciones: string[] | undefined): string[] {
  return ESTACIONES.map((_, i) => estaciones?.[i] ?? '');
}
