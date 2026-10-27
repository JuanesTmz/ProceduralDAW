/**
 * Tutorial: el Pad. Una regla en vez de golpes.
 *
 * La Maquinita aplica la regla del cuadro: la mano lleva el punto a la
 * derecha y los golpes caen repartidos parejo; lo sube y entra el azar
 * (casillas que suenan a veces); después recorre las cuatro esquinas.
 */
import { generarPasos } from '../generativo/motorGenerativo';
import { azar, claves, interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Estallido, Etiqueta, Fondo, Fundido, Mano, Maquinita, Pos, Rotulos, TINTA } from './piezas';

const DURA = 600;
const PASO = 4; // fotogramas por casilla
const VUELTA = PASO * 16;

const KX: [number, number][] = [
  [0, 0.12], [90, 0.12], [210, 0.5], [400, 0.5], [430, 0.12], [460, 0.92], [490, 0.92], [520, 0.12], [550, 0.12], [580, 0.92], [600, 0.4],
];
const KY: [number, number][] = [
  [0, 0.08], [240, 0.08], [360, 0.72], [400, 0.72], [430, 0.08], [490, 0.08], [520, 0.9], [580, 0.9], [600, 0.3],
];

function reglaEn(f: number) {
  const x = claves(f, KX);
  const y = claves(f, KY);
  const g = generarPasos({ activa: true, golpes: x, azar: y, rotacion: 0, mutabilidad: 0 }, 16, 0, 'pad')!;
  return { x, y, pasos: g.pasos, prob: g.probabilidad };
}

/** ¿Suena la casilla i en la vuelta v? Las seguras siempre; las dudosas según el azar. */
function suena(prob: number, v: number, i: number) {
  return prob > 0.92 || azar(v, i) < prob;
}

const sonidos: Golpe[] = [];
for (let s = 0; s < DURA; s += PASO) {
  const { pasos, prob } = reglaEn(s);
  const i = (s / PASO) % 16;
  const v = Math.floor(s / VUELTA);
  if (pasos[i] && suena(prob[i], v, i)) sonidos.push({ f: s, son: { kit: prob[i] > 0.92 ? 'bombo' : 'hihat' } });
}

// Geometría
const TIRA_X = 330;
const TIRA_Y = 110;
const CASILLA = 46;
const HUECO = 7;
const PAD = { x: 790, y: 250, lado: 300 };

const ESQUINAS: [number, number, string, string][] = [
  [430, 460, 'Firme', C.cian],
  [460, 490, 'Machacado', C.naranja],
  [520, 550, 'Suelto', C.lila],
  [550, 580, 'Caótico', C.rosa],
];

function Dibujo() {
  const f = useFotograma();
  const { x, y, pasos, prob } = reglaEn(f);
  const cabeza = Math.floor(f / PASO) % 16;
  const vuelta = Math.floor(f / VUELTA);
  const dentroPaso = (f % PASO) / PASO;
  const cuantos = pasos.filter(Boolean).length;
  const aVeces = pasos.filter((p, i) => p && prob[i] <= 0.92).length;
  const px = PAD.x + x * PAD.lado;
  const py = PAD.y + (1 - y) * PAD.lado;
  const arrastrando = (f > 90 && f < 400) || (f > 400 && f < 590);
  const manoVisible = f > 70 && f < 595;
  const toca = arrastrando ? 1 : interpolar(f, [70, 90], [0, 1]);
  const entraPad = resorte(f, 6);
  const esquina = ESQUINAS.find(([a, b]) => f >= a && f < b);

  return (
    <>
      <Fondo tono={C.cian} acento={C.amarillo} />
      <Pos x={150} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.cian}>EL PAD</Etiqueta>
      </Pos>

      {/* La Maquinita, que reparte los golpes */}
      <Pos x={170} y={420} escala={resorte(f, 10) * 1.05} giro={Math.sin(f / 20) * 3}>
        <Maquinita pensando={arrastrando ? 1 : 0} mira={1} />
      </Pos>

      {/* La tira de 16 casillas */}
      {pasos.map((p, i) => {
        const seguro = p && prob[i] > 0.92;
        const ahora = i === cabeza && p && suena(prob[i], vuelta, i);
        const salto = ahora ? 1 - dentroPaso : 0;
        const entra = resorte(f, 14 + i * 2, 260, 15);
        return (
          <div
            key={i}
            className="tu-casilla"
            style={{
              left: TIRA_X + i * (CASILLA + HUECO),
              top: TIRA_Y,
              width: CASILLA,
              height: 74,
              background: !p ? '#2a2e40' : seguro ? C.amarillo : `repeating-linear-gradient(45deg, ${C.amarillo}88 0 6px, ${C.amarillo}33 6px 12px)`,
              transform: `translateY(${(1 - entra) * -60 - salto * 10}px) scale(${1 + salto * 0.16}, ${1 - salto * 0.08})`,
              opacity: entra,
              outline: i === cabeza ? `4px solid #fff` : undefined,
              outlineOffset: 2,
            }}
          />
        );
      })}
      {pasos.map((p, i) =>
        i === cabeza && p && suena(prob[i], vuelta, i) && f % PASO === 0 && prob[i] > 0.92 ? (
          <Estallido key={`e${i}`} x={TIRA_X + i * (CASILLA + HUECO) + CASILLA / 2} y={TIRA_Y + 37} en={f} tam={34} />
        ) : null,
      )}

      {/* El resumen */}
      <Pos x={TIRA_X + 160} y={TIRA_Y + 120} escala={resorte(f, 30)}>
        <span className="tu-cuenta">
          <b>{cuantos}</b> golpes{aVeces > 0 && <em> · {aVeces} a veces</em>}
        </span>
      </Pos>

      {/* El cuadro */}
      <div className="tu-pad" style={{ left: PAD.x, top: PAD.y, width: PAD.lado, height: PAD.lado, transform: `scale(${entraPad})` }}>
        <span className="tu-pad__eje tu-pad__eje--arriba">más azar ↑</span>
        <span className="tu-pad__eje tu-pad__eje--derecha">más golpes →</span>
        <div className="tu-pad__cruz" style={{ left: x * PAD.lado }} />
        <div className="tu-pad__cruz tu-pad__cruz--h" style={{ top: (1 - y) * PAD.lado }} />
      </div>
      <Pos x={px} y={py} escala={entraPad * (arrastrando ? 1.1 : 1)}>
        <svg width="54" height="54" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r="22" fill={C.amarillo} stroke={TINTA} strokeWidth={5} />
          <circle cx="20" cy="20" r="6" fill="#fff" opacity="0.7" />
        </svg>
      </Pos>
      {esquina && (
        <Pos x={px} y={py + (y > 0.5 ? 60 : -60)} escala={resorte(f, esquina[0], 300, 14)}>
          <Etiqueta color={esquina[3]}>{esquina[2]}</Etiqueta>
        </Pos>
      )}
      {manoVisible && <Mano x={px} y={py} toca={toca} />}

      <Rotulos
        lista={[
          [0, 90, 'Aquí no *dibujas golpes: pones una *regla'],
          [90, 240, 'A la *derecha: más golpes, repartidos *parejo'],
          [240, 400, '*Arriba entra el *azar: unos golpes suenan a veces'],
          [400, 585, 'Prueba las *cuatro esquinas'],
          [585, 600, 'En una escena, vale *solo para ella'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialPad: Composicion = {
  id: 'pad',
  titulo: 'El Pad: una regla en vez de golpes',
  descripcion: 'Cómo el cuadro reparte los golpes y cómo entra el azar.',
  duracion: DURA,
  Dibujo,
  sonidos,
};

