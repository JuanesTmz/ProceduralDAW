// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Calificar y Ranking.
 *
 * - Leccion: la calificación de un equipo como lección de Duolingo, debajo de
 *   la carta del mazo (pestaña Calificar). Un criterio a la vez: qué se mira,
 *   las respuestas 5/3/1 y la nota de 1 a 5 (un decimal); al final, el
 *   resumen y el comentario. Se guarda solo al dejar de escribir. Cada
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
import { Ic, icCriterio } from './Ic';

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

// ---------------------------------------------------------------- La lección

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

/** Sube o baja media nota (el ajuste fino de los botones ±), sin salirse de 1 a 5. */
function ajustar(texto: string, delta: number): string {
  const actual = leerNota(texto) ?? 3;
  const nueva = Math.min(5, Math.max(1, Math.round((actual + delta) * 10) / 10));
  return escrito(nueva);
}

/** El paso después del último criterio: el resumen. */
const RESUMEN = CRITERIOS.length;

/**
 * La calificación de un equipo como una lección de Duolingo: arriba la barra
 * de progreso (7 criterios y el resumen), en el medio la pregunta con tres
 * respuestas gordas (5 · 3 · 1) y el ajuste fino, y abajo la franja que dice
 * cómo va y lleva al siguiente. En el resumen, «Lista» manda la carta del
 * equipo a un lado y trae la siguiente.
 *
 * Devuelve sus partes sueltas (progreso, pregunta y pie): el mazo las acomoda
 * en su rejilla. Va con `key={equipoId}`; lo escrito se guarda solo (y, si
 * se cambia de equipo antes de guardar, se guarda al salir).
 */
