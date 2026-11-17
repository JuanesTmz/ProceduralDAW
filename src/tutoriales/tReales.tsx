// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los tutoriales principales, hechos con la interfaz de verdad: Historia,
 * Voz, Música, Sonidos y Mezcla. Son los que se abren solos la primera vez
 * que se entra a cada parte (reemplazan al recorrido guiado, que en la
 * prueba nadie leía).
 *
 * Cada uno es una pantalla real de la app con un proyecto de demostración,
 * un guion de toques y unos rótulos cortos. Ver `real.tsx`.
 */
import type { ReactNode } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { crearProyectoInicial } from '../estado/proyecto';
import { aplicarPreset, nuevaConexion, ponerSonido, sincronizarReglas } from '../estado/musica';
import { cargarEjemplo, sincronizarEscenas, TEXTO_EJEMPLO } from '../estado/escenas';
import { ponerGolpe } from '../estado/patronEscena';
import { ponerPasoEfecto } from '../estado/efectos';
import type { ArchivoDatos, GolpeVisual, Proyecto } from '../estado/tipos';
import { PasoHistoria } from '../narrativa/PasoHistoria';
import { PasoVoz } from '../narrativa/PasoVoz';
import { MusicaEscena } from '../narrativa/MusicaEscena';
import { VentanaSonidosPistas } from '../narrativa/VentanaSonidosPistas';
import { VentanaMezcla } from '../narrativa/Mezcla';
import { ImagenEscena } from '../narrativa/ImagenEscena';
import type { ApiDemo } from '../estado/ProyectoContext';
import type { Composicion } from './motor';
import { Fundido, Rotulos, SONOTECA_URL } from './piezas';
import { FondoReal, Halo, ManoReal, PantallaReal, useGuion, type Movimiento } from './real';

// ------------------------------------------------------------ proyectos de demostración

/** Un proyecto nuevo, como lo prepara la app: con su base puesta y sin datos. */
function proyectoNuevo(): Proyecto {
  const p = crearProyectoInicial();
  p.track = 'ia';
  aplicarPreset(p, 'reggaeton');
  sincronizarReglas(p);
  p.conexiones = [];
  return p;
}

/** El ejemplo de la chiva, partido en escenas, sin voces grabadas. */
function proyectoEjemplo(): Proyecto {
  const p = proyectoNuevo();
  cargarEjemplo(p);
  for (const e of p.escenas) {
    e.vozUrl = undefined;
    e.vozDuracion = 0;
    e.vozTexto = undefined;
  }
  return p;
}

const filaPorNombre = (p: Proyecto, nombre: string) => p.patron.filas.find((f) => f.nombre === nombre);

/** Enciende o apaga una casilla de General, buscando la capa por su nombre. */
const golpe = (nombre: string, paso: number, on = true) => (api: ApiDemo) =>
  api.actualizar((p) => {
    const f = filaPorNombre(p, nombre);
    if (f) ponerGolpe(p, null, f.id, paso - 1, on);
  });

const celda = (nombre: string, paso: number) => `button[aria-label="${nombre}, paso ${paso}"]`;

/** Escribe un texto poco a poco (t de 0 a 1), sin repetir si no cambió nada. */
function escribir(leer: (p: Proyecto) => string, poner: (p: Proyecto, texto: string) => void, texto: string) {
  return (api: ApiDemo, t: number) => {
    const parte = texto.slice(0, Math.round(t * texto.length));
    if (leer(api.proyecto()) === parte) return;
    api.actualizar((p) => poner(p, parte));
  };
}

const estacion = (i: number, texto: string) =>
  escribir(
    (p) => p.historia.estaciones?.[i] ?? '',
    (p, x) => {
      const lista = [...(p.historia.estaciones ?? ['', '', '', '', ''])];
      lista[i] = x;
      p.historia.estaciones = lista;
    },
    texto,
  );

// ------------------------------------------------------------ marco común

/** Dónde va la pantalla: centrada, dejando abajo el sitio de los rótulos. */
const MARCO = { ancho: 1280, alto: 620, escala: 0.88 };
const Y = 22;

