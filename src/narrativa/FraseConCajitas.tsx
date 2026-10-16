/**
 * La frase de una escena, con sus cajitas.
 *
 * Tocar una palabra abre un menú pequeño para pegarle algo que pase justo
 * cuando la voz la dice: un sonido (de la Sonoteca o grabado), un silencio
 * de la música o un golpe de imagen. Las palabras con cajita se resaltan
 * del color de lo que tienen.
 */
import { useState } from 'react';
import { useProyecto } from '../estado/ProyectoContext';
import { nuevoId, palabrasDe } from '../estado/proyecto';
import { buscarEscena } from '../estado/escenas';
import { NOMBRE_GOLPE, ORDEN_GOLPES } from '../estado/imagen';
import { SONOTECA } from '../audio/sonoteca';
import type { Cajita, Escena } from '../estado/tipos';

const COLOR: Record<Cajita['tipo'], string> = { sonido: '#ffb020', silencio: '#8b91a5', imagen: '#ff7ab8' };
const ICONO: Record<Cajita['tipo'], string> = { sonido: '♪', silencio: '◌', imagen: '◐' };

function describir(c: Cajita): string {
  if (c.tipo === 'sonido') return `sonido · ${c.nombre ?? ''}`;
  if (c.tipo === 'silencio') return 'la música se calla';
  return `imagen · ${c.golpe ? NOMBRE_GOLPE[c.golpe].toLowerCase() : ''}`;
}

interface Props {
  escena: Escena;
  /** Qué cajitas se pueden pegar aquí: en Música, sonido y silencio; en Visuales, imagen. */
  tipos?: Cajita['tipo'][];
  /** Cuántas palabras ya se dijeron, para encenderlas mientras suena. */
  dichas?: number;
}

export function FraseConCajitas({ escena, tipos = ['sonido', 'silencio', 'imagen'], dichas = -1 }: Props) {
  const { proyecto, actualizar } = useProyecto();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [menu, setMenu] = useState<'inicio' | 'sonido' | 'imagen'>('inicio');
  const palabras = palabrasDe(escena.texto);
  const cajitas = escena.cajitas ?? [];
  const deLaPalabra = (i: number) => cajitas.find((c) => c.palabra === i && tipos.includes(c.tipo));
  const sonidos = [
    ...SONOTECA.filter((s) => s.grupo !== 'melodico').map((s) => ({ url: s.url, nombre: s.nombre })),
    ...proyecto.sonidos.map((s) => ({ url: s.url, nombre: `🎙 ${s.nombre}` })),
  ];

  const poner = (palabra: number, datos: Omit<Cajita, 'id' | 'palabra'> | null) => {
    actualizar((p) => {
      const e = buscarEscena(p, escena.id);
      if (!e) return;
      // Solo se reemplaza la cajita de esta pestaña: una palabra puede tener sonido e imagen.
      const resto = (e.cajitas ?? []).filter((c) => c.palabra !== palabra || !tipos.includes(c.tipo));
      e.cajitas = datos ? [...resto, { id: nuevoId('cajita'), palabra, ...datos }] : resto;
    });
    setAbierta(null);
    setMenu('inicio');
  };

  return (
    <div className="nv-cajitas">
      <p className="nv-dentro__texto">
        {palabras.map((palabra, i) => {
          const c = deLaPalabra(i);
          return (
            <span key={i} className="nv-cajitas__lugar">
              <button
                type="button"
                className={`nv-cajitas__palabra ${c ? 'nv-cajitas__palabra--con' : ''} ${abierta === i ? 'nv-cajitas__palabra--abierta' : ''} ${dichas >= 0 ? (i < dichas ? 'nv-cajitas__palabra--dicha' : 'nv-cajitas__palabra--espera') : ''}`}
                style={c ? { color: COLOR[c.tipo], borderColor: COLOR[c.tipo] } : undefined}
                onClick={() => {
                  setAbierta(abierta === i ? null : i);
                  setMenu('inicio');
                }}
              >
                {palabra}
              </button>
              {abierta === i && (
                <span className="nv-lista-flotante nv-cajitas__menu">
                  {menu === 'inicio' && (
                    <>
                      {tipos.includes('sonido') && (
                        <button type="button" onClick={() => setMenu('sonido')}>
                          <span className="nv-cajitas__icono" style={{ color: COLOR.sonido }}>♪</span> Un sonido
                        </button>
                      )}
                      {tipos.includes('silencio') && (
                        <button type="button" onClick={() => poner(i, { tipo: 'silencio' })}>
                          <span className="nv-cajitas__icono" style={{ color: COLOR.silencio }}>◌</span> Silencio: la música se calla
                        </button>
                      )}
                      {tipos.includes('imagen') && (
                        <button type="button" onClick={() => setMenu('imagen')}>
                          <span className="nv-cajitas__icono" style={{ color: COLOR.imagen }}>◐</span> Un golpe de imagen
                        </button>
                      )}
                      {c && (
                        <button type="button" className="nv-rojo" onClick={() => poner(i, null)}>
                          × Quitar la cajita
                        </button>
                      )}
                    </>
                  )}
                  {menu === 'sonido' &&
                    sonidos.map((s) => (
                      <button key={s.url} type="button" onClick={() => poner(i, { tipo: 'sonido', url: s.url, nombre: s.nombre })}>
                        {s.nombre}
                      </button>
                    ))}
                  {menu === 'imagen' &&
                    ORDEN_GOLPES.map((g) => (
                      <button key={g} type="button" onClick={() => poner(i, { tipo: 'imagen', golpe: g })}>
                        {NOMBRE_GOLPE[g]}
                      </button>
                    ))}
                </span>
              )}{' '}
            </span>
          );
        })}
      </p>
      {cajitas.some((c) => tipos.includes(c.tipo)) && (
        <div className="nv-fichas">
          {cajitas
            .filter((c) => tipos.includes(c.tipo))
            .sort((a, b) => a.palabra - b.palabra)
            .map((c) => (
              <span key={c.id} className="nv-chip" style={{ color: COLOR[c.tipo], background: `${COLOR[c.tipo]}22` }}>
                {ICONO[c.tipo]} {palabras[c.palabra]} · {describir(c)}
                <button type="button" className="nv-enlace nv-chico" onClick={() => poner(c.palabra, null)} aria-label="Quitar">
                  ×
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
