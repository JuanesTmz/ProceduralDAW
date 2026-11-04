// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/global.css';
import './estilos/marco.css';
import './estilos/cancion.css';
import './estilos/procedural.css';
import './estilos/estudio.css';
import './estilos/tactil.css';
import './estilos/ventanas.css';
import './estilos/taller.css';
import './estilos/pantalla.css';
import './estilos/narrativa.css';
import './estilos/nube.css';
import App from './App';
import { ajustarVista } from './vista';

// Solo en la consola del navegador (no en la pantalla): quién hizo SONORA.
console.info('%cSONORA%c · Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos', 'font-weight:900;color:#ffb020', 'color:inherit');

ajustarVista();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
