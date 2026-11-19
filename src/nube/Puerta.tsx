// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La puerta de la versión en la nube: antes de la app, el equipo entra con
 * su nombre y su contraseña, cada persona dice quién es, y se abre el
 * proyecto del equipo. Con el nombre «Admin» y la contraseña del panel, en vez
 * de la app se abre el panel de administración. Fuera de la nube deja pasar directo.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, EN_NUBE, ErrorApi, type Equipo, type Sesion } from './api';
import { ContextoNube, type Persona } from './contexto';
import { abrirSala, type Sala } from './sala';
import { instalarBloqueos } from './bloqueos';
import { PantallaRanking } from './Ranking';

/** El panel se baja solo si entra el admin: las tablets de los equipos no lo cargan. */
// (Fuera de la nube no existe: así la versión de GitHub Pages ni lo incluye.)
const PanelAdmin = import.meta.env.MODE === 'nube' ? lazy(() => import('./admin/PanelAdmin').then((m) => ({ default: m.PanelAdmin }))) : () => null;

/** Los colores de la marca, para que cada quien se reconozca en las demás tablets. */
const COLORES_PERSONA = ['#ff5bff', '#35bfff', '#04ef77', '#fce905', '#9f1ded', '#ff6a12', '#ff4d6d', '#5ee0ff'];

const CLAVE_PERSONA = 'sonora-persona';
/**
 * El panel abre la app de un equipo para mirarla en vivo: `/?ver=<equipo>`.
 * Entra con la sesión del panel, no aparece entre los presentes y no cambia nada.
 */
const VER = Number(new URLSearchParams(location.search).get('ver')) || 0;
const PANEL: Persona = { nombre: 'Panel', color: '#ffffff' };

/** El último equipo que entró en esta tablet: sin internet, se entra con él. */
const CLAVE_EQUIPO = 'sonora-equipo';
/** La base de datos se duerme cuando nadie la usa; despertarla puede tardar un minuto. */
const ESPERA_MAXIMA = 90_000;

function leerGuardado<T>(clave: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function guardarEquipo(equipo: Equipo | null) {
  try {
    if (equipo) localStorage.setItem(CLAVE_EQUIPO, JSON.stringify(equipo));
    else localStorage.removeItem(CLAVE_EQUIPO);
  } catch {
    // Sin almacenamiento, sin internet habrá que esperar a que vuelva.
  }
}

function leerPersona(): Persona | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PERSONA) ?? 'null');
    return p?.nombre && p?.color ? p : null;
  } catch {
    return null;
  }
}

export function PuertaNube({ children }: { children: ReactNode }) {
  if (!EN_NUBE) return children;
  return <Puerta>{children}</Puerta>;
}

