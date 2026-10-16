/**
 * Tutorial: la matriz de melodía y las escalas.
 *
 * Cada fila es una nota (arriba agudas, abajo graves). La mano pone
 * notas, arma un acorde en una columna, y después la escala cambia el
 * color de toda la melodía: mayor luminosa, menor triste, frigia tensa.
 */
import { interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Estallido, Etiqueta, Fondo, Fundido, Mano, Pos, Rotulos, SONOTECA_URL, TINTA } from './piezas';

const DURA = 600;
const FILAS = 7;
const COLS = 16;
const GX = 300;
const GY = 110;
const CW = 46;
const CH = 44;
const PASO = 6;

interface Escala {
  nombre: string;
  color: string;
  semis: number[];
  cara: 'feliz' | 'triste' | 'tensa';
  notas: string[];
}
const ESCALAS: Escala[] = [
  { nombre: 'Mayor', color: C.amarillo, semis: [0, 2, 4, 5, 7, 9, 11], cara: 'feliz', notas: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] },
  { nombre: 'Menor', color: C.azul, semis: [0, 2, 3, 5, 7, 8, 10], cara: 'triste', notas: ['Do', 'Re', 'Mi♭', 'Fa', 'Sol', 'La♭', 'Si♭'] },
  { nombre: 'Frigia', color: C.rosa, semis: [0, 1, 3, 5, 7, 8, 10], cara: 'tensa', notas: ['Do', 'Re♭', 'Mi♭', 'Fa', 'Sol', 'La♭', 'Si♭'] },
];
/** Las notas que pone la mano: [fotograma, columna, fila]. */
const PONE: [number, number, number][] = [
  [130, 0, 2], [150, 2, 4], [170, 4, 3], [190, 6, 5], [210, 8, 4], [230, 10, 2], [250, 12, 1],
  [280, 14, 0], [292, 14, 2], [304, 14, 4],
];
const escalaEn = (f: number) => (f < 470 ? 0 : f < 540 ? 1 : 2);
const notasEn = (f: number) => PONE.filter(([t]) => f >= t);
const SUENA_DESDE = 330;

const sonidos: Golpe[] = [];
for (const [t, , fila] of PONE) sonidos.push({ f: t, son: { url: SONOTECA_URL('marimba'), semitonos: ESCALAS[0].semis[fila] } });
for (let f = SUENA_DESDE; f < DURA - 10; f += PASO) {
  const col = ((f - SUENA_DESDE) / PASO) % COLS;
  const esc = ESCALAS[escalaEn(f)];
  for (const [, c, fila] of PONE) if (c === col) sonidos.push({ f, son: { url: SONOTECA_URL('marimba'), semitonos: esc.semis[fila], volumen: 0.6 } });
}

function Cara({ tipo, color }: { tipo: Escala['cara']; color: string }) {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r="38" fill={color} stroke={TINTA} strokeWidth="5" />
      <circle cx="32" cy="38" r="5" fill={TINTA} />
      <circle cx="58" cy="38" r="5" fill={TINTA} />
      {tipo === 'feliz' && <path d="M28 54 Q45 72 62 54" stroke={TINTA} strokeWidth="5" fill="none" strokeLinecap="round" />}
      {tipo === 'triste' && <path d="M28 64 Q45 50 62 64" stroke={TINTA} strokeWidth="5" fill="none" strokeLinecap="round" />}
      {tipo === 'tensa' && <path d="M28 60 L36 54 L45 60 L54 54 L62 60" stroke={TINTA} strokeWidth="5" fill="none" strokeLinejoin="round" />}
    </svg>
  );
}

