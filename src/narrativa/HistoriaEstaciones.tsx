// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El recorrido de la Historia (Figma, Ronda 8, frames R8 · 0 a R8 · 6).
 *
 *  - El mapa: las seis estaciones sobre un camino punteado, con su estado.
 *    Se dibuja a la medida de Figma (1136 × 456) y se escala para caber.
 *  - Cada estación es un tablero: una columna por pregunta del documento y
 *    «Lo que vivimos aquí». Allí se deja una nota, un audio o fotos de la galería.
 *  - Match de oportunidades: tarjetas de oportunidades; tocar una es decir «yo hice match».
 *  - La ciudad desde otros ojos: las personas que conocieron y su perfil con las 7 preguntas.
 *  - Siguiendo el rastro: las fotos para lo visual, con su fuente.
 *
 * Los audios pasan a «Tuyos» en Música y las fotos a «Fotos» en Visuales.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { nuevoId } from '../estado/proyecto';
import { leerArchivoDatos } from '../estado/musica';
import { ESTACIONES } from '../estado/estaciones';
import type { AporteHistoria, OportunidadHistoria, PersonaHistoria, Proyecto } from '../estado/tipos';
import { useGrabadora } from '../hooks/useGrabadora';
import { Icono } from './Icono';
import { Inicial, Pie, useAutor, useEquipo } from './LeccionHistoria';

// ------------------------------------------------------------ datos

const aportesDe = (p: Proyecto) => p.historia.aportes ?? [];
const aportesColumna = (p: Proyecto, estacion: number, columna: string) =>
  aportesDe(p).filter((a) => a.estacion === estacion && a.columna === columna);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

type EstadoEstacion = 'hecha' | 'curso' | 'pendiente';

/** Cómo va una estación: para el mapa y para el pie. */
export function progresoEstacion(p: Proyecto, i: number): { estado: EstadoEstacion; resumen: string; pie: string } {
  const e = ESTACIONES[i];
  const aportes = aportesDe(p).filter((a) => a.estacion === i);
  const hechas = e.preguntas.filter((_, k) => aportes.some((a) => a.columna === `p${k}`)).length;
  const total = e.preguntas.length;

  if (e.tipo === 'personas') {
    const personas = (p.historia.personas ?? []).filter((x) => x.nombre.trim());
    const n = personas.length;
    const estado = personas.some((x) => x.respuestas.some((r) => r.texto || r.url)) ? 'hecha' : n > 0 ? 'curso' : 'pendiente';
    return { estado, resumen: plural(n, 'persona', 'personas'), pie: plural(n, 'persona entrevistada', 'personas entrevistadas') };
  }
  if (e.tipo === 'fotos') {
    const n = aportes.filter((a) => a.columna === 'fotos').length;
    return { estado: n > 0 ? 'hecha' : aportes.length > 0 ? 'curso' : 'pendiente', resumen: plural(n, 'foto', 'fotos'), pie: `${plural(n, 'foto', 'fotos')} · pasan solas a Visuales` };
  }
  if (e.tipo === 'match') {
    const ops = p.historia.oportunidades ?? [];
    const gente = new Set(ops.flatMap((o) => o.personas)).size;
    const estado = gente > 0 && hechas === total ? 'hecha' : gente > 0 || ops.length > 0 || aportes.length > 0 ? 'curso' : 'pendiente';
    return {
      estado,
      resumen: estado === 'hecha' ? plural(aportes.length, 'aporte', 'aportes') : plural(gente, 'match', 'matches'),
      pie: `${plural(ops.length, 'oportunidad', 'oportunidades')} · ${gente} hicieron match`,
    };
  }
  const estado = hechas === total ? 'hecha' : aportes.length > 0 ? 'curso' : 'pendiente';
  return {
    estado,
    resumen: estado === 'hecha' ? plural(aportes.length, 'aporte', 'aportes') : `${hechas} de ${total} preguntas`,
    pie: estado === 'hecha' ? `${plural(aportes.length, 'aporte', 'aportes')} · la estación está completa` : `${hechas} de ${total} preguntas · ${plural(aportes.length, 'aporte', 'aportes')}`,
  };
}

// ------------------------------------------------------------ el mapa

/** Dónde va cada estación en el lienzo de Figma (esquina del bloque de 220 × 180). */
const LUGAR: [number, number][] = [
  [10, 204],
  [195, 69],
  [385, 204],
  [575, 69],
  [760, 204],
  [900, 64],
];
/** Las calles de fondo: x, y, ancho, alto y giro (como en Figma). */
const CALLES: [number, number, number, number, number][] = [
  [0, 96, 1136, 10, -3],
  [0, 250, 1136, 14, 2],
  [0, 400, 1136, 8, -1],
  [180, 0, 10, 456, 6],
  [420, 0, 14, 456, -4],
  [640, 0, 8, 456, 3],
  [860, 0, 12, 456, -6],
  [1040, 0, 8, 456, 2],
];
const RUTA = 'M 0 140 C 101.75 140 83.25 5 185 5 C 289.5 5 270.5 140 375 140 C 479.5 140 460.5 5 565 5 C 666.75 5 648.25 140 750 140 C 827 140 813 0 890 0 C 970 40 970 200 940 275';

