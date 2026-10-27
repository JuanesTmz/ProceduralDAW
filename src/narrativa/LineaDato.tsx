/**
 * Cómo se mueve un parámetro a lo largo de la pieza, según su dato.
 *
 * Una línea sobre la línea de tiempo: arriba es «más», abajo «menos», y la
 * raya punteada del medio es donde queda cuando el dato no lo mueve. Cada
 * escena se tiñe con el color de su emoción para ver qué pasa en cada una.
 */
import { useMemo } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { curvaDeDato, lineaDeTiempo } from '../estado/curvaDato';

const ANCHO = 600;
const ALTO = 72;

interface Props {
  fuente: string;
  /** 1 poco, 2 algo, 3 mucho: cuánto se deja mover. */
  cantidad: 1 | 2 | 3;
  color: string;
}

export function LineaDato({ fuente, cantidad, color }: Props) {
  const { proyecto } = useProyecto();
  const linea = useMemo(() => lineaDeTiempo(proyecto), [proyecto]);
  const curva = useMemo(() => curvaDeDato(proyecto, fuente), [proyecto, fuente]);
  const peso = cantidad / 3;
  const puntos = curva.map((v, i) => {
    const salida = 0.5 + (v - 0.5) * peso;
    const x = (i / (curva.length - 1)) * ANCHO;
    const y = ALTO - 6 - salida * (ALTO - 12);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return (
    <div className="nv-linea-dato">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" role="img" aria-label="Cómo se mueve a lo largo de la pieza">
        {linea.tramos.map((t) => (
          <rect
            key={t.id}
            x={(t.inicio / linea.duracion) * ANCHO}
            width={((t.fin - t.inicio) / linea.duracion) * ANCHO}
            y={0}
            height={ALTO}
            fill={t.color}
            opacity={0.14}
          />
        ))}
        {linea.tramos.slice(1).map((t) => (
          <line key={t.id} x1={(t.inicio / linea.duracion) * ANCHO} x2={(t.inicio / linea.duracion) * ANCHO} y1={0} y2={ALTO} stroke="#ffffff22" />
        ))}
        <line x1={0} x2={ANCHO} y1={ALTO / 2} y2={ALTO / 2} stroke="#ffffff33" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={puntos.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="nv-linea-dato__eje nv-linea-dato__eje--mas">más</span>
      <span className="nv-linea-dato__eje nv-linea-dato__eje--menos">menos</span>
      <div className="nv-linea-dato__escenas" aria-hidden="true">
        {linea.tramos.map((t) => (
          <span key={t.id} style={{ width: `${((t.fin - t.inicio) / linea.duracion) * 100}%`, color: t.color }}>
            {t.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}
