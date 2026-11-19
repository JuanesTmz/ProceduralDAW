// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Exportar la pieza como video: el visual, la frase y todo lo que suena.
 *
 * Se toca la pieza de principio a fin en tiempo real y se graba: el lienzo
 * del visual se compone con el texto en un canvas aparte, y el audio se
 * saca de la salida final de Tone. Sale un .webm que se abre en cualquier
 * navegador y se sube a donde sea.
 *
 * Lo que hace que el video se vea bien (antes salía pixelado y a saltos):
 * - Mientras se graba, el visual se pinta a un tamaño fijo 16:9, cerca del
 *   del video, y no baja de resolución aunque la tablet vaya justa (ver
 *   `motorVisual.modoExportar`). Antes se estiraba un lienzo de 300 a 700 px.
 * - Se pinta a 30 cuadros parejos y cada cuadro se copia justo después de
 *   pintarse.
 * - Se prefiere H.264, que en la tablet lo codifica el chip de video: con
 *   VP9 lo hacía el procesador, que no daba abasto. Antes de que suene la
 *   pieza se prueba cada formato medio segundo; si no arranca, el siguiente.
 * - Los golpes de la imagen (destello, zoom, sacudón…) y los mandos de la
 *   obra (brillo, zoom, giro, tono, saturación) se ven en pantalla con CSS;
 *   aquí se pintan también, para que el video sea igual a lo que se ve.
 * - La frase se dibuja en una capa aparte solo cuando cambia.
 */
import * as Tone from 'tone';
import arreglarDuracion from 'fix-webm-duration';
import { motorAudio } from '../audio/motorAudio';
import { motorVisual } from '../visual/motorVisual';
import { enVivo } from '../visual/enVivo';
import { palabrasDe } from '../estado/proyecto';
import { duracionVoz, recorrido } from '../estado/escenas';
import type { GolpeVisual, Proyecto } from '../estado/tipos';

/** El video: 1280×720 a 30 cuadros por segundo. */
const ANCHO = 1280;
const ALTO = 720;
const CUADROS = 30;
const CADA_MS = 1000 / CUADROS;
const BITS_VIDEO = 6_000_000;
const BITS_AUDIO = 160_000;

/**
 * El visual se pinta a este tamaño mientras se graba. En la tablet, algo
 * menos que el video (su GPU no da para más a 30 cuadros); el paso a 1280 se
 * hace con suavizado.
 */
const VISUAL_TACTIL = { ancho: 960, alto: 540 };
const VISUAL_ESCRITORIO = { ancho: ANCHO, alto: ALTO };

/** Los formatos, del mejor al último recurso. Siempre .webm: así se le puede anotar la duración. */
const FORMATOS = [
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=avc1,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm',
];

/** Cuánto se espera el primer pedazo de la prueba: si no llega, ese formato no sirve en esta tablet. */
const ESPERA_PRUEBA = 2000;

export interface Exportacion {
  cancelar: () => void;
  terminado: Promise<Blob | null>;
}

// ------------------------------------------------------------ la frase

/** La frase en su propia capa: se vuelve a dibujar solo cuando cambia. */
function crearCapaTexto() {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d')!;
  let clave = '';

  const pintar = (id: string, palabras: string[], reveladas: number): void => {
    const nueva = `${id}|${reveladas}|${palabras.length}`;
    if (nueva === clave) return;
    clave = nueva;
    ctx.clearRect(0, 0, ANCHO, ALTO);
    if (palabras.length === 0) return;
    ctx.font = '800 40px "Nunito Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const margen = 90;
    const lineas: { palabra: string; i: number }[][] = [[]];
    let ancho = 0;
    palabras.forEach((palabra, i) => {
      const w = ctx.measureText(`${palabra} `).width;
      if (ancho + w > ANCHO - margen * 2 && lineas[lineas.length - 1].length > 0) {
        lineas.push([]);
        ancho = 0;
      }
      lineas[lineas.length - 1].push({ palabra, i });
      ancho += w;
    });
    const alto = 52;
    let y = ALTO - 70 - (lineas.length - 1) * alto;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
    for (const linea of lineas) {
      const total = linea.reduce((s, p) => s + ctx.measureText(`${p.palabra} `).width, 0);
      let x = (ANCHO - total) / 2;
      for (const p of linea) {
        ctx.fillStyle = p.i < reveladas ? '#ffffff' : 'rgba(255,255,255,0.22)';
        ctx.fillText(p.palabra, x, y);
        x += ctx.measureText(`${p.palabra} `).width;
      }
      y += alto;
    }
  };

  return { lienzo, pintar, borrar: () => pintar('', [], 0) };
}

// ------------------------------------------------------------ los golpes

/** Lo mismo que las animaciones CSS de los golpes del marco (ver narrativa.css, .nv-golpe--*). */
const SACUDON: [number, number, number][] = [
  [0, 0, 0],
  [0.2, -10, 4],
  [0.4, 9, -6],
  [0.6, -6, 6],
  [0.8, 5, -3],
  [1, 0, 0],
];

