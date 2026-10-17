/**
 * La barra de la escena: su frase y su tiempo, siempre a la vista.
 *
 * Arriba, la frase con sus cajitas; mientras suena, las palabras se van
 * encendiendo. Abajo, la barra con la onda de la voz: muestra por dónde
 * va y, tocándola o arrastrándola, se elige desde dónde suena. Solo suena
 * el lapso de esta escena, nunca la pieza entera.
 */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionSeccion, formatearReloj, palabrasDe } from '../estado/proyecto';
import { duracionVoz, EMOCIONES } from '../estado/escenas';
import type { Cajita, Escena } from '../estado/tipos';
import { FraseConCajitas } from './FraseConCajitas';
import { Onda } from './VozEscena';
import { useCuadro } from './useCuadro';

/** La voz entra un instante después de que empieza la escena (lo mismo que el motor). */
const ENTRADA_VOZ = 0.15;

interface Props {
  escena: Escena;
  indice: number;
  tipos: Cajita['tipo'][];
}

export function BarraEscena({ escena, indice, tipos }: Props) {
  const { proyecto } = useProyecto();
  const seccion = proyecto.secciones[indice];
  const total = seccion ? duracionSeccion(proyecto, seccion) : 1;
  const voz = duracionVoz(escena);
  const color = EMOCIONES[escena.emocion].color;
  const barra = useRef<HTMLDivElement>(null);
  const [sonando, setSonando] = useState(false);
  const [dichas, setDichas] = useState(-1);
  const [desde, setDesde] = useState(0);
  const arrastrando = useRef(false);
  const lleno = useRef<HTMLSpanElement>(null);
  const cabeza = useRef<HTMLSpanElement>(null);
  const reloj = useRef<HTMLSpanElement>(null);
  const palabras = palabrasDe(escena.texto).length;

  // Por dónde va lo que se oye, cuadro a cuadro: se escribe directo en la
  // barra. React solo redibuja cuando cambia una palabra o el play.
  useCuadro(() => {
    const pos = motorAudio.escenaSola === indice ? motorAudio.posicionOida : null;
    const suena = pos !== null && pos.indice === indice;
    const t = suena ? pos.segundos : desde;
    const x = `${(Math.min(t, total) / total) * 100}%`;
    if (lleno.current) lleno.current.style.width = x;
    if (cabeza.current) {
      cabeza.current.style.left = x;
      cabeza.current.classList.toggle('nv-barra-escena__cabeza--quieta', !suena);
    }
    if (reloj.current) reloj.current.textContent = `${formatearReloj(t)} / ${formatearReloj(total)}`;
    setSonando(suena);
    setDichas(suena && !escena.respiro ? Math.ceil(((t - ENTRADA_VOZ) / Math.max(0.5, voz)) * palabras) : -1);
  });

  // Cambiar de escena vuelve el punto de arranque al principio.
  useEffect(() => setDesde(0), [escena.id]);

  const segundoDe = (ev: EventoPuntero<HTMLDivElement>) => {
    const caja = barra.current!.getBoundingClientRect();
    return Math.max(0, Math.min(total - 0.2, ((ev.clientX - caja.left) / caja.width) * total));
  };

  const tocar = (segundo: number) => void motorAudio.reproducirEscena(indice, segundo);

  return (
    <div className="nv-barra-escena" style={{ ['--color' as string]: color }}>
      {!escena.respiro && <FraseConCajitas escena={escena} tipos={tipos} dichas={dichas} />}
      <div className="nv-barra-escena__fila">
        <button
          type="button"
          className="nv-barra-escena__play"
          aria-label={sonando ? 'Parar' : 'Escuchar esta escena'}
          onClick={() => (sonando ? motorAudio.detener() : tocar(desde))}
        >
          {sonando ? '■' : '▶'}
        </button>
        <div
          ref={barra}
          className="nv-barra-escena__pista"
          onPointerDown={(ev) => {
            ev.currentTarget.setPointerCapture(ev.pointerId);
            arrastrando.current = true;
            setDesde(segundoDe(ev));
          }}
          onPointerMove={(ev) => arrastrando.current && setDesde(segundoDe(ev))}
          onPointerUp={(ev) => {
            arrastrando.current = false;
            const s = segundoDe(ev);
            setDesde(s);
            // Si ya sonaba, salta ahí; si no, queda marcado para el próximo play.
            if (sonando) tocar(s);
          }}
          onPointerCancel={() => (arrastrando.current = false)}
        >
          {escena.respiro ? (
            <span className="nv-barra-escena__respiro">respiro · solo música</span>
          ) : (
            <span
              className="nv-barra-escena__voz"
              style={{ left: `${(ENTRADA_VOZ / total) * 100}%`, width: `${(Math.min(voz, total) / total) * 100}%` }}
            >
              <Onda semilla={escena.vozUrl ?? escena.id} color={escena.vozUrl ? `${color}aa` : '#ffffff22'} barras={90} />
            </span>
          )}
          {(escena.cajitas ?? [])
            .filter((c) => tipos.includes(c.tipo))
            .map((c) => (
              <span
                key={c.id}
                className="nv-barra-escena__cajita"
                style={{ left: `${((ENTRADA_VOZ + (c.palabra / Math.max(1, palabras)) * voz) / total) * 100}%` }}
              />
            ))}
          <span ref={lleno} className="nv-barra-escena__lleno" />
          <span ref={cabeza} className="nv-barra-escena__cabeza nv-barra-escena__cabeza--quieta" />
        </div>
        <span ref={reloj} className="nv-mono nv-barra-escena__reloj" />
      </div>
      {!escena.vozUrl && !escena.respiro && (
        <span className="nv-tenue nv-chico">Esta escena todavía no tiene voz grabada: la barra usa lo que tardaría en decirse.</span>
      )}
    </div>
  );
}
