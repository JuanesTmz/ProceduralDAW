/**
 * La puerta de exportación: los mínimos que debe cumplir una pieza
 * antes de poder exportarse.
 *
 * No es burocracia — cada requisito corresponde a un criterio de la rúbrica.
 * Y se calcula solo a partir del proyecto, así que el estudiante ve en todo
 * momento qué le falta, sin tener que preguntar.
 */
import { MINIMO_PALABRAS } from '../estado/tipos';
import type { Proyecto, Vista } from '../estado/tipos';
import { palabrasDe } from '../estado/proyecto';
import { tieneElementoGenerativo } from '../generativo/motorGenerativo';

export interface Requisito {
  id: string;
  etiqueta: string;
  cumplido: boolean;
  /** Qué hacer para cumplirlo. */
  pista: string;
  /** A qué paso hay que ir. */
  paso: Vista;
  /** Si es false, no bloquea la exportación pero sí se recomienda. */
  bloqueante: boolean;
}

/** ¿Las secciones suenan realmente distintas entre sí? */
function seccionesSeDistinguen(proyecto: Proyecto): boolean {
  const firmas = proyecto.secciones.map(
    (s) => `${s.intensidad.toFixed(2)}|${[...s.capasActivas].sort().join(',')}|${s.melodiaActiva}`,
  );
  return new Set(firmas).size >= 2;
}

export function evaluarRequisitos(proyecto: Proyecto): Requisito[] {
  const palabras = palabrasDe(proyecto.narracion.texto).length;

  return [
    {
      id: 'historia',
      etiqueta: 'La historia y su porqué',
      cumplido:
        proyecto.historia.que.trim().length > 15 && proyecto.historia.porQue.trim().length > 15,
      pista: 'Responde las dos preguntas del paso Historia.',
      paso: 'historia',
      // No bloquea, pero vale el 37% de la rúbrica entre relato y arraigo.
      bloqueante: false,
    },
    {
      id: 'monologo',
      etiqueta: `Monólogo de ~100 palabras`,
      cumplido: palabras >= MINIMO_PALABRAS,
      pista:
        palabras === 0
          ? 'Todavía no has escrito el monólogo.'
          : `Llevas ${palabras} palabras; necesitas al menos ${MINIMO_PALABRAS}.`,
      paso: 'monologo',
      bloqueante: true,
    },
    {
      id: 'narracion',
      etiqueta: 'Narración grabada',
      cumplido: Boolean(proyecto.narracion.audioUrl),
      pista: 'Graba tu voz, o narra con el celular y sube el archivo.',
      paso: 'monologo',
      bloqueante: true,
    },
    {
      id: 'generativo',
      etiqueta: 'Música que varía con la semilla',
      cumplido: tieneElementoGenerativo(proyecto.patron),
      pista:
        'Pon al menos una fila en Euclidiano o Probabilístico, o bájale la probabilidad a algunos pasos.',
      paso: 'motor',
      bloqueante: true,
    },
    {
      id: 'secciones',
      etiqueta: 'Secciones que se distinguen',
      cumplido: seccionesSeDistinguen(proyecto),
      pista: 'Dale distinta intensidad o distintas capas a Intro, Cuerpo, Giro y Cierre.',
      paso: 'arco',
      bloqueante: true,
    },
    {
      id: 'visual',
      etiqueta: 'Visual con tu imagen',
      cumplido: Boolean(proyecto.visual.imagenUrl),
      pista: 'Sube la foto de tu tema: la rúbrica pide que el visual acompañe la historia.',
      paso: 'visual',
      bloqueante: true,
    },
  ];
}

export function puedeExportar(proyecto: Proyecto): boolean {
  return evaluarRequisitos(proyecto).every((r) => !r.bloqueante || r.cumplido);
}

/** Cuántos requisitos van cumplidos, para la barra de progreso. */
export function avanceDeRequisitos(proyecto: Proyecto): { hechos: number; total: number } {
  const requisitos = evaluarRequisitos(proyecto);
  return {
    hechos: requisitos.filter((r) => r.cumplido).length,
    total: requisitos.length,
  };
}

/**
 * ¿Este paso ya está resuelto? Lo usa la barra de progreso para marcar
 * los pasos con visto bueno.
 */
export function pasoCompleto(proyecto: Proyecto, vista: Vista): boolean {
  const requisitos = evaluarRequisitos(proyecto);
  switch (vista) {
    case 'historia':
      return requisitos[0].cumplido;
    case 'monologo':
      return requisitos[1].cumplido && requisitos[2].cumplido;
    case 'arco':
      return requisitos[4].cumplido;
    case 'patron':
      // Basta con que haya material: algún golpe o alguna nota.
      return (
        proyecto.patron.filas.some((f) => f.pasos.some(Boolean)) ||
        proyecto.patron.melodia.notas.length > 0
      );
    case 'motor':
      return requisitos[3].cumplido;
    case 'secciones':
      return requisitos[4].cumplido;
    case 'visual':
      return requisitos[5].cumplido;
    case 'exportar':
      return puedeExportar(proyecto);
    default:
      return false;
  }
}
