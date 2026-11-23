// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La pestaña Visuales de una escena, o de toda la pieza (General).
 *
 * A la izquierda se arma la imagen; a la derecha se ve, con el estilo y la
 * paleta debajo. A la izquierda, arriba, las fotos (se pueden subir varias)
 * y debajo dos apartados:
 *
 *  - Mover la imagen: cada parámetro del estilo es una caja, y los datos
 *    (la emoción, la voz, cada instrumento, la luz o el color de cada foto)
 *    son cajitas. Se arrastra una cajita a una caja —o se toca la cajita y
 *    luego la caja— y ese parámetro se mueve con ese dato. La caja muestra
 *    cuánto (poco, algo, mucho) y una barrita que se mueve en vivo.
 *  - Golpes: la misma vista de celdas de la música. Cada efecto (destello,
 *    zoom, giro…) es una fila y cada casilla, un momento de la vuelta.
 *
 * Reemplaza a la lista de Datos (y al tablero y al pad que se probaron y no
 * funcionaron). Las cajitas se guardan en conexionesVisual y los golpes, en
 * efectosPasos (ver estado/efectos.ts).
 */
import { createContext, useContext, useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero, ReactNode } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { crearUrl } from '../estado/guardado';
import { buscarEscena, recorrido } from '../estado/escenas';
import { NOMBRE_ESTILO, NOMBRE_GOLPE, ORDEN_ESTILOS, ORDEN_GOLPES, sorprender } from '../estado/imagen';
import { efectosAlAzar, PARAMETROS_OBRA, pasosEfectosDe, ponerPasoEfecto } from '../estado/efectos';
import { useCabezaLectora } from '../hooks/useCabezaLectora';
import { usePintarArrastrando } from '../hooks/usePintarArrastrando';
import { leerArchivoDatos, nuevaConexion } from '../estado/musica';
import { COLOR_GRUPO, valorDato, type GrupoFuente } from '../estado/datos';
import type { Conexion, Escena, GolpeVisual, Proyecto } from '../estado/tipos';
import { algoritmoDe, valoresPorDefecto, type Mando } from '../visual/algoritmos';
import { PALETAS } from '../visual/paletas';
import { enVivo } from '../visual/enVivo';
import { motorAudio } from '../audio/motorAudio';
import { PistaMano, usePista } from './PistaMano';
import { Escenario } from './Escenario';
import { useCuadro } from './useCuadro';

interface Props {
  escena: Escena | null;
  indice: number;
}

type Apartado = 'mover' | 'golpes';