/** Un lienzo de medida fija que se escala para caber en el espacio que haya. */
function Ajustado({ ancho, alto, children, className }: { ancho: number; alto: number; children: ReactNode; className?: string }) {
  const marco = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = marco.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      // getBoundingClientRect ya trae la escala de la vista; offset* no.
      if (el.offsetWidth > 0 && el.offsetHeight > 0 && r.width > 0) setK(Math.min(el.offsetWidth / ancho, el.offsetHeight / alto, 1.2));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ancho, alto]);
  return (
    <div ref={marco} className="nv-ajustado">
      <div className={className} style={{ width: ancho, height: alto, transform: `translate(-50%, -50%) scale(${k})` }}>
        {children}
      </div>
    </div>
  );
}

export function MapaEstaciones({ alEntrar, alSeguir }: { alEntrar: (i: number) => void; alSeguir: () => void }) {
  const { proyecto } = useProyecto();
  const estados = ESTACIONES.map((_, i) => progresoEstacion(proyecto, i));
  const hechas = estados.filter((e) => e.estado === 'hecha').length;
  const curso = estados.findIndex((e) => e.estado === 'curso');
  const siguiente = curso >= 0 ? curso : estados.findIndex((e) => e.estado !== 'hecha');

  return (
    <div className="nv-his-mapa">
      <div className="nv-his-cabeza">
        <div>
          <h1 className="nv-his-cabeza__titulo">Tu recorrido</h1>
          <p className="nv-his-cabeza__sub">Toquen una estación para entrar. Pueden ir en el orden que quieran.</p>
        </div>
        <span className="nv-espacio" />
        <div className="nv-his-mapa__cuenta">
          <span>
            <strong>{hechas} de 6</strong> estaciones
          </span>
          <span className="nv-his-mapa__segmentos">
            {estados.map((e, i) => (
              <span key={i} className={`nv-his-mapa__seg nv-his-mapa__seg--${e.estado}`} />
            ))}
          </span>
        </div>
      </div>

      <Ajustado ancho={1136} alto={456} className="nv-his-mapa__lienzo">
        {CALLES.map(([x, y, w, h, r], i) => (
          <span key={i} className="nv-his-mapa__calle" style={{ left: x, top: y, width: w, height: h, transform: `rotate(${-r}deg)` }} />
        ))}
        <svg className="nv-his-mapa__ruta" width="960" height="280" viewBox="0 0 960 280" aria-hidden="true">
          <path d={RUTA} />
        </svg>
        {ESTACIONES.map((e, i) => {
          const est = estados[i];
          const [x, y] = LUGAR[i];
          const sigue = siguiente === i;
          return (
            <button
              key={e.nombre}
              type="button"
              className={`nv-his-nodo nv-his-nodo--${est.estado} ${sigue ? 'nv-his-nodo--sigue' : ''}`}
              style={{ ['--c' as string]: e.color, left: x, top: y }}
              onClick={() => alEntrar(i)}
            >
              {est.estado === 'curso' && <span className="nv-his-nodo__anillo" />}
              <span className="nv-his-nodo__circulo">
                <Icono n={e.icono} tam={32} />
              </span>
              {est.estado === 'hecha' && (
                <span className="nv-his-nodo__check">
                  <Icono n="check-bold" tam={12} />
                </span>
              )}
              <span className="nv-his-nodo__etiqueta">
                <strong>
                  {i + 1} · {e.nombre.replace(' de Medellín', '')}
                </strong>
                <span>{e.verbo}</span>
                <span className={`nv-his-nodo__estado nv-his-nodo__estado--${est.estado}`}>
                  <span className="nv-his-nodo__punto" />
                  {est.estado === 'hecha' ? `Hecha · ${est.resumen}` : est.estado === 'curso' ? `En curso · ${est.resumen}` : 'Por hacer'}
                </span>
              </span>
              {sigue && (
                <span className="nv-his-nodo__seguir">
                  {est.estado === 'curso' ? 'Continuar' : 'Empezar'} <Icono n="arrow-right-bold" tam={11} />
                </span>
              )}
            </button>
          );
        })}
        <span className="nv-his-mapa__despues">
          <Icono n="pencil-simple-fill" tam={14} /> Después: escribir su historia
        </span>
      </Ajustado>

      <Pie mensaje={`Llevan ${hechas} de 6 estaciones · sigan cuando quieran`} boton="Seguir al monólogo" alTocar={alSeguir} />
    </div>
  );
}

// ------------------------------------------------------------ una estación

function Encabezado({ indice, alVolver, derecha }: { indice: number; alVolver: () => void; derecha?: ReactNode }) {
  const e = ESTACIONES[indice];
  return (
    <div className="nv-his-est__cabeza">
      <span className="nv-his-est__icono">
        <Icono n={e.icono} tam={28} />
      </span>
      <div className="nv-his-est__titulos">
        <button type="button" className="nv-his-est__miga" onClick={alVolver}>
          <Icono n="caret-left-bold" tam={10} /> Recorrido <span className="nv-his-est__punto">·</span> <strong>ESTACIÓN {indice + 1}</strong>
        </button>
        <h1>{e.nombre}</h1>
        <p>{e.descripcion}</p>
      </div>
      <span className="nv-espacio" />
      {derecha}
    </div>
  );
}

