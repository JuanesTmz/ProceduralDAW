/**
 * La canción: el home de Producción.
 *
 * No muestra el loop — muestra la pieza entera estirada en el tiempo, con las
 * vueltas una tras otra y las partes separadas. Y los golpes que dibuja son
 * los que de verdad van a sonar: como el azar tiene semilla, la pieza completa
 * se puede calcular antes de tocarla. Por eso la Estrofa vuelta 1 y la Estrofa
 * vuelta 2 no se ven iguales, y por eso al cambiar la semilla se redibuja todo.
 *
 * Los golpes se pintan en un canvas y los bloques que se tocan son botones
 * transparentes encima. Así la pantalla aguanta una pieza larga sin llenar el
 * navegador de miles de elementos, que en las tablets del evento importa.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import {
  fijarNivelCapa,
  nivelDeCapa,
  NOMBRE_NIVEL,
  siguienteNivel,
} from '../generativo/motorGenerativo';
import { renderizarPieza } from '../generativo/renderPieza';
import type { PiezaRenderizada } from '../generativo/renderPieza';
import type { NombreSeccion } from '../estado/tipos';

/* La fila crece hasta llenar el alto que haya: la pista es lo que se mira. */
const ALTO_FILA_MIN = 26;
const ALTO_FILA_MAX = 78;
const ALTO_TRAMOS = 34;
const ALTO_VOZ = 26;
const ANCHO_ETIQUETAS = 118;
/** Ancho de cada paso cuando se acerca: suficiente para contar los golpes. */
const ANCHO_PASO_CERCA = 13;

const COLOR_PARTE: Record<NombreSeccion, string> = {
  intro: '#6ec8ff',
  estrofa: '#ff6b81',
  coro: '#2ee6a8',
  cierre: '#b182ff',
};

const COLOR_MATRIZ = '#5fd4ff';

