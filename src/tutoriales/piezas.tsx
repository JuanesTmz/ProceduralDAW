/**
 * Las piezas de los tutoriales, en estilo caricatura: contorno grueso,
 * colores planos y saturados, sombra dura, y todo entra con resorte.
 *
 * Personajes: la Narradora (la que cuenta la historia) y la Maquinita (la
 * que sigue reglas y lee datos). Objetos con cara: micrófono, botella y
 * bombo. Más la mano que señala, los rótulos y los estallidos.
 */
import type { CSSProperties, ReactNode } from 'react';
import { ALTO, ANCHO, claves, interpolar, resorte, suave, useFotograma } from './motor';

export const TINTA = '#14161f';
export const TRAZO = 5;
export const C = {
  fondo: '#1b1e2b',
  crema: '#fff4e0',
  amarillo: '#ffc93c',
  naranja: '#ff8c42',
  rosa: '#ff5d8f',
  cian: '#3ddcff',
  verde: '#3ee08f',
  lila: '#a77bff',
  azul: '#4d7cff',
  piel: '#f5b98b',
  gris: '#3a3f55',
};

/** Coloca algo en el escenario, con escala, giro y estiramiento. */
export function Pos({
  x,
  y,
  escala = 1,
  giro = 0,
  estirar = 1,
  opacidad = 1,
  children,
}: {
  x: number;
  y: number;
  escala?: number;
  giro?: number;
  /** >1 se estira hacia arriba, <1 se aplasta: el squash & stretch. */
  estirar?: number;
  opacidad?: number;
  children: ReactNode;
}) {
  const estilo: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    transform: `translate(-50%, -50%) rotate(${giro}deg) scale(${escala / Math.sqrt(estirar)}, ${escala * Math.sqrt(estirar)})`,
    opacity: opacidad,
  };
  return <div style={estilo}>{children}</div>;
}

/** Entra con un salto: escala de 0 a 1 con rebote, desde el fotograma `desde`. */
export function useEntrada(desde: number, rigidez = 200, amort = 13): number {
  return resorte(useFotograma(), desde, rigidez, amort);
}

// ------------------------------------------------------------ fondo

export function Fondo({ tono = C.lila, acento = C.cian }: { tono?: string; acento?: string }) {
  const f = useFotograma();
  const blob = (cx: number, cy: number, r: number, color: string, fase: number) => (
    <circle cx={cx + Math.sin(f / 40 + fase) * 14} cy={cy + Math.cos(f / 50 + fase) * 10} r={r} fill={color} opacity={0.16} />
  );
  return (
    <svg width={ANCHO} height={ALTO} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="tu-fondo" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#262a3d" />
          <stop offset="100%" stopColor="#12141d" />
        </radialGradient>
        <pattern id="tu-puntos" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#ffffff" opacity="0.06" />
        </pattern>
      </defs>
      <rect width={ANCHO} height={ALTO} fill="url(#tu-fondo)" />
      <rect width={ANCHO} height={ALTO} fill="url(#tu-puntos)" />
      {blob(160, 140, 190, tono, 0)}
      {blob(1130, 590, 230, acento, 2)}
      {blob(1080, 110, 90, C.amarillo, 4)}
    </svg>
  );
}

// ------------------------------------------------------------ rótulos

/**
 * Los subtítulos: uno a la vez, en una pastilla que entra rebotando y
 * con las palabras apareciendo de a una.
 */
export function Rotulos({ lista }: { lista: [number, number, string][] }) {
  const f = useFotograma();
  const actual = lista.find(([a, b]) => f >= a && f < b);
  if (!actual) return null;
  const [a, b, texto] = actual;
  const entra = resorte(f, a, 260, 16);
  const sale = interpolar(f, [b - 8, b], [1, 0], suave.entrada);
  const palabras = texto.split(' ');
  return (
    <div className="tu-rotulo" style={{ transform: `translate(-50%, ${(1 - entra) * 40}px) scale(${0.7 + 0.3 * entra})`, opacity: Math.min(entra, sale) }}>
      {palabras.map((p, i) => {
        const k = resorte(f, a + 4 + i * 2, 300, 18);
        const marcada = p.startsWith('*');
        return (
          <span key={i} className={marcada ? 'tu-rotulo__marca' : undefined} style={{ display: 'inline-block', transform: `translateY(${(1 - k) * 18}px)`, opacity: Math.min(1, k * 1.4) }}>
            {marcada ? p.slice(1) : p}&nbsp;
          </span>
        );
      })}
    </div>
  );
}

