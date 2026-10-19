/**
 * Elegir el dato que mueve un parámetro.
 *
 * Son muchos datos (relato, sonido, cada instrumento, fotos…), así que no
 * van en una sola lista larga: arriba hay pestañas por familia y debajo
 * solo los de esa familia. Flota sobre toda la interfaz (MenuFlotante), así
 * que ninguna ventana lo recorta, y se abre en la familia del dato actual.
 */
import { useRef, useState } from 'react';
import { COLOR_GRUPO } from '../estado/musica';
import type { Fuente } from '../estado/datos';
import { MenuFlotante } from './MenuFlotante';

interface Props {
  fuentes: Fuente[];
  /** La clave del dato elegido, si hay. */
  actual?: string;
  /** El dato elegido, para pintar el botón. */
  elegida?: Fuente;
  alElegir: (clave: string | null) => void;
}

/** El nombre corto de cada familia, para que quepan todas en una fila. */
function corto(seccion: string): string {
  const fija: Record<string, string> = {
    'El relato': 'Relato',
    'El sonido': 'Sonido',
    'Los instrumentos': 'Instrumentos',
    'La foto de la escena': 'Foto de la escena',
  };
  return fija[seccion] ?? seccion.replace(/^(Foto|Sonido) «(.*)»$/, '$2');
}

export function SelectorDato({ fuentes, actual, elegida, alElegir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const familias: { titulo: string; fuentes: Fuente[] }[] = [];
  for (const f of fuentes) {
    const ultima = familias.find((x) => x.titulo === f.seccion);
    if (ultima) ultima.fuentes.push(f);
    else familias.push({ titulo: f.seccion, fuentes: [f] });
  }
  const [pestana, setPestana] = useState<string | null>(null);
  const deLaElegida = familias.find((x) => x.fuentes.some((f) => f.clave === actual))?.titulo;
  const visible = familias.find((x) => x.titulo === pestana) ?? familias.find((x) => x.titulo === deLaElegida) ?? familias[0];
  const col = elegida ? COLOR_GRUPO[elegida.grupo] : undefined;

  return (
    <div className="nv-desplegable">
      <button
        ref={boton}
        type="button"
        className="nv-ficha nv-ficha--chica"
        style={col ? { color: col, background: `${col}22`, borderColor: `${col}88` } : undefined}
        aria-expanded={abierto}
        onClick={(ev) => {
          ev.stopPropagation();
          setPestana(null);
          setAbierto(!abierto);
        }}
      >
        {elegida ? (
          <>
            <span className="nv-punto" style={{ background: col }} />
            {elegida.etiqueta}
          </>
        ) : (
          'Sin dato'
        )}{' '}
        ▾
      </button>
      {abierto && boton.current && (
        <MenuFlotante ancla={boton.current} alCerrar={() => setAbierto(false)} className="nv-datos-menu">
          <button
            type="button"
            className={!actual ? 'nv-opcion--actual' : ''}
            onClick={() => {
              alElegir(null);
              setAbierto(false);
            }}
          >
            Sin dato · lo pongo yo
          </button>
          <div className="nv-datos-menu__pestanas" role="tablist">
            {familias.map((fam) => (
              <button
                key={fam.titulo}
                type="button"
                role="tab"
                aria-selected={fam.titulo === visible.titulo}
                className={fam.titulo === visible.titulo ? 'nv-datos-menu__pestana--activa' : ''}
                style={fam.titulo === visible.titulo ? { color: COLOR_GRUPO[fam.fuentes[0].grupo] } : undefined}
                onClick={() => setPestana(fam.titulo)}
              >
                {corto(fam.titulo)}
              </button>
            ))}
          </div>
          <div className="nv-datos-menu__lista">
            {visible.fuentes.map((x) => (
              <button
                key={x.clave}
                type="button"
                className={x.clave === actual ? 'nv-opcion--actual' : ''}
                onClick={() => {
                  alElegir(x.clave);
                  setAbierto(false);
                }}
              >
                <span className="nv-punto" style={{ background: COLOR_GRUPO[x.grupo] }} />
                <span className="nv-lista-flotante__texto">
                  {x.etiqueta}
                  {x.ayuda && <span className="nv-tenue nv-chico">{x.ayuda}</span>}
                </span>
              </button>
            ))}
          </div>
        </MenuFlotante>
      )}
    </div>
  );
}
