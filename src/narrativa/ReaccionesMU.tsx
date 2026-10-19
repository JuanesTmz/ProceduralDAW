/**
 * Música Urbana: «cuando suena esto, la imagen hace aquello».
 *
 * Una fila por reacción: de qué sonido depende (una capa, la melodía, la voz
 * o cualquier golpe), qué hace la imagen y con cuánta fuerza. Todo a mano:
 * ellos deciden qué sonido mueve qué efecto, y el ▶ lo prueba al momento.
 */
import { useProyecto } from '../estado/ProyectoContext';
import { buscarEscena } from '../estado/escenas';
import {
  AYUDA_GOLPE,
  fuentesDeReaccion,
  NOMBRE_GOLPE,
  nuevaReaccion,
  ORDEN_GOLPES,
  reaccionesAlAzar,
  FUERZA_REACCION,
} from '../estado/imagen';
import type { Escena, ReglaReaccion } from '../estado/tipos';
import { enVivo } from '../visual/enVivo';
import { SelectorOpciones } from './SelectorOpciones';

const NOMBRE_FUERZA: Record<ReglaReaccion['fuerza'], string> = { 1: 'Poco', 2: 'Algo', 3: 'Mucho' };

export function ReaccionesMU({ escena }: { escena: Escena }) {
  const { proyecto, actualizar } = useProyecto();
  const fuentes = fuentesDeReaccion(proyecto);
  const reglas = (escena.reacciones ?? []).filter((r) => fuentes.some((f) => f.id === r.fuente));

  const cambiar = (id: string, cambio: Partial<ReglaReaccion>) =>
    actualizar((p) => {
      const r = buscarEscena(p, escena.id)?.reacciones?.find((x) => x.id === id);
      if (r) Object.assign(r, cambio);
    });
  const agregar = () =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (!e) return;
      // La primera capa que todavía no tiene reacción, o la primera si todas la tienen.
      const usadas = new Set((e.reacciones ?? []).map((r) => r.fuente));
      const libre = fuentesDeReaccion(p).find((f) => f.id !== 'todo' && !usadas.has(f.id)) ?? fuentesDeReaccion(p)[1];
      (e.reacciones ??= []).push(nuevaReaccion(libre?.id ?? 'todo'));
    });
  const quitar = (id: string) =>
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (e) e.reacciones = (e.reacciones ?? []).filter((r) => r.id !== id);
    });
  const copiarATodas = () =>
    actualizar((p) => {
      const copia = buscarEscena(p, escena.id)?.reacciones ?? [];
      for (const e of [...p.escenas, ...p.respiros]) {
        if (e.id !== escena.id) e.reacciones = copia.map((r) => ({ ...nuevaReaccion(r.fuente, r.efecto), fuerza: r.fuerza }));
      }
    });

  return (
    <div className="nv-campo">
      <div className="nv-campo__fila">
        <span className="nv-campo__titulo">Cuando suena… la imagen hace</span>
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-boton nv-boton--chico nv-boton--sorpresa"
          onClick={() =>
            actualizar((p) => {
              const e = buscarEscena(p, escena.id);
              if (e) reaccionesAlAzar(p, e);
            })
          }
        >
          ✦ Al azar
        </button>
      </div>

      {reglas.length === 0 && (
        <span className="nv-tenue nv-chico nv-italica">
          Todavía no hay reacciones. Agrega una: por ejemplo, cada vez que suene el bombo, que la imagen haga zoom.
        </span>
      )}

      {reglas.map((r) => (
        <div key={r.id} className="nv-reaccion">
          <div className="nv-reaccion__frase">
            <span className="nv-tenue nv-chico">Cuando suena</span>
            <SelectorOpciones
              opciones={fuentes.map((f) => f.nombre)}
              valor={fuentes.findIndex((f) => f.id === r.fuente)}
              etiqueta="Sonido que dispara el efecto"
              alCambiar={(i) => cambiar(r.id, { fuente: fuentes[i].id })}
            />
            <span className="nv-tenue">→</span>
            <SelectorOpciones
              opciones={ORDEN_GOLPES.map((g) => NOMBRE_GOLPE[g])}
              valor={ORDEN_GOLPES.indexOf(r.efecto)}
              etiqueta="Efecto de la imagen"
              alCambiar={(i) => cambiar(r.id, { efecto: ORDEN_GOLPES[i] })}
            />
          </div>
          <div className="nv-reaccion__control">
            <div className="nv-selector nv-selector--ia nv-selector--chico">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`nv-selector__op ${r.fuerza === n ? 'nv-selector__op--activa nv-selector__op--mu' : ''}`}
                  onClick={() => cambiar(r.id, { fuerza: n })}
                >
                  {NOMBRE_FUERZA[n]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="nv-boton nv-boton--chico"
              aria-label="Probar el efecto"
              onClick={() => enVivo.disparar(r.efecto, FUERZA_REACCION[r.fuerza])}
            >
              ▶ Probar
            </button>
            <button type="button" className="nv-enlace nv-chico" aria-label="Quitar la reacción" onClick={() => quitar(r.id)}>
              ×
            </button>
          </div>
          <span className="nv-tenue nv-chico">{AYUDA_GOLPE[r.efecto]}</span>
        </div>
      ))}

      <div className="nv-campo__fila">
        <button type="button" className="nv-conectar nv-conectar--mu" onClick={agregar}>
          + Agregar una reacción
        </button>
        {reglas.length > 0 && (
          <button type="button" className="nv-enlace nv-chico" onClick={copiarATodas}>
            Usar en todas las escenas
          </button>
        )}
      </div>
    </div>
  );
}
