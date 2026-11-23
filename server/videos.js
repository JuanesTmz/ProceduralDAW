// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los videos de la galería, listos para verse bien en cualquier pantalla.
 *
 * La tablet graba la pieza en vivo con MediaRecorder: sale un .webm sin
 * índice (no se puede adelantar ni empezar rápido), a veces sin duración,
 * con cuadros disparejos y, si la tablet no tenía H.264, en VP9 de muy baja
 * calidad. Además el iPhone no lo reproduce bien.
 *
 * Por eso, cuando llega un video (y, al arrancar, con los que ya había) el
 * servidor lo convierte con ffmpeg, uno a la vez y sin frenar nada:
 * - `<ruta>.mp4`: H.264 + AAC, 30 cuadros parejos, 1280×720 como máximo,
 *   calidad alta (CRF 19) y con el índice al principio (+faststart): empieza
 *   a sonar en cuanto llegan los primeros datos y se adelanta al instante.
 * - `<ruta>.jpg`: la miniatura para la galería (así no se baja el video
 *   solo para mostrar su portada).
 * - `<ruta>.json`: la ficha con los tamaños; si existe, lo demás ya está.
 *
 * Mientras tanto (o si no hay ffmpeg) se sirve el original, como antes.
 * ffmpeg se busca en FFMPEG o en el PATH; en la imagen de Azure lo instala
 * el Dockerfile.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';

/** Las rutas de lo que se saca de un video. */
export const derivados = (ruta) => ({ mp4: `${ruta}.mp4`, jpg: `${ruta}.jpg`, ficha: `${ruta}.json`, obra: `${ruta}.obra.json` });

/** Corre ffmpeg y espera a que termine; si falla, el error trae lo último que dijo. */
function correr(args) {
  return new Promise((listo, falla) => {
    const proceso = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let dijo = '';
    proceso.stderr.on('data', (d) => (dijo = (dijo + d).slice(-2000)));
    proceso.on('error', falla);
    proceso.on('close', (codigo) => (codigo === 0 ? listo() : falla(new Error(`ffmpeg terminó con ${codigo}: ${dijo.trim()}`))));
  });
}

/** Lee un archivo chico del almacén entero (la ficha). */
async function leerTodo(almacen, ruta, bytes) {
  const trozos = [];
  for await (const t of await almacen.leer(ruta, 0, bytes)) trozos.push(t);
  return Buffer.concat(trozos);
}