/** Una etiqueta de caricatura (pastilla con contorno y sombra dura). */
export function Etiqueta({ children, color = C.amarillo, tam = 26 }: { children: ReactNode; color?: string; tam?: number }) {
  return (
    <span className="tu-etiqueta" style={{ background: color, fontSize: tam }}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------ la mano

/** La mano de caricatura que señala. `toca` (0..1) la aplasta como un toque. */
export function Mano({ x, y, toca = 0 }: { x: number; y: number; toca?: number }) {
  return (
    <Pos x={x + 26} y={y + 38} escala={1 - toca * 0.12} giro={-12}>
      <svg width="86" height="100" viewBox="0 0 86 100" style={{ overflow: 'visible' }}>
        {toca > 0.05 && <circle cx="18" cy="8" r={10 + toca * 26} fill="none" stroke="#fff" strokeWidth={4} opacity={1 - toca} />}
        <path
          d="M14 6 C14 -2 28 -2 28 6 L28 38 C30 32 42 32 42 40 C44 34 56 34 56 44 C58 38 70 40 70 50 L70 70 C70 88 58 98 42 98 L34 98 C22 98 12 90 8 78 L2 58 C0 50 10 46 14 54 Z"
          fill="#fff"
          stroke={TINTA}
          strokeWidth={TRAZO}
          strokeLinejoin="round"
        />
        <path d="M28 40 L28 56 M42 42 L42 58 M56 46 L56 60" stroke={TINTA} strokeWidth={3} strokeLinecap="round" />
      </svg>
    </Pos>
  );
}

// ------------------------------------------------------------ personajes

/** La Narradora: la que cuenta la historia. `habla` (0..1) abre la boca. */
export function Narradora({ habla = 0, mira = 0 }: { habla?: number; mira?: number }) {
  const f = useFotograma();
  const parpadea = f % 110 > 104;
  const respira = Math.sin(f / 18) * 3;
  return (
    <svg width="220" height="300" viewBox="0 0 220 300" style={{ overflow: 'visible' }}>
      <ellipse cx="110" cy="292" rx="70" ry="10" fill="#000" opacity="0.25" />
      {/* cuerpo */}
      <path d={`M40 300 C40 ${222 + respira} 70 ${206 + respira} 110 ${206 + respira} C150 ${206 + respira} 180 ${222 + respira} 180 300 Z`} fill={C.rosa} stroke={TINTA} strokeWidth={TRAZO} />
      <path d={`M92 ${208 + respira} L110 ${236 + respira} L128 ${208 + respira}`} fill={C.crema} stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
      {/* pelo de atrás */}
      <path d="M38 118 C30 40 190 40 182 118 C196 160 180 196 160 200 L60 200 C40 196 24 160 38 118 Z" fill="#2b1d33" stroke={TINTA} strokeWidth={TRAZO} />
      {/* cara */}
      <ellipse cx="110" cy="128" rx="62" ry="68" fill={C.piel} stroke={TINTA} strokeWidth={TRAZO} />
      {/* flequillo */}
      <path d="M50 108 C58 62 160 54 172 104 C150 86 120 92 104 78 C92 96 70 98 50 108 Z" fill="#2b1d33" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" />
      {/* ojos */}
      {parpadea ? (
        <path d="M78 130 L96 130 M124 130 L142 130" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="87" cy="128" rx="11" ry="14" fill="#fff" stroke={TINTA} strokeWidth={3.5} />
          <ellipse cx="133" cy="128" rx="11" ry="14" fill="#fff" stroke={TINTA} strokeWidth={3.5} />
          <circle cx={88 + mira * 4} cy="131" r="6" fill={TINTA} />
          <circle cx={134 + mira * 4} cy="131" r="6" fill={TINTA} />
        </>
      )}
      <ellipse cx="70" cy="152" rx="10" ry="6" fill={C.rosa} opacity="0.5" />
      <ellipse cx="150" cy="152" rx="10" ry="6" fill={C.rosa} opacity="0.5" />
      {/* boca */}
      <ellipse cx="110" cy="164" rx={12 + habla * 4} ry={3 + habla * 12} fill="#7a1f3d" stroke={TINTA} strokeWidth={3.5} />
    </svg>
  );
}

/** La Maquinita: la que sigue reglas y lee datos. `animo` mueve la antena y los ojos. */
export function Maquinita({ color = C.cian, pensando = 0, mira = 0 }: { color?: string; pensando?: number; mira?: number }) {
  const f = useFotograma();
  const foco = 0.5 + 0.5 * Math.sin(f / 5);
  const flota = Math.sin(f / 14) * 6;
  return (
    <svg width="200" height="240" viewBox="0 0 200 240" style={{ overflow: 'visible' }}>
      <ellipse cx="100" cy="234" rx={50 - flota} ry="8" fill="#000" opacity="0.25" />
      <g transform={`translate(0 ${flota})`}>
        {/* antena */}
        <line x1="100" y1="30" x2="100" y2="6" stroke={TINTA} strokeWidth={TRAZO} />
        <circle cx="100" cy="6" r="11" fill={pensando > 0 ? C.amarillo : C.rosa} stroke={TINTA} strokeWidth={4} opacity={0.6 + 0.4 * foco} />
        {/* cabeza */}
        <rect x="24" y="30" width="152" height="118" rx="34" fill={color} stroke={TINTA} strokeWidth={TRAZO} />
        <rect x="44" y="50" width="112" height="76" rx="20" fill={TINTA} />
        {/* ojos de pantalla */}
        <rect x={68 + mira * 6} y={pensando > 0 ? 82 : 72} width="18" height={pensando > 0 ? 6 : 28} rx="8" fill={color} />
        <rect x={114 + mira * 6} y={pensando > 0 ? 82 : 72} width="18" height={pensando > 0 ? 6 : 28} rx="8" fill={color} />
        <path d="M84 112 Q100 120 116 112" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* cuerpo */}
        <rect x="56" y="150" width="88" height="64" rx="20" fill={C.crema} stroke={TINTA} strokeWidth={TRAZO} />
        <circle cx="82" cy="182" r="8" fill={C.rosa} stroke={TINTA} strokeWidth={3} />
        <circle cx="118" cy="182" r="8" fill={C.amarillo} stroke={TINTA} strokeWidth={3} />
        {/* brazos */}
        <path d={`M56 170 Q30 ${170 + Math.sin(f / 9) * 14} 22 150`} stroke={TINTA} strokeWidth={TRAZO} fill="none" strokeLinecap="round" />
        <path d={`M144 170 Q170 ${170 - Math.sin(f / 9) * 14} 178 150`} stroke={TINTA} strokeWidth={TRAZO} fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ------------------------------------------------------------ objetos con cara

function Carita({ cx, cy, s = 1, feliz = 1 }: { cx: number; cy: number; s?: number; feliz?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <circle cx="-12" cy="0" r="5" fill={TINTA} />
      <circle cx="12" cy="0" r="5" fill={TINTA} />
      <path d={`M-9 12 Q0 ${12 + 8 * feliz} 9 12`} stroke={TINTA} strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function Microfono({ brillo = 0 }: { brillo?: number }) {
  return (
    <svg width="120" height="200" viewBox="0 0 120 200" style={{ overflow: 'visible' }}>
      {brillo > 0 &&
        [0, 1, 2].map((i) => (
          <path key={i} d={`M${-10 - i * 16} ${40 - i * 10} Q${-24 - i * 16} 60 ${-10 - i * 16} ${80 + i * 10}`} stroke={C.amarillo} strokeWidth={5} fill="none" opacity={brillo * (1 - i * 0.25)} strokeLinecap="round" />
        ))}
      <rect x="52" y="110" width="16" height="70" fill={C.gris} stroke={TINTA} strokeWidth={TRAZO} />
      <rect x="22" y="180" width="76" height="16" rx="8" fill={C.gris} stroke={TINTA} strokeWidth={TRAZO} />
      <rect x="20" y="10" width="80" height="110" rx="40" fill={C.rosa} stroke={TINTA} strokeWidth={TRAZO} />
      <path d="M30 50 H90 M30 70 H90" stroke={TINTA} strokeWidth={3} opacity="0.4" />
      <Carita cx={60} cy={60} s={0.9} />
    </svg>
  );
}

export function Botella({ feliz = 1 }: { feliz?: number }) {
  return (
    <svg width="110" height="210" viewBox="0 0 110 210" style={{ overflow: 'visible' }}>
      <rect x="40" y="4" width="30" height="22" rx="4" fill={C.naranja} stroke={TINTA} strokeWidth={TRAZO} />
      <path d="M42 26 L42 56 C10 70 10 90 10 110 L10 186 C10 200 20 206 34 206 L76 206 C90 206 100 200 100 186 L100 110 C100 90 100 70 68 56 L68 26 Z" fill={C.verde} stroke={TINTA} strokeWidth={TRAZO} strokeLinejoin="round" />
      <path d="M24 110 L24 170" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity="0.6" />
      <Carita cx={55} cy={140} feliz={feliz} />
    </svg>
  );
}

export function Bombo({ golpe = 0 }: { golpe?: number }) {
  return (
    <svg width="160" height="150" viewBox="0 0 160 150" style={{ overflow: 'visible' }}>
      <g transform={`translate(80 80) scale(${1 + golpe * 0.12}, ${1 - golpe * 0.1}) translate(-80 -80)`}>
        <ellipse cx="80" cy="80" rx="70" ry="64" fill={C.amarillo} stroke={TINTA} strokeWidth={TRAZO} />
        <ellipse cx="80" cy="80" rx="50" ry="45" fill={C.crema} stroke={TINTA} strokeWidth={4} />
        <Carita cx={80} cy={76} feliz={1 + golpe} />
      </g>
    </svg>
  );
}

// ------------------------------------------------------------ efectos

/** Un estallido de rayitas que sale en el fotograma `en`. */
export function Estallido({ x, y, en, color = C.amarillo, tam = 60 }: { x: number; y: number; en: number; color?: string; tam?: number }) {
  const f = useFotograma();
  const t = (f - en) / 12;
  if (t < 0 || t > 1) return null;
  return (
    <svg width={tam * 3} height={tam * 3} style={{ position: 'absolute', left: x - tam * 1.5, top: y - tam * 1.5, overflow: 'visible', pointerEvents: 'none' }}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r1 = tam * (0.3 + t * 0.7);
        const r2 = tam * (0.5 + t * 0.9);
        const c = tam * 1.5;
        return (
          <line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2} stroke={color} strokeWidth={6 * (1 - t) + 1} strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

/** Una tarjeta con contorno y sombra dura: la base de casi todo. */
export function Tarjeta({
  ancho,
  alto,
  color = C.crema,
  children,
  estilo,
}: {
  ancho: number;
  alto: number;
  color?: string;
  children?: ReactNode;
  estilo?: CSSProperties;
}) {
  return (
    <div className="tu-tarjeta" style={{ width: ancho, height: alto, background: color, ...estilo }}>
      {children}
    </div>
  );
}

/** Una onda de voz o sonido, dibujada con barritas. */
export function Onda({ ancho, alto, color, barras = 40, semilla = 1, vivo = 0 }: { ancho: number; alto: number; color: string; barras?: number; semilla?: number; vivo?: number }) {
  const f = useFotograma();
  const w = ancho / barras;
  return (
    <svg width={ancho} height={alto}>
      {Array.from({ length: barras }, (_, i) => {
        const base = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.7 + semilla) * Math.cos(i * 0.31 + semilla * 2));
        const h = alto * base * (1 + vivo * 0.3 * Math.sin(f / 3 + i));
        return <rect key={i} x={i * w + w * 0.2} y={(alto - h) / 2} width={w * 0.6} height={h} rx={w * 0.3} fill={color} />;
      })}
    </svg>
  );
}

/** Un fundido corto al empezar y al terminar, para que el bucle no salte. */
export function Fundido({ duracion }: { duracion: number }) {
  const f = useFotograma();
  const o = Math.max(interpolar(f, [0, 12], [1, 0], suave.salida), interpolar(f, [duracion - 12, duracion], [0, 1], suave.entrada));
  return o > 0.001 ? <div style={{ position: 'absolute', inset: 0, background: C.fondo, opacity: o }} /> : null;
}

export { claves };
