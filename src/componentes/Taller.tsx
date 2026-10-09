/**
 * El taller: la pantalla de Producción, que ahora es UNA.
 *
 * Antes había seis mesas y se saltaba entre ellas con una fila de pestañas;
 * cada salto cambiaba toda la pantalla y había que volver a ubicarse. Aquí
 * lo que manda es la pista repartida —la canción entera, donde se refleja
 * todo lo que el estudiante toca— y las herramientas se abren encima en su
 * ventana, hacen lo suyo y se cierran. Lo que estaba mirando sigue ahí.
 *
 * Es la forma de NeuralOracle: lo grande a la izquierda, lo que lo gobierna
 * a la derecha.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { duracionPieza, formatearReloj } from '../estado/proyecto';
import { ETIQUETAS_ESCALA } from '../generativo/escalas';
import { ORDEN_HERRAMIENTAS, type Track } from '../guia/pasos';
import type { Herramienta, NombreSeccion } from '../estado/tipos';
import { MesaCancion } from './MesaCancion';
import { PasoEstructura } from './PasoEstructura';
import { Ventana } from './Ventana';
import { VentanaGolpes } from './VentanaGolpes';
import { VentanaMatriz } from './VentanaMatriz';
import { VentanaMezcla } from './VentanaMezcla';
import { VentanaProcedural } from './VentanaProcedural';
import { VentanaSonidos } from './VentanaSonidos';

interface Props {
  parte: NombreSeccion;
  alElegirParte: (parte: NombreSeccion) => void;
  herramienta: Herramienta | null;
  alAbrir: (herramienta: Herramienta | null) => void;
}

export function Taller({ parte, alElegirParte, herramienta, alAbrir }: Props) {
  const { proyecto } = useProyecto();
  /** Con qué pista abrir Golpes cuando se llega tocando una en la pista. */
  const [pistaInicial, setPistaInicial] = useState<string | null>(null);

  const { patron } = proyecto;
  const conMaquina =
    patron.filas.filter((f) => f.regla.activa).length + (patron.melodia.regla.activa ? 1 : 0);
  const silenciadas =
    patron.filas.filter((f) => f.silenciada).length + (patron.melodia.silenciada ? 1 : 0);

  // Cada herramienta se presenta por su ESTADO, no por una explicación: lo
  // que hay hecho dentro, que es lo que el estudiante necesita saber para
  // decidir si entra o no.
  const herramientas: { id: Herramienta; icono: string; nombre: string; estado: string }[] = [
    {
      id: 'golpes',
      icono: '▣',
      nombre: 'Golpes',
      estado: `${patron.filas.length} ${patron.filas.length === 1 ? 'pista' : 'pistas'} · ${patron.filas.reduce(
        (n, f) => n + f.pasos.filter(Boolean).length,
        0,
      )} golpes`,
    },
    {
      id: 'matriz',
      icono: '♫',
      nombre: 'Matriz',
      estado:
        patron.melodia.notas.length > 0
          ? `${patron.melodia.notas.length} notas · ${ETIQUETAS_ESCALA[patron.melodia.escala]}`
          : 'sin melodía todavía',
    },
    {
      id: 'procedural',
      icono: '◈',
      nombre: 'Procedural',
      estado:
        conMaquina > 0
          ? `${conMaquina} ${conMaquina === 1 ? 'pista la arma' : 'pistas las arma'} la máquina`
          : 'ninguna pista la arma la máquina',
    },
    {
      id: 'sonidos',
      icono: '☷',
      nombre: 'Sonidos',
      estado:
        proyecto.sonidos.length > 0
          ? `${proyecto.sonidos.length} ${proyecto.sonidos.length === 1 ? 'sonido tuyo' : 'sonidos tuyos'}`
          : 'solo el kit de la app',
    },
    {
      id: 'estructura',
      icono: '⚙',
      nombre: 'Estructura',
      estado: `${proyecto.secciones.length} partes · ${formatearReloj(duracionPieza(proyecto))}`,
    },
    {
      id: 'mezcla',
      icono: '◉',
      nombre: 'Ecualizador',
      estado:
        (proyecto.efectos.movimiento ?? 0) > 0.02
          ? 'el timbre se mueve solo'
          : silenciadas > 0
            ? `${silenciadas} en silencio`
            : 'todas sonando',
    },
  ];

  // La estructura va primero: es repartir el tiempo, y eso se decide antes
  // de llenarlo. Después el orden lo pone el Urban Lab —IA entra planeando
  // el sistema, Música Urbana entra buscando el sonido— y el ecualizador
  // cierra, porque se afina cuando ya hay algo que afinar.
  const orden = ['estructura', ...ORDEN_HERRAMIENTAS[(proyecto.track ?? 'ia') as Track]];
  const enOrden = [
    ...orden.flatMap((id) => herramientas.filter((h) => h.id === id)),
    ...herramientas.filter((h) => !orden.includes(h.id)),
  ];

  const abrirPista = (idFila: string) => {
    setPistaInicial(idFila);
    alAbrir('golpes');
  };

  const cerrar = () => {
    setPistaInicial(null);
    alAbrir(null);
  };

  return (
    <div className="taller">
      <div className="taller__pista">
        <MesaCancion parte={parte} alElegirParte={alElegirParte} alAbrirPista={abrirPista} />
      </div>

      <aside className="taller__mandos">
        {enOrden.map((h) => (
          <button
            key={h.id}
            type="button"
            className={`carta ${herramienta === h.id ? 'carta--abierta' : ''}`}
            onClick={() => alAbrir(h.id)}
          >
            <span className="carta__icono" aria-hidden="true">
              {h.icono}
            </span>
            <span className="carta__textos">
              <span className="carta__nombre">{h.nombre}</span>
              <span className="carta__estado">{h.estado}</span>
            </span>
          </button>
        ))}
      </aside>

      {herramienta === 'golpes' && <VentanaGolpes inicial={pistaInicial} alCerrar={cerrar} />}
      {herramienta === 'matriz' && <VentanaMatriz alCerrar={cerrar} />}
      {herramienta === 'procedural' && <VentanaProcedural alCerrar={cerrar} />}
      {herramienta === 'mezcla' && <VentanaMezcla alCerrar={cerrar} />}
      {herramienta === 'sonidos' && <VentanaSonidos alCerrar={cerrar} />}
      {herramienta === 'estructura' && (
        <Ventana
          titulo="Estructura"
          nota="Cuánto dura cada parte, con cuánta energía suena y qué semilla usa"
          ancha
          alCerrar={cerrar}
        >
          <PasoEstructura />
        </Ventana>
      )}
    </div>
  );
}