function crearTutorial(opciones: {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: number;
  Pantalla: () => ReactNode;
  inicial: () => Proyecto;
  guion: Movimiento[];
  rotulos: [number, number, string][];
  halos?: { en: string; desde: number; hasta: number }[];
  marco?: { ancho: number; alto: number; escala: number };
}): Composicion {
  const marco = opciones.marco ?? MARCO;
  const x = (1280 - marco.ancho * marco.escala) / 2;
  function Dibujo() {
    const g = useGuion(opciones.guion);
    return (
      <>
        <FondoReal />
        <PantallaReal
          Pantalla={opciones.Pantalla}
          inicial={opciones.inicial}
          api={g.api}
          raiz={g.raiz}
          vuelta={g.vuelta}
          x={x}
          y={Y}
          ancho={marco.ancho}
          alto={marco.alto}
          escala={marco.escala}
        />
        {opciones.halos?.map((h) => (
          <Halo
            key={h.desde}
            raiz={g.raiz}
            en={h.en}
            desde={h.desde}
            hasta={h.hasta}
            texto={(f) => `● Grabando 0:0${Math.min(9, Math.floor(f / 30))}`}
          />
        ))}
        <ManoReal refMano={g.mano} toca={g.toca} />
        <Rotulos lista={opciones.rotulos} />
        <Fundido duracion={opciones.duracion} />
      </>
    );
  }
  return { id: opciones.id, titulo: opciones.titulo, descripcion: opciones.descripcion, duracion: opciones.duracion, Dibujo };
}

// ------------------------------------------------------------ 1. Historia

function PantallaHistoria() {
  return (
    <main className="nv-contenido">
      <PasoHistoria alSeguir={() => {}} />
    </main>
  );
}

const MONOLOGO = TEXTO_EJEMPLO;
const ESTACIONES_EJEMPLO = [
  'Una chiva vieja parqueada, con el motor tosiendo.',
  'La gente sube apretada y la radio suena un tango.',
  'Arriba pasan las cabinas del metrocable.',
  'Don Arturo, que madruga aunque no tenga ruta.',
  'Que lo viejo no se va del todo: se queda esperando.',
];
const campoEstacion = (i: number) => `[data-bloqueo="historia:estacion:${i}"] textarea`;

export const tutorialHistoria = crearTutorial({
  id: 'historia',
  titulo: 'Escribe tu historia',
  descripcion: 'Las estaciones, el monólogo final y las escenas.',
  duracion: 930,
  Pantalla: PantallaHistoria,
  inicial: proyectoNuevo,
  guion: [
    { f: 50, en: campoEstacion(0) },
    { f: 56, hasta: 120, en: campoEstacion(0), tramo: estacion(0, ESTACIONES_EJEMPLO[0]) },
    { f: 150, en: campoEstacion(1) },
    { f: 156, hasta: 215, en: campoEstacion(1), tramo: estacion(1, ESTACIONES_EJEMPLO[1]) },
    {
      f: 250,
      en: campoEstacion(4),
      hacer: (api) => api.actualizar((p) => (p.historia.estaciones = [...ESTACIONES_EJEMPLO])),
    },
    { f: 360, en: 'textarea[placeholder^="Unas 100"]' },
    {
      f: 366,
      hasta: 560,
      en: 'textarea[placeholder^="Unas 100"]',
      tramo: escribir(
        (p) => p.narracion.texto,
        (p, x) => {
          p.narracion.texto = x;
          sincronizarEscenas(p);
        },
        MONOLOGO,
      ),
    },
    { f: 620, en: 'button[aria-label="Más escenas"]', clic: true },
    { f: 670, en: 'button[aria-label="Más escenas"]', clic: true },
    { f: 720, en: 'button[aria-label="Más escenas"]', clic: true },
    { f: 830, en: '.nv-pie .nv-boton--primario', senalar: true },
  ],
  rotulos: [
    [10, 330, 'Anota lo que encontraste en cada *estación'],
    [330, 590, 'Con eso escribe tu *monólogo final'],
    [590, 790, 'Pártelo en *escenas: toca + para sumar una'],
    [790, 930, 'Todo se *guarda solo. Luego, *Seguir a Voz'],
  ],
});

// ------------------------------------------------------------ 2. Voz

function PantallaVoz() {
  return (
    <main className="nv-contenido">
      <PasoVoz alSeguir={() => {}} />
    </main>
  );
}

/** Graba (de mentiras) la voz de la escena i: queda con el texto de ahora. */
const grabar = (i: number, segundos: number) => (api: ApiDemo) =>
  api.actualizar((p) => {
    const e = p.escenas[i];
    if (!e) return;
    e.vozUrl = `demo:voz-${i}`;
    e.vozDuracion = segundos;
    e.vozTexto = e.texto;
  });

