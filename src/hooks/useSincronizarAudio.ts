// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Mantiene el grafo de audio al día con el estado de React.
 * Un solo efecto: cada cambio del proyecto se refleja en el motor.
 */
import { useEffect } from 'react';
import { motorAudio } from '../audio/motorAudio';
import { useProyecto } from '../estado/ProyectoContext';

export function useSincronizarAudio(): void {
  const { proyecto } = useProyecto();

  useEffect(() => {
    motorAudio.sincronizar(proyecto);
  }, [proyecto]);
}