export function crearVideos({ almacen, datos }) {
  /** id → ficha ya preparada ({ mp4Bytes, jpgBytes }) */
  const listos = new Map();
  /** ids que ya se revisaron y no tienen ficha (para no preguntar al almacén en cada pedido). */
  const sinFicha = new Set();
  const cola = [];
  const enCola = new Set();
  let trabajando = false;
  /** El id del que se está convirtiendo ahora. */
  let actual = null;
  /** id → ruta en el almacén (la lista de videos de la base no la trae). */
  const rutas = new Map();
  /** null: sin revisar; después, si ffmpeg está. */
  let hayFfmpeg = null;

  async function tieneFfmpeg() {
    if (hayFfmpeg === null) {
      hayFfmpeg = await correr(['-version']).then(
        () => true,
        () => false,
      );
      if (!hayFfmpeg) console.warn('Sin ffmpeg: los videos de la galería se sirven tal como llegan (define FFMPEG o instálalo).');
    }
    return hayFfmpeg;
  }

  /** El video con su ruta: si no la trae, se pide una vez a la base. */
  async function conRuta(video) {
    if (video.ruta) {
      rutas.set(video.id, video.ruta);
      return video;
    }
    if (!rutas.has(video.id)) rutas.set(video.id, (await datos.videoPorId(video.id))?.ruta ?? null);
    const ruta = rutas.get(video.id);
    return ruta ? { ...video, ruta } : null;
  }

  /** La ficha de un video (de memoria o del almacén), o null si todavía no está preparado. */
  async function ficha(video) {
    if (listos.has(video.id)) return listos.get(video.id);
    video = await conRuta(video);
    if (!video) return null;
    if (sinFicha.has(video.id)) return null;
    try {
      const { ficha: ruta } = derivados(video.ruta);
      // La ficha es chica: se pide un tamaño de sobra y el almacén entrega lo que haya.
      const texto = await leerTodo(almacen, ruta, 4096);
      const f = JSON.parse(texto.toString('utf8'));
      listos.set(video.id, f);
      return f;
    } catch {
      sinFicha.add(video.id);
      return null;
    }
  }

  /** Convierte un video: baja el original a una carpeta temporal, saca el MP4 y la miniatura, y los sube. */
  async function preparar(video) {
    const carpeta = await fsp.mkdtemp(path.join(os.tmpdir(), 'sonora-video-'));
    const original = path.join(carpeta, 'original');
    const mp4 = path.join(carpeta, 'video.mp4');
    const jpg = path.join(carpeta, 'portada.jpg');
    try {
      await pipeline(await almacen.leer(video.ruta, 0, video.bytes), fs.createWriteStream(original));
      await correr([
        '-fflags', '+genpts',
        '-i', original,
        // Cuadros parejos a 30, sin agrandar lo que venga más chico, en el formato que reproduce todo el mundo.
        '-vf', "fps=30,scale='min(1280,iw)':-2:flags=lanczos,format=yuv420p",
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-profile:v', 'high',
        '-g', '60', '-maxrate', '8M', '-bufsize', '16M',
        '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
        '-movflags', '+faststart',
        mp4,
      ]);
      // La portada: un cuadro de los primeros segundos, cuando ya hay imagen.
      await correr(['-ss', '3', '-i', mp4, '-frames:v', '1', '-vf', "scale='min(640,iw)':-2", '-q:v', '3', jpg]).catch(() =>
        correr(['-i', mp4, '-frames:v', '1', '-vf', "scale='min(640,iw)':-2", '-q:v', '3', jpg]),
      );
      const rutas = derivados(video.ruta);
      const [mp4Bytes, jpgBytes] = await Promise.all([fsp.stat(mp4), fsp.stat(jpg)].map((p) => p.then((s) => s.size)));
      await almacen.guardar(rutas.mp4, fs.createReadStream(mp4), 'video/mp4');
      await almacen.guardar(rutas.jpg, fs.createReadStream(jpg), 'image/jpeg');
      const f = { mp4Bytes, jpgBytes, preparado: new Date().toISOString() };
      // La ficha va de última: si existe, lo demás ya está completo.
      await almacen.guardar(rutas.ficha, Readable.from([Buffer.from(JSON.stringify(f))]), 'application/json');
      listos.set(video.id, f);
      sinFicha.delete(video.id);
      console.log(`Video ${video.id} listo: ${(video.bytes / 1e6).toFixed(1)} MB → ${(mp4Bytes / 1e6).toFixed(1)} MB en MP4.`);
    } finally {
      await fsp.rm(carpeta, { recursive: true, force: true });
    }
  }

  async function seguir() {
    if (trabajando) return;
    trabajando = true;
    try {
      while (cola.length > 0) {
        const video = cola.shift();
        enCola.delete(video.id);
        if (!(await tieneFfmpeg())) {
          cola.length = 0;
          enCola.clear();
          break;
        }
        if (await ficha(video)) continue;
        actual = video.id;
        await preparar(video).catch((e) => console.error(`No se pudo preparar el video ${video.id}:`, e.message));
        actual = null;
      }
    } finally {
      trabajando = false;
    }
  }

  /** Pone un video en la fila para prepararlo (si no está ya). */
  function encolar(video) {
    if (!video?.ruta || enCola.has(video.id) || listos.has(video.id)) return;
    rutas.set(video.id, video.ruta);
    sinFicha.delete(video.id);
    enCola.add(video.id);
    cola.push(video);
    void seguir();
  }

  return {
    encolar,
    ficha,
    /** Al arrancar: prepara los que ya estaban (los más nuevos primero). */
    async prepararTodos() {
      try {
        const videos = await datos.listarVideos();
        for (const v of videos) {
          // listarVideos no trae la ruta: se pide aparte.
          const completo = await conRuta(v);
          if (completo) encolar(completo);
        }
      } catch (e) {
        console.error('No se pudieron revisar los videos:', e.message);
      }
    },
    /** Al borrar un video: también lo que se sacó de él. */
    async borrarDerivados(ruta) {
      const rutas = derivados(ruta);
      for (const r of [rutas.mp4, rutas.jpg, rutas.ficha, rutas.obra]) await almacen.borrar(r).catch(() => undefined);
    },
    /** Qué tan listo está, para el panel. */
    async estado(video) {
      const f = await ficha(video);
      return { listo: Boolean(f), preparando: !f && hayFfmpeg !== false && (enCola.has(video.id) || actual === video.id) };
    },
  };
}