export function EstacionVista({ indice, alVolver }: { indice: number; alVolver: () => void }) {
  const e = ESTACIONES[indice];
  const { proyecto } = useProyecto();
  if (e.tipo === 'personas') return <Personas indice={indice} alVolver={alVolver} />;
  const est = progresoEstacion(proyecto, indice);

  return (
    <div className="nv-his-est" style={{ ['--c' as string]: e.color }}>
      <Encabezado indice={indice} alVolver={alVolver} />
      {e.tipo === 'match' && <Oportunidades />}
      {e.tipo === 'match' && (
        <h2 className="nv-his-seccion">
          PREGUNTAS <span>1 aporte o más en cada una</span>
        </h2>
      )}
      {e.tipo === 'fotos' ? (
        <div className="nv-his-tablero nv-his-tablero--fotos">
          <FotosMaterial estacion={indice} />
          <Columna estacion={indice} columna="vivido" pregunta="Lo que vivimos aquí" etiqueta="SU EXPERIENCIA" />
        </div>
      ) : (
        <div className={`nv-his-tablero ${e.tipo === 'match' ? 'nv-his-tablero--bajo' : ''}`}>
          {e.material && <Columna estacion={indice} columna="material" pregunta={e.material} etiqueta="MATERIAL" />}
          {e.preguntas.map((q, k) => (
            <Columna key={k} estacion={indice} columna={`p${k}`} pregunta={q} etiqueta={`PREGUNTA ${k + 1}`} numero={k + 1} />
          ))}
          <Columna estacion={indice} columna="vivido" pregunta="Lo que vivimos aquí" etiqueta="SU EXPERIENCIA" />
        </div>
      )}
      <Pie
        ok={est.estado !== 'pendiente'}
        mensaje={est.estado === 'pendiente' ? 'Aún no empiezan esta estación' : est.pie}
        boton={est.estado === 'pendiente' ? 'Volver al recorrido' : 'Listo · volver al recorrido'}
        alTocar={alVolver}
      />
    </div>
  );
}

// ------------------------------------------------------------ columnas y aportes

function useSubirFotos(estacion: number, columna: string) {
  const { actualizar } = useProyecto();
  const autor = useAutor();
  const [leyendo, setLeyendo] = useState(false);
  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setLeyendo(true);
    try {
      for (const archivo of Array.from(archivos)) {
        const datos = await leerArchivoDatos(archivo);
        const url = crearUrl(archivo);
        actualizar((p) => {
          const n = p.archivosDatos.filter((a) => a.tipo === 'imagen').length + 1;
          p.archivosDatos.push({ ...datos, nombre: `Foto ${n}`, url });
          (p.historia.aportes ??= []).push({ id: nuevoId('aporte'), estacion, columna, tipo: 'foto', url, texto: '', autor });
        });
      }
    } finally {
      setLeyendo(false);
    }
  };
  return { leyendo, subir };
}

