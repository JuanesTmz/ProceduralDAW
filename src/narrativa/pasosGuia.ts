// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Lo que dice la guía en cada pantalla y en cada ventana.
 *
 * Cada lugar tiene su recorrido; se pide desde el «?» (lo que se ve solo, la
 * primera vez, son las pistas animadas de la mano). Rehecho el 23 nov 2026
 * para la interfaz de cinco pasos (Historia, Voz, Música, Visuales, Función). Un paso señala un elemento con
 * `objetivo` (un selector CSS); si ese elemento no está en pantalla, el paso
 * se salta solo. El texto va de tú a tú y muy masticado: qué es, para qué
 * sirve y cómo se usa. Lo largo va en `detalle` («Explícame más»).
 *
 * Los textos empujan hacia lo que pide el reto: la historia primero, la
 * música que sigue el arco por reglas, el material propio y el visual que
 * acompaña.
 */

export interface PasoTour {
  id: string;
  /** Selector del elemento a iluminar. Sin él, la burbuja va al centro. */
  objetivo?: string;
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
  | 'ventana-datos'
  | 'ventana-mezcla';

export function pasosDe(pantalla: Pantalla): PasoTour[] {
  switch (pantalla) {
    // ------------------------------------------------------------ Historia (los cuatro tramos: el tour se salta lo que no está a la vista)
    case 'historia':
      return [
        {
          id: 'h.bienvenida',
          seccion: 'BIENVENIDA',
          titulo: 'Van a contar Medellín',
          texto:
            'En SONORA arman una pieza de <b>narrativa sonora</b>: un monólogo corto, dicho con su voz, con <b>música</b> e <b>imagen</b> que lo acompañan. No es hacer una canción: es <b>contar una historia</b> y que el sonido y la imagen la ayuden a contarse.',
        },
        {
          id: 'h.camino',
          objetivo: '.nv-camino__pasos',
          seccion: 'EL CAMINO',
          titulo: 'Cinco pasos',
          texto:
            '<b>1 Historia</b> (la escriben y la parten), <b>2 Voz</b> (la graban), <b>3 Música</b>, <b>4 Visuales</b> y <b>5 Función</b> (la ven entera y la mandan). Pueden volver a cualquier paso cuando quieran: nada se pierde y todo <b>se guarda solo</b>.',
        },
        {
          id: 'h.medidor',
          objetivo: '.nv-medidor',
          titulo: 'Máximo 2 minutos y medio',
          texto: 'Esta barra dice cuánto dura la pieza. <b>La voz pone el tiempo</b>: si la barra se pone roja, recorten el texto.',
        },
        {
          id: 'h.escuchar',
          objetivo: '.nv-camino__escuchar',
          titulo: 'Escuchar en cualquier momento',
          texto: 'Este botón (o la <b>barra espaciadora</b>) hace sonar la pieza. Úsenlo seguido: escuchar es la mejor forma de saber qué falta.',
        },
        {
          id: 'h.tramos',
          objetivo: '.nv-lec__tramos',
          seccion: 'PASO 1 · HISTORIA',
          titulo: 'Recorrido, monólogo, recorte y emociones',
          texto: 'La historia se arma en cuatro partes, de izquierda a derecha. La barra de cada una se llena a medida que avanzan. Pueden tocar cualquiera para ir allá.',
        },
        {
          id: 'h.recorrido',
          objetivo: '.nv-his-mapa__lienzo',
          seccion: 'RECORRIDO',
          titulo: 'Las estaciones del SmartFest',
          texto:
            'Cada punto es una estación. <b>Toquen una para entrar</b> y anotar lo que vieron, oyeron o sintieron: una frase, una foto o un audio. Es la materia prima de su historia.',
          detalle: 'No tienen que usarlo todo. Busquen lo que se repite o lo que más los sorprendió: ahí suele estar la historia que solo se entiende en Medellín.',
        },
        {
          id: 'h.monologo',
          objetivo: '.nv-his-mono__texto',
          seccion: 'MONÓLOGO',
          titulo: 'Unas 100 palabras, para decirlas',
          texto:
            'Escriban <b>una sola historia</b> para decirla en voz alta, no para cantarla. La regla de abajo dice si va bien de largo (entre 70 y 130 palabras). «Usar un ejemplo» muestra cómo se ve una.',
          detalle: 'Funciona mejor una historia con un cambio adentro (algo pasa, algo se rompe, alguien llega) que una descripción quieta: ese cambio es lo que la música y la imagen van a seguir.',
        },
        {
          id: 'h.partir',
          objetivo: '.nv-partir__texto',
          seccion: 'RECORTE',
          titulo: 'Pártanla en escenas',
          texto: 'Cada color es una <b>escena</b>. Las rayitas entre colores son los límites: <b>arrástrenlas</b> palabra por palabra para decidir dónde empieza cada escena.',
        },
        {
          id: 'h.contador',
          objetivo: '.nv-his-contador',
          titulo: '¿Cuántas escenas?',
          texto: 'Con <b>+</b> agregan una escena y con <b>−</b> juntan las dos últimas. Entre 3 y 5 escenas suele funcionar bien para 100 palabras.',
          detalle: 'Partan donde la historia <b>cambia</b>: un giro, una sorpresa, un cambio de ánimo. Cada escena va a tener su propia emoción, música e imagen.',
        },
        {
          id: 'h.emociones',
          objetivo: '.nv-his-emo__rejilla',
          seccion: 'EMOCIONES',
          titulo: '¿Qué siente cada escena?',
          texto:
            'Elijan una <b>emoción</b> por escena. Con eso la música cambia sola (la escala, la velocidad, cuántos sonidos entran) y la imagen cambia de colores. Las flechas de arriba pasan de una escena a otra.',
        },
        {
          id: 'h.fuerza',
          objetivo: '.nv-his-emo__fuerza',
          titulo: 'Y qué tan fuerte',
          texto: 'Suave, media o fuerte: cuánta energía lleva la escena. Esa secuencia de emociones y fuerzas es el <b>arco</b> de su pieza.',
          final: 'A escribir',
        },
      ];

    // ------------------------------------------------------------ Voz
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
          id: 'v.apuntador',
          objetivo: '.nv-apuntador__texto',
          titulo: 'Lean desde aquí',
          texto: 'Busquen un rincón callado, hablen cerca del micrófono y <b>cuenten</b>, no lean: el tono tiene que acompañar lo que pasa en la historia.',
          detalle: 'La voz es la columna de la pieza: la música baja sola cuando hablan para que siempre se entienda. Una pausa bien puesta vale más que hablar rápido.',
        },
        {
          id: 'v.grabar',
          objetivo: '.nv-apuntador__control',
          titulo: 'Grabar, escuchar, repetir',
          texto: 'El <b>botón rojo</b> empieza a grabar; tóquenlo otra vez para parar. Escuchen cómo quedó y, si no les gusta, «Grabar de nuevo».',
          final: 'A grabar',
        },
      ];

