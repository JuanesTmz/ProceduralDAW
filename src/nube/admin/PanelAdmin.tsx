// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El panel de administración. Se abre desde la misma entrada que los equipos:
 * con el nombre «Admin» y la contraseña del panel, en vez de la app.
 *
 * Tres pestañas:
 * - Equipos: crear, editar y borrar equipos; ver en vivo quién está conectado
 *   y dónde; abrir el proyecto de un equipo para mirarlo en tiempo real;
 *   guardar y restaurar versiones; soltar bloqueos atascados; descargar la
 *   copia y el video final; cerrar y abrir la edición.
 * - Galería: los videos finales que los equipos mandan desde Función.
 * - Admins: las cuentas que entran al panel (además de «Admin», la maestra).
 *
 * Lo vivo se pregunta al servidor cada 2 s.
 */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { descargarCopia } from '../copias';
import type { Proyecto } from '../../estado/tipos';
import '../../estilos/panel.css';

interface Equipo {
  id: number;
  nombre: string;
  congelado: boolean;
  creado: string;
}

interface Presente {
  nombre: string;
  color: string;
  lugar: { paso: string; escena?: string | null; pestana?: string } | null;
  ventana: string | null;
}

interface SalaViva {
  equipoId: number;
  congelado: boolean;
  personas: Presente[];
  bloqueos: { clave: string; nombre: string; color: string; tipo: string }[];
  escenas: Record<string, string>;
  mirando: number;
}

interface Video {
  id: string;
  equipoId: number;
  equipo: string;
  bytes: number;
  persona: string | null;
  creado: string;
}

interface Admin {
  id: number;
  nombre: string;
  creado: string;
}

interface Version {
  id: string;
  version: number;
  motivo: string;
  fecha: string;
}

type Hacer = (accion: () => Promise<unknown>, listo?: string) => Promise<unknown>;

const CADA = 2_000;

async function pedir<T>(metodo: string, ruta: string, cuerpo?: object): Promise<T> {
  const r = await fetch(`/api/admin/${ruta}`, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error ?? 'Algo falló.'), { estado: r.status });
  return datos as T;
}

const PASOS: Record<string, string> = { historia: 'Historia', voz: 'Voz', escenas: 'Escenas', funcion: 'Función' };
const VENTANAS: Record<string, string> = { golpes: 'Golpes', pad: 'Pad', notas: 'Notas', sonidos: 'Sonidos', datos: 'Datos' };
const MOTIVOS: Record<string, string> = {
  automatica: 'Automática',
  panel: 'Guardada desde el panel',
  'antes-de-restaurar': 'Antes de restaurar',
  restaurada: 'Restaurada',
  'plan-c': 'Del plan C',
};

const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
const megas = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const nombreArchivo = (equipo: string) => `sonora-${equipo.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.webm`;
const urlVideo = (v: Video, descargar = false) =>
  `/api/videos/${v.id}${descargar ? `?descargar=${encodeURIComponent(nombreArchivo(v.equipo))}` : ''}`;

/** «Escenas · 2 · La subida · Música · Golpes» */
function dondeEsta(p: Presente, escenas: Record<string, string>): string {
  if (!p.lugar) return 'Entrando…';
  const partes = [PASOS[p.lugar.paso] ?? p.lugar.paso];
  if (p.lugar.escena) partes.push(p.lugar.escena === 'general' ? 'General' : escenas[p.lugar.escena] ?? 'una escena');
  if (p.lugar.pestana) partes.push(p.lugar.pestana === 'musica' ? 'Música' : 'Visuales');
  if (p.ventana) partes.push(VENTANAS[p.ventana.split(':')[0]] ?? p.ventana);
  return partes.join(' · ');
}