export function Leccion({
  equipoId,
  equipo,
  mia,
  otras,
  alGuardar,
  alTerminar,
  alCambiar,
  textoListo = 'Lista · siguiente equipo',
}: {
  equipoId: number;
  equipo: string;
  mia: Calificacion | null;
  otras: Calificacion[];
  alGuardar: () => Promise<void>;
  /** «Lista»: la calificación está completa y se pasa al siguiente equipo. */
  alTerminar: () => void;
  /** Cuántos criterios lleva: el mazo lo usa para dejar (o no) deslizar a «lista». */
  alCambiar?: (listos: number) => void;
  /** El botón del resumen completo: en el mazo pasa al siguiente equipo; en la galería cierra. */
  textoListo?: string;
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
  /** Lo que falta por guardar, si el reloj todavía no lo mandó. */
  const pendiente = useRef<{ notas: Notas; comentario: string } | null>(null);
  const vuelta = useRef(0);
  const casilla = useRef<HTMLInputElement>(null);

  const guardar = useCallback(
    (notas: Notas, c: string) => {
      pendiente.current = null;
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

  // Al irse a otro equipo (deslizar la carta), lo que estaba por guardarse se guarda ya.
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  useEffect(
    () => () => {
      window.clearTimeout(reloj.current);
      const p = pendiente.current;
      if (p) guardarRef.current(p.notas, p.comentario);
    },
    [],
  );

  const programar = (t: Record<string, string>, c: string, espera = 700) => {
    window.clearTimeout(reloj.current);
    pendiente.current = { notas: notasDe(t), comentario: c };
    reloj.current = window.setTimeout(() => guardar(notasDe(t), c), espera);
  };
  const escribirNota = (criterio: string, texto: string, espera?: number) => {
    const nuevos = { ...textos, [criterio]: texto };
    setTextos(nuevos);
    programar(nuevos, comentario, espera);
  };
  const ir = (n: number) => {
    // Al cambiar de criterio, lo escrito se guarda sin esperar.
    if (pendiente.current) programar(textos, comentario, 0);
    setPaso(Math.max(0, Math.min(RESUMEN, n)));
  };

  const notas = notasDe(textos);
  const final = notaFinal(notas);
  const listos = CRITERIOS.filter((c) => notas[c.id] !== undefined).length;
  const c: Criterio | undefined = CRITERIOS[paso];
  const nota = c ? notas[c.id] : undefined;
  const mala = c ? textos[c.id].trim() !== '' && nota === undefined : false;
  const primeroQueFalta = CRITERIOS.findIndex((x) => notas[x.id] === undefined);

  useEffect(() => alCambiar?.(listos), [listos, alCambiar]);

  // Enter avanza (o, en el resumen completo, da la carta por lista), salvo escribiendo el comentario.
  const siguiente = () => {
    if (c) return ir(paso + 1);
    if (final !== null) {
      if (pendiente.current) guardar(pendiente.current.notas, pendiente.current.comentario);
      alTerminar();
    } else if (primeroQueFalta >= 0) ir(primeroQueFalta);
  };
  const siguienteRef = useRef(siguiente);
  siguienteRef.current = siguiente;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || (e.target as HTMLElement).closest('textarea, button, a')) return;
      e.preventDefault();
      siguienteRef.current();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const guardado =
    estado === 'guardando' ? (
      <span className="lc-guardado">Guardando…</span>
    ) : estado === 'guardado' ? (
      <span className="lc-guardado lc-guardado--ok"><Ic n="check" tam={12} /> Guardado</span>
    ) : estado === 'error' ? (
      <button type="button" className="lc-guardado lc-guardado--error" onClick={() => guardar(notas, comentario)}>
        No se guardó · reintentar
      </button>
    ) : null;

  // La franja de abajo: gris mientras falta la respuesta, verde con respuesta, roja si lo escrito no vale.
  const tono = c ? (mala ? 'mal' : nota !== undefined ? 'bien' : 'nada') : final !== null ? 'oro' : 'nada';

  return (
    <>
      <nav className="lc-progreso" aria-label="Criterios">
        {CRITERIOS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            className={`lc-progreso__tramo ${notas[x.id] !== undefined ? 'lc-progreso__tramo--lleno' : ''} ${i === paso ? 'lc-progreso__tramo--aqui' : ''}`}
            style={{ '--c': COLOR_CRITERIO[x.id] } as CSSProperties}
            title={`${x.nombre}: ${notas[x.id] === undefined ? 'sin nota' : escrito(notas[x.id])}`}
            onClick={() => ir(i)}
          />
        ))}
        <button
          type="button"
          className={`lc-progreso__meta ${paso === RESUMEN ? 'lc-progreso__meta--aqui' : ''} ${final !== null ? 'lc-progreso__meta--lista' : ''}`}
          title="Resumen y comentario"
          onClick={() => ir(RESUMEN)}
        >
          {final !== null ? <Ic n="estrella" tam={16} /> : `${listos}/7`}
        </button>
      </nav>

      <section className="lc-pregunta">
        {c ? (
          <div key={c.id} className="lc-criterio" style={{ '--c': COLOR_CRITERIO[c.id] } as CSSProperties}>
            <div className="lc-criterio__cabeza">
              <span className="lc-criterio__icono">
                <Ic n={icCriterio(c.id)} tam={19} />
              </span>
              <span className="lc-criterio__nombre">{c.nombre}</span>
              <span className="lc-criterio__peso">vale {c.peso} %</span>
            </div>
            <h2 className="lc-criterio__pregunta">{c.pregunta}</h2>
            <div className="lc-respuestas" role="group" aria-label={`Nota de ${c.nombre}`}>
              {GUIAS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`lc-respuesta lc-respuesta--${g.id} ${nota === g.nota ? 'lc-respuesta--puesta' : ''}`}
                  aria-pressed={nota === g.nota}
                  onClick={() => escribirNota(c.id, String(g.nota), 0)}
                >
                  <span className="lc-respuesta__nota">{g.nota}</span>
                  <span className="lc-respuesta__texto">
                    <strong>{g.nombre}</strong>
                    {c.guias[g.id]}
                  </span>
                </button>
              ))}
            </div>
            <div className="lc-ajuste">
              <span className="lc-ajuste__rotulo">Ajusta la nota</span>
              <button type="button" className="lc-ajuste__boton" onClick={() => escribirNota(c.id, ajustar(textos[c.id], -0.5))} aria-label="Media nota menos">
                  <Ic n="menos" tam={18} />
              </button>
              <input
                ref={casilla}
                className={`lc-ajuste__nota ${mala ? 'lc-ajuste__nota--mala' : ''}`}
                value={textos[c.id]}
                inputMode="decimal"
                placeholder="–"
                maxLength={3}
                aria-label={`Nota de ${c.nombre}, de 1 a 5`}
                onChange={(e) => escribirNota(c.id, e.target.value)}
                onBlur={() => pendiente.current && programar(textos, comentario, 0)}
              />
              <button type="button" className="lc-ajuste__boton" onClick={() => escribirNota(c.id, ajustar(textos[c.id], 0.5))} aria-label="Media nota más">
                <Ic n="mas" tam={18} />
              </button>
              <span className="lc-ajuste__de">de 1 a 5 · se puede escribir con decimal (4,3)</span>
            </div>
          </div>
        ) : (
          <div className="lc-resumen">
            <div className="lc-resumen__final">
              <span className="lc-resumen__rotulo">Tu nota para {equipo}</span>
              <strong>{final === null ? '–' : nota5(final)}</strong>
              <span className="lc-resumen__de">/ 5</span>
            </div>
            <ul className="lc-resumen__lista">
              {CRITERIOS.map((x, i) => {
                const n = notas[x.id];
                return (
                  <li key={x.id}>
                    <button type="button" className="lc-resumen__fila" style={{ '--c': COLOR_CRITERIO[x.id] } as CSSProperties} onClick={() => ir(i)}>
                      <Ic n={icCriterio(x.id)} tam={16} />
                      <span className="lc-resumen__nombre">{x.corto}</span>
                      <span className="lc-resumen__barra">
                        <span style={{ width: n === undefined ? 0 : `${(n / 5) * 100}%` }} />
                      </span>
                      <strong className={n === undefined ? 'lc-resumen__vacia' : ''}>{n === undefined ? 'falta' : escrito(n)}</strong>
                    </button>
                  </li>
                );
              })}
            </ul>
            <label className="lc-resumen__comentario">
              <span className="lc-resumen__rotulo">Comentario (opcional, solo lo ven los admins)</span>
              <textarea
                value={comentario}
                placeholder="Lo que más te gustó, lo que le faltó…"
                rows={2}
                maxLength={2000}
                onChange={(e) => {
                  setComentario(e.target.value);
                  programar(textos, e.target.value, 800);
                }}
              />
            </label>
            {otras.length > 0 && (
              <div className="lc-resumen__otros">
                <span className="lc-resumen__rotulo">Otros jurados</span>
                {otras.map((o) => {
                  const suya = notaFinal(o.notas);
                  return (
                    <span key={o.juez} className="lc-resumen__otro" title={o.comentario ?? undefined}>
                      {o.juezNombre} <b>{suya === null ? `${cuantos(o.notas)}/7` : nota5(suya)}</b>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className={`lc-pie lc-pie--${tono}`}>
        <button type="button" className="lc-pie__atras" disabled={paso === 0} onClick={() => ir(paso - 1)} aria-label="Anterior">
          <Ic n="atras" tam={20} />
        </button>
        <span className="lc-pie__mensaje">
          {c ? (
            mala ? (
              <>
                <span className="lc-pie__icono"><Ic n="cerrar" tam={18} /></span> Escribe un número de 1 a 5, con máximo un decimal.
              </>
            ) : nota !== undefined ? (
              <>
                <span className="lc-pie__icono"><Ic n="check" tam={18} /></span> ¡Bien! {c.corto}: <b>{escrito(nota)}</b>
              </>
            ) : (
              'Elige una respuesta o escribe la nota.'
            )
          ) : final !== null ? (
            <>
              <span className="lc-pie__icono"><Ic n="estrella" tam={18} /></span> ¡Calificación completa! Nota final <b>{nota5(final)}</b>
            </>
          ) : (
            `${7 - listos === 1 ? 'Falta 1 criterio' : `Faltan ${7 - listos} criterios`}: cuenta en el ranking cuando estén los 7.`
          )}
        </span>
        {guardado}
        <button type="button" className="lc-pie__seguir" onClick={siguiente}>
          {c ? (nota === undefined && !mala ? 'Saltar' : paso === RESUMEN - 1 ? 'Ver resumen' : 'Siguiente') : final !== null ? textoListo : 'Ir al que falta'}
        </button>
      </footer>
    </>
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
    <main className="pa-pagina pa-rk">
      <div className="pa-cabeza">
        <span className="pa-cabeza__icono">
          <Ic n="trofeo" tam={28} />
        </span>
        <div>
          <h1 className="pa-cabeza__titulo">Ranking</h1>
          <p className="pa-cabeza__sub">El promedio de los jurados. Un equipo entra cuando tiene los 7 criterios calificados.</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={datos.publico}
        className={`pa-tarjeta pa-rk__interruptor ${datos.publico ? 'pa-rk__interruptor--abierto' : ''}`}
        disabled={cambiando}
        onClick={cambiar}
      >
        <span className="pa-rk__texto">
          <strong>{datos.publico ? 'Se ve en la entrada' : 'Oculto en la entrada'}</strong>
          <span>
            {datos.publico
              ? 'En la entrada aparece «Ver el ranking» y cualquiera puede verlo. Se actualiza solo.'
              : 'Solo lo ven los admins. Tócalo para que aparezca «Ver el ranking» en la entrada.'}
          </span>
        </span>
        <span className="pa-rk__switch" aria-hidden>
          <span />
        </span>
      </button>

      <div className="pa-tarjeta">
        <span className="pa-rotulo">Así se ve en la entrada</span>
        <TablaRanking filas={datos.ranking} />
      </div>

      {datos.ranking.length > 0 && (
        <div className="pa-tarjeta pa-rk__detalle">
          <span className="pa-rotulo">Detalle por criterio (nota de 1 a 5, promedio de los jurados)</span>
          <div className="pa-rk__tabla" role="table">
            <div className="pa-rk__fila pa-rk__fila--cabeza" role="row">
              <span>#</span>
              <span>Equipo</span>
              {CRITERIOS.map((c) => (
                <span key={c.id} title={c.nombre} style={{ color: COLOR_CRITERIO[c.id] }}>
                  <Ic n={icCriterio(c.id)} tam={14} /> {c.corto} <span className="nv-tenue">{c.peso}%</span>
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
