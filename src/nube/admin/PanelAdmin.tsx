// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El panel de administración. Se abre desde la misma entrada que los equipos:
 * con el nombre «Admin» y la contraseña del panel, en vez de la app.
 *
 * Se siente como Duolingo: pestañas gordas arriba, tarjetas con sombra dura y
 * una sola cosa importante por pantalla.
 * - Calificar: las entregas por calificar son un mazo de cartas (como Tinder). La de arriba
 *   trae el video y, debajo, la calificación como una lección: un criterio a
 *   la vez. Lista, la carta sale a la derecha; «luego», a la izquierda.
 * - Galería: todos los videos que llegan. Al abrir uno se ve en grande con la
 *   calificación al lado, para calificar o cambiar la nota que ya se puso.
 * - Equipos: crear, editar y borrar equipos; ver en vivo quién está conectado
 *   y dónde; abrir el proyecto de un equipo para mirarlo en tiempo real;
 *   guardar y restaurar versiones; soltar bloqueos atascados; descargar la
 *   copia y el video final; cerrar y abrir la edición. Lo poco frecuente va
 *   en el menú «⋯» de cada tarjeta.
 * - Ranking: el promedio de los jurados y si se muestra en la entrada.
 * - Admins: las cuentas que entran al panel (además de «Admin», la maestra).
 *
 * Todo se puede hacer desde un celular en vertical: ahí las pestañas bajan a
 * una barra fija abajo, como en la app de Duolingo.
 *
 * Lo vivo se pregunta al servidor cada 2 s.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent as EventoPuntero, ReactNode } from 'react';
import { descargarCopia } from '../copias';
import { completa, notaFinal } from '../../../server/compartido/rubrica.js';
import { Leccion, RankingAdmin, cuantos, nota5, useCalificaciones, type Calificacion, type DatosCalificar } from './Calificar';
import { Ic, type NombreIc } from './Ic';
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
  /** Ya está en MP4, con portada (el servidor lo convierte al llegar; ver server/videos.js). */
  listo?: boolean;
  /** El servidor lo está convirtiendo ahora. */
  preparando?: boolean;
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
type Pestana = 'calificar' | 'galeria' | 'equipos' | 'ranking' | 'admins';

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

const PASOS: Record<string, string> = { historia: 'Historia', voz: 'Voz', musica: 'Música', visuales: 'Visuales', escenas: 'Escenas', funcion: 'Función' };
const VENTANAS: Record<string, string> = { golpes: 'Golpes', pad: 'Pad', notas: 'Notas', sonidos: 'Sonidos', datos: 'Datos' };
const MOTIVOS: Record<string, string> = {
  automatica: 'Automática',
  panel: 'Guardada desde el panel',
  'antes-de-restaurar': 'Antes de restaurar',
  restaurada: 'Restaurada',
  'plan-c': 'Del plan C',
};

/** Un color fijo por equipo (para su avatar), sacado de los 7 de la marca. */
const MARCA = ['#ff5bff', '#35bfff', '#04ef77', '#00c8dc', '#fce905', '#b26bff', '#ff6a12'];
const colorDe = (id: number) => MARCA[id % MARCA.length];

const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
const megas = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const nombreArchivo = (equipo: string) => `sonora-${equipo.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.webm`;
/** El video (el MP4 si ya está: `mp4=1` evita que el navegador use el original que tenía guardado). */
const urlVideo = (v: Video, descargar = false) => {
  const pedido = new URLSearchParams();
  if (v.listo) pedido.set('mp4', '1');
  if (descargar) pedido.set('descargar', nombreArchivo(v.equipo));
  const q = pedido.toString();
  return `/api/videos/${v.id}${q ? `?${q}` : ''}`;
};
/** La portada (solo cuando el video ya está listo). */
const urlPortada = (v: Video) => (v.listo ? `/api/videos/${v.id}/portada` : undefined);

/** Una entrega por equipo: su video más reciente (la nota es por equipo, no por video). */
function entregasDe(videos: Video[]): Video[] {
  const ultimo = new Map<number, Video>();
  for (const v of videos) {
    const otro = ultimo.get(v.equipoId);
    if (!otro || v.creado > otro.creado) ultimo.set(v.equipoId, v);
  }
  return videos.filter((v) => ultimo.get(v.equipoId) === v);
}

/** «Escenas · 2 · La subida · Música · Golpes» */
function dondeEsta(p: Presente, escenas: Record<string, string>): string {
  if (!p.lugar) return 'Entrando…';
  const partes = [PASOS[p.lugar.paso] ?? p.lugar.paso];
  if (p.lugar.escena) partes.push(p.lugar.escena === 'general' ? 'General' : escenas[p.lugar.escena] ?? 'una escena');
  if (p.lugar.pestana && p.lugar.paso === 'escenas') partes.push(p.lugar.pestana === 'musica' ? 'Música' : 'Visuales');
  if (p.ventana) partes.push(VENTANAS[p.ventana.split(':')[0]] ?? p.ventana);
  return partes.join(' · ');
}

