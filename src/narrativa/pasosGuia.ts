// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El recorrido guiado escrito: lo que dice la guía en cada pantalla y en cada
 * ventana. Se pide desde el «?»; lo que se ve solo, la primera vez, son las
 * pistas animadas de la mano.
 *
 * Rehecho el 23 nov 2026 a la medida de cada parte: el recorrido de Historia
 * en el Recorrido no es el mismo que en el Monólogo, y el de Visuales cambia
 * según el paso (Estilo, Colores, Movimiento, Golpes) o si hay una escena
 * abierta. Un paso señala un elemento con `objetivo` (un selector CSS) y se
 * salta solo si ese elemento no está a la vista; `si` lo limita a cuando
 * cierta parte está en pantalla, sin señalarla. Así la bienvenida sale solo
 * al empezar (en el Recorrido) y cada parte explica lo suyo.
 *
 * El texto va de tú a tú y muy masticado: qué es, para qué sirve y cómo se
 * usa. Lo largo va en `detalle` («Explícame más»). Los textos empujan hacia
 * lo que pide el reto: la historia primero, la música y la imagen que la
 * acompañan, y el material propio.
 */

export interface PasoTour {
  id: string;
  /** Selector del elemento a iluminar. Sin él, la burbuja va al centro. */
  objetivo?: string;
  /** El paso solo sale si esto está en pantalla (sin iluminarlo). */
  si?: string;
  /** Etiqueta pequeña sobre el título. */
  seccion?: string;
  titulo: string;
  texto: string;
  detalle?: string;
  /** Texto del botón en el último paso. */
  final?: string;
}

export type Pantalla =
  | 'historia'
  | 'voz'
  | 'escenas'
  | 'escena-musica'
  | 'escena-visual'
  | 'funcion'
  | 'ventana-golpes'
  | 'ventana-matriz'
  | 'ventana-pad'
  | 'ventana-sonidos'
  | 'ventana-grabar'
  | 'ventana-datos'
  | 'ventana-mezcla';

// Las partes de cada pantalla (lo que decide qué pasos salen).
const MAPA = '.nv-his-mapa';
const ESTACION = '.nv-his-est';
const PERSONAS = '.nv-his-personas';
const MONOLOGO = '.nv-his-mono';
const RECORTE = '.nv-his-recorte';
const EMOCIONES = '.nv-his-emo__rejilla';
const BASE = '.nv-plantillas';
const ESCENA_MUSICA = '.nv-mesa__lista';
const ESTILO = '[data-bloqueo="visual:estilo"]';
const PALETA = '[data-bloqueo="visual:paleta"]';
const MOVIMIENTO = '.nv-estante';
const GOLPES_IMAGEN = '.nv-golpes-imagen';
const ESCENA_VISUAL = '.nv-barra-escena';

