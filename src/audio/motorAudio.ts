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
import { notaTone, semitonoDeGrado } from '../generativo/escalas';
import { debeSonar } from '../generativo/motorGenerativo';
import type { NombreEscala } from '../generativo/escalas';
import type {
  Efectos,
  Fila,
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
export type OyentePaso = (paso: number) => void;

/** Aviso al entrar en una sección nueva. -1 cuando la pieza termina. */
export type OyenteSeccion = (indice: number) => void;

/**
 * Cuánto pesa la intensidad de la sección sobre la probabilidad de cada golpe.
 * En 1 suena todo; en 0 queda el 40%, que adelgaza la textura sin vaciarla.
 */
function densidadDeIntensidad(intensidad: number): number {
  return 0.4 + 0.6 * intensidad;
}

/** La intensidad también mueve el volumen, pero menos: la mezcla no se hunde. */
function volumenDeIntensidad(intensidad: number): number {
  return 0.45 + 0.55 * intensidad;
}

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
  private gananciaSeccion: Tone.Gain | null = null;
  private oyentesSeccion = new Set<OyenteSeccion>();

  /** La narración: va aparte de la música, sin efectos y sin el fade del cierre. */
  private narrador: Tone.Player | null = null;
  private gananciaNarrador: Tone.Gain | null = null;
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

  get estaIniciado() {
    return this.iniciado;
  }

  get pasoActual() {
    return this.paso;
  }

  get estaSonando() {
    return this.iniciado && Tone.getTransport().state === 'started';
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

  /** Avance de la pieza completa, de 0 a 1. Lo lee la barra de progreso. */
  get progresoPieza(): number {
    const proyecto = this.proyecto;
    if (!proyecto || this.modo !== 'pieza') return 0;
    const total = proyecto.secciones.reduce((suma, s) => suma + s.compases, 0);
    if (total === 0) return 0;
    const previas = proyecto.secciones
      .slice(0, this.indiceSeccion)
      .reduce((suma, s) => suma + s.compases, 0);
    const dentro = this.vueltaEnSeccion + this.paso / proyecto.patron.cantidadPasos;
    return Math.min(1, (previas + dentro) / total);
  }

  /** Arranca el contexto de audio y arma el grafo. Idempotente. */
  async iniciar(): Promise<void> {
    if (this.iniciado) return;
    await Tone.start();

    this.maestro = new Tone.Gain(0.85).toDestination();
    this.reverb = new Tone.Reverb({ decay: 2.4, wet: 0.16 }).connect(this.maestro);
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0 }).connect(
      this.reverb,
    );
    this.filtro = new Tone.Filter({ type: 'lowpass', frequency: 18000, Q: 0.6 }).connect(this.delay);
    // La intensidad de cada sección se aplica aquí, antes de los efectos.
    this.gananciaSeccion = new Tone.Gain(1).connect(this.filtro);
    this.bus = new Tone.Gain(1).connect(this.gananciaSeccion);

    this.clic = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
    }).connect(this.bus);

    // Voz de la matriz: campana suave con cola, para que los acordes se
    // superpongan y la grilla suene envolvente aunque se toquen notas sueltas.
    this.gananciaMatriz = new Tone.Gain(0.7).connect(this.bus);
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

    // La voz cuelga del maestro, no del bus: el filtro, el eco y el
    // desvanecido del cierre son de la música, no del relato.
    this.gananciaNarrador = new Tone.Gain(1).connect(this.maestro);

    const transporte = Tone.getTransport();
    transporte.bpm.value = this.proyecto?.bpm ?? 100;
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

  /** Empieza a reproducir el patrón en bucle. */
  async reproducir(): Promise<void> {
    await this.iniciar();
    if (this.estaSonando) return;

    const transporte = Tone.getTransport();
    this.paso = 0;
    this.vuelta = 0;
    this.indiceSeccion = 0;
    this.vueltaEnSeccion = 0;
    this.terminando = false;

    // Un solo origen de tiempo para la música y para la voz: así la
    // narración cae siempre en el mismo punto, sin importar cuándo se cargó.
    const inicio = Tone.now() + 0.1;
    this.inicioPieza = inicio;
    this.generacionPieza += 1;

    if (this.modo === 'pieza') {
      const primera = this.proyecto?.secciones[0];
      if (primera) this.aplicarSeccion(primera, inicio);
      this.avisarSeccion(0);
      this.lanzarNarracion();
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

  /** Bucle del patrón, o recorrido completo por el arco. */
  cambiarModo(modo: ModoReproduccion): void {
    if (this.modo === modo) return;
    const sonaba = this.estaSonando;
    if (sonaba) this.detener();
    this.modo = modo;
    if (sonaba) void this.reproducir();
  }

  detener(): void {
    if (!this.iniciado) return;
    const transporte = Tone.getTransport();
    transporte.stop();
    transporte.position = 0;
    this.matriz?.releaseAll();
    this.generacionPieza += 1;
    this.inicioNarracion = 0;
    if (this.narrador?.state === 'started') this.narrador.stop();
    this.paso = 0;
    this.vueltaEnSeccion = 0;
    this.indiceSeccion = 0;
    this.terminando = false;
    if (this.gananciaSeccion) {
      this.gananciaSeccion.gain.cancelScheduledValues(Tone.now());
      this.gananciaSeccion.gain.value = 1;
    }
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

    const { patron } = proyecto;
    const paso = this.paso % patron.cantidadPasos;

    // En modo pieza manda la sección: sus capas, su intensidad y su semilla.
    const seccion = this.modo === 'pieza' ? proyecto.secciones[this.indiceSeccion] : undefined;
    if (this.modo === 'pieza' && !seccion) {
      this.terminarPieza(tiempo);
      return;
    }
    const semillaActiva = seccion ? seccion.semilla : proyecto.semilla;
    const factorDensidad = seccion ? densidadDeIntensidad(seccion.intensidad) : 1;

    for (const fila of patron.filas) {
      if (!fila.pasos[paso]) continue;
      if (!this.filaSuena(fila, patron.filas)) continue;
      if (seccion && !seccion.capasActivas.includes(fila.id)) continue;
      const probabilidad = (fila.probabilidad[paso] ?? 1) * factorDensidad;
      if (!debeSonar(semillaActiva, fila.id, paso, this.vuelta, probabilidad)) continue;
      this.voces.get(fila.id)?.voz.disparar(tiempo, 1);
    }

    const melodia = patron.melodia;
    const melodiaSuena = !melodia.silenciada && (!seccion || seccion.melodiaActiva);
    if (melodiaSuena && this.matriz) {
      // Se disparan juntas: en la matriz varias notas en la misma columna son un acorde.
      const acorde = melodia.notas
        .filter((n) => n.paso === paso)
        .map((n) => notaTone(semitonoDeGrado(n.grado, melodia.escala), melodia.octavaBase));
      if (acorde.length > 0) {
        this.matriz.triggerAttackRelease(acorde, '8n', tiempo);
      }
    }

    // Tone.Draw sincroniza el dibujo con el audio: la cabeza lectora no se desfasa.
    const pasoDibujado = paso;
    Tone.getDraw().schedule(() => this.avisarPaso(pasoDibujado), tiempo);

    this.paso = (this.paso + 1) % patron.cantidadPasos;
    if (this.paso !== 0) return;

    this.vuelta += 1;
    if (this.modo !== 'pieza' || !seccion) return;

    this.vueltaEnSeccion += 1;
    if (this.vueltaEnSeccion >= seccion.compases) this.avanzarSeccion(tiempo);
  }

  /** Pasa a la sección siguiente, o termina la pieza si ya no hay más. */
  private avanzarSeccion(tiempo: number): void {
    const proyecto = this.proyecto;
    if (!proyecto) return;

    this.indiceSeccion += 1;
    this.vueltaEnSeccion = 0;

    const siguiente = proyecto.secciones[this.indiceSeccion];
    if (!siguiente) {
      this.terminarPieza(tiempo);
      return;
    }

    this.aplicarSeccion(siguiente, tiempo);
    const indice = this.indiceSeccion;
    Tone.getDraw().schedule(() => this.avisarSeccion(indice), tiempo);
  }

  /** Ajusta volumen, tempo y desvanecido al entrar en una sección. */
  private aplicarSeccion(seccion: Seccion, tiempo: number): void {
    const ganancia = this.gananciaSeccion?.gain;
    if (!ganancia) return;

    const objetivo = volumenDeIntensidad(seccion.intensidad);
    ganancia.cancelScheduledValues(tiempo);
    ganancia.rampTo(objetivo, 0.12, tiempo);

    if (seccion.desvanecer) {
      // El cierre se apaga a lo largo de toda la sección.
      const duracion = this.duracionSeccion(seccion);
      ganancia.rampTo(0.0015, Math.max(0.5, duracion * 0.92), tiempo + 0.12);
    }

    this.aplicarTempo(seccion);
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
    const espera = Math.max(0, (tiempo - Tone.now()) * 1000) + 1800;
    window.setTimeout(() => this.detener(), espera);
  }

  /** Mute/solo: si alguna fila está en solo, solo suenan las que estén en solo. */
  private filaSuena(fila: Fila, filas: Fila[]): boolean {
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
  async escucharFila(id: string): Promise<void> {
    await this.iniciar();
    this.voces.get(id)?.voz.disparar(Tone.now(), 1);
  }

  /** Escucha previa de una nota de la matriz. */
  async escucharNota(grado: number, escala: NombreEscala, octavaBase: number): Promise<void> {
    await this.iniciar();
    this.matriz?.triggerAttackRelease(
      notaTone(semitonoDeGrado(grado, escala), octavaBase),
      '8n',
      Tone.now(),
    );
  }

  ajustarVolumenFila(id: string, volumen: number): void {
    const entrada = this.voces.get(id);
    if (!entrada) return;
    entrada.ganancia.gain.rampTo(volumen, 0.02);
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
if (import.meta.env.DEV) {
  (globalThis as Record<string, unknown>).__sonora = { motorAudio, Tone };
}
