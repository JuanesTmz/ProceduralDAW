/**
 * Motor de los tutoriales animados: hecho en casa, sin dependencias.
 *
 * Funciona como un video: hay un reloj de fotogramas (30 por segundo) y
 * cada dibujo se pregunta «¿en qué fotograma vamos?» para saber cómo se
 * ve. Con eso, `interpolar` y `resorte` arman los movimientos, y `Tramo`
 * ordena las escenas en el tiempo. El reproductor corre el reloj, deja
 * pausar y adelantar, y dispara los sonidos (si se encienden).
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motorAudio } from '../audio/motorAudio';
import type { TipoSonido } from '../estado/tipos';

export const FPS = 30;
export const ANCHO = 1280;
export const ALTO = 720;

// ------------------------------------------------------------ tiempo

export const suave = {
  lineal: (t: number) => t,
  entrada: (t: number) => t * t * t,
  salida: (t: number) => 1 - Math.pow(1 - t, 3),
  ambos: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  /** Se pasa un poquito y vuelve: el gesto de caricatura. */
  rebote: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

/** Lleva un valor de un rango a otro según el fotograma, sin pasarse de los bordes. */
export function interpolar(f: number, entrada: [number, number], salida: [number, number], curva = suave.ambos): number {
  const t = Math.min(1, Math.max(0, (f - entrada[0]) / (entrada[1] - entrada[0] || 1)));
  return salida[0] + (salida[1] - salida[0]) * curva(t);
}

/** Recorre una lista de puntos clave: [[fotograma, valor], …]. */
export function claves(f: number, puntos: [number, number][], curva = suave.ambos): number {
  if (f <= puntos[0][0]) return puntos[0][1];
  for (let i = 1; i < puntos.length; i++) {
    if (f <= puntos[i][0]) return interpolar(f, [puntos[i - 1][0], puntos[i][0]], [puntos[i - 1][1], puntos[i][1]], curva);
  }
  return puntos[puntos.length - 1][1];
}

/** Un resorte que arranca en `desde`: va de 0 a 1 y rebota al llegar. */
export function resorte(f: number, desde: number, rigidez = 180, amortiguacion = 14): number {
  const t = (f - desde) / FPS;
  if (t <= 0) return 0;
  const w = Math.sqrt(rigidez);
  const z = amortiguacion / (2 * w);
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/** Un número pseudoazaroso fijo para (a, b): el «azar» que siempre da lo mismo. */
export function azar(a: number, b = 0): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ------------------------------------------------------------ fotogramas

const Fotograma = createContext(0);

export function useFotograma(): number {
  return useContext(Fotograma);
}

/** Un pedazo de la línea de tiempo: adentro, el fotograma empieza en 0. */
export function Tramo({ desde, dura = Infinity, children }: { desde: number; dura?: number; children: ReactNode }) {
  const f = useFotograma();
  if (f < desde || f >= desde + dura) return null;
  return <Fotograma.Provider value={f - desde}>{children}</Fotograma.Provider>;
}

// ------------------------------------------------------------ sonido

export type Son =
  | { kit: TipoSonido; volumen?: number }
  | { url: string; semitonos?: number; volumen?: number };

export interface Golpe {
  f: number;
  son: Son;
}

const cache = new Map<string, HTMLAudioElement>();
function tocar(son: Son): void {
  if ('kit' in son) {
    void motorAudio.probarTipo(son.kit);
    return;
  }
  let base = cache.get(son.url);
  if (!base) {
    base = new Audio(son.url);
    cache.set(son.url, base);
  }
  const a = base.cloneNode() as HTMLAudioElement;
  a.volume = son.volumen ?? 0.8;
  a.preservesPitch = false;
  a.playbackRate = Math.pow(2, (son.semitonos ?? 0) / 12);
  void a.play();
}

// ------------------------------------------------------------ composición y reproductor

export interface Composicion {
  id: string;
  titulo: string;
  descripcion: string;
  /** En fotogramas (30 por segundo). */
  duracion: number;
  Dibujo: () => ReactNode;
  /** Los sonidos, en el fotograma en que suenan. */
  sonidos?: Golpe[];
}

export function Reproductor({ comp }: { comp: Composicion }) {
  const [f, setF] = useState(0);
  const [corriendo, setCorriendo] = useState(true);
  const [conSonido, setConSonido] = useState(false);
  const [escala, setEscala] = useState(0.5);
  const caja = useRef<HTMLDivElement>(null);
  const actual = useRef(0);
  const sonido = useRef(false);
  sonido.current = conSonido;

  // El tamaño del escenario se adapta a la caja, siempre en 16:9.
  useEffect(() => {
    const nodo = caja.current;
    if (!nodo) return;
    const ro = new ResizeObserver(() => setEscala(nodo.clientWidth / ANCHO));
    ro.observe(nodo);
    return () => ro.disconnect();
  }, []);

  // El reloj: avanza con el tiempo real y dispara los sonidos que cruza.
  useEffect(() => {
    if (!corriendo) return;
    let id = 0;
    let antes = performance.now();
    const paso = (ahora: number) => {
      const previo = actual.current;
      let siguiente = previo + ((ahora - antes) / 1000) * FPS;
      antes = ahora;
      const vuelta = siguiente >= comp.duracion;
      if (vuelta) siguiente -= comp.duracion;
      if (sonido.current && comp.sonidos) {
        for (const g of comp.sonidos) {
          const cruza = vuelta ? g.f > previo || g.f <= siguiente : g.f > previo && g.f <= siguiente;
          if (cruza) tocar(g.son);
        }
      }
      actual.current = siguiente;
      setF(siguiente);
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [corriendo, comp]);

  const ir = (n: number) => {
    actual.current = n;
    setF(n);
  };
  const seg = (n: number) => `0:${String(Math.floor(n / FPS)).padStart(2, '0')}`;
  const Dibujo = comp.Dibujo;

  return (
    <div className="tu-reproductor">
      <div ref={caja} className="tu-pantalla" onClick={() => setCorriendo(!corriendo)}>
        <div className="tu-escenario" style={{ width: ANCHO, height: ALTO, transform: `scale(${escala})` }}>
          <Fotograma.Provider value={Math.floor(f)}>
            <Dibujo />
          </Fotograma.Provider>
        </div>
        {!corriendo && <span className="tu-pausa">▶</span>}
      </div>
      <div className="tu-controles">
        <button type="button" className="tu-boton" onClick={() => setCorriendo(!corriendo)} aria-label={corriendo ? 'Pausar' : 'Reproducir'}>
          {corriendo ? '❚❚' : '▶'}
        </button>
        <button type="button" className="tu-boton" onClick={() => ir(0)} aria-label="Desde el principio">
          ↺
        </button>
        <input
          type="range"
          className="tu-barra"
          min={0}
          max={comp.duracion - 1}
          step={1}
          value={Math.floor(f)}
          aria-label="Ir a un momento"
          onChange={(e) => ir(Number(e.target.value))}
        />
        <span className="tu-reloj">
          {seg(f)} / {seg(comp.duracion)}
        </span>
        {comp.sonidos && comp.sonidos.length > 0 && (
          <button
            type="button"
            className={`tu-boton ${conSonido ? 'tu-boton--on' : ''}`}
            onClick={() => {
              // El audio arranca dentro del toque: el navegador solo lo deja así.
              if (!conSonido) void motorAudio.iniciar();
              setConSonido(!conSonido);
            }}
            title={conSonido ? 'Quitar el sonido' : 'Poner el sonido'}
          >
            {conSonido ? '🔊' : '🔇'}
          </button>
        )}
      </div>
    </div>
  );
}
