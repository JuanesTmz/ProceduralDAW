// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * La mezcla: un control de volumen por cada capa de la música, otro para la
 * voz y otro para toda la pieza. Se abre desde la barra de arriba, desde
 * cualquier paso: en la prueba pidieron un acceso fácil para mezclar.
 *
 * Los volúmenes valen para toda la pieza (lo que cambia por escena es si una
 * capa suena o no y la intensidad de la escena).
 */
import { useState } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';
import { Ventana } from '../componentes/Ventana';
import { useReproduccion } from './useReproduccion';

/** La voz puede subir por encima de 1: a veces se graba bajito. */
const MAXIMO_VOZ = 1.6;

export function BotonMezcla() {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" className="nv-boton nv-boton-mezcla" onClick={() => setAbierta(true)} title="Volumen de cada sonido y de la voz">
        <span aria-hidden="true">🎚</span> Mezcla
      </button>
      {abierta && <VentanaMezcla alCerrar={() => setAbierta(false)} />}
    </>
  );
}

export function VentanaMezcla({ alCerrar }: { alCerrar: () => void }) {
  const { proyecto, actualizar } = useProyecto();
  const { sonandoPieza } = useReproduccion();
  const { filas, melodia } = proyecto.patron;
  const hayEscenas = proyecto.escenas.length > 0;

  return (
    <Ventana titulo="Mezcla" nota="Sube o baja cada sonido. Dale play y mueve mientras escuchas." alCerrar={alCerrar} guia="ventana-mezcla">
      <div className="nv nv--incrustado nv-mezcla" data-bloqueo="mezcla">
        <Fila
          nombre="Voz"
          detalle="tu narración"
          color="#ffffff"
          valor={proyecto.narracion.volumen}
          maximo={MAXIMO_VOZ}
          alCambiar={(v) => actualizar((p) => (p.narracion.volumen = v))}
          destacada
        />
        <span className="nv-etiqueta nv-tenue nv-mezcla__titulo">MÚSICA</span>
        <Fila
          nombre="Melodía"
          detalle={melodia.instrumento === 'sample' ? (melodia.nombreSample ?? 'tu sonido') : 'sintetizador'}
          color="#5fd4ff"
          valor={melodia.volumen}
          alCambiar={(v) => actualizar((p) => (p.patron.melodia.volumen = v))}
        />
        {filas.map((f) => (
          <Fila
            key={f.id}
            nombre={f.nombre}
            color={f.color}
            valor={f.volumen}
            alCambiar={(v) =>
              actualizar((p) => {
                const x = p.patron.filas.find((y) => y.id === f.id);
                if (x) x.volumen = v;
              })
            }
          />
        ))}
        <span className="nv-etiqueta nv-tenue nv-mezcla__titulo">TODO</span>
        <Fila
          nombre="Toda la pieza"
          detalle="música y voz juntas"
          color="var(--nv-acento)"
          valor={proyecto.volumenMaestro}
          alCambiar={(v) => actualizar((p) => (p.volumenMaestro = v))}
        />
        <div className="nv-mezcla__pie">
          <button
            type="button"
            className="nv-boton nv-boton--primario"
            disabled={!hayEscenas}
            onClick={() => (sonandoPieza ? motorAudio.detener() : void motorAudio.reproducirPieza())}
          >
            {sonandoPieza ? '■  Parar' : '▶  Escuchar la pieza'}
          </button>
        </div>
      </div>
    </Ventana>
  );
}

function Fila({
  nombre,
  detalle,
  color,
  valor,
  maximo = 1,
  alCambiar,
  destacada = false,
}: {
  nombre: string;
  detalle?: string;
  color: string;
  valor: number;
  maximo?: number;
  alCambiar: (v: number) => void;
  destacada?: boolean;
}) {
  return (
    <label className={`nv-mezcla__fila ${destacada ? 'nv-mezcla__fila--destacada' : ''}`} style={{ ['--color' as string]: color }}>
      <span className="nv-punto" style={{ background: color }} />
      <span className="nv-mezcla__nombre">
        <strong>{nombre}</strong>
        {detalle && <span className="nv-tenue nv-chico">{detalle}</span>}
      </span>
      <input
        type="range"
        min={0}
        max={maximo}
        step={0.01}
        value={valor}
        aria-label={`Volumen de ${nombre}`}
        onChange={(ev) => alCambiar(Number(ev.target.value))}
      />
      <span className="nv-mono nv-mezcla__valor">{Math.round((valor / maximo) * 100)}</span>
    </label>
  );
}
