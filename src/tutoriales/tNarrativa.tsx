/**
 * Tutorial: ¿qué es narrativa musical?
 *
 * La Narradora cuenta; su texto se parte en escenas de colores; debajo,
 * la voz, la música y el visual siguen el arco (la música crece en la
 * tensión). Después la voz manda: la música se aparta cuando ella habla.
 */
import { EMOCIONES } from '../estado/escenas';
import type { Emocion } from '../estado/tipos';
import { claves, interpolar, resorte, suave, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Etiqueta, Fondo, Fundido, Narradora, Onda, Pos, Rotulos, TINTA } from './piezas';

const DURA = 600;
const ESCENAS: { emo: Emocion; nombre: string; energia: number }[] = [
  { emo: 'calma', nombre: 'La madrugada', energia: 0.3 },
  { emo: 'alegria', nombre: 'La subida', energia: 0.6 },
  { emo: 'tension', nombre: 'El silencio', energia: 0.95 },
  { emo: 'nostalgia', nombre: 'Lo que queda', energia: 0.4 },
];
const TEXTO = 'A las cuatro, cuando Medellín todavía no ha decidido despertar, don Arturo prende la chiva…';
const X0 = 210;
const ANCHO_FILA = 980;
const W = ANCHO_FILA / 4;
const BARRIDO: [number, number] = [270, 470];

// Música de la fase del barrido: más golpes en la escena más tensa.
const sonidos: Golpe[] = [];
for (let f = BARRIDO[0]; f < BARRIDO[1]; f++) {
  const e = ESCENAS[Math.min(3, Math.floor(((f - BARRIDO[0]) / (BARRIDO[1] - BARRIDO[0])) * 4))];
  const cada = e.energia > 0.9 ? 8 : e.energia > 0.5 ? 15 : 30;
  if ((f - BARRIDO[0]) % cada === 0) sonidos.push({ f, son: { kit: 'bombo' } });
  if (e.energia > 0.9 && (f - BARRIDO[0]) % 8 === 4) sonidos.push({ f, son: { kit: 'hihat', volumen: 0.5 } });
}
ESCENAS.forEach((_, i) => sonidos.push({ f: BARRIDO[0] + i * 50, son: { url: `${import.meta.env.BASE_URL}sonoteca/marimba.wav`, semitonos: [0, 4, 1, -3][i] } }));