export function PanelAdmin({ alSalir }: { alSalir: () => void }) {
  const [pestana, setPestana] = useState<'equipos' | 'galeria' | 'admins'>('equipos');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [yo, setYo] = useState<{ id: number | null; nombre: string } | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [salas, setSalas] = useState<SalaViva[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    try {
      const r = await pedir<{
        equipos: Equipo[];
        salas: SalaViva[];
        videos: Video[];
        admins: Admin[];
        yo: { id: number | null; nombre: string };
      }>('GET', 'estado');
      setAdmins(r.admins);
      setYo(r.yo);
      setEquipos(r.equipos);
      setSalas(r.salas);
      setVideos(r.videos);
    } catch (e) {
      // La sesión del panel venció (o se entró como equipo en este navegador): se
      // recarga y la entrada decide qué mostrar, sin cerrar ninguna otra sesión.
      if ((e as { estado?: number }).estado === 401) window.location.reload();
    }
  }, []);

  useEffect(() => {
    void refrescar();
    const reloj = window.setInterval(() => void refrescar(), CADA);
    return () => window.clearInterval(reloj);
  }, [refrescar]);

  /** Corre una acción del panel, avisa cómo salió y refresca. */
  const hacer: Hacer = (accion, listo) =>
    accion()
      .then(() => {
        if (listo) setAviso(listo);
        return refrescar();
      })
      .catch((e: Error) => setAviso(e.message));

  const todosCerrados = equipos.length > 0 && equipos.every((e) => e.congelado);
  const conectados = salas.reduce((n, s) => n + s.personas.length, 0);

  return (
    <div className="nv pa">
      <header className="nv-barra pa-barra">
        <span className="nv-logo">SONORA</span>
        <nav className="nv-pasos" aria-label="Panel">
          <button type="button" className={`nv-paso ${pestana === 'equipos' ? 'nv-paso--activo' : ''}`} onClick={() => setPestana('equipos')}>
            Equipos <span className="pa-cuenta">{equipos.length}</span>
          </button>
          <button type="button" className={`nv-paso ${pestana === 'galeria' ? 'nv-paso--activo' : ''}`} onClick={() => setPestana('galeria')}>
            Galería <span className="pa-cuenta">{videos.length}</span>
          </button>
          <button type="button" className={`nv-paso ${pestana === 'admins' ? 'nv-paso--activo' : ''}`} onClick={() => setPestana('admins')}>
            Admins <span className="pa-cuenta">{admins.length + 1}</span>
          </button>
        </nav>
        <span className="nv-espacio" />
        {yo && <span className="nv-tenue nv-chico">Entraste como {yo.nombre}</span>}
        <span className="nu-guardado nu-guardado--en-vivo">
          {conectados} conectado{conectados === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          className={`nv-boton nv-boton--chico ${todosCerrados ? '' : 'nv-boton--peligro'}`}
          onClick={() =>
            void hacer(
              () => pedir('POST', 'congelar', { valor: !todosCerrados }),
              todosCerrados ? 'Edición abierta para todos.' : 'Edición cerrada para todos.',
            )
          }
        >
          {todosCerrados ? 'Abrir la edición a todos' : 'Cerrar la edición a todos'}
        </button>
        <button type="button" className="nv-boton nv-boton--chico" onClick={alSalir}>
          Salir
        </button>
      </header>

      {aviso && (
        <p className="pa-aviso" role="status">
          {aviso}
          <button type="button" className="nv-enlace nv-chico" onClick={() => setAviso(null)}>
            ✕
          </button>
        </p>
      )}

      {pestana === 'equipos' ? (
        <main className="pa-cuerpo">
          <NuevoEquipo hacer={hacer} />
          <section className="pa-equipos">
            {equipos.length === 0 && <p className="nv-sub">Todavía no hay equipos: crea el primero a la izquierda.</p>}
            {equipos.map((e) => (
              <TarjetaEquipo
                key={e.id}
                equipo={e}
                sala={salas.find((s) => s.equipoId === e.id) ?? null}
                video={videos.find((v) => v.equipoId === e.id) ?? null}
                hacer={hacer}
              />
            ))}
          </section>
        </main>
      ) : pestana === 'galeria' ? (
        <Galeria videos={videos} hacer={hacer} />
      ) : (
        <Admins admins={admins} yo={yo} hacer={hacer} />
      )}
    </div>
  );
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <label className="nu-campo">
      <span className="nv-etiqueta nv-tenue">{titulo}</span>
      {children}
    </label>
  );
}

