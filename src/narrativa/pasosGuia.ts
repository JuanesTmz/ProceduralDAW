// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Lo que dice la guía en cada pantalla y en cada ventana.
 *
 * Cada lugar tiene su recorrido. Ya no arranca solo (desde nov. 2026 lo que se abre solo es el
 * tutorial en video): se pide desde el «?». Antes arrancaba solo la primera vez que se entra
 * y se repite desde el botón «?». Un paso señala un elemento con
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
    // ------------------------------------------------------------ Historia
    case 'historia':
      return [
        {
          id: 'h.bienvenida',
          seccion: 'BIENVENIDA',
          titulo: 'Van a contar Medellín',
          texto:
            'En SONORA arman una pieza de <b>narrativa sonora</b>: un monólogo corto, dicho con su voz, con <b>música</b> y <b>visual</b> que lo acompañan. No es hacer una canción: es <b>contar una historia</b> y que el sonido y la imagen la ayuden a contarse.',
          detalle:
            'La música no va por su lado: se genera con reglas y cambia cuando la historia cambia. El visual se mueve con el sonido. Lo que más pesa al final es que la historia valga la pena y se cuente con fuerza. Por eso todo empieza aquí, escribiendo.',
        },
        {
          id: 'h.pasos',
          objetivo: '.nv-pasos',
          seccion: 'EL CAMINO',
          titulo: 'Cuatro pasos, en este orden',
          texto:
            '<b>1 Historia:</b> escriben y parten el texto. <b>2 Voz:</b> lo graban. <b>3 Escenas:</b> le dan música e imagen a cada parte. <b>4 Función:</b> la ven entera y la exportan. Pueden volver a cualquier paso cuando quieran: nada se pierde.',
        },
        {
          id: 'h.medidor',
          objetivo: '.nv-medidor',
          seccion: 'EL TIEMPO',
          titulo: 'Máximo 2 minutos y medio',
          texto:
            'Esta barra dice cuánto dura la pieza. <b>La voz pone el tiempo</b>: cada escena dura lo que tarda en decirse. Si la barra se pone roja, se pasaron: recorten el texto o hablen un poco más rápido.',
        },
        {
          id: 'h.escuchar',
          objetivo: '.nv-barra .nv-boton--primario',
          titulo: 'Escuchar en cualquier momento',
          texto:
            'Este botón (o la <b>barra espaciadora</b>) hace sonar la pieza completa. Úsenlo seguido: escuchar es la mejor forma de saber qué falta.',
        },
        {
          id: 'h.ayuda',
          objetivo: '.nv-barra .nv-ayuda',
          titulo: 'Si se pierden: «?»',
          texto:
            'Cada pantalla y cada ventana tiene su <b>?</b>. Ahí están los <b>tutoriales en video</b> de esa parte y este mismo recorrido.',
        },
        {
          id: 'h.mezcla',
          objetivo: '.nv-boton-mezcla',
          titulo: 'Mezcla',
          texto:
            'Aquí suben o bajan el volumen de cada sonido y de la <b>voz</b>, desde cualquier paso. Al lado, <b>✓ Se guarda solo</b>: no hay que guardar nada, todo se va guardando.',
        },
        {
          id: 'h.estaciones',
          objetivo: '.nv-estaciones',
          seccion: 'PASO 1 · LAS ESTACIONES',
          titulo: 'Lo que encontraron en cada estación',
          texto:
            'Una casilla por cada estación del SmartFest. Anoten lo que vieron, oyeron o sintieron en cada una: una frase basta. Es la materia prima de su historia.',
          detalle:
            'No tienen que usarlo todo. Busquen lo que se repite o lo que más los sorprendió: ahí suele estar la historia que solo se entiende en Medellín.',
        },
        {
          id: 'h.monologo',
          objetivo: '.nv-historia__texto',
          seccion: 'PASO 1 · EL TEXTO',
          titulo: 'El monólogo final: unas 100 palabras',
          texto:
            'Con lo de las estaciones escriban una sola historia, para <b>decirla en voz alta, no para cantarla</b>. El contador de arriba les dice si va bien de largo. ¿Quieren ver cómo se ve una? Toquen «Usar un ejemplo».',
          detalle:
            'Inspírense en «Medellín en 100 palabras»: textos cortos que cuentan mucho. Funciona mejor una historia con un cambio adentro (algo pasa, algo se rompe, alguien llega) que una descripción quieta: ese cambio es lo que la música va a seguir.',
        },
        {
          id: 'h.partir',
          objetivo: '.nv-partir',
          seccion: 'PASO 1 · EL ARCO',
          titulo: 'Partan el texto en escenas',
          texto:
            'Cada color es una <b>escena</b>. Las rayitas entre colores son los <b>límites</b>: <b>arrástrenlos</b> palabra por palabra para decidir dónde empieza y dónde termina cada escena.',
        },
        {
          id: 'h.contador',
          objetivo: '.nv-contador',
          titulo: '¿Cuántas escenas?',
          texto:
            'Con <b>+</b> agregan una escena (parte la más larga donde termina una frase) y con <b>−</b> juntan las dos últimas. Entre 3 y 5 escenas suele funcionar bien para 100 palabras.',
          detalle:
            'Partan donde la historia <b>cambia</b>: un giro, una sorpresa, un cambio de ánimo. Cada escena va a tener su propia emoción, y la música y el visual cambian con ella. Esa secuencia de emociones es el <b>arco</b> de su pieza: el mapa de cómo cambia todo.',
          final: 'A escribir',
        },
      ];

    // ------------------------------------------------------------ Voz
    case 'voz':
      return [
        {
          id: 'v.escenas',
          objetivo: '.nv-pasos-voz',
          seccion: 'PASO 2 · LA VOZ',
          titulo: 'Una escena a la vez',
          texto:
            'Graban cada escena aparte, una tras otra; las grabadas llevan ✓. Si después mueven un corte en Historia, las palabras se mueven con él: esa escena se marca con <b>!</b> y hay que volver a grabarla.',
        },
        {
          id: 'v.apuntador',
          objetivo: '.nv-apuntador',
          titulo: 'Lean desde aquí',
          texto:
            'El texto aparece en grande para leerlo mientras graban. Busquen un rincón callado, hablen cerca del micrófono y <b>cuenten</b>, no lean: el tono tiene que acompañar lo que pasa en la historia.',
          detalle:
            'La voz es la columna de la pieza: la música baja sola cuando ustedes hablan para que siempre se entienda, y todo el resto se acomoda a su tiempo. Una pausa bien puesta vale más que hablar rápido.',
        },
        {
          id: 'v.grabar',
          objetivo: '.nv-apuntador__control',
          titulo: 'Grabar, escuchar, repetir',
          texto:
            'El <b>botón rojo</b> empieza a grabar; tóquenlo otra vez para parar. Escuchen cómo quedó: si no les gusta, «Grabar de nuevo». Sin voz grabada la app calcula cuánto tardaría en decirse, pero la pieza final necesita su voz.',
          final: 'A grabar',
        },
      ];

    // ------------------------------------------------------------ Escenas
    case 'escenas':
      return [
        {
          id: 'e.tarjetas',
          objetivo: '.nv-tarjetas',
          seccion: 'PASO 3 · LAS ESCENAS',
          titulo: 'Sus escenas, en orden',
          texto:
            'Cada tarjeta es una escena: su número, cuánto dura, su emoción y su fuerza. <b>Toquen una para entrar</b> y darle música e imagen.',
        },
        {
          id: 'e.mover',
          objetivo: '.nv-tarjeta-escena',
          titulo: 'Cambiar el orden arrastrando',
          texto:
            '<b>Mantengan presionada una tarjeta y arrástrenla</b> a otro lugar. Las demás se corren solas. Ojo: mover una escena también mueve su texto en el monólogo.',
          detalle:
            'Sirve para probar otra forma de contar: empezar por el final, guardar la sorpresa para después. Si no les convence, la arrastran de vuelta.',
        },
        {
          id: 'e.general',
          objetivo: '.nv-tarjeta-general',
          titulo: 'General: el sonido de toda la pieza',
          texto:
            'Antes de entrar a las escenas, empiecen por aquí. En General eligen un <b>punto de partida</b>, el tempo y los sonidos que se van a oír en toda la pieza. Después, en cada escena, cambian solo lo que esa escena necesite.',
        },
        {
          id: 'e.respiro',
          objetivo: '[data-tour="respiro"]',
          seccion: 'LOS RESPIROS',
          titulo: '¿Qué es un respiro?',
          texto:
            'Un respiro es un momento <b>sin voz</b> donde solo suena la música (y se ve el visual). Es como una pausa en la historia para que lo que acaba de pasar se sienta. <b>Son opcionales</b>: si su historia no los pide, no los usen.',
        },
        {
          id: 'e.respiro-donde',
          objetivo: '[data-tour="respiro"]',
          titulo: 'Al inicio, al final o en el medio',
          texto:
            '<b>Al inicio:</b> la música abre y prepara el ambiente antes de que hablen. <b>En el medio:</b> un silencio de voz después de un golpe fuerte de la historia. <b>Al final:</b> la música cierra y deja la última frase sonando en la cabeza.',
          detalle:
            'Este botón agrega un respiro y los lleva a editarlo. Pueden tener varios. Cada respiro dura entre 2 y 20 segundos (y cuenta en los 2:30).',
        },
        {
          id: 'e.respiro-mover',
          objetivo: '.nv-tarjeta-respiro',
          titulo: 'Mover y quitar respiros',
          texto:
            'Un respiro es una tarjeta más: <b>arrástrenlo</b> entre las escenas para ponerlo donde quieran. La <b>×</b> de la esquina lo quita. Al tocarlo entran a cambiar cuánto dura y su emoción.',
        },
        {
          id: 'e.pieza',
          objetivo: '.nv-pieza',
          seccion: 'TU PIEZA',
          titulo: 'Su pieza de un vistazo',
          texto:
            'Tres filas en el tiempo: la <b>voz</b> de cada escena, la <b>música</b> (más alta = más energía) y la <b>imagen</b>. Si una escena dice «falta», todavía no tiene voz grabada. Al darle Escuchar, una línea blanca muestra por dónde va.',
          final: 'Entrar a una escena',
        },
      ];

    // ------------------------------------------------------------ Escena · Música
    case 'escena-musica':
      return [
        {
          id: 'm.riel',
          objetivo: '.nv-riel',
          seccion: 'DENTRO DE UNA ESCENA',
          titulo: 'Todas sus escenas, siempre a mano',
          texto:
            'Desde esta columna saltan de una escena a otra sin volver atrás. La que está abierta se resalta, un puntito late en la que está sonando, y las marcas <b>♫</b> y <b>◐</b> dicen a cuáles ya les cambiaron música o imagen.',
        },
        {
          id: 'm.bases',
          objetivo: '.nv-bases',
          seccion: 'GENERAL',
          titulo: 'Elijan una base',
          texto:
            'Diez bases para arrancar: reggaetón, trap, bachata, salsa, cumbia… Cada una trae su batería, su bajo y sus acordes. Toquen una, escúchenla y quédense con la que más vaya con su historia. Después la cambian tocando las casillas.',
          detalle:
            'Cambiar de base reemplaza los golpes y la melodía, pero conserva las capas con sonidos grabados por ustedes. La <b>Velocidad</b> es el tempo de toda la pieza; cada emoción la acelera o la frena un poco.',
        },
        {
          id: 'm.sentir',
          objetivo: '.nv-sentir',
          titulo: '¿Qué se siente en esta escena?',
          texto:
            'Elijan la <b>emoción</b> (calma, alegría, tensión, nostalgia, misterio, euforia) y la <b>intensidad</b> (suave, media, fuerte). Con eso la música cambia sola: la escala, la velocidad, cuántos sonidos entran. Y el visual cambia de colores.',
          detalle:
            'Esto es lo que hace que la música siga el arco: los mismos sonidos de General suenan distinto en una escena de calma que en una de tensión. En un respiro, aquí mismo cambian cuánto dura y lo mueven con ← →.',
        },
        {
          id: 'm.barra',
          objetivo: '.nv-barra-escena__fila',
          seccion: 'LA BARRA DE LA ESCENA',
          titulo: 'Escuchar solo esta escena',
          texto:
            '<b>▶</b> hace sonar <b>solo esta escena</b>, no toda la pieza. La barra muestra la onda de su voz y una línea que avanza. <b>Toquen o arrastren la barra</b> para escuchar desde otro punto.',
        },
        {
          id: 'm.cajitas',
          objetivo: '.nv-barra-escena .nv-cajitas',
          titulo: 'Cajitas: algo justo en una palabra',
          texto:
            '<b>Toquen una palabra</b> de la frase y elijan: <b>un sonido</b> (que suena justo cuando la dicen) o <b>silencio</b> (la música se calla un instante en esa palabra). La palabra queda marcada y aparece una rayita en la barra.',
          detalle:
            'Úsenlas para subrayar: un pito cuando dicen «bus», un silencio antes de la frase más dura. Para quitar una, toquen la palabra otra vez → «Quitar la cajita», o la × en la lista de abajo.',
        },
        {
          id: 'm.pestanas',
          objetivo: '.nv-selector--pestanas',
          titulo: 'Música y Visuales',
          texto: 'Cada escena tiene dos partes. Están en <b>Música</b>; la imagen de la escena se arma en <b>Visuales</b>.',
        },
        {
          id: 'm.herramientas',
          objetivo: '[data-tour="sonidos"]',
          seccion: 'LAS HERRAMIENTAS',
          titulo: 'Sonidos',
          texto:
            'Abre la ventana donde eligen <b>con qué suena cada capa</b>: toquen un sonido para oírlo y luego <b>✓ Guardar sonido</b>. Ahí también graban sus propios efectos. Con <b>+ Añadir capa</b> suman un sonido nuevo a la música.',
        },
        {
          id: 'm.capas',
          objetivo: '.nv-celdas',
          seccion: 'LAS CAPAS',
          titulo: 'Las capas y sus casillas',
          texto:
            'Cada fila es una capa de la música y cada casilla, un momento de la vuelta. <b>Toquen una casilla</b> para poner o quitar un golpe (o arrastren para pintar varias). <b>Toquen el nombre</b> para cambiar el sonido. La fila de la <b>Melodía</b> abre su matriz de notas.',
          detalle:
            'Dentro de una escena, <b>Suena / Callada</b> enciende o calla una capa solo ahí, y los golpes que cambien valen solo para esa escena. Qué tan fuerte suena todo lo decide la <b>Intensidad</b>, arriba, junto a la emoción.',
        },
        {
          id: 'm.solo',
          objetivo: '.nv-solo',
          titulo: 'Oír una capa sola',
          texto:
            'El <b>▶</b> de cada capa la toca <b>sola</b>, sin las demás ni la voz. Se vuelve <b>❚❚</b> mientras suena: tóquenlo otra vez para pausar. Si tocan otra, o la escena entera, la anterior se para.',
        },
        {
          id: 'm.agregar',
          objetivo: '[data-tour="nueva-pista"]',
          titulo: 'Añadir una capa',
          texto:
            'Suma un sonido más a la música: eligen el sonido, <b>Guardar sonido</b>, y la capa nueva aparece abajo, vacía. <b>Toquen sus casillas</b> para que suene.',
          final: 'A sonar',
        },
      ];

    // ------------------------------------------------------------ Escena · Visuales
    case 'escena-visual':
      return [
        {
          id: 'i.vista',
          objetivo: '.nv-imagen__vista > :first-child',
          seccion: 'VISUALES',
          titulo: 'La obra de la escena',
          texto:
            'Aquí se ve la imagen de la escena. Denle <b>▶ Escuchar esta escena</b> y miren cómo se mueve con lo que le pongan.',
        },
        {
          id: 'i.estilos',
          objetivo: '.nv-cajitas__estilos',
          titulo: 'El estilo',
          texto: 'Siete formas de pintar. Toquen una para probarla; <b>✦</b> la deja en un punto al azar.',
        },
        {
          id: 'i.fotos',
          objetivo: '.nv-fotos',
          titulo: 'Sus fotos',
          texto:
            'Suban <b>una o varias fotos</b>. Cada una trae sus cajitas (su luz, su color, sus bordes) para mover la imagen. Toquen una foto para usarla de <b>fondo</b> en la obra.',
        },
        {
          id: 'i.cajas',
          objetivo: '.nv-cajas',
          seccion: 'MOVER LA IMAGEN',
          titulo: 'Cajas y cajitas',
          texto:
            'Cada caja es algo de la imagen (los colores, el brillo, el zoom, el giro y los mandos del estilo). <b>Arrastren una cajita</b> de abajo a una caja, o tóquenla y luego toquen la caja: esa parte de la imagen se mueve con ese dato.',
          detalle:
            'La barrita de la caja muestra el dato en vivo. «poco / algo / mucho» dice cuánto lo mueve: tóquenlo para cambiarlo. La × quita la cajita. Una caja vacía se ajusta a mano con su deslizador.',
        },
        {
          id: 'i.golpes',
          objetivo: '.nv-selector--lleno',
          seccion: 'GOLPES',
          titulo: 'Golpes',
          texto:
            'En <b>Golpes</b> está la misma vista de celdas de la música: cada fila es un efecto (destello, zoom, giro…) y cada casilla un momento de la vuelta. <b>Toquen una casilla</b> y la imagen da ese golpe ahí, al ritmo de la música. El ▶ de cada fila lo prueba.',
          final: 'A pintar',
        },
      ];

    // ------------------------------------------------------------ Función
    case 'funcion':
      return [
        {
          id: 'f.escenario',
          objetivo: '.nv-escenario',
          seccion: 'PASO 4 · LA FUNCIÓN',
          titulo: 'Su pieza completa',
          texto:
            'Así se va a ver en la presentación: el visual de cada escena, su voz, la música y el texto apareciendo mientras se dice. Denle <b>Ver la pieza</b>.',
        },
        {
          id: 'f.progreso',
          objetivo: '.nv-progreso',
          titulo: 'Por dónde va',
          texto: 'Cada tramo es una escena, con su color de emoción. Se van llenando mientras suena.',
        },
        {
          id: 'f.musica',
          objetivo: '.nv-pie .nv-selector',
          titulo: 'Con y sin música',
          texto:
            'Escúchenla <b>sin música</b> (solo la voz) y después <b>con música</b>. ¿Qué cambia? ¿La música ayuda a contar o distrae?',
          detalle:
            'Esa pregunta es parte de la reflexión que les van a pedir: si la música y el visual sirvieron a la historia, qué hizo el azar, y en qué se parece generar con reglas a cómo genera una IA. Anoten lo que noten.',
        },
        {
          id: 'f.exportar',
          objetivo: '[data-tour="exportar"]',
          titulo: 'Exportar el video',
          texto:
            'La pieza suena entera una vez y se graba como video (.webm), que se descarga solo. <b>No cambien de pantalla</b> mientras graba. Ese video es su entrega.',
          final: '¡A presentar!',
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
