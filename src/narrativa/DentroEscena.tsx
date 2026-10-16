/**
 * Dentro de una escena: lo que se abre al tocar una tarjeta.
 *
 * A la izquierda la frase y su voz; a la derecha lo que siente la escena,
 * su fuerza y su foto, y las dos puertas —Música e Imagen— donde cada lab
 * tiene su propia mecánica (fase 2 y 3). Un respiro se edita igual, pero
 * en vez de frase y voz tiene duración y lugar.
 */
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import {
  buscarEscena,
  EMOCIONES,
  moverRespiro,
  NOMBRE_FUERZA,
  ORDEN_EMOCIONES,
  quitarRespiro,
  recorrido,
} from '../estado/escenas';
import type { Escena, Fuerza } from '../estado/tipos';
import { fondoEscena } from './PasoEscenas';
import { useReproduccion } from './useReproduccion';
import { VozEscena } from './VozEscena';

interface Props {
  id: string;
  alVolver: () => void;
  alIr: (id: string) => void;
  alMusica: () => void;
  alImagen: () => void;
}

export function DentroEscena({ id, alVolver, alIr, alMusica, alImagen }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const { sonando } = useReproduccion();
  const escena = buscarEscena(proyecto, id);
  const lista = recorrido(proyecto);
  const indice = lista.findIndex((e) => e.id === id);

  if (!escena) {
    return (
      <div className="nv-pagina nv-vacio">
        <p className="nv-sub">Esta escena ya no existe.</p>
        <button type="button" className="nv-boton" onClick={alVolver}>← Escenas</button>
      </div>
    );
  }

  const { color } = EMOCIONES[escena.emocion];
  const numero = escena.respiro ? 0 : proyecto.escenas.findIndex((e) => e.id === id) + 1;
  const anterior = lista[indice - 1];
  const siguiente = lista[indice + 1];

  const cambiar = (receta: (e: Escena) => void) =>
    actualizar((p) => {
      const e = buscarEscena(p, id);
      if (e) receta(e);
    });

  const elegirFoto = (archivo: File | undefined) => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    cambiar((e) => {
      if (e.imagenUrl) URL.revokeObjectURL(e.imagenUrl);
      e.imagenUrl = url;
    });
  };

  const nombreVecino = (e: Escena | undefined) => {
    if (!e) return '';
    if (e.respiro) return 'Respiro';
    return `${proyecto.escenas.findIndex((x) => x.id === e.id) + 1} · ${e.nombre}`;
  };

  return (
    <div className="nv-pagina nv-pagina--fija">
      <div className="nv-cabeza">
        <button type="button" className="nv-boton" onClick={alVolver}>← Escenas</button>
        <div className="nv-dentro__nombre">
          <span className="nv-etiqueta" style={{ color }}>
            {escena.respiro ? 'RESPIRO' : `ESCENA ${numero}`}
          </span>
          {escena.respiro ? (
            <h1 className="nv-titulo">Respiro</h1>
          ) : (
            <input
              className="nv-titulo nv-titulo--editable"
              value={escena.nombre}
              aria-label="Nombre de la escena"
              onChange={(ev) => cambiar((e) => (e.nombre = ev.target.value))}
            />
          )}
        </div>
        <span className="nv-espacio" />
        <button
          type="button"
          className="nv-boton"
          onClick={() => (sonando ? motorAudio.detener() : void motorAudio.reproducirEscena(indice))}
        >
          {sonando ? '■  Parar' : '▶  Escuchar esta escena'}
        </button>
      </div>

      <div className="nv-dentro">
        <div className="nv-tarjeta nv-dentro__frase">
          {escena.respiro ? (
            <>
              <p className="nv-dentro__texto nv-tenue nv-italica">
                Aquí no hay voz: la música cuenta sola.
              </p>
              <div className="nv-campo">
                <span className="nv-campo__titulo">¿Cuánto dura?</span>
                <div className="nv-campo__fila">
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={escena.duracionRespiro}
                    style={{ accentColor: color, flex: 1 }}
                    onChange={(ev) => cambiar((e) => (e.duracionRespiro = Number(ev.target.value)))}
                  />
                  <span className="nv-mono">{formatearReloj(escena.duracionRespiro)}</span>
                </div>
              </div>
              <div className="nv-campo">
                <span className="nv-campo__titulo">¿Dónde va?</span>
                <div className="nv-campo__fila">
                  <button type="button" className="nv-boton" onClick={() => actualizar((p) => moverRespiro(p, id, -1))}>
                    ← Antes
                  </button>
                  <button type="button" className="nv-boton" onClick={() => actualizar((p) => moverRespiro(p, id, 1))}>
                    Después →
                  </button>
                  <span className="nv-espacio" />
                  <button
                    type="button"
                    className="nv-boton nv-boton--peligro"
                    onClick={() => {
                      actualizar((p) => quitarRespiro(p, id));
                      alVolver();
                    }}
                  >
                    Quitar respiro
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="nv-dentro__texto">{escena.texto}</p>
              <span className="nv-tenue nv-chico">
                Para cambiar el texto o dónde empieza la escena, vuelve al paso Historia.
              </span>
              <span className="nv-espacio-v" />
              <VozEscena escena={escena} grande />
            </>
          )}
        </div>

        <div className="nv-tarjeta nv-dentro__lado">
          <div className="nv-campo">
            <span className="nv-campo__titulo">¿Qué se siente?</span>
            <div className="nv-emociones">
              {ORDEN_EMOCIONES.map((emo) => {
                const perfil = EMOCIONES[emo];
                const activa = emo === escena.emocion;
                return (
                  <button
                    key={emo}
                    type="button"
                    className={`nv-emocion ${activa ? 'nv-emocion--activa' : ''}`}
                    style={activa ? { color: perfil.color, borderColor: perfil.color, background: `${perfil.color}33` } : undefined}
                    onClick={() => cambiar((e) => (e.emocion = emo))}
                  >
                    <span className="nv-punto" style={{ background: perfil.color }} />
                    {perfil.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="nv-campo">
            <span className="nv-campo__titulo">¿Con cuánta fuerza?</span>
            <div className="nv-selector nv-selector--lleno">
              {([1, 2, 3] as Fuerza[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`nv-selector__op ${f === escena.fuerza ? 'nv-selector__op--activa' : ''}`}
                  style={f === escena.fuerza ? { color, background: `${color}38` } : undefined}
                  onClick={() => cambiar((e) => (e.fuerza = f))}
                >
                  {NOMBRE_FUERZA[f]}
                </button>
              ))}
            </div>
          </div>

          <label className="nv-foto">
            <span className="nv-foto__muestra" style={{ background: fondoEscena(escena) }} />
            <span className="nv-foto__texto">
              <strong>Foto de la escena</strong>
              <span className="nv-acento">{escena.imagenUrl ? 'Cambiar' : 'Elegir una foto'}</span>
            </span>
            <input type="file" accept="image/*" hidden onChange={(ev) => elegirFoto(ev.target.files?.[0])} />
          </label>

          <span className="nv-espacio-v" />

          <button type="button" className="nv-puerta" onClick={alMusica}>
            <span className="nv-puerta__icono">♫</span>
            <span className="nv-puerta__texto">
              <strong>Música de la escena</strong>
              {escena.niveles || escena.gesto ? (
                <span className="nv-acento">editada en esta escena</span>
              ) : (
                <span className="nv-tenue">usa lo general · la mueve la emoción</span>
              )}
            </span>
            <span className="nv-flecha">›</span>
          </button>
          <button type="button" className="nv-puerta" onClick={alImagen}>
            <span className="nv-puerta__icono">◐</span>
            <span className="nv-puerta__texto">
              <strong>Imagen de la escena</strong>
              {escena.gestoVisual || escena.golpesVisuales || escena.reaccion ? (
                <span className="nv-acento">editada en esta escena</span>
              ) : (
                <span className="nv-tenue">usa lo general · la mueve la emoción</span>
              )}
            </span>
            <span className="nv-flecha">›</span>
          </button>
        </div>
      </div>

      <div className="nv-vecinos">
        {anterior ? (
          <button type="button" className="nv-enlace" onClick={() => alIr(anterior.id)}>
            ‹  {nombreVecino(anterior)}
          </button>
        ) : (
          <span />
        )}
        {siguiente && (
          <button type="button" className="nv-enlace" onClick={() => alIr(siguiente.id)}>
            {nombreVecino(siguiente)}  ›
          </button>
        )}
      </div>
    </div>
  );
}