export const tutorialVoz = crearTutorial({
  id: 'voz',
  titulo: 'Graba tu voz',
  descripcion: 'Escena por escena, y qué pasa si mueves un corte.',
  duracion: 780,
  Pantalla: PantallaVoz,
  inicial: proyectoEjemplo,
  marco: { ancho: 1280, alto: 600, escala: 0.9 },
  guion: [
    { f: 60, en: '.nv-grabar' },
    { f: 160, en: '.nv-grabar', hacer: grabar(0, 6.4) },
    { f: 240, en: '.nv-apuntador__control .nv-boton--primario', clic: true },
    { f: 300, en: '.nv-grabar' },
    { f: 390, en: '.nv-grabar', hacer: grabar(1, 7.8) },
    {
      f: 480,
      en: '.nv-apuntador__texto',
      senalar: true,
      hacer: (api) =>
        api.actualizar((p) => {
          // Como si en Historia se hubiera movido el corte: la escena ganó palabras.
          const e = p.escenas[1];
          if (e) e.texto = `${e.texto} Un día llegó el metrocable.`;
        }),
    },
    { f: 560, en: '.nv-aviso-voz', senalar: true },
    { f: 660, en: '.nv-apuntador__control .nv-boton--rojo', senalar: true },
  ],
  halos: [
    { en: '.nv-grabar', desde: 64, hasta: 160 },
    { en: '.nv-grabar', desde: 304, hasta: 390 },
  ],
  rotulos: [
    [10, 230, 'Toca el botón rojo y *lee la escena'],
    [230, 450, 'Luego la *siguiente escena, y así'],
    [450, 640, 'Si mueves un corte, esa escena *se regraba'],
    [640, 780, 'Toca *Grabar de nuevo y listo'],
  ],
});

// ------------------------------------------------------------ 3. Música

function PantallaMusica() {
  return (
    <div className="nv-editor__cuerpo tu-real__editor">
      <MusicaEscena escena={null} indice={-1} />
    </div>
  );
}

export const tutorialMusica = crearTutorial({
  id: 'musica',
  titulo: 'La música: base y golpes',
  descripcion: 'Elegir una base, tocar las casillas y sumar una capa.',
  duracion: 990,
  Pantalla: PantallaMusica,
  inicial: proyectoEjemplo,
  marco: { ancho: 1280, alto: 600, escala: 0.9 },
  guion: [
    { f: 50, en: '.nv-base::Trap', clic: true },
    { f: 120, en: '.nv-base::Cumbia', clic: true },
    { f: 240, en: celda('Bombo', 5), hacer: golpe('Bombo', 5) },
    { f: 275, en: celda('Bombo', 13), hacer: golpe('Bombo', 13) },
    { f: 310, en: celda('Bongó grave', 1), hacer: golpe('Bongó grave', 1) },
    { f: 360, en: celda('Güira', 3), hacer: golpe('Güira', 3, false) },
    { f: 470, en: '.nv-pie-herr__boton--agregar', clic: true },
    { f: 540, en: '.nv-sonido__elegir::Cencerro', clic: true },
    { f: 600, en: '.nv-guardar-sonido__boton', clic: true },
    { f: 680, en: '.ventana__cerrar', clic: true },
    { f: 740, en: celda('Cencerro', 1), hacer: golpe('Cencerro', 1) },
    { f: 770, en: celda('Cencerro', 7), hacer: golpe('Cencerro', 7) },
    { f: 800, en: celda('Cencerro', 11), hacer: golpe('Cencerro', 11) },
    { f: 880, en: '.nv-musica .nv-subtitulo', senalar: true },
  ],
  rotulos: [
    [10, 210, 'Elige una *base: reggaetón, trap, cumbia…'],
    [210, 440, '*Toca una casilla para poner o quitar un golpe'],
    [440, 700, '¿Otro sonido? *Añadir capa, escoge y *Guardar'],
    [700, 860, 'Toca sus casillas para que *suene'],
    [860, 990, 'Dentro de una escena, sus golpes son *solo de ella'],
  ],
});

// ------------------------------------------------------------ 4. Sonidos

function PantallaSonidos() {
  const { proyecto } = useProyecto();
  return <VentanaSonidosPistas pista={proyecto.patron.filas[0]?.id} alCerrar={() => {}} />;
}