const PESTANAS: { id: Pestana; icono: NombreIc; nombre: string }[] = [
  { id: 'equipos', icono: 'equipos', nombre: 'Equipos' },
  { id: 'galeria', icono: 'galeria', nombre: 'Galería' },
  { id: 'calificar', icono: 'calificar', nombre: 'Calificar' },
  { id: 'ranking', icono: 'trofeo', nombre: 'Ranking' },
  { id: 'admins', icono: 'llave', nombre: 'Admins' },
];

export function PanelAdmin({ alSalir }: { alSalir: () => void }) {
  const [pestana, setPestana] = useState<Pestana>('equipos');
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

  // El aviso se va solo a los pocos segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 4500);
    return () => window.clearTimeout(t);
  }, [aviso]);

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
  const entregas = entregasDe(videos);
  const cuenta: Record<Pestana, number | null> = { calificar: entregas.length, galeria: videos.length, equipos: equipos.length, ranking: null, admins: admins.length + 1 };

  return (
    <div className="nv pa">
      <header className="pa-barra">
        <span className="nv-logo">SONORA</span>
        <nav className="pa-pestanas" aria-label="Panel">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pa-pestana ${pestana === p.id ? 'pa-pestana--activa' : ''}`}
              aria-current={pestana === p.id ? 'page' : undefined}
              aria-label={p.nombre}
              title={p.nombre}
              onClick={() => setPestana(p.id)}
            >
              <span className="pa-pestana__icono">
                <Ic n={p.icono} tam={22} />
              </span>
              <span className="pa-pestana__nombre">{p.nombre}</span>
              {cuenta[p.id] !== null && <span className="pa-pestana__cuenta">{cuenta[p.id]}</span>}
            </button>
          ))}
        </nav>
        <span className="nv-espacio" />
        <span className={`pa-vivo ${conectados > 0 ? 'pa-vivo--si' : ''}`} title={yo ? `Entraste como ${yo.nombre}` : undefined}>
          <span className="pa-vivo__punto" />
          {conectados} conectado{conectados === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          className={`pa-gordo pa-gordo--chico ${todosCerrados ? 'pa-gordo--verde' : 'pa-gordo--rojo'}`}
          onClick={() =>
            void hacer(
              () => pedir('POST', 'congelar', { valor: !todosCerrados }),
              todosCerrados ? 'Edición abierta para todos.' : 'Edición cerrada para todos.',
            )
          }
          title={todosCerrados ? 'Los equipos vuelven a poder editar' : 'Nadie puede editar hasta que la abras'}
        >
          <Ic n={todosCerrados ? 'candadoAbierto' : 'candado'} tam={16} />
          <span className="pa-solo-ancho">{todosCerrados ? 'Abrir la edición' : 'Cerrar la edición'}</span>
        </button>
        <button type="button" className="pa-salir" onClick={alSalir} title={yo ? `Salir (${yo.nombre})` : 'Salir'} aria-label="Salir">
          <Ic n="salir" tam={18} />
        </button>
      </header>

      {aviso && (
        <p className="pa-aviso" role="status">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            <Ic n="cerrar" tam={14} />
          </button>
        </p>
      )}

      {pestana === 'calificar' ? (
        <Mazo videos={entregas} hacer={hacer} alRanking={() => setPestana('ranking')} />
      ) : pestana === 'galeria' ? (
        <Galeria videos={videos} hacer={hacer} />
      ) : pestana === 'equipos' ? (
        <Equipos equipos={equipos} salas={salas} videos={entregas} hacer={hacer} />
      ) : pestana === 'ranking' ? (
        <RankingAdmin equipos={equipos} />
      ) : (
        <Admins admins={admins} yo={yo} hacer={hacer} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- piezas comunes

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <label className="nu-campo">
      <span className="nv-etiqueta nv-tenue">{titulo}</span>
      {children}
    </label>
  );
}

/** El título de una pestaña, con su botón grande a la derecha. */
function Cabeza({ icono, titulo, sub, children }: { icono: NombreIc; titulo: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="pa-cabeza">
      <span className="pa-cabeza__icono">
        <Ic n={icono} tam={28} />
      </span>
      <div className="pa-cabeza__texto">
        <h1 className="pa-cabeza__titulo">{titulo}</h1>
        {sub && <p className="pa-cabeza__sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/** El menú «⋯» de una tarjeta: las acciones que no se usan a cada rato. Se cierra al tocar fuera. */
function Menu({ children }: { children: (cerrar: () => void) => ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('pointerdown', fuera);
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('pointerdown', fuera);
      window.removeEventListener('keydown', tecla);
    };
  }, [abierto]);
  return (
    <div className="pa-menu" ref={caja}>
      <button type="button" className="pa-menu__boton" aria-expanded={abierto} aria-label="Más acciones" onClick={() => setAbierto((x) => !x)}>
        <Ic n="menu" tam={20} />
      </button>
      {abierto && (
        <div className="pa-menu__lista" role="menu">
          {children(() => setAbierto(false))}
        </div>
      )}
    </div>
  );
}

/** Pedir confirmación antes de algo que no se deshace. */
function Confirmar({ texto, si, alSi, alNo }: { texto: string; si: string; alSi: () => void; alNo: () => void }) {
  return (
    <div className="pa-confirmar">
      <span>{texto}</span>
      <div className="pa-confirmar__botones">
        <button type="button" className="pa-gordo pa-gordo--chico pa-gordo--rojo" onClick={alSi}>
          {si}
        </button>
        <button type="button" className="pa-gordo pa-gordo--chico" onClick={alNo}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- la obra entregada

/**
 * Lo que llega a los jurados: la obra del equipo tal como estaba cuando
 * mandó su video, tocándose con el motor de la app (`/?entrega=<video>`).
 * Se ve tan fluida y nítida como en Función. El video mismo se puede
 * descargar desde el menú «⋯».
 */
function Pantalla({ video, clase }: { video: Video; clase: string }) {
  return (
    <iframe
      key={video.id}
      className={`${clase} pa-obra-viva`}
      src={`/?entrega=${video.id}`}
      title={`La obra de ${video.equipo}`}
      allow="autoplay; fullscreen"
    />
  );
}

// ---------------------------------------------------------------- Calificar: el mazo

/** Cuánto hay que arrastrar la carta para que se vaya. */
const UMBRAL = 120;

/**
 * Las entregas como un mazo de cartas. Arriba, la que toca: su video y, debajo,
 * la lección para calificarla. Se arrastra a la izquierda («luego»: va al
 * fondo del mazo) o, ya calificada, a la derecha («lista»: sale con su nota).
 * Las calificadas por este jurado salen del mazo; «Todas» deja volver a una.
 */
function Mazo({ videos, hacer, alRanking }: { videos: Video[]; hacer: Hacer; alRanking: () => void }) {
  const { datos, refrescar } = useCalificaciones();
  /** Las que se dejaron para luego, en el orden en que se dejaron. */
  const [luego, setLuego] = useState<string[]>([]);
  /** Una carta que se trajo a mano desde «Todas» (aunque ya esté calificada). */
  const [encima, setEncima] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState<{ id: string; lado: 'izq' | 'der'; nota: number | null } | null>(null);
  const [dx, setDx] = useState(0);
  const [sacude, setSacude] = useState(false);
  const [lista, setLista] = useState(false);
  const [porBorrar, setPorBorrar] = useState(false);
  const [listos, setListos] = useState(0);
  const arrastre = useRef<{ x: number; id: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const mia = useCallback(
    (equipoId: number): Calificacion | null => datos?.calificaciones.find((c) => c.equipoId === equipoId && c.juez === datos.yo) ?? null,
    [datos],
  );
  const hecha = (v: Video) => completa(mia(v.equipoId)?.notas ?? {});

  // El mazo: primero las que faltan (en su orden), al fondo las de «luego».
  const pendientes = videos.filter((v) => !hecha(v));
  const cola = [...pendientes.filter((v) => !luego.includes(v.id)), ...luego.map((id) => pendientes.find((v) => v.id === id)).filter((v): v is Video => !!v)];
  const traida = encima ? videos.find((v) => v.id === encima) : undefined;
  const mazo = traida ? [traida, ...cola.filter((v) => v.id !== traida.id)] : cola;
  const arriba = mazo[0];
  const hechas = videos.length - pendientes.length;

  const alCambiar = useCallback((n: number) => setListos(n), []);
  const nombre = arriba?.equipo ?? '';

  /** La carta de arriba se va: a la izquierda (luego) o a la derecha (lista). */
  const soltar = (lado: 'izq' | 'der') => {
    if (!arriba || saliendo) return;
    if (lado === 'der' && listos < 7) {
      // Todavía no está completa: la carta vuelve y se sacude.
      setDx(0);
      setSacude(true);
      window.setTimeout(() => setSacude(false), 450);
      return;
    }
    const final = lado === 'der' ? notaFinal(mia(arriba.equipoId)?.notas ?? {}) : null;
    setSaliendo({ id: arriba.id, lado, nota: final });
    window.setTimeout(() => {
      if (lado === 'izq') setLuego((l) => [...l.filter((id) => id !== arriba.id), arriba.id]);
      else setLuego((l) => l.filter((id) => id !== arriba.id));
      setEncima(null);
      setSaliendo(null);
      setDx(0);
      setPorBorrar(false);
    }, 380);
  };

  const alBajar = (e: EventoPuntero<HTMLDivElement>) => {
    // El video se toca normal (play, barra): solo se arrastra desde el resto de la carta.
    if ((e.target as HTMLElement).closest('video, button, a')) return;
    arrastre.current = { x: e.clientX, id: e.pointerId };
    setArrastrando(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const alMover = (e: EventoPuntero<HTMLDivElement>) => {
    if (arrastre.current?.id === e.pointerId) setDx(e.clientX - arrastre.current.x);
  };
  const alSoltar = () => {
    if (!arrastre.current) return;
    arrastre.current = null;
    setArrastrando(false);
    if (dx > UMBRAL) soltar('der');
    else if (dx < -UMBRAL) soltar('izq');
    else setDx(0);
  };

  if (videos.length === 0) {
    return (
      <main className="mz-vacio">
        <span className="mz-vacio__icono">
          <Ic n="bandeja" tam={64} />
        </span>
        <h2>Todavía no llegan entregas</h2>
        <p>Cada equipo manda su video desde Función → «Exportar video» → «Enviar a la galería». Aquí aparecen como un mazo de cartas.</p>
      </main>
    );
  }

  const todas = (
    <div className="mz-todas">
      <button type="button" className="mz-hechas" onClick={() => setLista((x) => !x)} aria-expanded={lista}>
        <Ic n="estrella" tam={17} className="mz-hechas__estrella" />
        {hechas} de {videos.length} calificadas
        <Ic n="flecha" tam={11} className="mz-hechas__flecha" />
      </button>
      {lista && (
        <div className="mz-todas__lista" role="menu">
          {videos.map((v) => {
            const suya = mia(v.equipoId);
            const final = suya ? notaFinal(suya.notas) : null;
            return (
              <button
                key={v.id}
                type="button"
                className={`mz-todas__una ${v.id === arriba?.id ? 'mz-todas__una--arriba' : ''}`}
                onClick={() => {
                  setEncima(v.id);
                  setLista(false);
                }}
              >
                <span className="mz-avatar" style={{ '--c': colorDe(v.equipoId) } as CSSProperties}>
                  {v.equipo.charAt(0).toUpperCase()}
                </span>
                <strong>{v.equipo}</strong>
                <span className="nv-espacio" />
                {final !== null ? (
                  <span className="mz-todas__nota">
                    <Ic n="estrella" tam={13} /> {nota5(final)}
                  </span>
                ) : (
                  <span className="mz-todas__falta">{suya && cuantos(suya.notas) > 0 ? `${cuantos(suya.notas)}/7` : 'sin calificar'}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!arriba) {
    return (
      <main className="mz mz--fin">
        {todas}
        <div className="mz-fin">
          <span className="mz-fin__icono">
            <Ic n="fiesta" tam={64} />
          </span>
          <h2>{videos.length === 1 ? '¡Calificaste la entrega!' : `¡Calificaste las ${videos.length} entregas!`}</h2>
          <p>Puedes volver a cualquiera desde «{hechas} de {videos.length} calificadas», arriba.</p>
          <button type="button" className="pa-gordo pa-gordo--grande pa-gordo--oro" onClick={alRanking}>
            <Ic n="trofeo" tam={20} /> Ver el ranking
          </button>
        </div>
      </main>
    );
  }

  const mueve = saliendo?.id === arriba.id ? undefined : dx;
  const giro = (mueve ?? 0) / 18;
  const estiloCarta: CSSProperties =
    saliendo?.id === arriba.id
      ? {}
      : { transform: `translateX(${dx}px) rotate(${giro}deg)`, transition: arrastrando ? 'none' : undefined };

  return (
    <main className="mz">
      {datos ? (
        <Leccion
          key={arriba.equipoId}
          equipoId={arriba.equipoId}
          equipo={nombre}
          mia={mia(arriba.equipoId)}
          otras={datos.calificaciones.filter((c) => c.equipoId === arriba.equipoId && c.juez !== datos.yo)}
          alGuardar={refrescar}
          alTerminar={() => soltar('der')}
          alCambiar={alCambiar}
        />
      ) : (
        <p className="mz-cargando">Cargando las calificaciones…</p>
      )}
      {todas}

      <section className="mz-mesa">
        <button type="button" className="mz-lado mz-lado--izq" onClick={() => soltar('izq')} title="Dejarla para después: va al fondo del mazo">
          <span className="mz-lado__circulo">
            <Ic n="luego" tam={26} />
          </span>
          Luego
        </button>

        <div className="mz-pila">
          {mazo.slice(1, 3).map((v, i) => (
            <div key={v.id} className={`mz-carta mz-carta--atras mz-carta--atras-${i + 1}`} aria-hidden>
              <span className="mz-carta__fantasma">{v.equipo}</span>
            </div>
          ))}
          <div
            key={arriba.id}
            className={`mz-carta ${saliendo?.id === arriba.id ? `mz-carta--sale-${saliendo.lado}` : ''} ${sacude ? 'mz-carta--sacude' : ''}`}
            style={estiloCarta}
            onPointerDown={alBajar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
          >
            <Pantalla video={arriba} clase="mz-carta__video" />
            <div className="mz-carta__pie">
              <span className="mz-avatar" style={{ '--c': colorDe(arriba.equipoId) } as CSSProperties}>
                {arriba.equipo.charAt(0).toUpperCase()}
              </span>
              <div className="mz-carta__nombre">
                <strong>{arriba.equipo}</strong>
                <span>
                  {fecha(arriba.creado)}
                  {arriba.persona ? ` · lo mandó ${arriba.persona}` : ''}
                </span>
              </div>
              <span className="nv-espacio" />
              <Menu>
                {(cerrar) => (
                  <>
                    <a className="pa-menu__item" href={urlVideo(arriba, true)} onClick={cerrar}>
                      <Ic n="bajar" /> Descargar video ({megas(arriba.bytes)})
                    </a>
                    <button
                      type="button"
                      className="pa-menu__item pa-menu__item--rojo"
                      onClick={() => {
                        cerrar();
                        setPorBorrar(true);
                      }}
                    >
                      <Ic n="basura" /> Eliminar video
                    </button>
                  </>
                )}
              </Menu>
            </div>
            {porBorrar && (
              <Confirmar
                texto={`¿Eliminar el video de ${arriba.equipo}? No se puede deshacer.`}
                si="Sí, eliminar"
                alNo={() => setPorBorrar(false)}
                alSi={() => {
                  setPorBorrar(false);
                  void hacer(() => pedir('DELETE', `videos/${arriba.id}`), 'Video eliminado.');
                }}
              />
            )}
            <span className="mz-sello mz-sello--luego" style={{ opacity: Math.min(1, Math.max(0, -dx / UMBRAL)) }}>
              LUEGO
            </span>
            <span className="mz-sello mz-sello--lista" style={{ opacity: listos < 7 ? 0 : Math.min(1, Math.max(0, dx / UMBRAL)) }}>
              LISTA
            </span>
            {saliendo?.id === arriba.id && saliendo.nota !== null && <span className="mz-sello mz-sello--nota">
                <Ic n="estrella" tam={36} /> {nota5(saliendo.nota)}
              </span>}
          </div>
        </div>

        <button
          type="button"
          className={`mz-lado mz-lado--der ${listos === 7 ? 'mz-lado--lista' : ''}`}
          onClick={() => soltar('der')}
          title={listos === 7 ? 'Calificación completa: pasar al siguiente equipo' : `Faltan ${7 - listos} criterios`}
        >
          <span className="mz-lado__circulo">
            <Ic n="check" tam={26} />
          </span>
          {listos === 7 ? 'Lista' : `${listos}/7`}
        </button>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------- Galería

/**
 * Todos los videos que han llegado, en tarjetas. Cada una dice la nota que le
 * puso este jurado (o cuánto lleva). Al tocarla se abre en grande con la
 * calificación al lado: ahí se califica o se cambia la nota ya puesta.
 */
function Galeria({ videos, hacer }: { videos: Video[]; hacer: Hacer }) {
  const { datos, refrescar } = useCalificaciones();
  const [abierto, setAbierto] = useState<Video | null>(null);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const mia = (equipoId: number) => datos?.calificaciones.find((c) => c.equipoId === equipoId && c.juez === datos.yo) ?? null;

  return (
    <main className="pa-pagina">
      <Cabeza icono="galeria" titulo="Galería" sub="Todos los videos que mandan los equipos. Toca uno para verlo y poner o cambiar tu nota." />
      {videos.length === 0 ? (
        <div className="pa-nada">
          <Ic n="bandeja" tam={46} />
          <p>Todavía no llegan videos. Cada equipo manda el suyo desde Función → «Exportar video» → «Enviar a la galería».</p>
        </div>
      ) : (
        <section className="pa-rejilla">
          {videos.map((v) => {
            const suya = mia(v.equipoId);
            const final = suya ? notaFinal(suya.notas) : null;
            const llevo = suya ? cuantos(suya.notas) : 0;
            return (
              <article key={v.id} className="pa-tarjeta ga-obra" style={{ '--c': colorDe(v.equipoId) } as CSSProperties}>
                <button type="button" className="ga-obra__abrir" onClick={() => setAbierto(v)} aria-label={`Ver y calificar el video de ${v.equipo}`}>
                  {v.listo ? (
                    <img className="ga-obra__video" src={urlPortada(v)} alt="" loading="lazy" />
                  ) : (
                    // Mientras el servidor no lo ha convertido, la portada sale del video mismo.
                    <video className="ga-obra__video" src={`${urlVideo(v)}#t=0.5`} preload="metadata" muted playsInline />
                  )}
                  {v.preparando && <span className="ga-obra__preparando">Mejorando la calidad…</span>}
                  <span className="ga-obra__play">
                    <Ic n="play" tam={24} />
                  </span>
                  {final !== null && (
                    <span className="ga-obra__sello">
                      <Ic n="estrella" tam={14} /> {nota5(final)}
                    </span>
                  )}
                </button>
                <div className="pa-tarjeta__cabeza">
                  <span className="mz-avatar">{v.equipo.charAt(0).toUpperCase()}</span>
                  <div className="pa-tarjeta__nombre">
                    <strong>{v.equipo}</strong>
                    <span>
                      {fecha(v.creado)} · {megas(v.bytes)}
                      {v.persona ? ` · ${v.persona}` : ''}
                    </span>
                  </div>
                  <span className="nv-espacio" />
                  <Menu>
                    {(cerrar) => (
                      <>
                        <a className="pa-menu__item" href={urlVideo(v, true)} onClick={cerrar}>
                          <Ic n="bajar" /> Descargar video
                        </a>
                        <button
                          type="button"
                          className="pa-menu__item pa-menu__item--rojo"
                          onClick={() => {
                            cerrar();
                            setPorBorrar(v.id);
                          }}
                        >
                          <Ic n="basura" /> Eliminar video
                        </button>
                      </>
                    )}
                  </Menu>
                </div>
                {porBorrar === v.id && (
                  <Confirmar
                    texto={`¿Eliminar este video de ${v.equipo}? No se puede deshacer.`}
                    si="Sí, eliminar"
                    alNo={() => setPorBorrar(null)}
                    alSi={() => {
                      setPorBorrar(null);
                      void hacer(() => pedir('DELETE', `videos/${v.id}`), 'Video eliminado.');
                    }}
                  />
                )}
                <button
                  type="button"
                  className={`pa-gordo ${final !== null ? '' : 'pa-gordo--verde'}`}
                  onClick={() => setAbierto(v)}
                  disabled={!datos}
                >
                  <Ic n={final !== null ? 'lapiz' : 'estrella'} />
                  {final !== null ? 'Cambiar mi nota' : llevo > 0 ? `Seguir calificando · ${llevo}/7` : 'Calificar'}
                </button>
              </article>
            );
          })}
        </section>
      )}
      {abierto && datos && (
        <Visor video={abierto} datos={datos} mia={mia(abierto.equipoId)} alGuardar={refrescar} alCerrar={() => setAbierto(null)} />
      )}
    </main>
  );
}

