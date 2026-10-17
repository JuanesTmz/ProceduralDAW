/**
 * Motor de audio: el único lugar que habla con Tone.js.
 * Los componentes de React piden cosas ("suena esta fila", "cambia el BPM")
 * y el motor se encarga del grafo de audio y del reloj del Transport.
 *
 * Los navegadores no permiten sonido hasta que el usuario hace algo,
 * así que todo el grafo se construye en el primer iniciar().
 *
 * Idea clave de la secuenciación: el motor guarda una copia viva del proyecto
 * y el reloj la lee en cada paso. Así, editar la grilla mientras suena aplica
 * el cambio al instante, sin reprogramar nada ni cortar el audio.
 */
import * as Tone from 'tone';
import { crearVoz, type VozPercusion } from './kit';
import { renderizarPieza } from '../generativo/renderPieza';
import { notaTone, semitonoDeGrado } from '../generativo/escalas';
import {
  acentoDePaso,
  ajusteDeRemate,
  debeSonar,
  densidadDeIntensidad,
  enRemate,
  filaDeRemate,
  humanizar,
  nivelDeCapa,
  PROBABILIDAD_NIVEL,
  VELOCIDAD_NIVEL,
  volumenDeIntensidad,
} from '../generativo/motorGenerativo';
import type { NombreEscala } from '../generativo/escalas';
import { ESCALAS_POR_LUZ, VALOR_EMOCION } from '../estado/musica';
import { analizador } from '../visual/analizador';
import type {
  Efectos,
  Fila,
  Melodia,
  ModoReproduccion,
  Proyecto,
  Seccion,
  TipoSonido,
} from '../estado/tipos';

interface EntradaVoz {
  voz: VozPercusion;
  /** Volumen de la fila, entre la voz y el bus de mezcla. */
  ganancia: Tone.Gain;
  tipo: TipoSonido;
  sampleUrl?: string;
}

/** Aviso que el motor manda a la interfaz en cada paso, para pintar la cabeza lectora. */
/**
 * Lo que se puede reproducir. Todo botón de «oír» de la app pide una de
 * estas cuatro cosas, y el motor solo hace una a la vez: lo último que se
 * pidió interrumpe a lo anterior.
 *
 *  - pieza:  toda la pieza, escena tras escena, con voz.
 *  - escena: una sola escena, con voz y cajitas, y para al terminarla.
 *  - capa:   un solo sonido aislado (id de fila, o 'melodia'). Dentro de una
 *            escena suena como en ella y para al terminarla; en General
 *            (escena -1) es el patrón en bucle.
 *  - bucle:  el patrón en bucle, con todas las capas.
 */
export type Reproduccion =
  | { tipo: 'pieza' }
  | { tipo: 'escena'; indice: number; desde?: number }
  | { tipo: 'capa'; id: string; escena: number }
  | { tipo: 'bucle' };

/** El nombre estable de una reproducción: así cada botón sabe si es la que suena. */
export function claveDe(r: Reproduccion): string {
  switch (r.tipo) {
    case 'pieza':
      return 'pieza';
    case 'escena':
      return `escena:${r.indice}`;
    case 'capa':
      return `capa:${r.escena}:${r.id}`;
    default:
      return 'bucle';
  }
}

export type OyentePaso = (paso: number) => void;

/** Aviso al entrar en una sección nueva. -1 cuando la pieza termina. */
export type OyenteSeccion = (indice: number) => void;

/** Cuánto se sube la voz después de comprimirla. */
const REALCE_VOZ = 1.8;
/** A cuánto baja la música mientras habla la voz (1 = no baja). */
const MUSICA_BAJO_VOZ = 0.32;

class MotorAudio {
  private iniciado = false;
  private bus: Tone.Gain | null = null;
  private filtro: Tone.Filter | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private reverb: Tone.Reverb | null = null;
  private maestro: Tone.Gain | null = null;
  private clic: Tone.MembraneSynth | null = null;
  private matriz: Tone.PolySynth<Tone.Synth> | null = null;
  private ecoMatriz: Tone.FeedbackDelay | null = null;
  private gananciaMatriz: Tone.Gain | null = null;
  /** El sonido propio del estudiante tocando la matriz, afinado por casilla. */
  private muestreadorMatriz: Tone.Sampler | null = null;
  private urlMuestreador: string | undefined;
  private notaMuestreador: string | undefined;
  /** El audio del sonido propio ya cargado, para rehacer el sampler sin volver a bajarlo. */
  private bufferMuestreador: AudioBuffer | null = null;

  private voces = new Map<string, EntradaVoz>();

  /** Copia viva del proyecto: la lee el reloj en cada paso. */
  private proyecto: Proyecto | null = null;
  private idRepeticion: number | null = null;
  private paso = 0;
  /** Vuelta del loop: entra en el azar para que cada repetición sea distinta. */
  private vuelta = 0;
  private oyentesPaso = new Set<OyentePaso>();

  /** Recorrido por secciones. */
  private modo: ModoReproduccion = 'patron';
  private indiceSeccion = 0;
  private vueltaEnSeccion = 0;
  private terminando = false;
  /**
   * Una sola pista sonando aislada (un id de fila o 'melodia'), o nada.
   * Vive aquí y no en el proyecto: cualquier otro play la borra, así que
   * siempre manda lo último que se tocó.
   */
  private soloPista: string | null = null;
  /**
   * Cuenta cada petición de play y cada stop. Una petición que despierta
   * (de cargar el audio, o de un temporizador) con otro número ya no vale:
   * otra cosa pasó entretanto, y no se pisa.
   */
  private pedido = 0;
  /** Lo que se pidió oír ahora, desde el instante en que se pidió. */
  private pedida: Reproduccion | null = null;
  private gananciaSeccion: Tone.Gain | null = null;
  /** Baja la música mientras habla la voz de una escena, y la sube al terminar. */
  private agacharse: Tone.Gain | null = null;
  /** Una grabación por escena, guardada por su url. */
  private vocesEscena = new Map<string, Tone.Player>();
  /** Desde qué sección arranca la pieza, y si para al terminarla. */
  private desde = 0;
  private soloUna = false;
  /** Segundos dentro de la escena desde los que arranca (la barra de la escena). */
  private desdeSegundo = 0;
  private musicaApagada = false;
  /** Lo que mueven las conexiones y el gesto: volumen de la música, aparte de todo lo demás. */
  private modulador: Tone.Gain | null = null;
  /** Lee qué tan fuerte va la voz, para usarla como dato. */
  private medidorVoz: Tone.Meter | null = null;
  /** Se enciende con cada bombo y se apaga sola: el bombo como dato. */
  private envolventeBombo = 0;
  /** Cuándo empezó la sección que suena y cuánto dura (segundos de audio). */
  private inicioSeccionT = 0;
  private duracionSeccionT = 1;
  /**
   * Cuándo empieza a oírse cada sección (reloj de audio). La pantalla se
   * guía por esto y no por los pasos, que se agendan un poco antes de sonar.
   */
  private iniciosOidos: { indice: number; t: number }[] = [];
  /** Las cajitas de silencio callan la música aquí, sin tocar lo demás. */
  private silenciador: Tone.Gain | null = null;
  /** Los sonidos de las cajitas: no se agachan con la voz, acompañan la palabra. */
  private gananciaCajitas: Tone.Gain | null = null;
  private sueltas = new Map<string, Tone.Player>();
  /** El gesto que se está tocando en vivo ahora mismo, si hay. */
  private gestoVivo: { x: number; y: number } | null = null;
  private oyentesSeccion = new Set<OyenteSeccion>();

