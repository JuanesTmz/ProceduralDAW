# Servidor de SONORA en la nube

Un solo proceso Node (Express 5) que sirve la app compilada en modo nube
(`npm run build:nube` → `dist-nube/`) y la API de los equipos. Es la versión
para la hackatón; la de GitHub Pages sigue igual, sin cuentas ni nube.

## Probar en el computador

```bash
# en sonora/
npm --prefix server install
npm run build:nube          # o `npm run nube` para desarrollar con recarga (proxy a :3000)
npm run servidor            # http://localhost:3000, datos en server/.datos
npm --prefix server run equipo -- "Los Truenos" "una contraseña"
```

Sin `SQL_SERVIDOR` los datos van a la carpeta `server/.datos` (también sirve
para el plan C: el servidor en un portátil en el lugar del evento).

## Pruebas automáticas

```bash
npm --prefix server run prueba     # 22 pruebas: entrar, equipos, admins, archivos, galería, sala en vivo, edición cerrada
npm --prefix server run estres     # estrés: 5 equipos × 8 tablets editando a la vez durante 20 s
npm --prefix server run estres -- --equipos 10 --tablets 10 --segundos 60 --ritmo 5
```

Las dos levantan su propio servidor con datos en una carpeta temporal: no tocan
Azure ni `server/.datos`. Para estresar la nube de verdad:

```bash
npm --prefix server run estres -- --url https://ca-upb-dev-sonora-01.greenflower-4a24a026.eastus2.azurecontainerapps.io --admin-clave <clave>
```

Crea equipos temporales `estres-…` y los borra al terminar. El estrés pasa si
todos los cambios llegaron, nadie se cayó y el 95 % tardó menos de 1 s.

## Variables

| Variable | Para qué |
|---|---|
| `PORT` | Puerto (3000 si no se dice). |
| `SESION_SECRETO` | Firma la cookie de sesión. Sin ella, las sesiones mueren al reiniciar. |
| `SQL_SERVIDOR`, `SQL_BASE` | Azure SQL. Sin ellas, datos en carpeta. |
| `AZURE_CLIENT_ID` | La identidad administrada con la que entra a SQL y a Blob (en Azure). |
| `BLOB_CUENTA` | Cuenta de Azure Storage para los archivos. Sin ella, archivos en `.datos/archivos`. |
| `DATOS_CARPETA` | Otra carpeta para los datos locales. |
| `HTTPS_CERT`, `HTTPS_KEY` | Certificado y llave para servir por HTTPS (los pone `npm run plan-c`). |
| `ADMIN_CLAVE` | Contraseña del panel (se entra con el nombre «Admin»). Sin ella, el panel no deja entrar. En Azure es el secreto `admin-clave`. |

## API

- `POST /api/entrar` `{equipo, clave}` → cookie de sesión (HttpOnly), o la del panel si el nombre es «Admin».
  El nombre se compara normalizado (sin mayúsculas, tildes ni espacios de más; columna `equipos.codigo`).
  8 fallos en 10 min por IP y nombre → espera.
- `POST /api/videos` (el video en el cuerpo, hasta 400 MB) y `GET /api/videos/:id`: la galería.
- `GET /api/sesion`, `POST /api/salir`.
- `GET /api/proyecto` → `{proyecto, version}`: la última copia legible guardada.
- **WebSocket `/api/sala`** (protocolo de y-websocket): la sala en tiempo real del
  equipo de la sesión (`salas.js`). Solo con cookie y desde la misma página.
  El documento se guarda 2 s después de cada cambio (como mucho cada 10 s) y
  al irse el último; cada 5 min queda una copia en `versiones`.
- `POST /api/archivos` (el archivo en el cuerpo, con su `Content-Type`; audio,
  imagen, video o CSV; hasta 60 MB) → `{url: "/api/archivos/<id>"}`.
- `GET /api/archivos/:id` → el archivo, solo para su equipo. Acepta `Range` y se
  guarda en la caché de la tablet (nunca cambia).

