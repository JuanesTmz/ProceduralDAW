/**
 * Tutorial: la emoción y la fuerza cambian la música.
 *
 * Los mismos sonidos de General se reparten en dos escenas: en Calma
 * suenan lentos, pocos y suaves; en Euforia, rápidos, todos y brillantes.
 * Al final, la fuerza decide cuántas capas entran.
 */
import { EMOCIONES } from '../estado/escenas';
import { claves, interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Etiqueta, Fondo, Fundido, Pos, Rotulos, TINTA } from './piezas';

const DURA = 600;
const CAPAS = [
  { nombre: 'Bombo', color: C.amarillo },
  { nombre: 'Redoblante', color: C.rosa },
  { nombre: 'Hi-hat', color: C.verde },
  { nombre: 'Shaker', color: C.lila },
  { nombre: 'Melodía', color: C.cian },
];
const CALMA: [number, number] = [190, 350];
const EUFORIA: [number, number] = [350, 510];
const MARIMBA = `${import.meta.env.BASE_URL}sonoteca/marimba.wav`;

const sonidos: Golpe[] = [];
for (let f = CALMA[0]; f < CALMA[1]; f++) {
  const t = f - CALMA[0];
  if (t % 20 === 0) sonidos.push({ f, son: { kit: 'bombo', volumen: 0.6 } });
  if (t % 40 === 10) sonidos.push({ f, son: { url: MARIMBA, semitonos: [-5, -3, -7, -5][(t / 40) % 4 | 0], volumen: 0.6 } });
}
for (let f = EUFORIA[0]; f < EUFORIA[1]; f++) {
  const t = f - EUFORIA[0];
  if (t % 9 === 0) sonidos.push({ f, son: { kit: 'bombo' } });
  if (t % 18 === 9) sonidos.push({ f, son: { kit: 'redoblante' } });
  if (t % 9 === 4) sonidos.push({ f, son: { kit: 'hihat', volumen: 0.5 } });
  if (t % 18 === 0) sonidos.push({ f, son: { url: MARIMBA, semitonos: [7, 9, 12, 9][(t / 18) % 4 | 0] } });
}

function Panel({ emo, activo, capas, cada, x, f, desde }: { emo: 'calma' | 'euforia'; activo: boolean; capas: number; cada: number; x: number; f: number; desde: number }) {
  const perfil = EMOCIONES[emo];
  const t = Math.max(0, f - desde);
  const pulso = activo ? Math.max(0, 1 - (t % cada) / cada) : 0;
  const metronomo = activo ? Math.sin((t / cada) * Math.PI) * 28 : 0;
  return (
    <div className="tu-panel" style={{ left: x, background: perfil.color, opacity: activo || f < CALMA[0] || f > EUFORIA[1] ? 1 : 0.45, transform: `scale(${activo ? 1.04 : 0.96})` }}>
      <div className="tu-panel__cabeza">
        <b>{perfil.etiqueta}</b>
        <svg width="60" height="70" viewBox="0 0 60 70">
          <path d="M10 66 L30 6 L50 66 Z" fill={C.crema} stroke={TINTA} strokeWidth="4" strokeLinejoin="round" />
          <line x1="30" y1="60" x2={30 + Math.sin((metronomo * Math.PI) / 180) * 40} y2={60 - Math.cos((metronomo * Math.PI) / 180) * 40} stroke={TINTA} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="tu-panel__dato">{emo === 'calma' ? 'Lenta · escala suave' : 'Rápida · escala brillante'}</span>
      <svg className="tu-panel__cara" width="110" height="110" viewBox="0 0 110 110" style={{ transform: `rotate(${activo ? Math.sin(t / (cada / 2)) * 8 : 0}deg)` }}>
        <circle cx="55" cy="55" r="48" fill={C.crema} stroke={TINTA} strokeWidth="5" />
        {emo === 'calma' ? (
          <>
            <path d="M30 50 Q38 56 46 50 M64 50 Q72 56 80 50" stroke={TINTA} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M42 74 Q55 80 68 74" stroke={TINTA} strokeWidth="5" fill="none" strokeLinecap="round" />
            {activo && <text x="78" y="30" fontSize="20" fontWeight="800" fill={TINTA}>z</text>}
          </>
        ) : (
          <>
            <path d="M28 46 L38 38 L48 46 M62 46 L72 38 L82 46" stroke={TINTA} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 62 Q55 98 80 62 Z" fill="#7a1f3d" stroke={TINTA} strokeWidth="5" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <div className="tu-panel__capas">
        {CAPAS.map((c, i) => {
          const on = i < capas;
          return (
            <span
              key={c.nombre}
              className="tu-chip"
              style={{ background: on ? c.color : '#ffffff55', transform: on && activo ? `translateY(${-pulso * 10 * (i % 2 ? 0.6 : 1)}px)` : undefined, color: on ? TINTA : '#14161f88' }}
            >
              {c.nombre}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Dibujo() {
  const f = useFotograma();
  const separa = resorte(f, 110, 160, 15);
  const fuerza = Math.round(claves(f, [[520, 1], [580, 5]]));

  return (
    <>
      <Fondo tono={C.cian} acento={C.naranja} />
      <Pos x={190} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.naranja}>EMOCIÓN Y FUERZA</Etiqueta>
      </Pos>

      {f < 150 && (
        <Pos x={640} y={320} escala={resorte(f, 8) * (1 - separa)}>
          <div className="tu-general">
            <b>General · los sonidos de la pieza</b>
            <div className="tu-panel__capas">
              {CAPAS.map((c, i) => (
                <span key={c.nombre} className="tu-chip" style={{ background: c.color, transform: `scale(${resorte(f, 20 + i * 6, 260, 13)})` }}>
                  {c.nombre}
                </span>
              ))}
            </div>
          </div>
        </Pos>
      )}

      {f >= 110 && (
        <div style={{ position: 'absolute', inset: 0, opacity: separa }}>
          <Panel emo="calma" activo={f >= CALMA[0] && f < CALMA[1]} capas={f >= 510 ? fuerza : 2} cada={20} x={claves(f, [[110, 400], [190, 120]])} f={f} desde={CALMA[0]} />
          <Panel emo="euforia" activo={f >= EUFORIA[0] && f < EUFORIA[1]} capas={f >= 510 ? fuerza : 5} cada={9} x={claves(f, [[110, 400], [190, 680]])} f={f} desde={EUFORIA[0]} />
        </div>
      )}

      {f >= 510 && (
        <Pos x={640} y={560} escala={resorte(f, 512)}>
          <div className="tu-fuerza">
            <span>Suave</span>
            <div className="tu-fuerza__pista">
              <span style={{ width: `${interpolar(f, [520, 580], [8, 100])}%` }} />
            </div>
            <span>Fuerte</span>
          </div>
        </Pos>
      )}

      <Rotulos
        lista={[
          [0, 110, 'Los mismos sonidos de *General…'],
          [110, 190, '…suenan distinto según la *emoción de la escena'],
          [190, 350, '*Calma: lenta, pocas capas, suave'],
          [350, 510, '*Euforia: rápida, todas las capas, brillante'],
          [510, 600, 'Y la *fuerza decide cuántas capas entran'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialEmocion: Composicion = {
  id: 'emocion',
  titulo: 'La emoción cambia la música',
  descripcion: 'Los mismos sonidos suenan distinto en cada escena.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
