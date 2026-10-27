/**
 * Qué parámetros se mueven solos con un dato.
 *
 * Una fila por parámetro, siempre con las mismas tres columnas: lo que se
 * mueve, el dato que lo mueve y cuánto. Elegir el dato es un solo toque; con
 * «Ver» se comprueba cómo se movería a lo largo de la pieza. Lo que no tiene
 * dato se pone a mano. Lo usan la música y la imagen; por debajo son conexiones.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { COLOR_GRUPO, fuente, fuentesDe, leerArchivoDatos, NOMBRE_CANTIDAD, nuevaConexion } from '../estado/musica';
import { Onda } from './VozEscena';
import { SelectorOpciones } from './SelectorOpciones';
import { SelectorDato } from './SelectorDato';
import { LineaDato } from './LineaDato';

export interface Parametro {
  clave: string;
  etiqueta: string;
  /** El valor a mano (0..1), si este parámetro tiene uno. */
  mano?: { valor: number; poner: (v: number) => void };
  /** Qué significa «a mano» cuando no hay deslizador. */
  notaMano?: string;
  /** Si es una elección (figura, alfabeto…), sus opciones: en vez de deslizador, un selector. */
  opciones?: string[];
}

interface Props {
  clave: 'conexiones' | 'conexionesVisual';
  grupos: { titulo: string; parametros: Parametro[] }[];
}