function Columna({ estacion, columna, pregunta, etiqueta, numero }: { estacion: number; columna: string; pregunta: string; etiqueta: string; numero?: number }) {
  const { proyecto, actualizar } = useProyecto();
  const autor = useAutor();
  const aportes = aportesColumna(proyecto, estacion, columna);
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState('');
  const vivido = columna === 'vivido';
  const material = columna === 'material';
  const fotos = useSubirFotos(estacion, columna);

  const grabadora = useGrabadora((g) =>
    actualizar((p) => {
      const n = aportesColumna(p, estacion, columna).filter((a) => a.tipo === 'audio').length + 1;
      const nombre = material ? `Fragmento ${n}` : `Audio ${n}`;
      p.sonidos.push({ id: nuevoId('sonido'), nombre: `E${estacion + 1} · ${nombre}`, url: g.url, duracion: g.duracion });
      (p.historia.aportes ??= []).push({ id: nuevoId('aporte'), estacion, columna, tipo: 'audio', texto: nombre, url: g.url, duracion: g.duracion, autor });
    }),
  );
  const grabando = grabadora.estado === 'grabando';

  const guardarTexto = () => {
    const t = texto.trim();
    if (t) actualizar((p) => void (p.historia.aportes ??= []).push({ id: nuevoId('aporte'), estacion, columna, tipo: 'texto', texto: t, autor }));
    setTexto('');
    setEscribiendo(false);
  };

  const claseEstado = vivido ? 'nv-his-col__estado--vivido' : material ? 'nv-his-col__estado--material' : aportes.length > 0 ? 'nv-his-col__estado--hecho' : '';

  return (
    <section className={`nv-his-col ${vivido ? 'nv-his-col--vivido' : ''}`}>
      <header className="nv-his-col__cabeza">
        <span className={`nv-his-col__estado ${claseEstado}`}>
          {vivido ? <Icono n="pencil-simple-fill" tam={11} /> : material ? <Icono n="microphone-fill" tam={11} /> : aportes.length > 0 ? <Icono n="check-bold" tam={11} /> : numero}
        </span>
        <span className="nv-his-col__etiqueta">{etiqueta}</span>
        <span className="nv-espacio" />
        {aportes.length > 0 && <span className="nv-his-col__cuenta">{aportes.length}</span>}
      </header>
      <h3 className="nv-his-col__pregunta">{pregunta}</h3>
      <div className="nv-his-col__aportes">
        {aportes.length === 0 && !escribiendo && (
          <p className="nv-his-col__vacio">{vivido ? 'Cómo se sintieron, qué les sorprendió, qué se llevan.' : material ? 'Graben los momentos que más les sirvan.' : 'Todavía no hay aportes. ¡Sean los primeros!'}</p>
        )}
        {aportes.map((a) => (
          <Aporte key={a.id} a={a} alQuitar={() => actualizar((p) => (p.historia.aportes = aportesDe(p).filter((x) => x.id !== a.id)))} />
        ))}
        {escribiendo && (
          <div className="nv-his-escribir">
            <textarea autoFocus rows={3} value={texto} placeholder={vivido ? 'Lo que vivimos…' : 'Escriban su respuesta…'} onChange={(ev) => setTexto(ev.target.value)} />
            <div className="nv-his-escribir__botones">
              <button type="button" className="nv-his-boton" onClick={() => { setTexto(''); setEscribiendo(false); }}>
                Cancelar
              </button>
              <button type="button" className="nv-his-boton nv-his-boton--si" onClick={guardarTexto}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="nv-his-agregar">
        <span className="nv-his-agregar__texto">{grabando ? `Grabando… ${grabadora.segundos.toFixed(0)} s` : fotos.leyendo ? 'Leyendo fotos…' : material ? 'Grabar' : 'Agregar'}</span>
        <span className="nv-espacio" />
        {!material && (
          <button type="button" className="nv-his-agregar__boton" aria-label="Escribir" title="Escribir" onClick={() => setEscribiendo(true)}>
            <Icono n="pencil-simple-fill" tam={13} />
          </button>
        )}
        <button
          type="button"
          className={`nv-his-agregar__boton nv-his-agregar__boton--rojo ${grabando ? 'nv-his-agregar__boton--grabando' : ''}`}
          aria-label={grabando ? 'Parar la grabación' : 'Grabar un audio'}
          title={grabando ? 'Parar' : 'Grabar un audio'}
          onClick={() => (grabando ? grabadora.parar() : void grabadora.empezar())}
        >
          <Icono n={grabando ? 'stop-fill' : 'microphone-fill'} tam={13} />
        </button>
        {!material && (
          <label className="nv-his-agregar__boton nv-his-agregar__boton--azul" title="Fotos de la galería">
            <Icono n="images-fill" tam={13} />
            <input type="file" accept="image/*" multiple hidden onChange={(ev) => { void fotos.subir(ev.target.files); ev.target.value = ''; }} />
          </label>
        )}
      </div>
      {grabadora.error && <p className="nv-his-col__error">{grabadora.error}</p>}
    </section>
  );
}

function Quien({ nombre, alQuitar }: { nombre: string; alQuitar: () => void }) {
  return (
    <footer className="nv-his-aporte__pie">
      <Inicial nombre={nombre} tam={16} />
      <span>{nombre}</span>
      <button type="button" className="nv-his-quitar" onClick={alQuitar} aria-label="Quitar" title="Quitar">
        <Icono n="x-bold" tam={9} />
      </button>
    </footer>
  );
}

function Aporte({ a, alQuitar }: { a: AporteHistoria; alQuitar: () => void }) {
  return (
    <article className={`nv-his-aporte nv-his-aporte--${a.tipo}`}>
      {a.tipo === 'texto' && <p>{a.texto}</p>}
      {a.tipo === 'audio' && a.url && <Audio url={a.url} duracion={a.duracion ?? 0} titulo={a.texto} />}
      {a.tipo === 'foto' && a.url && <span className="nv-his-aporte__foto" style={{ backgroundImage: `url(${a.url})` }} />}
      <Quien nombre={a.autor} alQuitar={alQuitar} />
    </article>
  );
}

export function Audio({ url, duracion, titulo, extra }: { url: string; duracion: number; titulo?: string; extra?: ReactNode }) {
  const el = useRef<HTMLAudioElement | null>(null);
  const [suena, setSuena] = useState(false);
  const mm = `${Math.floor(duracion / 60)}:${String(Math.round(duracion % 60)).padStart(2, '0')}`;
  const tocar = () => {
    if (!el.current) {
      el.current = new window.Audio(url);
      el.current.onended = () => setSuena(false);
    }
    if (suena) {
      el.current.pause();
      el.current.currentTime = 0;
      setSuena(false);
    } else {
      void el.current.play();
      setSuena(true);
    }
  };
  return (
    <div className="nv-his-audio">
      <button type="button" className="nv-his-audio__play" aria-label={suena ? 'Parar' : 'Oír'} onClick={tocar}>
        <Icono n={suena ? 'stop-fill' : 'play-fill'} tam={14} />
      </button>
      <span className="nv-his-audio__medio">
        {titulo && <span className="nv-his-audio__titulo">{titulo}</span>}
        <span className="nv-his-audio__onda" aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
            <span key={i} style={{ height: 3 + Math.round(Math.abs(Math.sin(i * 1.7) + Math.sin(i * 0.6)) * 5) }} />
          ))}
        </span>
      </span>
      <span className="nv-his-audio__tiempo">{mm}</span>
      {extra}
    </div>
  );
}