    // ------------------------------------------------------------ Música
    case 'escena-musica':
      return [
        {
          id: 'm.linea',
          objetivo: '.nv-linea',
          seccion: 'PASO 3 · MÚSICA',
          titulo: 'La base y sus escenas',
          texto:
            'Arriba está toda la obra: la <b>Base</b> (la música de toda la pieza) y una tarjeta por escena. Empiecen por la Base; después entren a cada escena para cambiar solo lo que esa escena necesite. El <b>+</b> agrega un <b>respiro</b>: un momento sin voz, solo música.',
        },
        {
          id: 'm.plantillas',
          objetivo: '.nv-plantillas',
          titulo: 'Un género para arrancar',
          texto: 'Reggaetón, trap, salsa, cumbia… Toquen una plantilla para oírla: los golpes de abajo cambian por los de ese género.',
        },
        {
          id: 'm.celdas',
          objetivo: '.nv-mesa__golpes',
          titulo: 'Las casillas son la música',
          texto:
            'Cada fila es un sonido y cada casilla, un momento de la vuelta. <b>Toquen una casilla</b> para poner un golpe ahí (o arrastren para pintar varias). El ▶ de cada fila la hace sonar sola.',
          detalle: 'En una escena, el interruptor de la derecha de cada fila la apaga o la prende solo en esa escena.',
        },
        {
          id: 'm.velocidad',
          objetivo: '.nv-mesa__velocidad',
          titulo: 'Velocidad',
          texto: 'El tempo de toda la pieza. Cada emoción la acelera o la frena un poco.',
        },
        {
          id: 'm.emo',
          objetivo: '.nv-mesa__pie .nv-emo',
          titulo: 'La emoción de esta escena',
          texto: 'La misma que eligieron en Historia: aquí la pueden cambiar mientras escuchan cómo suena, con su fuerza.',
        },
        {
          id: 'm.herramientas',
          objetivo: '.nv-herr',
          titulo: 'Sus propios sonidos',
          texto:
            '<b>Graba un sonido</b>: una reja, una olla, un pito… lo graban, lo recortan y queda en una capa. <b>Añadir capa</b>: un sonido más de la Sonoteca. <b>Volumen</b>: cuánto suena cada capa y la voz.',
          detalle: 'Los sonidos propios del barrio son lo que hace que la pieza suene a Medellín.',
        },
        {
          id: 'm.lista',
          objetivo: '.nv-mesa__lista',
          titulo: 'Márquenla lista',
          texto: 'Cuando la música de la escena esté como la quieren, márquenla. Así llevan la cuenta en el paso de arriba.',
          final: 'A hacer música',
        },
      ];