export function ParametrosDatos({ clave, grupos }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const fuentes = fuentesDe(proyecto, clave === 'conexionesVisual' ? 'imagen' : 'musica');
  const conexionDe = (destino: string) => proyecto[clave].find((c) => c.destino === destino);
  // La vista previa pesa en pantalla: solo se ve en las filas donde se pide.
  const [vistas, setVistas] = useState<Set<string>>(new Set());
  const alternarVista = (destino: string) =>
    setVistas((antes) => {
      const ahora = new Set(antes);
      if (!ahora.delete(destino)) ahora.add(destino);
      return ahora;
    });

  const usar = (destino: string, fuenteClave: string | null) => {
    actualizar((p) => {
      const previa = p[clave].find((c) => c.destino === destino);
      p[clave] = p[clave].filter((c) => c.destino !== destino);
      if (fuenteClave) {
        const nueva = nuevaConexion(fuenteClave, destino);
        if (previa) nueva.cantidad = previa.cantidad;
        p[clave].push(nueva);
      }
    });
  };

  return (
    <div className="nv-parametros">
      <p className="nv-tenue nv-chico nv-datos-intro">
        Cada fila es algo que se puede mover. Elige un <b>dato</b> (la emoción, la voz, un golpe, una foto…) y esa fila se
        mueve sola <b>según</b> él. Con <b>◔ Ver</b> compruebas cómo se movería a lo largo de tu pieza.
      </p>
      <div className="nv-parametros__cabeza" aria-hidden="true">
        <span>SE MUEVE</span>
        <span>SEGÚN ESTE DATO</span>
        <span>CUÁNTO</span>
      </div>
      {grupos.map((g) => (
        <div key={g.titulo} className="nv-parametros__grupo">
          <span className="nv-etiqueta nv-tenue">{g.titulo.toUpperCase()}</span>
          {g.parametros.map((par) => {
            const c = conexionDe(par.clave);
            const f = c ? fuente(proyecto, c.fuente) : undefined;
            const col = f ? COLOR_GRUPO[f.grupo] : '#5ee0ff';
            return (
              <div key={par.clave} className="nv-parametro-bloque">
                <div className={`nv-parametro ${c ? 'nv-parametro--dato' : ''}`} style={{ ['--c' as string]: col }}>
                  <span className="nv-parametro__nombre">{par.etiqueta}</span>
                  <SelectorDato
                    fuentes={fuentes}
                    actual={c?.fuente}
                    elegida={f}
                    alElegir={(k) => usar(par.clave, k)}
                  />
                  {c ? (
                    <div className="nv-parametro__cuanto">
                      <div className="nv-selector nv-selector--ia nv-selector--chico">
                        {([1, 2, 3] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={`nv-selector__op ${c.cantidad === n ? 'nv-selector__op--activa' : ''}`}
                            onClick={() =>
                              actualizar((p) => {
                                const x = p[clave].find((k) => k.id === c.id);
                                if (x) x.cantidad = n;
                              })
                            }
                          >
                            {NOMBRE_CANTIDAD[n]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`nv-boton nv-boton--chico ${vistas.has(par.clave) ? 'nv-boton--activo' : ''}`}
                        aria-pressed={vistas.has(par.clave)}
                        title="Ver cómo se movería a lo largo de la pieza"
                        onClick={() => alternarVista(par.clave)}
                      >
                        ◔ Ver
                      </button>
                    </div>
                  ) : par.mano && par.opciones ? (
                    <span className="nv-parametro__mano">
                      <SelectorOpciones
                        opciones={par.opciones}
                        valor={par.mano.valor * (par.opciones.length - 1)}
                        etiqueta={par.etiqueta}
                        alCambiar={(i) => par.mano?.poner(i / Math.max(1, par.opciones!.length - 1))}
                      />
                    </span>
                  ) : par.mano ? (
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      className="nv-parametro__mano"
                      aria-label={`${par.etiqueta}, a mano`}
                      value={Math.max(0, Math.min(1, par.mano.valor))}
                      onChange={(ev) => par.mano?.poner(Number(ev.target.value))}
                    />
                  ) : (
                    <span className="nv-tenue nv-chico">{par.notaMano ?? 'queda fijo'}</span>
                  )}
                </div>
                {c && vistas.has(par.clave) && <LineaDato fuente={c.fuente} cantidad={c.cantidad} color={col} />}
              </div>
            );
          })}
        </div>
      ))}
      <ArchivosDatos />
    </div>
  );
}

/** Los archivos que se suben solo para sacarles datos (ritmo de un sonido, brillo de una imagen). */
function ArchivosDatos() {
  const { proyecto, actualizar } = useProyecto();
  const [leyendo, setLeyendo] = useState(false);

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setLeyendo(true);
    try {
      const datos = await leerArchivoDatos(archivo);
      actualizar((p) => p.archivosDatos.push(datos));
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <div className="nv-parametros__grupo">
      <span className="nv-etiqueta nv-tenue">DATOS DE TUS ARCHIVOS</span>
      <div className="nv-fichas">
        {proyecto.archivosDatos.map((a) => (
          <span key={a.id} className="nv-archivo nv-archivo--chico">
            <span className="nv-archivo__onda">
              {a.colores ? (
                <span className="nv-muestras">
                  {a.colores.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
              ) : (
                <Onda semilla={a.id} color={COLOR_GRUPO.archivo} barras={14} />
              )}
            </span>
            <span className="nv-archivo__texto">
              <strong>{a.nombre}</strong>
              <span className="nv-tenue">{a.tipo === 'sonido' ? 'da su ritmo' : 'da su luz, sus colores y sus bits'}</span>
            </span>
            <button
              type="button"
              className="nv-enlace nv-chico"
              aria-label={`Quitar ${a.nombre}`}
              onClick={() =>
                actualizar((p) => {
                  p.archivosDatos = p.archivosDatos.filter((x) => x.id !== a.id);
                  const k = `archivo:${a.id}`;
                  p.conexiones = p.conexiones.filter((c) => c.fuente !== k);
                  p.conexionesVisual = p.conexionesVisual.filter((c) => c.fuente !== k);
                })
              }
            >
              ×
            </button>
          </span>
        ))}
        <label className="nv-subir">
          {leyendo ? 'Leyendo…' : '+ Subir un sonido o una imagen'}
          <input type="file" accept="audio/*,image/*" hidden onChange={(ev) => void subir(ev.target.files?.[0])} />
        </label>
      </div>
      <span className="nv-tenue nv-chico nv-italica">
        Del archivo no se usa el sonido ni la foto: se le sacan datos (luz, rojo, verde, azul, color, detalle y bits) y aparecen en la lista de cada parámetro. La foto de la escena ya está en la lista.
      </span>
    </div>
  );
}
