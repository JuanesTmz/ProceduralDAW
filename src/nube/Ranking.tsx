// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El ranking de las piezas finales: el podio con los tres primeros y, debajo,
 * el resto. Se abre desde la entrada solo cuando los admins lo activan en el
 * panel (pestaña Ranking), y el panel usa el mismo podio para ver cómo queda.
 *
 * La nota de cada equipo (de 1 a 5) es el promedio de los jurados que lo
 * calificaron completo (ver server/compartido/rubrica.js).
 */
import { useEffect, useState } from 'react';
import { api, type FilaPublica } from './api';
import '../estilos/ranking.css';

const MEDALLAS = ['🥇', '🥈', '🥉'];

/** «4,35» */
const nota5 = (x: number) => x.toLocaleString('es-CO', { maximumFractionDigits: 2 });

/** El podio y la lista. `filas` ya viene ordenado. */
export function TablaRanking({ filas }: { filas: FilaPublica[] }) {
  if (filas.length === 0) {
    return <p className="nv-sub rk-vacio">Todavía no hay equipos calificados.</p>;
  }
  const podio = filas.filter((f) => f.puesto <= 3).slice(0, 3);
  const resto = filas.slice(podio.length);
  // En el podio el primero va en el centro: 2 · 1 · 3.
  const orden = podio.length === 3 ? [podio[1], podio[0], podio[2]] : podio;
  return (
    <div className="rk">
      <div className="rk-podio">
        {orden.map((f) => (
          <div key={f.nombre} className={`rk-escalon rk-escalon--${f.puesto}`}>
            <span className="rk-medalla" aria-hidden>
              {MEDALLAS[f.puesto - 1]}
            </span>
            <strong className="rk-escalon__nombre">{f.nombre}</strong>
            <span className="rk-escalon__total">{nota5(f.total)}</span>
            <span className="rk-escalon__base">{f.puesto}.º</span>
          </div>
        ))}
      </div>
      {resto.length > 0 && (
        <ol className="rk-lista">
          {resto.map((f) => (
            <li key={f.nombre} className="rk-fila">
              <span className="rk-fila__puesto">{f.puesto}.º</span>
              <strong className="rk-fila__nombre">{f.nombre}</strong>
              <span className="rk-fila__barra">
                <span style={{ width: `${(f.total / 5) * 100}%` }} />
              </span>
              <span className="rk-fila__total">{nota5(f.total)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** La pantalla que se abre desde la entrada. Se actualiza sola mientras está abierta. */
export function PantallaRanking({ alVolver }: { alVolver: () => void }) {
  const [filas, setFilas] = useState<FilaPublica[] | null>(null);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    let vigente = true;
    const leer = () =>
      api
        .ranking()
        .then((r) => {
          if (!vigente) return;
          if (r.activo) setFilas(r.ranking);
          else setCerrado(true);
        })
        .catch(() => {
          // Sin conexión se queda lo último que se vio.
        });
    void leer();
    const reloj = window.setInterval(leer, 10_000);
    return () => {
      vigente = false;
      window.clearInterval(reloj);
    };
  }, []);

  return (
    <div className="nv nu-puerta rk-pantalla">
      <div className="nu-tarjeta rk-tarjeta">
        <span className="nv-logo nu-logo">SONORA</span>
        <h1 className="nv-titulo">Ranking de piezas</h1>
        <p className="nv-sub">La nota de cada equipo va de 1 a 5 y es el promedio de los jurados.</p>
        {cerrado ? (
          <p className="nv-sub rk-vacio">El ranking no está abierto en este momento.</p>
        ) : filas === null ? (
          <p className="nv-sub nu-cargando">Cargando…</p>
        ) : (
          <TablaRanking filas={filas} />
        )}
        <button type="button" className="nv-boton rk-volver" onClick={alVolver}>
          ← Volver a la entrada
        </button>
      </div>
    </div>
  );
}