/** '#rrggbb' + alfa → 'rgba(...)', para pintar en el canvas. */
function conAlfa(hex: string, alfa: number): string {
  const limpio = hex.replace('#', '');
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

interface Props {
  parte: NombreSeccion;
  alElegirParte: (parte: NombreSeccion) => void;
  /** Tocar el nombre de una pista abre su celda de golpes. */
  alAbrirPista: (idFila: string) => void;
}

export function MesaCancion({ parte, alElegirParte, alAbrirPista }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const pieza = useMemo(() => renderizarPieza(proyecto), [proyecto]);

  const [cerca, setCerca] = useState(false);
  const [anchoVisible, setAnchoVisible] = useState(900);
  const [altoVisible, setAltoVisible] = useState(300);
  const [siguiendo, setSiguiendo] = useState(true);
  const [perdido, setPerdido] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const cabeza = useRef<HTMLDivElement>(null);
  const ventana = useRef<HTMLDivElement>(null);
  const columna = useRef<HTMLDivElement>(null);
  /** Para distinguir el desplazamiento que hacemos nosotros del que hace el dedo. */
  const moviendoSolo = useRef(false);

  const filasDibujadas = pieza.filas.length + 1; // las pistas y la matriz
  // El alto de fila no es un número fijo: se reparte lo que la caja deje.
  // Con cuatro pistas la pista se ve ancha; con doce, apretada pero entera.
  const altoFila = Math.max(
    ALTO_FILA_MIN,
    Math.min(ALTO_FILA_MAX, Math.floor((altoVisible - ALTO_TRAMOS - ALTO_VOZ) / filasDibujadas)),
  );
  const altoLienzo = filasDibujadas * altoFila;

  const anchoPaso = cerca
    ? ANCHO_PASO_CERCA
    : Math.max(1.5, anchoVisible / Math.max(1, pieza.totalPasos));
  const anchoTotal = anchoPaso * pieza.totalPasos;
  const hayScroll = anchoTotal > anchoVisible + 1;

  // ------------------------------------------------------- medidas en vivo

  useEffect(() => {
    const nodo = scroller.current;
    if (!nodo) return;
    const medir = () => {
      setAnchoVisible(nodo.clientWidth);
      setAltoVisible(nodo.clientHeight);
    };
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    medir();
    return () => observador.disconnect();
  }, []);

  // ------------------------------------------------------------- el dibujo

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    dibujar(canvas, pieza, anchoPaso, anchoTotal, altoLienzo, altoFila);
  }, [pieza, anchoPaso, anchoTotal, altoLienzo, altoFila]);

  // --------------------------------------------------------- la cabeza lectora

  const pintarVentana = useCallback(() => {
    const nodo = scroller.current;
    const marco = ventana.current;
    if (!nodo || !marco || anchoTotal <= 0) return;
    marco.style.left = `${(nodo.scrollLeft / anchoTotal) * 100}%`;
    marco.style.width = `${Math.min(100, (nodo.clientWidth / anchoTotal) * 100)}%`;
  }, [anchoTotal]);

  useEffect(pintarVentana, [pintarVentana, anchoPaso]);

  useEffect(() => {
    return motorAudio.alCambiarPaso((paso) => {
      const nodo = cabeza.current;
      const caja = scroller.current;
      if (!nodo || !caja) return;

      if (paso < 0 || proyecto.modoReproduccion !== 'pieza') {
        nodo.style.opacity = '0';
        nodo.style.left = '0px';
        setPerdido(false);
        return;
      }

      const x = motorAudio.progresoPieza * anchoTotal;
      nodo.style.opacity = '1';
      nodo.style.left = `${x}px`;

      const izquierda = caja.scrollLeft;
      const derecha = izquierda + caja.clientWidth;
      const aLaVista = x >= izquierda + 16 && x <= derecha - 16;

      if (siguiendo && !aLaVista) {
        moviendoSolo.current = true;
        caja.scrollTo({ left: Math.max(0, x - caja.clientWidth * 0.35), behavior: 'smooth' });
        window.setTimeout(() => {
          moviendoSolo.current = false;
        }, 420);
      }
      setPerdido(!siguiendo && !aLaVista);
    });
  }, [anchoTotal, siguiendo, proyecto.modoReproduccion]);

  const alDesplazar = () => {
    pintarVentana();
    const nodo = scroller.current;
    if (nodo && columna.current) {
      columna.current.style.transform = `translateY(${-nodo.scrollTop}px)`;
    }
    // Si el desplazamiento lo hizo el dedo, la vista deja de perseguir sola.
    if (!moviendoSolo.current && siguiendo) setSiguiendo(false);
  };

  const volverAlSonido = () => {
    const caja = scroller.current;
    if (!caja) return;
    setSiguiendo(true);
    setPerdido(false);
    moviendoSolo.current = true;
    const x = motorAudio.progresoPieza * anchoTotal;
    caja.scrollTo({ left: Math.max(0, x - caja.clientWidth * 0.35), behavior: 'smooth' });
    window.setTimeout(() => {
      moviendoSolo.current = false;
    }, 420);
  };

  const irAPaso = (paso: number) => {
    const caja = scroller.current;
    if (!caja) return;
    moviendoSolo.current = true;
    caja.scrollTo({ left: Math.max(0, paso * anchoPaso - 24), behavior: 'smooth' });
    window.setTimeout(() => {
      moviendoSolo.current = false;
    }, 420);
  };

  // --------------------------------------------------------------- edición

  const cambiarNivel = (idFila: string, indiceSeccion: number) => {
    actualizar((p) => {
      const seccion = p.secciones[indiceSeccion];
      if (!seccion) return;
      fijarNivelCapa(seccion, idFila, siguienteNivel(nivelDeCapa(seccion, idFila)));
    });
  };

  const alternarMatriz = (indiceSeccion: number) => {
    actualizar((p) => {
      const seccion = p.secciones[indiceSeccion];
      if (seccion) seccion.melodiaActiva = !seccion.melodiaActiva;
    });
  };

  const tocarLaPieza = () => {
    actualizar((p) => {
      p.modoReproduccion = 'pieza';
    });
    motorAudio.cambiarModo('pieza');
    setSiguiendo(true);
    void motorAudio.reproducir();
  };

  // ----------------------------------------------------------------- vista

  return (
    <section className="panel">
      <div className="panel__cabecera">
        <h2 className="panel__titulo">La canción</h2>
        <span className="panel__nota">Toda la pieza, vuelta por vuelta</span>

        <div className="panel__acciones">
          <div className="segmentado" role="group" aria-label="Qué tanto se ve">
            <button type="button" aria-pressed={!cerca} onClick={() => setCerca(false)}>
              Toda la canción
            </button>
            <button type="button" aria-pressed={cerca} onClick={() => setCerca(true)}>
              Acercar
            </button>
          </div>
          <button type="button" className="boton boton--primario" onClick={tocarLaPieza}>
            ▶ Oír la pieza
          </button>
        </div>
      </div>

      <div className="panel__cuerpo">
        {/* El mapa: la canción entera en miniatura, con el pedazo que estás
            viendo. Tocar una parte salta allí, que es para lo que servían los
            botones de Intro/Estrofa/Coro/Cierre que había debajo. */}
        <div className="mapa">
          {pieza.tramos.map((tramo) => (
            <button
              key={tramo.id}
              type="button"
              className="mapa__tramo"
              data-seccion={tramo.id}
              style={{ flexGrow: tramo.pasos }}
              aria-label={`Ir a ${tramo.etiqueta}`}
              onClick={() => {
                alElegirParte(tramo.id);
                irAPaso(tramo.pasoInicio);
              }}
            />
          ))}
          {hayScroll && <div ref={ventana} className="mapa__ventana" aria-hidden="true" />}
        </div>

        <div className="cancion">
          <div className="cancion__columna" style={{ width: ANCHO_ETIQUETAS }}>
            <div className="cancion__hueco" style={{ height: ALTO_TRAMOS }} />
            {/* Los nombres no se desplazan solos: siguen al scroll vertical de
                la rejilla, para que cada nombre siga frente a su fila. */}
            <div ref={columna} className="cancion__etiquetas">
            {pieza.filas.map((fila) => (
              <button
                key={fila.id}
                type="button"
                className="cancion__etiqueta cancion__etiqueta--abre"
                style={{ height: altoFila }}
                title={`Abrir los golpes de ${fila.nombre}`}
                onClick={() => alAbrirPista(fila.id)}
              >
                <span className="punto-color" style={{ background: fila.color }} />
                <span className="cancion__nombre">{fila.nombre}</span>
              </button>
            ))}
            <div className="cancion__etiqueta" style={{ height: altoFila }}>
              <span className="punto-color" style={{ background: COLOR_MATRIZ }} />
              <span className="cancion__nombre">Matriz</span>
            </div>
            <div className="cancion__etiqueta" style={{ height: ALTO_VOZ }}>
              <span className="punto-color" style={{ background: 'var(--azul)' }} />
              <span className="cancion__nombre">La voz</span>
            </div>
            </div>
          </div>

          <div
            ref={scroller}
            className={`cancion__scroller ${hayScroll ? 'cancion__scroller--mueve' : ''}`}
            onScroll={alDesplazar}
          >
            <div
              className="cancion__lienzo"
              style={{ width: anchoTotal, height: ALTO_TRAMOS + altoLienzo + ALTO_VOZ }}
            >
              {/* Las partes, arriba: también son el selector de parte. */}
              <div className="cancion__tramos" style={{ height: ALTO_TRAMOS }}>
                {pieza.tramos.map((tramo) => (
                  <button
                    key={tramo.id}
                    type="button"
                    className={`tramo ${parte === tramo.id ? 'tramo--elegido' : ''}`}
                    data-seccion={tramo.id}
                    style={{ left: tramo.pasoInicio * anchoPaso, width: tramo.pasos * anchoPaso }}
                    aria-pressed={parte === tramo.id}
                    onClick={() => alElegirParte(tramo.id)}
                  >
                    <span className="tramo__nombre">{tramo.etiqueta}</span>
                    <span className="tramo__dato">
                      {tramo.vueltas} {tramo.vueltas === 1 ? 'vuelta' : 'vueltas'}
                    </span>
                  </button>
                ))}
              </div>

              <canvas
                ref={lienzo}
                className="cancion__golpes"
                style={{ width: anchoTotal, height: altoLienzo, top: ALTO_TRAMOS }}
              />

              {/* Los bloques: un toque sube la energía de esa pista en esa parte. */}
              <div className="cancion__bloques" style={{ top: ALTO_TRAMOS, height: altoLienzo }}>
                {pieza.filas.map((fila, iFila) =>
                  pieza.tramos.map((tramo) => {
                    const nivel = nivelDeCapa(proyecto.secciones[tramo.indice], fila.id);
                    const ancho = tramo.pasos * anchoPaso;
                    return (
                      <button
                        key={`${fila.id}-${tramo.id}`}
                        type="button"
                        className="bloque"
                        data-nivel={nivel}
                        style={{
                          left: tramo.pasoInicio * anchoPaso,
                          width: ancho,
                          top: iFila * altoFila,
                          height: altoFila,
                        }}
                        aria-label={`${fila.nombre} en ${tramo.etiqueta}: ${NOMBRE_NIVEL[nivel]}`}
                        onClick={() => cambiarNivel(fila.id, tramo.indice)}
                      >
                        {ancho > 86 && <span className="bloque__nivel">{NOMBRE_NIVEL[nivel]}</span>}
                      </button>
                    );
                  }),
                )}
                {pieza.tramos.map((tramo) => {
                  const activa = proyecto.secciones[tramo.indice]?.melodiaActiva;
                  const ancho = tramo.pasos * anchoPaso;
                  return (
                    <button
                      key={`matriz-${tramo.id}`}
                      type="button"
                      className="bloque"
                      data-nivel={activa ? 3 : 0}
                      style={{
                        left: tramo.pasoInicio * anchoPaso,
                        width: ancho,
                        top: pieza.filas.length * altoFila,
                        height: altoFila,
                      }}
                      aria-label={`Matriz en ${tramo.etiqueta}: ${activa ? 'suena' : 'apagada'}`}
                      onClick={() => alternarMatriz(tramo.indice)}
                    >
                      {ancho > 86 && (
                        <span className="bloque__nivel">{activa ? 'suena' : 'apagada'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* La voz, una pista más: se ve dónde entra respecto a la música. */}
              <div
                className="cancion__voz"
                style={{ top: ALTO_TRAMOS + altoLienzo, height: ALTO_VOZ }}
              >
                {pieza.voz ? (
                  <div
                    className="voz-barra"
                    style={{
                      left: pieza.voz.inicio * anchoPaso,
                      width: Math.max(28, (pieza.voz.fin - pieza.voz.inicio) * anchoPaso),
                    }}
                  >
                    <span className="voz-barra__texto">
                      {proyecto.narracion.audioUrl ? 'monólogo grabado' : 'monólogo sin grabar'}
                    </span>
                  </div>
                ) : (
                  <div className="voz-barra voz-barra--sin">
                    <span className="voz-barra__texto">
                      todavía no hay monólogo — se escribe y se graba en Conceptualización
                    </span>
                  </div>
                )}
              </div>

              <div
                ref={cabeza}
                className="cancion__cabeza"
                style={{ opacity: 0, height: ALTO_TRAMOS + altoLienzo + ALTO_VOZ }}
                aria-hidden="true"
              />
            </div>
          </div>

          {hayScroll && <div className="cancion__borde cancion__borde--der" aria-hidden="true" />}

          {perdido && (
            <button type="button" className="volver" onClick={volverAlSonido}>
              ← volver a donde suena
            </button>
          )}
        </div>

      </div>
    </section>
  );
}

/**
 * Pinta la pieza entera. Se dibuja a mano en vez de con elementos porque una
 * pieza larga son decenas de miles de golpes, y el navegador de una tablet no
 * tiene por qué cargar con eso.
 */
function dibujar(
  canvas: HTMLCanvasElement,
  pieza: PiezaRenderizada,
  anchoPaso: number,
  anchoTotal: number,
  alto: number,
  altoFila: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // En pantallas densas se dibuja al doble para que no se vea borroso, pero
  // no más: en las tablets del evento pasar de ahí no se nota y cuesta.
  const densidad = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(anchoTotal * densidad));
  canvas.height = Math.max(1, Math.round(alto * densidad));
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
  ctx.clearRect(0, 0, anchoTotal, alto);

  const filas = pieza.filas.length + 1;
  const pasosPorVuelta = pieza.pasosPorVuelta;

  // Fondo por parte: cada una con su color, muy bajito.
  for (const tramo of pieza.tramos) {
    ctx.fillStyle = conAlfa(COLOR_PARTE[tramo.id], 0.07);
    ctx.fillRect(tramo.pasoInicio * anchoPaso, 0, tramo.pasos * anchoPaso, alto);
  }

  // Separadores de vuelta, y de paso cuando hay sitio.
  if (anchoPaso >= 5) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let paso = 0; paso <= pieza.totalPasos; paso += 4) {
      ctx.fillRect(Math.round(paso * anchoPaso), 0, 1, alto);
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let vuelta = 1; vuelta < pieza.totalVueltas; vuelta++) {
    ctx.fillRect(Math.round(vuelta * pasosPorVuelta * anchoPaso), 0, 1, alto);
  }

  // Líneas entre pistas.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let f = 1; f < filas; f++) {
    ctx.fillRect(0, f * altoFila, anchoTotal, 1);
  }

  // Límites de parte, más marcados: es lo que separa la canción en trozos.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (const tramo of pieza.tramos) {
    if (tramo.pasoInicio === 0) continue;
    ctx.fillRect(Math.round(tramo.pasoInicio * anchoPaso), 0, 1, alto);
  }

  // Los golpes. La altura dice la energía: suave bajito, fuerte lleno.
  const anchoGolpe = Math.max(1.5, Math.min(anchoPaso - 1.5, 11));
  pieza.filas.forEach((fila, iFila) => {
    const y = iFila * altoFila;
    for (let paso = 0; paso < fila.golpes.length; paso++) {
      const nivel = fila.golpes[paso];
      if (nivel === 0) continue;
      const altoGolpe = Math.round(altoFila * [0, 0.32, 0.5, 0.7][nivel]);
      ctx.fillStyle = conAlfa(fila.color, nivel === 1 ? 0.55 : nivel === 2 ? 0.78 : 1);
      ctx.fillRect(
        paso * anchoPaso + (anchoPaso - anchoGolpe) / 2,
        y + (altoFila - altoGolpe) / 2,
        anchoGolpe,
        altoGolpe,
      );
    }
  });

  // La matriz, en su propia fila: la altura de cada nota es su grado.
  const yMatriz = pieza.filas.length * altoFila;
  const altoNota = Math.max(2, altoFila / pieza.gradosMatriz);
  ctx.fillStyle = COLOR_MATRIZ;
  for (const nota of pieza.notas) {
    const proporcion = 1 - nota.grado / Math.max(1, pieza.gradosMatriz - 1);
    ctx.fillRect(
      nota.paso * anchoPaso + (anchoPaso - anchoGolpe) / 2,
      yMatriz + 3 + proporcion * (altoFila - 6 - altoNota),
      anchoGolpe,
      altoNota,
    );
  }
}
