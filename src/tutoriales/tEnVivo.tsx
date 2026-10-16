/**
 * Tutorial: tocar y grabar en vivo (Música Urbana).
 *
 * Mientras suena la escena, la mano dibuja un camino en el cuadro y todo
 * queda grabado (la línea). Después, sin la mano, un punto fantasma
 * repite el mismo camino: la escena suena igual cada vez. Borrar limpia.
 */
import { interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Etiqueta, Fondo, Fundido, Mano, Pos, Rotulos, TINTA } from './piezas';

const DURA = 600;
const PAD = { x: 470, y: 130, lado: 340 };
const GRABA: [number, number] = [90, 300];
const REPITE: [number, number] = [310, 480];
const BORRA = 510;

/** El camino del dedo (0..1), en el tiempo t de 0 a 1. */
function camino(t: number): { x: number; y: number } {
  return {
    x: 0.5 + 0.38 * Math.sin(t * Math.PI * 2) * Math.cos(t * Math.PI),
    y: 0.5 + 0.36 * Math.sin(t * Math.PI * 3),
  };
}
const aPx = (p: { x: number; y: number }) => ({ x: PAD.x + p.x * PAD.lado, y: PAD.y + (1 - p.y) * PAD.lado });

const sonidos: Golpe[] = [];
for (const [a, b] of [GRABA, REPITE]) {
  for (let f = a; f < b; f += 6) {
    const p = camino((f - a) / (b - a));
    if ((f - a) % Math.max(6, Math.round(24 - p.x * 18)) < 6) sonidos.push({ f, son: { kit: 'hihat', volumen: 0.3 + p.y * 0.6 } });
  }
}

function Dibujo() {
  const f = useFotograma();
  const grabando = f >= GRABA[0] && f < GRABA[1];
  const repitiendo = f >= REPITE[0] && f < REPITE[1];
  const tGraba = interpolar(f, GRABA, [0, 1]);
  const tRepite = interpolar(f, REPITE, [0, 1]);
  const borrado = f >= BORRA + 10;
  const dedo = aPx(camino(tGraba));
  const fantasma = aPx(camino(tRepite));
  const actual = grabando ? camino(tGraba) : repitiendo ? camino(tRepite) : { x: 0.3, y: 0.3 };

  const puntos = Array.from({ length: 80 }, (_, k) => aPx(camino((k / 79) * tGraba)));
  const trazo = puntos.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

  return (
    <>
      <Fondo tono={C.rosa} acento={C.amarillo} />
      <Pos x={240} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.rosa}>TOCAR Y GRABAR EN VIVO</Etiqueta>
      </Pos>

      <div className="tu-pad" style={{ left: PAD.x, top: PAD.y, width: PAD.lado, height: PAD.lado, transform: `scale(${resorte(f, 6)})` }}>
        <span className="tu-pad__eje tu-pad__eje--arriba">intenso ↑</span>
        <span className="tu-pad__eje tu-pad__eje--derecha">recargado →</span>
      </div>
      {!borrado && f >= GRABA[0] && (
        <svg width="1280" height="720" style={{ position: 'absolute', inset: 0 }}>
          <path d={trazo} fill="none" stroke={C.amarillo} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity={f >= BORRA ? interpolar(f, [BORRA, BORRA + 10], [1, 0]) : 0.9} />
        </svg>
      )}

      {/* REC */}
      <Pos x={640} y={545} escala={resorte(f, 40)}>
        <span className="tu-rec" style={{ background: grabando ? C.rosa : '#2a2e40', color: grabando ? TINTA : C.crema, opacity: grabando && Math.floor(f / 10) % 2 ? 0.6 : 1 }}>
          {grabando ? '● Grabando…' : repitiendo ? '▶ Suena lo grabado' : f >= BORRA ? '🗑 Borrado' : '● Grabar mientras suena'}
        </span>
      </Pos>

      {/* La música respondiendo al gesto */}
      <div className="tu-linea" style={{ left: 120, width: 260, top: 300, height: 150 }}>
        {Array.from({ length: 10 }, (_, k) => (
          <span key={k} style={{ height: 10 + (grabando || repitiendo ? actual.y * 110 * Math.abs(Math.sin(k * 0.9 + f / (6 - actual.x * 4))) : 8), background: C.amarillo }} />
        ))}
      </div>
      <span className="tu-rotulito" style={{ left: 170, top: 470 }}>
        la música
      </span>

      {grabando && <Mano x={dedo.x} y={dedo.y} toca={1} />}
      {repitiendo && (
        <Pos x={fantasma.x} y={fantasma.y} escala={1}>
          <svg width="50" height="50" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="18" fill={C.cian} stroke={TINTA} strokeWidth="5" />
            <circle cx="25" cy="25" r={22 + Math.sin(f / 3) * 3} fill="none" stroke={C.cian} strokeWidth="3" opacity="0.6" />
          </svg>
        </Pos>
      )}
      {f >= BORRA - 20 && f < BORRA + 15 && <Mano x={640} y={545} toca={interpolar(f, [BORRA - 6, BORRA], [0, 1])} />}

      <Rotulos
        lista={[
          [0, 90, 'Mientras suena la escena, *toca el cuadro'],
          [90, 305, 'Todo lo que hagas *se graba'],
          [305, 485, 'Después suena *igual cada vez, sin tocar'],
          [485, 560, '¿No te gustó? *Bórralo y graba otra vez'],
          [560, 600, 'Funciona en la *música y en el *visual'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialEnVivo: Composicion = {
  id: 'envivo',
  titulo: 'Tocar y grabar en vivo',
  descripcion: 'Lo que tocas mientras suena queda grabado en la escena.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
