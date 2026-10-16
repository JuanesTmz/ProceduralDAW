/**
 * Tutorial: la Máquina (Música Urbana). La capa improvisa sobre lo dibujado.
 *
 * Se dibuja un patrón, se enciende la Máquina, y en cada vuelta la
 * Maquinita quita unos golpes (se tachan) y agrega otros (brillan):
 * tres vueltas seguidas, ninguna igual.
 */
import { azar, interpolar, resorte, useFotograma, type Composicion, type Golpe } from './motor';
import { C, Casilla, Estallido, Etiqueta, Fondo, Fundido, Maquinita, Pos, Rotulos } from './piezas';

const DURA = 600;
const PASO = 4;
const BASE = [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0].map(Boolean);
const X0 = 300;
const CW = 38;
const HUECO = 6;
const DIBUJA: [number, number] = [20, 110];
const ENCIENDE = 140;
const VUELTAS_DESDE = 200;
const VUELTA = PASO * 16 * 1.5; // 96 fotogramas por vuelta

/** La variación de la vuelta v: qué se quitó y qué se agregó. */
function variacion(v: number) {
  return BASE.map((b, i) => {
    const r = azar(v + 3, i);
    if (b && r < 0.28) return 'quitado';
    if (!b && r > 0.72) return 'agregado';
    return b ? 'base' : 'vacio';
  });
}

const sonidos: Golpe[] = [];
for (let f = VUELTAS_DESDE; f < VUELTAS_DESDE + VUELTA * 3; f += PASO * 1.5) {
  const v = Math.floor((f - VUELTAS_DESDE) / VUELTA);
  const i = Math.round(((f - VUELTAS_DESDE) % VUELTA) / (PASO * 1.5));
  const e = variacion(v)[i];
  if (e === 'base' || e === 'agregado') sonidos.push({ f: Math.round(f), son: { kit: 'hihat', volumen: e === 'agregado' ? 0.9 : 0.6 } });
}

function Dibujo() {
  const f = useFotograma();
  const dibujadas = Math.floor(interpolar(f, DIBUJA, [0, 16]));
  const on = f >= ENCIENDE;
  const vueltaActual = f >= VUELTAS_DESDE ? Math.min(2, Math.floor((f - VUELTAS_DESDE) / VUELTA)) : -1;
  const cabeza = f >= VUELTAS_DESDE && f < VUELTAS_DESDE + VUELTA * 3 ? Math.floor(((f - VUELTAS_DESDE) % VUELTA) / (PASO * 1.5)) : -1;

  return (
    <>
      <Fondo tono={C.verde} acento={C.amarillo} />
      <Pos x={200} y={60} escala={resorte(f, 0)}>
        <Etiqueta color={C.verde}>LA MÁQUINA · MÚSICA URBANA</Etiqueta>
      </Pos>

      {/* Lo dibujado */}
      <span className="tu-rotulito" style={{ left: X0 - 200, top: 120 }}>
        Lo que dibujaste
      </span>
      {BASE.map((b, i) => (
        <Casilla key={i} x={X0 + i * (CW + HUECO)} y={110} ancho={CW} alto={50} encendida={b && i < dibujadas} color={C.verde} opacidad={resorte(f, 4 + i, 260, 15)} />
      ))}

      {/* El interruptor */}
      <Pos x={1150} y={135} escala={resorte(f, 120)}>
        <div className="tu-switch" data-on={on}>
          <span />
        </div>
      </Pos>
      <Pos x={1150} y={190} escala={resorte(f, 125)}>
        <Etiqueta color={on ? C.verde : C.crema} tam={20}>
          Máquina
        </Etiqueta>
      </Pos>
      <Estallido x={1150} y={135} en={ENCIENDE} color={C.verde} tam={60} />

      {/* La Maquinita improvisando */}
      <Pos x={1150} y={440} escala={resorte(f, ENCIENDE, 200, 12) * 0.8} giro={cabeza >= 0 ? Math.sin(f / 4) * 6 : 0}>
        <Maquinita color={C.verde} pensando={cabeza >= 0 ? 1 : 0} mira={-1} />
      </Pos>

      {[0, 1, 2].map((v) => {
        const visible = f >= VUELTAS_DESDE + v * VUELTA;
        if (!visible) return null;
        const y = 250 + v * 105;
        const e = variacion(v);
        return (
          <div key={v} style={{ opacity: v === vueltaActual ? 1 : 0.55 }}>
            <span className="tu-rotulito" style={{ left: X0 - 130, top: y + 15 }}>
              Vuelta {v + 1}
            </span>
            {e.map((estado, i) => {
              const x = X0 + i * (CW + HUECO);
              const entra = resorte(f, VUELTAS_DESDE + v * VUELTA + i * 2, 260, 14);
              const suena = v === vueltaActual && i === cabeza && (estado === 'base' || estado === 'agregado');
              return (
                <div key={i} style={{ opacity: entra }}>
                  <Casilla x={x} y={y} ancho={CW} alto={60} encendida={estado === 'base' || estado === 'agregado'} color={estado === 'agregado' ? C.amarillo : C.verde} cabeza={v === vueltaActual && i === cabeza} salto={suena ? 0.8 : 0} />
                  {estado === 'quitado' && <span className="tu-tache" style={{ left: x, top: y }}>✕</span>}
                  {estado === 'agregado' && <span className="tu-brillo" style={{ left: x + CW - 14, top: y - 14 }}>✦</span>}
                </div>
              );
            })}
          </div>
        );
      })}

      {f >= VUELTAS_DESDE && (
        <div className="tu-leyenda" style={{ left: X0, top: 575, opacity: resorte(f, VUELTAS_DESDE + 20) }}>
          <span><b style={{ color: C.rosa }}>✕</b> quitó</span>
          <span><b style={{ color: C.amarillo }}>✦</b> agregó</span>
        </div>
      )}

      <Rotulos
        lista={[
          [0, 120, 'Dibujas tus golpes…'],
          [120, 200, '…y enciendes la *Máquina'],
          [200, 380, 'En cada vuelta *quita unos golpes y *agrega otros'],
          [380, 520, 'Nunca suena *dos veces igual'],
          [520, 600, 'Eso es lo *generativo que pide el reto'],
        ]}
      />
      <Fundido duracion={DURA} />
    </>
  );
}

export const tutorialMaquina: Composicion = {
  id: 'maquina',
  titulo: 'La Máquina improvisa',
  descripcion: 'Cómo una capa varía sola sobre lo que dibujaste.',
  duracion: DURA,
  Dibujo,
  sonidos,
};
