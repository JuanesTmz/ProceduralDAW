// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Dos cosas que pidió la prueba con los chicos: saber que no se pierde
 * nada y que alguien les diga que van bien.
 *
 * - `Guardado`: en la barra, «✓ Se guarda solo», que parpadea a «Guardando…»
 *   con cada cambio. Buscaban un botón de guardar por miedo a perder lo hecho.
 * - `Animo`: un aviso corto de «¡Vas muy bien!» cuando se cumple un paso
 *   (las estaciones, el monólogo, cada voz, la base, los golpes…).
 *   Solo cuenta lo que pasa mientras la app está abierta: al cargar un
 *   proyecto no salta nada.
 */
import { useEffect, useRef, useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { palabrasDe } from '../estado/proyecto';
import { MINIMO_PALABRAS, type Proyecto } from '../estado/tipos';
import { vozDesactualizada } from '../estado/escenas';
import { nombreBase } from '../estado/musica';

export function Guardado() {
  const { proyecto } = useProyecto();
  const [guardando, setGuardando] = useState(false);
  const primero = useRef(true);

  useEffect(() => {
    if (primero.current) {
      primero.current = false;
      return;
    }
    setGuardando(true);
    const t = window.setTimeout(() => setGuardando(false), 1200);
    return () => window.clearTimeout(t);
  }, [proyecto]);

  return (
    <span className={`nv-guardado ${guardando ? 'nv-guardado--activo' : ''}`} title="Cada cambio se guarda solo. No tienes que guardar nada.">
      {guardando ? 'Guardando…' : '✓ Se guarda solo'}
    </span>
  );
}

/** Los logros que ya se cumplen en este proyecto, cada uno con su mensaje. */
function logros(p: Proyecto): Map<string, string> {
  const m = new Map<string, string>();
  const estaciones = (p.historia.estaciones ?? []).filter((x) => x.trim().length > 0).length;
  if (estaciones >= 1) m.set('estacion-1', 'Ya anotaste tu primera estación.');
  if (estaciones >= 5) m.set('estaciones', 'Tienes las cinco estaciones: ya puedes escribir el monólogo.');
  if (palabrasDe(p.narracion.texto).length >= MINIMO_PALABRAS) m.set('monologo', 'Tu monólogo ya tiene buen tamaño.');
  if (p.escenas.length >= 2) m.set('escenas', `Tu historia ya tiene ${p.escenas.length} escenas.`);
  const grabadas = p.escenas.filter((e) => e.vozUrl && !vozDesactualizada(e)).length;
  for (let i = 1; i <= grabadas; i++) m.set(`voz-${i}`, i === p.escenas.length ? '¡Grabaste la voz de todas las escenas!' : `Voz de la escena ${i} grabada.`);
  const base = nombreBase(p.preset);
  if (base) m.set(`base-${p.preset}`, `Base de ${base} puesta.`);
  if ([...p.escenas, ...p.respiros].some((e) => e.golpes && Object.keys(e.golpes).length > 0)) m.set('golpes', 'Le diste a una escena sus propios golpes.');
  if (p.sonidos.length > 0) m.set(`efecto-${p.sonidos.length}`, 'Grabaste un sonido propio.');
  if (p.escenas.some((e) => e.imagenUrl)) m.set('imagen', 'Tu pieza ya tiene imagen.');
  return m;
}

export function Animo() {
  const { proyecto } = useProyecto();
  const vistos = useRef<Set<string> | null>(null);
  const [aviso, setAviso] = useState<{ id: number; texto: string } | null>(null);

  useEffect(() => {
    const ahora = logros(proyecto);
    // La primera vez solo se anota lo que ya estaba hecho.
    if (!vistos.current) {
      vistos.current = new Set(ahora.keys());
      return;
    }
    let nuevo: string | null = null;
    for (const [clave, texto] of ahora) {
      if (vistos.current.has(clave)) continue;
      vistos.current.add(clave);
      nuevo = texto;
    }
    if (nuevo) setAviso({ id: Date.now(), texto: nuevo });
  }, [proyecto]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 4500);
    return () => window.clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;
  return (
    <div key={aviso.id} className="nv-animo" role="status">
      <strong>¡Vas muy bien!</strong>
      <span>{aviso.texto}</span>
      <span className="nv-animo__guardado">✓ Todo se va guardando solo</span>
    </div>
  );
}
