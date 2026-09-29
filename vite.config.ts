import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // En GitHub Pages la app cuelga de /ProceduralDAW/, pero en desarrollo
  // queremos la raíz limpia: por eso la base depende del comando.
  base: command === 'build' ? '/ProceduralDAW/' : '/',
  plugins: [react()],
  define: {
    // hydra-synth viene empaquetado para Node y usa `global`, que en el
    // navegador no existe. Sin esto, Hydra revienta al cargar.
    global: 'globalThis',
  },
}))