export const tutorialSonidos = crearTutorial({
  id: 'sonidos',
  titulo: 'Cambiar y grabar sonidos',
  descripcion: 'Escuchar, guardar el que te gusta y grabar uno tuyo.',
  duracion: 810,
  Pantalla: PantallaSonidos,
  inicial: proyectoNuevo,
  marco: { ancho: 1100, alto: 640, escala: 0.86 },
  guion: [
    { f: 60, en: '.nv-sonido__elegir::Conga', clic: true },
    { f: 120, en: '.nv-sonido__elegir::Clave', clic: true },
    { f: 250, en: '.nv-guardar-sonido__boton', clic: true },
    { f: 400, en: '.nv-boton--rojo::Grabar un efecto' },
    {
      f: 490,
      en: '.nv-boton--rojo::Grabar un efecto',
      hacer: (api) =>
        api.actualizar((p) => {
          p.sonidos.push({ id: 'demo-olla', nombre: 'Olla', url: SONOTECA_URL('cencerro'), duracion: 0.6 });
          const capa = p.patron.filas[0];
          if (capa) ponerSonido(p, capa.id, 'propio:demo-olla');
        }),
    },
    { f: 620, en: '.nv-sonido--activo', senalar: true },
  ],
  halos: [{ en: '.nv-boton--rojo::Grabar un efecto', desde: 404, hasta: 490 }],
  rotulos: [
    [10, 220, 'Toca un sonido para *oírlo'],
    [220, 370, '¿Te gusta? *Guardar sonido'],
    [370, 580, '¿No está? *Grábalo: una olla, una reja…'],
    [580, 810, 'Lo recortas y queda *sonando en tu capa'],
  ],
});

// ------------------------------------------------------------ 5. Mezcla

function PantallaMezcla() {
  return <VentanaMezcla alCerrar={() => {}} />;
}

const MAXIMO_VOZ = 1.6;
const volumen = (nombre: string, de: number, a: number) => (api: ApiDemo, t: number) =>
  api.actualizar((p) => {
    const v = de + (a - de) * t;
    if (nombre === 'Voz') p.narracion.volumen = v;
    else {
      const f = filaPorNombre(p, nombre);
      if (f) f.volumen = v;
    }
  });

export const tutorialMezcla = crearTutorial({
  id: 'mezcla',
  titulo: 'La mezcla',
  descripcion: 'Subir la voz y bajar lo que la tapa.',
  duracion: 570,
  Pantalla: PantallaMezcla,
  inicial: proyectoEjemplo,
  marco: { ancho: 900, alto: 640, escala: 0.86 },
  guion: [
    {
      f: 70,
      hasta: 150,
      en: 'input[aria-label="Volumen de Voz"]',
      tramo: volumen('Voz', 1, 1.45),
      fxDe: (t) => (1 + 0.45 * t) / MAXIMO_VOZ,
    },
    {
      f: 230,
      hasta: 300,
      en: 'input[aria-label="Volumen de Bombo"]',
      tramo: volumen('Bombo', 0.9, 0.45),
      fxDe: (t) => 0.9 - 0.45 * t,
    },
    {
      f: 330,
      hasta: 390,
      en: 'input[aria-label="Volumen de Shaker"]',
      tramo: volumen('Shaker', 0.45, 0.15),
      fxDe: (t) => 0.45 - 0.3 * t,
    },
    { f: 460, en: '.nv-mezcla__pie .nv-boton--primario', senalar: true },
  ],
  rotulos: [
    [10, 200, 'En *Mezcla subes o bajas cada sonido'],
    [200, 420, 'Baja lo que tape la *voz'],
    [420, 570, 'Dale *▶ y mueve mientras escuchas'],
  ],
});

// ------------------------------------------------------------ 6. Visuales

/** Una foto de muestra, dibujada aquí mismo: un atardecer con edificios (franjas claras y oscuras). */
let fotoDemo: string | null = null;
function fotoDeMuestra(): string {
  if (fotoDemo) return fotoDemo;
  const c = document.createElement('canvas');
  c.width = 320;
  c.height = 200;
  const g = c.getContext('2d');
  if (!g) return '';
  const cielo = g.createLinearGradient(0, 0, 320, 0);
  cielo.addColorStop(0, '#13224a');
  cielo.addColorStop(0.5, '#ff7a1a');
  cielo.addColorStop(1, '#1d7a52');
  g.fillStyle = cielo;
  g.fillRect(0, 0, 320, 200);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = i % 2 ? '#ffe9a8' : '#2b0f3a';
    g.fillRect(16 + i * 21, 50 + (i % 3) * 22, 13, 150);
  }
  fotoDemo = c.toDataURL('image/png');
  return fotoDemo;
}

/** La foto de muestra ya leída como datos (franjas: la luz sube y baja). */
function archivoDeMuestra(): ArchivoDatos {
  const n = 64;
  const onda = (k: number) => Array.from({ length: n }, (_, i) => 0.5 + 0.45 * Math.sin((i / n) * Math.PI * k));
  const luz = onda(14);
  return {
    id: 'demo-foto',
    nombre: 'Foto 1',
    tipo: 'imagen',
    valores: luz,
    colores: ['#13224a', '#ff7a1a', '#ffe9a8', '#2b0f3a', '#1d7a52'],
    canales: {
      luz,
      rojo: onda(3),
      verde: onda(2),
      azul: onda(5),
      tono: onda(4),
      saturacion: onda(6),
      detalle: onda(20),
      bits: Array.from({ length: 256 }, (_, i) => (i % 3 === 0 ? 1 : 0)),
    },
    url: fotoDeMuestra(),
  };
}

