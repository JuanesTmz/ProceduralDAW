/**
 * Lo que dice la guía en cada pantalla.
 *
 * Cada pantalla tiene su recorrido corto. Arranca solo la primera vez que
 * se entra y se repite con el botón «Guía». Un paso señala un elemento con
 * `objetivo` (un selector CSS); si ese elemento no está en pantalla, el paso
 * se salta. El texto va de tú a tú, corto; lo largo va en `detalle`, que
 * solo se abre si el estudiante lo pide.
 *
 * Los textos empujan hacia lo que pide el reto: la historia primero, la
 * música que sigue el arco por reglas, el material propio y el visual que
 * acompaña.
 */
import type { Track } from '../guia/pasos';

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

export type Pantalla = 'historia' | 'voz' | 'escenas' | 'escena-musica' | 'escena-visual' | 'funcion';

export function pasosDe(pantalla: Pantalla, track: Track | null): PasoTour[] {
  const ia = track === 'ia';
  switch (pantalla) {
    case 'historia':
      return [
        {
          id: 'h.bienvenida',
          seccion: 'BIENVENIDA',
          titulo: 'Van a contar Medellín',
          texto:
            'En SONORA arman una pieza de <b>narrativa musical</b>: un monólogo de unas 100 palabras, dicho con su voz, con música y visual que lo acompañan. <b>Todo gira alrededor de la historia.</b>',
          detalle:
            'La música no es una canción aparte: está al servicio del relato. Se genera por reglas y cambia cuando la historia cambia. El visual reacciona al sonido. Al final, lo que se califica con más peso es que el relato valga la pena y se cuente con fuerza.',
        },
        {
          id: 'h.pasos',
          objetivo: '.nv-pasos',
          seccion: 'EL CAMINO',
          titulo: 'Cuatro pasos, en orden',
          texto:
            '<b>Historia</b> (escribir), <b>Voz</b> (grabar), <b>Escenas</b> (música e imagen de cada parte) y <b>Función</b> (verla entera y exportarla). Pueden volver a cualquiera cuando quieran.',
        },
        {
          id: 'h.medidor',
          objetivo: '.nv-medidor',
          seccion: 'EL TIEMPO',
          titulo: 'Máximo 2:30',
          texto: 'Aquí ven cuánto dura la pieza. La voz pone el tiempo: si se pasan, recorten el texto.',
        },
        {
          id: 'h.preguntas',
          objetivo: '.nv-historia__preguntas',
          seccion: 'PASO 1',
          titulo: 'Primero, qué van a contar',
          texto:
            'Una persona, una esquina, un recuerdo. Y respondan <b>por qué es de Medellín</b>: qué tiene que solo se entiende aquí.',
          detalle:
            'Esta respuesta la van a necesitar en la presentación: el jurado mira que el tema sea reconociblemente de Medellín y que ustedes sepan explicar por qué.',
        },
        {
          id: 'h.monologo',
          objetivo: '.nv-historia__texto',
          titulo: 'El monólogo',
          texto:
            'Unas <b>100 palabras</b>, pensadas para <b>decirlas, no cantarlas</b>. Es el guion y el centro de todo. Si quieren ver cómo se ve uno, usen «Usar un ejemplo».',
        },
        {
          id: 'h.partir',
          objetivo: '.nv-partir',
          seccion: 'EL ARCO',
          titulo: 'Pártanlo en escenas',
          texto:
            'Cada color es una escena. <b>Arrastren los límites</b> para decidir dónde empieza cada una, y usen − / + para tener más o menos.',
          detalle:
            'Partan donde la historia cambia: un giro, una sorpresa, un cambio de ánimo. Cada escena va a tener su emoción, y la música y el visual cambian con ella. Ese es el arco de su pieza.',
          final: 'A escribir',
        },
      ];
    case 'voz':
      return [
        {
          id: 'v.modo',
          objetivo: '[data-tour="modo-voz"]',
          seccion: 'PASO 2',
          titulo: 'Graben la voz',
          texto:
            'Pueden grabar <b>escena por escena</b> o <b>todo de corrido</b> en una sola toma. Escojan lo que les quede más cómodo.',
          detalle:
            'De corrido suena más natural; después la app reparte la grabación entre las escenas y ustedes corrigen los cortes arrastrando. Por escena es más fácil repetir solo la parte que salió mal.',
        },
        {
          id: 'v.apuntador',
          objetivo: '.nv-apuntador',
          titulo: 'Lean desde aquí',
          texto:
            'El texto aparece grande para leerlo mientras graban. Busquen un lugar callado y hablen cerca del micrófono.',
          detalle:
            'La voz es la columna de la pieza: todo lo demás se acomoda a ella. Que el tono acompañe la historia: no es leer, es contar.',
        },
        {
          id: 'v.grabar',
          objetivo: '.nv-apuntador__control',
          titulo: 'Grabar y escuchar',
          texto: 'Toquen el botón rojo para grabar y otra vez para parar. Escúchenla; si no les gusta, la repiten.',
          final: 'A grabar',
        },
      ];
    case 'escenas':
      return [
        {
          id: 'e.tarjetas',
          objetivo: '.nv-tarjetas',
          seccion: 'PASO 3',
          titulo: 'Sus escenas',
          texto:
            '<b>Toquen una para entrar</b> y darle música e imagen. Arrástrenlas para cambiarlas de orden.',
        },
        {
          id: 'e.general',
          objetivo: '.nv-tarjeta-general',
          titulo: 'General: el sonido de toda la pieza',
          texto:
            'Empiecen por aquí: elijan un punto de partida y los sonidos. Después, dentro de cada escena, cambian solo lo que esa escena necesite.',
        },
        {
          id: 'e.respiro',
          objetivo: '[data-tour="respiro"]',
          titulo: 'Respiros (si quieren)',
          texto: 'Un respiro es un momento sin voz donde solo cuenta la música. Es opcional: pónganlo donde la historia pida una pausa.',
        },
        {
          id: 'e.pieza',
          objetivo: '.nv-pieza',
          titulo: 'Su pieza de un vistazo',
          texto:
            'La voz, la música y la imagen de cada escena, en el tiempo. Denle <b>Escuchar</b> arriba para oírla entera y ver por dónde va.',
          final: 'Entrar a una escena',
        },
      ];
    case 'escena-musica':
      return [
        {
          id: 'm.riel',
          objetivo: '.nv-riel',
          seccion: 'DENTRO DE UNA ESCENA',
          titulo: 'Todas sus escenas, siempre a mano',
          texto: 'Salten de una escena a otra desde aquí, sin volver atrás. Las marcas ♫ y ◐ dicen cuáles ya tocaron.',
        },
        {
          id: 'm.sentir',
          objetivo: '.nv-sentir',
          titulo: '¿Qué se siente?',
          texto:
            'La <b>emoción</b> y la <b>fuerza</b> de la escena mueven la música y la imagen a la vez: cambian la escala, el tempo, cuántas capas suenan, los colores.',
          detalle:
            'Esto es lo que hace que la música siga el arco de la historia: la misma música general suena distinta en una escena de calma que en una de tensión.',
        },
        {
          id: 'm.barra',
          objetivo: '.nv-barra-escena',
          titulo: 'La frase y su tiempo',
          texto:
            '▶ hace sonar <b>solo esta escena</b>. Toquen o arrastren la barra para escuchar desde otro punto. Toquen una <b>palabra</b> para pegarle un sonido o un silencio justo cuando se dice.',
        },
        {
          id: 'm.pestanas',
          objetivo: '.nv-selector--pestanas',
          titulo: 'Música y Visuales',
          texto: 'Cada escena tiene dos partes. Ahora están en Música; la imagen se arma en Visuales.',
        },
        {
          id: 'm.sonidos',
          objetivo: '[data-tour="sonidos"]',
          seccion: 'LOS SONIDOS',
          titulo: 'Con qué suena cada pista',
          texto:
            'Aquí está la biblioteca y sus efectos. Toquen ▶ para oír un sonido y su nombre para usarlo. También pueden <b>grabar un efecto</b> o subir un archivo.',
          detalle:
            'Graben sonidos de su tema: una reja, un pito, la gente en la calle. Usar material propio con intención suma en la calificación.',
        },
        ...(ia
          ? [
              {
                id: 'm.lista-ia',
                objetivo: '.nv-capas',
                seccion: 'LAB IA',
                titulo: 'Sus sonidos',
                texto: 'Cada fila es un sonido de la pieza. El interruptor lo calla solo en esta escena.',
              },
              {
                id: 'm.pad',
                objetivo: '.nv-capa--ia .nv-boton--ia',
                titulo: 'El pad: la regla de cada sonido',
                texto:
                  'Abre una ventana con las 16 casillas y el cuadro: <b>a la derecha más golpes, hacia arriba más azar</b>. Ustedes no dibujan los golpes: ponen la regla y la máquina los reparte.',
                detalle:
                  'Esto es lo procedural: la música se genera por reglas y respira con el azar, así no es un loop fijo. Si mueven el pad dentro de una escena, el cambio vale solo para ella.',
              },
              {
                id: 'm.datos',
                objetivo: '[data-tour="datos"]',
                titulo: 'Datos: que se mueva solo',
                texto:
                  'Elijan qué parámetros se mueven solos con un dato: la emoción, la voz, la fuerza o un archivo que suban. Lo demás lo ponen a mano.',
                detalle:
                  'Ejemplo: «Golpes del bombo · lo mueve La fuerza de la escena». En las escenas fuertes el bombo se llena; en las suaves, casi desaparece. Así la música sigue la historia sin que la editen escena por escena.',
              },
            ]
          : [
              {
                id: 'm.capas',
                objetivo: '.nv-capas',
                seccion: 'LAB MÚSICA URBANA',
                titulo: 'Las capas de la escena',
                texto:
                  'Cambien el sonido de cada capa y cuánta fuerza tiene en esta escena. El interruptor <b>Máquina</b> hace que la capa improvise sobre lo que dibujaron.',
                detalle:
                  'Incluyan al menos un elemento generativo: con Máquina encendida, la capa quita y agrega golpes sola, y la música no se repite igual.',
              },
              {
                id: 'm.vivo',
                objetivo: '.nv-musica__lado',
                titulo: 'Tocar en vivo',
                texto: 'Muevan el dedo en el cuadro mientras suena la escena. Si graban, lo que toquen queda guardado y suena igual cada vez.',
              },
            ]),
        {
          id: 'm.editar',
          objetivo: '[data-tour="editar"]',
          titulo: 'Edición fina',
          texto: 'Si quieren poner golpes o notas exactas a mano, aquí están la grilla de golpes y la matriz de melodía.',
          final: 'A sonar',
        },
      ];
    case 'escena-visual':
      return [
        {
          id: 'i.vista',
          objetivo: '.nv-imagen__vista .nv-escenario, .nv-imagen__vista > :first-child',
          seccion: 'VISUALES',
          titulo: 'El visual de la escena',
          texto: 'Se dibuja solo y <b>reacciona al sonido</b>. Denle ▶ para verlo moverse con la música y la voz.',
        },
        {
          id: 'i.estilos',
          objetivo: '.nv-estilos',
          titulo: 'Estilo y paleta',
          texto: 'Los mismos estilos de GenArt. El estilo y la paleta valen para toda la pieza; la emoción de cada escena tiñe los colores.',
        },
        {
          id: 'i.foto',
          objetivo: '.nv-foto',
          titulo: 'Su foto como material',
          texto: 'Suban una foto del tema: el visual la usa como material. Puede ser una por escena.',
          detalle: 'El visual tiene que acompañar la historia, no ser un preset suelto. Una foto del lugar o del personaje lo ata al relato.',
        },
        ...(ia
          ? [
              {
                id: 'i.datos',
                objetivo: '.nv-parametros',
                seccion: 'LAB IA',
                titulo: 'Datos del visual',
                texto: 'Igual que en la música: elijan qué mandos del visual se mueven solos con un dato y cuáles ponen a mano.',
                final: 'A pintar',
              },
            ]
          : [
              {
                id: 'i.jugar',
                objetivo: '.nv-jugar',
                seccion: 'LAB MÚSICA URBANA',
                titulo: 'Tocar el visual',
                texto: 'Muevan el cuadro y toquen los golpes (destello, zoom…) mientras suena. Con «Grabar mientras suena» queda guardado en la escena.',
                final: 'A pintar',
              },
            ]),
      ];
    case 'funcion':
      return [
        {
          id: 'f.escenario',
          objetivo: '.nv-escenario',
          seccion: 'PASO 4',
          titulo: 'La función',
          texto: 'Así se ve su pieza completa: el visual, la voz y el texto apareciendo mientras se dice.',
        },
        {
          id: 'f.musica',
          objetivo: '.nv-pie .nv-selector',
          titulo: 'Con y sin música',
          texto: 'Escúchenla sin música y con música. ¿Qué le aporta el sonido a la historia?',
          detalle: 'Esa pregunta es parte de la reflexión que les van a pedir: si la música y el visual sirvieron al relato, y en qué se parece generar con reglas a cómo genera una IA.',
        },
        {
          id: 'f.exportar',
          objetivo: '[data-tour="exportar"]',
          titulo: 'Exportar el video',
          texto: 'La pieza suena entera una vez y sale un video para presentar o compartir. No cambien de pantalla mientras graba.',
          final: '¡A presentar!',
        },
      ];
  }
}
