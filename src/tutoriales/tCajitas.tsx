/**
 * Tutorial: las cajitas. Algo que pasa justo en una palabra.
 *
 * La mano toca «metrocable» y le pega un sonido (una bocina); toca
 * «nadie» y le pega un silencio. Al sonar, la bocina salta en su palabra
 * y la música se calla un instante en la otra.
 */
import { interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Estallido, Etiqueta, Fondo, Fundido, Gato, Mano, Pos, Rotulos, SONOTECA_URL, cada } from './piezas';

const DURA = 600;
const PALABRAS = ['Llegó', 'el', 'metrocable', 'y', 'nadie', 'le', 'avisó', 'a', 'la', 'chiva.'];
const SONIDO = 2;
const SILENCIO = 4;
const SUENA: [number, number] = [290, 520];
const POR_PALABRA = (SUENA[1] - SUENA[0] - 30) / PALABRAS.length;
const momento = (i: number) => SUENA[0] + 10 + i * POR_PALABRA;
const SIL: [number, number] = [momento(SILENCIO), momento(SILENCIO) + 40];

const sonidos: Golpe[] = [
  ...cada(SUENA[0], SUENA[1], 12, { kit: 'bombo', volumen: 0.6 }, (f) => f >= SIL[0] && f < SIL[1]),
  ...cada(SUENA[0] + 6, SUENA[1], 12, { kit: 'hihat', volumen: 0.35 }, (f) => f >= SIL[0] && f < SIL[1]),
  { f: Math.round(momento(SONIDO)), son: { url: SONOTECA_URL('bocina') } },
];

/** El menú que aparece al tocar una palabra. */
function Menu({ elegido }: { elegido: 0 | 1 | null }) {
  return (
    <div className="tu-menu">
      <span className={elegido === 0 ? 'tu-menu--on' : ''}>♪ Un sonido</span>
      <span className={elegido === 1 ? 'tu-menu--on' : ''}>◌ Silencio</span>
    </div>
  );
}

function Dibujo() {
  const f = useFotograma();
  const sonando = f >= SUENA[0] && f < SUENA[1];
  const dichas = sonando ? Math.floor((f - SUENA[0] - 10) / POR_PALABRA) + 1 : -1;
  const conSonido = f >= 175;
  const conSilencio = f >= 265;
  const callada = f >= SIL[0] && f < SIL[1];
  const musica = callada ? interpolar(f, [SIL[0], SIL[0] + 6], [1, 0.05]) : sonando ? 0.6 + 0.4 * Math.abs(Math.sin(f / 3)) : 0.3;

  // Posiciones de las palabras, en una fila centrada.
  const anchos = PALABRAS.map((p) => p.length * 20 + 28);
  const total = anchos.reduce((a, b) => a + b, 0);
  let x = (1280 - total) / 2;
  const xs = anchos.map((w) => {
    const c = x + w / 2;
    x += w;
    return c;
  });
  const Y = 290;

  return (
    <>
      <Fondo tono={C.amarillo} acento={C.rosa} />
      <Pos x={150} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.amarillo}>LAS CAJITAS</Etiqueta>
      </Pos>
      <Pos x={150} y={470} escala={resorte(f, 6) * 0.7}>
        <Gato habla={sonando && !callada ? Math.abs(Math.sin(f / 3)) : 0} mira={1} />
      </Pos>

      {PALABRAS.map((p, i) => {
        const marca = (i === SONIDO && conSonido) || (i === SILENCIO && conSilencio);
        const color = i === SONIDO ? C.amarillo : C.lila;
        const dicha = dichas > i;
        const ahora = sonando && dichas - 1 === i;
        return (
          <Pos key={i} x={xs[i]} y={Y - (ahora ? 10 : 0)} escala={resorte(f, 8 + i * 3, 260, 14) * (ahora ? 1.12 : 1)}>
            <span
              className="tu-palabra"
              style={{
                background: marca ? color : 'transparent',
                borderColor: marca ? '#14161f' : 'transparent',
                color: marca ? '#14161f' : sonando && !dicha ? '#fff4e055' : '#fff4e0',
              }}
            >
              {p}
            </span>
          </Pos>
        );
      })}
      {conSonido && (
        <Pos x={xs[SONIDO]} y={Y - 62} escala={resorte(f, 175, 280, 12)}>
          <span className="tu-cajita">📢 bocina</span>
        </Pos>
      )}
      {conSilencio && (
        <Pos x={xs[SILENCIO]} y={Y - 62} escala={resorte(f, 265, 280, 12)}>
          <span className="tu-cajita tu-cajita--silencio">◌ silencio</span>
        </Pos>
      )}

      {/* Los menús al tocar */}
      {f >= 120 && f < 180 && (
        <Pos x={xs[SONIDO]} y={Y + 80} escala={resorte(f, 125, 300, 14)}>
          <Menu elegido={f > 160 ? 0 : null} />
        </Pos>
      )}
      {f >= 210 && f < 270 && (
        <Pos x={xs[SILENCIO]} y={Y + 80} escala={resorte(f, 215, 300, 14)}>
          <Menu elegido={f > 250 ? 1 : null} />
        </Pos>
      )}
      {f >= 100 && f < 175 && <Mano x={f < 150 ? xs[SONIDO] : xs[SONIDO] - 40} y={f < 150 ? Y : Y + 70} toca={f < 150 ? interpolar(f, [110, 120], [0, 1]) : interpolar(f, [155, 162], [0, 1])} />}
      {f >= 195 && f < 265 && <Mano x={f < 240 ? xs[SILENCIO] : xs[SILENCIO] - 10} y={f < 240 ? Y : Y + 100} toca={f < 240 ? interpolar(f, [205, 212], [0, 1]) : interpolar(f, [246, 252], [0, 1])} />}

      <Estallido x={xs[SONIDO]} y={Y - 60} en={Math.round(momento(SONIDO))} tam={80} color={C.amarillo} />

      {/* La música */}
      <div className="tu-linea" style={{ left: 340, width: 600, top: 470 }}>
        {Array.from({ length: 24 }, (_, k) => (
          <span key={k} style={{ height: 6 + musica * (14 + Math.abs(Math.sin(k * 0.8 + f / 4)) * 40), background: callada ? '#555a70' : C.amarillo }} />
        ))}
      </div>
      <Pos x={640} y={560} escala={1}>
        <span className="tu-rotulito" style={{ position: 'static' }}>
          {callada ? 'shhh… la música se calla' : 'la música'}
        </span>
      </Pos>

      <Rotulos
        lista={[
          [0, 110, 'Toca una *palabra de la frase'],
          [110, 195, 'Pégale *un sonido: suena justo cuando la dices'],
          [195, 285, 'O un *silencio: la música se calla ahí'],
          [285, 525, 'Escucha: *bocina en «metrocable», *silencio en «nadie»'],
          [525, 600, 'Así *subrayas lo importante'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialCajitas: Composicion = {
  id: 'cajitas',
  titulo: 'Las cajitas',
  descripcion: 'Un sonido o un silencio justo en una palabra.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
