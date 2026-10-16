/**
 * Exportar la pieza como video: el visual, la frase y todo lo que suena.
 *
 * Se toca la pieza de principio a fin en tiempo real y se graba: el lienzo
 * del visual se compone con el texto en un canvas aparte, y el audio se
 * saca de la salida final de Tone. Sale un .webm que se abre en cualquier
 * navegador y se sube a donde sea.
 */
import * as Tone from 'tone';
import { motorAudio } from '../audio/motorAudio';
import { motorVisual } from '../visual/motorVisual';
import { palabrasDe } from '../estado/proyecto';
import { duracionVoz, recorrido } from '../estado/escenas';
import type { Proyecto } from '../estado/tipos';

const ANCHO = 1280;
const ALTO = 720;

export interface Exportacion {
  cancelar: () => void;
  terminado: Promise<Blob | null>;
}

function dibujarTexto(ctx: CanvasRenderingContext2D, palabras: string[], reveladas: number): void {
  if (palabras.length === 0) return;
  ctx.font = '700 38px system-ui, sans-serif';
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
  const alto = 50;
  let y = ALTO - 70 - (lineas.length - 1) * alto;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 18;
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
  ctx.shadowBlur = 0;
}

export function exportarVideo(leerProyecto: () => Proyecto, alProgreso: (avance: number) => void): Exportacion {
  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d')!;
  let cuadro = 0;
  let cancelado = false;

  const contexto = Tone.getContext().rawContext as AudioContext;
  const destino = contexto.createMediaStreamDestination();
  Tone.getDestination().connect(destino);

  const flujo = lienzo.captureStream(30);
  for (const pista of destino.stream.getAudioTracks()) flujo.addTrack(pista);
  const tipo = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  const grabadora = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: 5_000_000 });
  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => e.data.size > 0 && trozos.push(e.data);

  const pintar = () => {
    cuadro = requestAnimationFrame(pintar);
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    const fuente = motorVisual.lienzoActual;
    if (fuente && fuente.width > 0) {
      // Cubre todo el cuadro sin deformar.
      const escala = Math.max(ANCHO / fuente.width, ALTO / fuente.height);
      const w = fuente.width * escala;
      const h = fuente.height * escala;
      ctx.drawImage(fuente, (ANCHO - w) / 2, (ALTO - h) / 2, w, h);
    }
    const p = leerProyecto();
    const escena = recorrido(p)[motorAudio.seccionActual];
    if (escena && !escena.respiro) {
      const palabras = palabrasDe(escena.texto);
      const reveladas = Math.min(
        palabras.length,
        Math.ceil((motorAudio.segundosEnSeccion / Math.max(0.5, duracionVoz(escena))) * palabras.length),
      );
      dibujarTexto(ctx, palabras, reveladas);
    }
    alProgreso(motorAudio.progresoPieza);
  };

  const terminado = new Promise<Blob | null>((listo) => {
    grabadora.onstop = () => {
      cancelAnimationFrame(cuadro);
      Tone.getDestination().disconnect(destino);
      listo(cancelado || trozos.length === 0 ? null : new Blob(trozos, { type: 'video/webm' }));
    };
  });

  void (async () => {
    grabadora.start(500);
    pintar();
    await motorAudio.reproducirPieza();
    // Espera a que arranque y luego a que termine (con la cola del final).
    await new Promise((r) => setTimeout(r, 400));
    while (motorAudio.estaSonando && !cancelado) await new Promise((r) => setTimeout(r, 250));
    if (!cancelado) await new Promise((r) => setTimeout(r, 1200));
    grabadora.stop();
  })();

  return {
    cancelar: () => {
      cancelado = true;
      motorAudio.detener();
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
