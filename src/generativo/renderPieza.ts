/**
 * Calcula la pieza completa antes de tocarla.
 *
 * El motor de audio decide en cada paso si un golpe suena, y lo decide con
 * la semilla: misma semilla, misma decisión. Eso quiere decir que la pieza
 * entera se puede calcular por adelantado, y es lo que permite dibujar la
 * línea de tiempo con los golpes REALES de cada vuelta en vez de repetir el
 * esqueleto cuatro veces.
 *
 * La regla de oro de este archivo: tiene que decidir exactamente lo mismo
 * que `motorAudio.tocarPaso`. Por eso los dos usan `debeSonar`,
 * `densidadDeIntensidad` y `nivelDeCapa`, y ninguno hace su propia cuenta.
 */
import {
  ajusteDeRemate,
  debeSonar,
  densidadDeIntensidad,
  enRemate,
  filaDeRemate,
  nivelDeCapa,
  PROBABILIDAD_NIVEL,
} from './motorGenerativo';
import type { Fila, NombreSeccion, Proyecto } from '../estado/tipos';

export interface TramoSeccion {
  id: NombreSeccion;
  etiqueta: string;
  indice: number;
  /** Primer paso absoluto de la parte. */
  pasoInicio: number;
  /** Cuántos pasos dura, contando todas sus vueltas. */
  pasos: number;
  vueltas: number;
  /** Primera vuelta global de la parte. */
  vueltaInicio: number;
}

export interface FilaRenderizada {
  id: string;
  nombre: string;
  color: string;
  /**
   * Un valor por paso de TODA la pieza: 0 = silencio, 1..3 = suena con ese
   * escalón de energía. Un byte por paso, que a 200 vueltas sigue siendo poco.
   */
  golpes: Uint8Array;
  /** Cuántos golpes suenan en total, para el resumen. */
  total: number;
}

export interface NotaRenderizada {
  grado: number;
  /** Paso absoluto dentro de la pieza. */
  paso: number;
}

export interface PiezaRenderizada {
  pasosPorVuelta: number;
  totalVueltas: number;
  totalPasos: number;
  /** Segundos que dura un paso, sin contar el tempo propio de cada parte. */
  segundosPorPaso: number;
  tramos: TramoSeccion[];
  filas: FilaRenderizada[];
  /** Las notas de la matriz, repetidas en cada vuelta donde la matriz suena. */
  notas: NotaRenderizada[];
  /** Cuántas filas de la matriz hay, para dibujar las notas a escala. */
  gradosMatriz: number;
  /** El tramo de la pieza en que habla la voz, en pasos absolutos. */
  voz: { inicio: number; fin: number } | null;
}

/** Mute y solo, igual que en el motor de audio. */
function filaSuena(fila: Fila, filas: Fila[]): boolean {
  if (fila.silenciada) return false;
  const haySolo = filas.some((f) => f.soloActivo);
  return !haySolo || fila.soloActivo;
}

