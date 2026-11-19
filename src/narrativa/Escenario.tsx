// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * El escenario: el visual generativo de la pieza, con el texto encima.
 *
 * Aquí vive el director del visual. En cada cuadro mira qué escena suena
 * y decide el algoritmo, la paleta, la foto que hace de material y el
 * valor de cada mando. Dos cosas lo mueven:
 *  - Las cajitas asignadas (conexionesVisual): cada mando del estilo puede
 *    llevar un dato —un instrumento, la voz, la emoción, la luz o el color de
 *    una foto— y se mueve con él. La caja «Colores» cambia la paleta.
 *  - Los golpes de la imagen, en celdas: en cada paso de la vuelta, los
 *    efectos que tengan su casilla encendida (estado/efectos.ts).
 *  - Brillo, zoom, giro… de la obra entera, a mano o con una cajita.
 *
 * La foto no se pega encima: se lee como datos (CampoImagen) y el
 * algoritmo la usa como relieve, corriente o densidad.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import { duracionVoz, intensidadDeEscena, recorrido } from '../estado/escenas';
import { paletaDeEmocion, VALOR_REACCION } from '../estado/imagen';
import { useEnDemo } from '../componentes/demo';
import { estiloDeObra, pasosEfectosDe, PARAMETROS_OBRA } from '../estado/efectos';
import { ORDEN_GOLPES } from '../estado/imagen';
import { valorDato } from '../estado/datos';
import { algoritmoDe, valoresPorDefecto } from '../visual/algoritmos';
import { campoDe } from '../visual/imagenDatos';
import { motorVisual } from '../visual/motorVisual';
import { paletaDe } from '../visual/paletas';
import { enVivo } from '../visual/enVivo';
import type { Escena, GolpeVisual } from '../estado/tipos';

interface Props {
  /** Qué escena mostrar mientras no suena nada (vista previa). */
  escenaFija?: string;
  texto?: boolean;
}

export function Escenario(props: Props) {
  // Dentro de un tutorial no se arma el visual de verdad: hay uno solo y es de la app.
  const demo = useEnDemo();
  if (demo) return <div className="nv-obra nv-obra--demo" />;
  return <EscenarioVivo {...props} />;
}

