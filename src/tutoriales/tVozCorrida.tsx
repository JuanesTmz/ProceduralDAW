/**
 * Tutorial: grabar la voz de corrido.
 *
 * El Gato lee todo el monólogo en una sola toma; la onda crece. La app la
 * reparte en cuatro escenas, pero un límite cae en mitad de una frase: la
 * mano lo arrastra hasta la pausa real. Tocar un tramo lo hace sonar.
 */
import { EMOCIONES } from '../estado/escenas';
import type { Emocion } from '../estado/tipos';
import { claves, interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Etiqueta, Fondo, Fundido, Gato, Mano, Microfono, Pos, Rotulos, SONOTECA_URL } from './piezas';

const DURA = 600;
const EMOS: Emocion[] = ['calma', 'alegria', 'tension', 'nostalgia'];
const X0 = 200;
const ANCHO = 880;
const Y = 360;
const ALTO = 120;
const BARRAS = 110;
/** Las pausas reales de la voz (fracción del ancho). */
const PAUSAS = [0.24, 0.52, 0.77];
/** Donde la app puso los límites: el segundo, mal. */
const AUTO = [0.24, 0.45, 0.77];

const sonidos: Golpe[] = [];
for (let f = 20; f < 150; f += 14) sonidos.push({ f, son: { url: SONOTECA_URL('vozah'), semitonos: [0, 3, 5, 3, 7][(f / 14) % 5 | 0], volumen: 0.5 } });
for (let f = 470; f < 540; f += 14) sonidos.push({ f, son: { url: SONOTECA_URL('vozah'), semitonos: [5, 7, 3][(f / 14) % 3 | 0], volumen: 0.6 } });

/** Altura de la barra k: casi cero en las pausas. */
function altura(k: number): number {
  const x = k / BARRAS;
  const enPausa = PAUSAS.some((p) => Math.abs(x - p) < 0.018);
  if (enPausa) return 0.06;
  return 0.3 + 0.7 * Math.abs(Math.sin(k * 0.9) * Math.cos(k * 0.37));
}

function Dibujo() {
  const f = useFotograma();
  const graba = interpolar(f, [20, 150], [0, 1]);
  const reparte = resorte(f, 165, 200, 15);
  const limite2 = claves(f, [[0, AUTO[1]], [330, AUTO[1]], [400, PAUSAS[1]]]);
  const limites = [AUTO[0], limite2, AUTO[2]];
  const arrastra = f >= 320 && f < 410;
  const tramoSonando = f >= 470 && f < 540 ? 2 : -1;
  const marcarPausa = f >= 270 && f < 420;
  const grabando = f < 150;

  const cortes = [0, ...limites, 1];

  return (
    <>
      <Fondo tono={C.rosa} acento={C.cian} />
      <Pos x={190} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.rosa}>VOZ DE CORRIDO</Etiqueta>
      </Pos>

      <Pos x={claves(f, [[0, 300], [150, 300], [190, 120]])} y={claves(f, [[0, 230], [150, 230], [190, 170]])} escala={resorte(f, 4) * claves(f, [[0, 0.8], [150, 0.8], [190, 0.5]])}>
        <Gato habla={grabando || tramoSonando >= 0 ? Math.abs(Math.sin(f / 3)) : 0} mira={1} />
      </Pos>
      {grabando && (
        <Pos x={470} y={230} escala={resorte(f, 8) * 0.7}>
          <Microfono brillo={Math.abs(Math.sin(f / 4))} />
        </Pos>
      )}
      {grabando && (
        <Pos x={1050} y={150} escala={resorte(f, 10)}>
          <span className="tu-rec" style={{ opacity: Math.floor(f / 12) % 2 ? 1 : 0.4 }}>● REC</span>
        </Pos>
      )}

      {/* La onda de toda la toma */}
      <div className="tu-tarjeta" style={{ position: 'absolute', left: X0 - 20, top: Y - 20, width: ANCHO + 40, height: ALTO + 40, background: '#252a3d' }} />
      {reparte > 0.01 &&
        EMOS.map((e, k) => (
          <div
            key={e}
            className="tu-tramo"
            style={{
              left: X0 + cortes[k] * ANCHO,
              width: (cortes[k + 1] - cortes[k]) * ANCHO,
              top: Y - 6,
              height: ALTO + 12,
              background: EMOCIONES[e].color,
              opacity: reparte * (tramoSonando >= 0 && tramoSonando !== k ? 0.25 : 0.45),
              transform: tramoSonando === k ? 'scaleY(1.08)' : undefined,
            }}
          >
            <b>{k + 1}</b>
          </div>
        ))}
      <svg width={ANCHO} height={ALTO} style={{ position: 'absolute', left: X0, top: Y }}>
        {Array.from({ length: BARRAS }, (_, k) => {
          if (k / BARRAS > graba) return null;
          const h = ALTO * altura(k);
          return <rect key={k} x={(k / BARRAS) * ANCHO + 1} y={(ALTO - h) / 2} width={ANCHO / BARRAS - 3} height={h} rx="2" fill="#fff4e0" />;
        })}
      </svg>

      {marcarPausa && (
        <Pos x={X0 + PAUSAS[1] * ANCHO} y={Y - 52} escala={resorte(f, 270, 280, 12)}>
          <Etiqueta color={C.verde} tam={20}>
            pausa real
          </Etiqueta>
        </Pos>
      )}
      {reparte > 0.5 &&
        limites.map((l, k) => (
          <div key={k} className="tu-limite" style={{ left: X0 + l * ANCHO, top: Y - 16, height: ALTO + 32, background: k === 1 && f < 400 && f > 200 ? C.rosa : '#fff' }}>
            <span />
          </div>
        ))}
      {f >= 220 && f < 330 && (
        <Pos x={X0 + AUTO[1] * ANCHO} y={Y + ALTO + 56} escala={resorte(f, 225, 280, 12)}>
          <Etiqueta color={C.rosa} tam={20}>
            corta una frase
          </Etiqueta>
        </Pos>
      )}
      {arrastra && <Mano x={X0 + limite2 * ANCHO} y={Y + ALTO + 10} toca={1} />}
      {f >= 450 && f < 500 && <Mano x={X0 + 0.64 * ANCHO} y={Y + 60} toca={interpolar(f, [462, 470], [0, 1])} />}

      <Rotulos
        lista={[
          [0, 155, 'Lee todo el monólogo de *corrido, en una toma'],
          [155, 270, 'La app la *reparte entre tus escenas'],
          [270, 420, 'Si un límite corta una frase, *arrástralo a la pausa'],
          [420, 550, 'Toca un tramo para *oírlo y comprobar'],
          [550, 600, 'Una sola toma suena *más natural'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialVozCorrida: Composicion = {
  id: 'vozcorrida',
  titulo: 'Grabar la voz de corrido',
  descripcion: 'Una sola toma, repartida en escenas y corregida a mano.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
