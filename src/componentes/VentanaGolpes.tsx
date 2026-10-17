/**
 * La ventana de Golpes: una sola celda de golpes, la de la pista elegida.
 *
 * Antes era una rejilla con todas las pistas a la vez, con su nombre, su M,
 * su S, su volumen y su × en cada fila. Cabía, pero había que leerla. Aquí
 * se trabaja una pista por vez: arriba su celda grande, a la izquierda el
 * sonido que la toca, a la derecha la lista de pistas para saltar entre
 * ellas. La pieza completa ya se ve detrás, en la pista repartida.
 *
 * «Agregar» es literal: una pista nueva no existe en la canción hasta que
 * el estudiante dice que sí. Mientras tanto es un borrador que se puede oír.
 */
import { useEscucha } from './useEscucha';
import { useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { colorDeSonido, crearFila, NOMBRES_SONIDO, redimensionarPatron } from '../estado/proyecto';
import { useCabezaLectora } from '../hooks/useCabezaLectora';
import { usePintarArrastrando } from '../hooks/usePintarArrastrando';
import type { TipoSonido } from '../estado/tipos';
import { ListaPistas } from './ListaPistas';
import { Ventana } from './Ventana';

const CASILLAS: (16 | 32 | 64)[] = [16, 32, 64];

/** El kit sintetizado de la app, que siempre está. */
const PERCUSION: TipoSonido[] = ['bombo', 'redoblante', 'hihat', 'palma', 'tom', 'aro'];

/** El borrador: una pista que todavía no está en la canción. */
interface Borrador {
  nombre: string;
  tipo: TipoSonido;
  sampleUrl?: string;
  pasos: boolean[];
}

const NUEVA = '__nueva__';

interface Props {
  /** Con qué pista abrir, si se llegó tocando una en la pista repartida. */
  inicial?: string | null;
  alCerrar: () => void;
}

export function VentanaGolpes({ inicial, alCerrar }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { patron } = proyecto;

  const [elegida, setElegida] = useState<string>(
    inicial ?? patron.filas[0]?.id ?? NUEVA,
  );
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [familia, setFamilia] = useState<'percusion' | 'propios'>('percusion');
  const [pintando, setPintando] = useState<boolean | null>(null);
  const cabeza = useRef<HTMLDivElement>(null);

  useCabezaLectora(cabeza, patron.cantidadPasos);

  const fila = patron.filas.find((f) => f.id === elegida) ?? null;
  const enBorrador = elegida === NUEVA && borrador !== null;

  const pasos = enBorrador ? borrador!.pasos : (fila?.pasos ?? []);
  const color = enBorrador
    ? colorDeSonido(borrador!.tipo, borrador!.sampleUrl)
    : (fila?.color ?? 'var(--acento)');
  const nombre = enBorrador ? borrador!.nombre : (fila?.nombre ?? '');
  const sampleUrl = enBorrador ? borrador!.sampleUrl : fila?.sampleUrl;
  const tipo = enBorrador ? borrador!.tipo : fila?.tipo;

  // ------------------------------------------------------------- dibujar

  const marcar = (paso: number, encender: boolean) => {
    if (enBorrador) {
      setBorrador((b) => {
        if (!b) return b;
        const copia = [...b.pasos];
        copia[paso] = encender;
        return { ...b, pasos: copia };
      });
      return;
    }
    if (!fila) return;
    actualizar((p) => {
      const f = p.patron.filas.find((x) => x.id === fila.id);
      if (f) f.pasos[paso] = encender;
    });
  };

  const empezarAPintar = (paso: number) => {
    const encender = !pasos[paso];
    setPintando(encender);
    marcar(paso, encender);
    if (encender && fila) void motorAudio.escucharFila(fila.id);
  };

  // Arrastrar el dedo por la celda enciende varias seguidas.
  const pintar = usePintarArrastrando((clave) => {
    if (pintando === null) return;
    marcar(Number(clave), pintando);
  });

  const soltar = () => {
    setPintando(null);
    pintar.alSoltar();
  };

  // ------------------------------------------------------------- escuchar

  const escucha = useEscucha();

  /** Solo esta pista: se pone en solo, suena el bucle y nada más estorba. Otra vez: para. */
  const oirSola = () => {
    if (!fila) return;
    escucha.alternar('sola', () => {
      actualizar((p) => {
        for (const f of p.patron.filas) f.soloActivo = f.id === fila.id;
        p.patron.melodia.soloActivo = false;
        p.modoReproduccion = 'patron';
      });
      motorAudio.cambiarModo('patron');
      void motorAudio.reproducir();
    });
  };

  const oirConTodo = () =>
    escucha.alternar('todo', () => {
      actualizar((p) => {
        for (const f of p.patron.filas) f.soloActivo = false;
        p.patron.melodia.soloActivo = false;
        p.modoReproduccion = 'patron';
      });
      motorAudio.cambiarModo('patron');
      void motorAudio.reproducir();
    });

  /** Al cerrar nadie se queda en solo, y lo que sonaba aquí se para. */
  const cerrar = () => {
    escucha.parar();
    actualizar((p) => {
      for (const f of p.patron.filas) f.soloActivo = false;
      p.patron.melodia.soloActivo = false;
      p.modoReproduccion = 'pieza';
    });
    alCerrar();
  };

  // --------------------------------------------------------- elegir sonido

  const ponerSonido = (nuevo: { tipo: TipoSonido; nombre: string; sampleUrl?: string }) => {
    if (elegida === NUEVA) {
      setBorrador((b) => ({
        nombre: nuevo.nombre,
        tipo: nuevo.tipo,
        sampleUrl: nuevo.sampleUrl,
        pasos: b?.pasos ?? new Array(patron.cantidadPasos).fill(false),
      }));
      return;
    }
    if (!fila) return;
    actualizar((p) => {
      const f = p.patron.filas.find((x) => x.id === fila.id);
      if (!f) return;
      f.tipo = nuevo.tipo;
      f.nombre = nuevo.nombre;
      f.sampleUrl = nuevo.sampleUrl;
      f.color = colorDeSonido(nuevo.tipo, nuevo.sampleUrl);
    });
    window.setTimeout(() => void motorAudio.escucharFila(fila.id), 60);
  };

  // ------------------------------------------------------- agregar y quitar

  const empezarNueva = () => {
    setElegida(NUEVA);
    setBorrador({
      nombre: NOMBRES_SONIDO.bombo,
      tipo: 'bombo',
      pasos: new Array(patron.cantidadPasos).fill(false),
    });
  };

  const agregar = () => {
    if (!borrador) return;
    let id = '';
    actualizar((p) => {
      const nueva = crearFila(borrador.tipo, p.patron.cantidadPasos, {
        nombre: borrador.nombre,
        sampleUrl: borrador.sampleUrl,
      });
      nueva.pasos = [...borrador.pasos];
      id = nueva.id;
      p.patron.filas.push(nueva);
      // Entra sonando en todas las partes: si no, se agrega y no pasa nada.
      for (const seccion of p.secciones) seccion.capasActivas.push(nueva.id);
    });
    setBorrador(null);
    setElegida(id);
  };

  const quitar = () => {
    if (!fila) return;
    actualizar((p) => {
      p.patron.filas = p.patron.filas.filter((f) => f.id !== fila.id);
      for (const seccion of p.secciones) {
        seccion.capasActivas = seccion.capasActivas.filter((x) => x !== fila.id);
      }
    });
    setElegida(patron.filas.find((f) => f.id !== fila.id)?.id ?? NUEVA);
    if (patron.filas.length <= 1) empezarNueva();
  };

  // ----------------------------------------------------------------- vista

  const golpes = pasos.filter(Boolean).length;

  const lista = [
    ...patron.filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      color: f.color,
      nota: `${f.pasos.filter(Boolean).length} golpes`,
    })),
    ...(borrador
      ? [
          {
            id: NUEVA,
            nombre: borrador.nombre,
            color: colorDeSonido(borrador.tipo, borrador.sampleUrl),
            nota: 'sin agregar',
          },
        ]
      : []),
  ];

  const propios = proyecto.sonidos;

  return (
    <Ventana
      titulo="Golpes"
      guia="ventana-golpes"
      nota={nombre ? `Estás armando ${nombre}` : 'Elige un sonido y dibuja su patrón'}
      color={color}
      ancha
      alCerrar={cerrar}
      pie={
        <>
          <button type="button" className="boton" onClick={oirSola} disabled={!fila}>
            {escucha.sonandoAqui === 'sola' ? '❚❚ Pausar' : '▶ Solo este'}
          </button>
          <button type="button" className="boton" onClick={oirConTodo}>
            {escucha.sonandoAqui === 'todo' ? '❚❚ Pausar' : '▶ Con los demás'}
          </button>
          <span className="pie__hueco" />
          {enBorrador ? (
            <button
              type="button"
              className="boton boton--primario"
              onClick={agregar}
              disabled={golpes === 0}
            >
              Agregar a la canción
            </button>
          ) : (
            <button
              type="button"
              className="boton boton--peligro"
              onClick={quitar}
              disabled={patron.filas.length <= 1}
            >
              Quitar de la canción
            </button>
          )}
        </>
      }
    >
      <div className="golpes" onPointerUp={soltar} onPointerCancel={soltar}>
        <div className="golpes__celda">
          {/* La celda: una casilla por paso, del tamaño que quepa. */}
          <div
            className="celdas"
            style={{ gridTemplateColumns: `repeat(${patron.cantidadPasos}, 1fr)` }}
          >
            <div ref={cabeza} className="cabeza-rejilla" style={{ opacity: 0 }} aria-hidden="true" />
            {pasos.map((activo, i) => (
              <button
                key={i}
                type="button"
                className={`casilla ${activo ? 'casilla--activa' : ''} ${
                  i % 4 === 0 ? 'casilla--fuerte' : ''
                }`}
                style={activo ? { background: color } : undefined}
                aria-label={`Paso ${i + 1}`}
                aria-pressed={activo}
                data-pintar={`${i}`}
                onPointerDown={(e) => {
                  empezarAPintar(i);
                  pintar.alBajar(e, `${i}`);
                }}
                onPointerMove={pintar.alMover}
              />
            ))}
          </div>

          <div className="golpes__datos">
            <span className="golpes__cuenta">
              <strong>{golpes}</strong> de {patron.cantidadPasos}
            </span>
            <div className="grupo-segmentado grupo-segmentado--chico">
              {CASILLAS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={patron.cantidadPasos === n}
                  onClick={() =>
                    actualizar((p) => {
                      p.patron = redimensionarPatron(p.patron, n);
                    })
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="golpes__cuerpo">
          {/* ---------------- el sonido que toca esta pista ---------------- */}
          <div className="sonidos-elegir">
            <h3 className="pistas__titulo">Sonido</h3>

            <div className="grupo-segmentado grupo-segmentado--chico">
              <button
                type="button"
                aria-pressed={familia === 'percusion'}
                onClick={() => setFamilia('percusion')}
              >
                Percusión
              </button>
              <button
                type="button"
                aria-pressed={familia === 'propios'}
                onClick={() => setFamilia('propios')}
              >
                Propios {propios.length > 0 ? `(${propios.length})` : ''}
              </button>
            </div>

            {familia === 'percusion' ? (
              <div className="sonidos-elegir__rejilla">
                {PERCUSION.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip-sonido ${tipo === t && !sampleUrl ? 'chip-sonido--actual' : ''}`}
                    onClick={() => ponerSonido({ tipo: t, nombre: NOMBRES_SONIDO[t] })}
                  >
                    {NOMBRES_SONIDO[t]}
                  </button>
                ))}
              </div>
            ) : propios.length > 0 ? (
              <div className="sonidos-elegir__rejilla">
                {propios.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip-sonido ${sampleUrl === s.url ? 'chip-sonido--actual' : ''}`}
                    onClick={() =>
                      ponerSonido({ tipo: 'sample', nombre: s.nombre, sampleUrl: s.url })
                    }
                  >
                    {s.nombre}
                  </button>
                ))}
              </div>
            ) : (
              <p className="pista__nota">Todavía no has grabado ninguno. Se graban en Sonidos.</p>
            )}
          </div>

          {/* ---------------- a qué pista le estás dibujando ---------------- */}
          <ListaPistas
            titulo="Pistas"
            pistas={lista}
            elegida={elegida}
            alElegir={(id) => {
              setElegida(id);
              if (id !== NUEVA) setBorrador(null);
            }}
            pie={
              !borrador && (
                <button type="button" className="boton boton--chico" onClick={empezarNueva}>
                  + Nueva pista
                </button>
              )
            }
          />
        </div>
      </div>
    </Ventana>
  );
}