export function ImagenEscena({ escena }: Props) {
  const [apartado, setApartado] = useState<Apartado>('mover');
  return (
    <div className="nv-pestana">
      <div className="nv-imagen nv-imagen--cajitas">
        <div className="nv-imagen__mesa">
          <Fotos escena={escena} />
          <div className="nv-selector nv-selector--lleno" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={apartado === 'mover'}
              className={`nv-selector__op ${apartado === 'mover' ? 'nv-selector__op--activa' : ''}`}
              onClick={() => setApartado('mover')}
            >
              Mover la imagen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={apartado === 'golpes'}
              className={`nv-selector__op ${apartado === 'golpes' ? 'nv-selector__op--activa' : ''}`}
              onClick={() => setApartado('golpes')}
            >
              Golpes
            </button>
          </div>
          {apartado === 'mover' ? <Mover escena={escena} /> : <Golpes escena={escena} />}
        </div>
        <div className="nv-imagen__vista">
          <Escenario escenaFija={escena?.id} />
          <Estilos />
          <Paletas />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ estilo, paletas y fotos

function Estilos() {
  const { proyecto, actualizar } = useProyecto();
  const v = proyecto.visual;
  return (
    <div className="nv-cajitas__estilos" data-bloqueo="visual:estilo">
      {ORDEN_ESTILOS.map((a) => (
        <button
          key={a}
          type="button"
          className={`nv-estilo-chico nv-estilo--${a} ${v.algoritmo === a ? 'nv-estilo-chico--activo' : ''}`}
          onClick={() => actualizar((p) => (p.visual.algoritmo = a))}
          title={NOMBRE_ESTILO[a]}
        >
          <span className="nv-estilo__muestra" />
          <span className="nv-estilo-chico__nombre">{NOMBRE_ESTILO[a]}</span>
        </button>
      ))}
      <button type="button" className="nv-boton nv-boton--sorpresa nv-sorpresa-estilo" onClick={() => actualizar(sorprender)} title="Un estilo, unos mandos y unos colores al azar">
        ✦ Sorpréndeme
      </button>
    </div>
  );
}

function Paletas() {
  const { proyecto, actualizar } = useProyecto();
  const v = proyecto.visual;
  return (
    <div className="nv-paletas" data-bloqueo="visual:paleta">
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
    </div>
  );
}

/** Las fotos subidas como imágenes. */
function fotosDe(p: Proyecto) {
  return p.archivosDatos.filter((a) => a.tipo === 'imagen');
}

/**
 * Las fotos del proyecto, en fila. Cada una da sus cajitas (luz, color,
 * bordes). Tocar una la pone de fondo: el material de la obra, que toma su
 * forma, en esta escena (o en toda la pieza, desde General); la × la quita
 * del proyecto.
 *
 * El primer recuadro, «Fondo», es la foto de fondo a la vista: vacío, se toca
 * para elegir una foto, que queda de fondo y también entre las fotos (con sus
 * cajitas); con foto, su × la quita del fondo (sin borrarla del proyecto).
 */
function Fotos({ escena }: { escena: Escena | null }) {
  const { proyecto, actualizar } = useProyecto();
  const [leyendo, setLeyendo] = useState(false);
  const fotos = fotosDe(proyecto);
  const material = escena ? escena.imagenUrl : proyecto.visual.imagenUrl;

  /** Sube fotos; con `deFondo`, la primera queda además de fondo de la obra. */
  const subir = async (archivos: FileList | null, deFondo = false) => {
    if (!archivos?.length) return;
    setLeyendo(true);
    try {
      for (const [i, archivo] of Array.from(archivos).entries()) {
        const datos = await leerArchivoDatos(archivo);
        const url = crearUrl(archivo);
        actualizar((p) => {
          const n = fotosDe(p).length + 1;
          p.archivosDatos.push({ ...datos, nombre: `Foto ${n}`, url });
          if (deFondo && i === 0) {
            const e = escena && buscarEscena(p, escena.id);
            if (e) e.imagenUrl = url;
            else p.visual.imagenUrl = url;
          }
        });
      }
    } finally {
      setLeyendo(false);
    }
  };

  const ponerMaterial = (url: string | undefined) =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      const nueva = (e ? e.imagenUrl : p.visual.imagenUrl) === url ? undefined : url;
      if (e) e.imagenUrl = nueva;
      else p.visual.imagenUrl = nueva;
    });

  const quitar = (id: string) =>
    actualizar((p) => {
      p.archivosDatos = p.archivosDatos.filter((a) => a.id !== id);
      p.conexionesVisual = p.conexionesVisual.filter((c) => !c.fuente.startsWith(`archivo:${id}`));
    });

  const quitarFondo = () =>
    actualizar((p) => {
      const e = escena && buscarEscena(p, escena.id);
      if (e) e.imagenUrl = undefined;
      else p.visual.imagenUrl = undefined;
    });

  return (
    <div className="nv-fotos" data-bloqueo="visual:fotos">
      {material ? (
        <span className="nv-foto-chica nv-foto-fondo nv-foto-fondo--puesta">
          <label className="nv-foto-chica__imagen" style={{ backgroundImage: `url(${material})` }} title="Cambiar la foto de fondo">
            <span className="nv-foto-chica__obra">fondo</span>
            <input type="file" accept="image/*" hidden onChange={(ev) => void subir(ev.target.files, true)} />
          </label>
          <span className="nv-foto-chica__nombre">{escena ? 'Fondo de la escena' : 'Fondo de la pieza'}</span>
          <button type="button" className="nv-foto-chica__quitar" aria-label="Quitar la foto de fondo" title="Quitar la foto de fondo" onClick={quitarFondo}>
            ×
          </button>
        </span>
      ) : (
        <label className="nv-foto-chica nv-foto-fondo" title="La obra toma la forma de esta foto">
          <span className="nv-foto-chica__imagen">{leyendo ? '…' : '🖼'}</span>
          <span className="nv-foto-chica__nombre">{leyendo ? 'Leyendo' : 'Foto de fondo'}</span>
          <input type="file" accept="image/*" hidden onChange={(ev) => void subir(ev.target.files, true)} />
        </label>
      )}
      <span className="nv-fotos__separa" aria-hidden />
      <span className="nv-cajitas__titulo">Fotos</span>
      {fotos.map((f) => (
        <span key={f.id} className={`nv-foto-chica ${f.url && f.url === material ? 'nv-foto-chica--obra' : ''}`}>
          <button
            type="button"
            className="nv-foto-chica__imagen"
            style={f.url ? { backgroundImage: `url(${f.url})` } : { background: `linear-gradient(90deg, ${(f.colores ?? ['#444', '#888']).join(',')})` }}
            onClick={() => f.url && ponerMaterial(f.url)}
            title={f.url === material ? 'Quitar de la obra' : 'Usarla de fondo en la obra'}
          >
            {f.url && f.url === material && <span className="nv-foto-chica__obra">en la obra</span>}
          </button>
          <span className="nv-foto-chica__nombre">{f.nombre}</span>
          <button type="button" className="nv-foto-chica__quitar" aria-label={`Quitar ${f.nombre}`} onClick={() => quitar(f.id)}>
            ×
          </button>
        </span>
      ))}
      <label className="nv-foto-chica nv-foto-chica--subir">
        <span className="nv-foto-chica__imagen">{leyendo ? '…' : '+'}</span>
        <span className="nv-foto-chica__nombre">{leyendo ? 'Leyendo' : 'Subir foto'}</span>
        <input type="file" accept="image/*" multiple hidden onChange={(ev) => void subir(ev.target.files)} />
      </label>
    </div>
  );
}