    // ------------------------------------------------------------ Visuales
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
          titulo: 'Así se ve',
          texto: 'La vista previa muestra la imagen con lo que eligen. El botón de la esquina la pone en grande.',
        },
        {
          id: 'i.fondo',
          objetivo: '.nv-fondo',
          titulo: 'Una foto de fondo',
          texto: 'Si ponen una foto (del recorrido, del barrio), el estilo toma su forma y sus colores.',
        },
        {
          id: 'i.estilo',
          objetivo: '[data-bloqueo="visual:estilo"]',
          titulo: 'Elijan un estilo',
          texto: 'Toquen uno y mírenlo en la vista previa. «Sorpréndeme» elige uno al azar.',
        },
        {
          id: 'i.cajitas',
          objetivo: '.nv-estante',
          titulo: 'Las cajitas mueven la imagen',
          texto:
            'Cada cajita es algo que cambia mientras suena la pieza: la <b>voz</b>, un <b>instrumento</b>, la <b>emoción</b>, la luz de una foto. <b>Arrástrenla a una caja</b> (o tóquenla y luego la caja) y esa parte de la imagen se mueve con ella.',
        },
        {
          id: 'i.golpes',
          objetivo: '.nv-golpes-imagen',
          titulo: 'Golpes a tiempo',
          texto: 'Igual que las casillas de la música: toquen una casilla y en ese momento la imagen da el golpe. El ▶ de cada fila lo prueba.',
        },
        {
          id: 'i.cinta',
          objetivo: '.nv-pelicula',
          titulo: 'Toda la obra y cada escena',
          texto:
            '<b>Toda la obra</b> pone la imagen de todas las escenas. <b>Toquen una escena</b> para darle su propia imagen: lo que no cambien sigue como en Toda la obra.',
          final: 'A crear la imagen',
        },
      ];

    // ------------------------------------------------------------ Función
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
          id: 'f.selector',
          objetivo: '.nv-pie .nv-selector',
          titulo: 'Con música y sin música',
          texto: '«Sin música» deja solo la voz: sirve para oír qué le aporta el sonido al relato.',
        },
        {
          id: 'f.exportar',
          objetivo: '[data-tour="exportar"]',
          titulo: 'Exportar y mandar a la galería',
          texto:
            'Cuando esté lista, «Exportar video» la toca entera y la graba. Después la mandan a la <b>galería</b>: eso es lo que reciben los jurados. No cambien de pantalla mientras se graba.',
          final: 'Listo',
        },
      ];

    // ------------------------------------------------------------ Ventana: Golpes
    case 'ventana-golpes':
      return [
        {
          id: 'g.que',
          seccion: 'CELDAS DE GOLPES',
          titulo: 'Poner los golpes a mano',
          texto:
            'Aquí deciden <b>en qué momento exacto</b> suena cada golpe de una pista. Es la forma más directa de armar un ritmo: casilla por casilla.',
        },
        {
          id: 'g.celdas',
          objetivo: '.golpes__celda .celdas',
          titulo: 'Las casillas',
          texto:
            'Cada casilla es un pedacito de tiempo. La fila completa es <b>una vuelta</b> del ritmo, que se repite una y otra vez. <b>Toquen una casilla</b> para poner un golpe (se pinta) y otra vez para quitarlo. <b>Arrastren el dedo</b> para pintar o borrar varias seguidas.',
          detalle:
            'Las casillas un poco más marcadas son el <b>pulso</b>: donde uno movería la cabeza. Un bombo en esas casillas suena firme; golpes fuera del pulso le dan swing. Mientras suena, una línea muestra por qué casilla va.',
        },
        {
          id: 'g.datos',
          objetivo: '.golpes__datos',
          titulo: 'Cuántos golpes y cuántas casillas',
          texto:
            'Dice cuántos golpes tiene la pista. <b>16, 32 o 64</b> cambia cuántas casillas tiene la vuelta: con más casillas pueden poner golpes más seguidos y finos.',
        },
        {
          id: 'g.sonido',
          objetivo: '.sonidos-elegir',
          titulo: 'Con qué suena esta pista',
          texto: 'Elijan el sonido de la pista: la batería de la app (<b>Percusión</b>) o los efectos que grabaron (<b>Propios</b>).',
        },
        {
          id: 'g.pistas',
          objetivo: '.golpes .pistas',
          titulo: 'Cambiar de pista',
          texto:
            'Se arma <b>una pista a la vez</b>. Toquen otra en esta lista para dibujarle sus golpes. «+ Nueva» crea una pista nueva: le eligen sonido, le dibujan golpes y la agregan a la canción.',
        },
        {
          id: 'g.pie',
          objetivo: '.ventana__pie',
          titulo: 'Escuchar mientras dibujan',
          texto:
            '<b>▶ Solo este</b> hace sonar solo esta pista. <b>▶ Con los demás</b> la hace sonar con todo. «Quitar de la canción» borra la pista entera.',
          detalle:
            'Estas casillas también las puede llenar el <b>Pad</b> con una regla. Si después lo mueven, el Pad reparte los golpes otra vez y reemplaza lo que dibujaron aquí.',
          final: 'A dibujar golpes',
        },
      ];

    // ------------------------------------------------------------ Ventana: Matriz
    case 'ventana-matriz':
      return [
        {
          id: 'x.que',
          seccion: 'MATRIZ DE MELODÍA',
          titulo: 'La melodía, casilla por casilla',
          texto:
            'Aquí arman la melodía: las notas que suenan sobre los golpes. Es como las celdas de golpes, pero con <b>altura</b>: arriba notas agudas, abajo graves.',
        },
        {
          id: 'x.notas',
          objetivo: '.matriz-rejilla__notas',
          titulo: 'Cada fila es una nota',
          texto:
            'A la izquierda está el nombre de cada nota. Las filas están elegidas para que <b>todo suene afinado</b>: no hay notas «feas», pongan lo que pongan.',
        },
        {
          id: 'x.celdas',
          objetivo: '.matriz-rejilla__celdas',
          titulo: 'Poner notas',
          texto:
            'De izquierda a derecha es el tiempo (una vuelta, como en los golpes). <b>Toquen una casilla</b> para poner una nota y otra vez para quitarla. Varias notas en la <b>misma columna</b> suenan juntas: un acorde.',
          detalle:
            'Truco para empezar: pongan pocas notas, separadas, que suban y bajen poco a poco. Una melodía simple deja lugar a la voz. Recuerden que la voz es lo principal.',
        },
        {
          id: 'x.lado',
          objetivo: '.matriz-lado .nv-selector',
          titulo: 'Dos pestañas: Escala y Con qué suena',
          texto:
            'A la derecha están las dos cosas que cambian cómo suena tu melodía. <b>Escala</b>: el color de las notas. <b>Con qué suena</b>: el instrumento. Abajo, el volumen.',
        },
        {
          id: 'x.escala',
          objetivo: '.matriz-escalas',
          titulo: 'La escala: el color de la melodía',
          texto:
            'La escala decide qué notas hay en las filas. <b>Mayor</b> suena luminosa, <b>Menor</b> triste, <b>Frigia</b> tensa, <b>Dórica</b> nostálgica, <b>Pentatónica</b> suelta. Toca una y escucha.',
          detalle:
            'En la pieza, la emoción de cada escena cambia la escala sola. Lo que eliges aquí es la escala de base.',
        },
        {
          id: 'x.instrumento',
          objetivo: '.matriz-lado .nv-selector',
          titulo: 'Con qué suena la melodía',
          texto:
            'En la pestaña <b>Con qué suena</b> eliges el <b>sintetizador</b>, un sonido de la app (marimba, piano…) o <b>un efecto tuyo</b>, que se <b>afina solo</b> en cada fila. Con ▶ lo escuchas antes de elegirlo.',
          detalle:
            'Con un sonido propio, la app escucha en qué nota está y lo afina desde ahí. Si dice que no encontró un tono claro (pasa con golpes y ruidos), elige la nota a mano en «Tu sonido está en».',
        },
        {
          id: 'x.pie',
          objetivo: '.ventana__pie',
          titulo: 'Escuchar y limpiar',
          texto: '<b>▶</b> hace sonar la melodía. El botón rojo borra todas las notas para empezar de cero.',
          final: 'A tocar notas',
        },
      ];

    // ------------------------------------------------------------ Ventana: Pad
    case 'ventana-pad':
      return [
        {
          id: 'p.que',
          seccion: 'EL PAD · LO PROCEDURAL',
          titulo: 'Una regla en vez de golpes',
          texto:
            'Aquí no dibujan golpe por golpe: <b>ponen una regla</b> y la máquina reparte los golpes según esa regla. Eso es la música <b>procedural</b>: se genera, no se escribe nota por nota.',
          detalle:
            'Es la misma idea con la que generan muchas IA: no guardan la canción, guardan reglas y un poco de azar, y con eso producen algo nuevo cada vez. Por eso su música no es un loop fijo.',
        },
        {
          id: 'p.casillas',
          objetivo: '.pad__casillas',
          titulo: 'Las casillas: lo que sale',
          texto:
            'Así reparte el pad los golpes en una vuelta. <b>Llena</b>: suena siempre. <b>Con borde punteado</b>: suena <b>a veces</b> (el azar decide en cada vuelta). Vacía: silencio. Cambian solas cuando mueven el punto.',
        },
        {
          id: 'p.x',
          objetivo: '.pad__cuadro',
          titulo: 'Hacia la derecha: más golpes',
          texto:
            'Arrastren el punto <b>a la derecha</b> y la pista tiene <b>más golpes</b>; a la izquierda, menos. La máquina los reparte <b>lo más parejo posible</b>, por eso casi cualquier posición suena bien.',
          detalle:
            'Ese reparto parejo se llama ritmo euclidiano: es el que está detrás de muchos ritmos tradicionales del mundo, como el tresillo o la clave del son.',
        },
        {
          id: 'p.y',
          objetivo: '.pad__cuadro',
          titulo: 'Hacia arriba: cambia cada vez',
          texto:
            '<b>Abajo</b> la pista suena <b>siempre igual</b>, firme. <b>Arriba</b> <b>cambia cada vez</b>: entra el <b>azar</b>: algunos golpes suenan a veces sí y a veces no, y aparecen golpes de relleno. La pista <b>respira</b> y nunca se repite igual.',
          detalle:
            'Prueben las cuatro esquinas: abajo-izquierda, pocos golpes y firmes; abajo-derecha, muchos y machacados; arriba-izquierda, pocos y sueltos; arriba-derecha, lleno y caótico. Debajo del cuadro, una frase les dice cómo quedó. Escuchen con «Oír la escena» mientras lo mueven.',
        },
        {
          id: 'p.alcance',
          objetivo: '.ventana__nota',
          titulo: '¿Para toda la pieza o solo aquí?',
          texto:
            'Aquí arriba dice a qué afecta. Abierto desde <b>General</b>: cambia toda la pieza. Abierto <b>dentro de una escena</b>: cambia <b>solo esa escena</b>, y abajo aparece «Volver a lo general» para deshacerlo.',
          detalle:
            'Una buena receta: en General dejen una regla tranquila, y en las escenas fuertes muevan el Pad a la derecha y arriba. Así la música crece con la historia.',
        },
        {
          id: 'p.pie',
          objetivo: '.ventana__pie',
          titulo: 'Oír mientras mueven',
          texto: '«Oír la escena» la hace sonar mientras mueven el punto. Toquen otra vez para pausar; al cerrar la ventana se para sola.',
          final: 'A poner reglas',
        },
      ];

    // ------------------------------------------------------------ Ventana: Sonidos
    case 'ventana-sonidos':
      return [
        {
          id: 's.grabalo',
          objetivo: '.nv-grabalo',
          seccion: 'AÑADIR UNA CAPA',
          titulo: '¿No está el que buscan? Grábenlo',
          texto: '<b>Grabar</b> abre el micrófono; <b>Subir archivo</b> trae un audio del celular. Lo recortan y queda como una capa nueva.',
        },
        {
          id: 's.grupos',
          objetivo: '.nv-biblio__grupos',
          titulo: 'La Sonoteca',
          texto: 'Sonidos ordenados por familia: batería, percusión, ciudad, melodías… y «Tuyos», los que ya grabaron.',
        },
        {
          id: 's.fichas',
          objetivo: '.nv-biblio__rejilla',
          titulo: 'Toquen para oír',
          texto: 'Cada ficha suena al tocarla. Cuando encuentren el que va con su historia, guárdenlo en la capa.',
          final: 'A buscar sonidos',
        },
        {
          id: 's.pistas',
          objetivo: '.nv-sonidos__pistas',
          seccion: 'SONIDOS',
          titulo: 'Primero elijan una pista',
          texto:
            'A la izquierda están todas las pistas de la música. <b>Toquen una</b> y a la derecha eligen con qué suena. La <b>×</b> que aparece al lado quita esa pista.',
        },
        {
          id: 's.oir',
          objetivo: '.nv-sonido__elegir',
          titulo: 'Tocar para oír, Guardar para usar',
          texto:
            '<b>Toquen un sonido</b>: suena y queda marcado en verde, sin cambiar nada todavía. Si les gusta, abajo aparece <b>✓ Guardar sonido</b>: eso lo pone en la capa (el que ya tiene la capa lleva ✓).',
        },
        {
          id: 's.grupos',
          objetivo: '.nv-sonidos__catalogo',
          titulo: 'La biblioteca',
          texto:
            '<b>Batería:</b> bombo, redoblante, hi-hat… <b>Percusión:</b> conga, clave, güiro… <b>Sonidos de ciudad:</b> lluvia, tráfico, metro, gente. <b>Para melodías:</b> instrumentos que también sirven como golpe.',
        },
        {
          id: 's.propios',
          objetivo: '.nv-sonidos__propios',
          titulo: 'Sus efectos',
          texto:
            '<b>Grabar un efecto</b>: graben un sonido de su entorno (una reja, un pito, una olla). <b>Subir un archivo</b>: usen un audio que ya tengan. Después lo <b>recortan</b> (lo verde es lo que queda), le ponen nombre y queda puesto en la pista.',
          detalle:
            'Aquí solo se graban efectos para la música; la voz del monólogo se graba en el paso Voz. Usar sonidos propios del tema, con intención, suma en la calificación.',
        },
        {
          id: 's.melodia',
          objetivo: '.nv-sonidos__pistas .nv-sonidos__pista:last-of-type',
          titulo: 'La melodía también',
          texto:
            'Si eligen <b>Melodía</b>, a la derecha aparecen los instrumentos para la melodía, y también pueden usar un efecto suyo: <b>se afina solo</b> en cada nota.',
        },
        {
          id: 's.nueva',
          objetivo: '[data-tour="nueva-pista"]',
          titulo: 'Agregar una pista',
          texto:
            '<b>+ Nueva pista</b> y después toquen un sonido: se crea una pista con ese sonido. Arranca vacía: denle golpes con su Pad o con ✎ Golpes.',
          final: 'A buscar sonidos',
        },
      ];

    // ------------------------------------------------------------ Ventana: Datos
    case 'ventana-datos':
      return [
        {
          id: 'd.que',
          seccion: 'DATOS',
          titulo: 'Que la música se mueva sola',
          texto:
            'Aquí deciden qué partes de la música <b>cambian solas</b> según un dato de su historia. Así la música sigue el relato sin que tengan que editar escena por escena.',
          detalle:
            'Esto es lo que hace un sistema que «dirige con datos»: ustedes eligen la relación (este dato mueve esto) y la máquina la aplica en cada momento. Valen para toda la pieza.',
        },
        {
          id: 'd.columnas',
          objetivo: '.nv-parametros__cabeza',
          titulo: 'Tres columnas, de izquierda a derecha',
          texto:
            'Cada fila se lee como una frase: <b>lo que se mueve</b> (el brillo, los golpes del bombo…) → <b>según qué dato</b> → <b>cuánto</b>. Por ejemplo: «Brillo, según La emoción, Algo».',
        },
        {
          id: 'd.fila',
          objetivo: '.nv-parametro',
          titulo: 'Cada fila, algo que se puede mover',
          texto:
            'Los golpes de cada sonido, las notas de la melodía, el brillo, el eco… Las filas con una raya de color a la izquierda ya las mueve un dato; las demás están quietas o «a mano».',
        },
        {
          id: 'd.elegir',
          objetivo: '.nv-parametro .nv-desplegable',
          titulo: '¿Según qué dato?',
          texto:
            'Toquen <b>Elegir un dato</b> y escojan: <b>La emoción</b>, <b>La fuerza de la escena</b>, <b>El avance de la historia</b>, <b>La voz</b>, <b>El bombo</b>, <b>El pulso</b>, el golpe de <b>cada instrumento</b>, <b>cada nota de la melodía</b> y los datos de una <b>foto</b>. Para soltarlo, elijan <b>Ninguno</b>. Las listas se pliegan: toquen un título para abrirlo.',
          detalle:
            'Ejemplos: «Golpes · Bombo, según La fuerza»: en escenas fuertes el bombo se llena. «La música se aparta, según La voz»: cuando hablan, la música baja. «Brillo, según El avance»: el sonido se abre a medida que avanza la historia.',
        },
        {
          id: 'd.cantidad',
          objetivo: '.nv-parametro--dato .nv-selector--ia',
          titulo: 'Poco, Algo, Mucho',
          texto: 'Cuánto manda el dato. Con <b>Poco</b> el cambio es sutil; con <b>Mucho</b> se nota clarísimo.',
        },
        {
          id: 'd.ver',
          objetivo: '.nv-parametro--dato .nv-parametro__cuanto .nv-boton',
          titulo: '◔ Ver: cómo queda en tu pieza',
          texto:
            'Muestra una línea sobre toda la pieza, escena por escena (cada una con el color de su emoción): <b>arriba es «más»</b> y <b>abajo «menos»</b>. Cambien Poco, Algo o Mucho y la línea se mueve al instante. Toquen otra vez para esconderla.',
          detalle:
            'No suena nada: la línea se calcula con lo que ya armaron (texto, emociones, celdas y tempo). Lo que depende de lo que suena, como la voz o los golpes, es una aproximación.',
        },
        {
          id: 'd.mano',
          objetivo: '.nv-parametro__mano',
          titulo: 'Sin dato, lo pones a mano',
          texto:
            'Si una fila no tiene dato, esta barra la fija. Los golpes y la melodía «a mano» se ponen en su <b>Pad</b>.',
        },
        {
          id: 'd.archivos',
          objetivo: '.nv-subir',
          titulo: 'Datos de sus archivos',
          texto:
            'Suban <b>un sonido o una imagen</b> para sacarle datos: de un sonido, su ritmo; de una imagen, su luz, sus colores, su detalle y sus <b>bits</b> (la foto en casillas encendidas o apagadas, una por paso). La foto de la escena ya está en la lista, sin subir nada. Aparece como un dato más en la lista de cada fila.',
          detalle:
            'No se usa el sonido ni la foto en sí: se convierten en números. Una foto de las lomas puede dibujar la forma de la melodía; el audio de un bus puede marcar el ritmo del brillo.',
          final: 'A conectar datos',
        },
      ];
    default:
      return [];
  }
}
