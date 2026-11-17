// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Las estaciones del SmartFest: una casilla por estación en el paso
 * Historia, donde el equipo anota lo que encontró en cada una. Son la
 * ayuda para escribir el monólogo final.
 *
 * Todavía no tienen nombre: cuando lo tengan, se cambian aquí (el nombre y
 * la pregunta) y la app los toma sola.
 */
export interface Estacion {
  nombre: string;
  /** La pregunta que guía lo que se anota. */
  pregunta: string;
}

export const ESTACIONES: Estacion[] = [
  { nombre: 'Estación 1', pregunta: '¿Qué viste, oíste o sentiste aquí?' },
  { nombre: 'Estación 2', pregunta: '¿Qué te sorprendió?' },
  { nombre: 'Estación 3', pregunta: '¿Qué tiene que ver con Medellín?' },
  { nombre: 'Estación 4', pregunta: '¿Qué persona, lugar o sonido te quedó?' },
  { nombre: 'Estación 5', pregunta: '¿Qué te gustaría contar de esto?' },
];

/** Las notas de las estaciones, siempre con una casilla por estación. */
export function notasEstaciones(estaciones: string[] | undefined): string[] {
  return ESTACIONES.map((_, i) => estaciones?.[i] ?? '');
}
