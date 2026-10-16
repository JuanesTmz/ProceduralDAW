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
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
