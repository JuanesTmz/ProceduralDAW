// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Calificar y Ranking.
 *
 * - FormularioCalificar: el panel que se abre al lado del video en la Galería.
 *   Un criterio a la vez: qué se mira, la guía 5/3/1 y la nota de 1 a 5 (un
 *   decimal); al final,
 *   el resumen y el comentario. Se guarda solo al dejar de escribir. Cada
 *   cuenta de admin es un jurado; si califican varias, se promedia.
 * - RankingAdmin (pestaña Ranking): el promedio de los jurados por equipo y el
 *   interruptor que lo muestra (o lo oculta) en la pantalla de entrada.
 *
 * La rúbrica y las cuentas viven en server/compartido/rubrica.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CRITERIOS, GUIAS, leerNota, notaFinal, type Criterio, type FilaRanking, type Notas } from '../../../server/compartido/rubrica.js';
import { TablaRanking } from '../Ranking';

export interface Calificacion {
  equipoId: number;
  juez: string;
  juezNombre: string;
  notas: Notas;
  comentario: string | null;
  actualizado: string;
}

export interface DatosCalificar {
  yo: string;
  calificaciones: Calificacion[];
  ranking: FilaRanking[];
  publico: boolean;
}

interface EquipoCal {
  id: number;
  nombre: string;
}

type Estado = 'guardado' | 'guardando' | 'error' | null;

const CADA = 4_000;
/** «4,35» */
export const nota5 = (x: number) => x.toLocaleString('es-CO', { maximumFractionDigits: 2 });

async function pedir<T>(metodo: string, ruta: string, cuerpo?: object): Promise<T> {
  const r = await fetch(`/api/admin/${ruta}`, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error ?? 'Algo falló.');
  return datos as T;
}

/** Las calificaciones de todos, preguntadas cada pocos segundos (otros jurados califican a la vez). */
export function useCalificaciones() {
  const [datos, setDatos] = useState<DatosCalificar | null>(null);
  const refrescar = useCallback(
    () =>
      pedir<DatosCalificar>('GET', 'calificaciones')
        .then(setDatos)
        .catch(() => {
          // Si falla una vez, la siguiente vuelta lo vuelve a intentar.
        }),
    [],
  );
  useEffect(() => {
    void refrescar();
    const reloj = window.setInterval(() => void refrescar(), CADA);
    return () => window.clearInterval(reloj);
  }, [refrescar]);
  return { datos, refrescar };
}

/** Cuántos criterios tienen nota. */
export const cuantos = (notas: Notas) => CRITERIOS.filter((c) => leerNota(notas[c.id]) !== null).length;

// ---------------------------------------------------------------- Formulario

/** El color de cada criterio: uno de los 7 de la marca. */
export const COLOR_CRITERIO: Record<string, string> = {
  relato: '#ff5bff',
  medellin: '#04ef77',
  voz: '#35bfff',
  musica: '#b26bff',
  sonidos: '#00c8dc',
  visual: '#fce905',
  pieza: '#ff6a12',
};

/** El número como se escribe aquí: con coma. */
const escrito = (nota: number | undefined) => (nota === undefined ? '' : String(nota).replace('.', ','));

/** Las notas válidas de lo escrito; lo que no es válido no se guarda. */
function notasDe(textos: Record<string, string>): Notas {
  const notas: Notas = {};
  for (const c of CRITERIOS) {
    const nota = leerNota(textos[c.id]);
    if (nota !== null) notas[c.id] = nota;
  }
  return notas;
}

/** El paso después del último criterio: el resumen. */
const RESUMEN = CRITERIOS.length;

/**
 * La calificación de este jurado a un equipo, un criterio a la vez: qué se
 * mira, la guía 5/3/1 y la nota. Al final, el resumen con el comentario. Va con `key={equipoId}`: al
 * cambiar de equipo empieza de nuevo con lo guardado.
 */