function EscenarioVivo({ escenaFija, texto = true }: Props) {
  const { proyecto } = useProyecto();
  const datos = useRef(proyecto);
  datos.current = proyecto;
  const fija = useRef(escenaFija);
  fija.current = escenaFija;

  const lienzo = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const destello = useRef<HTMLDivElement>(null);
  const [frase, setFrase] = useState<{ palabras: string[]; reveladas: number; id: string }>({
    palabras: [],
    reveladas: 0,
    id: '',
  });

  // Golpes visuales: se ven como efectos del marco, no del algoritmo.
  const golpear = (golpe: GolpeVisual, fuerza = 1) => {
    const m = marco.current;
    const d = destello.current;
    if (!m || !d) return;
    enVivo.marcar(golpe, fuerza);
    // Crece, acelera y se retuerce no mueven el marco: empujan los mandos (más abajo).
    if (golpe === 'crece' || golpe === 'acelera' || golpe === 'retuerce') return;
    m.style.setProperty('--f', String(fuerza));
    const clase = `nv-golpe--${golpe}`;
    if (golpe === 'destello' || golpe === 'corte') {
      d.classList.remove('nv-destello--blanco', 'nv-destello--negro');
      void d.offsetWidth;
      d.classList.add(golpe === 'destello' ? 'nv-destello--blanco' : 'nv-destello--negro');
      return;
    }
    m.classList.remove(clase);
    void m.offsetWidth;
    m.classList.add(clase);
  };

  useEffect(() => enVivo.alDisparar(golpear), []);

  // En cada paso de la vuelta, los golpes de la imagen que tengan su casilla encendida.
  useEffect(
    () =>
      motorAudio.alCambiarPaso((paso) => {
        if (paso < 0) return;
        const p = datos.current;
        const escena = motorAudio.estaSonando ? recorrido(p)[motorAudio.seccionActual] : undefined;
        const pasos = pasosEfectosDe(p, escena);
        for (const g of ORDEN_GOLPES) if (pasos[g]?.[paso]) golpear(g);
      }),
    [],
  );

  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    motorVisual.iniciar(nodo, () => undefined);
    let cuadro = 0;
    const toque: { x: number; y: number } | null = null;
    let reveladasPrevias = 0;
    let escenaPrevia = '';
    let transformPuesto = '';
    let filtroPuesto = '';

    const paso = () => {
      cuadro = requestAnimationFrame(paso);
      const p = datos.current;
      const lista = recorrido(p);
      const sonando = motorAudio.estaSonando;
      const indice = sonando ? motorAudio.seccionActual : lista.findIndex((e) => e.id === fija.current);
      const escena: Escena | undefined = lista[indice] ?? lista[0];
      const v = p.visual;
      const alg = algoritmoDe(v.algoritmo);
      const parametros = { ...valoresPorDefecto(alg), ...(v.parametros[v.algoritmo] ?? {}) };
      let paleta = v.paletaPropia ?? paletaDe(v.paleta).colores;
      let reaccion = v.reaccion;
      const fraccion = sonando ? motorAudio.fraccionSeccion : 0;

      if (escena) {
        // La energía de la escena acelera o calma la obra.
        const energia = intensidadDeEscena(escena);
        if ('velocidad' in parametros) parametros.velocidad *= 0.55 + 0.9 * energia;

        const contexto = {
          proyecto: p,
          escena,
          sonando,
          fraccion,
          avance: sonando ? motorAudio.progresoPieza : 0,
          vivo: motorAudio.vivo(),
        };
        const obra: Record<string, number> = {};
        for (const x of PARAMETROS_OBRA) obra[x.id] = v.obra?.[x.id] ?? x.neutro;
        for (const c of p.conexionesVisual) {
          if (c.destino.startsWith('obra:')) {
            const id = c.destino.slice(5);
            obra[id] = obra[id] + (valorDato(c.fuente, contexto) - obra[id]) * (c.cantidad / 3);
            continue;
          }
          // La caja «Colores»: la paleta sale de la emoción o de una foto.
          if (c.destino === 'paleta') {
            const [, id] = c.fuente.split(':');
            const archivo = c.fuente.startsWith('archivo:') ? p.archivosDatos.find((a) => a.id === id) : undefined;
            const deLaFoto = c.fuente.startsWith('foto:') ? campoDe(escena.imagenUrl ?? v.imagenUrl)?.colores() : undefined;
            if (archivo?.colores && archivo.colores.length >= 2) paleta = archivo.colores;
            else if (deLaFoto && deLaFoto.length >= 2) paleta = deLaFoto;
            else if (c.fuente === 'emocion') paleta = paletaDeEmocion(escena.emocion);
            continue;
          }
          // Un mando: se mueve hacia donde diga el dato, con la fuerza de la cajita.
          const mando = alg.mandos.find((m) => m.id === c.destino);
          if (!mando) continue;
          const objetivo = mando.min + valorDato(c.fuente, contexto) * (mando.max - mando.min);
          parametros[mando.id] = parametros[mando.id] + (objetivo - parametros[mando.id]) * (c.cantidad / 3);
        }
        reaccion = VALOR_REACCION[escena.reaccion ?? 'bombo'];
        const estilo = estiloDeObra(obra);
        const l = lienzo.current;
        // Solo si cambian algo: un filtro sobre el lienzo, aunque sea neutro, le cuesta
        // a la tablet en cada cuadro, y la calidad automática termina bajando.
        const transform = estilo.escala !== 1 || estilo.giro !== 0 ? estilo.transform : '';
        const filtro = estilo.filtroVideo === 'none' ? '' : estilo.filtroVideo;
        if (l && transform !== transformPuesto) l.style.transform = transformPuesto = transform;
        if (l && filtro !== filtroPuesto) l.style.filter = filtroPuesto = filtro;
        // El video exportado no ve el CSS: se le cuenta cómo va la obra.
        motorVisual.obra = { escala: estilo.escala, giro: estilo.giro, filtro: estilo.filtroVideo };
      }

      // Crece, acelera y se retuerce: un empujón que se apaga solo, sobre los mandos del estilo.
      const edades = enVivo.edades();
      const empujar = (efecto: GolpeVisual, ids: string[], parte: number, maximo = ids.length) => {
        const k = Math.exp(-edades[efecto] * 4) * enVivo.fuerzaDe(efecto);
        if (k < 0.01) return;
        let hechos = 0;
        for (const id of ids) {
          const mando = alg.mandos.find((m) => m.id === id);
          if (!mando || hechos >= maximo) continue;
          hechos++;
          parametros[id] = Math.max(mando.min, Math.min(mando.max, parametros[id] + k * parte * (mando.max - mando.min)));
        }
      };
      empujar('crece', ['tamano'], 0.4);
      empujar('acelera', ['velocidad'], 0.6);
      empujar('retuerce', ['pliegue', 'ondulacion', 'turbulencia', 'remolino', 'complejidad', 'curvas', 'cambio'], 0.5, 2);

      motorVisual.actualizar({
        algoritmo: v.algoritmo,
        parametros,
        paleta,
        alfabeto: v.alfabeto,
        reaccion,
        imagen: campoDe(escena?.imagenUrl ?? v.imagenUrl),
        influenciaImagen: v.influenciaImagen,
        picos: [],
        influenciaDatos: 0,
        movimientoDatos: 0,
        semilla: p.semilla,
        toque,
        texto: escena && !escena.respiro ? escena.texto : '',
      });

      // El texto aparece al ritmo de la voz grabada (o estimada).
      if (!escena || escena.respiro) {
        setFrase((f) => (f.id === 'nada' ? f : { palabras: [], reveladas: 0, id: 'nada' }));
        return;
      }
      const palabras = palabrasDe(escena.texto);
      const voz = duracionVoz(escena);
      const reveladas = sonando
        ? Math.min(palabras.length, Math.ceil((motorAudio.segundosEnSeccion / Math.max(0.5, voz)) * palabras.length))
        : palabras.length;
      // Las cajitas de imagen golpean cuando la voz llega a su palabra.
      if (sonando && escena.id === escenaPrevia && escena.cajitas) {
        for (const c of escena.cajitas) {
          if (c.tipo === 'imagen' && c.golpe && c.palabra >= reveladasPrevias && c.palabra < reveladas) golpear(c.golpe);
        }
      }
      reveladasPrevias = escena.id === escenaPrevia ? reveladas : 0;
      escenaPrevia = escena.id;
      setFrase((f) =>
        f.id === escena.id && f.reveladas === reveladas && f.palabras.length === palabras.length
          ? f
          : { palabras, reveladas, id: escena.id },
      );
    };
    cuadro = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(cuadro);
      motorVisual.detener();
    };
  }, []);

  return (
    <div className="nv-obra" ref={marco}>
      <div className="nv-obra__lienzo" ref={lienzo} />
      <div className="nv-obra__destello" ref={destello} />
      {texto && frase.palabras.length > 0 && (
        <p className="nv-obra__texto">
          {frase.palabras.map((palabra, i) => (
            <span key={i} className={i < frase.reveladas ? 'nv-obra__palabra--dicha' : ''}>
              {palabra}{' '}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
