// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Los tutoriales principales, hechos con la interfaz de verdad: Historia,
 * Voz, Música, Sonidos, Visuales y Función (rehechos el 23 nov 2026 para la
 * interfaz de cinco pasos). Son los que se abren solos la primera vez
 * que se entra a cada parte (reemplazan al recorrido guiado, que en la
 * prueba nadie leía).
 *
 * Cada uno es una pantalla real de la app con un proyecto de demostración,
 * un guion de toques y unos rótulos cortos. Ver `real.tsx`.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { crearProyectoInicial } from '../estado/proyecto';
import { aplicarPreset, nuevaConexion, sincronizarReglas } from '../estado/musica';
import { cargarEjemplo } from '../estado/escenas';
import { ponerGolpe } from '../estado/patronEscena';
import { ponerPasoEfecto } from '../estado/efectos';
import type { ArchivoDatos, GolpeVisual, Proyecto } from '../estado/tipos';
import { PasoHistoria } from '../narrativa/PasoHistoria';
import { PasoVoz } from '../narrativa/PasoVoz';
import { PasoMusica } from '../narrativa/PasoMusica';
import { PasoVisuales } from '../narrativa/PasoVisuales';
import { PasoFuncion } from '../narrativa/PasoFuncion';
import { VentanaSonidosCapa } from '../narrativa/VentanaSonidosCapa';
import { PISTA_NUEVA } from '../narrativa/VentanaSonidosPistas';
import type { ApiDemo } from '../estado/ProyectoContext';
import type { Composicion } from './motor';
import { Fundido, Rotulos } from './piezas';
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

const tramo = (nombre: string) => `.nv-lec__tramo::${nombre}`;

