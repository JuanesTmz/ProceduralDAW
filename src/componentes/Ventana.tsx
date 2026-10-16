/**
 * Una ventana: se abre encima de todo, hace lo suyo y se cierra.
 *
 * Reemplaza a los desplegables apilados. Un desplegable empuja lo que tiene
 * debajo y obliga a desplazar justo cuando acabas de abrirlo; una ventana no
 * mueve nada de sitio y puede ser tan grande como haga falta sin robarle alto
 * a la mesa que está detrás.
 *
 * Nunca pasa del 92% de la pantalla, así que la ventana tampoco provoca
 * scroll de navegador: si su contenido no cabe, se desplaza por dentro.
 */
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Guia } from '../narrativa/Guia';
import type { Pantalla } from '../narrativa/pasosGuia';

interface Props {
  titulo: string;
  /** Línea pequeña bajo el título. */
  nota?: string;
  /** Color de acento de la ventana: el del instrumento que la abrió. */
  color?: string;
  alCerrar: () => void;
  /** Botones del pie, si hacen falta. */
  pie?: ReactNode;
  ancha?: boolean;
  /** Para las que tienen que llenar el alto: la rejilla, el cuadro X/Y. */
  alta?: boolean;
  children: ReactNode;
  /** El tour de esta ventana: pone el botón «Guía» y arranca solo la primera vez. */
  guia?: Pantalla;
}

export function Ventana({ titulo, nota, color, alCerrar, pie, ancha, alta, children, guia }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const devolverFoco = useRef<HTMLElement | null>(null);

  const cerrar = useCallback(() => alCerrar(), [alCerrar]);

  useEffect(() => {
    devolverFoco.current = document.activeElement as HTMLElement | null;
    caja.current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      // Con la guía abierta, Escape cierra la guía y no la ventana.
      if (e.key === 'Escape' && document.querySelector('.nv-tour')) return;
      // Con ventanas apiladas (un tutorial abierto desde otra ventana), solo responde la de arriba.
      const todas = document.querySelectorAll('.ventana');
      if (todas[todas.length - 1] !== caja.current) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        cerrar();
        return;
      }
      // El tabulador no se escapa de la ventana mientras está abierta.
      if (e.key !== 'Tab' || !caja.current) return;
      const focos = caja.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    window.addEventListener('keydown', alTeclear, true);
    return () => {
      window.removeEventListener('keydown', alTeclear, true);
      devolverFoco.current?.focus?.();
    };
  }, [cerrar]);

  return createPortal(
    <div
      className="velo"
      role="presentation"
      // Solo cierra si el toque empezó y acabó en el velo: así arrastrar un
      // mando y soltar fuera de la ventana no la cierra sin querer.
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        ref={caja}
        className={`ventana ${ancha ? 'ventana--ancha' : ''} ${alta ? 'ventana--alta' : ''}`}
        style={color ? { color } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
      >
        <header className="ventana__cabecera">
          <div className="ventana__textos">
            <h2 className="ventana__titulo">{titulo}</h2>
            {nota && <span className="ventana__nota">{nota}</span>}
          </div>
          {guia && <Guia pantalla={guia} />}
          <button type="button" className="ventana__cerrar" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="ventana__cuerpo">{children}</div>

        {pie && <footer className="ventana__pie">{pie}</footer>}
      </div>
    </div>,
    document.body,
  );
}
