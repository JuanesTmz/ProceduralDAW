// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const FIRMA = '/*! SONORA · Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos */'

/** La firma queda también al principio de cada archivo compilado (JS y CSS) que baja el navegador. */
function firmar(): Plugin {
  return {
    name: 'sonora-firma',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opciones, paquete) {
      for (const pieza of Object.values(paquete)) {
        if (pieza.type === 'chunk') pieza.code = `${FIRMA}\n${pieza.code}`
        else if (pieza.fileName.endsWith('.css')) pieza.source = `${FIRMA}\n${pieza.source}`
      }
    },
  }
}

/**
 * Solo en la nube: escribe el service worker (src/nube/sw.js) con la lista de
 * todo lo que la tablet debe guardar para abrir sin internet.
 */
function serviceWorkerNube(): Plugin {
  const salida = path.resolve('dist-nube')
  const recorrer = (carpeta: string): string[] =>
    fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
      const ruta = path.join(carpeta, e.name)
      return e.isDirectory() ? recorrer(ruta) : [path.relative(salida, ruta).split(path.sep).join('/')]
    })
  return {
    name: 'sonora-service-worker',
    apply: 'build',
    closeBundle() {
      const lista = recorrer(salida)
        .filter((f) => !['index.html', 'sw.js'].includes(f))
        .map((f) => encodeURI(`/${f}`))
      const fuente = fs
        .readFileSync(path.resolve('src/nube/sw.js'), 'utf8')
        .replace('__VERSION__', String(Date.now()))
        .replace('self.__PRECARGA__', JSON.stringify(['/', ...lista]))
      fs.writeFileSync(path.join(salida, 'sw.js'), fuente)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  // En GitHub Pages la app cuelga de /ProceduralDAW/, pero en desarrollo
  // queremos la raíz limpia: por eso la base depende del comando.
  // La versión en la nube (`--mode nube`) la sirve su propio servidor, en la raíz.
  base: command === 'build' && mode !== 'nube' ? '/ProceduralDAW/' : '/',
  build: {
    outDir: mode === 'nube' ? 'dist-nube' : 'dist',
  },
  // En desarrollo, la API la responde el servidor de `server/` (npm run servidor).
  server: mode === 'nube' ? { proxy: { '/api': { target: 'http://localhost:3000', ws: true } } } : undefined,
  // `npm run tablet` sirve por HTTPS en la red local: el micrófono del
  // navegador solo funciona con HTTPS, y así la tablet puede grabar.
  plugins:
    mode === 'tablet'
      ? [react(), basicSsl()]
      : mode === 'nube'
        ? [react(), firmar(), serviceWorkerNube()]
        : [react(), firmar()],
  define: {
    // hydra-synth viene empaquetado para Node y usa `global`, que en el
    // navegador no existe. Sin esto, Hydra revienta al cargar.
    global: 'globalThis',
  },
}))