function NuevoEquipo({ hacer }: { hacer: Hacer }) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const crear = (ev: FormEvent) => {
    ev.preventDefault();
    void hacer(async () => {
      await pedir('POST', 'equipos', { nombre, clave });
      setNombre('');
      setClave('');
    }, `Equipo «${nombre.trim()}» creado.`);
  };
  return (
    <aside className="nv-tarjeta pa-lado">
      <h2 className="pa-titulo">Equipo nuevo</h2>
      <p className="nv-sub nv-chico">
        Los equipos entran con este nombre (da igual si lo escriben con mayúsculas, minúsculas o sin tildes) y esta contraseña.
      </p>
      <form className="nu-formulario" onSubmit={crear}>
        <Campo titulo="Nombre del equipo">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
        </Campo>
        <Campo titulo="Contraseña (4 caracteres o más)">
          <input value={clave} onChange={(e) => setClave(e.target.value)} maxLength={64} autoComplete="off" />
        </Campo>
        <button type="submit" className="nv-boton nv-boton--primario" disabled={!nombre.trim() || clave.length < 4}>
          Crear equipo
        </button>
      </form>
    </aside>
  );
}

function TarjetaEquipo({
  equipo,
  sala,
  video,
  hacer,
}: {
  equipo: Equipo;
  sala: SalaViva | null;
  video: Video | null;
  hacer: Hacer;
}) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(equipo.nombre);
  const [clave, setClave] = useState('');
  const [borrando, setBorrando] = useState(false);
  const [versiones, setVersiones] = useState<Version[] | null>(null);
  const [porRestaurar, setPorRestaurar] = useState<string | null>(null);
  const ruta = `equipos/${equipo.id}`;
  const verVersiones = () => void pedir<{ versiones: Version[] }>('GET', `${ruta}/versiones`).then((r) => setVersiones(r.versiones));
  const personas = sala?.personas ?? [];

  return (
    <article className={`nv-tarjeta pa-equipo ${equipo.congelado ? 'pa-equipo--congelado' : ''}`}>
      <div className="pa-equipo__cabeza">
        <strong className="pa-equipo__nombre">{equipo.nombre}</strong>
        <span className="nv-tenue nv-chico">desde {fecha(equipo.creado)}</span>
        <span className="nv-espacio" />
        {equipo.congelado && <span className="nu-cerrado">Edición cerrada</span>}
      </div>

      {editando && (
        <form
          className="pa-editar"
          onSubmit={(ev) => {
            ev.preventDefault();
            void hacer(async () => {
              await pedir('PUT', ruta, { nombre, clave });
              setEditando(false);
              setClave('');
            }, `Equipo «${nombre.trim()}» actualizado.`);
          }}
        >
          <Campo titulo="Nombre">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          </Campo>
          <Campo titulo="Contraseña nueva (vacía: no cambia)">
            <input value={clave} onChange={(e) => setClave(e.target.value)} maxLength={64} autoComplete="off" />
          </Campo>
          <div className="pa-acciones">
            <button type="submit" className="nv-boton nv-boton--chico nv-boton--primario" disabled={!nombre.trim() || (clave.length > 0 && clave.length < 4)}>
              Guardar
            </button>
            <button type="button" className="nv-boton nv-boton--chico" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="pa-personas">
        {personas.length === 0 ? (
          <span className="nv-tenue nv-chico">Nadie conectado{sala?.mirando ? ' (el panel está mirando)' : ''}.</span>
        ) : (
          personas.map((p, i) => (
            <span key={i} className="pa-persona">
              <span className="nu-avatar nu-avatar--mini" style={{ background: p.color }}>
                {p.nombre.charAt(0).toUpperCase()}
              </span>
              <strong>{p.nombre}</strong>
              <span className="nv-tenue nv-chico">{dondeEsta(p, sala?.escenas ?? {})}</span>
            </span>
          ))
        )}
      </div>

      {sala && sala.bloqueos.length > 0 && (
        <div className="pa-bloqueos">
          <span className="nv-etiqueta nv-tenue">Piezas tomadas</span>
          {sala.bloqueos.map((b) => (
            <span key={b.clave} className="pa-bloqueo">
              <span className="nv-punto" style={{ background: b.color }} />
              {b.nombre} · <code>{b.clave}</code>
              <button
                type="button"
                className="nv-enlace nv-chico"
                onClick={() => void hacer(() => pedir('POST', `${ruta}/soltar`, { clave: b.clave }), 'Pieza soltada.')}
              >
                Soltar
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="pa-video">
        <span className="nv-etiqueta nv-tenue">Video final</span>
        {video ? (
          <>
            <span className="nv-chico">
              {fecha(video.creado)} · {megas(video.bytes)}
              {video.persona ? ` · lo mandó ${video.persona}` : ''}
            </span>
            <a className="nv-boton nv-boton--chico" href={urlVideo(video)} target="_blank" rel="noreferrer">
              Ver ↗
            </a>
            <a className="nv-boton nv-boton--chico" href={urlVideo(video, true)}>
              ⤓ Descargar
            </a>
          </>
        ) : (
          <span className="nv-tenue nv-chico">Todavía no lo mandan (se manda desde Función).</span>
        )}
      </div>

      <div className="pa-acciones">
        <a className="nv-boton nv-boton--chico" href={`/?ver=${equipo.id}`} target="_blank" rel="noreferrer">
          Ver en vivo ↗
        </a>
        <button
          type="button"
          className="nv-boton nv-boton--chico"
          onClick={() => {
            setNombre(equipo.nombre);
            setEditando((x) => !x);
          }}
        >
          Editar
        </button>
        <button
          type="button"
          className="nv-boton nv-boton--chico"
          onClick={() =>
            void hacer(async () => {
              const r = await pedir<{ proyecto: Proyecto | null }>('GET', `${ruta}/proyecto`);
              if (!r.proyecto) throw new Error(`${equipo.nombre} todavía no tiene proyecto.`);
              const { faltan } = await descargarCopia(r.proyecto, equipo.nombre);
              if (faltan) throw new Error(`Copia descargada, sin ${faltan} archivo(s) que no se pudieron leer.`);
            }, `Copia de ${equipo.nombre} descargada.`)
          }
        >
          Descargar copia
        </button>
        <button type="button" className="nv-boton nv-boton--chico" onClick={() => (versiones ? setVersiones(null) : verVersiones())}>
          {versiones ? 'Ocultar versiones' : 'Versiones'}
        </button>
        <span className="nv-espacio" />
        <button
          type="button"
          className={`nv-boton nv-boton--chico ${equipo.congelado ? '' : 'nv-boton--peligro'}`}
          onClick={() => void hacer(() => pedir('POST', `${ruta}/congelar`, { valor: !equipo.congelado }))}
        >
          {equipo.congelado ? 'Abrir edición' : 'Cerrar edición'}
        </button>
        <button type="button" className="nv-boton nv-boton--chico nv-boton--peligro" onClick={() => setBorrando(true)}>
          Eliminar
        </button>
      </div>

      {borrando && (
        <div className="nu-menu__confirmar pa-confirmar">
          <span>
            ¿Eliminar «{equipo.nombre}»? Se borran su proyecto, sus versiones, sus grabaciones y sus videos. No se puede deshacer.
          </span>
          <button
            type="button"
            className="nv-boton nv-boton--chico nv-boton--rojo"
            onClick={() => {
              setBorrando(false);
              void hacer(() => pedir('DELETE', ruta), `Equipo «${equipo.nombre}» eliminado.`);
            }}
          >
            Sí, eliminar
          </button>
          <button type="button" className="nv-boton nv-boton--chico" onClick={() => setBorrando(false)}>
            Cancelar
          </button>
        </div>
      )}

      {versiones && (
        <div className="pa-versiones">
          <div className="nv-campo__fila">
            <span className="nv-etiqueta nv-tenue">Versiones guardadas</span>
            <span className="nv-espacio" />
            <button
              type="button"
              className="nv-boton nv-boton--chico"
              onClick={() => void hacer(() => pedir('POST', `${ruta}/versiones`), 'Versión guardada.').then(verVersiones)}
            >
              Guardar versión ahora
            </button>
          </div>
          {versiones.length === 0 && <span className="nv-tenue nv-chico">Aún no hay versiones.</span>}
          {versiones.map((v) => (
            <div key={v.id} className="pa-version">
              <span className="nv-mono">{fecha(v.fecha)}</span>
              <span className="nv-tenue nv-chico">{MOTIVOS[v.motivo] ?? v.motivo}</span>
              <span className="nv-espacio" />
              {porRestaurar === v.id ? (
                <>
                  <span className="nv-chico">¿Volver a esta versión? Llega en vivo a las tablets.</span>
                  <button
                    type="button"
                    className="nv-boton nv-boton--chico nv-boton--primario"
                    onClick={() => {
                      setPorRestaurar(null);
                      void hacer(() => pedir('POST', `${ruta}/restaurar`, { version: v.id }), 'Versión restaurada.').then(verVersiones);
                    }}
                  >
                    Sí, restaurar
                  </button>
                  <button type="button" className="nv-boton nv-boton--chico" onClick={() => setPorRestaurar(null)}>
                    No
                  </button>
                </>
              ) : (
                <button type="button" className="nv-enlace nv-chico" onClick={() => setPorRestaurar(v.id)}>
                  Restaurar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Galeria({ videos, hacer }: { videos: Video[]; hacer: Hacer }) {
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  if (videos.length === 0) {
    return (
      <main className="pa-galeria pa-galeria--vacia">
        <p className="nv-sub">Todavía no llegan videos. Cada equipo manda el suyo desde Función → «Exportar video» → «Enviar a la galería».</p>
      </main>
    );
  }
  return (
    <main className="pa-galeria">
      {videos.map((v) => (
        <article key={v.id} className="nv-tarjeta pa-obra">
          <video className="pa-obra__video" src={urlVideo(v)} controls preload="metadata" playsInline />
          <div className="pa-obra__pie">
            <strong>{v.equipo}</strong>
            <span className="nv-tenue nv-chico">
              {fecha(v.creado)} · {megas(v.bytes)}
              {v.persona ? ` · ${v.persona}` : ''}
            </span>
          </div>
          <div className="pa-acciones">
            <a className="nv-boton nv-boton--chico" href={urlVideo(v, true)}>
              ⤓ Descargar
            </a>
            <span className="nv-espacio" />
            {porBorrar === v.id ? (
              <>
                <button
                  type="button"
                  className="nv-boton nv-boton--chico nv-boton--rojo"
                  onClick={() => {
                    setPorBorrar(null);
                    void hacer(() => pedir('DELETE', `videos/${v.id}`), 'Video eliminado.');
                  }}
                >
                  Sí, eliminar
                </button>
                <button type="button" className="nv-boton nv-boton--chico" onClick={() => setPorBorrar(null)}>
                  No
                </button>
              </>
            ) : (
              <button type="button" className="nv-enlace nv-chico" onClick={() => setPorBorrar(v.id)}>
                Eliminar
              </button>
            )}
          </div>
        </article>
      ))}
    </main>
  );
}

function Admins({ admins, yo, hacer }: { admins: Admin[]; yo: { id: number | null } | null; hacer: Hacer }) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  return (
    <main className="pa-cuerpo">
      <aside className="nv-tarjeta pa-lado">
        <h2 className="pa-titulo">Admin nuevo</h2>
        <p className="nv-sub nv-chico">
          Entra por la misma pantalla que los equipos, con este nombre y esta contraseña, y ve este panel. El nombre no puede ser
          el de un equipo.
        </p>
        <form
          className="nu-formulario"
          onSubmit={(ev) => {
            ev.preventDefault();
            void hacer(async () => {
              await pedir('POST', 'admins', { nombre, clave });
              setNombre('');
              setClave('');
            }, `Admin «${nombre.trim()}» creado.`);
          }}
        >
          <Campo titulo="Nombre">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          </Campo>
          <Campo titulo="Contraseña (4 caracteres o más)">
            <input value={clave} onChange={(e) => setClave(e.target.value)} maxLength={64} autoComplete="off" />
          </Campo>
          <button type="submit" className="nv-boton nv-boton--primario" disabled={!nombre.trim() || clave.length < 4}>
            Crear admin
          </button>
        </form>
      </aside>
      <section className="pa-equipos">
        <article className="nv-tarjeta pa-equipo">
          <div className="pa-equipo__cabeza">
            <strong className="pa-equipo__nombre">Admin</strong>
            <span className="nv-tenue nv-chico">cuenta maestra{yo?.id === null ? ' · eres tú' : ''}</span>
          </div>
          <span className="nv-tenue nv-chico">
            Su contraseña es el secreto admin-clave de Azure (ver server/README.md). No se puede borrar: así nunca te quedas
            afuera.
          </span>
        </article>
        {admins.map((a) => (
          <TarjetaAdmin key={a.id} admin={a} esYo={yo?.id === a.id} hacer={hacer} />
        ))}
      </section>
    </main>
  );
}

function TarjetaAdmin({ admin, esYo, hacer }: { admin: Admin; esYo: boolean; hacer: Hacer }) {
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [nombre, setNombre] = useState(admin.nombre);
  const [clave, setClave] = useState('');
  const ruta = `admins/${admin.id}`;
  return (
    <article className="nv-tarjeta pa-equipo">
      <div className="pa-equipo__cabeza">
        <strong className="pa-equipo__nombre">{admin.nombre}</strong>
        <span className="nv-tenue nv-chico">
          desde {fecha(admin.creado)}
          {esYo ? ' · eres tú' : ''}
        </span>
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-boton nv-boton--chico"
          onClick={() => {
            setNombre(admin.nombre);
            setEditando((x) => !x);
          }}
        >
          Editar
        </button>
        <button type="button" className="nv-boton nv-boton--chico nv-boton--peligro" onClick={() => setBorrando(true)}>
          Eliminar
        </button>
      </div>
      {editando && (
        <form
          className="pa-editar"
          onSubmit={(ev) => {
            ev.preventDefault();
            void hacer(async () => {
              await pedir('PUT', ruta, { nombre, clave });
              setEditando(false);
              setClave('');
            }, `Admin «${nombre.trim()}» actualizado.`);
          }}
        >
          <Campo titulo="Nombre">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          </Campo>
          <Campo titulo="Contraseña nueva (vacía: no cambia)">
            <input value={clave} onChange={(e) => setClave(e.target.value)} maxLength={64} autoComplete="off" />
          </Campo>
          <div className="pa-acciones">
            <button type="submit" className="nv-boton nv-boton--chico nv-boton--primario" disabled={!nombre.trim() || (clave.length > 0 && clave.length < 4)}>
              Guardar
            </button>
            <button type="button" className="nv-boton nv-boton--chico" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {borrando && (
        <div className="nu-menu__confirmar pa-confirmar">
          <span>¿Eliminar la cuenta «{admin.nombre}»?{esYo ? ' Es la tuya: saldrás del panel.' : ''}</span>
          <button
            type="button"
            className="nv-boton nv-boton--chico nv-boton--rojo"
            onClick={() => {
              setBorrando(false);
              void hacer(() => pedir('DELETE', ruta), `Admin «${admin.nombre}» eliminado.`);
            }}
          >
            Sí, eliminar
          </button>
          <button type="button" className="nv-boton nv-boton--chico" onClick={() => setBorrando(false)}>
            Cancelar
          </button>
        </div>
      )}
    </article>
  );
}