/** Lo que queda de la animación al avanzar `t` (0..1), con salida suave. */
const resta = (t: number, potencia = 2) => (1 - t) ** potencia;

function sacudon(t: number): [number, number] {
  for (let i = 0; i < SACUDON.length - 1; i++) {
    const [t0, x0, y0] = SACUDON[i];
    const [t1, x1, y1] = SACUDON[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  return [0, 0];
}

/** Cómo va cada golpe ahora mismo, a partir de cuándo ocurrió (enVivo). */
function golpesAhora() {
  const edades = enVivo.edades();
  const fase = (g: GolpeVisual, dura: number) => {
    const t = edades[g] / dura;
    return t >= 0 && t < 1 ? t : null;
  };
  const f = (g: GolpeVisual) => enVivo.fuerzaDe(g);
  let escala = 1;
  let giro = 0;
  let dx = 0;
  let dy = 0;
  let blanco = 0;
  let negro = 0;
  const filtros: string[] = [];
  let t: number | null;
  if ((t = fase('zoom', 0.5)) !== null) escala *= 1 + 0.12 * f('zoom') * resta(t, 3);
  if ((t = fase('giro', 0.6)) !== null) {
    giro += 9 * f('giro') * resta(t, 3);
    escala *= 1 + 0.08 * resta(t, 3);
  }
  if ((t = fase('sacudon', 0.4)) !== null) {
    const [x, y] = sacudon(t);
    dx = x * f('sacudon');
    dy = y * f('sacudon');
  }
  if ((t = fase('invertir', 0.5)) !== null) filtros.push(`invert(${resta(t).toFixed(2)})`, `hue-rotate(${Math.round(180 * resta(t))}deg)`);
  if ((t = fase('tinte', 0.9)) !== null) {
    filtros.push(`hue-rotate(${Math.round(120 * f('tinte') * resta(t))}deg)`, `saturate(${(1 + 0.7 * resta(t)).toFixed(2)})`);
  }
  if ((t = fase('borroso', 0.5)) !== null) filtros.push(`blur(${(9 * f('borroso') * resta(t)).toFixed(1)}px)`);
  if ((t = fase('destello', 0.45)) !== null) blanco = 0.55 * f('destello') * resta(t);
  if ((t = fase('corte', 0.35)) !== null) negro = t < 0.5 ? 1 : 0.5;
  return { escala, giro, dx, dy, filtros, blanco, negro };
}

// ------------------------------------------------------------ el formato

interface Grabacion {
  grabadora: MediaRecorder;
  trozos: Blob[];
  /** Cuándo empezó a grabar (performance.now), para anotar la duración. */
  inicio: number;
}

/**
 * ¿Este formato de verdad graba aquí? El navegador puede decir que acepta
 * H.264 y que luego el chip no arranque. Se prueba con la imagen sola: con la
 * pista de audio, el navegador retiene el video hasta que llega sonido, y la
 * prueba no sabría distinguir eso de un códec que no funciona.
 */
function formatoGraba(imagen: MediaStream, tipo: string): Promise<boolean> {
  let grabadora: MediaRecorder;
  try {
    grabadora = new MediaRecorder(imagen, { mimeType: tipo, videoBitsPerSecond: BITS_VIDEO });
  } catch {
    return Promise.resolve(false);
  }
  return new Promise<boolean>((listo) => {
    const terminar = (bien: boolean) => {
      window.clearTimeout(reloj);
      grabadora.ondataavailable = null;
      grabadora.onerror = null;
      try {
        if (grabadora.state !== 'inactive') grabadora.stop();
      } catch {
        // Ya se había parado sola.
      }
      listo(bien);
    };
    const reloj = window.setTimeout(() => terminar(false), ESPERA_PRUEBA);
    grabadora.ondataavailable = (e) => e.data.size > 0 && terminar(true);
    grabadora.onerror = () => terminar(false);
    try {
      grabadora.start(250);
    } catch {
      terminar(false);
    }
  });
}

/** Arranca la grabadora con el primer formato que de verdad graba. */
async function grabadoraQueFunciona(flujo: MediaStream): Promise<Grabacion> {
  const imagen = new MediaStream(flujo.getVideoTracks());
  const posibles = FORMATOS.filter((t) => typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(t));
  let elegido: string | undefined;
  for (const tipo of posibles) {
    if (await formatoGraba(imagen, tipo)) {
      elegido = tipo;
      break;
    }
  }
  // Sin ninguno probado, lo que el navegador escoja.
  const grabadora = new MediaRecorder(flujo, {
    ...(elegido ? { mimeType: elegido } : {}),
    videoBitsPerSecond: BITS_VIDEO,
    audioBitsPerSecond: BITS_AUDIO,
  });
  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => e.data.size > 0 && trozos.push(e.data);
  const inicio = performance.now();
  grabadora.start(500);
  return { grabadora, trozos, inicio };
}

// ------------------------------------------------------------ exportar

export function exportarVideo(leerProyecto: () => Proyecto, alProgreso: (avance: number) => void): Exportacion {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const texto = crearCapaTexto();
  let cuadro = 0;
  let cancelado = false;
  let ultimoCuadro = 0;
  let ultimoVisual = 0;

  const contexto = Tone.getContext().rawContext as AudioContext;
  const destino = contexto.createMediaStreamDestination();
  Tone.getDestination().connect(destino);

  const flujo = lienzo.captureStream(CUADROS);
  for (const pista of destino.stream.getAudioTracks()) flujo.addTrack(pista);

  /** Un cuadro del video: el visual con sus golpes y la frase encima. */
  const componer = () => {
    ultimoCuadro = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, ANCHO, ALTO);

    const fuente = motorVisual.lienzoActual;
    if (fuente && fuente.width > 1) {
      const g = golpesAhora();
      const obra = motorVisual.obra;
      ctx.save();
      ctx.translate(ANCHO / 2 + g.dx, ALTO / 2 + g.dy);
      ctx.rotate(((g.giro + obra.giro) * Math.PI) / 180);
      const escala = g.escala * obra.escala;
      ctx.scale(escala, escala);
      const filtro = [obra.filtro === 'none' ? '' : obra.filtro, ...g.filtros].filter(Boolean).join(' ');
      if (filtro) ctx.filter = filtro;
      // Cubre todo el cuadro sin deformar.
      const cubre = Math.max(ANCHO / fuente.width, ALTO / fuente.height);
      const w = fuente.width * cubre;
      const h = fuente.height * cubre;
      ctx.drawImage(fuente, -w / 2, -h / 2, w, h);
      ctx.restore();
      if (g.blanco > 0 || g.negro > 0) {
        ctx.globalAlpha = Math.min(1, g.negro || g.blanco);
        ctx.fillStyle = g.negro ? '#000' : '#fff';
        ctx.fillRect(0, 0, ANCHO, ALTO);
        ctx.globalAlpha = 1;
      }
    }

    const p = leerProyecto();
    const escena = recorrido(p)[motorAudio.seccionActual];
    if (escena && !escena.respiro && motorAudio.estaSonando) {
      const palabras = palabrasDe(escena.texto);
      const reveladas = Math.min(
        palabras.length,
        Math.ceil((motorAudio.segundosEnSeccion / Math.max(0.5, duracionVoz(escena))) * palabras.length),
      );
      texto.pintar(escena.id, palabras, reveladas);
    } else {
      texto.borrar();
    }
    ctx.drawImage(texto.lienzo, 0, 0);
  };

  // El visual avisa tras pintar cada cuadro; si no está pintando (sin algoritmo), el video sigue igual.
  const tactil = matchMedia('(pointer: coarse)').matches;
  motorVisual.modoExportar({
    ...(tactil ? VISUAL_TACTIL : VISUAL_ESCRITORIO),
    cadaMs: CADA_MS,
    alPintar: () => {
      ultimoVisual = performance.now();
      componer();
    },
  });
  const respaldo = () => {
    cuadro = requestAnimationFrame(respaldo);
    const ahora = performance.now();
    if (ahora - ultimoVisual > 120 && ahora - ultimoCuadro >= CADA_MS - 4) componer();
    alProgreso(motorAudio.progresoPieza);
  };
  respaldo();

  let parar: () => void = () => undefined;
  const terminado = new Promise<Blob | null>((listo) => {
    const soltar = () => {
      cancelAnimationFrame(cuadro);
      motorVisual.modoExportar(null);
      Tone.getDestination().disconnect(destino);
    };

    void (async () => {
      let grabacion: Grabacion;
      try {
        grabacion = await grabadoraQueFunciona(flujo);
      } catch {
        soltar();
        return listo(null);
      }
      const { grabadora, trozos, inicio } = grabacion;
      grabadora.onstop = () => {
        soltar();
        if (cancelado || trozos.length === 0) return listo(null);
        // El navegador graba el .webm sin anotar cuánto dura: sin esto, los
        // reproductores muestran 0:00 y no dejan adelantar.
        const video = new Blob(trozos, { type: 'video/webm' });
        arreglarDuracion(video, performance.now() - inicio, { logger: false }).then(listo, () => listo(video));
      };
      parar = () => grabadora.state !== 'inactive' && grabadora.stop();
      if (cancelado) return parar();

      await motorAudio.reproducirPieza();
      // Espera a que arranque y luego a que termine (con la cola del final).
      await new Promise((r) => setTimeout(r, 400));
      while (motorAudio.estaSonando && !cancelado) await new Promise((r) => setTimeout(r, 250));
      if (!cancelado) await new Promise((r) => setTimeout(r, 1200));
      parar();
    })();
  });

  return {
    cancelar: () => {
      cancelado = true;
      motorAudio.detener();
      parar();
    },
    terminado,
  };
}

/** Descarga un archivo con su nombre. */
export function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