// ------------------------------------------------------------ estación 2: oportunidades

type IconoCategoria = 'buildings-fill' | 'lightbulb-fill' | 'users-three-fill' | 'briefcase-fill';
const CATEGORIAS: Record<OportunidadHistoria['categoria'], { nombre: string; color: string; icono: IconoCategoria }> = {
  estudiar: { nombre: 'ESTUDIAR', color: '#6ec8ff', icono: 'buildings-fill' },
  crear: { nombre: 'CREAR', color: '#b182ff', icono: 'lightbulb-fill' },
  participar: { nombre: 'PARTICIPAR', color: '#2ee6a8', icono: 'users-three-fill' },
  trabajar: { nombre: 'TRABAJAR', color: '#ffb020', icono: 'briefcase-fill' },
};
const TIPOS: Record<OportunidadHistoria['tipo'], { nombre: string; color: string }> = {
  inscripcion: { nombre: 'Inscripción', color: '#2ee6a8' },
  preinscripcion: { nombre: 'Preinscripción', color: '#ffd166' },
  formulario: { nombre: 'Formulario', color: '#6ec8ff' },
};

function Oportunidades() {
  const { proyecto, actualizar } = useProyecto();
  const autor = useAutor();
  const equipo = useEquipo();
  const ops = proyecto.historia.oportunidades ?? [];
  const [abierto, setAbierto] = useState(false);
  const [celebra, setCelebra] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<OportunidadHistoria['categoria']>('estudiar');
  const [tipo, setTipo] = useState<OportunidadHistoria['tipo']>('inscripcion');
  const [programa, setPrograma] = useState('');
  const [institucion, setInstitucion] = useState('');

  const conMatch = new Set(ops.flatMap((o) => o.personas));
  const nombres = [...new Set([...equipo.map((p) => p.nombre), ...conMatch, autor])];

  const tocar = (o: OportunidadHistoria) => {
    const esta = o.personas.includes(autor);
    actualizar((p) => {
      const x = (p.historia.oportunidades ?? []).find((y) => y.id === o.id);
      if (x) x.personas = esta ? x.personas.filter((n) => n !== autor) : [...x.personas, autor];
    });
    if (!esta) {
      setCelebra(o.id);
      window.setTimeout(() => setCelebra((c) => (c === o.id ? null : c)), 1600);
    }
  };

  const guardar = () => {
    if (!programa.trim()) return;
    actualizar((p) => void (p.historia.oportunidades ??= []).push({ id: nuevoId('oportunidad'), categoria, tipo, programa: programa.trim(), institucion: institucion.trim(), personas: [] }));
    setPrograma('');
    setInstitucion('');
    setAbierto(false);
  };

  return (
    <section className="nv-his-ops">
      <h2 className="nv-his-seccion">
        OPORTUNIDADES QUE ENCONTRARON <span>toquen una para decir «yo hice match»</span>
        <span className="nv-espacio" />
        <span className="nv-his-ops__equipo">
          {nombres.map((n) => (
            <Inicial key={n} nombre={n} tam={24} gris={!conMatch.has(n)} />
          ))}
        </span>
        <button type="button" className="nv-his-pildora" onClick={() => setAbierto(!abierto)}>
          <Icono n="plus-bold" tam={12} /> Agregar oportunidad
        </button>
      </h2>
      {abierto && (
        <div className="nv-his-ops__form">
          <div className="nv-his-chips">
            {(Object.keys(CATEGORIAS) as OportunidadHistoria['categoria'][]).map((c) => (
              <button key={c} type="button" className={`nv-his-chip ${categoria === c ? 'nv-his-chip--on' : ''}`} style={{ ['--c' as string]: CATEGORIAS[c].color }} onClick={() => setCategoria(c)}>
                <Icono n={CATEGORIAS[c].icono} tam={13} /> {CATEGORIAS[c].nombre.toLowerCase()}
              </button>
            ))}
          </div>
          <input className="nv-his-campo" placeholder="¿Qué oportunidad? (programa, convocatoria…)" value={programa} onChange={(ev) => setPrograma(ev.target.value)} />
          <input className="nv-his-campo" placeholder="¿De qué institución?" value={institucion} onChange={(ev) => setInstitucion(ev.target.value)} />
          <div className="nv-his-chips">
            {(Object.keys(TIPOS) as OportunidadHistoria['tipo'][]).map((t) => (
              <button key={t} type="button" className={`nv-his-chip ${tipo === t ? 'nv-his-chip--on' : ''}`} style={{ ['--c' as string]: TIPOS[t].color }} onClick={() => setTipo(t)}>
                {TIPOS[t].nombre}
              </button>
            ))}
            <span className="nv-espacio" />
            <button type="button" className="nv-his-boton" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button type="button" className="nv-his-boton nv-his-boton--si" onClick={guardar} disabled={!programa.trim()}>
              Guardar
            </button>
          </div>
        </div>
      )}
      <div className="nv-his-ops__tira">
        {ops.length === 0 && !abierto && <p className="nv-his-col__vacio">Todavía no hay oportunidades. Agreguen las que conozcan en la estación.</p>}
        {ops.map((o) => {
          const c = CATEGORIAS[o.categoria];
          const mia = o.personas.includes(autor);
          return (
            <div
              key={o.id}
              role="button"
              tabIndex={0}
              className={`nv-his-op ${mia ? 'nv-his-op--mia' : ''}`}
              style={{ ['--c' as string]: c.color }}
              onClick={() => tocar(o)}
              onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && tocar(o)}
              aria-pressed={mia}
            >
              <span className="nv-his-op__cat">
                <span className="nv-his-op__icono">
                  <Icono n={c.icono} tam={13} />
                </span>
                {c.nombre}
                <span className="nv-espacio" />
                <button
                  type="button"
                  className="nv-his-quitar"
                  aria-label="Quitar esta oportunidad"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    actualizar((p) => (p.historia.oportunidades = (p.historia.oportunidades ?? []).filter((x) => x.id !== o.id)));
                  }}
                >
                  <Icono n="x-bold" tam={9} />
                </button>
              </span>
              {o.institucion && <span className="nv-his-op__inst">{o.institucion}</span>}
              <strong className="nv-his-op__prog">{o.programa}</strong>
              <span className="nv-his-op__pie">
                <span style={{ color: TIPOS[o.tipo].color }}>● {TIPOS[o.tipo].nombre}</span>
                <span className="nv-espacio" />
                {o.personas.length === 0 ? (
                  <span className="nv-his-op__nadie">nadie aún</span>
                ) : (
                  <span className="nv-his-op__caras">
                    {o.personas.map((n) => (
                      <Inicial key={n} nombre={n} tam={20} />
                    ))}
                  </span>
                )}
              </span>
              {celebra === o.id && (
                <span className="nv-his-op__match">
                  <Icono n="handshake-fill" tam={26} />
                  ¡Es un match!
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ estación 5: personas

const COLOR_PERSONA = ['#6ec8ff', '#2ee6a8', '#ff6b81', '#ffd166', '#b182ff', '#ff9f43'];
const vacia = (x: PersonaHistoria) => !x.nombre.trim() && !x.respuestas.some((r) => r.texto || r.url) && !x.foto;
const respondidas = (x: PersonaHistoria) => x.respuestas.filter((r) => r.texto || r.url).length;

function Silueta() {
  return (
    <svg className="nv-his-silueta" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <circle cx="50" cy="38" r="17" />
      <ellipse cx="50" cy="100" rx="38" ry="36" />
    </svg>
  );
}

function Personas({ indice, alVolver }: { indice: number; alVolver: () => void }) {
  const e = ESTACIONES[indice];
  const { proyecto, actualizar } = useProyecto();
  const personas = proyecto.historia.personas ?? [];
  const [abierta, setAbierta] = useState<string | null>(null);
  const k = personas.findIndex((x) => x.id === abierta);
  const persona = k >= 0 ? personas[k] : undefined;
  const listas = personas.filter((x) => x.nombre.trim()).length;

  const nueva = () => {
    const id = nuevoId('persona');
    actualizar((p) => void (p.historia.personas ??= []).push({ id, nombre: '', colegio: '', respuestas: e.preguntas.map(() => ({})) }));
    setAbierta(id);
  };
  const cerrar = () => {
    actualizar((p) => (p.historia.personas = (p.historia.personas ?? []).filter((x) => !vacia(x))));
    setAbierta(null);
  };

  return (
    <div className="nv-his-est" style={{ ['--c' as string]: e.color }}>
      <Encabezado
        indice={indice}
        alVolver={persona ? cerrar : alVolver}
        derecha={
          persona && (
            <button type="button" className="nv-his-boton nv-his-boton--atras" onClick={cerrar}>
              <Icono n="caret-left-bold" tam={11} /> Todas las personas
            </button>
          )
        }
      />
      {persona ? (
        <Perfil
          persona={persona}
          color={COLOR_PERSONA[k % COLOR_PERSONA.length]}
          posicion={`${k + 1} de ${personas.length}`}
          alAnterior={k > 0 ? () => setAbierta(personas[k - 1].id) : undefined}
          alSiguiente={k < personas.length - 1 ? () => setAbierta(personas[k + 1].id) : undefined}
          preguntas={e.preguntas}
        />
      ) : (
        <div className="nv-his-personas">
          <button type="button" className="nv-his-persona nv-his-persona--nueva" onClick={nueva}>
            <span className="nv-his-persona__mas">
              <Icono n="plus-bold" tam={20} />
            </span>
            <span className="nv-his-persona__datos">
              <strong>Conocer a alguien</strong>
              <span>Su foto, su nombre y las 7 preguntas</span>
            </span>
          </button>
          {personas.map((x, i) => {
            const color = COLOR_PERSONA[i % COLOR_PERSONA.length];
            const n = respondidas(x);
            const palabra = x.respuestas[1]?.texto?.trim();
            const completa = n === e.preguntas.length;
            return (
              <button key={x.id} type="button" className="nv-his-persona" style={{ ['--p' as string]: color }} onClick={() => setAbierta(x.id)}>
                <span className="nv-his-persona__foto" style={x.foto ? { backgroundImage: `url(${x.foto})` } : undefined}>
                  {!x.foto && <Silueta />}
                </span>
                <span className="nv-his-persona__datos">
                  <strong>{x.nombre || 'Sin nombre'}</strong>
                  <span className="nv-his-persona__colegio">{x.colegio || 'Otro lab'}</span>
                  <span className="nv-his-persona__es">Medellín es…</span>
                  <span className="nv-his-persona__palabra">{palabra ? `«${palabra}»` : '…'}</span>
                  <span className="nv-his-persona__puntos">
                    {e.preguntas.map((_, j) => (
                      <span key={j} className={x.respuestas[j]?.texto || x.respuestas[j]?.url ? 'nv-his-persona__punto--on' : ''} />
                    ))}
                    <em className={completa ? 'nv-his-persona__completa' : ''}>{completa ? 'completa' : `${n} de ${e.preguntas.length}`}</em>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {persona ? (
        <Pie mensaje={`${persona.nombre || 'Sin nombre'} · ${respondidas(persona)} de ${e.preguntas.length} respuestas`} boton="Listo · volver a las personas" alTocar={cerrar} />
      ) : (
        <Pie
          ok={listas > 0}
          mensaje={listas > 0 ? plural(listas, 'persona entrevistada', 'personas entrevistadas') : 'Aún no conocen a nadie'}
          boton={listas > 0 ? 'Listo · volver al recorrido' : 'Volver al recorrido'}
          alTocar={alVolver}
        />
      )}
    </div>
  );
}

function Perfil({
  persona,
  color,
  posicion,
  alAnterior,
  alSiguiente,
  preguntas,
}: {
  persona: PersonaHistoria;
  color: string;
  posicion: string;
  alAnterior?: () => void;
  alSiguiente?: () => void;
  preguntas: string[];
}) {
  const { actualizar } = useProyecto();
  const [grabando, setGrabando] = useState<number | null>(null);
  const campos = useRef<(HTMLInputElement | null)[]>([]);
  const cambiar = (receta: (x: PersonaHistoria) => void) =>
    actualizar((p) => {
      const x = (p.historia.personas ?? []).find((y) => y.id === persona.id);
      if (x) receta(x);
    });
  const responder = (k: number, r: { texto?: string; url?: string; duracion?: number }) =>
    cambiar((x) => {
      while (x.respuestas.length < preguntas.length) x.respuestas.push({});
      x.respuestas[k] = { ...x.respuestas[k], ...r };
    });
  const grabadora = useGrabadora((g) => {
    if (grabando !== null) responder(grabando, { url: g.url, duracion: g.duracion });
    setGrabando(null);
  });
  const palabra = persona.respuestas[1]?.texto?.trim();
  const primerNombre = persona.nombre.trim().split(' ')[0];

  return (
    <div className="nv-his-perfil">
      <div className="nv-his-perfil__izq">
        <div className="nv-his-perfil__foto" style={{ ['--p' as string]: color, ...(persona.foto ? { backgroundImage: `url(${persona.foto})` } : {}) }}>
          {!persona.foto && <Silueta />}
          <span className="nv-his-perfil__barras">
            {preguntas.map((_, j) => (
              <span key={j} className={persona.respuestas[j]?.texto || persona.respuestas[j]?.url ? 'nv-his-perfil__barra--on' : ''} />
            ))}
          </span>
          <label className="nv-his-perfil__camara" title="Su foto, de la galería">
            <Icono n="camera-fill" tam={15} />
            <input type="file" accept="image/*" hidden onChange={(ev) => { const f = ev.target.files?.[0]; if (f) cambiar((x) => (x.foto = crearUrl(f))); }} />
          </label>
          <div className="nv-his-perfil__datos">
            <input className="nv-his-perfil__nombre" placeholder="Su nombre" value={persona.nombre} autoFocus={!persona.nombre} onChange={(ev) => cambiar((x) => (x.nombre = ev.target.value))} />
            <input className="nv-his-perfil__colegio" placeholder="Su colegio o lab" value={persona.colegio} onChange={(ev) => cambiar((x) => (x.colegio = ev.target.value))} />
            {palabra && (
              <span className="nv-his-perfil__es">
                Medellín es <strong>«{palabra}»</strong>
              </span>
            )}
          </div>
        </div>
        <div className="nv-his-perfil__nav">
          <button type="button" onClick={alAnterior} disabled={!alAnterior} aria-label="Persona anterior">
            <Icono n="arrow-left-bold" tam={14} />
          </button>
          <span>{posicion}</span>
          <button type="button" onClick={alSiguiente} disabled={!alSiguiente} aria-label="Persona siguiente">
            <Icono n="arrow-right-bold" tam={14} />
          </button>
        </div>
      </div>
      <div className="nv-his-perfil__der">
        <h2 className="nv-his-seccion">LO QUE CONTÓ {(primerNombre || 'ESTA PERSONA').toUpperCase()}</h2>
        <div className="nv-his-perfil__resp">
          {preguntas.map((q, k) => {
            const r = persona.respuestas[k] ?? {};
            const este = grabando === k && grabadora.estado === 'grabando';
            return (
              <div key={k} className={`nv-his-q ${k === preguntas.length - 1 ? 'nv-his-q--ancha' : ''}`}>
                <span className="nv-his-q__p">{q}</span>
                {r.url ? (
                  <Audio
                    url={r.url}
                    duracion={r.duracion ?? 0}
                    extra={
                      <>
                        <input className="nv-his-q__r nv-his-q__r--lleno nv-his-q__r--junto" placeholder="«En palabras…»" value={r.texto ?? ''} onChange={(ev) => responder(k, { texto: ev.target.value })} />
                        <button type="button" className="nv-his-quitar" aria-label="Quitar el audio" onClick={() => responder(k, { url: undefined, duracion: undefined })}>
                          <Icono n="x-bold" tam={9} />
                        </button>
                      </>
                    }
                  />
                ) : (
                  <span className="nv-his-q__fila">
                    <input
                      ref={(el) => void (campos.current[k] = el)}
                      className={`nv-his-q__r ${r.texto ? 'nv-his-q__r--lleno' : ''}`}
                      placeholder="Pregúntale…"
                      value={r.texto ?? ''}
                      onChange={(ev) => responder(k, { texto: ev.target.value })}
                    />
                    {!r.texto && (
                      <>
                        <button type="button" className="nv-his-agregar__boton" aria-label="Escribir su respuesta" onClick={() => campos.current[k]?.focus()}>
                          <Icono n="pencil-simple-fill" tam={12} />
                        </button>
                        <button
                          type="button"
                          className={`nv-his-agregar__boton nv-his-agregar__boton--rojo ${este ? 'nv-his-agregar__boton--grabando' : ''}`}
                          aria-label={este ? 'Parar' : 'Grabar su respuesta'}
                          onClick={() => {
                            if (este) return grabadora.parar();
                            setGrabando(k);
                            void grabadora.empezar();
                          }}
                        >
                          <Icono n={este ? 'stop-fill' : 'microphone-fill'} tam={12} />
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ estación 6: fotos

function FotosMaterial({ estacion }: { estacion: number }) {
  const { proyecto, actualizar } = useProyecto();
  const fotos = aportesColumna(proyecto, estacion, 'fotos');
  const { leyendo, subir } = useSubirFotos(estacion, 'fotos');
  const entrada = <input type="file" accept="image/*" multiple hidden onChange={(ev) => { void subir(ev.target.files); ev.target.value = ''; }} />;
  return (
    <section className="nv-his-col nv-his-col--fotos">
      <header className="nv-his-col__cabeza">
        <span className="nv-his-col__estado nv-his-col__estado--material">
          <Icono n="images-fill" tam={11} />
        </span>
        <span className="nv-his-col__etiqueta">MATERIAL</span>
        <span className="nv-espacio" />
        {fotos.length > 0 && <span className="nv-his-col__cuenta">{fotos.length}</span>}
      </header>
      <h3 className="nv-his-col__pregunta">Fotos para lo visual</h3>
      <div className="nv-his-fotos">
        {fotos.map((f) => (
          <figure key={f.id} className="nv-his-foto" style={{ backgroundImage: `url(${f.url})` }}>
            <span className="nv-his-foto__quien">
              <Inicial nombre={f.autor} tam={18} />
            </span>
            <button type="button" className="nv-his-quitar nv-his-foto__quitar" aria-label="Quitar esta foto" onClick={() => actualizar((p) => (p.historia.aportes = aportesDe(p).filter((x) => x.id !== f.id)))}>
              <Icono n="x-bold" tam={9} />
            </button>
            <label className="nv-his-foto__fuente">
              Fuente:
              <input
                placeholder="foto nuestra"
                value={f.texto ?? ''}
                onChange={(ev) =>
                  actualizar((p) => {
                    const a = aportesDe(p).find((x) => x.id === f.id);
                    if (a) a.texto = ev.target.value;
                  })
                }
              />
            </label>
          </figure>
        ))}
        <label className="nv-his-foto nv-his-foto--mas">
          <Icono n="plus-bold" tam={20} />
          {leyendo ? 'Leyendo…' : fotos.length ? 'Subir más' : 'Subir fotos'}
          {entrada}
        </label>
      </div>
      <label className="nv-his-agregar nv-his-agregar--tocable">
        <span className="nv-his-agregar__texto">Subir fotos de la galería · si no son suyas, anoten la fuente</span>
        <span className="nv-espacio" />
        <span className="nv-his-agregar__boton nv-his-agregar__boton--azul">
          <Icono n="images-fill" tam={13} />
        </span>
        {entrada}
      </label>
    </section>
  );
}