/**
 * Un video de la galería en grande y, al lado (debajo en el celular), la
 * calificación de este jurado: la misma lección del mazo, pero aquí «Listo»
 * cierra. Lo que se cambia se guarda solo.
 */
function Visor({
  video,
  datos,
  mia,
  alGuardar,
  alCerrar,
}: {
  video: Video;
  datos: DatosCalificar;
  mia: Calificacion | null;
  alGuardar: () => Promise<void>;
  alCerrar: () => void;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', tecla);
    // Mientras está abierto, la página de atrás no se desplaza.
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = antes;
    };
  }, [alCerrar]);

  return (
    <div className="ga-visor" role="dialog" aria-modal="true" aria-label={`Video de ${video.equipo}`}>
      <header className="ga-visor__cabeza">
        <button type="button" className="pa-salir" onClick={alCerrar} aria-label="Cerrar">
          <Ic n="cerrar" tam={18} />
        </button>
        <span className="mz-avatar" style={{ '--c': colorDe(video.equipoId) } as CSSProperties}>
          {video.equipo.charAt(0).toUpperCase()}
        </span>
        <strong className="ga-visor__nombre">{video.equipo}</strong>

      </header>
      <div className="ga-visor__cuerpo">
        <Pantalla video={video} clase="ga-visor__video" />
        <div className="lc-panel">
          <Leccion
            key={video.equipoId}
            equipoId={video.equipoId}
            equipo={video.equipo}
            mia={mia}
            otras={datos.calificaciones.filter((c) => c.equipoId === video.equipoId && c.juez !== datos.yo)}
            alGuardar={alGuardar}
            alTerminar={alCerrar}
            textoListo="Listo"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Equipos

function Equipos({ equipos, salas, videos, hacer }: { equipos: Equipo[]; salas: SalaViva[]; videos: Video[]; hacer: Hacer }) {
  const [nuevo, setNuevo] = useState(false);
  const conectados = salas.reduce((n, s) => n + s.personas.length, 0);
  const entregas = new Set(videos.map((v) => v.equipoId)).size;
  return (
    <main className="pa-pagina eq">
      <div className="eq-cabeza">
        <div>
          <h1 className="eq-cabeza__titulo">Equipos</h1>
          <p className="eq-cabeza__resumen">
            {equipos.length} equipo{equipos.length === 1 ? '' : 's'} · {conectados} conectado{conectados === 1 ? '' : 's'} · {entregas} entrega
            {entregas === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="eq-boton" onClick={() => setNuevo((x) => !x)}>
          {nuevo ? 'Cancelar' : <><Ic n="mas" tam={14} /> Nuevo equipo</>}
        </button>
      </div>
      <section className="eq-rejilla">
        {nuevo && <NuevoEquipo hacer={hacer} alListo={() => setNuevo(false)} />}
        {equipos.length === 0 && !nuevo && <p className="eq-nada">Todavía no hay equipos.</p>}
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
  );
}

function NuevoEquipo({ hacer, alListo }: { hacer: Hacer; alListo: () => void }) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const crear = (ev: FormEvent) => {
    ev.preventDefault();
    void hacer(async () => {
      await pedir('POST', 'equipos', { nombre, clave });
      setNombre('');
      setClave('');
      alListo();
    }, `Equipo «${nombre.trim()}» creado.`);
  };
  return (
    <form className="eq-tarjeta eq-tarjeta--nueva" onSubmit={crear}>
      <strong className="eq-tarjeta__nombre">Equipo nuevo</strong>
      <p className="eq-nota">Entran con este nombre (da igual mayúsculas o tildes) y esta contraseña.</p>
      <Campo titulo="Nombre del equipo">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoFocus />
      </Campo>
      <Campo titulo="Contraseña (4 caracteres o más)">
        <input value={clave} onChange={(e) => setClave(e.target.value)} maxLength={64} autoComplete="off" />
      </Campo>
      <button type="submit" className="eq-boton eq-boton--lleno" disabled={!nombre.trim() || clave.length < 4}>
        Crear equipo
      </button>
    </form>
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

  const copia = () =>
    void hacer(async () => {
      const r = await pedir<{ proyecto: Proyecto | null }>('GET', `${ruta}/proyecto`);
      if (!r.proyecto) throw new Error(`${equipo.nombre} todavía no tiene proyecto.`);
      const { faltan } = await descargarCopia(r.proyecto, equipo.nombre);
      if (faltan) throw new Error(`Copia descargada, sin ${faltan} archivo(s) que no se pudieron leer.`);
    }, `Copia de ${equipo.nombre} descargada.`);

  return (
    <article className={`eq-tarjeta ${equipo.congelado ? 'eq-tarjeta--cerrada' : ''}`}>
      <div className="eq-tarjeta__cabeza">
        <strong className="eq-tarjeta__nombre" title={`Desde ${fecha(equipo.creado)}`}>
          {equipo.nombre}
        </strong>
        <Menu>
          {(cerrar) => (
            <>
              <button
                type="button"
                className="pa-menu__item"
                onClick={() => {
                  cerrar();
                  setNombre(equipo.nombre);
                  setEditando(true);
                }}
              >
                <Ic n="lapiz" /> Editar nombre o contraseña
              </button>
              <button
                type="button"
                className="pa-menu__item"
                onClick={() => {
                  cerrar();
                  verVersiones();
                }}
              >
                <Ic n="versiones" /> Versiones guardadas
              </button>
              <button
                type="button"
                className="pa-menu__item"
                onClick={() => {
                  cerrar();
                  copia();
                }}
              >
                <Ic n="bajar" /> Descargar copia del proyecto
              </button>
              {video && (
                <a className="pa-menu__item" href={urlVideo(video, true)} onClick={cerrar}>
                  <Ic n="bajar" /> Descargar video ({megas(video.bytes)})
                </a>
              )}
              <button
                type="button"
                className="pa-menu__item"
                onClick={() => {
                  cerrar();
                  void hacer(() => pedir('POST', `${ruta}/congelar`, { valor: !equipo.congelado }));
                }}
              >
                <Ic n={equipo.congelado ? 'candadoAbierto' : 'candado'} /> {equipo.congelado ? 'Abrir su edición' : 'Cerrar su edición'}
              </button>
              <button
                type="button"
                className="pa-menu__item pa-menu__item--rojo"
                onClick={() => {
                  cerrar();
                  setBorrando(true);
                }}
              >
                <Ic n="basura" /> Eliminar equipo
              </button>
            </>
          )}
        </Menu>
      </div>

      <p className="eq-estado">
        <span className={`eq-punto ${personas.length > 0 ? 'eq-punto--vivo' : ''}`} />
        {personas.length > 0 ? `${personas.length} conectado${personas.length === 1 ? '' : 's'}` : 'Nadie'}
        <span className="eq-sep">·</span>
        <span className={video ? 'eq-entregado' : ''}>{video ? 'Entregado' : 'Sin entrega'}</span>
        {equipo.congelado && (
          <>
            <span className="eq-sep">·</span>
            <span className="eq-cerrado">Edición cerrada</span>
          </>
        )}
      </p>

      {personas.length > 0 && (
        <ul className="eq-personas">
          {personas.map((p, i) => (
            <li key={i}>
              <span className="eq-personas__nombre">{p.nombre}</span>
              <span className="eq-personas__donde">{dondeEsta(p, sala?.escenas ?? {})}</span>
            </li>
          ))}
        </ul>
      )}

      {sala && sala.bloqueos.length > 0 && (
        <div className="pa-bloqueos">
          <span className="pa-rotulo">Piezas tomadas</span>
          {sala.bloqueos.map((b) => (
            <span key={b.clave} className="pa-bloqueo">
              <span className="nv-punto" style={{ background: b.color }} />
              {b.nombre} · <code>{b.clave}</code>
              <button
                type="button"
                className="pa-enlace"
                onClick={() => void hacer(() => pedir('POST', `${ruta}/soltar`, { clave: b.clave }), 'Pieza soltada.')}
              >
                Soltar
              </button>
            </span>
          ))}
        </div>
      )}

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
          <div className="pa-confirmar__botones">
            <button type="submit" className="pa-gordo pa-gordo--chico pa-gordo--verde" disabled={!nombre.trim() || (clave.length > 0 && clave.length < 4)}>
              Guardar
            </button>
            <button type="button" className="pa-gordo pa-gordo--chico" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {borrando && (
        <Confirmar
          texto={`¿Eliminar «${equipo.nombre}»? Se borran su proyecto, sus versiones, sus grabaciones y sus videos. No se puede deshacer.`}
          si="Sí, eliminar"
          alNo={() => setBorrando(false)}
          alSi={() => {
            setBorrando(false);
            void hacer(() => pedir('DELETE', ruta), `Equipo «${equipo.nombre}» eliminado.`);
          }}
        />
      )}

      {versiones && (
        <div className="pa-versiones">
          <div className="pa-versiones__cabeza">
            <span className="pa-rotulo">Versiones guardadas</span>
            <span className="nv-espacio" />
            <button
              type="button"
              className="pa-gordo pa-gordo--chico"
              onClick={() => void hacer(() => pedir('POST', `${ruta}/versiones`), 'Versión guardada.').then(verVersiones)}
            >
              Guardar ahora
            </button>
            <button type="button" className="pa-enlace" onClick={() => setVersiones(null)} aria-label="Cerrar versiones">
              <Ic n="cerrar" tam={14} />
            </button>
          </div>
          {versiones.length === 0 && <span className="pa-tarjeta__nota">Aún no hay versiones.</span>}
          {versiones.map((v) => (
            <div key={v.id} className="pa-version">
              <span className="nv-mono">{fecha(v.fecha)}</span>
              <span className="pa-tarjeta__nota">{MOTIVOS[v.motivo] ?? v.motivo}</span>
              <span className="nv-espacio" />
              {porRestaurar === v.id ? (
                <>
                  <span className="pa-tarjeta__nota">¿Volver a esta? Llega en vivo a las tablets.</span>
                  <button
                    type="button"
                    className="pa-gordo pa-gordo--chico pa-gordo--verde"
                    onClick={() => {
                      setPorRestaurar(null);
                      void hacer(() => pedir('POST', `${ruta}/restaurar`, { version: v.id }), 'Versión restaurada.').then(verVersiones);
                    }}
                  >
                    Sí, restaurar
                  </button>
                  <button type="button" className="pa-enlace" onClick={() => setPorRestaurar(null)}>
                    No
                  </button>
                </>
              ) : (
                <button type="button" className="pa-enlace" onClick={() => setPorRestaurar(v.id)}>
                  Restaurar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="eq-acciones">
        <a className="eq-boton" href={`/?ver=${equipo.id}`} target="_blank" rel="noreferrer">
          Ver en vivo
        </a>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- Admins

function Admins({ admins, yo, hacer }: { admins: Admin[]; yo: { id: number | null } | null; hacer: Hacer }) {
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  return (
    <main className="pa-pagina">
      <Cabeza icono="llave" titulo="Admins" sub="Cada admin entra por la misma pantalla que los equipos y califica como un jurado.">
        <button type="button" className={`pa-gordo ${nuevo ? '' : 'pa-gordo--verde'}`} onClick={() => setNuevo((x) => !x)}>
          {nuevo ? 'Cancelar' : '+ Admin nuevo'}
        </button>
      </Cabeza>
      <section className="pa-rejilla">
        {nuevo && (
          <form
            className="pa-tarjeta pa-tarjeta--nueva"
            onSubmit={(ev) => {
              ev.preventDefault();
              void hacer(async () => {
                await pedir('POST', 'admins', { nombre, clave });
                setNombre('');
                setClave('');
                setNuevo(false);
              }, `Admin «${nombre.trim()}» creado.`);
            }}
          >
            <strong className="pa-tarjeta__titulo">Admin nuevo</strong>
            <p className="pa-tarjeta__nota">Entra con este nombre y esta contraseña. El nombre no puede ser el de un equipo.</p>
            <Campo titulo="Nombre">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoFocus />
            </Campo>
            <Campo titulo="Contraseña (4 caracteres o más)">
              <input value={clave} onChange={(e) => setClave(e.target.value)} maxLength={64} autoComplete="off" />
            </Campo>
            <button type="submit" className="pa-gordo pa-gordo--verde" disabled={!nombre.trim() || clave.length < 4}>
              Crear admin
            </button>
          </form>
        )}
        <article className="pa-tarjeta" style={{ '--c': '#ffb020' } as CSSProperties}>
          <div className="pa-tarjeta__cabeza">
            <span className="mz-avatar mz-avatar--grande">
              <Ic n="corona" tam={22} />
            </span>
            <div className="pa-tarjeta__nombre">
              <strong>Admin</strong>
              <span>cuenta maestra{yo?.id === null ? ' · eres tú' : ''}</span>
            </div>
          </div>
          <p className="pa-tarjeta__nota">
            Su contraseña es el secreto admin-clave de Azure (ver server/README.md). No se puede borrar: así nunca te quedas afuera.
          </p>
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
    <article className="pa-tarjeta" style={{ '--c': colorDe(admin.id + 3) } as CSSProperties}>
      <div className="pa-tarjeta__cabeza">
        <span className="mz-avatar mz-avatar--grande">{admin.nombre.charAt(0).toUpperCase()}</span>
        <div className="pa-tarjeta__nombre">
          <strong>{admin.nombre}</strong>
          <span>
            desde {fecha(admin.creado)}
            {esYo ? ' · eres tú' : ''}
          </span>
        </div>
        <span className="nv-espacio" />
        <Menu>
          {(cerrar) => (
            <>
              <button
                type="button"
                className="pa-menu__item"
                onClick={() => {
                  cerrar();
                  setNombre(admin.nombre);
                  setEditando(true);
                }}
              >
                <Ic n="lapiz" /> Editar nombre o contraseña
              </button>
              <button
                type="button"
                className="pa-menu__item pa-menu__item--rojo"
                onClick={() => {
                  cerrar();
                  setBorrando(true);
                }}
              >
                <Ic n="basura" /> Eliminar cuenta
              </button>
            </>
          )}
        </Menu>
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
          <div className="pa-confirmar__botones">
            <button type="submit" className="pa-gordo pa-gordo--chico pa-gordo--verde" disabled={!nombre.trim() || (clave.length > 0 && clave.length < 4)}>
              Guardar
            </button>
            <button type="button" className="pa-gordo pa-gordo--chico" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {borrando && (
        <Confirmar
          texto={`¿Eliminar la cuenta «${admin.nombre}»?${esYo ? ' Es la tuya: saldrás del panel.' : ''}`}
          si="Sí, eliminar"
          alNo={() => setBorrando(false)}
          alSi={() => {
            setBorrando(false);
            void hacer(() => pedir('DELETE', ruta), `Admin «${admin.nombre}» eliminado.`);
          }}
        />
      )}
    </article>
  );
}