// ------------------------------------------------------------ cajitas y arrastre

interface Cajita {
  /** La clave del dato: 'emocion', 'golpe:<id>', 'archivo:<id>:luz'… */
  clave: string;
  nombre: string;
  grupo: GrupoFuente;
  /** Si es de una foto: cuál (su nombre y su imagen, para la miniatura). */
  foto?: { nombre: string; url?: string; primera: boolean };
}

interface Arrastre {
  cajita: Cajita;
  x: number;
  y: number;
}

/** La cajita escogida (tocada) o arrastrada, compartida entre la bandeja y las cajas. */
const Mano = createContext<{
  escogida: Cajita | null;
  setEscogida: (c: Cajita | null) => void;
  arrastre: Arrastre | null;
  setArrastre: (a: Arrastre | null) => void;
  soltar: (destino: string, cajita: Cajita) => void;
} | null>(null);

function useMano() {
  return useContext(Mano)!;
}

/** El contenedor de un apartado: sabe qué cajita va en la mano y dónde se suelta. */
function MesaDeCajitas({ soltar, children }: { soltar: (destino: string, cajita: Cajita) => void; children: ReactNode }) {
  const [escogida, setEscogida] = useState<Cajita | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  return (
    <Mano.Provider value={{ escogida, setEscogida, arrastre, setArrastre, soltar }}>
      <div className={`nv-cajitas ${escogida || arrastre ? 'nv-cajitas--en-mano' : ''}`}>{children}</div>
      {arrastre && (
        <span
          className="nv-cajita nv-cajita--fantasma"
          style={{ left: arrastre.x, top: arrastre.y, ['--color' as string]: COLOR_GRUPO[arrastre.cajita.grupo] }}
        >
          {arrastre.cajita.nombre}
        </span>
      )}
    </Mano.Provider>
  );
}

/** Una cajita de la bandeja: se arrastra a una caja, o se toca y luego se toca la caja. */
function CajitaArrastrable({ cajita, entera = false }: { cajita: Cajita; entera?: boolean }) {
  const { escogida, setEscogida, setArrastre, soltar } = useMano();
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const moviendo = useRef(false);
  const elegida = escogida?.clave === cajita.clave;

  const destinoEn = (x: number, y: number) =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-caja]')?.dataset.caja;

  return (
    <button
      type="button"
      className={`nv-cajita ${elegida ? 'nv-cajita--escogida' : ''} ${cajita.foto?.primera ? 'nv-cajita--nueva-foto' : ''} ${entera ? 'nv-cajita--foto-entera' : ''}`}
      style={{ ['--color' as string]: COLOR_GRUPO[cajita.grupo] }}
      onPointerDown={(ev: EventoPuntero<HTMLButtonElement>) => {
        ev.currentTarget.setPointerCapture(ev.pointerId);
        inicio.current = { x: ev.clientX, y: ev.clientY };
        moviendo.current = false;
      }}
      onPointerMove={(ev) => {
        const i = inicio.current;
        if (!i) return;
        if (!moviendo.current && Math.hypot(ev.clientX - i.x, ev.clientY - i.y) > 8) moviendo.current = true;
        if (!moviendo.current) return;
        setArrastre({ cajita, x: ev.clientX, y: ev.clientY });
        // Si las cajas se desplazan solas (Visuales, paso 3), acercarse al borde las corre.
        const lista = document.querySelector<HTMLElement>('.nv-receta .nv-cajas');
        if (lista && lista.scrollHeight > lista.clientHeight) {
          const r = lista.getBoundingClientRect();
          if (ev.clientY < r.top + 56) lista.scrollTop -= 16;
          else if (ev.clientY > r.bottom - 56) lista.scrollTop += 16;
        }
      }}
      onPointerUp={(ev) => {
        if (moviendo.current) {
          const destino = destinoEn(ev.clientX, ev.clientY);
          if (destino) soltar(destino, cajita);
          setArrastre(null);
          setEscogida(null);
        } else {
          setEscogida(elegida ? null : cajita);
        }
        inicio.current = null;
        moviendo.current = false;
      }}
      onPointerCancel={() => {
        setArrastre(null);
        inicio.current = null;
      }}
      title={entera ? cajita.nombre : cajita.foto ? `${cajita.foto.nombre} · ${cajita.nombre}` : cajita.nombre}
    >
      {entera ? (
        <>
          <span className="nv-cajita__foto" style={cajita.foto?.url ? { backgroundImage: `url(${cajita.foto.url})` } : undefined} />
          <span className="nv-cajita__pie-foto">{cajita.nombre}</span>
        </>
      ) : null}
      {!entera && cajita.foto && (
        <span
          className="nv-cajita__mini"
          style={cajita.foto.url ? { backgroundImage: `url(${cajita.foto.url})` } : undefined}
          aria-label={cajita.foto.nombre}
        />
      )}
      {!entera && cajita.nombre}
    </button>
  );
}

