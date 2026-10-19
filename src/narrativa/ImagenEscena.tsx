/**
 * La pestaña Visuales de una escena, o de toda la pieza (General).
 *
 * A la izquierda, el visual en vivo con la foto de la escena como
 * material. Debajo, el estilo y la paleta, que valen para toda la pieza.
 * A la derecha, la foto y la mecánica del lab: en IA, qué mandos se mueven
 * solos con un dato (lo mismo que en la música); en Música Urbana, cómo
 * reacciona, el cuadro X/Y y los golpes visuales tocados en vivo.
 */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { buscarEscena } from '../estado/escenas';
import { NOMBRE_ESTILO, NOMBRE_GOLPE, NOMBRE_REACCION, ORDEN_ESTILOS, ORDEN_GOLPES } from '../estado/imagen';
import { leerArchivoDatos } from '../estado/musica';
import type { Escena, GolpeVisual, PuntoGesto, ReaccionVisual } from '../estado/tipos';
import { algoritmoDe, valoresPorDefecto } from '../visual/algoritmos';
import { PALETAS } from '../visual/paletas';
import { enVivo } from '../visual/enVivo';
import { Escenario } from './Escenario';
import { ParametrosDatos, type Parametro } from './ParametrosDatos';
import { fondoEscena } from './PasoEscenas';
import { AjustesEstilo } from './AjustesEstilo';
import { ReaccionesMU } from './ReaccionesMU';
import { sorprender } from '../estado/imagen';
import { useReproduccion } from './useReproduccion';

interface Props {
  escena: Escena | null;
  indice: number;
}

export function ImagenEscena({ escena, indice }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const esIA = proyecto.track === 'ia';
  const v = proyecto.visual;

  return (
    <div className="nv-pestana">
      <div className="nv-imagen">
        <div className="nv-imagen__vista">
          <Escenario escenaFija={escena?.id} />
          <div className="nv-estilos">
            {ORDEN_ESTILOS.map((a) => (
              <button
                key={a}
                type="button"
                className={`nv-estilo nv-estilo--${a} ${v.algoritmo === a ? 'nv-estilo--activo' : ''}`}
                onClick={() => actualizar((p) => (p.visual.algoritmo = a))}
              >
                <span className="nv-estilo__muestra" />
                {NOMBRE_ESTILO[a]}
              </button>
            ))}
          </div>
          <div className="nv-paletas">
            <span className="nv-tenue nv-chico">Paleta</span>
            {PALETAS.map((pal) => (
              <button
                key={pal.id}
                type="button"
                title={pal.nombre}
                className={`nv-paleta ${!v.paletaPropia && v.paleta === pal.id ? 'nv-paleta--activa' : ''}`}
                onClick={() =>
                  actualizar((p) => {
                    p.visual.paleta = pal.id;
                    p.visual.paletaPropia = undefined;
                  })
                }
              >
                {pal.colores.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </button>
            ))}
            {v.paletaPropia && (
              <span className="nv-paleta nv-paleta--activa" title="Colores de tu imagen">
                {v.paletaPropia.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
            )}
          </div>
        </div>

        <aside className="nv-tarjeta nv-imagen__lado">
          <FotoEscena escena={escena} />
          {esIA ? <ImagenIA /> : <ImagenMU escena={escena} indice={indice} />}
        </aside>
      </div>
    </div>
  );
}

/** La foto de la escena (o de toda la pieza): es el material del visual. */
function FotoEscena({ escena }: { escena: Escena | null }) {
  const { proyecto, actualizar } = useProyecto();
  const [leyendo, setLeyendo] = useState(false);
  const esIA = proyecto.track === 'ia';

  const elegirFoto = (archivo: File | undefined) => {
    if (!archivo) return;
    const url = crearUrl(archivo);
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) e.imagenUrl = url;
      else p.visual.imagenUrl = url;
    });
  };

  const coloresDeImagen = async (archivo: File | undefined) => {
    if (!archivo) return;
    setLeyendo(true);
    try {
      const datos = await leerArchivoDatos(archivo);
      if (datos.colores) actualizar((p) => (p.visual.paletaPropia = datos.colores));
    } finally {
      setLeyendo(false);
    }
  };

  const fotoUrl = escena ? escena.imagenUrl : proyecto.visual.imagenUrl;
  return (
    <div className="nv-foto">
      <span
        className="nv-foto__muestra"
        style={{ background: escena ? fondoEscena(escena) : fotoUrl ? `center / cover url(${fotoUrl})` : '#2d3244' }}
      />
      <span className="nv-foto__texto">
        <strong>{escena ? 'Tu foto es el material' : 'Foto para toda la pieza'}</strong>
        <span className="nv-campo__fila">
          <label className={`${esIA ? 'nv-ia' : 'nv-mu'} nv-enlace-label`}>
            {fotoUrl ? 'Cambiar foto' : 'Elegir foto'}
            <input type="file" accept="image/*" hidden onChange={(ev) => elegirFoto(ev.target.files?.[0])} />
          </label>
          {!esIA && (
            <label className="nv-mu nv-enlace-label">
              {leyendo ? 'Leyendo…' : 'Usar colores de otra imagen'}
              <input type="file" accept="image/*" hidden onChange={(ev) => void coloresDeImagen(ev.target.files?.[0])} />
            </label>
          )}
        </span>
      </span>
    </div>
  );
}

