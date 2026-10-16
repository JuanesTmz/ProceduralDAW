/**
 * Tutorial: tu sonido se vuelve instrumento.
 *
 * Se graba el golpe de una botella, se recorta, y se suelta en la matriz
 * de melodía: el mismo sonido se afina en cada fila (más arriba, más
 * agudo: la onda se aprieta) y toca una melodía.
 */
import { claves, interpolar, resorte, suave, useFotograma, type Composicion, type Golpe } from './motor';
import { Botella, C, Estallido, Etiqueta, Fondo, Fundido, Microfono, Onda, Pos, Rotulos, TINTA } from './piezas';

const DURA = 600;
const CAMPANA = `${import.meta.env.BASE_URL}sonoteca/campana.wav`;
const FILAS = 8;
const COLS = 16;
const SEMITONOS = [0, 2, 4, 7, 9, 12, 14, 16]; // de abajo hacia arriba
const MELODIA: (number | null)[] = [0, null, 2, null, 4, 3, null, 2, 5, null, 4, null, 7, 5, 4, null];
const MATRIZ: [number, number] = [330, 540];
const PASO = 6;
const GX = 360;
const GY = 130;
const CW = 44;
const CH = 38;
const TAPS = [30, 70, 100];

const sonidos: Golpe[] = TAPS.map((f) => ({ f, son: { url: CAMPANA, semitonos: -5 } }));
for (let f = MATRIZ[0] + 20; f < MATRIZ[1]; f += PASO) {
  const fila = MELODIA[((f - MATRIZ[0] - 20) / PASO) % COLS];
  if (fila !== null) sonidos.push({ f, son: { url: CAMPANA, semitonos: SEMITONOS[fila] - 5, volumen: 0.7 } });
}

function Dibujo() {
  const f = useFotograma();
  const tap = TAPS.reduce((m, t) => Math.max(m, f >= t && f < t + 10 ? 1 - (f - t) / 10 : 0), 0);
  const graba = interpolar(f, [20, 120], [0, 1], suave.lineal);
  const recorte = interpolar(f, [150, 220], [0, 1]);
  const vuela = interpolar(f, [240, 320], [0, 1], suave.ambos);
  const enMatriz = f >= MATRIZ[0] - 10;
  const col = Math.floor((f - MATRIZ[0] - 20) / PASO) % COLS;
  const sonandoFila = f >= MATRIZ[0] + 20 && f < MATRIZ[1] ? MELODIA[col] : null;
  const salta = sonandoFila !== null ? 1 - ((f - MATRIZ[0] - 20) % PASO) / PASO : 0;

  return (
    <>
      <Fondo tono={C.verde} acento={C.rosa} />
      <Pos x={240} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.verde}>TU SONIDO, INSTRUMENTO</Etiqueta>
      </Pos>

      {/* La botella: la estrella del tutorial */}
      <Pos
        x={claves(f, [[0, 880], [240, 880], [320, 190]])}
        y={claves(f, [[0, 290], [240, 290], [320, 420]])}
        escala={resorte(f, 6) * claves(f, [[0, 1.1], [240, 1.1], [320, 0.9]])}
        estirar={1 - tap * 0.25 - salta * 0.2}
        giro={Math.sin(f / 12) * 4}
      >
        <Botella feliz={1 + tap + salta} />
      </Pos>
      {TAPS.map((t) => (
        <Estallido key={t} x={880} y={250} en={t} color={C.amarillo} tam={70} />
      ))}

      {/* Grabar y recortar */}
      {f < 330 && (
        <>
          <Pos x={400} y={300} escala={resorte(f, 4) * (1 - vuela) * 0.9} estirar={1 + tap * 0.1}>
            <Microfono brillo={tap} />
          </Pos>
          <Pos x={640} y={claves(f, [[0, 545], [130, 545], [160, 500]])} escala={resorte(f, 16) * (1 - vuela * 0.8)} opacidad={1 - vuela}>
            <div className="tu-tarjeta" style={{ width: 560, height: 130, background: '#252a3d', position: 'relative', padding: 14 }}>
              <div style={{ width: `${graba * 100}%`, overflow: 'hidden' }}>
                <Onda ancho={532} alto={100} color={C.verde} barras={48} semilla={3} />
              </div>
              {f >= 140 && (
                <>
                  <div className="tu-sombra-recorte" style={{ left: 0, width: `${recorte * 28}%` }} />
                  <div className="tu-sombra-recorte" style={{ right: 0, width: `${recorte * 34}%` }} />
                  <div className="tu-asa" style={{ left: `${recorte * 28}%` }} />
                  <div className="tu-asa" style={{ left: `${100 - recorte * 34}%` }} />
                </>
              )}
            </div>
          </Pos>
        </>
      )}

      {/* La matriz */}
      {enMatriz && (
        <div style={{ position: 'absolute', left: GX, top: GY, transform: `scale(${resorte(f, MATRIZ[0] - 10, 200, 15)})`, transformOrigin: 'center' }}>
          <div className="tu-tarjeta" style={{ width: COLS * CW + 30, height: FILAS * CH + 30, background: '#252a3d', position: 'relative' }}>
            {Array.from({ length: FILAS }, (_, fila) =>
              Array.from({ length: COLS }, (_, c) => {
                const nota = MELODIA[c] === fila;
                const aparece = resorte(f, MATRIZ[0] + c * 3, 260, 14);
                const activa = nota && c === col && sonandoFila !== null;
                return (
                  <div
                    key={`${fila}-${c}`}
                    className="tu-celda"
                    style={{
                      left: 15 + c * CW,
                      top: 15 + (FILAS - 1 - fila) * CH,
                      width: CW - 5,
                      height: CH - 5,
                      background: nota ? C.verde : c % 4 === 0 ? '#ffffff14' : '#ffffff08',
                      transform: nota ? `scale(${aparece * (1 + (activa ? salta * 0.3 : 0))})` : undefined,
                      border: nota ? `3px solid ${TINTA}` : undefined,
                    }}
                  >
                    {nota && (
                      // La onda se aprieta cuanto más aguda es la nota.
                      <svg width={CW - 11} height={CH - 11} viewBox="0 0 40 30">
                        <path d={Array.from({ length: 40 }, (_, k) => `${k === 0 ? 'M' : 'L'}${k} ${15 + Math.sin(k * (0.35 + fila * 0.12)) * 9}`).join(' ')} stroke={TINTA} strokeWidth="2.5" fill="none" />
                      </svg>
                    )}
                  </div>
                );
              }),
            )}
            {f >= MATRIZ[0] + 20 && <div className="tu-cabezal" style={{ left: 15 + col * CW + CW / 2, top: 6, height: FILAS * CH + 18 }} />}
          </div>
          <span className="tu-matriz-eje tu-matriz-eje--arriba">agudo ↑</span>
          <span className="tu-matriz-eje tu-matriz-eje--abajo">grave ↓</span>
        </div>
      )}

      <Rotulos
        lista={[
          [0, 130, 'Graba un sonido: una *botella, un pito, tu voz'],
          [130, 240, '*Recórtalo: lo verde es lo que queda'],
          [240, 330, 'Ponlo a tocar la *melodía'],
          [330, 440, 'Se *afina solo en cada fila'],
          [440, 545, 'Más arriba, más *agudo. Más abajo, más *grave'],
          [545, 600, 'Cualquier sonido puede ser *instrumento'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialInstrumento: Composicion = {
  id: 'instrumento',
  titulo: 'Tu sonido se vuelve instrumento',
  descripcion: 'Grabar, recortar y tocar una melodía con tu propio sonido.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
