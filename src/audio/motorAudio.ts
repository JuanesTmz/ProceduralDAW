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
export type OyentePaso = (paso: number) => void;

/** Aviso al entrar en una sección nueva. -1 cuando la pieza termina. */
export type OyenteSeccion = (indice: number) => void;

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
  /** Baja la música mientras habla la voz de una escena, y la sube al terminar. */
  private agacharse: Tone.Gain | null = null;
  /** Una grabación por escena, guardada por su url. */
  private vocesEscena = new Map<string, Tone.Player>();
  /** Desde qué sección arranca la pieza, y si para al terminarla. */
  private desde = 0;
  private soloUna = false;
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
  /** El gesto que se está tocando en vivo ahora mismo, si hay. */
  private gestoVivo: { x: number; y: number } | null = null;
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
    this.agacharse = new Tone.Gain(1).connect(this.gananciaSeccion);
    this.modulador = new Tone.Gain(1).connect(this.agacharse);
    this.bus = new Tone.Gain(1).connect(this.modulador);

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

  /** Empieza a reproducir el patrón en bucle. */
  async reproducir(): Promise<void> {
    await this.iniciar();
    if (this.estaSonando) return;

    const transporte = Tone.getTransport();
    this.paso = 0;
    this.vuelta = 0;
    this.indiceSeccion = this.modo === 'pieza' ? this.desde : 0;
    this.vueltaEnSeccion = 0;
    this.terminando = false;

    // Un solo origen de tiempo para la música y para la voz: así la
    // narración cae siempre en el mismo punto, sin importar cuándo se cargó.
    const inicio = Tone.now() + 0.1;
    this.inicioPieza = inicio;
    this.generacionPieza += 1;

    if (this.modo === 'pieza') {
      const primera = this.proyecto?.secciones[this.desde];
      if (primera) this.aplicarSeccion(primera, inicio);
      this.avisarSeccion(this.desde);
      if (this.desde === 0) this.lanzarNarracion();
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

  /** Toca la pieza entera, de la primera escena a la última. */
  async reproducirPieza(): Promise<void> {
    if (this.estaSonando) this.detener();
    this.modo = 'pieza';
    this.desde = 0;
    this.soloUna = false;
    await this.reproducir();
  }

  /** Toca una sola escena de la pieza, y para al terminarla. */
  async reproducirEscena(indice: number): Promise<void> {
    if (this.estaSonando) this.detener();
    this.modo = 'pieza';
    this.desde = Math.max(0, indice);
    this.soloUna = true;
    await this.reproducir();
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
    for (const voz of this.vocesEscena.values()) if (voz.state === 'started') voz.stop();
    if (this.agacharse) {
      this.agacharse.gain.cancelScheduledValues(Tone.now());
      this.agacharse.gain.value = 1;
    }
    this.desde = 0;
    this.soloUna = false;
    this.modulador?.gain.cancelScheduledValues(Tone.now());
    if (this.modulador) this.modulador.gain.value = 1;
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
    const aMano = seccion?.modo === 'manual';
    const factorDensidad = seccion && !aMano ? densidadDeIntensidad(seccion.intensidad) : 1;

    // El remate: los últimos pasos antes de cambiar de parte suenan seguros
    // y más fuerte, y la pista del redoble rellena lo que tenía vacío.
    const ultimaVuelta = Boolean(
      seccion &&
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

    for (const fila of patron.filas) {
      const esRedoble = remate && fila.id === idRedoble;
      // «Máquina» encendida en la capa: improvisa sobre lo dibujado, quita y agrega golpes.
      const sinMaquina = mod?.golpes(fila.id) ?? { factor: 1, extra: 0 };
      const golpes = fila.regla.activa
        ? { factor: sinMaquina.factor * 0.82, extra: sinMaquina.extra + 0.22 }
        : sinMaquina;
      // Con el dato arriba, la máquina agrega golpes en los tiempos vacíos.
      if (!fila.pasos[paso] && !esRedoble && golpes.extra > 0 && paso % 2 === 0) {
        if (this.filaSuena(fila, patron.filas) && (!seccion || nivelDeCapa(seccion, fila.id) > 0)) {
          if (debeSonar(semillaActiva + 77, fila.id, paso, this.vuelta, golpes.extra)) {
            this.voces.get(fila.id)?.voz.disparar(cuando, 0.45 * (mod?.velocidad ?? 1));
            if (fila.tipo === 'bombo') this.envolventeBombo = 1;
          }
        }
        continue;
      }
      if (!fila.pasos[paso] && !esRedoble) continue;
      if (!this.filaSuena(fila, patron.filas)) continue;
      // Sin sección (modo bucle) todo suena a tope; con sección manda su escalón.
      const nivel = seccion ? nivelDeCapa(seccion, fila.id) : 3;
      if (nivel === 0) continue;
      const base = aMano
        ? PROBABILIDAD_NIVEL[nivel]
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
      this.voces.get(fila.id)?.voz.disparar(cuando, Math.min(1, velocidad * (mod?.velocidad ?? 1)));
      if (fila.tipo === 'bombo') this.envolventeBombo = 1;
    }

    const melodia = patron.melodia;
    const melodiaSuena = !melodia.silenciada && (!seccion || seccion.melodiaActiva);
    if (melodiaSuena) {
      // Se disparan juntas: en la matriz varias notas en la misma columna son un acorde.
      const escala = mod?.escala ?? seccion?.escala ?? melodia.escala;
      const probMelodia = (mod?.melodia ?? 1) * (melodia.regla.activa ? 0.78 : 1);
      const acorde = melodia.notas
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

    this.aplicarSeccion(siguiente, tiempo);
    const indice = this.indiceSeccion;
    Tone.getDraw().schedule(() => this.avisarSeccion(indice), tiempo);
  }

  /** Ajusta volumen, tempo y desvanecido al entrar en una sección. */
  private aplicarSeccion(seccion: Seccion, tiempo: number): void {
    const ganancia = this.gananciaSeccion?.gain;
    if (!ganancia) return;

    this.inicioSeccionT = tiempo;
    this.duracionSeccionT = Math.max(0.5, this.duracionSeccion(seccion));
    const objetivo = volumenDeIntensidad(seccion.intensidad);
    ganancia.cancelScheduledValues(tiempo);
    ganancia.rampTo(objetivo, 0.12, tiempo);

    this.moverEcualizador(seccion, tiempo);

    if (seccion.desvanecer) {
      // El cierre se apaga a lo largo de toda la sección.
      const duracion = this.duracionSeccion(seccion);
      ganancia.rampTo(0.0015, Math.max(0.5, duracion * 0.92), tiempo + 0.12);
    }

    this.aplicarTempo(seccion);
    this.lanzarVozEscena(seccion, tiempo);
  }

  /** Por dónde va la sección que suena, de 0 a 1. Lo usa el gesto en vivo. */
  get fraccionSeccion(): number {
    if (!this.estaSonando) return 0;
    return Math.max(0, Math.min(1, (Tone.now() - this.inicioSeccionT) / this.duracionSeccionT));
  }

  /** Segundos desde que empezó la sección que suena. */
  get segundosEnSeccion(): number {
    if (!this.estaSonando) return 0;
    return Math.max(0, Tone.now() - this.inicioSeccionT);
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
    for (const c of proyecto.conexiones) {
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
  private lanzarVozEscena(seccion: Seccion, tiempo: number): void {
    const voz = seccion.voz;
    if (!voz) return;
    const reproductor = this.vocesEscena.get(voz.url);
    if (!reproductor) return;
    const entra = tiempo + 0.15;
    const generacion = this.generacionPieza;
    const arrancar = () => {
      if (this.generacionPieza !== generacion) return;
      if (reproductor.state === 'started') reproductor.stop();
      const ahora = Tone.now();
      // Si terminó de cargar tarde, entra por donde iba y no desde el principio.
      if (entra >= ahora) reproductor.start(entra);
      else if (ahora - entra < voz.duracion) reproductor.start(ahora, ahora - entra);
    };
    if (reproductor.loaded) arrancar();
    else void Tone.loaded().then(arrancar);
    const ganancia = this.agacharse?.gain;
    if (!ganancia) return;
    ganancia.cancelScheduledValues(tiempo);
    ganancia.rampTo(0.55, 0.25, tiempo);
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
    this.cargarVocesEscenas(proyecto.secciones);
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
    this.muestreadorMatriz?.dispose();
    this.muestreadorMatriz = null;
    if (!url || !this.ecoMatriz) return;
    this.muestreadorMatriz = new Tone.Sampler({
      urls: { [nota]: url },
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
