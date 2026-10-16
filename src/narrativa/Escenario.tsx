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
import { paletaDeEmocion, VALOR_REACCION } from '../estado/imagen';
import { VALOR_EMOCION } from '../estado/musica';
import { algoritmoDe, valoresPorDefecto } from '../visual/algoritmos';
import { CampoImagen } from '../visual/imagenDatos';
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
  const campos = useRef(new Map<string, CampoImagen | 'cargando'>());
  const [frase, setFrase] = useState<{ palabras: string[]; reveladas: number; id: string }>({
    palabras: [],
    reveladas: 0,
    id: '',
  });

  // Golpes visuales: se ven como efectos del marco, no del algoritmo.
  const golpear = (golpe: GolpeVisual) => {
    const m = marco.current;
    const d = destello.current;
    if (!m || !d) return;
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

  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    motorVisual.iniciar(nodo, () => undefined);
    let cuadro = 0;
    let fraccionPrevia = 0;
    let seccionPrevia = -2;

    const campoDe = (url: string | undefined): CampoImagen | null => {
      if (!url) return null;
      const guardado = campos.current.get(url);
      if (guardado instanceof CampoImagen) return guardado;
      if (!guardado) {
        campos.current.set(url, 'cargando');
        CampoImagen.desdeUrl(url)
          .then((c) => campos.current.set(url, c))
          .catch(() => campos.current.delete(url));
      }
      return null;
    };

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
      const fraccion = sonando ? motorAudio.fraccionSeccion : 0;

      if (escena) {
        // La energía de la escena acelera o calma la obra en los dos labs.
        const energia = intensidadDeEscena(escena);
        if ('velocidad' in parametros) parametros.velocidad *= 0.55 + 0.9 * energia;

        if (p.track === 'ia') {
          for (const c of p.conexionesVisual) {
            const w = c.cantidad / 3;
            const valor = sonando
              ? motorAudio.datoActual(c.fuente)
              : c.fuente === 'emocion'
                ? VALOR_EMOCION[escena.emocion]
                : c.fuente === 'fuerza'
                  ? (escena.fuerza - 1) / 2
                  : 0.5;
            if (c.destino === 'paleta') {
              const archivo = c.fuente.startsWith('archivo:')
                ? p.archivosDatos.find((a) => a.id === c.fuente.slice(8))
                : undefined;
              if (archivo?.colores && archivo.colores.length >= 2) paleta = archivo.colores;
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
