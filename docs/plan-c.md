# SONORA · plan de emergencia

Qué hacer si algo falla el día de la hackatón, de lo más leve a lo más grave.
El detalle técnico está en `server/README.md`.

## 1. Se va el WiFi un rato (plan A)

No hay que hacer nada.

- La app ya está guardada en cada tablet: abre aunque no haya internet,
  siempre que la tablet haya entrado antes con internet al menos una vez.
- Arriba a la derecha dice **«Sin conexión · se guarda aquí»**. Se sigue
  trabajando normal; se puede recargar la página sin perder nada.
- Mientras no hay conexión **no hay bloqueos**: si dos personas tocan lo mismo,
  al volver queda lo último.
- Al volver el WiFi dice **«En vivo»** y lo de todas las tablets se junta solo.
- Lo que no funciona sin conexión: ver en vivo lo de las otras tablets y que
  una voz o foto nueva llegue a las demás (se sube sola al volver).

## 2. Hay que pasar el trabajo a otra tablet sin internet (plan B)

En el menú de la persona (arriba a la derecha, tocando el nombre):

- **Descargar copia del proyecto**: baja un `.zip` con el proyecto y sus voces,
  fotos y sonidos.
- **Cargar una copia…**: elige ese `.zip` y, tras confirmar, reemplaza el
  proyecto de todo el equipo por la copia. Sus archivos se suben solos.

Conviene que cada equipo descargue una copia a mitad de jornada y al final.

## 3. Azure o internet caídos por mucho tiempo (plan C)

El mismo servidor corre en un portátil conectado al router del lugar.

### Antes del evento (con internet, una vez)

1. En el portátil, con el repositorio y Node 22 o más:

   ```bash
   cd sonora
   npm install
   npm --prefix server install
   npm run build:nube
   ```

2. Entrar a Azure (`az login`) con la cuenta de la organización y traer los
   equipos, sus proyectos y sus archivos:

   ```bash
   SQL_SERVIDOR=sql-upb-dev-sonora-01.database.windows.net \
   SQL_BASE=sqldb-upb-dev-sonora-01 \
   BLOB_CUENTA=stupbdevsonora01 \
   npm --prefix server run traer-de-azure
   ```

   Repetirlo la mañana del evento, después de crear los equipos definitivos.
3. Ensayarlo: `npm --prefix server run plan-c` y entrar desde una tablet.

### Si hay que activarlo

1. Conectar el portátil al router del evento (mejor por cable) y correr
   `npm --prefix server run plan-c`. Muestra la dirección, por ejemplo
   `https://192.168.1.5:3443`.
2. En cada tablet, abrir esa dirección. La primera vez Chrome avisa que la
   conexión no es privada: **Avanzado → Continuar**. Es nuestro propio
   certificado; hace falta HTTPS para poder grabar.
3. Cada equipo entra con su mismo nombre y contraseña. Si una tablet tenía trabajo sin
   subir a Azure, lo pasa con **Descargar copia** (en la dirección de Azure,
   aunque no haya internet la app abre) y **Cargar una copia** (en el portátil).
4. Lo que cambie la dirección del portátil (otra red) rehace el certificado
   solo; hay que volver a aceptarlo en las tablets.

### Al terminar: devolver todo a Azure

Con internet de nuevo, y **sin tablets conectadas a Azure** (una sala abierta
en la nube guardaría encima su propia versión):

```bash
SQL_SERVIDOR=... SQL_BASE=... BLOB_CUENTA=... npm --prefix server run subir-a-azure
```

No pisa: junta lo del portátil con lo que haya en Azure y sube los archivos
nuevos. Si alguna tablet seguía conectada a Azure, reiniciar la app desde el
portal (Container App → Revisiones → Reiniciar) y volver a correrlo.

## 4. Copias automáticas

El servidor deja una copia de cada proyecto cada 5 minutos en la tabla
`versiones` de la base (con el JSON legible y el documento Yjs). Desde el
panel de administración (se entra con el nombre «Admin») se ven, se guardan a mano y se restauran.

---

*Diseñado y desarrollado por Juan Esteban Trillos · [www.linkedin.com/in/juan-esteban-trillos](https://www.linkedin.com/in/juan-esteban-trillos)*
