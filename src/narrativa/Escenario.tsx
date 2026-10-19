/**
 * El escenario: el visual generativo de la pieza, con el texto encima.
 *
 * Aquí vive el director del visual. En cada cuadro mira qué escena suena
 * y decide el algoritmo, la paleta, la foto que hace de material y el
 * valor de cada mando. La emoción y la fuerza de la escena lo mueven en
 * los dos labs; además, en IA mandan las conexiones y en Música Urbana la
 * reacción elegida, el gesto y los golpes tocados en vivo.
 *
 * La foto no se pega encima: se lee como datos (CampoImagen) y el
 * algoritmo la usa como relieve, corriente o densidad.
 */
import { useEffect, useRef, useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import { duracionVoz, intensidadDeEscena, recorrido } from '../estado/escenas';
import { FUERZA_REACCION, paletaDeEmocion, VALOR_REACCION } from '../estado/imagen';
import { valorDato } from '../estado/datos';
import { algoritmoDe, valoresPorDefecto } from '../visual/algoritmos';
import { campoDe } from '../visual/imagenDatos';
import { motorVisual } from '../visual/motorVisual';
import { paletaDe } from '../visual/paletas';
import { enVivo } from '../visual/enVivo';
import type { Escena, GolpeVisual, PuntoGesto } from '../estado/tipos';

interface Props {
  /** Qué escena mostrar mientras no suena nada (vista previa). */
  escenaFija?: string;
  texto?: boolean;
}

function gestoEn(puntos: PuntoGesto[] | undefined, t: number): { x: number; y: number } | null {
  if (!puntos || puntos.length === 0) return null;
  let i = 0;
  while (i < puntos.length - 1 && puntos[i + 1].t <= t) i++;
  const a = puntos[i];
  const b = puntos[i + 1];
  if (!b || b.t === a.t) return a;
  const k = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

export function Escenario({ escenaFija, texto = true }: Props) {
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

  // Música Urbana: cada golpe que se oye dispara los efectos que se le asignaron.
  useEffect(
    () =>
      motorAudio.alGolpe((id) => {
        const p = datos.current;
        if (p.track !== 'musica') return;
        const escena = recorrido(p)[motorAudio.seccionActual];
        for (const r of escena?.reacciones ?? []) {
          if (r.fuente === id || r.fuente === 'todo') golpear(r.efecto, FUERZA_REACCION[r.fuerza]);
        }
      }),
    [],
  );

  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    motorVisual.iniciar(nodo, () => undefined);
    let cuadro = 0;
    let toque: { x: number; y: number } | null = null;
    let fraccionPrevia = 0;
    let seccionPrevia = -2;
    let reveladasPrevias = 0;
    let escenaPrevia = '';
    let vozArriba = false;

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
      let brillo = 1;
      toque = null;
      const fraccion = sonando ? motorAudio.fraccionSeccion : 0;

      if (escena) {
        // La energía de la escena acelera o calma la obra en los dos labs.
        const energia = intensidadDeEscena(escena);
        if ('velocidad' in parametros) parametros.velocidad *= 0.55 + 0.9 * energia;

        if (p.track === 'ia') {
          const contexto = {
            proyecto: p,
            escena,
            sonando,
            fraccion,
            avance: sonando ? motorAudio.progresoPieza : 0,
            vivo: motorAudio.vivo(),
          };
          for (const c of p.conexionesVisual) {
            const w = c.cantidad / 3;
            const valor = valorDato(c.fuente, contexto);
            if (c.destino === 'paleta') {
              const archivo = c.fuente.startsWith('archivo:')
                ? p.archivosDatos.find((a) => a.id === c.fuente.split(':')[1])
                : undefined;
              const deLaFoto = c.fuente.startsWith('foto:') ? campoDe(escena.imagenUrl ?? v.imagenUrl)?.colores() : undefined;
              if (archivo?.colores && archivo.colores.length >= 2) paleta = archivo.colores;
              else if (deLaFoto && deLaFoto.length >= 2) paleta = deLaFoto;
              else if (c.fuente === 'emocion') paleta = paletaDeEmocion(escena.emocion);
              continue;
            }
            const mando = alg.mandos.find((m) => m.id === c.destino);
            if (!mando) continue;
            const objetivo = mando.min + valor * (mando.max - mando.min);
            parametros[mando.id] = parametros[mando.id] + (objetivo - parametros[mando.id]) * w;
          }
        } else {
          reaccion = VALOR_REACCION[escena.reaccion ?? 'bombo'];
          const gesto = enVivo.gesto ?? (sonando ? gestoEn(escena.gestoVisual, fraccion) : null);
          if (gesto) {
            // El cuadro mide la y hacia arriba; la pantalla, hacia abajo.
            toque = { x: gesto.x, y: 1 - gesto.y };
            if ('velocidad' in parametros) parametros.velocidad *= 0.3 + 2.2 * gesto.x;
            reaccion = Math.min(1, reaccion * (0.5 + gesto.x));
            brillo = 0.55 + 0.9 * gesto.y;
          }
          // Los golpes grabados se disparan cuando la escena pasa por su momento.
          if (sonando && indice === seccionPrevia && escena.golpesVisuales) {
            for (const g of escena.golpesVisuales) {
              if (g.t > fraccionPrevia && g.t <= fraccion) golpear(g.tipo);
            }
          }
        }
      }
      fraccionPrevia = fraccion;
      seccionPrevia = indice;

      // La voz no da golpes sueltos: cuando arranca una frase (sube de golpe) dispara sus reacciones.
      if (p.track === 'musica' && sonando) {
        const nivelVoz = motorAudio.vivo().voz;
        if (!vozArriba && nivelVoz > 0.3) {
          vozArriba = true;
          for (const r of escena?.reacciones ?? []) {
            if (r.fuente === 'voz') golpear(r.efecto, FUERZA_REACCION[r.fuerza]);
          }
        } else if (vozArriba && nivelVoz < 0.12) vozArriba = false;
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
      if (marco.current) marco.current.style.filter = brillo === 1 ? '' : `brightness(${brillo.toFixed(2)})`;

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