function Puerta({ children }: { children: ReactNode }) {
  // undefined: todavía se está preguntando al servidor.
  const [equipo, setEquipo] = useState<Equipo | null | undefined>(undefined);
  const [admin, setAdmin] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(() => (VER ? PANEL : leerPersona()));
  const [eligiendo, setEligiendo] = useState(false);
  const [abierto, setAbierto] = useState<Sala | null>(null);
  const [falla, setFalla] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [viendoRanking, setViendoRanking] = useState(false);
  // La sala se abre con la persona de ese momento; si cambia luego, se le avisa a la sala.
  const personaAlAbrir = useRef(persona);

  /** Lo que pasa al saber quién entró. */
  const entro = (s: Sesion) => {
    if (s.admin) return setAdmin(true);
    guardarEquipo(s.equipo);
    setEquipo(s.equipo);
  };

  const revisarSesion = useCallback(() => {
    if (VER) {
      void fetch('/api/admin/estado')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Entra primero al panel, con el nombre Admin.'))))
        .then((r: { equipos: Equipo[] }) => {
          const equipo = r.equipos.find((e) => e.id === VER);
          if (equipo) setEquipo(equipo);
          else setFalla('Ese equipo no existe.');
        })
        .catch((e: Error) => setFalla(e.message));
      return;
    }
    api
      .sesion()
      .then((r) => entro(r))
      .catch((e: ErrorApi) => {
        if (e.estado === 401) return setEquipo(null);
        // Sin internet se sigue con el último equipo de esta tablet y su copia guardada.
        const ultimo = e.estado === 0 ? leerGuardado<Equipo>(CLAVE_EQUIPO) : null;
        if (ultimo) setEquipo(ultimo);
        else setFalla(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(revisarSesion, [revisarSesion]);

  // La app queda guardada en la tablet para abrir sin internet (ver sw.js).
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Sin service worker (por ejemplo, con un certificado no confiable) la app funciona igual.
      });
    }
  }, []);

  // Con equipo y persona, se entra a la sala del equipo y se espera la primera sincronía.
  const equipoId = equipo?.id;
  const hayPersona = persona !== null;
  useEffect(() => {
    if (!equipoId || !hayPersona || !personaAlAbrir.current) return;
    const sala = abrirSala(personaAlAbrir.current, equipoId, { ver: Boolean(VER) });
    let vigente = true;
    const reloj = window.setTimeout(() => {
      if (!vigente) return;
      setFalla('El proyecto tardó demasiado en abrir.');
      sala.cerrar();
    }, ESPERA_MAXIMA);
    void sala.listo.then(() => {
      if (!vigente) return;
      window.clearTimeout(reloj);
      setAbierto(sala);
    });
    return () => {
      vigente = false;
      window.clearTimeout(reloj);
      sala.cerrar();
      setAbierto(null);
    };
  }, [equipoId, hayPersona, intento]);

  // Con la sala abierta, las piezas que otras personas están moviendo quedan bloqueadas aquí.
  useEffect(() => (abierto ? instalarBloqueos(abierto.bloqueos) : undefined), [abierto]);

  // Sin conexión puede ser que no haya red… o que la sesión venció (el servidor no
  // deja entrar a la sala). Cada tanto se pregunta: si venció, se vuelve a pedir el
  // nombre y la contraseña; lo editado sigue guardado en la tablet y se junta al entrar.
  useEffect(() => {
    if (!abierto || VER) return;
    const reloj = window.setInterval(() => {
      if (abierto.conexion.obtener() !== 'sin-conexion') return;
      api.sesion().catch((e: ErrorApi) => e.estado === 401 && setEquipo(null));
    }, 15_000);
    return () => window.clearInterval(reloj);
  }, [abierto]);

  const salir = useCallback(() => {
    if (VER) return void window.location.assign('/');
    // Recargar deja todo limpio: el audio, la pieza en memoria y la sesión.
    guardarEquipo(null);
    void api.salir().finally(() => window.location.reload());
  }, []);

  const valor = useMemo(
    () =>
      equipo && persona && abierto
        ? {
            equipo,
            persona,
            sala: abierto,
            cambiarPersona: () => setEligiendo(true),
            salir,
          }
        : null,
    [equipo, persona, abierto, salir],
  );

  if (falla) {
    return (
      <Pantalla>
        <h1 className="nv-titulo">No pudimos llegar a SONORA</h1>
        <p className="nv-sub">{falla} Revisa el WiFi de la tablet.</p>
        <button
          type="button"
          className="nv-boton nv-boton--primario"
          onClick={() => {
            setFalla(null);
            if (equipo && persona) setIntento((i) => i + 1);
            else revisarSesion();
          }}
        >
          Reintentar
        </button>
      </Pantalla>
    );
  }
  if (admin && !VER) {
    return (
      <Suspense fallback={<Pantalla cargando texto="Abriendo el panel…" />}>
        <PanelAdmin alSalir={() => void api.salir().finally(() => window.location.reload())} />
      </Suspense>
    );
  }
  if (equipo === undefined) return <Pantalla cargando />;
  if (equipo === null) {
    if (viendoRanking) return <PantallaRanking alVolver={() => setViendoRanking(false)} />;
    return <Entrada alEntrar={entro} alVerRanking={() => setViendoRanking(true)} />;
  }
  const quienEres = (
      <QuienEres
        equipo={equipo}
        actual={persona}
        alElegir={(p) => {
          try {
            localStorage.setItem(CLAVE_PERSONA, JSON.stringify(p));
          } catch {
            // Sin almacenamiento se pregunta de nuevo la próxima vez.
          }
          personaAlAbrir.current ??= p;
          abierto?.cambiarPersona(p);
          setPersona(p);
          setEligiendo(false);
        }}
        alSalir={salir}
      />
  );
  if (!persona) return quienEres;
  if (!valor) {
    return (
      <Pantalla
        cargando
        texto={`Abriendo el proyecto de ${equipo.nombre}… Si nadie lo ha usado hoy, puede tardar un minuto.`}
      />
    );
  }

  return (
    <ContextoNube.Provider value={valor}>
      {children}
      {/* Cambiar de persona no cierra la app: la pregunta va encima. */}
      {eligiendo && <div className="nu-encima">{quienEres}</div>}
    </ContextoNube.Provider>
  );
}

