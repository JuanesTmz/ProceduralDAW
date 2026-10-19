/**
 * Elegir entre opciones con nombre (la figura, la trama, el alfabeto): un
 * botón que muestra la opción actual y, al tocarlo, la lista flotante.
 */
import { useRef, useState } from 'react';
import { MenuFlotante } from './MenuFlotante';

interface Props {
  opciones: string[];
  /** El número de la opción elegida. */
  valor: number;
  alCambiar: (indice: number) => void;
  /** Para el menú: abre hacia arriba si no cabe abajo. */
  etiqueta?: string;
}

export function SelectorOpciones({ opciones, valor, alCambiar, etiqueta }: Props) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const actual = Math.max(0, Math.min(opciones.length - 1, Math.round(valor)));

  return (
    <>
      <button
        ref={boton}
        type="button"
        className="nv-ficha nv-ficha--chica nv-opcion"
        aria-label={etiqueta}
        aria-expanded={abierto}
        onClick={(ev) => {
          ev.stopPropagation();
          setAbierto(!abierto);
        }}
      >
        {opciones[actual]} ▾
      </button>
      {abierto && boton.current && (
        <MenuFlotante ancla={boton.current} alCerrar={() => setAbierto(false)}>
          {opciones.map((o, i) => (
            <button
              key={o}
              type="button"
              className={i === actual ? 'nv-opcion--actual' : ''}
              onClick={() => {
                alCambiar(i);
                setAbierto(false);
              }}
            >
              {o}
            </button>
          ))}
        </MenuFlotante>
      )}
    </>
  );
}