export function pasosDe(pantalla: Pantalla): PasoTour[] {
  switch (pantalla) {
    // ============================================================ 1 · HISTORIA
    case 'historia':
      return [
        // ---------- Bienvenida: solo al empezar, en el Recorrido
        {
          id: 'h.bienvenida',
          si: MAPA,
          seccion: 'BIENVENIDA',
          titulo: 'Van a contar Medellín',
          texto:
            'En SONORA arman una pieza de <b>narrativa sonora</b>: un monólogo corto, dicho con su voz, con <b>música</b> e <b>imagen</b> que lo acompañan. No es hacer una canción: es <b>contar una historia</b> y que el sonido y la imagen la ayuden a contarse.',
        },
        {
          id: 'h.camino',
          si: MAPA,
          objetivo: '.nv-camino__pasos',
          seccion: 'EL CAMINO',
          titulo: 'Cinco pasos',
          texto:
            '<b>Historia</b>, <b>Voz</b>, <b>Música</b>, <b>Visuales</b> y <b>Función</b>. Ninguno se bloquea: pueden repartirse el trabajo y volver a cualquier paso cuando quieran. Todo <b>se guarda solo</b>.',
        },
        {
          id: 'h.medidor',
          si: MAPA,
          objetivo: '.nv-medidor',
          seccion: 'EL CAMINO',
          titulo: 'Máximo 2 minutos y medio',
          texto: 'Esto dice cuánto dura la pieza. <b>La voz pone el tiempo</b>: si se pasa, recorten el texto.',
        },
        {
          id: 'h.escuchar',
          si: MAPA,
          objetivo: '.nv-camino__escuchar',
          seccion: 'EL CAMINO',
          titulo: 'Escuchar en cualquier momento',
          texto: 'Este botón (o la <b>barra espaciadora</b>) hace sonar la pieza. Úsenlo seguido: escuchar es la mejor forma de saber qué falta.',
        },
        {
          id: 'h.tramos',
          si: MAPA,
          objetivo: '.nv-lec__tramos',
          seccion: 'PASO 1 · HISTORIA',
          titulo: 'La historia, en cuatro partes',
          texto:
            '<b>Recorrido</b> (lo que vivieron), <b>Monólogo</b> (lo escriben), <b>Recorte</b> (lo parten en escenas) y <b>Emociones</b> (qué siente cada escena). La barra de cada parte se llena a medida que avanzan.',
        },

        // ---------- Recorrido: el mapa de estaciones
        {
          id: 'h.mapa',
          // Una estación, no el mapa entero: en un celular el mapa ocupa toda la pantalla.
          objetivo: '.nv-his-nodo',
          seccion: 'RECORRIDO',
          titulo: 'Las estaciones del SmartFest',
          texto:
            'Cada punto es una estación del recorrido. <b>Toquen una para entrar</b> y anotar lo que vieron, oyeron o sintieron allá: una frase, una foto o un audio. Es la materia prima de su historia.',
          detalle: 'No tienen que llenarlo todo. Busquen lo que se repite o lo que más los sorprendió: ahí suele estar la historia que solo se entiende en Medellín.',
        },
        {
          id: 'h.cuenta',
          objetivo: '.nv-his-mapa__cuenta',
          seccion: 'RECORRIDO',
          titulo: '¿Cuántas llevan?',
          texto: 'Cuenta las estaciones donde ya anotaron algo. Pueden ir en el orden que quieran y repartirse las estaciones entre el equipo.',
        },
        {
          id: 'h.mapa-seguir',
          si: MAPA,
          objetivo: '.nv-lec__seguir',
          seccion: 'RECORRIDO',
          titulo: 'Después, a escribir',
          texto: 'Cuando tengan material, sigan al <b>monólogo</b>: ahí juntan lo que recogieron en una sola historia.',
          final: 'A recorrer',
        },

        // ---------- Dentro de una estación
        {
          id: 'h.est',
          objetivo: '.nv-his-est__cabeza',
          seccion: 'ESTACIÓN',
          titulo: 'Están dentro de una estación',
          texto: 'Arriba dice qué se hace en esta estación. «Recorrido», a la izquierda, los devuelve al mapa.',
        },
        {
          id: 'h.est-tablero',
          objetivo: '.nv-his-tablero',
          seccion: 'ESTACIÓN',
          titulo: 'Una columna por pregunta',
          texto:
            'Cada columna es una pregunta. Respondan con lo que <b>de verdad</b> pasó: con una o dos frases basta. En «Lo que vivimos aquí» va lo que sintieron ustedes.',
        },
        {
          id: 'h.est-agregar',
          si: ESTACION,
          objetivo: '.nv-his-agregar',
          seccion: 'ESTACIÓN',
          titulo: 'Escribir, grabar o subir fotos',
          texto:
            'El <b>lápiz</b> escribe una respuesta, el botón <b>rojo</b> graba un audio y el <b>azul</b> sube fotos. Los audios quedan también como sonidos para la música.',
          final: 'A anotar',
        },
        {
          id: 'h.personas',
          objetivo: PERSONAS,
          seccion: 'ESTACIÓN',
          titulo: 'Las personas que conocieron',
          texto: 'Cada tarjeta es alguien con quien hablaron. Tóquenla para anotar qué les contó: muchas veces la mejor historia es la de otra persona.',
          final: 'A anotar',
        },

        // ---------- Monólogo
        {
          id: 'h.mono',
          objetivo: '.nv-his-mono__campo',
          seccion: 'MONÓLOGO',
          titulo: 'Una sola historia, para decirla',
          texto:
            'Escriban aquí la historia que van a contar en voz alta. No es para cantarla: es para <b>decirla</b>, como si se la contaran a alguien.',
          detalle: 'Funciona mejor una historia con un cambio adentro (algo pasa, algo se rompe, alguien llega) que una descripción quieta: ese cambio es lo que la música y la imagen van a seguir.',
        },
        {
          id: 'h.mono-regla',
          objetivo: '.nv-his-mono__escala',
          seccion: 'MONÓLOGO',
          titulo: 'Unas 100 palabras',
          texto: 'La regla dice si va bien de largo: entre <b>70 y 130 palabras</b>. Arriba está la cuenta y cuánto tardarían en decirla.',
        },
        {
          id: 'h.mono-botones',
          si: MONOLOGO,
          objetivo: '.nv-his-mono .nv-his-cabeza .nv-his-boton:last-of-type',
          seccion: 'MONÓLOGO',
          titulo: '¿En blanco?',
          texto: '«Usar un ejemplo» muestra cómo se ve un monólogo terminado. «Empezar de cero» borra el texto (pide confirmar).',
        },
        {
          id: 'h.mono-seguir',
          si: MONOLOGO,
          objetivo: '.nv-lec__seguir',
          seccion: 'MONÓLOGO',
          titulo: 'Luego, a cortarlo',
          texto: 'Cuando el largo esté bien, sigan al <b>recorte</b> para partirlo en escenas.',
          final: 'A escribir',
        },

        // ---------- Recorte
        {
          id: 'h.partir',
          objetivo: '.nv-partir__texto',
          seccion: 'RECORTE',
          titulo: 'Cada color es una escena',
          texto:
            'El monólogo ya está partido en <b>escenas</b>. Cada una va a tener su propia emoción, música e imagen.',
          detalle: 'Partan donde la historia <b>cambia</b>: un giro, una sorpresa, un cambio de ánimo.',
        },
        {
          id: 'h.limite',
          objetivo: '.nv-limite',
          seccion: 'RECORTE',
          titulo: 'Los límites se arrastran',
          texto: 'Las rayitas entre colores son los cortes. <b>Arrástrenlas</b> palabra por palabra para decidir dónde empieza cada escena.',
        },
        {
          id: 'h.contador',
          objetivo: '.nv-his-contador',
          seccion: 'RECORTE',
          titulo: '¿Cuántas escenas?',
          texto: 'Con <b>+</b> agregan una escena y con <b>−</b> juntan las dos últimas. Entre 3 y 5 escenas suele funcionar bien para 100 palabras.',
        },
        {
          id: 'h.ritmo',
          si: RECORTE,
          objetivo: '.nv-lec__mensaje',
          seccion: 'RECORTE',
          titulo: 'El ritmo',
          texto: 'Aquí dice cuántos segundos dura cada escena, más o menos. Escenas muy cortas pasan sin que se note la música; muy largas se sienten quietas.',
          final: 'A cortar',
        },

        // ---------- Emociones
        {
          id: 'h.emo-escena',
          objetivo: '.nv-his-emo__escena',
          seccion: 'EMOCIONES',
          titulo: 'Una escena a la vez',
          texto: 'A la izquierda está la escena que están decidiendo, con su texto. El lápiz le cambia el nombre.',
        },
        {
          id: 'h.emo-nav',
          objetivo: '.nv-his-emo__nav',
          seccion: 'EMOCIONES',
          titulo: 'Entre escenas',
          texto: 'Las flechas pasan a la escena anterior o a la siguiente.',
        },
        {
          id: 'h.emo-rejilla',
          objetivo: EMOCIONES,
          seccion: 'EMOCIONES',
          titulo: '¿Qué siente esta escena?',
          texto:
            'Elijan una <b>emoción</b>. Con eso la música cambia sola (la escala, la velocidad, cuántos sonidos entran) y la imagen cambia de colores y de ritmo. Cada tarjeta dice cómo.',
        },
        {
          id: 'h.emo-fuerza',
          objetivo: '.nv-his-emo__fuerza',
          seccion: 'EMOCIONES',
          titulo: '¿Qué tan fuerte?',
          texto: 'Suave, media o fuerte: cuánta energía lleva la escena. La secuencia de emociones y fuerzas es el <b>arco</b> de su pieza.',
        },
        {
          id: 'h.emo-seguir',
          si: EMOCIONES,
          objetivo: '.nv-lec__pie',
          seccion: 'EMOCIONES',
          titulo: 'Lo que va a pasar',
          texto: 'Abajo se lee qué hará la música y la imagen con lo que eligieron. «Siguiente escena» pasa a la otra; en la última, los lleva a grabar la <b>voz</b>.',
          final: 'A sentir',
        },
      ];

    // ============================================================ 2 · VOZ
    case 'voz':
      return [
        {
          id: 'v.escenas',
          objetivo: '.nv-pasos-voz',
          seccion: 'PASO 2 · VOZ',
          titulo: 'Una escena a la vez',
          texto:
            'Graban cada escena aparte; las grabadas llevan ✓. Si después mueven un corte en Historia, esa escena se marca con <b>!</b> y hay que volver a grabarla.',
        },
        {
          id: 'v.texto',
          objetivo: '.nv-apuntador__texto',
          seccion: 'VOZ',
          titulo: 'Léanla desde aquí',
          texto: 'Busquen un rincón callado, hablen cerca del micrófono y <b>cuenten</b>, no lean: el tono tiene que acompañar lo que pasa en la historia.',
          detalle: 'La voz es la columna de la pieza: la música baja sola cuando hablan para que siempre se entienda. Una pausa bien puesta vale más que hablar rápido.',
        },
        {
          id: 'v.grabar',
          objetivo: '.nv-grabar',
          seccion: 'VOZ',
          titulo: 'El botón rojo',
          texto: 'Tóquenlo para empezar a grabar y otra vez para parar.',
        },
        {
          id: 'v.aviso',
          objetivo: '.nv-aviso-voz',
          seccion: 'VOZ',
          titulo: 'El texto cambió',
          texto: 'Movieron un corte en Historia y esta escena ya no dice lo mismo que la grabación. Vuelvan a grabarla.',
        },
        {
          id: 'v.control',
          objetivo: '.nv-apuntador__control',
          seccion: 'VOZ',
          titulo: 'Escuchar, repetir y seguir',
          texto: 'Después de grabar, escúchenla aquí. Si no les gusta, «Grabar de nuevo»; si sí, pasen a la siguiente escena.',
          final: 'A grabar',
        },
      ];

    // ============================================================ 3 · MÚSICA
    case 'escena-musica':
      return [
        // ---------- La línea (siempre)
        {
          id: 'm.linea',
          objetivo: '.nv-linea',
          seccion: 'PASO 3 · MÚSICA',
          titulo: 'Toda la obra, la base y las escenas',
          texto:
            'Arriba está toda la pieza. La <b>Base</b> es la música que suena en todas las escenas; cada tarjeta de color es una <b>escena</b>. Empiecen por la Base y después entren a las escenas que necesiten algo distinto.',
        },
        {
          id: 'm.obra',
          si: BASE,
          objetivo: '.nv-linea__obra',
          seccion: 'MÚSICA',
          titulo: 'Oír toda la obra',
          texto: 'El ▶ de «Toda la obra» suena la pieza completa, con la voz.',
        },
        {
          id: 'm.respiro',
          si: BASE,
          objetivo: '.nv-linea__mas',
          seccion: 'MÚSICA',
          titulo: 'Un respiro',
          texto: 'El <b>+</b> agrega un <b>respiro</b>: un momento sin voz, donde la música cuenta sola. Al inicio abre, en el medio deja sentir, al final cierra.',
        },

        // ---------- La Base
        {
          id: 'm.plantillas',
          objetivo: BASE,
          seccion: 'BASE',
          titulo: 'Un género para arrancar',
          texto: 'Reggaetón, trap, salsa, cumbia… Toquen una plantilla para oírla: los golpes de abajo cambian por los de ese género.',
          detalle: 'Si ya retocaron escenas, cambiar de plantilla borra esos retoques: por eso pide tocar dos veces.',
        },
        {
          id: 'm.golpes',
          si: BASE,
          objetivo: '.nv-mesa__golpes',
          seccion: 'BASE',
          titulo: 'Las casillas son la música',
          texto:
            'Cada fila es un sonido y cada casilla, un momento de la vuelta. <b>Toquen una casilla</b> para poner un golpe ahí, o arrastren para pintar varias.',
        },
        {
          id: 'm.fila',
          si: BASE,
          objetivo: '.nv-celdas__nombre',
          seccion: 'BASE',
          titulo: 'Cada fila, un sonido',
          texto: 'El <b>▶</b> la hace sonar sola. Tocar el nombre cambia el sonido por otro de la Sonoteca o por uno de ustedes.',
        },
        {
          id: 'm.velocidad',
          objetivo: '.nv-mesa__velocidad',
          seccion: 'BASE',
          titulo: 'Velocidad',
          texto: 'El tempo de toda la pieza. Cada emoción la acelera o la frena un poco.',
        },
        {
          id: 'm.base',
          si: BASE,
          objetivo: '.nv-mesa__escuchar',
          seccion: 'BASE',
          titulo: 'Oír solo la base',
          texto: '«▶ Base» suena la base en vuelta, sin voz: para armar el ritmo tranquilos.',
        },

        // ---------- Dentro de una escena
        {
          id: 'm.escena',
          si: ESCENA_MUSICA,
          objetivo: '.nv-mesa__cabeza',
          seccion: 'ESCENA',
          titulo: 'Están dentro de una escena',
          texto:
            'Lo que cambien aquí es <b>solo de esta escena</b>; lo demás sigue sonando como la Base. «▶ Escena» la suena con su voz.',
        },
        {
          id: 'm.palabras',
          objetivo: '.nv-palabras',
          seccion: 'ESCENA',
          titulo: 'Sonidos en una palabra',
          texto:
            '<b>Toquen una palabra</b> para pegarle un sonido (suena justo cuando la dicen) o un <b>silencio</b> (la música se calla en ese instante). Sirve para subrayar lo importante.',
        },
        {
          id: 'm.escena-golpes',
          si: ESCENA_MUSICA,
          objetivo: '.nv-mesa__golpes',
          seccion: 'ESCENA',
          titulo: 'Retoquen sus golpes',
          texto: 'Las mismas casillas de la Base, pero para esta escena: más golpes en una escena tensa, menos en una tranquila.',
        },
        {
          id: 'm.suena',
          si: ESCENA_MUSICA,
          objetivo: '.nv-celdas__suena',
          seccion: 'ESCENA',
          titulo: 'Prender o apagar una capa',
          texto: 'El interruptor de la derecha calla una capa solo en esta escena. Quitar sonidos también es hacer música.',
        },
        {
          id: 'm.emo',
          objetivo: '.nv-mesa__pie .nv-emo',
          seccion: 'ESCENA',
          titulo: 'La emoción de esta escena',
          texto: 'La misma que eligieron en Historia. Aquí la pueden cambiar, con su fuerza, mientras escuchan cómo suena.',
        },

        // ---------- Herramientas y cierre
        {
          id: 'm.herr',
          objetivo: '.nv-herr',
          seccion: 'MÚSICA',
          titulo: 'Sus propios sonidos',
          texto:
            '<b>Graba un sonido</b>: una reja, una olla, un pito… lo graban, lo recortan y queda en una capa. <b>Añadir capa</b>: un sonido más de la Sonoteca. <b>Volumen</b>: cuánto suena cada capa y la voz.',
          detalle: 'Los sonidos propios del barrio son lo que hace que la pieza suene a Medellín.',
        },
        {
          id: 'm.lista',
          objetivo: '.nv-mesa__lista',
          seccion: 'ESCENA',
          titulo: 'Márquenla lista',
          texto: 'Cuando la música de la escena esté como la quieren, márquenla. Así llevan la cuenta en el camino de arriba.',
          final: 'A hacer música',
        },
        {
          id: 'm.a-escenas',
          si: BASE,
          objetivo: '.nv-linea__escenas',
          seccion: 'BASE',
          titulo: 'Después, escena por escena',
          texto: 'Con la base lista, <b>toquen una escena</b> para darle su propia música. Lo que no cambien sigue sonando como la base.',
          final: 'A hacer música',
        },
      ];

    // ============================================================ 4 · VISUALES
    case 'escena-visual':
      return [
        {
          id: 'i.receta',
          objetivo: '.nv-receta__pasos',
          seccion: 'PASO 4 · VISUALES',
          titulo: 'La imagen en cuatro pasos',
          texto:
            '<b>Estilo</b> (cómo se dibuja), <b>Colores</b>, <b>Movimiento</b> (qué la mueve) y <b>Golpes</b> (destellos y sacudones a tiempo con la música). Ninguno se bloquea: vayan en el orden que quieran.',
        },
        {
          id: 'i.vista',
          objetivo: '.nv-vista',
          seccion: 'VISUALES',
          titulo: 'Así se ve',
          texto: 'La vista previa muestra la imagen con lo que eligen. El botón de la esquina la pone en grande.',
        },

        // ---------- Una escena abierta
        {
          id: 'i.escena',
          si: ESCENA_VISUAL,
          objetivo: '.nv-vista__chip',
          seccion: 'ESCENA',
          titulo: 'Están en una escena',
          texto: 'Lo que elijan ahora es <b>solo de esta escena</b>. Lo que no cambien sigue como en «Toda la obra».',
        },
        {
          id: 'i.frase',
          objetivo: '.nv-barra-escena',
          seccion: 'ESCENA',
          titulo: 'Un golpe de imagen en una palabra',
          texto: 'Toquen una palabra de la frase para que la imagen dé un golpe justo cuando la dicen. El ▶ suena la escena para probarlo.',
        },
        {
          id: 'i.emo',
          objetivo: '.nv-paso-visual__lado .nv-emo',
          seccion: 'ESCENA',
          titulo: 'La emoción también pinta',
          texto: 'La emoción de la escena cambia los colores y el ritmo de la imagen. Aquí la pueden cambiar, con su fuerza.',
        },

        // ---------- 1 Estilo
        {
          id: 'i.fondo',
          objetivo: '.nv-fondo',
          seccion: 'ESTILO',
          titulo: 'Una foto de fondo',
          texto: 'Si ponen una foto (del recorrido, del barrio), el estilo toma su forma y sus colores. «Sin foto» la quita.',
        },
        {
          id: 'i.estilo',
          objetivo: ESTILO,
          seccion: 'ESTILO',
          titulo: 'Elijan un estilo',
          texto: 'Toquen uno y mírenlo en la vista previa. Prueben varios antes de quedarse con uno; «Sorpréndeme» elige al azar.',
        },

        // ---------- 2 Colores
        {
          id: 'i.paleta',
          objetivo: PALETA,
          seccion: 'COLORES',
          titulo: 'Los colores de la obra',
          texto: 'Toquen una paleta y la imagen se pinta con esos colores. Si pusieron foto de fondo, «Colores de la foto» usa los suyos.',
        },

        // ---------- 3 Movimiento
        {
          id: 'i.estante',
          objetivo: MOVIMIENTO,
          seccion: 'MOVIMIENTO',
          titulo: 'Las cajitas',
          texto:
            'Cada cajita es algo que cambia mientras suena la pieza: un <b>instrumento</b>, la <b>voz</b>, el <b>relato</b>, la luz de una <b>foto</b>.',
        },
        {
          id: 'i.fotos',
          objetivo: '.nv-estante__fotos',
          seccion: 'MOVIMIENTO',
          titulo: 'Sus fotos también mueven',
          texto: '«Subir» agrega fotos. Cada una trae cajitas (su luz, su color, sus bordes) y la foto entera puede ir en la caja Colores.',
        },
        {
          id: 'i.cajas',
          // Una caja, no la columna entera: en un celular la columna no deja sitio para la burbuja.
          objetivo: '.nv-cajas .nv-caja',
          seccion: 'MOVIMIENTO',
          titulo: 'Suéltenla en una caja',
          texto:
            'Cada caja es una parte de la imagen: brillo, zoom, giro… <b>Arrastren una cajita a una caja</b> (o tóquenla y luego la caja) y esa parte se mueve con ella. Poco, algo o mucho dice cuánto.',
          detalle: 'Una caja vacía tiene un deslizador para ponerla a mano. La × quita la cajita.',
        },

        // ---------- 4 Golpes
        {
          id: 'i.golpes',
          objetivo: `${GOLPES_IMAGEN} .nv-celdas`,
          seccion: 'GOLPES',
          titulo: 'Golpes a tiempo',
          texto: 'Igual que las casillas de la música: toquen una casilla y en ese momento de la vuelta la imagen da el golpe. El ▶ de cada fila lo prueba.',
        },
        {
          id: 'i.azar',
          si: GOLPES_IMAGEN,
          objetivo: '.nv-campo__fila .nv-boton',
          seccion: 'GOLPES',
          titulo: 'Al azar',
          texto: 'Reparte unos golpes para empezar. Después quiten y pongan a mano.',
        },

        // ---------- Cierre
        {
          id: 'i.listo',
          objetivo: '.nv-receta__listo',
          seccion: 'VISUALES',
          titulo: 'Listo, y al siguiente',
          texto: 'Lleva al siguiente de los cuatro pasos.',
        },
        {
          id: 'i.cinta',
          objetivo: '.nv-pelicula',
          seccion: 'VISUALES',
          titulo: 'Toda la obra y cada escena',
          texto:
            '<b>Toda la obra</b> pone la imagen de todas las escenas. <b>Toquen una escena</b> para darle su propia imagen: lo que no cambien sigue como en Toda la obra.',
          final: 'A crear la imagen',
        },
      ];

    // ============================================================ 5 · FUNCIÓN
    case 'funcion':
      return [
        {
          id: 'f.escenario',
          objetivo: '.nv-escenario',
          seccion: 'PASO 5 · FUNCIÓN',
          titulo: 'La pieza como se va a presentar',
          texto: 'Aquí la ven entera, con la imagen en grande y la frase apareciendo mientras se dice.',
        },
        {
          id: 'f.progreso',
          objetivo: '.nv-progreso',
          seccion: 'FUNCIÓN',
          titulo: 'Las escenas, en orden',
          texto: 'La barra avanza escena por escena mientras suena.',
        },
        {
          id: 'f.ver',
          objetivo: '.nv-pie .nv-boton--primario',
          seccion: 'FUNCIÓN',
          titulo: 'Ver la pieza',
          texto: 'La toca entera, de principio a fin. Véanla en equipo antes de mandarla.',
        },
        {
          id: 'f.selector',
          objetivo: '.nv-pie .nv-selector',
          seccion: 'FUNCIÓN',
          titulo: 'Con música y sin música',
          texto: '«Sin música» deja solo la voz: sirve para oír qué le aporta el sonido al relato.',
        },
        {
          id: 'f.exportar',
          objetivo: '[data-tour="exportar"]',
          seccion: 'FUNCIÓN',
          titulo: 'Exportar y mandar a la galería',
          texto:
            'Cuando esté lista, «Exportar video» la toca entera y la graba. Después la mandan a la <b>galería</b>: eso es lo que reciben los jurados. No cambien de pantalla mientras se graba.',
          final: 'Listo',
        },
      ];

    // ============================================================ Ventana: Añadir capa
    case 'ventana-sonidos':
      return [
        {
          id: 's.que',
          seccion: 'AÑADIR UNA CAPA',
          titulo: 'Un sonido más para la música',
          texto: 'Aquí eligen el sonido de una capa nueva (o cambian el de una que ya existe).',
        },
        {
          id: 's.grabalo',
          objetivo: '.nv-grabalo',
          seccion: 'AÑADIR UNA CAPA',
          titulo: '¿No está? Grábenlo',
          texto: '«Grabar» abre la grabadora: graban, recortan y le ponen nombre. «Subir» trae un audio del celular.',
        },
        {
          id: 's.grupos',
          objetivo: '.nv-biblio__grupos',
          seccion: 'AÑADIR UNA CAPA',
          titulo: 'La Sonoteca, por grupos',
          texto: '<b>Tuyos</b> (lo que grabaron), <b>Hechos en SONORA</b>, la <b>ciudad</b>, percusión y melódicos. Toquen un grupo para ver sus sonidos.',
        },
        {
          id: 's.rejilla',
          objetivo: '.nv-biblio__rejilla',
          seccion: 'AÑADIR UNA CAPA',
          titulo: 'Toquen para oír',
          texto: 'Cada ficha suena al tocarla. Prueben varias: la que elijan queda marcada.',
        },
        {
          id: 's.guardar',
          objetivo: '.nv-biblio__pie',
          seccion: 'AÑADIR UNA CAPA',
          titulo: 'Guárdenlo en la capa',
          texto: 'Cuando les guste uno, guárdenlo: queda como capa con sus casillas, lista para poner golpes.',
          final: 'A buscar sonidos',
        },
      ];

    // ============================================================ Ventana: Graba tu sonido
    case 'ventana-grabar':
      return [
        {
          id: 'gr.micro',
          objetivo: '.nv-grabadora__boton',
          seccion: 'GRABA TU SONIDO',
          titulo: 'Toquen y graben',
          texto:
            'El botón grande graba; tóquenlo otra vez para parar. Acerquen la tablet al sonido: una reja, una olla, un pito, sus manos. También pueden subir un audio del celular. Al terminar aparecen el recorte, el nombre y dónde ponerlo.',
          // Antes de grabar es el único paso: cierra el recorrido.
          final: 'A grabar',
        },
        {
          id: 'gr.recorte',
          objetivo: '.nv-grabadora__recorte',
          seccion: 'GRABA TU SONIDO',
          titulo: 'Recorten lo que sobra',
          texto: 'Lo verde es lo que queda: muevan las orillas para dejar solo el golpe o el sonido que quieren.',
        },
        {
          id: 'gr.nombre',
          objetivo: '.nv-grabadora__campo',
          seccion: 'GRABA TU SONIDO',
          titulo: 'Pónganle nombre',
          texto: 'Con un nombre lo encuentran después en «Tuyos».',
        },
        {
          id: 'gr.donde',
          objetivo: '.nv-grabadora__donde',
          seccion: 'GRABA TU SONIDO',
          titulo: '¿Dónde va?',
          texto: 'En una capa nueva o en lugar del sonido de una capa que ya tienen.',
          final: 'A grabar',
        },
      ];

    // ============================================================ Ventana: Melodía
    case 'ventana-matriz':
      return [
        {
          id: 'x.que',
          seccion: 'MELODÍA',
          titulo: 'La melodía, casilla por casilla',
          texto:
            'Aquí arman la melodía: las notas que suenan sobre los golpes. Es como las casillas de golpes, pero con <b>altura</b>: arriba notas agudas, abajo graves.',
        },
        {
          id: 'x.notas',
          objetivo: '.matriz-rejilla__notas',
          seccion: 'MELODÍA',
          titulo: 'Cada fila es una nota',
          texto: 'A la izquierda está el nombre de cada nota. Las filas están elegidas para que <b>todo suene afinado</b>: no hay notas «feas».',
        },
        {
          id: 'x.celdas',
          objetivo: '.matriz-rejilla__celdas',
          seccion: 'MELODÍA',
          titulo: 'Poner notas',
          texto:
            'De izquierda a derecha es el tiempo. <b>Toquen una casilla</b> para poner una nota y otra vez para quitarla. Varias notas en la <b>misma columna</b> suenan juntas: un acorde.',
          detalle: 'Para empezar: pocas notas, separadas, que suban y bajen poco a poco. Una melodía simple deja lugar a la voz.',
        },
        {
          id: 'x.escala',
          objetivo: '.matriz-escalas',
          seccion: 'MELODÍA',
          titulo: 'La escala: el color de la melodía',
          texto:
            '<b>Mayor</b> suena luminosa, <b>Menor</b> triste, <b>Frigia</b> tensa, <b>Dórica</b> nostálgica, <b>Pentatónica</b> suelta. Toquen una y escuchen.',
          detalle: 'En la pieza, la emoción de cada escena cambia la escala sola. Lo que eligen aquí es la escala de base.',
        },
        {
          id: 'x.instrumento',
          objetivo: '.matriz-lado .nv-selector',
          seccion: 'MELODÍA',
          titulo: 'Con qué suena',
          texto:
            'En la pestaña <b>Con qué suena</b> eligen un sonido de la app (marimba, piano…) o <b>uno de ustedes</b>, que se <b>afina solo</b> en cada fila.',
          detalle: 'Con un sonido propio, la app escucha en qué nota está y lo afina desde ahí. Si no encuentra un tono claro (pasa con golpes y ruidos), elijan la nota a mano en «Tu sonido está en».',
        },
        {
          id: 'x.pie',
          objetivo: '.ventana__pie',
          seccion: 'MELODÍA',
          titulo: 'Escuchar y limpiar',
          texto: '<b>▶</b> hace sonar la melodía. El botón rojo borra todas las notas para empezar de cero.',
          final: 'A tocar notas',
        },
      ];

    // Las ventanas de golpes, pad, datos y mezcla ya no se abren en la app.
    default:
      return [];
  }
}