/** Una caja donde se sueltan cajitas. Con una cajita escogida, tocarla la pone aquí. */
function Caja({ destino, titulo, alProbar, children, bloqueo }: { destino: string; titulo: string; alProbar?: () => void; children: ReactNode; bloqueo: string }) {
  const { escogida, setEscogida, soltar } = useMano();
  return (
    <div
      className={`nv-caja ${escogida ? 'nv-caja--recibe' : ''}`}
      data-caja={destino}
      data-bloqueo={bloqueo}
      onClick={() => {
        if (!escogida) return;
        soltar(destino, escogida);
        setEscogida(null);
      }}
    >
      <span className="nv-caja__titulo">
        {titulo}
        {alProbar && (
          <button
            type="button"
            className="nv-caja__probar"
            onClick={(ev) => {
              ev.stopPropagation();
              alProbar();
            }}
            title="Probar el efecto"
          >
            ▶
          </button>
        )}
      </span>
      {children}
    </div>
  );
}

/**
 * La familia de las fotos, siempre arriba del estante: «Subir foto» y, al lado,
 * cada foto con sus cajitas (luz, color, bordes). Si hay muchas, la fila se
 * desliza de lado en vez de crecer.
 */
function FamiliaFotos({ cajitas }: { cajitas: Cajita[] }) {
  const { actualizar } = useProyecto();
  const [leyendo, setLeyendo] = useState(false);
  const fotos = cajitas.filter((c) => c.foto?.primera);

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setLeyendo(true);
    try {
      for (const archivo of Array.from(archivos)) {
        const datos = await leerArchivoDatos(archivo);
        const url = crearUrl(archivo);
        actualizar((p) => {
          p.archivosDatos.push({ ...datos, nombre: `Foto ${fotosDe(p).length + 1}`, url });
        });
      }
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <div className="nv-estante__familia" style={{ ['--color' as string]: COLOR_GRUPO.foto }} data-bloqueo="visual:fotos">
      <span className="nv-estante__titulo">
        Fotos
        <span className="nv-estante__cuantas">{fotos.length}</span>
      </span>
      <div className="nv-estante__fotos">
        {/* Cada foto es una sola cajita: la foto entera. En la caja se elige qué se lee de ella (luz, color, bordes). */}
        {fotos.map((primera) => (
          <CajitaArrastrable key={primera.clave} cajita={{ ...primera, nombre: primera.foto!.nombre }} entera />
        ))}
        <label className="nv-estante__subir" title="Subir fotos de la galería">
          <span className="nv-estante__mas">{leyendo ? '…' : '+'}</span>
          {leyendo ? 'Leyendo' : 'Subir'}
          <input type="file" accept="image/*" multiple hidden onChange={(ev) => void subir(ev.target.files)} />
        </label>
      </div>
    </div>
  );
}

/**
 * La bandeja tiene alto fijo: una pestaña por grupo (Relato, Sonido,
 * Instrumentos, Fotos) y una sola fila con las cajitas del grupo elegido.
 * Si no caben (muchas fotos), la fila se desliza de lado en vez de crecer.
 */
