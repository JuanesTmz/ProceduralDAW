/**
 * Tutorial: los respiros. Un momento sin voz, donde solo cuenta la música.
 *
 * Aparece un respiro y la mano lo lleva al inicio (abre), al medio (deja
 * sentir) y al final (cierra); las escenas se corren para hacerle lugar.
 * Al final se quita con la ×: son opcionales.
 */
import { EMOCIONES } from '../estado/escenas';
import type { Emocion } from '../estado/tipos';
import { interpolar, resorte, suave, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Etiqueta, Fondo, Fundido, Gato, Mano, Pos, Rotulos, SONOTECA_URL } from './piezas';

const DURA = 600;
const ESCENAS: Emocion[] = ['calma', 'alegria', 'tension', 'nostalgia'];
const W = 180;
const H = 120;
const HUECO = 22;
const FILA_Y = 330;

/** Dónde está el respiro en cada fase: null = flotando arriba o fuera. */
const FASES: { desde: number; lugar: number | null }[] = [
  { desde: 0, lugar: null },
  { desde: 100, lugar: 0 },
  { desde: 230, lugar: 2 },
  { desde: 350, lugar: 4 },
  { desde: 470, lugar: null },
];
const MOVER = 40; // fotogramas que tarda en llegar

/** La x del centro de cada elemento para un orden dado (4 escenas + respiro opcional). */
function posiciones(lugar: number | null): { escenas: number[]; respiro: number } {
  const n = lugar === null ? 4 : 5;
  const total = n * W + (n - 1) * HUECO;
  const x0 = (1280 - total) / 2 + W / 2;
  const escenas: number[] = [];
  let k = 0;
  for (let i = 0; i < 5; i++) {
    if (lugar !== null && i === lugar) continue;
    if (k < 4) escenas.push(x0 + i * (W + HUECO));
    k++;
  }
  // Sin respiro: las 4 escenas en sus primeros 4 lugares.
  if (lugar === null) return { escenas: [0, 1, 2, 3].map((i) => x0 + i * (W + HUECO)), respiro: 640 };
  return { escenas, respiro: x0 + lugar * (W + HUECO) };
}

const sonidos: Golpe[] = [100, 230, 350].map((f) => ({ f: f + MOVER, son: { url: SONOTECA_URL('pad'), volumen: 0.6 } }));
sonidos.push({ f: 520, son: { kit: 'tom' } });

function Dibujo() {
  const f = useFotograma();
  let i = 0;
  while (i < FASES.length - 1 && f >= FASES[i + 1].desde) i++;
  const antes = posiciones(i > 0 ? FASES[i - 1].lugar : null);
  const ahora = posiciones(FASES[i].lugar);
  const t = interpolar(f, [FASES[i].desde, FASES[i].desde + MOVER], [0, 1], suave.rebote);
  const mezcla = (a: number, b: number) => a + (b - a) * t;
  const quita = resorte(f, 510, 220, 14);
  const respiroVisible = f >= 30 && quita < 0.98;
  const enFila = FASES[i].lugar !== null;
  const rx = i === 0 ? 640 : mezcla(antes.respiro, ahora.respiro);
  const ry = i === 0 ? 170 : f < 470 ? interpolar(f, [100, 100 + MOVER], [170, FILA_Y], suave.ambos) : FILA_Y;
  const arrastra = (f > 100 && f < 140) || (f > 230 && f < 270) || (f > 350 && f < 390);
  const etiqueta = ['', 'abre', 'deja sentir', 'cierra'][i] ?? '';
  const notas = Math.sin(f / 6);

  return (
    <>
      <Fondo tono={C.lila} acento={C.cian} />
      <Pos x={150} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.lila}>LOS RESPIROS</Etiqueta>
      </Pos>
      <Pos x={1120} y={150} escala={resorte(f, 10) * 0.55}>
        <Gato habla={0} mira={-1} />
      </Pos>

      {ESCENAS.map((emo, k) => (
        <Pos key={emo} x={mezcla(antes.escenas[k], ahora.escenas[k])} y={FILA_Y} escala={resorte(f, 4 + k * 5)}>
          <div className="tu-escena" style={{ background: EMOCIONES[emo].color, width: W, height: H }}>
            <b>{k + 1}</b>
            <em>{EMOCIONES[emo].etiqueta}</em>
            <span className="tu-escena__voz">🎙 voz</span>
          </div>
        </Pos>
      ))}

      {respiroVisible && (
        <Pos x={rx} y={ry - (arrastra ? 16 : 0)} escala={resorte(f, 30, 220, 12) * (1 - quita)} giro={arrastra ? -4 : 0}>
          <div className="tu-respiro" style={{ width: W, height: H }}>
            <b>Respiro</b>
            <em>solo música</em>
            <span className="tu-respiro__notas" style={{ transform: `translateY(${notas * 6}px)` }}>♪ ♫</span>
            {f > 470 && <span className="tu-respiro__x">×</span>}
          </div>
        </Pos>
      )}
      {enFila && f >= FASES[i].desde + MOVER - 4 && f < 470 && (
        <Pos x={rx} y={FILA_Y + 105} escala={resorte(f, FASES[i].desde + MOVER - 4, 300, 14)}>
          <Etiqueta color={C.amarillo} tam={22}>
            {etiqueta}
          </Etiqueta>
        </Pos>
      )}

      {arrastra && <Mano x={rx} y={ry - 10} toca={1} />}
      {f > 480 && f < 525 && <Mano x={rx + W / 2 - 16} y={FILA_Y - H / 2 + 8} toca={interpolar(f, [495, 510], [0, 1])} />}

      {/* La línea de tiempo con su música */}
      <div className="tu-linea" style={{ left: 120, width: 1040, top: FILA_Y + 150 }}>
        {Array.from({ length: 40 }, (_, k) => (
          <span key={k} style={{ height: 8 + Math.abs(Math.sin(k * 0.6 + f / 8)) * 26 }} />
        ))}
      </div>

      <Rotulos
        lista={[
          [0, 100, 'Un *respiro es un momento *sin voz: solo música'],
          [100, 230, 'Al *inicio: la música abre y prepara'],
          [230, 350, 'En el *medio: deja sentir lo que pasó'],
          [350, 470, 'Al *final: la música cierra la historia'],
          [470, 560, '¿No lo necesitas? Lo *quitas con la ×'],
          [560, 600, 'Son *opcionales: úsalos si la historia los pide'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialRespiros: Composicion = {
  id: 'respiros',
  titulo: 'Los respiros',
  descripcion: 'Momentos sin voz al inicio, en el medio o al final.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
