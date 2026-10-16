/**
 * Tutorial: las celdas de golpes.
 *
 * Una vuelta de 16 casillas que se repite. La mano pone golpes tocando,
 * pinta varios arrastrando y quita uno tocando otra vez. El Bombo salta
 * cada vez que el cabezal pasa por un golpe. Al final, el pulso.
 */
import { interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { Bombo, C, Casilla, Estallido, Etiqueta, Fondo, Fundido, Mano, Pos, Rotulos } from './piezas';

const DURA = 600;
const PASO = 4;
const X0 = 250;
const Y0 = 200;
const CW = 52;
const HUECO = 8;

/** Qué casillas están encendidas en el fotograma f. */
const EVENTOS: { f: number; i: number; on: boolean }[] = [
  { f: 110, i: 0, on: true },
  { f: 140, i: 4, on: true },
  { f: 170, i: 8, on: true },
  { f: 200, i: 12, on: true },
  { f: 280, i: 9, on: true },
  { f: 295, i: 10, on: true },
  { f: 310, i: 11, on: true },
  { f: 410, i: 10, on: false },
];
function encendidas(f: number): boolean[] {
  const c = new Array(16).fill(false);
  for (const e of EVENTOS) if (f >= e.f) c[e.i] = e.on;
  return c;
}
const xDe = (i: number) => X0 + i * (CW + HUECO);

const sonidos: Golpe[] = [];
for (let f = 0; f < DURA; f += PASO) {
  const i = (f / PASO) % 16;
  if (encendidas(f)[i]) sonidos.push({ f, son: { kit: i % 4 === 0 ? 'bombo' : 'redoblante' } });
}

/** Dónde está la mano: tocando cada evento, o arrastrando entre 9 y 11. */
function mano(f: number): { x: number; y: number; toca: number } | null {
  if (f < 90 || f > 440) return null;
  if (f >= 270 && f <= 320) return { x: interpolar(f, [272, 316], [xDe(9), xDe(11)]) + CW / 2, y: Y0 + 40, toca: 1 };
  const proximo = EVENTOS.find((e) => e.f >= f - 6 && (e.f < 270 || e.f > 320)) ?? EVENTOS[EVENTOS.length - 1];
  const toca = Math.max(0, 1 - Math.abs(f - proximo.f) / 6);
  return { x: xDe(proximo.i) + CW / 2, y: Y0 + 40, toca };
}

function Dibujo() {
  const f = useFotograma();
  const on = encendidas(f);
  const cabeza = Math.floor(f / PASO) % 16;
  const dentro = (f % PASO) / PASO;
  const suena = on[cabeza];
  const golpe = suena ? 1 - dentro : 0;
  const pulso = f >= 470;
  const m = mano(f);

  return (
    <>
      <Fondo tono={C.amarillo} acento={C.rosa} />
      <Pos x={180} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.amarillo}>CELDAS DE GOLPES</Etiqueta>
      </Pos>

      {Array.from({ length: 16 }, (_, i) => (
        <Casilla
          key={i}
          x={xDe(i)}
          y={Y0}
          ancho={CW}
          alto={90}
          encendida={on[i]}
          color={C.amarillo}
          cabeza={i === cabeza}
          salto={i === cabeza && on[i] ? 1 - dentro : 0}
          marcada={i % 4 === 0}
          opacidad={resorte(f, 6 + i * 2, 260, 15)}
        />
      ))}
      {pulso &&
        [0, 4, 8, 12].map((i) => (
          <Pos key={i} x={xDe(i) + CW / 2} y={Y0 - 34} escala={resorte(f, 470 + i * 4, 280, 12)}>
            <span className="tu-pulso">↓</span>
          </Pos>
        ))}
      {EVENTOS.filter((e) => e.on).map((e) => (
        <Estallido key={e.f} x={xDe(e.i) + CW / 2} y={Y0 + 45} en={e.f} tam={44} />
      ))}

      {/* La vuelta que se repite */}
      <svg width="1280" height="720" style={{ position: 'absolute', inset: 0 }}>
        <path d={`M ${xDe(15) + CW} ${Y0 + 120} C ${xDe(15) + 90} ${Y0 + 200}, ${xDe(0) - 90} ${Y0 + 200}, ${xDe(0) - 4} ${Y0 + 120}`} fill="none" stroke={C.crema} strokeWidth="5" strokeDasharray="12 12" strokeDashoffset={-f} opacity={interpolar(f, [20, 50], [0, 0.7]) * (f < 100 ? 1 : 0.35)} />
      </svg>
      {f >= 20 && f < 100 && (
        <Pos x={640} y={Y0 + 210} escala={resorte(f, 24)}>
          <Etiqueta color={C.crema} tam={22}>
            la vuelta se repite
          </Etiqueta>
        </Pos>
      )}

      <Pos x={1110} y={530} escala={resorte(f, 12) * (1 + golpe * 0.08)} estirar={1 - golpe * 0.15} giro={pulso ? Math.sin(f / 5) * 8 : 0}>
        <Bombo golpe={golpe} />
      </Pos>

      {m && <Mano x={m.x} y={m.y} toca={m.toca} />}

      <Rotulos
        lista={[
          [0, 100, 'Cada casilla es un *momento de la vuelta'],
          [100, 260, '*Toca una casilla y pones un golpe'],
          [260, 380, '*Arrastra el dedo para pintar varias seguidas'],
          [380, 465, 'Toca otra vez para *quitarlo'],
          [465, 600, 'Las marcadas son el *pulso: donde mueves la cabeza'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialGolpes: Composicion = {
  id: 'golpes',
  titulo: 'Las celdas de golpes',
  descripcion: 'Poner, pintar y quitar golpes en la vuelta.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
