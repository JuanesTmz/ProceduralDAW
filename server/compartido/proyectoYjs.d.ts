// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
import type * as Y from 'yjs';

export declare const RAIZ: string;
export declare function iguales(a: unknown, b: unknown): boolean;
export declare function crearConversor(y: typeof Y): {
  leer(doc: Y.Doc): Record<string, unknown> | null;
  escribir(doc: Y.Doc, antes: object | null, ahora: object, origen?: unknown): void;
};