/** Visuales dentro de la primera escena: los golpes son de cada escena. */
function PantallaVisuales() {
  const { proyecto } = useProyecto();
  return (
    <div className="nv-editor__cuerpo tu-real__editor">
      <ImagenEscena escena={proyecto.escenas[0] ?? null} indice={0} />
    </div>
  );
}

function proyectoVisuales(): Proyecto {
  const p = proyectoEjemplo();
  p.visual.algoritmo = 'flujo';
  p.visual.imagenUrl = undefined;
  p.conexionesVisual = [];
  p.archivosDatos = [];
  return p;
}

/** Pone una cajita en una caja de «Mover la imagen». 'golpe:bombo' se traduce al bombo de la base. */
const ponerCajita = (fuente: string, destino: string) => (api: ApiDemo) =>
  api.actualizar((p) => {
    const bombo = p.patron.filas.find((f) => f.nombre === 'Bombo');
    const clave = fuente === 'golpe:bombo' && bombo ? `golpe:${bombo.id}` : fuente;
    p.conexionesVisual = p.conexionesVisual.filter((c) => c.destino !== destino);
    p.conexionesVisual.push(nuevaConexion(clave, destino));
  });

/** Enciende la casilla de un golpe (en la app se toca la casilla; aquí la enciende el guion). */
const golpeEn = (efecto: GolpeVisual, paso: number) => (api: ApiDemo) =>
  api.actualizar((p) => ponerPasoEfecto(p, null, efecto, paso, true));

export const tutorialVisuales = crearTutorial({
  id: 'visuales',
  titulo: 'Visuales: fotos y cajitas',
  descripcion: 'El estilo, tus fotos y las cajitas que mueven la imagen.',
  duracion: 960,
  Pantalla: PantallaVisuales,
  inicial: proyectoVisuales,
  marco: { ancho: 1280, alto: 680, escala: 0.84 },
  guion: [
    { f: 40, en: '.nv-estilo-chico::Nebulosa', clic: true },
    {
      f: 140,
      en: '.nv-foto-chica--subir',
      hacer: (api) => api.actualizar((p) => p.archivosDatos.push(archivoDeMuestra())),
    },
    { f: 220, en: '.nv-foto-chica__imagen', clic: true },
    // La mano toma la cajita y la lleva a la caja (en la app se arrastra; aquí la pone el guion).
    { f: 285, en: '.nv-bandeja__pestana::Instrumentos', clic: true },
    { f: 310, en: '.nv-cajita::Bombo' },
    { f: 350, en: '[data-caja="velocidad"]', hacer: ponerCajita('golpe:bombo', 'velocidad') },
    { f: 400, en: '.nv-bandeja__pestana::Fotos', clic: true },
    { f: 425, en: '.nv-cajita::Luz' },
    { f: 470, en: '[data-caja="tamano"]', hacer: ponerCajita('archivo:demo-foto:luz', 'tamano') },
    { f: 540, en: '.nv-caja__cuanto', clic: true },
    { f: 590, en: '.nv-bandeja__pestana::Relato', clic: true },
    { f: 615, en: '.nv-cajita::Emoción' },
    { f: 660, en: '[data-caja="paleta"]', hacer: ponerCajita('emocion', 'paleta') },
    { f: 730, en: '.nv-selector__op::Golpes', clic: true },
    { f: 780, en: 'button[aria-label="Zoom, paso 1"]', hacer: golpeEn('zoom', 0) },
    { f: 810, en: 'button[aria-label="Zoom, paso 9"]', hacer: golpeEn('zoom', 8) },
    { f: 845, en: 'button[aria-label="Destello, paso 5"]', hacer: golpeEn('destello', 4) },
    { f: 875, en: 'button[aria-label="Destello, paso 13"]', hacer: golpeEn('destello', 12) },
    { f: 915, en: 'button[aria-label="Probar Giro"]', clic: true },
  ],
  rotulos: [
    [10, 110, 'Elige un *estilo'],
    [110, 290, 'Sube tus *fotos: cada una trae sus cajitas'],
    [290, 590, 'Pon una *cajita en una caja: ese dato la mueve'],
    [590, 710, '*Colores: la emoción pinta la obra'],
    [710, 960, 'En *Golpes, como en la música: toca las casillas'],
  ],
});