  /** La narración: va aparte de la música, sin efectos y sin el fade del cierre. */
  private narrador: Tone.Player | null = null;
  private gananciaNarrador: Tone.Gain | null = null;
  private limitador: Tone.Limiter | null = null;
  private urlNarracion: string | undefined;
  /** Instante del contexto de audio en que arrancó la pieza. */
  private inicioPieza = 0;
  /**
   * Cambia con cada play y cada stop. Sirve para que una grabación que
   * termina de cargar tarde no arranque sobre una reproducción que ya pasó.
   */
  private generacionPieza = 0;
  /** Instante en que entra la voz. Lo usa el texto cinético para sincronizarse. */
  private inicioNarracion = 0;

  get musicaSilenciada() {
    return this.musicaApagada;
  }

  get estaIniciado() {
    return this.iniciado;
  }

  get pasoActual() {
    return this.paso;
  }

  get estaSonando() {
    return this.iniciado && Tone.getTransport().state === 'started';
  }

  /** Suena y todavía no llegó al final (las colas del cierre ya no cuentan). */
  get sigueSonando() {
    return this.estaSonando && !this.terminando;
  }

  /** La clave de lo que se pidió oír (suene ya o esté cargando), o null. */
  get claveActiva(): string | null {
    return this.pedida ? claveDe(this.pedida) : null;
  }

  /** Cuál es el pedido actual: sirve para saber si algo lo arrancó uno mismo. */
  get numeroDePedido(): number {
    return this.pedido;
  }

  /** La sección que suena, o -1 si está en bucle o detenido. */
  get seccionActual() {
    if (this.modo !== 'pieza' || !this.estaSonando) return -1;
    return this.indiceSeccion;
  }

  /**
   * Segundos transcurridos desde que entró la voz, o -1 si no está sonando.
   * Negativo mientras la voz aún no entra: el texto sabe que debe esperar.
   */
  get segundosDeNarracion(): number {
    if (!this.estaSonando || this.modo !== 'pieza' || this.inicioNarracion <= 0) return -1;
    return Tone.now() - this.inicioNarracion;
  }

  /** Avance de la pieza completa, de 0 a 1, en segundos de lo que se está oyendo. */
  get progresoPieza(): number {
    const proyecto = this.proyecto;
    const pos = this.posicionOida;
    if (!proyecto || !pos) return 0;
    const duraciones = proyecto.secciones.map((s) => this.duracionSeccion(s));
    const total = duraciones.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const previas = duraciones.slice(0, pos.indice).reduce((a, b) => a + b, 0);
    return Math.min(1, (previas + pos.segundos) / total);
  }

  /** El instante del reloj de audio que está saliendo por el parlante ahora. */
  private get ahoraOido(): number {
    const ctx = Tone.getContext().rawContext as AudioContext;
    return ctx.currentTime - (ctx.outputLatency || 0);
  }

  /** Qué sección se está oyendo y cuántos segundos lleva, o null si no suena la pieza. */
  get posicionOida(): { indice: number; segundos: number } | null {
    if (!this.estaSonando || this.modo !== 'pieza' || this.iniciosOidos.length === 0) return null;
    const ahora = this.ahoraOido;
    let actual = this.iniciosOidos[0];
    for (const x of this.iniciosOidos) if (x.t <= ahora) actual = x;
    const s = this.proyecto?.secciones[actual.indice];
    const largo = s ? this.duracionSeccion(s) : Infinity;
    return { indice: actual.indice, segundos: Math.max(0, Math.min(largo, ahora - actual.t)) };
  }

  /** El reloj del contexto, sin el adelanto de Tone: lo que ya está sonando de verdad. */
  private get relojReal(): number {
    return (Tone.getContext().rawContext as AudioContext).currentTime;
  }

  /**
   * Calla la música desde ahora hasta `hasta`. Tone agenda los golpes con
   * 100 ms de adelanto: sin esto, al parar o cambiar de reproducción
   * todavía sonarían los últimos golpes de lo anterior.
   */
  private cortarLoAgendado(hasta: number): void {
    const g = this.modulador?.gain;
    if (!g) return;
    g.cancelScheduledValues(0);
    g.setValueAtTime(0, this.relojReal);
    g.setValueAtTime(1, hasta);
  }

  /**
   * Corta lo que todavía suena: las muestras largas de las capas y las notas
   * de la melodía, que de otro modo se oyen hasta el final de su cola
   * (la campana tarda más de un segundo en apagarse).
   */
  private cortarSonando(): void {
    for (const e of this.voces.values()) e.voz.parar?.();
    // Las notas de la campana tienen más de un segundo de cola y el eco las
    // repite: no hay forma de apagarlas a medias. Se arma la cadena de nuevo,
    // y lo que sonaba se corta de golpe con el nodo viejo.
    this.armarMatriz();
  }