function Bandeja({ grupos, estante = false }: { grupos: { titulo: string; cajitas: Cajita[] }[]; estante?: boolean }) {
  const { escogida } = useMano();
  const llenos = grupos.filter((g) => g.cajitas.length > 0);
  const [elegido, setElegido] = useState(llenos[0]?.titulo ?? '');
  const actual = llenos.find((g) => g.titulo === elegido) ?? llenos[0];
  // El estante muestra todas las familias a la vez, una debajo de otra (Visuales, paso 3).
  if (estante) {
    return (
      <div className="nv-estante">
        {escogida && (
          <span className="nv-estante__aviso">
            Toca una caja para poner «{escogida.foto ? `${escogida.foto.nombre} · ` : ''}
            {escogida.nombre}»
          </span>
        )}
        {grupos
          .filter((g) => g.cajitas.length > 0 || g.titulo === 'Fotos')
          .map((g) =>
            g.titulo === 'Fotos' ? (
              <FamiliaFotos key={g.titulo} cajitas={g.cajitas} />
            ) : (
              <div key={g.titulo} className="nv-estante__familia" style={{ ['--color' as string]: COLOR_GRUPO[g.cajitas[0].grupo] }}>
                <span className="nv-estante__titulo">
                  {g.titulo}
                  <span className="nv-estante__cuantas">{g.cajitas.length}</span>
                </span>
                <div className="nv-estante__cajitas">
                  {g.cajitas.map((c) => (
                    <CajitaArrastrable key={c.clave} cajita={c} />
                  ))}
                </div>
              </div>
            ),
          )}
        <span className="nv-estante__pista">Arrastra una cajita a una caja, o tócala y luego toca la caja.</span>
      </div>
    );
  }
  return (
    <div className="nv-bandeja">
      <div className="nv-bandeja__cabeza">
        <span className="nv-cajitas__titulo">
          {escogida ? `Toca una caja para poner «${escogida.foto ? `${escogida.foto.nombre} · ` : ''}${escogida.nombre}»` : 'Cajitas'}
        </span>
        <span className="nv-bandeja__pestanas" role="tablist">
          {llenos.map((g) => (
            <button
              key={g.titulo}
              type="button"
              role="tab"
              aria-selected={g === actual}
              className={`nv-bandeja__pestana ${g === actual ? 'nv-bandeja__pestana--activa' : ''}`}
              style={{ ['--color' as string]: COLOR_GRUPO[g.cajitas[0].grupo] }}
              onClick={() => setElegido(g.titulo)}
            >
              {g.titulo}
            </button>
          ))}
        </span>
      </div>
      <div className="nv-bandeja__fila">
        {actual?.cajitas.map((c) => (
          <CajitaArrastrable key={c.clave} cajita={c} />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ mover la imagen

const RELATO: Cajita[] = [
  { clave: 'emocion', nombre: 'Emoción', grupo: 'relato' },
  { clave: 'fuerza', nombre: 'Fuerza', grupo: 'relato' },
  { clave: 'escena', nombre: 'Avance', grupo: 'relato' },
  { clave: 'palabra', nombre: 'Palabras', grupo: 'relato' },
];
const SONIDO: Cajita[] = [
  { clave: 'voz', nombre: 'Voz', grupo: 'sonido' },
  { clave: 'volumen', nombre: 'Volumen', grupo: 'sonido' },
  { clave: 'graves', nombre: 'Graves', grupo: 'sonido' },
  { clave: 'agudos', nombre: 'Agudos', grupo: 'sonido' },
  { clave: 'pulso', nombre: 'Pulso', grupo: 'sonido' },
];
const CANALES_FOTO: { canal: string; nombre: string }[] = [
  { canal: 'luz', nombre: 'Luz' },
  { canal: 'tono', nombre: 'Color' },
  { canal: 'detalle', nombre: 'Bordes' },
];

function cajitasDeDatos(p: Proyecto): { titulo: string; cajitas: Cajita[] }[] {
  // De arriba a abajo: fotos, instrumentos, sonido y relato.
  return [
    {
      titulo: 'Fotos',
      cajitas: fotosDe(p).flatMap((f) =>
        CANALES_FOTO.map((c, k) => ({
          clave: `archivo:${f.id}:${c.canal}`,
          nombre: c.nombre,
          grupo: 'foto' as const,
          foto: { nombre: f.nombre, url: f.url, primera: k === 0 },
        })),
      ),
    },
    {
      titulo: 'Instrumentos',
      cajitas: [
        ...p.patron.filas.map((f) => ({ clave: `golpe:${f.id}`, nombre: f.nombre, grupo: 'instrumento' as const })),
        { clave: 'golpe:melodia', nombre: 'Melodía', grupo: 'instrumento' },
      ],
    },
    { titulo: 'Sonido', cajitas: SONIDO },
    { titulo: 'Relato', cajitas: RELATO },
  ];
}

/** El nombre de una cajita ya puesta, con su foto si es de una. */
function nombreDeCajita(p: Proyecto, clave: string): { nombre: string; grupo: GrupoFuente } {
  for (const g of cajitasDeDatos(p)) {
    const c = g.cajitas.find((x) => x.clave === clave);
    if (c) return { nombre: c.foto ? `${c.foto.nombre} · ${c.nombre}` : c.nombre, grupo: c.grupo };
  }
  if (clave === 'bombo') return { nombre: 'Bombo', grupo: 'sonido' };
  return { nombre: clave.startsWith('foto:') ? 'Foto de la escena' : clave, grupo: clave.startsWith('foto:') ? 'foto' : 'relato' };
}

const CUANTO: Record<Conexion['cantidad'], string> = { 1: 'poco', 2: 'algo', 3: 'mucho' };

/** La caja «Colores» toma la paleta de la emoción o los colores de una foto. */
const aceptaColores = (clave: string) => clave === 'emocion' || clave.startsWith('archivo:');
/** Cuántas cajas se ven de entrada; las demás, con «ver más». */
const CAJAS_A_LA_VISTA = 9;

export function Mover({ escena, estante = false }: { escena: Escena | null; estante?: boolean }) {
  const { proyecto, actualizar } = useProyecto();
  const [todas, setTodas] = useState(estante);
  // Los mandos son los del estilo que se ve: el de la escena si tiene uno propio.
  const alg = algoritmoDe(escena?.algoritmo ?? proyecto.visual.algoritmo);
  const valores = { ...valoresPorDefecto(alg), ...(proyecto.visual.parametros[alg.id] ?? {}) };
  const barras = useRef(new Map<string, HTMLSpanElement>());
  const conexion = (destino: string) => proyecto.conexionesVisual.find((c) => c.destino === destino);

  // Las barritas se mueven con su dato, sin redibujar la pantalla.
  useCuadro(() => {
    const lista = recorrido(proyecto);
    const sonando = motorAudio.estaSonando;
    const actual = sonando ? lista[motorAudio.seccionActual] : (escena ?? lista[0]);
    const contexto = {
      proyecto,
      escena: actual,
      sonando,
      fraccion: sonando ? motorAudio.fraccionSeccion : 0.5,
      avance: sonando ? motorAudio.progresoPieza : 0,
      vivo: motorAudio.vivo(),
    };
    for (const c of proyecto.conexionesVisual) {
      const barra = barras.current.get(c.destino);
      if (barra) barra.style.width = `${Math.round(valorDato(c.fuente, contexto) * 100)}%`;
    }
  });

  const soltar = (destino: string, cajita: Cajita) => {
    // Los colores solo pueden salir de la emoción o de una foto.
    if (destino === 'paleta' && !aceptaColores(cajita.clave)) return;
    actualizar((p) => {
      const previa = p.conexionesVisual.find((c) => c.destino === destino);
      if (previa) previa.fuente = cajita.clave;
      else p.conexionesVisual.push(nuevaConexion(cajita.clave, destino));
    });
  };

  const quitar = (destino: string) => actualizar((p) => (p.conexionesVisual = p.conexionesVisual.filter((c) => c.destino !== destino)));
  const masFuerza = (destino: string) =>
    actualizar((p) => {
      const c = p.conexionesVisual.find((x) => x.destino === destino);
      if (c) c.cantidad = ((c.cantidad % 3) + 1) as Conexion['cantidad'];
    });
  const aMano = (m: Mando, f: number) =>
    actualizar((p) => {
      const crudo = m.min + f * (m.max - m.min);
      (p.visual.parametros[alg.id] ??= {})[m.id] = m.opciones ? Math.round(crudo) : crudo;
    });

  // Primero lo que sirve con cualquier estilo, luego los mandos del estilo y al final el resto de la obra.
  const obra = (id: string) => {
    const x = PARAMETROS_OBRA.find((y) => y.id === id)!;
    return { destino: `obra:${x.id}`, titulo: x.etiqueta, obra: x.id };
  };
  const cajas: { destino: string; titulo: string; mando?: Mando; obra?: string }[] = [
    { destino: 'paleta', titulo: 'Colores' },
    obra('brillo'),
    obra('zoom'),
    obra('giro'),
    ...alg.mandos.map((m) => ({ destino: m.id, titulo: m.etiqueta, mando: m })),
    obra('tono'),
    obra('saturacion'),
  ];
  const visibles = todas ? cajas : cajas.slice(0, CAJAS_A_LA_VISTA);
  // La pista enseña a soltar una cajita en una caja; se va cuando ya pusieron una.
  const puestas = useRef(proyecto.conexionesVisual.length);
  const pista = usePista('cajitas', estante && proyecto.conexionesVisual.length > puestas.current, 2, undefined, estante);

  return (
    <MesaDeCajitas soltar={soltar}>
      {estante && pista.visible && (
        <PistaMano
          modo="arrastrar"
          etiqueta="Voz"
          texto="Arrastra una cajita a una caja: así se mueve esa parte de la imagen."
          origen={() => [...document.querySelectorAll('.nv-estante .nv-cajita')].find((e) => e.textContent?.trim() === 'Voz') ?? document.querySelector('.nv-estante .nv-cajita')}
          destinos={() => {
            const lista = document.querySelector('.nv-cajas')?.getBoundingClientRect();
            const libre = [...document.querySelectorAll<HTMLElement>('.nv-cajas .nv-caja[data-caja]')].filter((e) => e.dataset.caja !== 'paleta' && e.querySelector('.nv-caja__vacia'));
            const visible = libre.find((e) => lista && e.getBoundingClientRect().top >= lista.top && e.getBoundingClientRect().bottom <= lista.bottom);
            return visible ? [visible] : [];
          }}
          alCerrar={pista.cerrar}
        />
      )}
      <div className="nv-cajas">
        {visibles.map(({ destino, titulo, mando, obra: idObra }) => {
          const c = conexion(destino);
          const dato = c && nombreDeCajita(proyecto, c.fuente);
          return (
            <Caja key={destino} destino={destino} titulo={titulo} bloqueo={`visual:caja:${destino}`}>
              {c && dato ? (
                <>
                  <span className="nv-caja__puesta" style={{ ['--color' as string]: COLOR_GRUPO[dato.grupo] }}>
                    {c.fuente.startsWith('archivo:') && destino !== 'paleta' && c.fuente.split(':').length === 3 ? (
                      <>
                        <span className="nv-caja__dato">{dato.nombre.split(' · ')[0]} ·</span>
                        <select
                          className="nv-caja__canal"
                          value={c.fuente.split(':')[2]}
                          onClick={(ev) => ev.stopPropagation()}
                          onChange={(ev) => {
                            const [, id] = c.fuente.split(':');
                            soltar(destino, { clave: `archivo:${id}:${ev.target.value}`, nombre: '', grupo: 'foto' });
                          }}
                          aria-label="Qué se lee de la foto"
                        >
                          {CANALES_FOTO.map((k) => (
                            <option key={k.canal} value={k.canal}>
                              {k.nombre.toLowerCase()}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <span className="nv-caja__dato">{dato.nombre}</span>
                    )}
                    <button
                      type="button"
                      className="nv-caja__quitar"
                      aria-label={`Quitar ${dato.nombre}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        quitar(destino);
                      }}
                    >
                      ×
                    </button>
                  </span>
                  <span className="nv-caja__pie">
                    <span className="nv-caja__barra" style={{ ['--color' as string]: COLOR_GRUPO[dato.grupo] }}>
                      <span
                        ref={(n) => {
                          if (n) barras.current.set(destino, n);
                          else barras.current.delete(destino);
                        }}
                      />
                    </span>
                    {destino !== 'paleta' && (
                      <button
                        type="button"
                        className="nv-caja__cuanto"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          masFuerza(destino);
                        }}
                        title="Cuánto lo mueve"
                      >
                        {CUANTO[c.cantidad]}
                      </button>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="nv-caja__vacia">suelta una cajita</span>
                  {idObra ? (
                    <input
                      type="range"
                      className="nv-caja__mano"
                      min={0}
                      max={1}
                      step={0.01}
                      value={proyecto.visual.obra?.[idObra] ?? PARAMETROS_OBRA.find((x) => x.id === idObra)!.neutro}
                      onChange={(ev) =>
                        actualizar((p) => {
                          (p.visual.obra ??= {})[idObra] = Number(ev.target.value);
                        })
                      }
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label={`${titulo} a mano`}
                    />
                  ) : mando ? (
                    <input
                      type="range"
                      className="nv-caja__mano"
                      min={0}
                      max={1}
                      step={0.01}
                      value={(valores[mando.id] - mando.min) / (mando.max - mando.min || 1)}
                      onChange={(ev) => aMano(mando, Number(ev.target.value))}
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label={`${titulo} a mano`}
                    />
                  ) : (
                    <span className="nv-caja__nota">suelta la Emoción o una foto</span>
                  )}
                </>
              )}
            </Caja>
          );
        })}
        {!estante && cajas.length > CAJAS_A_LA_VISTA && (
          <button type="button" className="nv-caja nv-caja--mas" onClick={() => setTodas(!todas)}>
            {todas ? 'Ver menos' : `+ ${cajas.length - CAJAS_A_LA_VISTA} más`}
          </button>
        )}
      </div>
      <Bandeja grupos={cajitasDeDatos(proyecto)} estante={estante} />
    </MesaDeCajitas>
  );
}

// ------------------------------------------------------------ golpes

/** El color de cada fila de golpes. */
const COLOR_GOLPE: Record<GolpeVisual, string> = {
  destello: '#fff4b0',
  zoom: '#5ee0ff',
  sacudon: '#ff9f43',
  corte: '#b0b4c8',
  invertir: '#c77dff',
  tinte: '#ff5d8f',
  giro: '#3ee08f',
  borroso: '#8fa8ff',
  crece: '#ffd166',
  acelera: '#ff7ab8',
  retuerce: '#7bdff2',
};

/**
 * Los golpes de la imagen, con la misma vista que los golpes de la música:
 * una fila por efecto y una casilla por paso de la vuelta. Se tocan o se
 * pintan arrastrando el dedo; el ▶ de cada fila prueba el efecto.
 */
export function Golpes({ escena, pista: conPista = false }: { escena: Escena | null; pista?: boolean }) {
  const { proyecto, actualizar } = useProyecto();
  const n = proyecto.patron.cantidadPasos;
  const pasos = pasosEfectosDe(proyecto, escena);
  const encendidas = ORDEN_GOLPES.reduce((a, g) => a + (pasos[g] ?? []).filter(Boolean).length, 0);
  const inicial = useRef(encendidas);
  const pista = usePista('golpes', conPista && encendidas !== inicial.current, 3, undefined, conPista);
  const cabeza = useRef<HTMLDivElement>(null);
  const pintando = useRef<boolean | null>(null);
  useCabezaLectora(cabeza, n);

  const marcar = (g: GolpeVisual, paso: number, encender: boolean) =>
    actualizar((p) => ponerPasoEfecto(p, escena?.id ?? null, g, paso, encender));

  const pintar = usePintarArrastrando((clave) => {
    if (pintando.current === null) return;
    const [g, paso] = clave.split('|');
    marcar(g as GolpeVisual, Number(paso), pintando.current);
  });
  const soltar = () => {
    pintando.current = null;
    pintar.alSoltar();
  };

  return (
    <div className="nv-golpes-imagen" data-bloqueo={`escena:${escena?.id ?? 'general'}:golpes-imagen`}>
      {conPista && pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca una casilla: en ese momento de la vuelta, la imagen da el golpe. También puedes arrastrar para pintar varias."
          origen={() => null}
          destinos={() => {
            const filas = [...document.querySelectorAll('.nv-golpes-imagen .nv-celdas__pasos')];
            const fila = filas.find((f) => !f.querySelector('.nv-celda--on')) ?? filas[0];
            const celdas = fila ? [...fila.querySelectorAll('.nv-celda')] : [];
            return [1, 5, 9].map((i) => celdas[i]).filter(Boolean);
          }}
          alCerrar={pista.cerrar}
        />
      )}
      <div className="nv-campo__fila">
        <span className="nv-tenue nv-chico">Toca una casilla: en ese momento de la vuelta, la imagen da el golpe.</span>
        <span className="nv-espacio" />
        {escena?.efectosPasos && (
          <button
            type="button"
            className="nv-enlace nv-chico"
            onClick={() =>
              actualizar((p) => {
                const e = buscarEscena(p, escena.id);
                if (e) e.efectosPasos = undefined;
              })
            }
            title="Esta escena vuelve a usar los golpes de toda la pieza"
          >
            Como toda la pieza
          </button>
        )}
        <button type="button" className="nv-boton nv-boton--sorpresa" onClick={() => actualizar((p) => efectosAlAzar(p, escena?.id ?? null))}>
          ✦ Al azar
        </button>
      </div>
      <div className="nv-celdas nv-celdas--imagen" style={{ gridTemplateRows: `repeat(${ORDEN_GOLPES.length}, auto)` }} onPointerUp={soltar} onPointerCancel={soltar}>
        <div className="nv-celdas__cabeza" style={{ gridRow: `1 / ${ORDEN_GOLPES.length + 1}` }} aria-hidden="true">
          <div ref={cabeza} className="cabeza-rejilla" style={{ opacity: 0 }} />
        </div>
        {ORDEN_GOLPES.map((g, k) => {
          const fila = pasos[g] ?? [];
          return (
            <div key={g} className="nv-celdas__fila" style={{ ['--color' as string]: COLOR_GOLPE[g] }}>
              <span className="nv-celdas__nombre" style={{ gridRow: k + 1 }}>
                <button type="button" className="nv-solo" onClick={() => enVivo.disparar(g)} title={`Probar: ${NOMBRE_GOLPE[g]}`} aria-label={`Probar ${NOMBRE_GOLPE[g]}`}>
                  ▶
                </button>
                <span className="nv-celdas__sonido nv-celdas__sonido--quieto">
                  <span className="nv-fila-son__punto" />
                  <span className="nv-fila-son__texto">
                    <strong>{NOMBRE_GOLPE[g]}</strong>
                  </span>
                </span>
              </span>
              <div className="nv-celdas__pasos" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridRow: k + 1 }}>
                {Array.from({ length: n }, (_, i) => {
                  const on = Boolean(fila[i]);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`nv-celda ${on ? 'nv-celda--on' : ''} ${i % 4 === 0 ? 'nv-celda--tiempo' : ''}`}
                      aria-label={`${NOMBRE_GOLPE[g]}, paso ${i + 1}`}
                      aria-pressed={on}
                      data-pintar={`${g}|${i}`}
                      onPointerDown={(ev) => {
                        pintando.current = !on;
                        marcar(g, i, !on);
                        if (!on) enVivo.disparar(g);
                        pintar.alBajar(ev, `${g}|${i}`);
                      }}
                      onPointerMove={pintar.alMover}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