export const tutorialHistoria = crearTutorial({
  id: 'historia',
  titulo: 'Escribe tu historia',
  descripcion: 'El recorrido, el monólogo, las escenas y sus emociones.',
  duracion: 960,
  Pantalla: PantallaHistoria,
  inicial: proyectoNuevo,
  guion: [
    { f: 45, en: '.nv-his-nodo--sigue .nv-his-nodo__circulo', senalar: true },
    { f: 150, en: tramo('MONÓLOGO'), clic: true },
    { f: 215, en: '.nv-his-boton::Usar un ejemplo', clic: true },
    { f: 300, en: '.nv-his-mono__escala', senalar: true },
    { f: 380, en: tramo('RECORTE'), clic: true },
    { f: 440, en: 'button[aria-label="Más escenas"]', clic: true },
    { f: 490, en: 'button[aria-label="Más escenas"]', clic: true },
    { f: 560, en: tramo('EMOCIONES'), clic: true },
    { f: 620, en: '.nv-his-emocion::Tensión', clic: true },
    { f: 680, en: '.nv-his-emo__fuerza button::Fuerte', clic: true },
    { f: 740, en: 'button[aria-label="Escena siguiente"]', clic: true },
    { f: 790, en: '.nv-his-emocion::Alegría', clic: true },
    { f: 870, en: '.nv-lec__pie .nv-lec__seguir', senalar: true },
  ],
  rotulos: [
    [10, 140, 'Toca una *estación y anota lo que viviste'],
    [140, 370, 'Escribe tu *monólogo: unas 100 palabras'],
    [370, 550, 'Pártelo en *escenas con + y −'],
    [550, 850, 'Dale a cada escena su *emoción y su fuerza'],
    [850, 960, 'Todo *se guarda solo. Luego, a la *Voz'],
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

/** Abre una escena (o la base, con -1) en las pantallas que la reciben por props: el guion manda un evento. */
const abrirEscena = (i: number) => () => window.dispatchEvent(new CustomEvent('tu-abrir', { detail: i }));
function useAbierta(): [string, (id: string) => void] {
  const { proyecto } = useProyecto();
  const [abierta, setAbierta] = useState('general');
  useEffect(() => {
    const oir = (ev: Event) => {
      const i = (ev as CustomEvent<number>).detail;
      setAbierta(i < 0 ? 'general' : (proyecto.escenas[i]?.id ?? 'general'));
    };
    window.addEventListener('tu-abrir', oir);
    return () => window.removeEventListener('tu-abrir', oir);
  }, [proyecto.escenas]);
  return [abierta, setAbierta];
}

function PantallaMusica() {
  const [abierta, setAbierta] = useAbierta();
  return (
    <main className="nv-contenido">
      <PasoMusica abierta={abierta} alIr={setAbierta} />
    </main>
  );
}

export const tutorialMusica = crearTutorial({
  id: 'musica',
  titulo: 'La música: base y escenas',
  descripcion: 'Un género para arrancar, las casillas y la música de cada escena.',
  duracion: 900,
  Pantalla: PantallaMusica,
  inicial: proyectoEjemplo,
  marco: { ancho: 1280, alto: 640, escala: 0.88 },
  guion: [
    { f: 45, en: '.nv-plantilla::Trap', clic: true },
    { f: 110, en: '.nv-plantilla::Reggaetón', clic: true },
    { f: 210, en: celda('Bombo', 5), hacer: golpe('Bombo', 5) },
    { f: 240, en: celda('Bombo', 13), hacer: golpe('Bombo', 13) },
    { f: 270, en: celda('Caja', 3), hacer: golpe('Caja', 3) },
    { f: 300, en: celda('Caja', 3), hacer: golpe('Caja', 3, false) },
    { f: 380, en: '.nv-mesa__velocidad', senalar: true },
    { f: 470, en: '.nv-linea__escena', hacer: abrirEscena(0) },
    { f: 560, en: '.nv-mesa__pie .nv-emo', senalar: true },
    { f: 640, en: '.nv-herr', senalar: true },
    { f: 740, en: '.nv-mesa__lista', clic: true },
  ],
  rotulos: [
    [10, 190, 'Elige un *género para arrancar'],
    [190, 360, '*Toca una casilla para poner o quitar un golpe'],
    [360, 450, 'La *velocidad de toda la obra'],
    [450, 620, 'Entra a una *escena: su emoción cambia la música'],
    [620, 720, '*Graba tus sonidos o añade capas'],
    [720, 900, 'Cuando suene como quieres, *márcala lista'],
  ],
});

// ------------------------------------------------------------ 4. Sonidos

function PantallaSonidos() {
  return <VentanaSonidosCapa pista={PISTA_NUEVA} alCerrar={() => {}} alGrabar={() => {}} />;
}

export const tutorialSonidos = crearTutorial({
  id: 'sonidos',
  titulo: 'Añadir y grabar sonidos',
  descripcion: 'Escuchar la Sonoteca, guardar una capa y grabar uno propio.',
  duracion: 720,
  Pantalla: PantallaSonidos,
  inicial: proyectoNuevo,
  marco: { ancho: 1100, alto: 640, escala: 0.86 },
  guion: [
    { f: 50, en: '.nv-biblio__grupo::Ciudad', clic: true },
    { f: 110, en: '.nv-ficha-son::Bocina', clic: true },
    { f: 180, en: '.nv-ficha-son::Metro', clic: true },
    { f: 270, en: '.nv-biblio__pie .nv-boton--primario', clic: true },
    { f: 400, en: '.nv-grabalo .nv-boton--rojo', senalar: true },
    { f: 540, en: '.nv-grabalo label.nv-boton', senalar: true },
  ],
  halos: [{ en: '.nv-grabalo .nv-boton--rojo', desde: 405, hasta: 520 }],
  rotulos: [
    [10, 250, 'Toca un sonido para *oírlo'],
    [250, 380, '¿Te gusta? *Guárdalo: queda como capa nueva'],
    [380, 530, '¿No está? *Grábalo: una reja, una olla, un pito…'],
    [530, 720, 'O *sube un audio de tu celular'],
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

/** Visuales: toda la obra, y luego una escena. */
function PantallaVisuales() {
  const [abierta, setAbierta] = useAbierta();
  return (
    <main className="nv-contenido">
      <PasoVisuales abierta={abierta} alIr={setAbierta} />
    </main>
  );
}

function proyectoVisuales(): Proyecto {
  const p = proyectoEjemplo();
  p.visual.algoritmo = 'flujo';
  p.visual.imagenUrl = undefined;
  p.conexionesVisual = [];
  p.archivosDatos = [archivoDeMuestra()];
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

const paso = (nombre: string) => `.nv-receta__paso::${nombre}`;

export const tutorialVisuales = crearTutorial({
  id: 'visuales',
  titulo: 'Visuales: estilo, colores y movimiento',
  descripcion: 'Los cuatro pasos de la imagen y cómo darle a una escena la suya.',
  duracion: 990,
  Pantalla: PantallaVisuales,
  inicial: proyectoVisuales,
  marco: { ancho: 1280, alto: 680, escala: 0.84 },
  guion: [
    { f: 45, en: '.nv-eleccion::Caleidoscopio', clic: true },
    { f: 110, en: '.nv-eleccion::Ondas', clic: true },
    { f: 190, en: paso('Colores'), clic: true },
    { f: 250, en: '.nv-eleccion::Magma', clic: true },
    { f: 320, en: paso('Movimiento'), clic: true },
    // La mano toma la cajita y la lleva a la caja (en la app se arrastra; aquí la pone el guion).
    { f: 370, en: '.nv-cajita::Voz' },
    { f: 420, en: '[data-caja="obra:zoom"]', hacer: ponerCajita('voz', 'obra:zoom') },
    { f: 470, en: '.nv-cajita--foto-entera' },
    { f: 520, en: '[data-caja="obra:brillo"]', hacer: ponerCajita('archivo:demo-foto:luz', 'obra:brillo') },
    { f: 600, en: paso('Golpes'), clic: true },
    { f: 650, en: 'button[aria-label="Destello, paso 1"]', hacer: golpeEn('destello', 0) },
    { f: 680, en: 'button[aria-label="Destello, paso 9"]', hacer: golpeEn('destello', 8) },
    { f: 710, en: 'button[aria-label="Zoom, paso 5"]', hacer: golpeEn('zoom', 4) },
    { f: 810, en: '.nv-cinta__escena', hacer: abrirEscena(0) },
    { f: 880, en: '.nv-cinta__obra', senalar: true },
  ],
  rotulos: [
    [10, 180, 'Elige un *estilo para dibujar la obra'],
    [180, 310, 'Sus *colores'],
    [310, 590, 'Pon una *cajita en una caja: eso mueve la imagen'],
    [590, 790, 'En *Golpes, toca las casillas: destellos a tiempo'],
    [790, 990, 'Toca una *escena para darle su propia imagen'],
  ],
});

// ------------------------------------------------------------ 7. Función

function PantallaFuncion() {
  return (
    <main className="nv-contenido">
      <PasoFuncion />
    </main>
  );
}

export const tutorialFuncion = crearTutorial({
  id: 'funcion',
  titulo: 'Función: verla y mandarla',
  descripcion: 'Ver la pieza entera, exportarla y enviarla a la galería.',
  duracion: 480,
  Pantalla: PantallaFuncion,
  inicial: proyectoEjemplo,
  guion: [
    { f: 50, en: '.nv-pie .nv-boton--primario', senalar: true },
    { f: 170, en: '.nv-pie .nv-selector', senalar: true },
    { f: 300, en: '[data-tour="exportar"]', senalar: true },
  ],
  rotulos: [
    [10, 150, '*Ver la pieza: entera, como en la presentación'],
    [150, 280, '*Sin música deja solo la voz'],
    [280, 480, '*Exportar video y *enviar a la galería: eso ven los jurados'],
  ],
});