export function renderizarPieza(proyecto: Proyecto): PiezaRenderizada {
  const { patron, secciones } = proyecto;
  const pasosPorVuelta = patron.cantidadPasos;
  const totalVueltas = secciones.reduce((suma, s) => suma + s.compases, 0);
  const totalPasos = totalVueltas * pasosPorVuelta;

  // Qué parte le toca a cada vuelta global, resuelto una vez.
  const tramos: TramoSeccion[] = [];
  const seccionDeVuelta: number[] = [];
  let vueltaCorrida = 0;
  secciones.forEach((seccion, indice) => {
    tramos.push({
      id: seccion.id,
      etiqueta: seccion.etiqueta,
      indice,
      pasoInicio: vueltaCorrida * pasosPorVuelta,
      pasos: seccion.compases * pasosPorVuelta,
      vueltas: seccion.compases,
      vueltaInicio: vueltaCorrida,
    });
    for (let v = 0; v < seccion.compases; v++) seccionDeVuelta.push(indice);
    vueltaCorrida += seccion.compases;
  });

  const filas: FilaRenderizada[] = patron.filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    color: fila.color,
    golpes: new Uint8Array(totalPasos),
    total: 0,
  }));

  for (let vuelta = 0; vuelta < totalVueltas; vuelta++) {
    const indiceSeccion = seccionDeVuelta[vuelta];
    const seccion = secciones[indiceSeccion];
    if (!seccion) continue;

    const aMano = seccion.modo === 'manual';
    const factorDensidad = aMano ? 1 : densidadDeIntensidad(seccion.intensidad);

    // Última vuelta de la parte, y todavía queda parte siguiente: hay remate.
    const vueltasPrevias = tramos[indiceSeccion].vueltaInicio;
    const ultimaVuelta =
      vuelta - vueltasPrevias === seccion.compases - 1 && indiceSeccion < secciones.length - 1;

    // El redoble le toca a la pista más movida DE ESTA PARTE: en una intro de
    // dos capas no puede recaer en una pista que está apagada.
    const idRedoble = ultimaVuelta
      ? filaDeRemate(patron.filas.filter((f) => nivelDeCapa(seccion, f.id) > 0))
      : null;

    patron.filas.forEach((fila, iFila) => {
      if (!filaSuena(fila, patron.filas)) return;
      const nivel = nivelDeCapa(seccion, fila.id);
      if (nivel === 0) return;

      const salida = filas[iFila];
      const base = vuelta * pasosPorVuelta;

      for (let paso = 0; paso < pasosPorVuelta; paso++) {
        const remate = enRemate(paso, pasosPorVuelta, ultimaVuelta);
        const esRedoble = remate && fila.id === idRedoble;
        if (!fila.pasos[paso] && !esRedoble) continue;

        const inicial = aMano
          ? (fila.probabilidad[paso] ?? 1)
          : (fila.probabilidad[paso] ?? 1) * factorDensidad * PROBABILIDAD_NIVEL[nivel];
        const probabilidad = esRedoble
          ? 1
          : inicial * (remate ? ajusteDeRemate(paso, pasosPorVuelta).probabilidad : 1);

        if (!debeSonar(seccion.semilla, fila.id, paso, vuelta, probabilidad)) continue;
        salida.golpes[base + paso] = nivel;
        salida.total += 1;
      }
    });
  }

  // La matriz no varía con la semilla: lo que cambia es en qué partes suena.
  const melodia = patron.melodia;
  const haySolo = patron.filas.some((f) => f.soloActivo) || melodia.soloActivo;
  const matrizAudible = !melodia.silenciada && (!haySolo || melodia.soloActivo);
  const notas: NotaRenderizada[] = [];
  if (matrizAudible) {
    for (let vuelta = 0; vuelta < totalVueltas; vuelta++) {
      const seccion = secciones[seccionDeVuelta[vuelta]];
      if (!seccion?.melodiaActiva) continue;
      const base = vuelta * pasosPorVuelta;
      for (const nota of melodia.notas) {
        notas.push({ grado: nota.grado, paso: base + nota.paso });
      }
    }
  }

  return {
    pasosPorVuelta,
    totalVueltas,
    totalPasos,
    segundosPorPaso: 60 / proyecto.bpm / 4,
    tramos,
    filas,
    notas,
    gradosMatriz: 16,
    voz: tramoDeVoz(proyecto, tramos, pasosPorVuelta, totalPasos),
  };
}

/**
 * Desde dónde habla la voz. Entra en la parte que diga la narración, con su
 * desfase en segundos traducido a pasos, y se extiende hasta el final: no se
 * sabe cuánto dura la grabación hasta que carga, y dibujar de menos engaña
 * más que dibujar de más.
 */
function tramoDeVoz(
  proyecto: Proyecto,
  tramos: TramoSeccion[],
  pasosPorVuelta: number,
  totalPasos: number,
): { inicio: number; fin: number } | null {
  const { narracion } = proyecto;
  if (!narracion.audioUrl && narracion.texto.trim().length === 0) return null;

  const tramo = tramos.find((t) => t.id === narracion.seccionInicio) ?? tramos[0];
  if (!tramo) return null;

  const segundosPorPaso = 60 / proyecto.bpm / 4;
  const desfaseEnPasos = Math.round(Math.max(0, narracion.desfase) / segundosPorPaso);
  const inicio = Math.min(totalPasos - 1, tramo.pasoInicio + desfaseEnPasos);

  const fin =
    narracion.duracion > 0
      ? Math.min(totalPasos, inicio + Math.round(narracion.duracion / segundosPorPaso))
      : totalPasos;

  return { inicio, fin: Math.max(inicio + pasosPorVuelta / 2, fin) };
}