/** Lab de IA: qué mandos del visual se mueven solos con un dato. */
function ImagenIA() {
  const { proyecto, actualizar } = useProyecto();
  const alg = algoritmoDe(proyecto.visual.algoritmo);
  const valores = { ...valoresPorDefecto(alg), ...(proyecto.visual.parametros[alg.id] ?? {}) };
  const parametros: Parametro[] = [
    ...alg.mandos.map((m) => ({
      clave: m.id,
      etiqueta: m.etiqueta,
      opciones: m.opciones,
      mano: {
        valor: (valores[m.id] - m.min) / (m.max - m.min),
        poner: (v: number) =>
          actualizar((p) => {
            const lista = (p.visual.parametros[alg.id] ??= {});
            lista[m.id] = m.min + v * (m.max - m.min);
          }),
      },
    })),
    { clave: 'paleta', etiqueta: 'Paleta de colores', notaMano: 'la que elijas abajo' },
  ];
  return (
    <>
      <div className="nv-campo__fila">
        <strong className="nv-subtitulo">Datos</strong>
        <span className="nv-espacio" />
        <button type="button" className="nv-boton nv-boton--chico nv-boton--sorpresa" onClick={() => actualizar(sorprender)}>
          ✦ Sorprenderme
        </button>
      </div>
      <span className="nv-tenue nv-chico">Elige qué se mueve solo con un dato. Lo demás lo pones tú.</span>
      <ParametrosDatos clave="conexionesVisual" grupos={[{ titulo: NOMBRE_ESTILO[alg.id], parametros }]} />
    </>
  );
}

/** Graba lo que se toca sobre una escena mientras suena, y lo guarda al terminar. */
function useGrabarEnEscena(escena: Escena | null, indice: number, alGuardar: (gesto: PuntoGesto[], golpes: { t: number; tipo: GolpeVisual }[]) => void) {
  const { sonando } = useReproduccion();
  const [grabando, setGrabando] = useState(false);
  const yaSono = useRef(false);
  const gesto = useRef<PuntoGesto[]>([]);
  const golpes = useRef<{ t: number; tipo: GolpeVisual }[]>([]);
  const guardar = useRef(alGuardar);
  guardar.current = alGuardar;

  useEffect(() => {
    if (!grabando) return;
    if (sonando) {
      yaSono.current = true;
      return;
    }
    if (!yaSono.current) return;
    setGrabando(false);
    guardar.current(gesto.current, golpes.current);
  }, [sonando, grabando]);

  useEffect(() => {
    if (!grabando) return;
    const reloj = window.setInterval(() => {
      if (motorAudio.estaSonando && enVivo.gesto) {
        gesto.current.push({ t: motorAudio.fraccionSeccion, ...enVivo.gesto });
      }
    }, 66);
    const quitar = enVivo.alDisparar((tipo) => {
      if (motorAudio.estaSonando) golpes.current.push({ t: motorAudio.fraccionSeccion, tipo });
    });
    return () => {
      window.clearInterval(reloj);
      quitar();
    };
  }, [grabando]);

  const empezar = () => {
    if (!escena) return;
    gesto.current = [];
    golpes.current = [];
    yaSono.current = false;
    setGrabando(true);
    void motorAudio.reproducirEscena(indice);
  };

  return { grabando, empezar, parar: () => motorAudio.detener() };
}