export function FormularioCalificar({
  equipoId,
  mia,
  otras,
  alGuardar,
}: {
  equipoId: number;
  mia: Calificacion | null;
  otras: Calificacion[];
  alGuardar: () => Promise<void>;
}) {
  // Lo que escribe este jurado vive aquí: el refresco de cada pocos segundos no lo pisa.
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(CRITERIOS.map((c) => [c.id, escrito(mia?.notas[c.id])])),
  );
  const [comentario, setComentario] = useState(() => mia?.comentario ?? '');
  // Se empieza por el primer criterio sin nota (o por el resumen, si ya están todos).
  const [paso, setPaso] = useState(() => {
    const falta = CRITERIOS.findIndex((c) => leerNota(mia?.notas[c.id]) === null);
    return falta === -1 ? RESUMEN : falta;
  });
  const [estado, setEstado] = useState<Estado>(null);
  const reloj = useRef<number | undefined>(undefined);
  const vuelta = useRef(0);
  const casilla = useRef<HTMLInputElement>(null);
  const pasos = useRef<HTMLElement>(null);

  const guardar = useCallback(
    (notas: Notas, c: string) => {
      const esta = ++vuelta.current;
      setEstado('guardando');
      pedir('PUT', `equipos/${equipoId}/calificacion`, { notas, comentario: c })
        .then(() => {
          // Si mientras tanto se escribió otra cosa, el estado lo pone ese otro guardado.
          if (esta === vuelta.current) setEstado('guardado');
          return alGuardar();
        })
        .catch(() => {
          if (esta === vuelta.current) setEstado('error');
        });
    },
    [equipoId, alGuardar],
  );

  useEffect(() => () => window.clearTimeout(reloj.current), []);
  const programar = (t: Record<string, string>, c: string, espera = 700) => {
    window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => guardar(notasDe(t), c), espera);
  };
  const escribirNota = (criterio: string, texto: string, espera?: number) => {
    const nuevos = { ...textos, [criterio]: texto };
    setTextos(nuevos);
    programar(nuevos, comentario, espera);
  };
  const ir = (n: number) => {
    // Al cambiar de criterio, lo escrito se guarda sin esperar.
    programar(textos, comentario, 0);
    setPaso(Math.max(0, Math.min(RESUMEN, n)));
    // El criterio nuevo se lee desde arriba.
    pasos.current?.scrollIntoView({ block: 'nearest' });
  };

  const notas = notasDe(textos);
  const final = notaFinal(notas);
  const listos = CRITERIOS.filter((c) => notas[c.id] !== undefined).length;
  const c: Criterio | undefined = CRITERIOS[paso];
  const mala = c ? textos[c.id].trim() !== '' && notas[c.id] === undefined : false;

  return (
    <form className="cf" onSubmit={(e) => e.preventDefault()}>
      <nav ref={pasos} className="cf-pasos" aria-label="Criterios">
        {CRITERIOS.map((x, i) => {
          const nota = notas[x.id];
          return (
            <button
              key={x.id}
              type="button"
              className={`cf-paso ${i === paso ? 'cf-paso--actual' : ''} ${nota !== undefined ? 'cf-paso--lista' : ''}`}
              style={{ '--c': COLOR_CRITERIO[x.id] } as CSSProperties}
              title={`${x.nombre} · ${x.peso} %`}
              onClick={() => ir(i)}
            >
              <span className="cf-paso__icono" aria-hidden>
                {x.icono}
              </span>
              <span className="cf-paso__nota">{nota === undefined ? '·' : escrito(nota)}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`cf-paso cf-paso--resumen ${paso === RESUMEN ? 'cf-paso--actual' : ''} ${final !== null ? 'cf-paso--lista' : ''}`}
          title="Resumen y comentario"
          onClick={() => ir(RESUMEN)}
        >
          <span className="cf-paso__icono" aria-hidden>
            ✓
          </span>
          <span className="cf-paso__nota">{listos}/7</span>
        </button>
      </nav>

      {c ? (
        <section key={c.id} className="cf-criterio" style={{ '--c': COLOR_CRITERIO[c.id] } as CSSProperties}>
          <header className="cf-cabeza">
            <span className="cf-cabeza__icono" aria-hidden>
              {c.icono}
            </span>
            <div className="cf-cabeza__texto">
              <span className="cf-cabeza__num">
                Criterio {paso + 1} de 7 · vale {c.peso} %
              </span>
              <h3 className="cf-cabeza__nombre">{c.nombre}</h3>
            </div>
          </header>
          <p className="cf-pregunta">{c.pregunta}</p>

          <div className="cf-guias" role="group" aria-label="Guía de la rúbrica">
            {GUIAS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`cf-guia cf-guia--${g.id} ${notas[c.id] === g.nota ? 'cf-guia--puesta' : ''}`}
                onClick={() => {
                  escribirNota(c.id, String(g.nota), 0);
                  casilla.current?.focus();
                }}
              >
                <b className="cf-guia__nota">{g.nota}</b>
                <span className="cf-guia__texto">
                  <strong>{g.nombre}.</strong> {c.guias[g.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="cf-poner">
            <label className="cf-poner__casilla">
              <span>Nota</span>
              <input
                ref={casilla}
                className={`cf-nota ${mala ? 'cf-nota--mala' : ''}`}
                value={textos[c.id]}
                inputMode="decimal"
                placeholder="–"
                maxLength={3}
                aria-label={`Nota de ${c.nombre}, de 1 a 5`}
                onChange={(e) => escribirNota(c.id, e.target.value)}
                onBlur={() => programar(textos, comentario, 0)}
                onKeyDown={(e) => e.key === 'Enter' && ir(paso + 1)}
              />
              <span className="cf-poner__de">de 1 a 5</span>
            </label>
            <span className="nv-espacio" />
            <button
              type="button"
              className="nv-boton nv-boton--chico cf-atras"
              disabled={paso === 0}
              onClick={() => ir(paso - 1)}
              aria-label="Criterio anterior"
            >
              ‹
            </button>
            <button type="button" className="nv-boton nv-boton--chico nv-boton--primario" onClick={() => ir(paso + 1)}>
              {paso === RESUMEN - 1 ? 'Ver resumen ›' : 'Siguiente ›'}
            </button>
          </div>
          {mala && <p className="cf-aviso">Escribe un número de 1 a 5, con máximo un decimal (por ejemplo 4,5).</p>}
        </section>
      ) : (
        <section className="cf-resumen">
          <div className="cf-resumen__cabeza">
            <span className="cf-cabeza__num">Tu calificación</span>
            <div className="cf-resumen__final">
              <strong>{final === null ? '–' : nota5(final)}</strong>
              <span>/ 5</span>
            </div>
            {final === null && (
              <span className="cf-falta">
                {7 - listos === 1 ? 'Falta 1 criterio' : `Faltan ${7 - listos} criterios`}: cuenta en el ranking cuando estén los 7.
              </span>
            )}
          </div>
          <ul className="cf-resumen__lista">
            {CRITERIOS.map((x, i) => {
              const nota = notas[x.id];
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    className="cf-resumen__fila"
                    style={{ '--c': COLOR_CRITERIO[x.id] } as CSSProperties}
                    onClick={() => ir(i)}
                  >
                    <span aria-hidden>{x.icono}</span>
                    <span className="cf-resumen__nombre">{x.nombre}</span>
                    <span className="cf-resumen__peso">{x.peso} %</span>
                    <span className="cf-resumen__barra">
                      <span style={{ width: nota === undefined ? 0 : `${(nota / 5) * 100}%` }} />
                    </span>
                    <strong className={nota === undefined ? 'cf-resumen__vacia' : ''}>{nota === undefined ? 'falta' : escrito(nota)}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
          <label className="cf-comentario">
            <span className="cf-rotulo">Comentario (opcional, solo lo ven los admins)</span>
            <textarea
              value={comentario}
              placeholder="Lo que más te gustó, lo que le faltó…"
              rows={3}
              maxLength={2000}
              onChange={(e) => {
                setComentario(e.target.value);
                programar(textos, e.target.value, 800);
              }}
            />
          </label>
          {otras.length > 0 && (
            <div className="cf-otros">
              <span className="cf-rotulo">Otros jurados</span>
              {otras.map((o) => {
                const suya = notaFinal(o.notas);
                return (
                  <span key={o.juez} className="cf-otros__uno" title={o.comentario ?? undefined}>
                    {o.juezNombre} <b>{suya === null ? `${cuantos(o.notas)}/7` : nota5(suya)}</b>
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}

      <footer className="cf-pie">
        <span className="cf-pie__etiqueta">Nota final</span>
        <strong className="cf-pie__nota">{final === null ? '–' : nota5(final)}</strong>
        <span className="cf-pie__de">/ 5</span>
        <span className="nv-espacio" />
        {estado === 'guardando' && <span className="cf-estado">Guardando…</span>}
        {estado === 'guardado' && <span className="cf-estado cf-estado--ok">✓ Guardado</span>}
        {estado === 'error' && (
          <button type="button" className="nv-enlace cf-estado cf-estado--error" onClick={() => guardar(notas, comentario)}>
            No se guardó · reintentar
          </button>
        )}
      </footer>
    </form>
  );
}

// ---------------------------------------------------------------- Ranking

export function RankingAdmin({ equipos }: { equipos: EquipoCal[] }) {
  const { datos, refrescar } = useCalificaciones();
  const [cambiando, setCambiando] = useState(false);
  if (!datos) {
    return (
      <main className="pa-galeria pa-galeria--vacia">
        <p className="nv-sub nu-cargando">Cargando el ranking…</p>
      </main>
    );
  }
  const sinNota = equipos.filter((e) => !datos.ranking.some((f) => f.equipoId === e.id));
  const cambiar = () => {
    setCambiando(true);
    void pedir('POST', 'ranking', { publico: !datos.publico })
      .then(refrescar)
      .finally(() => setCambiando(false));
  };

  return (
    <main className="pa-rk">
      <div className={`nv-tarjeta pa-rk__interruptor ${datos.publico ? 'pa-rk__interruptor--abierto' : ''}`}>
        <div>
          <strong>{datos.publico ? 'El ranking se ve en la entrada' : 'El ranking está oculto'}</strong>
          <p className="nv-sub nv-chico">
            {datos.publico
              ? 'En la pantalla de entrada aparece «🏆 Ver el ranking» y cualquiera puede verlo. Se actualiza solo.'
              : 'Solo lo ven los admins. Cuando lo muestres, aparece el botón «🏆 Ver el ranking» en la entrada.'}
          </p>
        </div>
        <span className="nv-espacio" />
        <button
          type="button"
          className={`nv-boton ${datos.publico ? 'nv-boton--peligro' : 'nv-boton--primario'}`}
          disabled={cambiando}
          onClick={cambiar}
        >
          {datos.publico ? 'Ocultar el ranking' : 'Mostrar en la entrada'}
        </button>
      </div>

      <div className="nv-tarjeta">
        <span className="nv-etiqueta nv-tenue">Así se ve en la entrada</span>
        <TablaRanking filas={datos.ranking} />
      </div>

      {datos.ranking.length > 0 && (
        <div className="nv-tarjeta pa-rk__detalle">
          <span className="nv-etiqueta nv-tenue">Detalle por criterio (nota de 1 a 5, promedio de los jurados)</span>
          <div className="pa-rk__tabla" role="table">
            <div className="pa-rk__fila pa-rk__fila--cabeza" role="row">
              <span>#</span>
              <span>Equipo</span>
              {CRITERIOS.map((c) => (
                <span key={c.id} title={c.nombre} style={{ color: COLOR_CRITERIO[c.id] }}>
                  {c.icono} {c.corto} <span className="nv-tenue">{c.peso}%</span>
                </span>
              ))}
              <span>Final</span>
              <span>Jurados</span>
            </div>
            {datos.ranking.map((f) => (
              <div key={f.equipoId} className="pa-rk__fila" role="row">
                <span>{f.puesto}</span>
                <strong>{f.nombre}</strong>
                {CRITERIOS.map((c) => (
                  <span key={c.id}>{nota5(f.criterios[c.id])}</span>
                ))}
                <strong>{nota5(f.total)}</strong>
                <span>{f.jurados}</span>
              </div>
            ))}
          </div>
          <p className="nv-sub nv-chico">La nota final es el promedio de los criterios con su peso. Empate: gana mejor nota en El relato y, si sigue igual, en Arraigo en Medellín.</p>
        </div>
      )}

      {sinNota.length > 0 && (
        <p className="nv-sub nv-chico">
          Sin calificación completa todavía (no aparecen en el ranking): {sinNota.map((e) => e.nombre).join(', ')}.
        </p>
      )}
    </main>
  );
}
