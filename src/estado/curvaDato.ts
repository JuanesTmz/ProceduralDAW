/**
 * La vista previa de un dato: cómo se movería a lo largo de toda la pieza.
 *
 * No suena nada: se recorre la línea de tiempo (escena tras escena) y en
 * cada punto se lee el dato como lo leería el motor. Lo que depende de
 * lo que suena (la voz, los golpes, el pulso) se reconstruye con lo que dicen
 * las celdas y el tempo, así que es una aproximación fiel, no la medida real.
 */
import { valorDato, type ContextoDato, type Vivo } from './datos';
import { duracionVoz, EMOCIONES, recorrido } from './escenas';
import { golpesDe, notasDe } from './patronEscena';
import { palabrasDe } from './proyecto';
import { FILAS_MATRIZ, type Proyecto } from './tipos';

export interface Tramo {
  id: string;
  nombre: string;
  color: string;
  inicio: number;
  fin: number;
}

export interface LineaDeTiempo {
  tramos: Tramo[];
  duracion: number;
}

/** Las escenas (y respiros) puestas una detrás de otra, con sus segundos. */
export function lineaDeTiempo(p: Proyecto): LineaDeTiempo {
  let t = 0;
  const tramos = recorrido(p).map((e) => {
    const dura = e.respiro ? e.duracionRespiro : duracionVoz(e) + 0.8;
    const tramo: Tramo = {
      id: e.id,
      nombre: e.respiro ? 'Respiro' : e.nombre,
      color: e.respiro ? '#8b91a5' : EMOCIONES[e.emocion].color,
      inicio: t,
      fin: t + dura,
    };
    t += dura;
    return tramo;
  });
  return { tramos, duracion: Math.max(1, t) };
}

const caida = (pasosDesde: number, vida: number) => Math.exp(-pasosDesde / vida);

/** Hace cuántos pasos fue el último golpe (0 si es este), mirando hasta 8 atrás. */
function pasosDesdeGolpe(pasos: boolean[], paso: number): number {
  const n = pasos.length;
  if (n === 0) return 99;
  for (let d = 0; d < 8; d++) if (pasos[(paso - d + n * 8) % n]) return d;
  return 99;
}

/**
 * Cómo se mueve un dato a lo largo de la pieza: `muestras` valores de 0 a 1,
 * uno por cada punto de la línea de tiempo.
 */
export function curvaDeDato(p: Proyecto, clave: string, muestras = 360): number[] {
  const { tramos, duracion } = lineaDeTiempo(p);
  const lista = recorrido(p);
  const n = p.patron.cantidadPasos;
  const salida: number[] = [];

  for (let k = 0; k < muestras; k++) {
    const t = (k / (muestras - 1)) * duracion;
    const i = Math.max(0, tramos.findIndex((x) => t >= x.inicio && t <= x.fin));
    const escena = lista[i];
    const tramo = tramos[i];
    if (!escena || !tramo) {
      salida.push(0.5);
      continue;
    }
    const local = t - tramo.inicio;
    const fraccion = (local / Math.max(0.001, tramo.fin - tramo.inicio));
    const bpm = p.bpm * EMOCIONES[escena.emocion].tempo;
    const pasoSeg = 60 / bpm / 4;
    const paso = Math.floor(local / pasoSeg) % n;
    const fasePaso = (local / pasoSeg) % 1;

    // Lo que suena en esta escena, reconstruido de las celdas.
    const golpes: Record<string, number> = {};
    let capas = 0;
    const niveles = escena.niveles;
    for (const f of p.patron.filas) {
      const enciende = niveles ? (niveles[f.id] ?? 0) > 0 : true;
      if (enciende) capas += 1;
      const d = pasosDesdeGolpe(golpesDe(p, escena.id, f.id).pasos, paso);
      golpes[f.id] = enciende ? caida(d + fasePaso, 1.4) : 0;
    }
    const notas = notasDe(p, escena.id);
    const aqui = notas.filter((x) => x.paso === paso);
    const melodiaSuena = niveles ? (niveles.melodia ?? 0) > 0 : true;
    if (melodiaSuena) capas += 1;
    golpes.melodia = melodiaSuena && aqui.length > 0 ? caida(fasePaso, 1.4) : 0;
    const ultima = [...notas].filter((x) => x.paso <= paso).sort((a, b) => b.paso - a.paso)[0] ?? notas[0];
    const bombo = p.patron.filas.find((f) => f.tipo === 'bombo');
    const palabras = palabrasDe(escena.texto).length;
    const habla = !escena.respiro && palabras > 0 && local > 0.15;
    const ritmoPalabra = palabras / Math.max(1, duracionVoz(escena));
    const fasePalabra = (local * ritmoPalabra) % 1;
    const voz = habla ? 0.25 + 0.6 * caida(fasePalabra * 4, 1.6) : 0;
    const pulso = caida(((local / (60 / bpm)) % 1) * 4, 1.2);

    const vivo: Vivo = {
      voz,
      bombo: bombo ? golpes[bombo.id] ?? 0 : 0,
      pulso,
      compas: (local / (60 / bpm) / 4) % 1,
      golpes,
      nota: ultima ? ultima.grado / (FILAS_MATRIZ - 1) : 0,
      capas: (capas / (p.patron.filas.length + 1)),
      palabra: habla ? caida(fasePalabra * 4, 1.2) : 0,
      paso,
      vuelta: Math.floor(local / (pasoSeg * n)),
      segundos: t,
      volumen: Math.min(1, 0.3 + 0.4 * voz + 0.3 * (bombo ? golpes[bombo.id] ?? 0 : 0)),
      graves: bombo ? golpes[bombo.id] ?? 0 : 0,
      medios: voz,
      agudos: pulso * 0.7,
    };
    const contexto: ContextoDato = {
      proyecto: p,
      escena,
      sonando: true,
      fraccion,
      avance: t / duracion,
      vivo,
    };
    salida.push(Math.max(0, Math.min(1, valorDato(clave, contexto))));
  }
  return salida;
}
