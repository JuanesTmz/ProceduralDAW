/**
 * Tutorial: Datos (lab de IA). Que la música se mueva sola.
 *
 * Una línea dibuja la fuerza de cada escena; la Maquinita la conecta con
 * un cable a los golpes del bombo, y al recorrer las escenas el bombo se
 * llena o se vacía solo. Segundo ejemplo: la voz hace que la música se
 * aparte.
 */
import { euclidiano } from '../generativo/euclidiano';
import { EMOCIONES } from '../estado/escenas';
import type { Emocion } from '../estado/tipos';
import { interpolar, resorte, suave, useFotograma, type Composicion, type Golpe } from './motor';
import { Bombo, C, Etiqueta, Fondo, Fundido, Maquinita, Gato, Pos, Rotulos, TINTA } from './piezas';

const DURA = 600;
const ESCENAS: { emo: Emocion; fuerza: number; nombre: string }[] = [
  { emo: 'calma', fuerza: 0.15, nombre: 'Suave' },
  { emo: 'tension', fuerza: 0.95, nombre: 'Fuerte' },
  { emo: 'nostalgia', fuerza: 0.5, nombre: 'Media' },
  { emo: 'euforia', fuerza: 0.95, nombre: 'Fuerte' },
];
const X0 = 330;
const W = 210;
const GRAF_Y = 110;
const GRAF_ALTO = 110;
const BARRIDO: [number, number] = [220, 420];
const PASO = 4;
const golpesDe = (fuerza: number) => Math.round(2 + fuerza * 9);

const sonidos: Golpe[] = [];
for (let f = BARRIDO[0]; f < BARRIDO[1]; f += PASO) {
  const e = ESCENAS[Math.min(3, Math.floor(((f - BARRIDO[0]) / (BARRIDO[1] - BARRIDO[0])) * 4))];
  const pasos = euclidiano(golpesDe(e.fuerza), 16);
  if (pasos[((f - BARRIDO[0]) / PASO) % 16]) sonidos.push({ f, son: { kit: 'bombo' } });
}
for (let f = 440; f < 560; f += 8) sonidos.push({ f, son: { kit: 'hihat', volumen: 0.4 } });

