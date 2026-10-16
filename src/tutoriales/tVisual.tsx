/**
 * Tutorial: el visual reacciona.
 *
 * Un lienzo generativo: late con cada golpe del Bombo, respira cuando el
 * Gato habla, toma formas y colores de una foto que cae adentro, y se
 * tiñe con la emoción de la escena.
 */
import { EMOCIONES } from '../estado/escenas';
import { interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { Bombo, C, Etiqueta, Fondo, Fundido, Gato, Pos, Rotulos, TINTA, cada } from './piezas';

const DURA = 600;
const L = { x: 400, y: 120, w: 480, h: 360 };
const GOLPES: [number, number] = [20, 160];
const VOZ: [number, number] = [160, 300];
const FOTO: [number, number] = [300, 450];
const EMO: [number, number] = [450, 560];

const sonidos: Golpe[] = cada(GOLPES[0], GOLPES[1], 20, { kit: 'bombo' });

/** Los colores del lienzo según el momento. */
function paleta(f: number): string[] {
  if (f < FOTO[0] + 50) return [C.lila, C.cian, C.rosa];
  if (f < EMO[0] + 20) return ['#7cc8ff', '#f2c14e', '#3e8e5a']; // los de la foto: cielo, casas, montaña
  const t = EMOCIONES.tension.color;
  return [t, '#ff9fb0', '#5a1020'];
}

function Lienzo({ f }: { f: number }) {
  const golpe = f >= GOLPES[0] && f < GOLPES[1] ? Math.max(0, 1 - ((f - GOLPES[0]) % 20) / 8) : 0;
  const voz = f >= VOZ[0] && f < VOZ[1] ? Math.abs(Math.sin(f / 4)) : 0;
  const colores = paleta(f);
  const conFoto = f >= FOTO[0] + 50;
  return (
    <svg width={L.w} height={L.h} style={{ position: 'absolute', left: L.x, top: L.y, borderRadius: 26 }}>
      <defs>
        <clipPath id="tu-lienzo">
          <rect width={L.w} height={L.h} rx="22" />
        </clipPath>
      </defs>
      <g clipPath="url(#tu-lienzo)">
        <rect width={L.w} height={L.h} fill="#11131c" />
        {conFoto && (
          // Las lomas de la foto, ahora como material del dibujo.
          <path d={`M0 ${L.h} L0 230 Q 90 ${170 - voz * 10} 170 220 T 330 200 T ${L.w} 210 L ${L.w} ${L.h} Z`} fill={colores[2]} opacity="0.55" />
        )}
        {Array.from({ length: 26 }, (_, k) => {
          const a = (k / 26) * Math.PI * 2 + f / 60;
          const r = 70 + (k % 5) * 22 + golpe * 40 + Math.sin(f / 10 + k) * (6 + voz * 22);
          const cx = L.w / 2 + Math.cos(a) * r;
          const cy = L.h / 2 + Math.sin(a) * r * 0.75;
          return <circle key={k} cx={cx} cy={cy} r={8 + (k % 3) * 5 + golpe * 6} fill={colores[k % colores.length]} opacity="0.85" />;
        })}
        <circle cx={L.w / 2} cy={L.h / 2} r={40 + golpe * 26 + voz * 14} fill="none" stroke={colores[0]} strokeWidth="6" opacity="0.7" />
      </g>
      <rect width={L.w} height={L.h} rx="22" fill="none" stroke={TINTA} strokeWidth="6" />
    </svg>
  );
}

function Dibujo() {
  const f = useFotograma();
  const golpe = f >= GOLPES[0] && f < GOLPES[1] ? Math.max(0, 1 - ((f - GOLPES[0]) % 20) / 8) : 0;
  const cae = interpolar(f, [FOTO[0] + 10, FOTO[0] + 50], [0, 1]);
  const emo = f >= EMO[0];

  return (
    <>
      <Fondo tono={C.cian} acento={C.lila} />
      <Pos x={190} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.cian}>EL VISUAL REACCIONA</Etiqueta>
      </Pos>
      <div style={{ transform: `scale(${resorte(f, 4, 200, 14)})`, transformOrigin: '640px 300px', position: 'absolute', inset: 0 }}>
        <Lienzo f={f} />
      </div>

      {f < VOZ[0] + 10 && (
        <Pos x={220} y={380} escala={resorte(f, 10) * (1 + golpe * 0.08)} estirar={1 - golpe * 0.15}>
          <Bombo golpe={golpe} />
        </Pos>
      )}
      {f >= VOZ[0] && f < FOTO[0] + 10 && (
        <Pos x={220} y={380} escala={resorte(f, VOZ[0]) * 0.75}>
          <Gato habla={Math.abs(Math.sin(f / 4))} mira={1} />
        </Pos>
      )}

      {/* La foto que cae */}
      {f >= FOTO[0] && f < FOTO[0] + 60 && (
        <Pos x={interpolar(f, [FOTO[0], FOTO[0] + 50], [1100, 640])} y={interpolar(f, [FOTO[0], FOTO[0] + 50], [200, 300])} escala={resorte(f, FOTO[0]) * (1 - cae * 0.6)} giro={(1 - cae) * 14} opacidad={1 - Math.max(0, cae - 0.8) * 5}>
          <div className="tu-polaroid">
            <svg width="200" height="150" viewBox="0 0 200 150">
              <rect width="200" height="150" fill="#7cc8ff" />
              <circle cx="160" cy="34" r="16" fill="#ffe27a" />
              <path d="M0 150 L0 90 Q 50 50 100 85 T 200 70 L 200 150 Z" fill="#3e8e5a" />
              {[20, 50, 80, 120, 150].map((x, k) => (
                <rect key={k} x={x} y={92 - (k % 2) * 12} width="22" height="22" fill="#f2c14e" stroke={TINTA} strokeWidth="2" />
              ))}
            </svg>
            <span>Las lomas</span>
          </div>
        </Pos>
      )}

      {emo && (
        <Pos x={1080} y={300} escala={resorte(f, EMO[0], 260, 12)}>
          <div className="tu-escena" style={{ background: f < EMO[0] + 20 ? EMOCIONES.calma.color : EMOCIONES.tension.color, width: 200 }}>
            <span>Escena 3</span>
            <em>{f < EMO[0] + 20 ? 'Calma' : 'Tensión'}</em>
          </div>
        </Pos>
      )}

      <Rotulos
        lista={[
          [0, 160, 'El visual *late con cada golpe'],
          [160, 300, '…y *respira cuando hablas'],
          [300, 450, 'Tu *foto es el material: le da formas y colores'],
          [450, 560, 'La *emoción de la escena tiñe los colores'],
          [560, 600, 'Un visual que *acompaña la historia'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialVisual: Composicion = {
  id: 'visual',
  titulo: 'El visual reacciona',
  descripcion: 'Al sonido, a la voz, a tu foto y a la emoción.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