function Pantalla({ children, cargando, texto }: { children?: ReactNode; cargando?: boolean; texto?: string }) {
  return (
    <div className="nv nu-puerta">
      <div className="nu-tarjeta">
        <span className="nv-logo nu-logo">SONORA</span>
        {cargando ? <p className="nv-sub nu-cargando">{texto ?? 'Conectando…'}</p> : children}
      </div>
    </div>
  );
}

function Entrada({ alEntrar, alVerRanking }: { alEntrar: (sesion: Sesion) => void; alVerRanking: () => void }) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [hayRanking, setHayRanking] = useState(false);

  // El botón del ranking aparece solo cuando los admins lo abren; se pregunta cada tanto.
  useEffect(() => {
    let vigente = true;
    const preguntar = () =>
      api
        .ranking()
        .then((r) => vigente && setHayRanking(r.activo))
        .catch(() => {
          // Sin conexión, el botón queda como estaba.
        });
    void preguntar();
    const reloj = window.setInterval(preguntar, 15_000);
    return () => {
      vigente = false;
      window.clearInterval(reloj);
    };
  }, []);

  const entrar = (ev: FormEvent) => {
    ev.preventDefault();
    setEnviando(true);
    setError(null);
    api
      .entrar(nombre, clave)
      .then(alEntrar)
      .catch((e: ErrorApi) => {
        setError(e.message);
        setClave('');
      })
      .finally(() => setEnviando(false));
  };

  return (
    <Pantalla>
      <h1 className="nv-titulo">Entra con tu equipo</h1>
      <p className="nv-sub">Todas las tablets de tu equipo trabajan en el mismo proyecto.</p>
      <form className="nu-formulario" onSubmit={entrar}>
        <label className="nu-campo">
          <span className="nv-etiqueta nv-tenue">Nombre del equipo</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            autoFocus
          />
        </label>
        <label className="nu-campo">
          <span className="nv-etiqueta nv-tenue">Contraseña</span>
          <input value={clave} onChange={(e) => setClave(e.target.value)} type="password" autoComplete="off" maxLength={64} />
        </label>
        {error && <p className="nu-error">{error}</p>}
        <button type="submit" className="nv-boton nv-boton--primario" disabled={enviando || !nombre.trim() || !clave}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      {hayRanking && (
        <button type="button" className="nv-boton nu-ranking" onClick={alVerRanking}>
          🏆 Ver el ranking
        </button>
      )}
    </Pantalla>
  );
}

function QuienEres({
  equipo,
  actual,
  alElegir,
  alSalir,
}: {
  equipo: Equipo;
  actual: Persona | null;
  alElegir: (persona: Persona) => void;
  alSalir: () => void;
}) {
  const [nombre, setNombre] = useState(actual?.nombre ?? '');
  const [color, setColor] = useState(
    () => actual?.color ?? COLORES_PERSONA[Math.floor(Math.random() * COLORES_PERSONA.length)],
  );
  const limpio = nombre.trim();

  return (
    <Pantalla>
      <p className="nv-etiqueta nv-acento">{equipo.nombre}</p>
      <h1 className="nv-titulo">¿Quién eres?</h1>
      <p className="nv-sub">Tu nombre y tu color se verán en las tablets de tu equipo.</p>
      <form
        className="nu-formulario"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (limpio) alElegir({ nombre: limpio, color });
        }}
      >
        <div className="nu-quien">
          <span className="nu-avatar" style={{ background: color }}>
            {limpio.charAt(0).toUpperCase() || '?'}
          </span>
          <label className="nu-campo">
            <span className="nv-etiqueta nv-tenue">Tu nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={20} autoFocus />
          </label>
        </div>
        <div className="nu-colores" role="radiogroup" aria-label="Tu color">
          {COLORES_PERSONA.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={c}
              className={`nu-color ${c === color ? 'nu-color--elegido' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <button type="submit" className="nv-boton nv-boton--primario" disabled={!limpio}>
          Listo
        </button>
        <button type="button" className="nv-enlace" onClick={alSalir}>
          No es mi equipo · salir
        </button>
      </form>
    </Pantalla>
  );
}
