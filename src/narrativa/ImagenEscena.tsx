/**
 * La imagen de una escena, o de toda la pieza (General).
 *
 * A la izquierda, el visual en vivo con la foto de la escena como
 * material. Debajo, el estilo y la paleta, que valen para toda la pieza.
 * A la derecha, la mecánica del lab: en IA las mismas conexiones que en la
 * música, apuntadas a los mandos del visual; en Música Urbana, cómo
 * reacciona, el cuadro X/Y y los golpes visuales tocados en vivo.
 */
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena, EMOCIONES, recorrido } from '../estado/escenas';
import {
  destinosVisuales,
  NOMBRE_ESTILO,
  NOMBRE_GOLPE,
  NOMBRE_REACCION,
  ORDEN_ESTILOS,
  ORDEN_GOLPES,
} from '../estado/imagen';
import { fuente, leerArchivoDatos } from '../estado/musica';
import type { Conexion, Escena, GolpeVisual, PuntoGesto, ReaccionVisual } from '../estado/tipos';
import { PALETAS } from '../visual/paletas';
import { enVivo } from '../visual/enVivo';
import { BandejaFuentes, conectar, ListaConexiones } from './Conexiones';
import { Escenario } from './Escenario';
import { fondoEscena } from './PasoEscenas';
import { useReproduccion } from './useReproduccion';

interface Props {
  id: string;
  alVolver: () => void;
  alMusica: () => void;
}

export function ImagenEscena({ id, alVolver, alMusica }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { sonando } = useReproduccion();
  const general = id === 'general';
  const escena = general ? null : buscarEscena(proyecto, id) ?? null;
  const lista = recorrido(proyecto);
  const indice = escena ? lista.findIndex((e) => e.id === escena.id) : -1;
  const color = escena ? EMOCIONES[escena.emocion].color : '#ffb020';
  const esIA = proyecto.track === 'ia';
  const v = proyecto.visual;

  const escuchar = () => {
    if (sonando) motorAudio.detener();
    else if (escena) void motorAudio.reproducirEscena(indice);
    else void motorAudio.reproducirPieza();
  };

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-cabeza">
        <button type="button" className="nv-boton" onClick={alVolver}>
          ← {escena ? (escena.respiro ? 'Respiro' : escena.nombre) : 'Escenas'}
        </button>
        <div className="nv-dentro__nombre">
          <span className="nv-etiqueta" style={{ color }}>
            {escena ? 'IMAGEN DE LA ESCENA' : 'IMAGEN DE TODA LA PIEZA'}
          </span>
          <h1 className="nv-titulo">{escena ? (escena.respiro ? 'Respiro' : escena.nombre) : 'General'}</h1>
        </div>
        <span className="nv-espacio" />
        <div className="nv-selector">
          <button type="button" className="nv-selector__op" onClick={alMusica}>
            ♫  Música
          </button>
          <button type="button" className="nv-selector__op nv-selector__op--activa">
            ◐  Imagen
          </button>
        </div>
        <button type="button" className="nv-boton" onClick={escuchar}>
          {sonando ? '■  Parar' : escena ? '▶  Escuchar esta escena' : '▶  Escuchar la pieza'}
        </button>
      </div>

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
          {esIA ? <ImagenIA /> : <ImagenMU escena={escena} indice={indice} />}
        </aside>
      </div>
    </div>
  );
}

function ImagenIA() {
  const { proyecto, actualizar } = useProyecto();
  const [fuentesAbiertas, setFuentesAbiertas] = useState(false);
  const destinos = destinosVisuales(proyecto.visual.algoritmo);

  const frase = (c: Conexion) => {
    const f = fuente(proyecto, c.fuente);
    const d = destinos.find((x) => x.clave === c.destino);
    if (!f || !d) return '';
    const dato = f.etiqueta.charAt(0).toLowerCase() + f.etiqueta.slice(1);
    if (c.destino === 'paleta') {
      return c.fuente.startsWith('archivo:')
        ? `La obra se pinta con los colores de ${f.etiqueta.split(' · ')[0]}.`
        : `Los colores cambian según ${dato}.`;
    }
    return `Cuanto más sube ${dato}, más sube «${d.etiqueta.toLowerCase()}».`;
  };

  return (
    <>
      <div className="nv-campo__fila">
        <strong className="nv-subtitulo">Conexiones</strong>
        <span className="nv-tenue nv-chico">valen para toda la pieza</span>
        <span className="nv-espacio" />
        <button
          type="button"
          className={`nv-boton nv-boton--chico nv-boton--ia ${fuentesAbiertas ? 'nv-boton--ia-activo' : ''}`}
          onClick={() => setFuentesAbiertas(!fuentesAbiertas)}
        >
          {fuentesAbiertas ? 'Ver conexiones' : 'Fuentes de datos ▸'}
        </button>
      </div>
      {fuentesAbiertas ? (
        <BandejaFuentes
          alConectar={(clave) => {
            actualizar((p) => p.conexionesVisual.push(conectar(p.conexionesVisual, destinos, clave)));
            setFuentesAbiertas(false);
          }}
        />
      ) : (
        <ListaConexiones clave="conexionesVisual" destinos={destinos} frase={frase} />
      )}
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
  const { proyecto, actualizar } = useProyecto();
  const cuadro = useRef<HTMLDivElement>(null);
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [leyendo, setLeyendo] = useState(false);

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

  const elegirFoto = (archivo: File | undefined) => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) e.imagenUrl = url;
      else p.visual.imagenUrl = url;
    });
  };

  const fotoUrl = escena ? escena.imagenUrl : proyecto.visual.imagenUrl;
  const marcas = (escena?.gestoVisual?.length ?? 0) + (escena?.golpesVisuales?.length ?? 0);

  return (
    <>
      <div className="nv-foto">
        <span
          className="nv-foto__muestra"
          style={{ background: escena ? fondoEscena(escena) : fotoUrl ? `center / cover url(${fotoUrl})` : '#2d3244' }}
        />
        <span className="nv-foto__texto">
          <strong>{escena ? 'Tu foto es el material' : 'Foto para toda la pieza'}</strong>
          <span className="nv-campo__fila">
            <label className="nv-mu nv-enlace-label">
              {fotoUrl ? 'Cambiar foto' : 'Elegir foto'}
              <input type="file" accept="image/*" hidden onChange={(ev) => elegirFoto(ev.target.files?.[0])} />
            </label>
            <label className="nv-mu nv-enlace-label">
              {leyendo ? 'Leyendo…' : 'Usar colores de otra imagen'}
              <input type="file" accept="image/*" hidden onChange={(ev) => void coloresDeImagen(ev.target.files?.[0])} />
            </label>
          </span>
        </span>
      </div>

      {escena ? (
        <>
          <div className="nv-campo">
            <span className="nv-campo__titulo">Cómo reacciona al sonido</span>
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
    </>
  );
}
