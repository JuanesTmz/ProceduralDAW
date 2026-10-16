/**
 * Lab de IA: dirigir la música con datos.
 *
 * Lo principal son las conexiones —«este parámetro se mueve según este
 * dato»—, que valen para toda la pieza: como la emoción y la fuerza
 * cambian de escena a escena, las mismas reglas dan una música distinta en
 * cada una. «Ajustar a mano» abre las perillas para fijar un valor directo.
 * Dentro de una escena, la máquina propone tres versiones para elegir.
 */
import { useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena, EMOCIONES } from '../estado/escenas';
import {
  COLOR_GRUPO,
  destino,
  destinosDe,
  fraseConexion,
  fuente,
  fuentesDe,
  leerArchivoDatos,
  NOMBRE_CANTIDAD,
  nuevaConexion,
} from '../estado/musica';
import type { Conexion, Escena } from '../estado/tipos';
import type { Herramienta } from './MusicaEscena';
import { useReproduccion } from './useReproduccion';
import { Onda } from './VozEscena';

interface Props {
  escena: Escena | null;
  indice: number;
  alAbrir: (h: Herramienta) => void;
}

type Punta = 'fuente' | 'destino';

export function MusicaIA({ escena, indice, alAbrir }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [aMano, setAMano] = useState(false);
  const [abierto, setAbierto] = useState<{ id: string; punta: Punta } | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const fuentes = fuentesDe(proyecto);
  const destinos = destinosDe(proyecto);

  const cambiar = (id: string, receta: (c: Conexion) => void) =>
    actualizar((p) => {
      const c = p.conexiones.find((x) => x.id === id);
      if (c) receta(c);
    });

  const conectarDesde = (clave: string) => {
    const usados = new Set(proyecto.conexiones.map((c) => c.destino));
    const libre = destinos.find((d) => !usados.has(d.clave)) ?? destinos[0];
    actualizar((p) => p.conexiones.push(nuevaConexion(clave, libre.clave)));
  };

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

  const colorFuente = (clave: string) => COLOR_GRUPO[fuente(proyecto, clave)?.grupo ?? 'relato'];

  return (
    <div className="nv-musica">
      <div className="nv-musica__principal">
        <div className="nv-campo__fila">
          <strong className="nv-subtitulo">Conexiones</strong>
          <span className="nv-tenue nv-chico">valen para toda la pieza</span>
          <span className="nv-espacio" />
          <button
            type="button"
            className={`nv-boton nv-boton--chico nv-boton--ia ${aMano ? 'nv-boton--ia-activo' : ''}`}
            onClick={() => setAMano(!aMano)}
          >
            ✎ {aMano ? 'Ajustando a mano  ✕' : 'Ajustar a mano'}
          </button>
        </div>

        <div className="nv-conexiones" onClick={() => setAbierto(null)}>
          {proyecto.conexiones.length === 0 && (
            <p className="nv-tenue nv-italica">
              Todavía no hay conexiones. Toca una fuente de la derecha para crear una.
            </p>
          )}
          {proyecto.conexiones.map((c) => {
            const f = fuente(proyecto, c.fuente);
            const d = destino(proyecto, c.destino);
            const col = colorFuente(c.fuente);
            return (
              <div key={c.id} className="nv-conexion">
                <div className="nv-conexion__fila">
                  <div className="nv-desplegable">
                    <button
                      type="button"
                      className="nv-ficha"
                      style={{ color: col, background: `${col}22`, borderColor: `${col}88` }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setAbierto(abierto?.id === c.id && abierto.punta === 'fuente' ? null : { id: c.id, punta: 'fuente' });
                      }}
                    >
                      <span className="nv-punto" style={{ background: col }} />
                      {f?.etiqueta ?? '¿qué dato?'} ▾
                    </button>
                    {abierto?.id === c.id && abierto.punta === 'fuente' && (
                      <div className="nv-lista-flotante" onClick={(ev) => ev.stopPropagation()}>
                        {fuentes.map((x) => (
                          <button
                            key={x.clave}
                            type="button"
                            onClick={() => {
                              cambiar(c.id, (k) => (k.fuente = x.clave));
                              setAbierto(null);
                            }}
                          >
                            <span className="nv-punto" style={{ background: COLOR_GRUPO[x.grupo] }} />
                            {x.etiqueta}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="nv-tenue nv-chico">mueve →</span>
                  <div className="nv-desplegable">
                    <button
                      type="button"
                      className="nv-ficha nv-ficha--destino"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setAbierto(abierto?.id === c.id && abierto.punta === 'destino' ? null : { id: c.id, punta: 'destino' });
                      }}
                    >
                      {d?.etiqueta ?? '¿qué cosa?'} ▾
                    </button>
                    {abierto?.id === c.id && abierto.punta === 'destino' && (
                      <div className="nv-lista-flotante" onClick={(ev) => ev.stopPropagation()}>
                        {destinos.map((x) => (
                          <button
                            key={x.clave}
                            type="button"
                            onClick={() => {
                              cambiar(c.id, (k) => (k.destino = x.clave));
                              setAbierto(null);
                            }}
                          >
                            {x.etiqueta}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="nv-espacio" />
                  <div className="nv-selector nv-selector--ia">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`nv-selector__op ${c.cantidad === n ? 'nv-selector__op--activa' : ''}`}
                        onClick={() => cambiar(c.id, (k) => (k.cantidad = n))}
                      >
                        {NOMBRE_CANTIDAD[n]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="nv-quitar nv-quitar--fila"
                    aria-label="Quitar conexión"
                    onClick={() => actualizar((p) => (p.conexiones = p.conexiones.filter((x) => x.id !== c.id)))}
                  >
                    ×
                  </button>
                </div>
                <span className="nv-tenue nv-italica nv-chico">{fraseConexion(proyecto, c)}</span>
              </div>
            );
          })}
          <button type="button" className="nv-conectar" onClick={() => conectarDesde('emocion')}>
            +  Conectar
          </button>
        </div>

        {escena && !escena.respiro && <Propuestas escena={escena} indice={indice} />}
      </div>

      <aside className="nv-tarjeta nv-musica__lado">
        {aMano ? (
          <AMano alAbrir={alAbrir} />
        ) : (
          <>
            <strong className="nv-subtitulo">Fuentes de datos</strong>
            <span className="nv-tenue nv-chico">Toca una para conectarla.</span>
            {(['relato', 'sonido'] as const).map((g) => (
              <div key={g} className="nv-grupo-fuentes">
                <span className="nv-etiqueta nv-tenue">{g === 'relato' ? 'DEL RELATO' : 'DEL SONIDO'}</span>
                <div className="nv-fichas">
                  {fuentes
                    .filter((f) => f.grupo === g)
                    .map((f) => (
                      <button
                        key={f.clave}
                        type="button"
                        className="nv-ficha nv-ficha--chica"
                        style={{ color: COLOR_GRUPO[g], background: `${COLOR_GRUPO[g]}1f` }}
                        onClick={() => conectarDesde(f.clave)}
                      >
                        <span className="nv-punto" style={{ background: COLOR_GRUPO[g] }} />
                        {f.etiqueta}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            <div className="nv-grupo-fuentes">
              <span className="nv-etiqueta nv-tenue">DE TUS ARCHIVOS</span>
              {proyecto.archivosDatos.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="nv-archivo"
                  onClick={() => conectarDesde(`archivo:${a.id}`)}
                >
                  <span className="nv-archivo__onda">
                    <Onda semilla={a.id} color={COLOR_GRUPO.archivo} barras={18} />
                  </span>
                  <span className="nv-archivo__texto">
                    <strong>{a.nombre}</strong>
                    <span className="nv-tenue">{a.tipo === 'sonido' ? 'ritmo · volumen' : 'brillo · colores'}</span>
                  </span>
                </button>
              ))}
              <label className="nv-subir">
                {leyendo ? 'Leyendo…' : '+ Subir un sonido o una imagen'}
                <input type="file" accept="audio/*,image/*" hidden onChange={(ev) => void subir(ev.target.files?.[0])} />
              </label>
            </div>
            <span className="nv-espacio-v" />
            <span className="nv-tenue nv-chico nv-italica">
              Del archivo no se usa el sonido ni la foto: se le sacan datos.
            </span>
          </>
        )}
      </aside>
    </div>
  );
}

/** Las perillas a mano. Lo que ya mueve una conexión se ve, y se puede soltar. */
function AMano({ alAbrir }: { alAbrir: (h: Herramienta) => void }) {
  const { proyecto, actualizar } = useProyecto();
  const conectado = (clave: string) => proyecto.conexiones.find((c) => c.destino === clave);
  const soltar = (clave: string) =>
    actualizar((p) => (p.conexiones = p.conexiones.filter((c) => c.destino !== clave)));

  const perillas: {
    clave: string;
    nombre: string;
    valor: number;
    poner: (v: number) => void;
  }[] = [
    {
      clave: 'brillo',
      nombre: 'Brillo del sonido',
      valor: Math.log2(proyecto.efectos.filtroFrecuencia / 200) / Math.log2(90),
      poner: (v) => actualizar((p) => (p.efectos.filtroFrecuencia = Math.round(200 * Math.pow(90, v)))),
    },
    {
      clave: 'eco',
      nombre: 'Eco',
      valor: proyecto.efectos.delayCantidad / 0.6,
      poner: (v) => actualizar((p) => (p.efectos.delayCantidad = v * 0.6)),
    },
    {
      clave: 'sala',
      nombre: 'Sala',
      valor: proyecto.efectos.reverbCantidad / 0.8,
      poner: (v) => actualizar((p) => (p.efectos.reverbCantidad = v * 0.8)),
    },
    {
      clave: 'tempo',
      nombre: `Tempo · ${proyecto.bpm}`,
      valor: (proyecto.bpm - 60) / 80,
      poner: (v) => actualizar((p) => (p.bpm = Math.round(60 + v * 80))),
    },
  ];

  return (
    <>
      <strong className="nv-subtitulo">A mano</strong>
      {perillas.map((k) => {
        const c = conectado(k.clave);
        const f = c ? fuente(proyecto, c.fuente) : undefined;
        return (
          <div key={k.clave} className={`nv-perilla ${c ? 'nv-perilla--conectada' : ''}`}>
            <div className="nv-campo__fila">
              <span>{k.nombre}</span>
              <span className="nv-espacio" />
              {c && (
                <>
                  <span className="nv-chip nv-chip--chico" style={{ color: COLOR_GRUPO[f?.grupo ?? 'relato'] }}>
                    lo mueve: {f?.etiqueta}
                  </span>
                  <button type="button" className="nv-enlace nv-chico" onClick={() => soltar(k.clave)}>
                    soltar
                  </button>
                </>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={Math.max(0, Math.min(1, k.valor))}
              disabled={Boolean(c)}
              onChange={(ev) => k.poner(Number(ev.target.value))}
            />
          </div>
        );
      })}
      <span className="nv-espacio-v" />
      <div className="nv-campo__fila">
        <button type="button" className="nv-boton nv-boton--suave" onClick={() => alAbrir('golpes')}>
          Editar golpes
        </button>
        <button type="button" className="nv-boton nv-boton--suave" onClick={() => alAbrir('melodia')}>
          Editar melodía
        </button>
      </div>
    </>
  );
}

/** La máquina propone: tres versiones de la escena con las mismas reglas. */
function Propuestas({ escena, indice }: { escena: Escena; indice: number }) {
  const { actualizar } = useProyecto();
  const { sonando } = useReproduccion();
  const color = EMOCIONES[escena.emocion].color;
  const desde = escena.propuestasDesde;

  const probar = (version: number) => {
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (e) e.version = version;
    });
    // Espera a que el motor reciba la versión nueva antes de tocar.
    requestAnimationFrame(() => void motorAudio.reproducirEscena(indice));
  };

  return (
    <div className="nv-tarjeta nv-propuestas">
      <div className="nv-campo__fila">
        <strong>La máquina propone</strong>
        <span className="nv-tenue nv-chico">con tus conexiones, tres versiones de esta escena</span>
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-enlace nv-ia"
          onClick={() =>
            actualizar((p) => {
              const e = buscarEscena(p, escena.id);
              if (e) e.propuestasDesde += 3;
            })
          }
        >
          Proponer otras
        </button>
      </div>
      <div className="nv-propuestas__fila">
        {[0, 1, 2].map((j) => {
          const v = desde + j;
          const elegida = escena.version === v;
          return (
            <button
              key={v}
              type="button"
              className={`nv-propuesta ${elegida ? 'nv-propuesta--elegida' : ''}`}
              onClick={() => (sonando && elegida ? motorAudio.detener() : probar(v))}
            >
              <span className="nv-campo__fila">
                <strong>Propuesta {j + 1}</strong>
                <span className="nv-espacio" />
                <span>{sonando && elegida ? '■' : '▶'}</span>
              </span>
              <Onda semilla={`${escena.id}-${v}`} color={elegida ? '#5ee0ff' : '#8b91a5'} barras={40} />
              {elegida && <span className="nv-chico nv-ia">✓ Esta es la que suena</span>}
            </button>
          );
        })}
      </div>
      <span className="nv-chico nv-tenue" style={{ color }}>
        Cambia el azar, no tus reglas: por eso se parecen pero no son iguales.
      </span>
    </div>
  );
}
