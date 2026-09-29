/**
 * El arco: el recorrido emocional del relato, dibujado como una curva.
 *
 * No es un adorno — cada punto escribe directamente en la sección
 * correspondiente (intensidad, capas y matriz), así que mover la curva
 * cambia de verdad cómo suena la pieza.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { ajustarPuntoDelArco } from '../estado/proyecto';
import { motorAudio } from '../audio/motorAudio';
import type { NombreSeccion } from '../estado/tipos';

interface Forma {
  nombre: string;
  descripcion: string;
  valores: Record<NombreSeccion, number>;
}

const FORMAS: Forma[] = [
  {
    nombre: 'Crece y se apaga',
    descripcion: 'Lo clásico: entra bajito, llena, estalla y se va.',
    valores: { intro: 0.3, cuerpo: 0.75, giro: 1, cierre: 0.45 },
  },
  {
    nombre: 'Estalla en el giro',
    descripcion: 'Contenida hasta que algo pasa en el giro.',
    valores: { intro: 0.25, cuerpo: 0.45, giro: 1, cierre: 0.3 },
  },
  {
    nombre: 'Empieza fuerte',
    descripcion: 'Golpea de entrada y se va desinflando: buena para una pérdida.',
    valores: { intro: 0.95, cuerpo: 0.7, giro: 0.5, cierre: 0.2 },
  },
  {
    nombre: 'Se va apretando',
    descripcion: 'Sube parejo, sin respiro, hasta el final.',
    valores: { intro: 0.3, cuerpo: 0.6, giro: 0.85, cierre: 1 },
  },
];

const ALTURA = 150;

export function PasoArco() {
  const { proyecto, actualizar } = useProyecto();
  const [ajustarCapas, setAjustarCapas] = useState(true);
  const { secciones } = proyecto;

  const mover = (id: NombreSeccion, intensidad: number) => {
    actualizar((p) => ajustarPuntoDelArco(p, id, intensidad, ajustarCapas));
  };

  const aplicarForma = (forma: Forma) => {
    actualizar((p) => {
      for (const seccion of p.secciones) {
        ajustarPuntoDelArco(p, seccion.id, forma.valores[seccion.id], ajustarCapas);
      }
    });
  };

  // Puntos de la curva, en coordenadas del SVG (0–100 de ancho por sección).
  const puntos = secciones.map((seccion, i) => ({
    x: ((i + 0.5) / secciones.length) * 100,
    y: ALTURA - seccion.intensidad * (ALTURA - 18) - 9,
    seccion,
  }));
  const trazo = puntos.map((p) => `${p.x},${p.y}`).join(' ');
  const relleno = `0,${ALTURA} ${trazo} 100,${ALTURA}`;

  return (
    <section className="panel">
      <div className="panel__cabecera">
        <h2 className="panel__titulo">El arco</h2>
        <span className="panel__nota">Cómo sube y baja tu historia</span>
        <div className="panel__acciones">
          <label className="interruptor">
            <input
              type="checkbox"
              checked={ajustarCapas}
              onChange={(e) => setAjustarCapas(e.target.checked)}
            />
            <span>Ajustar también las capas</span>
          </label>
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => {
              motorAudio.cambiarModo('pieza');
              void motorAudio.reproducir();
            }}
          >
            ▶ Oír el arco
          </button>
        </div>
      </div>

      <div className="panel__cuerpo">
        <div className="arco">
          <svg
            className="arco__grafico"
            viewBox={`0 0 100 ${ALTURA}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon className="arco__area" points={relleno} />
            <polyline className="arco__linea" points={trazo} />
            {puntos.map((p) => (
              <circle key={p.seccion.id} className="arco__punto" cx={p.x} cy={p.y} r="2.4" />
            ))}
          </svg>

          <div className="arco__controles">
            {secciones.map((seccion) => (
              <div className="arco__columna" key={seccion.id} data-seccion={seccion.id}>
                <input
                  className="arco__deslizador"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={seccion.intensidad}
                  aria-label={`Intensidad de ${seccion.etiqueta}`}
                  onChange={(e) => mover(seccion.id, Number(e.target.value))}
                />
                <span className="arco__etiqueta">{seccion.etiqueta}</span>
                <span className="arco__valor">{Math.round(seccion.intensidad * 100)}%</span>
                <span className="arco__capas">
                  {seccion.capasActivas.length}{' '}
                  {seccion.capasActivas.length === 1 ? 'capa' : 'capas'}
                  {seccion.melodiaActiva ? ' + matriz' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="formas">
          <span className="campo__etiqueta">Formas de arco</span>
          <div className="formas__lista">
            {FORMAS.map((forma) => (
              <button
                key={forma.nombre}
                type="button"
                className="forma"
                onClick={() => aplicarForma(forma)}
              >
                <strong>{forma.nombre}</strong>
                <span>{forma.descripcion}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
