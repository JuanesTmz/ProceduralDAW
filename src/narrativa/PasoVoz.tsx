// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Paso 2: la voz.
 *
 * Una escena a la vez, como un apuntador: el texto en grande para leerlo
 * y un solo botón grande para grabar. Arriba, las escenas como pasos con
 * su estado (grabada o no). Al terminar una, se sigue a la próxima.
 * Los respiros no aparecen: no tienen voz.
 *
 * Desde nov. 2026 solo se graba escena por escena (se quitó «de corrido»):
 * si después se mueve un corte, las palabras se mueven con él y la escena
 * se regraba. Por eso cada voz recuerda el texto con que se grabó, y si ya
 * no coincide se avisa.
 */
import { useEffect, useState } from 'react';
import { useVistaPrevia, vistaPrevia } from '../audio/vistaPrevia';
import { useProyecto } from '../estado/ProyectoContext';
import { formatearReloj } from '../estado/proyecto';
import { EMOCIONES, vozDesactualizada } from '../estado/escenas';
import { useGrabadora } from '../hooks/useGrabadora';
import { Onda } from './VozEscena';
import { BotonPista, PistaMano, usePista } from './PistaMano';

export function PasoVoz({ alSeguir }: { alSeguir: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { escenas } = proyecto;
  const [indice, setIndice] = useState(() => {
    const primera = escenas.findIndex((e) => !e.vozUrl || vozDesactualizada(e));
    return primera < 0 ? 0 : primera;
  });
  const escena = escenas[Math.min(indice, escenas.length - 1)];
  const { suena, oir } = useVistaPrevia();
  const claveVoz = `voz:${escena?.id}`;
  const oyendo = suena(claveVoz);

  const { estado, segundos, error, empezar, parar } = useGrabadora((g) => {
    const id = escena?.id;
    actualizar((p) => {
      const e = p.escenas.find((x) => x.id === id);
      if (!e) return;
      e.vozUrl = g.url;
      e.vozDuracion = g.duracion;
      e.vozDesde = undefined;
      e.vozTexto = e.texto;
    });
  });

  // Al cambiar de escena se corta lo que estuviera sonando.
  useEffect(
    () => () => {
      if (vistaPrevia.activa === claveVoz) vistaPrevia.parar();
    },
    [claveVoz],
  );

  // La primera vez, la mano toca el botón rojo; grabar la primera escena la cierra.
  const pista = usePista('grabar-voz', escenas.some((e) => e.vozUrl), 1, '.nv-grabar', Boolean(escena));

  if (!escena) {
    return (
      <div className="nv-pagina nv-vacio">
        <h1 className="nv-titulo">Graba tu voz</h1>
        <p className="nv-sub">Primero escribe tu monólogo y pártelo en escenas en el paso Historia.</p>
      </div>
    );
  }

  const color = EMOCIONES[escena.emocion].color;
  const grabando = estado === 'grabando';
  const grabadas = escenas.filter((e) => e.vozUrl && !vozDesactualizada(e)).length;
  const vieja = vozDesactualizada(escena);
  const esUltima = indice >= escenas.length - 1;

  const escuchar = () => {
    if (!escena.vozUrl) return;
    oir(claveVoz, escena.vozUrl);
  };

  return (
    <div className="nv-pagina nv-pagina--fija nv-pagina--voz">
      {pista.visible && (
        <PistaMano
          modo="tocar"
          texto="Toca el botón rojo y lee la escena en voz alta. Tócalo otra vez para parar; después la escuchas y, si no te gusta, la grabas de nuevo."
          origen={() => null}
          destinos={() => [document.querySelector('.nv-grabar')].filter((e): e is Element => !!e)}
          alCerrar={pista.cerrar}
        />
      )}
      <div className="nv-cabeza">
        <div>
          <h1 className="nv-titulo">Graba tu voz</h1>
          <p className="nv-sub">Una escena a la vez. Léela despacio: se dice, no se canta.</p>
        </div>
        <span className="nv-espacio" />
        <BotonPista clave="grabar-voz" />
        <span className="nv-tenue">
          {grabadas} de {escenas.length} grabadas
        </span>
      </div>

      <nav className="nv-pasos-voz" aria-label="Escenas">
        {escenas.map((e, i) => {
          const c = EMOCIONES[e.emocion].color;
          return (
            <button
              key={e.id}
              type="button"
              disabled={grabando}
              className={`nv-paso-voz ${i === indice ? 'nv-paso-voz--activo' : ''}`}
              style={{ ['--color' as string]: c }}
              onClick={() => setIndice(i)}
            >
              <span
                className={`nv-paso-voz__marca ${e.vozUrl ? 'nv-paso-voz__marca--lista' : ''} ${vozDesactualizada(e) ? 'nv-paso-voz__marca--vieja' : ''}`}
                title={vozDesactualizada(e) ? 'El texto cambió: vuelve a grabarla' : undefined}
              >
                {vozDesactualizada(e) ? '!' : e.vozUrl ? '✓' : i + 1}
              </span>
              <span className="nv-paso-voz__nombre">{e.nombre}</span>
            </button>
          );
        })}
      </nav>

      <section className="nv-apuntador" style={{ ['--color' as string]: color }}>
        <span className="nv-etiqueta nv-apuntador__etiqueta">
          ESCENA {indice + 1} DE {escenas.length} · {escena.nombre.toUpperCase()}
        </span>
        <p className={`nv-apuntador__texto ${grabando ? 'nv-apuntador__texto--vivo' : ''}`}>
          {escena.texto}
        </p>
        {vieja && !grabando && (
          <p className="nv-aviso-voz">
            El texto de esta escena cambió desde que la grabaste (se movió un corte). Vuelve a grabarla para que la voz diga lo
            mismo que el texto.
          </p>
        )}

        <div className="nv-apuntador__control">
          {grabando ? (
            <>
              <button type="button" className="nv-grabar nv-grabar--vivo" onClick={parar} aria-label="Parar">
                <span className="nv-grabar__cuadro" />
              </button>
              <span className="nv-mono nv-apuntador__tiempo">{formatearReloj(segundos)}</span>
              <span className="nv-tenue">Toca para parar</span>
            </>
          ) : escena.vozUrl ? (
            <>
              <button type="button" className="nv-redondo nv-redondo--grande" onClick={escuchar} aria-label="Escuchar">
                {oyendo ? '❚❚' : '▶'}
              </button>
              <div className="nv-apuntador__onda">
                <Onda semilla={escena.vozUrl} color={color} barras={90} />
              </div>
              <span className="nv-mono">{formatearReloj(escena.vozDuracion)}</span>
              <button
                type="button"
                className={`nv-boton ${vieja ? 'nv-boton--rojo' : ''}`}
                onClick={() => void empezar()}
              >
                Grabar de nuevo
              </button>
              <button
                type="button"
                className="nv-boton nv-boton--primario"
                onClick={() => (esUltima ? alSeguir() : setIndice(indice + 1))}
              >
                {esUltima ? 'Ir a Música  →' : 'Siguiente escena  →'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="nv-grabar"
                disabled={estado === 'pidiendo'}
                onClick={() => void empezar()}
                aria-label="Grabar"
              >
                <span className="nv-grabar__punto" />
              </button>
              <span className="nv-tenue">
                {estado === 'pidiendo' ? 'Pidiendo el micrófono…' : error ?? 'Toca para grabar esta escena'}
              </span>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