function Dibujo() {
  const f = useFotograma();
  const palabras = TEXTO.split(' ');
  const dichas = Math.floor(interpolar(f, [10, 120], [0, palabras.length], suave.lineal));
  const habla = f < 125 || (f > 470 && f < 560) ? Math.abs(Math.sin(f / 3)) : 0;
  const partir = resorte(f, 130, 160, 16);
  const filas = resorte(f, 230, 170, 15);
  const cabeza = interpolar(f, BARRIDO, [0, 1], suave.lineal);
  const escenaActual = f >= BARRIDO[0] && f < BARRIDO[1] ? Math.min(3, Math.floor(cabeza * 4)) : -1;
  const narradoraX = claves(f, [[0, 230], [130, 230], [200, 110], [460, 110], [490, 300], [560, 300], [580, 230]]);
  const narradoraY = claves(f, [[0, 420], [130, 420], [200, 560], [460, 560], [490, 400]]);
  const narradoraS = claves(f, [[0, 1.15], [130, 1.15], [200, 0.62], [460, 0.62], [490, 1.05]]);
  const final = resorte(f, 560, 200, 14);

  return (
    <>
      <Fondo tono={C.rosa} acento={C.lila} />
      <Pos x={190} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.rosa}>NARRATIVA MUSICAL</Etiqueta>
      </Pos>

      <Pos x={narradoraX} y={narradoraY} escala={resorte(f, 4) * narradoraS}>
        <Narradora habla={habla} mira={1} />
      </Pos>

      {/* El globo con la historia */}
      {f < 175 && (
        <Pos x={780} y={300} escala={resorte(f, 8) * (1 - partir)} giro={-2}>
          <div className="tu-globo">
            {palabras.map((p, i) => (
              <span key={i} style={{ opacity: i < dichas ? 1 : 0.15 }}>
                {p}{' '}
              </span>
            ))}
          </div>
        </Pos>
      )}

      {/* Las escenas */}
      {ESCENAS.map((e, i) => {
        const k = resorte(f, 140 + i * 9, 220, 14);
        const alza = escenaActual === i ? -14 : 0;
        const color = EMOCIONES[e.emo].color;
        return (
          <Pos key={e.emo} x={X0 + W * i + W / 2} y={claves(f, [[0, 300], [140, 300], [200, 175]]) + alza} escala={k} giro={(1 - k) * (i - 1.5) * 20}>
            <div className="tu-escena" style={{ background: color, width: W - 22, boxShadow: escenaActual === i ? `8px 8px 0 ${TINTA}, 0 0 0 8px #ffffff55` : undefined }}>
              <b>{i + 1}</b>
              <span>{e.nombre}</span>
              <em>{EMOCIONES[e.emo].etiqueta}</em>
            </div>
          </Pos>
        );
      })}

      {/* Voz, música e imagen siguiendo el arco */}
      {f >= 230 && f < 480 && (
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: filas * interpolar(f, [465, 480], [1, 0]) }}>
          {(['VOZ', 'MÚSICA', 'IMAGEN'] as const).map((n, fila) => (
            <Pos key={n} x={X0 - 70} y={300 + fila * 90} escala={filas}>
              <Etiqueta color={[C.rosa, C.amarillo, C.cian][fila]} tam={18}>
                {n}
              </Etiqueta>
            </Pos>
          ))}
          {ESCENAS.map((e, i) => {
            const color = EMOCIONES[e.emo].color;
            const late = escenaActual === i ? Math.abs(Math.sin(f / (e.energia > 0.9 ? 1.6 : 3.2))) : 0;
            return (
              <div key={e.emo}>
                <div style={{ position: 'absolute', left: X0 + W * i + 8, top: 270 }}>
                  <Onda ancho={W - 16} alto={60} color={C.rosa} barras={22} semilla={i + 1} vivo={escenaActual === i ? 1 : 0} />
                </div>
                <div
                  className="tu-barra-energia"
                  style={{ left: X0 + W * i + 8, width: W - 16, top: 428 - 80 * e.energia - late * 10, height: 80 * e.energia + late * 10, background: color }}
                />
                <div className="tu-bloque-imagen" style={{ left: X0 + W * i + 8, width: W - 16, top: 450, background: `radial-gradient(circle at ${30 + Math.sin(f / 15 + i) * 25}% 50%, #fff8, ${color} 45%, ${TINTA})` }} />
              </div>
            );
          })}
          {f >= BARRIDO[0] && <div className="tu-cabezal" style={{ left: X0 + cabeza * ANCHO_FILA, top: 250, height: 280 }} />}
        </div>
      )}

      {/* La voz manda */}
      {f >= 470 && f < 565 && (
        <Pos x={820} y={330} escala={resorte(f, 475)}>
          <div className="tu-medidores">
            <div>
              <span className="tu-medidor" style={{ height: 40 + habla * 150, background: C.rosa }} />
              <b>Voz</b>
            </div>
            <div>
              <span className="tu-medidor" style={{ height: 170 - habla * 110, background: C.amarillo }} />
              <b>Música</b>
            </div>
          </div>
        </Pos>
      )}

      {f >= 555 && (
        <Pos x={760} y={300} escala={final}>
          <div className="tu-formula">
            <Etiqueta color={C.rosa}>Historia</Etiqueta> <b>+</b> <Etiqueta color={C.amarillo}>Música</Etiqueta> <b>+</b> <Etiqueta color={C.cian}>Visual</Etiqueta>
          </div>
        </Pos>
      )}

      <Rotulos
        lista={[
          [0, 130, 'Todo empieza con una *historia'],
          [130, 260, 'Se parte en *escenas, cada una con su *emoción'],
          [260, 370, 'La *música y el *visual siguen ese arco'],
          [370, 470, 'Cuando la historia se *tensa, la música *crece'],
          [470, 560, 'La *voz manda: la música se aparta para dejarla oír'],
          [560, 600, 'Eso es *narrativa *musical'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialNarrativa: Composicion = {
  id: 'narrativa',
  titulo: '¿Qué es narrativa musical?',
  descripcion: 'La historia manda; la música y el visual la siguen.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