## Archivos

Las voces, fotos y sonidos entran a la app como URLs `blob:` que solo existen
en esa tablet. `src/nube/archivos.ts` busca en el proyecto las que esta tablet
conoce, las sube y cambia cada una por su `/api/archivos/<id>`; ese cambio
viaja por la sala y las demás tablets ya pueden abrirlo. Si la subida falla,
se reintenta. El contenido va al contenedor privado `archivos` de
`stupbdevsonora01` (`equipo-<id>/<uuid>`) y la tabla `archivos` anota de quién
es cada uno. En el portal se ven en Storage account → Containers → archivos.

## Tiempo real

`compartido/proyectoYjs.js` (lo usan la app y el servidor) reparte el proyecto
en un documento Yjs: los objetos como mapas, las listas con id (escenas,
pistas, conexiones…) como un mapa por elemento más su orden, y las demás
listas (pasos, notas, gestos) enteras. `secciones` no viaja: cada tablet la
calcula. En la tablet, `src/nube/sala.ts` escribe la diferencia de cada cambio
y arma lo que llega de las demás; `ProyectoContext` encadena los dos sin perder
nada.

## Bloqueos y presencia

Una pieza la mueve una persona a la vez, y lo decide el servidor: la primera
tablet que la pide se la queda (`salas.js`, mensaje propio 10 sobre el mismo
WebSocket). Cada pieza que se puede tocar lleva `data-bloqueo="<nombre>"` en
el HTML; `src/nube/bloqueos.ts` la pide al tocarla y la suelta al levantar el
dedo (o al salir del texto, o al terminar de grabar con `useBloqueoMientras`),
y marca con `data-bloqueado-por` las que tienen otras personas; `nube.css` las
atenúa con el nombre y el color de quien las tiene. Lo que lleva `data-libre`
(como oír una capa sola) sigue respondiendo. Si nadie renueva una pieza (6 s
un toque, 60 s un texto, 30 s una grabación) o la tablet se desconecta, se
suelta sola.

Nombres en uso: `historia:que|porQue|monologo|cortes`, `voz:<escena>`,
`voz:corrido`, `escena:<id|general>:nombre|sentir|foto|reacciones|vivo`,
`escena:<id|general>:capa:<pista>` (fila, celdas, Pad, Golpes y Notas),
`general:ritmo`, `sonido:<pista>`, `visual:estilo|paleta`, `datos:<lista>:<parámetro>`.

La presencia va por la de Yjs: cada tablet anuncia su persona y su lugar (paso,
escena, pestaña) y `<Caras en={…} />` muestra quién está en cada paso, escena y
pestaña.

Límite conocido: si un equipo **nuevo** abre desde dos tablets en el mismo
instante, las dos crean el proyecto inicial y se juntan duplicados. Conviene
que la primera tablet entre sola.

## Panel de administración

Se entra desde la entrada normal de la app, con el nombre **Admin** y la
contraseña `ADMIN_CLAVE`: en vez de la app se abre el panel
(`src/nube/admin/PanelAdmin.tsx`, API en `admin.js`, cookie propia `sonora_admin`).
Tiene dos pestañas, **Equipos** y **Galería**.

- Ver todos los equipos; crearlos, cambiarles nombre o contraseña y
  **Eliminarlos** (con su proyecto, versiones, archivos y videos).
- **Galería**: los videos finales que los equipos mandan desde Función
  («Exportar video» → «Enviar a la galería»; tabla `videos`, archivos en
  `equipo-<id>/videos/`). Se ven, se descargan y se borran; cada tarjeta de
  equipo muestra además su último video.
- Ver en vivo quién está conectado en cada equipo y dónde (paso, escena,
  pestaña, ventana), y qué piezas tiene tomadas; **Soltar** una atascada.
- **Ver en vivo**: abre la app del equipo en `/?ver=<id>`, en solo lectura y
  sin aparecer entre los presentes (el servidor no aplica nada de esa conexión).
