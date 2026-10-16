/**
 * Las conexiones del lab de IA y la bandeja de fuentes, compartidas entre
 * la música y la imagen: la misma mecánica, apuntada a otro lado.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import {
  COLOR_GRUPO,
  fuente,
  fuentesDe,
  leerArchivoDatos,
  NOMBRE_CANTIDAD,
  nuevaConexion,
} from '../estado/musica';
import type { Conexion } from '../estado/tipos';
import { Onda } from './VozEscena';

export type ListaClave = 'conexiones' | 'conexionesVisual';

interface Destino {
  clave: string;
  etiqueta: string;
}

/** Crea una conexión desde una fuente hacia el primer destino que no esté usado. */
export function conectar(lista: Conexion[], destinos: Destino[], fuenteClave: string): Conexion {
  const usados = new Set(lista.map((c) => c.destino));
  const libre = destinos.find((d) => !usados.has(d.clave)) ?? destinos[0];
  return nuevaConexion(fuenteClave, libre.clave);
}

interface PropsLista {
  clave: ListaClave;
  destinos: Destino[];
  frase: (c: Conexion) => string;
}

export function ListaConexiones({ clave, destinos, frase }: PropsLista) {
  const { proyecto, actualizar } = useProyecto();
  const [abierto, setAbierto] = useState<{ id: string; punta: 'fuente' | 'destino' } | null>(null);
  const fuentes = fuentesDe(proyecto);
  const lista = proyecto[clave];

  const cambiar = (id: string, receta: (c: Conexion) => void) =>
    actualizar((p) => {
      const c = p[clave].find((x) => x.id === id);
      if (c) receta(c);
    });

  const colorFuente = (k: string) => COLOR_GRUPO[fuente(proyecto, k)?.grupo ?? 'relato'];
  const alternar = (id: string, punta: 'fuente' | 'destino') =>
    setAbierto(abierto?.id === id && abierto.punta === punta ? null : { id, punta });

  return (
    <div className="nv-conexiones" onClick={() => setAbierto(null)}>
      {lista.length === 0 && (
        <p className="nv-tenue nv-italica">Todavía no hay conexiones. Toca una fuente para crear una.</p>
      )}
      {lista.map((c) => {
        const f = fuente(proyecto, c.fuente);
        const d = destinos.find((x) => x.clave === c.destino);
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
                    alternar(c.id, 'fuente');
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
                    alternar(c.id, 'destino');
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
                onClick={() => actualizar((p) => (p[clave] = p[clave].filter((x) => x.id !== c.id)))}
              >
                ×
              </button>
            </div>
            <span className="nv-tenue nv-italica nv-chico">{frase(c)}</span>
          </div>
        );
      })}
      <button
        type="button"
        className="nv-conectar"
        onClick={() => actualizar((p) => p[clave].push(conectar(p[clave], destinos, 'emocion')))}
      >
        +  Conectar
      </button>
    </div>
  );
}

/** Las fuentes de datos: del relato, del sonido y de los archivos subidos. */
export function BandejaFuentes({ alConectar }: { alConectar: (fuenteClave: string) => void }) {
  const { proyecto, actualizar } = useProyecto();
  const [leyendo, setLeyendo] = useState(false);
  const fuentes = fuentesDe(proyecto);

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
                  onClick={() => alConectar(f.clave)}
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
          <button key={a.id} type="button" className="nv-archivo" onClick={() => alConectar(`archivo:${a.id}`)}>
            <span className="nv-archivo__onda">
              {a.colores ? (
                <span className="nv-muestras">
                  {a.colores.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
              ) : (
                <Onda semilla={a.id} color={COLOR_GRUPO.archivo} barras={18} />
              )}
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
      <span className="nv-tenue nv-chico nv-italica">Del archivo no se usa el sonido ni la foto: se le sacan datos.</span>
    </>
  );
}