function Dibujo() {
  const f = useFotograma();
  const esc = ESCALAS[escalaEn(f)];
  const puestas = notasEn(f);
  const col = f >= SUENA_DESDE ? Math.floor((f - SUENA_DESDE) / PASO) % COLS : -1;
  const salto = f >= SUENA_DESDE ? 1 - ((f - SUENA_DESDE) % PASO) / PASO : 0;
  const siguiente = PONE.find(([t]) => t >= f - 6);
  const manoVisible = f > 110 && f < 315 && siguiente;
  const cambio = f >= 400 && f < 560;

  return (
    <>
      <Fondo tono={esc.color} acento={C.lila} />
      <Pos x={190} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.cian}>MATRIZ DE MELODÍA</Etiqueta>
      </Pos>

      <div style={{ position: 'absolute', left: GX, top: GY, transform: `scale(${resorte(f, 6, 200, 15)})` }}>
        <div className="tu-tarjeta" style={{ width: COLS * CW + 30, height: FILAS * CH + 30, background: '#252a3d', position: 'relative' }}>
          {Array.from({ length: FILAS }, (_, fila) =>
            Array.from({ length: COLS }, (_, c) => {
              const nota = puestas.find(([, cc, ff]) => cc === c && ff === fila);
              const activa = nota && c === col;
              return (
                <div
                  key={`${fila}-${c}`}
                  className="tu-celda"
                  style={{
                    left: 15 + c * CW,
                    top: 15 + (FILAS - 1 - fila) * CH,
                    width: CW - 6,
                    height: CH - 6,
                    background: nota ? esc.color : c % 4 === 0 ? '#ffffff14' : '#ffffff08',
                    border: nota ? `3px solid ${TINTA}` : undefined,
                    transform: nota ? `scale(${resorte(f, nota[0], 300, 12) * (1 + (activa ? salto * 0.3 : 0))})` : undefined,
                    transition: 'background .25s',
                  }}
                />
              );
            }),
          )}
          {col >= 0 && <div className="tu-cabezal" style={{ left: 15 + col * CW + CW / 2 - 3, top: 6, height: FILAS * CH + 18 }} />}
        </div>
        {esc.notas.map((n, fila) => (
          <span key={n + fila} className="tu-nota" style={{ top: 15 + (FILAS - 1 - fila) * CH + 8, opacity: resorte(f, 20 + fila * 4) }}>
            {n}
          </span>
        ))}
      </div>
      {PONE.map(([t, c, fila]) => (
        <Estallido key={t} x={GX + 15 + c * CW + CW / 2} y={GY + 15 + (FILAS - 1 - fila) * CH + CH / 2} en={t} tam={30} color={esc.color} />
      ))}
      {manoVisible && siguiente && (
        <Mano x={GX + 15 + siguiente[1] * CW + CW / 2} y={GY + 15 + (FILAS - 1 - siguiente[2]) * CH + CH / 2} toca={Math.max(0, 1 - Math.abs(f - siguiente[0]) / 6)} />
      )}
      {f >= 280 && f < 400 && (
        <Pos x={GX + 15 + 14 * CW + CW / 2} y={GY - 6} escala={resorte(f, 306, 280, 12)}>
          <Etiqueta color={C.crema} tam={20}>
            acorde
          </Etiqueta>
        </Pos>
      )}

      {/* Las escalas */}
      <div className="tu-escalas" style={{ opacity: interpolar(f, [380, 400], [0, 1]) }}>
        {ESCALAS.map((e) => (
          <span key={e.nombre} className="tu-chip" style={{ background: e === esc && cambio ? e.color : '#ffffff22', color: e === esc && cambio ? TINTA : C.crema, transform: `scale(${e === esc && cambio ? 1.12 : 1})` }}>
            {e.nombre}
          </span>
        ))}
      </div>
      {cambio && (
        <Pos x={1150} y={430} escala={resorte(f, [400, 470, 540][escalaEn(f)], 260, 12)} giro={Math.sin(f / 7) * 6}>
          <Cara tipo={esc.cara} color={esc.color} />
        </Pos>
      )}

      <Rotulos
        lista={[
          [0, 120, 'Cada fila es una *nota: arriba agudas, abajo graves'],
          [120, 270, '*Toca una casilla y pones una nota'],
          [270, 390, 'Varias en la misma columna: un *acorde'],
          [390, 470, 'La *escala cambia el color: *Mayor, luminosa'],
          [470, 540, '*Menor, triste'],
          [540, 600, '*Frigia, tensa. Y todo suena *afinado'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialMatriz: Composicion = {
  id: 'matriz',
  titulo: 'La matriz y las escalas',
  descripcion: 'Poner notas, armar acordes y cambiar el color con la escala.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