function ImagenMU({ escena, indice }: { escena: Escena | null; indice: number }) {
  const { actualizar } = useProyecto();
  const cuadro = useRef<HTMLDivElement>(null);
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);

  const { grabando, empezar, parar } = useGrabarEnEscena(escena, indice, (gesto, golpes) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (!e) return;
      if (gesto.length > 1) e.gestoVisual = gesto;
      if (golpes.length > 0) e.golpesVisuales = golpes;
    }),
  );

  const leer = (ev: EventoPuntero<HTMLDivElement>) => {
    const caja = cuadro.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (ev.clientX - caja.left) / caja.width));
    const y = Math.max(0, Math.min(1, 1 - (ev.clientY - caja.top) / caja.height));
    setPunto({ x, y });
    enVivo.gesto = { x, y };
  };
  const soltar = () => {
    setPunto(null);
    enVivo.gesto = null;
  };

  const marcas = (escena?.gestoVisual?.length ?? 0) + (escena?.golpesVisuales?.length ?? 0);

  return (
    <>
      {escena ? (
        <>
          <div className="nv-campo">
            <span className="nv-campo__titulo">Movimiento de fondo con el sonido</span>
            <div className="nv-selector nv-selector--lleno">
              {(['bombo', 'voz', 'quieta'] as ReaccionVisual[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`nv-selector__op ${(escena.reaccion ?? 'bombo') === r ? 'nv-selector__op--activa nv-selector__op--mu' : ''}`}
                  onClick={() =>
                    actualizar((p) => {
                      const e = buscarEscena(p, escena.id);
                      if (e) e.reaccion = r;
                    })
                  }
                >
                  {NOMBRE_REACCION[r]}
                </button>
              ))}
            </div>
          </div>

          <ReaccionesMU escena={escena} />

          <div className="nv-jugar">
            <div
              ref={cuadro}
              className="nv-xy nv-xy--chico"
              onPointerDown={(ev) => {
                ev.currentTarget.setPointerCapture(ev.pointerId);
                leer(ev);
              }}
              onPointerMove={(ev) => punto && leer(ev)}
              onPointerUp={soltar}
              onPointerCancel={soltar}
            >
              <span className="nv-xy__eje nv-xy__eje--arriba">luminosa</span>
              <span className="nv-xy__eje nv-xy__eje--abajo">oscura</span>
              <span className="nv-xy__eje nv-xy__eje--derecha">caótica →</span>
              {punto && <span className="nv-xy__punto" style={{ left: `${punto.x * 100}%`, top: `${(1 - punto.y) * 100}%` }} />}
            </div>
            <div className="nv-pads">
              {ORDEN_GOLPES.map((g) => (
                <button key={g} type="button" className="nv-pad" onPointerDown={() => enVivo.disparar(g)}>
                  {NOMBRE_GOLPE[g]}
                </button>
              ))}
            </div>
          </div>

          <span className="nv-espacio-v" />
          <div className="nv-campo__fila">
            <span className="nv-tenue nv-chico">
              {marcas > 0 ? 'Esta escena ya tiene lo que tocaste grabado.' : 'Toca el cuadro y los botones mientras suena.'}
            </span>
            <span className="nv-espacio" />
            {marcas > 0 && (
              <button
                type="button"
                className="nv-enlace nv-chico"
                onClick={() =>
                  actualizar((p) => {
                    const e = buscarEscena(p, escena.id);
                    if (!e) return;
                    e.gestoVisual = undefined;
                    e.golpesVisuales = undefined;
                  })
                }
              >
                borrar
              </button>
            )}
          </div>
          <button
            type="button"
            className={`nv-boton nv-boton--rojo nv-lleno ${grabando ? 'nv-latiendo' : ''}`}
            onClick={() => (grabando ? parar() : empezar())}
          >
            <span className="nv-punto nv-punto--blanco" />
            {grabando ? 'Grabando… toca para parar' : 'Grabar mientras suena'}
          </button>
        </>
      ) : (
        <>
          <span className="nv-espacio-v" />
          <span className="nv-tenue nv-chico nv-italica">
            Dentro de cada escena eliges cómo reacciona y tocas el visual en vivo.
          </span>
        </>
      )}
      <AjustesEstilo />
    </>
  );
}