- **Versiones**: las automáticas (cada 5 min con cambios), **Guardar versión
  ahora** y **Restaurar**. Restaurar deja antes una versión «Antes de
  restaurar» y escribe la vuelta como un cambio más, que llega en vivo.
- **Descargar copia** del equipo (el mismo .zip que desde la tablet).
- **Cerrar edición** de un equipo o de todos (columna `equipos.congelado`): las
  tablets ven «Edición cerrada», pueden mirar y escuchar pero no cambiar, y el
  servidor no aplica lo que manden. Al abrirla de nuevo, siguen normal.

Cambiar la clave en Azure:

```bash
az containerapp secret set -g RG-UPB-DEV-SONORA -n ca-upb-dev-sonora-01 --secrets admin-clave=<nueva>
az containerapp revision restart -g RG-UPB-DEV-SONORA -n ca-upb-dev-sonora-01 \
  --revision $(az containerapp show -g RG-UPB-DEV-SONORA -n ca-upb-dev-sonora-01 --query properties.latestRevisionName -o tsv)
```

## Sin conexión y plan C

- `src/nube/sw.js` (el build le agrega la lista de archivos) deja la app y la
  Sonoteca guardadas en la tablet; los archivos del equipo quedan guardados al
  abrirlos.
- La sala guarda su documento en IndexedDB (`y-indexeddb`): sin conexión se
  sigue editando y se puede recargar; si la tablet ya tenía copia, abre con
  ella sin esperar al servidor. Sin internet se entra con el último equipo de
  la tablet.
- `src/nube/copias.ts`: «Descargar copia» y «Cargar una copia» (un .zip con el
  proyecto y sus archivos), en el menú de la persona.
- Plan C: `npm run plan-c` (HTTPS con certificado propio), `npm run
  traer-de-azure` antes y `npm run subir-a-azure` después. Los pasos para el
  día del evento están en `docs/plan-c.md`.

## Base de datos

Tablas `equipos`, `proyectos` (el proyecto como JSON legible en `contenido` y el
documento Yjs en `estado_yjs`),
`versiones`, `archivos` y `actividad`. Las crea el servidor al arrancar. Se pueden mirar
desde el portal: SQL database → *Query editor*, entrando con la cuenta de la
organización. Por ejemplo:

```sql
SELECT e.nombre, p.version, p.autor, p.actualizado,
       JSON_VALUE(p.contenido, '$.nombre') AS pieza, JSON_QUERY(p.contenido, '$.historia') AS historia
FROM proyectos p JOIN equipos e ON e.id = p.equipo_id;
```

## Azure (grupo `RG-UPB-DEV-SONORA`, East US 2)

| Recurso | Nombre |
|---|---|
| Container Apps (entorno / app) | `cae-upb-dev-sonora-01` / `ca-upb-dev-sonora-01` |
| Container Registry Basic | `crupbdevsonora01` |
| Azure SQL serverless (oferta gratuita, sigue cobrando si se pasa) | `sql-upb-dev-sonora-01` / `sqldb-upb-dev-sonora-01` |
| Log Analytics (tope 0,1 GB/día) | `law-upb-dev-sonora-01` |
| Storage Standard LRS (solo con identidad; papelera de 7 días) | `stupbdevsonora01` |
| Identidad administrada (AcrPull, usuario en SQL, Storage Blob Data Contributor) | `id-upb-dev-sonora-01` |

Publicar una versión nueva (desde `sonora/`):

```bash
az acr build -r crupbdevsonora01 -t sonora:<etiqueta> .
az containerapp update -g RG-UPB-DEV-SONORA -n ca-upb-dev-sonora-01 \
  --image crupbdevsonora01.azurecr.io/sonora:<etiqueta>
```

El acceso de la identidad a SQL se dio una vez con `scripts/acceso-sql.js`.

## Créditos

Diseñado y desarrollado por **Juan Esteban Trillos**
([www.linkedin.com/in/juan-esteban-trillos](https://www.linkedin.com/in/juan-esteban-trillos)).