function Dibujo() {
  const f = useFotograma();
  const dibuja = interpolar(f, [20, 110], [0, 1]);
  const cable = interpolar(f, [125, 200], [0, 1], suave.salida);
  const cabeza = interpolar(f, BARRIDO, [0, 1], suave.lineal);
  const i = f >= BARRIDO[0] && f < BARRIDO[1] ? Math.min(3, Math.floor(cabeza * 4)) : -1;
  const escena = ESCENAS[Math.max(0, i)];
  const pasos = euclidiano(golpesDe(i >= 0 ? escena.fuerza : 0.5), 16);
  const paso = Math.floor((f - BARRIDO[0]) / PASO) % 16;
  const golpe = i >= 0 && pasos[paso] ? 1 - ((f - BARRIDO[0]) % PASO) / PASO : 0;
  const fase2 = f >= 425 && f < 565;
  const habla = fase2 && Math.floor((f - 430) / 30) % 2 === 0 ? Math.abs(Math.sin(f / 3)) : 0;

  const puntos = ESCENAS.map((e, k) => [X0 + W * k + W / 2, GRAF_Y + GRAF_ALTO - e.fuerza * GRAF_ALTO] as const);
  const linea = puntos.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const largo = 900;

  return (
    <>
      <Fondo tono={C.verde} acento={C.cian} />
      <Pos x={150} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.verde}>DATOS · LAB IA</Etiqueta>
      </Pos>

      {!fase2 && (
        <>
          {/* Las escenas y su fuerza */}
          {ESCENAS.map((e, k) => (
            <Pos key={k} x={X0 + W * k + W / 2} y={GRAF_Y + GRAF_ALTO + 50 - (i === k ? 10 : 0)} escala={resorte(f, 6 + k * 6)}>
              <div className="tu-escena tu-escena--chica" style={{ background: EMOCIONES[e.emo].color, width: W - 26 }}>
                <span>Escena {k + 1}</span>
                <em>{e.nombre}</em>
              </div>
            </Pos>
          ))}
          <svg width={1280} height={720} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <text x={X0} y={GRAF_Y - 14} fill={C.crema} fontSize="24" fontWeight="800">La fuerza de la escena</text>
            <path d={linea} fill="none" stroke={C.amarillo} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={largo} strokeDashoffset={largo * (1 - dibuja)} />
            {puntos.map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={12 * resorte(f, 20 + k * 22)} fill={C.amarillo} stroke={TINTA} strokeWidth="5" />
            ))}
            {/* El cable, de la línea a la Maquinita y de ella al bombo */}
            <path
              d={`M ${puntos[0][0] - 40} ${GRAF_Y + 60} C 120 300, 120 420, 230 450 S 760 640, 1000 520`}
              fill="none"
              stroke={C.cian}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="1400"
              strokeDashoffset={1400 * (1 - cable)}
            />
            {cable > 0.98 && (
              <path d={`M ${puntos[0][0] - 40} ${GRAF_Y + 60} C 120 300, 120 420, 230 450 S 760 640, 1000 520`} fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="10 30" strokeDashoffset={-f * 3} opacity="0.8" />
            )}
          </svg>
          {f >= BARRIDO[0] && f < BARRIDO[1] && <div className="tu-cabezal" style={{ left: X0 + cabeza * W * 4, top: GRAF_Y - 10, height: GRAF_ALTO + 100 }} />}

          <Pos x={230} y={470} escala={resorte(f, 115) * 0.85}>
            <Maquinita color={C.verde} pensando={cable > 0 && cable < 1 ? 1 : 0} mira={1} />
          </Pos>
          <Pos x={640} y={455} escala={resorte(f, 190, 260, 14)}>
            <Etiqueta color={C.crema} tam={22}>
              Golpes · Bombo ← La fuerza
            </Etiqueta>
          </Pos>

          {/* El bombo y sus golpes */}
          <Pos x={1060} y={500} escala={resorte(f, 150) * (1 + golpe * 0.06)} estirar={1 - golpe * 0.12}>
            <Bombo golpe={golpe} />
          </Pos>
          <div style={{ position: 'absolute', left: 470, top: 520, display: 'flex', gap: 6, opacity: resorte(f, 205) }}>
            {pasos.map((p, k) => (
              <span
                key={k}
                className="tu-mini"
                style={{ background: p ? C.amarillo : '#2a2e40', outline: k === paso && i >= 0 ? '3px solid #fff' : undefined }}
              />
            ))}
          </div>
        </>
      )}

      {fase2 && (
        <>
          <Pos x={260} y={400} escala={resorte(f, 425) * 0.95}>
            <Gato habla={habla} mira={1} />
          </Pos>
          <Pos x={640} y={380} escala={resorte(f, 432)}>
            <Etiqueta color={C.crema} tam={22}>
              La música se aparta ← La voz
            </Etiqueta>
          </Pos>
          <Pos x={980} y={330} escala={resorte(f, 438)}>
            <div className="tu-medidores">
              <div>
                <span className="tu-medidor" style={{ height: 30 + habla * 160, background: C.rosa }} />
                <b>Voz</b>
              </div>
              <div>
                <span className="tu-medidor" style={{ height: habla > 0.05 ? 60 : 180, background: C.amarillo, transition: 'height .15s' }} />
                <b>Música</b>
              </div>
            </div>
          </Pos>
        </>
      )}

      <Rotulos
        lista={[
          [0, 120, 'Eliges un *dato: la fuerza de cada escena'],
          [120, 220, 'Lo *conectas a algo que suene: los golpes del bombo'],
          [220, 425, 'Y la música cambia *sola en cada escena'],
          [425, 565, 'Otro: cuando la *voz habla, la música se *aparta'],
          [565, 600, 'Tú eliges la *relación. La máquina la *aplica'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialDatos: Composicion = {
  id: 'datos',
  titulo: 'Datos: que la música se mueva sola',
  descripcion: 'Conectar un dato de la historia con algo que suena.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
