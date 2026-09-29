/**
 * El mapa de reglas: traduce el estado del proyecto a frases que un
 * estudiante de bachillerato puede leer y defender ante el jurado.
 * No se escribe a mano: se deduce solo del proyecto.
 */
import { ETIQUETAS_ESCALA } from './escalas';
import { golpesDeFila, probabilidadMedia } from './motorGenerativo';
import type { Proyecto, ReglaFila } from '../estado/tipos';

export interface LineaRegla {
  id: string;
  nombre: string;
  color: string;
  /** Frase principal: qué regla manda en esta fila. */
  regla: string;
  /** Detalles cortos, tipo etiquetas. */
  detalles: string[];
  /** ¿Cambia al mover la semilla? */
  varia: boolean;
}

export interface MapaReglas {
  semilla: number;
  bpm: number;
  cantidadPasos: number;
  lineas: LineaRegla[];
  /** Resumen de una frase para la ficha del jurado. */
  resumen: string;
}

function porcentaje(valor: number): string {
  return `${Math.round(valor * 100)}%`;
}

function describirRegla(regla: ReglaFila, cantidadPasos: number, golpes: number): string {
  switch (regla.modo) {
    case 'euclidiano':
      return `Euclidiano: ${regla.pulsos} pulsos repartidos en ${cantidadPasos} pasos`;
    case 'probabilistico':
      return `Probabilístico: densidad ${porcentaje(regla.densidad)}`;
    case 'manual':
    default:
      return `Manual: ${golpes} ${golpes === 1 ? 'golpe puesto a mano' : 'golpes puestos a mano'}`;
  }
}

export function construirMapaReglas(proyecto: Proyecto): MapaReglas {
  const { patron } = proyecto;

  const lineas: LineaRegla[] = patron.filas.map((fila) => {
    const golpes = golpesDeFila(fila);
    const probabilidad = probabilidadMedia(fila);
    const detalles: string[] = [];

    if (fila.regla.modo === 'euclidiano' && fila.regla.rotacion !== 0) {
      detalles.push(`rotación ${fila.regla.rotacion}`);
    }
    if (probabilidad < 1) detalles.push(`suena ${porcentaje(probabilidad)} de las veces`);
    if (fila.protegida) detalles.push('con candado');
    if (fila.silenciada) detalles.push('silenciada');
    if (fila.tipo === 'sample') detalles.push('sample propio');

    return {
      id: fila.id,
      nombre: fila.nombre,
      color: fila.color,
      regla: describirRegla(fila.regla, patron.cantidadPasos, golpes),
      detalles,
      varia: !fila.protegida && (fila.regla.modo === 'probabilistico' || probabilidad < 1),
    };
  });

  const melodia = patron.melodia;
  if (melodia.notas.length > 0 || melodia.regla.modo !== 'manual') {
    const detalles = [ETIQUETAS_ESCALA[melodia.escala], `${melodia.notas.length} notas`];
    if (melodia.protegida) detalles.push('con candado');
    lineas.push({
      id: 'melodia',
      nombre: 'Bajo / melodía',
      color: '#c792ea',
      regla: describirRegla(melodia.regla, patron.cantidadPasos, melodia.notas.length),
      detalles,
      varia: !melodia.protegida && melodia.regla.modo !== 'manual',
    });
  }

  const cuantasVarian = lineas.filter((l) => l.varia).length;
  const resumen =
    cuantasVarian === 0
      ? 'Ninguna capa varía con la semilla todavía: el patrón es fijo.'
      : `${cuantasVarian} de ${lineas.length} capas cambian al mover la semilla, sobre un esqueleto fijo de ${patron.cantidadPasos} pasos a ${proyecto.bpm} BPM.`;

  return {
    semilla: proyecto.semilla,
    bpm: proyecto.bpm,
    cantidadPasos: patron.cantidadPasos,
    lineas,
    resumen,
  };
}