  /**
   * La cadena de la melodía: campana → eco → volumen → bus. Se arma al
   * iniciar y cada vez que se corta, para empezar siempre sin restos.
   */
  private armarMatriz(): void {
    if (!this.bus) return;
    const volumen = this.gananciaMatriz?.gain.value ?? 0.7;
    this.matriz?.dispose();
    this.ecoMatriz?.dispose();
    this.gananciaMatriz?.dispose();
    this.gananciaMatriz = new Tone.Gain(volumen).connect(this.bus);
    this.ecoMatriz = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.34,
      wet: 0.28,
    }).connect(this.gananciaMatriz);
    this.matriz = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 1.1, sustain: 0.015, release: 1.4 },
    }).connect(this.ecoMatriz);
    this.matriz.maxPolyphony = 24;
    this.matriz.volume.value = -11;
    // El sonido propio de la melodía cuelga del eco: se rehace también,
    // porque su cola seguiría sonando por la cadena nueva.
    this.armarMuestreador();
  }

  /** Arranca el contexto de audio y arma el grafo. Idempotente. */
  async iniciar(): Promise<void> {
    if (this.iniciado) return;
    await Tone.start();

    // El limitador del final deja que la voz suba sin que nada sature.
    this.limitador = new Tone.Limiter(-1).toDestination();
    this.maestro = new Tone.Gain(0.85).connect(this.limitador);
    this.reverb = new Tone.Reverb({ decay: 2.4, wet: 0.16 }).connect(this.maestro);
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0 }).connect(
      this.reverb,
    );
    this.filtro = new Tone.Filter({ type: 'lowpass', frequency: 18000, Q: 0.6 }).connect(this.delay);
    // La intensidad de cada sección se aplica aquí, antes de los efectos.
    this.gananciaSeccion = new Tone.Gain(1).connect(this.filtro);
    this.agacharse = new Tone.Gain(1).connect(this.gananciaSeccion);
    this.silenciador = new Tone.Gain(1).connect(this.agacharse);
    this.modulador = new Tone.Gain(1).connect(this.silenciador);
    this.gananciaCajitas = new Tone.Gain(0.9).connect(this.maestro);
    for (const r of this.sueltas.values()) r.connect(this.gananciaCajitas);
    this.bus = new Tone.Gain(1).connect(this.modulador);

    this.clic = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
    }).connect(this.bus);

    // Voz de la matriz: campana suave con cola, para que los acordes se
    // superpongan y la grilla suene envolvente aunque se toquen notas sueltas.
    this.armarMatriz();

    // La voz cuelga del maestro, no del bus: el filtro, el eco y el
    // desvanecido del cierre son de la música, no del relato.
    // La voz siempre por encima de la música: se comprime (las partes suaves
    // suben, las fuertes no se disparan) y entra con más ganancia que la música.
    const realceVoz = new Tone.Gain(REALCE_VOZ).connect(this.maestro);
    const compresorVoz = new Tone.Compressor({ threshold: -26, ratio: 4, attack: 0.004, release: 0.18, knee: 8 }).connect(realceVoz);
    this.gananciaNarrador = new Tone.Gain(1).connect(compresorVoz);
    for (const reproductor of this.vocesEscena.values()) reproductor.connect(this.gananciaNarrador);
    this.medidorVoz = new Tone.Meter({ normalRange: true, smoothing: 0.85 });
    this.gananciaNarrador.connect(this.medidorVoz);

    const transporte = Tone.getTransport();
    transporte.bpm.value = this.proyecto?.bpm ?? 100;
    // El visual escucha la salida final: lo mismo que oye el estudiante.
    analizador.conectar();
    this.iniciado = true;

    if (this.proyecto) this.sincronizar(this.proyecto);
  }

  /** Sonido de prueba del andamiaje: confirma que el audio funciona. */
  async probarSonido(): Promise<void> {
    await this.iniciar();
    this.clic?.triggerAttackRelease('C3', '32n', Tone.now(), 0.9);
  }

  // ---------------------------------------------------------------- reloj

  alCambiarPaso(oyente: OyentePaso): () => void {
    this.oyentesPaso.add(oyente);
    return () => this.oyentesPaso.delete(oyente);
  }

  private avisarPaso(paso: number) {
    for (const oyente of this.oyentesPaso) oyente(paso);
  }

  alCambiarSeccion(oyente: OyenteSeccion): () => void {
    this.oyentesSeccion.add(oyente);
    return () => this.oyentesSeccion.delete(oyente);
  }

  private avisarSeccion(indice: number) {
    for (const oyente of this.oyentesSeccion) oyente(indice);
  }

  /**
   * El único camino a «sonar». Lo anterior se corta en seco, se espera a
   * que el audio esté listo, y si mientras tanto llegó otro pedido (o un
   * stop), este se deja caer sin sonar.
   */
  async reproducirCon(r: Reproduccion): Promise<void> {
    this.detener();
    const mio = ++this.pedido;
    this.pedida = r;
    await this.iniciar();
    if (mio !== this.pedido) return;

    switch (r.tipo) {
      case 'pieza':
        this.modo = 'pieza';
        this.desde = 0;
        this.soloUna = false;
        this.soloPista = null;
        this.desdeSegundo = 0;
        break;
      case 'escena':
        this.modo = 'pieza';
        this.desde = Math.max(0, r.indice);
        this.soloUna = true;
        this.soloPista = null;
        this.desdeSegundo = Math.max(0, r.desde ?? 0);
        break;
      case 'capa':
        this.modo = r.escena >= 0 ? 'pieza' : 'patron';
        this.desde = Math.max(0, r.escena);
        this.soloUna = r.escena >= 0;
        this.soloPista = r.id;
        this.desdeSegundo = 0;
        break;
      default:
        this.modo = 'patron';
        this.desde = 0;
        this.soloUna = false;
        this.soloPista = null;
        this.desdeSegundo = 0;
    }
    this.arrancar();
  }

  /** Compatibilidad con las pantallas viejas: el patrón o la pieza, según el modo. */
  async reproducir(): Promise<void> {
    if (this.pedida) return;
    await this.reproducirCon(this.modo === 'pieza' ? { tipo: 'pieza' } : { tipo: 'bucle' });
  }

  /** Pone en marcha el reloj con lo que `reproducirCon` dejó dispuesto. */
  private arrancar(): void {
    const transporte = Tone.getTransport();
    this.paso = 0;
    this.vuelta = 0;
    this.indiceSeccion = this.modo === 'pieza' ? this.desde : 0;
    this.vueltaEnSeccion = 0;
    this.terminando = false;
    // Los golpes que quedaron agendados de lo anterior no suenan: el volumen
    // de la música vuelve justo cuando arranca lo nuevo.
    this.cortarLoAgendado(Tone.now() + 0.098);

    // Un solo origen de tiempo para la música y para la voz: así la
    // narración cae siempre en el mismo punto, sin importar cuándo se cargó.
    const inicio = Tone.now() + 0.1;
    this.inicioPieza = inicio;
    this.generacionPieza += 1;

    this.iniciosOidos = [];
    if (this.modo === 'pieza') {
      const primera = this.proyecto?.secciones[this.desde];
      if (primera && this.proyecto) Tone.getTransport().bpm.value = this.proyecto.bpm * primera.factorTempo;
      let corrido = 0;
      if (primera && this.desdeSegundo > 0 && this.proyecto) {
        // Arrancar a mitad de escena: se salta a la vuelta y al paso que tocan.
        const n = this.proyecto.patron.cantidadPasos;
        const porPaso = 60 / (this.proyecto.bpm * primera.factorTempo) / 4;
        const paso = Math.floor(this.desdeSegundo / porPaso);
        if (paso < primera.compases * n) {
          this.vueltaEnSeccion = Math.floor(paso / n);
          this.paso = paso % n;
          corrido = paso * porPaso;
          Tone.getTransport().bpm.value = this.proyecto.bpm * primera.factorTempo;
        }
      }
      this.desdeSegundo = 0;
      if (primera) this.aplicarSeccion(primera, inicio, corrido);
      this.avisarSeccion(this.desde);
      if (this.desde === 0 && !this.soloPista) this.lanzarNarracion();
    } else {
      this.gananciaSeccion?.gain.cancelScheduledValues(Tone.now());
      this.gananciaSeccion?.gain.rampTo(1, 0.05);
      this.aplicarTempo();
    }

    if (this.idRepeticion === null) {
      // Un aviso cada semicorchea: el reloj de Tone, no el de JavaScript.
      this.idRepeticion = transporte.scheduleRepeat((tiempo) => this.tocarPaso(tiempo), '16n');
    }

    transporte.start(inicio);
  }

  /**
   * Arranca la voz en el instante que le toca dentro de la pieza.
   * Se agenda en el reloj de audio, no con setTimeout: así la palabra
   * cae siempre en el mismo punto de la música, sin derivar.
   */
  private lanzarNarracion(): void {
    const proyecto = this.proyecto;
    const narrador = this.narrador;
    if (!proyecto || !narrador) return;

    const { narracion } = proyecto;
    const segundosPorPaso = 60 / proyecto.bpm / 4;
    let espera = 0;
    for (const seccion of proyecto.secciones) {
      if (seccion.id === narracion.seccionInicio) break;
      espera +=
        (seccion.compases * proyecto.patron.cantidadPasos * segundosPorPaso) / seccion.factorTempo;
    }
    espera += Math.max(0, narracion.desfase);
    const generacion = this.generacionPieza;
    const objetivo = this.inicioPieza + espera;
    this.inicioNarracion = objetivo;

    const arrancar = () => {
      // Si mientras cargaba el estudiante paró, o volvió a darle play, no se pisa.
      // No se mira estaSonando: el transporte arranca en un instante futuro
      // y durante ese ratito todavía figura como detenido.
      if (this.generacionPieza !== generacion) return;
      if (narrador.state === 'started') narrador.stop();
      const ahora = Tone.now();
      if (objetivo > ahora) {
        narrador.start(objetivo);
      } else {
        // El audio tardó en cargar: entra por donde iba, no desde el principio.
        narrador.start(ahora, ahora - objetivo);
      }
    };

    if (narrador.loaded) arrancar();
    else void Tone.loaded().then(arrancar);
  }

  /** Un sonido aislado. Ver `Reproduccion`. */
  async reproducirSolo(id: string, escena = -1): Promise<void> {
    await this.reproducirCon({ tipo: 'capa', id, escena });
  }

  /** La pista que suena aislada, o null. */
  get pistaSola(): string | null {
    return this.pedida?.tipo === 'capa' ? this.pedida.id : null;
  }

  /** Toca la pieza entera, de la primera escena a la última. */
  async reproducirPieza(): Promise<void> {
    await this.reproducirCon({ tipo: 'pieza' });
  }

  /** Toca una sola escena de la pieza, y para al terminarla. Puede arrancar a mitad. */
  async reproducirEscena(indice: number, desdeSegundo = 0): Promise<void> {
    await this.reproducirCon({ tipo: 'escena', indice, desde: desdeSegundo });
  }

  /** El patrón en bucle, con todas las capas. */
  async reproducirBucle(): Promise<void> {
    await this.reproducirCon({ tipo: 'bucle' });
  }

  /** La escena que suena si se tocó una sola, o -1. */
  get escenaSola(): number {
    return this.pedida?.tipo === 'escena' ? this.pedida.indice : -1;
  }

  /** Cuánto dura la sección i, en segundos. */
  duracionDe(indice: number): number {
    const s = this.proyecto?.secciones[indice];
    return s ? this.duracionSeccion(s) : 0;
  }

  /** Bucle del patrón, o recorrido completo por el arco (pantallas viejas). */
  cambiarModo(modo: ModoReproduccion): void {
    if (this.modo === modo) return;
    const sonaba = this.pedida !== null;
    this.modo = modo;
    if (sonaba) void this.reproducirCon(modo === 'pieza' ? { tipo: 'pieza' } : { tipo: 'bucle' });
  }

  detener(): void {
    // Cualquier petición que esté esperando (carga de audio, temporizador) ya no vale.
    this.pedido += 1;
    this.pedida = null;
    this.soloPista = null;
    if (!this.iniciado) return;
    const transporte = Tone.getTransport();
    transporte.stop();
    transporte.position = 0;
    this.cortarSonando();
    this.generacionPieza += 1;
    this.inicioNarracion = 0;
    // Se para todo sin mirar el estado: lo agendado para más adelante
    // (la voz entra 0,15 s después, las cajitas más tarde) también se cancela.
    this.narrador?.stop();
    for (const voz of this.vocesEscena.values()) voz.stop();
    for (const r of this.sueltas.values()) r.stop();
    if (this.agacharse) {
      this.agacharse.gain.cancelScheduledValues(Tone.now());
      this.agacharse.gain.value = 1;
    }
    this.desde = 0;
    this.soloUna = false;
    this.iniciosOidos = [];
    transporte.bpm.cancelScheduledValues(0);
    // Los golpes que ya estaban agendados no se oyen; el volumen vuelve enseguida
    // para que una prueba de sonido justo después sí suene.
    this.cortarLoAgendado(this.relojReal + 0.2);
    this.silenciador?.gain.cancelScheduledValues(Tone.now());
    if (this.silenciador) this.silenciador.gain.value = 1;
    this.paso = 0;
    this.vueltaEnSeccion = 0;
    this.indiceSeccion = 0;
    this.terminando = false;
    if (this.gananciaSeccion) {
      this.gananciaSeccion.gain.cancelScheduledValues(Tone.now());
      this.gananciaSeccion.gain.value = 1;
    }
    // Lo que quedaba agendado para dibujar se tira: si no, un paso viejo
    // llega después del -1 y la pantalla cree que todavía suena.
    Tone.getDraw().cancel(0);
    this.avisarPaso(-1);
    this.avisarSeccion(-1);
  }

  alternarReproduccion(): void {
    if (this.estaSonando) this.detener();
    else void this.reproducir();
  }

  /**
   * Un paso del secuenciador. Se ejecuta en el hilo de audio con el tiempo
   * exacto en que debe sonar, por eso todo se agenda con ese `tiempo`.
   */
  private tocarPaso(tiempo: number): void {
    const proyecto = this.proyecto;
    if (!proyecto || this.terminando) return;
    // Tras un stop, el reloj de Tone todavía entrega unos 100 ms de pasos que ya
    // tenía encolados. Esos no son de esta reproducción: ni suenan ni cuentan.
    if (!this.pedida || tiempo < this.inicioPieza - 0.005) return;

    const { patron } = proyecto;
    const paso = this.paso % patron.cantidadPasos;

    // En modo pieza manda la sección: sus capas, su intensidad y su semilla.
    const seccion = this.modo === 'pieza' ? proyecto.secciones[this.indiceSeccion] : undefined;
    if (this.modo === 'pieza' && !seccion) {
      this.terminarPieza(tiempo);
      return;
    }
    const semillaActiva = seccion ? seccion.semilla : proyecto.semilla;
    // Sección a mano: suena exactamente lo dibujado, sin azar ni adelgazado.
    // (Y en Música Urbana el patrón en bucle también: lo dibujado, sin azar.)
    const aMano = seccion ? seccion.modo === 'manual' : proyecto.track === 'musica';
    const factorDensidad = seccion && !aMano ? densidadDeIntensidad(seccion.intensidad) : 1;

    // El remate: los últimos pasos antes de cambiar de parte suenan seguros
    // y más fuerte, y la pista del redoble rellena lo que tenía vacío.
    const ultimaVuelta = Boolean(
      seccion &&
        !aMano &&
        this.vueltaEnSeccion === seccion.compases - 1 &&
        this.indiceSeccion < proyecto.secciones.length - 1,
    );
    const remate = enRemate(paso, patron.cantidadPasos, ultimaVuelta);
    const ajuste = remate ? ajusteDeRemate(paso, patron.cantidadPasos) : null;
    const idRedoble = remate
      ? filaDeRemate(
          patron.filas.filter((f) => (seccion ? nivelDeCapa(seccion, f.id) > 0 : true)),
        )
      : null;

    // El swing retrasa las semicorcheas impares: es lo que hace que el ritmo
    // cojee en vez de ir cuadrado. El tiempo del transporte ya trae el tempo
    // propio de la parte, así que el retraso sale proporcionado solo.
    const segundosPorPaso = 60 / Tone.getTransport().bpm.value / 4;
    const cuando =
      paso % 2 === 1 ? tiempo + (proyecto.swing ?? 0) * segundosPorPaso * 0.5 : tiempo;

    // Lo que mueven las conexiones (lab de IA) y el gesto en vivo (Música Urbana).
    const mod = seccion ? this.modular(seccion, tiempo) : null;
    this.envolventeBombo *= 0.55;

    for (const filaBase of patron.filas) {
      const propios = seccion?.pasosFilas?.[filaBase.id];
      const fila = propios ? { ...filaBase, ...propios } : filaBase;
      const esRedoble = remate && fila.id === idRedoble;
      if (this.soloPista && this.soloPista !== fila.id) continue;
      const golpes = mod?.golpes(fila.id) ?? { factor: 1, extra: 0 };
      // Con el dato (o el gesto) arriba, se agregan golpes en los tiempos vacíos.
      if (!fila.pasos[paso] && !esRedoble && golpes.extra > 0 && paso % 2 === 0) {
        if (this.filaSuena(fila, patron.filas) && (!seccion || this.nivelEn(seccion, fila.id) > 0)) {
          if (debeSonar(semillaActiva + 77, fila.id, paso, this.vuelta, golpes.extra)) {
            this.voces.get(fila.id)?.voz.disparar(cuando, 0.45 * (mod?.velocidad ?? 1), this.espacioDelGolpe(fila.pasos, paso, segundosPorPaso));
            if (fila.tipo === 'bombo') this.envolventeBombo = 1;
          }
        }
        continue;
      }
      if (!fila.pasos[paso] && !esRedoble) continue;
      if (!this.filaSuena(fila, patron.filas)) continue;
      // Sin sección (modo bucle) todo suena a tope; con sección manda su escalón.
      const nivel = seccion ? this.nivelEn(seccion, fila.id) : 3;
      if (nivel === 0) continue;
      // A mano (Música Urbana) suena todo lo dibujado; la fuerza solo cambia el golpe.
      const base = aMano
        ? 1
        : (fila.probabilidad[paso] ?? 1) * factorDensidad * PROBABILIDAD_NIVEL[nivel];
      const probabilidad = esRedoble
        ? 1
        : Math.min(1, base * (ajuste?.probabilidad ?? 1) * golpes.factor);
      if (!debeSonar(semillaActiva, fila.id, paso, this.vuelta, probabilidad)) continue;

      const velocidad =
        VELOCIDAD_NIVEL[nivel] *
        acentoDePaso(paso, patron.cantidadPasos) *
        humanizar(semillaActiva, fila.id, paso, this.vuelta) *
        (ajuste?.velocidad ?? 1);
      this.voces.get(fila.id)?.voz.disparar(
        cuando,
        Math.min(1, velocidad * (mod?.velocidad ?? 1)),
        this.espacioDelGolpe(fila.pasos, paso, segundosPorPaso),
      );
      if (fila.tipo === 'bombo') this.envolventeBombo = 1;
    }

    const melodia = patron.melodia;
    const melodiaSuena =
      !melodia.silenciada &&
      (!seccion || seccion.melodiaActiva || this.soloPista === 'melodia') &&
      (!this.soloPista || this.soloPista === 'melodia');
    if (melodiaSuena) {
      // Se disparan juntas: en la matriz varias notas en la misma columna son un acorde.
      const escala = mod?.escala ?? seccion?.escala ?? melodia.escala;
      const probMelodia = mod?.melodia ?? 1;
      const acorde = (seccion?.notas ?? melodia.notas)
        .filter((n) => n.paso === paso)
        .filter((n) =>
          probMelodia < 1
            ? debeSonar(semillaActiva + 13, 'melodia', n.paso * 31 + n.grado, this.vuelta, probMelodia)
            : true,
        )
        .map((n) => notaTone(semitonoDeGrado(n.grado, escala), melodia.octavaBase));
      if (acorde.length > 0) this.dispararMatriz(acorde, cuando);
    }

    // Tone.Draw sincroniza el dibujo con el audio: la cabeza lectora no se desfasa.
    const pasoDibujado = paso;
    // El aviso va por la cola de dibujo de Tone, que se vacía en el hilo de
    // la pantalla. Si entretanto se paró, ese paso ya no es verdad: por eso
    // se vuelve a mirar al llegar, y no solo al agendar.
    Tone.getDraw().schedule(() => {
      if (this.estaSonando) this.avisarPaso(pasoDibujado);
    }, tiempo);

    this.paso = (this.paso + 1) % patron.cantidadPasos;
    if (this.paso !== 0) return;

    this.vuelta += 1;
    if (this.modo !== 'pieza' || !seccion) return;

    this.vueltaEnSeccion += 1;
    if (this.vueltaEnSeccion >= seccion.compases) this.avanzarSeccion(tiempo);
  }

  /**
   * Cuánto espacio tiene un golpe: desde su casilla hasta el siguiente golpe
   * de la misma capa (dando la vuelta al patrón), y nunca menos de un tiempo
   * para que no suene a clic. Los sonidos largos se recortan a esto; los
   * cortos no lo notan. La voz y las cajitas de la letra no pasan por aquí.
   */
  private espacioDelGolpe(pasos: boolean[], paso: number, segundosPorPaso: number): number {
    const n = pasos.length;
    let hasta = n;
    for (let d = 1; d < n; d++) {
      if (pasos[(paso + d) % n]) {
        hasta = d;
        break;
      }
    }
    return Math.max(4, hasta) * segundosPorPaso;
  }

  /** Pasa a la sección siguiente, o termina la pieza si ya no hay más. */
  private avanzarSeccion(tiempo: number): void {
    const proyecto = this.proyecto;
    if (!proyecto) return;

    this.indiceSeccion += 1;
    this.vueltaEnSeccion = 0;
    if (this.soloUna) {
      this.terminarPieza(tiempo);
      return;
    }

    const siguiente = proyecto.secciones[this.indiceSeccion];
    if (!siguiente) {
      this.terminarPieza(tiempo);
      return;
    }

    // `tiempo` es el último paso de la sección que termina: la siguiente
    // empieza un paso después, con el tempo que traía la anterior.
    const anterior = proyecto.secciones[this.indiceSeccion - 1];
    const inicio = tiempo + 60 / (proyecto.bpm * (anterior?.factorTempo ?? 1)) / 4;
    this.aplicarSeccion(siguiente, inicio);
    const indice = this.indiceSeccion;
    Tone.getDraw().schedule(() => this.avisarSeccion(indice), inicio);
  }

  /** Ajusta volumen, tempo y desvanecido al entrar en una sección. */
  private aplicarSeccion(seccion: Seccion, tiempo: number, corrido = 0): void {
    const ganancia = this.gananciaSeccion?.gain;
    if (!ganancia) return;

    this.inicioSeccionT = tiempo - corrido;
    this.iniciosOidos.push({ indice: this.indiceSeccion, t: tiempo - corrido });
    this.duracionSeccionT = Math.max(0.5, this.duracionSeccion(seccion));
    const objetivo = volumenDeIntensidad(seccion.intensidad);
    ganancia.cancelScheduledValues(tiempo);
    ganancia.rampTo(objetivo, 0.12, tiempo);

    this.moverEcualizador(seccion, tiempo);

    if (seccion.desvanecer) {
      // El cierre se apaga a lo largo de toda la sección.
      const duracion = this.duracionSeccion(seccion) - corrido;
      ganancia.rampTo(0.0015, Math.max(0.5, duracion * 0.92), tiempo + 0.12);
    }

    // El tempo cambia justo en el borde, sin rampa: así la duración de cada
    // escena es exacta y la pantalla no se desfasa.
    if (this.proyecto) Tone.getTransport().bpm.setValueAtTime(this.proyecto.bpm * seccion.factorTempo, tiempo);
    // Con una pista sola no entran la voz ni las cajitas.
    if (this.soloPista) return;
    this.lanzarVozEscena(seccion, tiempo, corrido);
    this.lanzarCajitas(seccion, tiempo, corrido);
  }

  /** El escalón de una capa en la sección; la que suena sola nunca está callada. */
  private nivelEn(seccion: Seccion, id: string): number {
    const nivel = nivelDeCapa(seccion, id);
    return this.soloPista === id ? Math.max(nivel, seccion.fuerza ?? 2) : nivel;
  }

  /** Agenda lo que pasa en cada palabra con cajita: un sonido o un silencio. */
  private lanzarCajitas(seccion: Seccion, tiempo: number, corrido = 0): void {
    for (const c of seccion.cajitas ?? []) {
      const momento = tiempo + 0.15 + c.t - corrido;
      if (momento < tiempo) continue;
      if (c.tipo === 'sonido' && c.url) {
        const r = this.sueltas.get(c.url);
        if (r?.loaded) r.start(momento);
      } else if (c.tipo === 'silencio') {
        const g = this.silenciador?.gain;
        if (!g) continue;
        g.setValueAtTime(1, Math.max(tiempo, momento - 0.05));
        g.linearRampToValueAtTime(0, momento + 0.04);
        g.setValueAtTime(0, momento + 1.4);
        g.linearRampToValueAtTime(1, momento + 1.9);
      }
    }
  }

  /** Prepara los sonidos de las cajitas. */
  private cargarSueltas(secciones: Seccion[]): void {
    const urls = new Set(secciones.flatMap((s) => (s.cajitas ?? []).flatMap((c) => (c.url ? [c.url] : []))));
    for (const [url, r] of this.sueltas) {
      if (!urls.has(url)) {
        r.dispose();
        this.sueltas.delete(url);
      }
    }
    for (const url of urls) {
      if (this.sueltas.has(url)) continue;
      const r = new Tone.Player({ url });
      if (this.gananciaCajitas) r.connect(this.gananciaCajitas);
      this.sueltas.set(url, r);
    }
  }

  /** Por dónde va la sección que se oye, de 0 a 1. Lo usa el gesto en vivo. */
  get fraccionSeccion(): number {
    const pos = this.posicionOida;
    if (!pos) return 0;
    return Math.min(1, pos.segundos / Math.max(0.5, this.duracionDe(pos.indice)));
  }

  /** Segundos que lleva oyéndose la sección actual. */
  get segundosEnSeccion(): number {
    return this.posicionOida?.segundos ?? 0;
  }

  /** El valor de un dato ahora mismo, en la sección que suena (para el visual). */
  datoActual(clave: string): number {
    const seccion = this.proyecto?.secciones[this.indiceSeccion];
    if (!seccion || !this.estaSonando) return 0;
    return this.valorFuente(clave, seccion, Tone.now());
  }

  /** El gesto que se está tocando en vivo (null al soltar). */
  fijarGestoVivo(gesto: { x: number; y: number } | null): void {
    this.gestoVivo = gesto;
  }

  /** El valor de un dato (0..1) en este instante. */
  private valorFuente(clave: string, seccion: Seccion, tiempo: number): number {
    const proyecto = this.proyecto;
    if (!proyecto) return 0;
    if (clave === 'emocion') return seccion.emocion ? VALOR_EMOCION[seccion.emocion] : 0.5;
    if (clave === 'fuerza') return ((seccion.fuerza ?? 2) - 1) / 2;
    if (clave === 'avance') return this.progresoPieza;
    if (clave === 'voz') return Math.min(1, ((this.medidorVoz?.getValue() as number) || 0) * 3);
    if (clave === 'bombo') return this.envolventeBombo;
    if (clave.startsWith('archivo:')) {
      const archivo = proyecto.archivosDatos.find((a) => a.id === clave.slice(8));
      if (!archivo || archivo.valores.length === 0) return 0;
      const n = archivo.valores.length;
      if (archivo.tipo === 'sonido') {
        const i = Math.floor(Math.max(0, tiempo - this.inicioPieza) * 20) % n;
        return archivo.valores[i];
      }
      const t = Math.max(0, Math.min(0.999, (tiempo - this.inicioSeccionT) / this.duracionSeccionT));
      return archivo.valores[Math.floor(t * n)];
    }
    return 0;
  }

  /** El gesto de la escena en este instante: el vivo manda sobre el grabado. */
  private gestoEn(seccion: Seccion, tiempo: number): { x: number; y: number } | null {
    if (this.gestoVivo) return this.gestoVivo;
    const puntos = seccion.gesto;
    if (!puntos || puntos.length === 0) return null;
    const t = (tiempo - this.inicioSeccionT) / this.duracionSeccionT;
    let i = 0;
    while (i < puntos.length - 1 && puntos[i + 1].t <= t) i++;
    const a = puntos[i];
    const b = puntos[i + 1];
    if (!b || b.t === a.t) return { x: a.x, y: a.y };
    const k = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  /**
   * Junta las conexiones y el gesto en lo que el paso necesita: cuánto
   * cambian los golpes de cada pista, la melodía, la escala y la fuerza, y
   * de paso mueve el brillo, el eco y el volumen de la música.
   */
  private modular(seccion: Seccion, tiempo: number) {
    const proyecto = this.proyecto!;
    const porDestino = new Map<string, { v: number; w: number }>();
    const conexiones = proyecto.track === 'ia' ? proyecto.conexiones : [];
    for (const c of conexiones) {
      const v = this.valorFuente(c.fuente, seccion, tiempo);
      const w = c.cantidad / 3;
      const previo = porDestino.get(c.destino);
      if (!previo) porDestino.set(c.destino, { v, w });
      else porDestino.set(c.destino, { v: (previo.v + v) / 2, w: Math.max(previo.w, w) });
    }
    const mezcla = (desde: number, hacia: number, w: number) => desde + (hacia - desde) * w;
    const gesto = this.gestoEn(seccion, tiempo);

    let densidad = 1;
    let extraGesto = 0;
    let velocidad = 1;
    let ganancia = 1;
    if (gesto) {
      densidad = 0.5 + gesto.x;
      extraGesto = gesto.x > 0.6 ? (gesto.x - 0.6) * 1.2 : 0;
      velocidad = 0.7 + 0.5 * gesto.y;
      ganancia = 0.75 + 0.35 * gesto.y;
    }

    const volumen = porDestino.get('volumen');
    if (volumen) ganancia *= mezcla(1, 0.35 + 0.65 * volumen.v, volumen.w);
    const apartar = porDestino.get('apartar');
    if (apartar) ganancia *= mezcla(1, 1 - 0.7 * apartar.v, apartar.w);
    this.modulador?.gain.rampTo(ganancia, 0.06, tiempo);

    const fx = proyecto.efectos;
    const brillo = porDestino.get('brillo');
    if (brillo || gesto) {
      let frecuencia = fx.filtroFrecuencia;
      if (brillo) frecuencia = mezcla(frecuencia, 250 * Math.pow(2, brillo.v * 6.3), brillo.w);
      if (gesto) frecuencia = Math.min(frecuencia, 300 * Math.pow(2, gesto.y * 6));
      this.filtro?.frequency.rampTo(Math.max(80, frecuencia), 0.08, tiempo);
    }
    const eco = porDestino.get('eco');
    if (eco) this.delay?.wet.rampTo(mezcla(fx.delayCantidad, eco.v * 0.55, eco.w), 0.1, tiempo);

    const escala = porDestino.get('escala');
    const melodia = porDestino.get('melodia');
    const luz = ESCALAS_POR_LUZ.length;
    return {
      velocidad,
      escala: escala ? ESCALAS_POR_LUZ[Math.min(luz - 1, Math.floor(escala.v * luz))] : undefined,
      melodia: (melodia ? mezcla(1, 0.2 + 1.2 * melodia.v, melodia.w) : 1) * Math.min(1, densidad),
      golpes: (id: string) => {
        const g = porDestino.get(`golpes:${id}`);
        const factor = (g ? mezcla(1, 0.25 + 1.5 * g.v, g.w) : 1) * densidad;
        const extra = (g && g.v > 0.55 ? (g.v - 0.55) * 2 * g.w * 0.6 : 0) + extraGesto;
        return { factor, extra };
      },
    };
  }

  /**
   * La voz de una escena entra justo al empezar su sección, y mientras
   * habla la música se agacha un poco para dejarla oír.
   */
  private lanzarVozEscena(seccion: Seccion, tiempo: number, corrido = 0): void {
    const original = seccion.voz;
    if (!original) return;
    const reproductor = this.vocesEscena.get(original.url);
    if (!reproductor) return;
    // Arrancando a mitad de escena, la voz se salta lo que ya pasó.
    const salto = Math.max(0, corrido - 0.15);
    if (salto >= original.duracion) return;
    const voz = { ...original, desde: (original.desde ?? 0) + salto, duracion: original.duracion - salto };
    const entra = tiempo + Math.max(0, 0.15 - corrido);
    const generacion = this.generacionPieza;
    const arrancar = () => {
      if (this.generacionPieza !== generacion) return;
      // Un audio que no cargó (borrado, archivo dañado) no frena la pieza.
      if (!reproductor.loaded) return;
      if (reproductor.state === 'started') reproductor.stop();
      const ahora = Tone.now();
      // Si terminó de cargar tarde, entra por donde iba y no desde el principio.
      const desde = voz.desde ?? 0;
      if (entra >= ahora) reproductor.start(entra, desde, voz.duracion);
      else if (ahora - entra < voz.duracion) {
        reproductor.start(ahora, desde + (ahora - entra), voz.duracion - (ahora - entra));
      }
    };
    if (reproductor.loaded) arrancar();
    else void Tone.loaded().then(arrancar);
    const ganancia = this.agacharse?.gain;
    if (!ganancia) return;
    ganancia.cancelScheduledValues(tiempo);
    ganancia.rampTo(MUSICA_BAJO_VOZ, 0.25, tiempo);
    ganancia.rampTo(1, 0.9, entra + voz.duracion);
  }

  /** Prepara un reproductor por cada voz de escena y suelta los que sobran. */
  private cargarVocesEscenas(secciones: Seccion[]): void {
    const urls = new Set(secciones.flatMap((s) => (s.voz ? [s.voz.url] : [])));
    for (const [url, reproductor] of this.vocesEscena) {
      if (!urls.has(url)) {
        reproductor.dispose();
        this.vocesEscena.delete(url);
      }
    }
    for (const url of urls) {
      if (!this.vocesEscena.has(url)) {
        // Se carga ya, aunque el audio no haya arrancado: así al tocar play está lista.
        const reproductor = new Tone.Player({ url });
        if (this.gananciaNarrador) reproductor.connect(this.gananciaNarrador);
        this.vocesEscena.set(url, reproductor);
      }
    }
  }

  /**
   * El ecualizador que se mueve solo.
   *
   * Lo mismo que hacen las reglas con los golpes, pero con el timbre: en las
   * partes de poca energía el filtro se cierra y entra más sala, y en el coro
   * se abre del todo. Con `movimiento` en 0 no pasa nada: manda lo que el
   * estudiante dejó puesto.
   */
  private moverEcualizador(seccion: Seccion, tiempo: number): void {
    const fx = this.proyecto?.efectos;
    const cuanto = fx?.movimiento ?? 0;
    if (!fx || cuanto <= 0) return;

    const base = fx.filtroFrecuencia;
    // «Cerrado» es sonar más lejos: tapando agudos, o quitando cuerpo.
    const cerrado = fx.filtroTipo === 'lowpass' ? base * 0.2 : Math.min(2200, base * 4 + 260);
    const porEnergia = cerrado + (base - cerrado) * seccion.intensidad;
    const destino = base + (porEnergia - base) * cuanto;
    this.filtro?.frequency.rampTo(Math.max(80, destino), 0.25, tiempo);

    // La sala va al revés: donde hay menos música, más aire.
    const aire = fx.reverbCantidad + (0.5 - fx.reverbCantidad) * (1 - seccion.intensidad) * cuanto;
    this.reverb?.wet.rampTo(Math.min(0.8, Math.max(0, aire)), 0.25, tiempo);
  }

  /** Cuánto dura una sección en segundos, con su propio factor de tempo. */
  private duracionSeccion(seccion: Seccion): number {
    const proyecto = this.proyecto;
    if (!proyecto) return 0;
    const bpm = proyecto.bpm * seccion.factorTempo;
    const segundosPorPaso = 60 / bpm / 4;
    return seccion.compases * proyecto.patron.cantidadPasos * segundosPorPaso;
  }

  private aplicarTempo(seccion?: Seccion): void {
    const proyecto = this.proyecto;
    if (!proyecto) return;
    const factor =
      seccion?.factorTempo ??
      (this.modo === 'pieza' ? proyecto.secciones[this.indiceSeccion]?.factorTempo ?? 1 : 1);
    Tone.getTransport().bpm.rampTo(proyecto.bpm * factor, 0.25);
  }

  /**
   * Fin de la pieza: no se corta en seco, se deja que las colas suenen
   * y recién ahí se para el transporte.
   */
  private terminarPieza(tiempo: number): void {
    if (this.terminando) return;
    this.terminando = true;
    // La música se apaga justo donde termina la línea de tiempo (las colas
    // de las muestras largas no siguen sonando después) y ahí se para.
    const gain = this.modulador?.gain;
    if (gain) {
      gain.cancelScheduledValues(tiempo);
      gain.setValueAtTime(gain.value, tiempo);
      gain.linearRampToValueAtTime(0, tiempo + 0.12);
    }
    const espera = Math.max(0, (tiempo - Tone.now()) * 1000) + 250;
    // Solo corta si nadie pidió otra cosa entretanto: si no, un ▶ pulsado
    // justo al terminar la escena se llevaría el stop de la escena anterior.
    const mio = this.pedido;
    window.setTimeout(() => {
      if (this.pedido === mio) this.detener();
    }, espera);
  }

  /** Mute/solo: si alguna fila está en solo, solo suenan las que estén en solo. */
  private filaSuena(fila: Fila, filas: Fila[]): boolean {
    // La app nueva no tiene mute ni solo en el proyecto: qué suena lo dicen las
    // escenas. Si un proyecto viejo los dejó marcados, no pueden callar nada.
    if (this.proyecto?.track) return true;
    if (fila.silenciada) return false;
    const haySolo = filas.some((f) => f.soloActivo);
    return !haySolo || fila.soloActivo;
  }

  // ------------------------------------------------------ sincronización

  /**
   * Refleja el estado de React en el grafo de audio: crea o quita voces,
   * ajusta volúmenes, tempo y efectos. Se llama en cada cambio del proyecto.
   */
  sincronizar(proyecto: Proyecto): void {
    this.proyecto = proyecto;
    this.cargarVocesEscenas(proyecto.secciones);
    this.cargarSueltas(proyecto.secciones);
    if (!this.iniciado || !this.bus) return;

    this.aplicarTempo();

    const vivos = new Set<string>();
    for (const fila of proyecto.patron.filas) {
      vivos.add(fila.id);
      this.registrarFila(fila.id, fila.tipo, fila.sampleUrl);
      const audible = this.filaSuena(fila, proyecto.patron.filas);
      this.ajustarVolumenFila(fila.id, audible ? fila.volumen : 0);
    }
    for (const id of [...this.voces.keys()]) {
      if (!vivos.has(id)) this.quitarFila(id);
    }

    const melodia = proyecto.patron.melodia;
    this.cargarMuestreadorMatriz(melodia);
    const haySolo = proyecto.patron.filas.some((f) => f.soloActivo) || melodia.soloActivo;
    const melodiaAudible = !melodia.silenciada && (!haySolo || melodia.soloActivo);
    this.gananciaMatriz?.gain.rampTo(melodiaAudible ? melodia.volumen : 0, 0.03);

    this.cargarNarracion(proyecto.narracion.audioUrl);
    this.gananciaNarrador?.gain.rampTo(proyecto.narracion.volumen, 0.05);

    this.ajustarVolumenMaestro(proyecto.volumenMaestro);
    this.aplicarEfectos(proyecto.efectos);
  }

  /** Carga la grabación del monólogo. Solo rehace el reproductor si cambió. */
  private cargarNarracion(url: string | undefined): void {
    if (this.urlNarracion === url) return;
    this.urlNarracion = url;
    this.narrador?.dispose();
    this.narrador = null;
    if (!url || !this.gananciaNarrador) return;
    this.narrador = new Tone.Player({ url }).connect(this.gananciaNarrador);
  }

  get narracionLista(): boolean {
    return Boolean(this.narrador?.loaded);
  }

  /**
   * El sonido que el estudiante sube para la matriz.
   *
   * Tone.Sampler lo reproduce más rápido o más lento según la nota que se
   * le pida, así que una sola grabación cubre toda la matriz afinada: la
   * casilla de la nota base suena tal cual, las de arriba más agudas y las
   * de abajo más graves. Solo se rehace si cambió el archivo o su afinación.
   */
  private cargarMuestreadorMatriz(melodia: Melodia): void {
    const url = melodia.instrumento === 'sample' ? melodia.sampleUrl : undefined;
    const nota = melodia.notaSample || 'C3';
    if (this.urlMuestreador === url && this.notaMuestreador === nota) return;
    this.urlMuestreador = url;
    this.notaMuestreador = nota;
    this.bufferMuestreador = null;
    this.armarMuestreador();
    if (!url) return;
    const buffer = new Tone.ToneAudioBuffer(url, () => {
      // Si mientras cargaba cambió el sonido, este ya no vale.
      if (this.urlMuestreador !== url || this.notaMuestreador !== nota) return;
      this.bufferMuestreador = buffer.get() as AudioBuffer;
      this.armarMuestreador();
    });
  }

  /** (Re)arma el sampler con el audio ya cargado; sin audio, no hay sampler. */
  private armarMuestreador(): void {
    this.muestreadorMatriz?.dispose();
    this.muestreadorMatriz = null;
    const nota = this.notaMuestreador;
    if (!this.bufferMuestreador || !this.ecoMatriz || !nota) return;
    this.muestreadorMatriz = new Tone.Sampler({
      urls: { [nota]: this.bufferMuestreador },
      attack: 0.002,
      // Corto: la cola la pone el eco de la matriz, no el sample.
      release: 0.35,
      volume: -3,
    }).connect(this.ecoMatriz);
  }

  /** ¿Ya se puede tocar el sonido propio de la matriz? */
  get sonidoMelodiaListo(): boolean {
    return Boolean(this.muestreadorMatriz?.loaded);
  }

  /**
   * Toca la matriz con el instrumento que corresponda. Mientras el sonido
   * propio termina de cargar sigue respondiendo el sintetizador, para que
   * la grilla nunca quede muda.
   */
  private dispararMatriz(notas: string[], tiempo: number): void {
    const melodia = this.proyecto?.patron.melodia;
    const muestreador = melodia?.instrumento === 'sample' ? this.muestreadorMatriz : null;
    if (muestreador?.loaded) muestreador.triggerAttackRelease(notas, '8n', tiempo);
    else this.matriz?.triggerAttackRelease(notas, '8n', tiempo);
  }

  /** Crea o reemplaza la voz de una fila. */
  registrarFila(id: string, tipo: TipoSonido, sampleUrl?: string): void {
    if (!this.iniciado || !this.bus) return;
    const previa = this.voces.get(id);
    if (previa && previa.tipo === tipo && previa.sampleUrl === sampleUrl) return;
    if (previa) {
      previa.voz.liberar();
      previa.ganancia.dispose();
    }
    const ganancia = new Tone.Gain(1).connect(this.bus);
    const voz = crearVoz(tipo, sampleUrl);
    voz.salida.connect(ganancia);
    this.voces.set(id, { voz, ganancia, tipo, sampleUrl });
  }

  quitarFila(id: string): void {
    const entrada = this.voces.get(id);
    if (!entrada) return;
    entrada.voz.liberar();
    entrada.ganancia.dispose();
    this.voces.delete(id);
  }

  /**
   * Dispara una fila ya mismo: sirve para la escucha previa al hacer clic.
   * Usa la ganancia que ya tiene la fila, así lo que se oye al editar
   * es exactamente lo que se oirá al reproducir.
   */
  /** Voces sueltas para oír un sonido de la batería antes de elegirlo. */
  private muestrario = new Map<TipoSonido, VozPercusion>();

  /** Hace sonar un sonido de la batería sin ponerlo en ninguna pista. */
  async probarTipo(tipo: TipoSonido): Promise<void> {
    await this.iniciar();
    let voz = this.muestrario.get(tipo);
    if (!voz) {
      voz = crearVoz(tipo);
      if (this.maestro) voz.salida.connect(this.maestro);
      this.muestrario.set(tipo, voz);
    }
    voz.disparar(Tone.now() + 0.01, 1);
  }

  async escucharFila(id: string): Promise<void> {
    await this.iniciar();
    this.voces.get(id)?.voz.disparar(Tone.now(), 1);
  }

  /** Escucha previa de una nota de la matriz. */
  async escucharNota(grado: number, escala: NombreEscala, octavaBase: number): Promise<void> {
    await this.iniciar();
    this.dispararMatriz([notaTone(semitonoDeGrado(grado, escala), octavaBase)], Tone.now());
  }

  ajustarVolumenFila(id: string, volumen: number): void {
    const entrada = this.voces.get(id);
    if (!entrada) return;
    entrada.ganancia.gain.rampTo(volumen, 0.02);
  }

  /** Apaga solo la música y deja la voz: para oír qué le aporta el sonido al relato. */
  silenciarMusica(silencio: boolean): void {
    this.musicaApagada = silencio;
    this.bus?.gain.rampTo(silencio ? 0 : 1, 0.15);
  }

  ajustarVolumenMaestro(volumen: number): void {
    this.maestro?.gain.rampTo(volumen, 0.05);
  }

  aplicarEfectos(fx: Efectos): void {
    if (!this.iniciado) return;
    this.reverb?.wet.rampTo(fx.reverbCantidad, 0.1);
    this.delay?.wet.rampTo(fx.delayCantidad, 0.1);
    if (this.filtro) {
      this.filtro.type = fx.filtroTipo;
      this.filtro.frequency.rampTo(fx.filtroFrecuencia, 0.08);
    }
  }

  ajustarBpm(bpm: number): void {
    if (!this.iniciado) return;
    Tone.getTransport().bpm.value = bpm;
  }
}

export const motorAudio = new MotorAudio();

// Solo en desarrollo: acceso desde la consola para diagnosticar el audio.
// Va también renderizarPieza porque la promesa de la pantalla de La canción
// es que lo dibujado sea lo que suena, y eso hay que poder comprobarlo.
if (import.meta.env.DEV) {
  (globalThis as Record<string, unknown>).__sonora = { motorAudio, Tone, renderizarPieza };
}
