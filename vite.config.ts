import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  // En GitHub Pages la app cuelga de /ProceduralDAW/, pero en desarrollo
  // queremos la raíz limpia: por eso la base depende del comando.
  base: command === 'build' ? '/ProceduralDAW/' : '/',
  // `npm run tablet` sirve por HTTPS en la red local: el micrófono del
  // navegador solo funciona con HTTPS, y así la tablet puede grabar.
  plugins: mode === 'tablet' ? [react(), basicSsl()] : [react()],
  define: {
    // hydra-synth viene empaquetado para Node y usa `global`, que en el
    // navegador no existe. Sin esto, Hydra revienta al cargar.
    global: 'globalThis',
  },
}))
