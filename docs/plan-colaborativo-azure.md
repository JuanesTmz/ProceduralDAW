# SONORA colaborativa en Azure — plan

Estado: **plan aprobado como base, sin implementar** (26 oct 2026).
Este documento es la referencia para retomar el trabajo en otra sesión.
Antes de empezar la fase 1 hay que tener respondidas las preguntas del final.

## 1. Qué se quiere

SONORA se monta en su propio espacio de Azure, igual que la Expedición Docente
(`C:\Escuela Inteligente\Expedicion Docente\Montaje`: un servidor Node/Express
en Azure Container Apps, autenticación a Azure con Managed Identity, código en
Azure DevOps y un Dockerfile simple).

Para la hackatón, cada **equipo** (los «laboratorios») tiene **una cuenta
compartida** y **un solo proyecto**. Entre 5 y 10 chicos entran a la vez desde
sus tablets y editan al mismo tiempo distintas escenas, o distintas partes de
una misma escena, y cada cambio se ve en las demás tablets al instante, como en
Figma o FigJam.

## 2. Decisiones tomadas por Juan

| Tema | Decisión |
|---|---|
| Mismo control tocado por dos personas | **Lo toma la primera** y queda bloqueado hasta que lo suelta. Los demás ven «X lo está moviendo» y el control atenuado, como en Figma. |
| Texto y voz | La misma regla: **uno a la vez por componente** (el monólogo, partir el texto, la voz de cada escena, la voz de corrido). |
| Cuenta | **Una por equipo** (laboratorio = equipo). |
| Proyectos | **Uno por equipo.** |
| Panel de administración | **Sí.** |
| Internet | El evento tendrá WiFi confiable, pero **tiene que haber plan de emergencia** si se cae. |

## 3. Arquitectura

```
Tablets del equipo ──wss (443)──► Azure Container App (Node, 1 réplica)
  · cada una hace sonar su          ├─ app compilada (Vite)
    propia copia del audio          ├─ API: login de equipo, permisos de archivos, admin
  · cada una dibuja su visual       ├─ sincronización en tiempo real (Yjs, una sala por proyecto)
                                    ├─ tabla de bloqueos (en memoria del servidor)
                                    ├─► Azure Database for PostgreSQL: equipos, proyectos, versiones
                                    └─► Azure Blob Storage: voces, fotos, sonidos, videos
```

### Sincronización: Yjs (CRDT)

- Cada tablet tiene una copia del proyecto y manda **solo lo que cambió**.
  Yjs junta los cambios de varias personas sin pisarse y también los cambios
  hechos sin conexión.
- Encaja con el código actual porque todo cambio pasa por un solo punto:
  `actualizar(receta)` en `src/estado/ProyectoContext.tsx` (hoy hace
  `structuredClone` del proyecto, aplica la receta y recalcula `secciones`).
  La idea es comparar antes y después, mandar la diferencia al documento Yjs y
  aplicar al proyecto local lo que llega de los demás.
- **No se sincroniza lo que se calcula solo:** `secciones` (sale de las
  escenas), la reproducción, las vistas previas (`src/audio/vistaPrevia.ts`) y
  el estado de las ventanas.
- **Presencia** (awareness de Yjs): quién está conectado, con qué nombre y
  color, y en qué pantalla o escena.

### Bloqueos (decisión de Juan)

- **El servidor decide:** la tablet pide el bloqueo al tocar y el servidor
  se lo da a la primera solicitud que le llega. No depende de los relojes de las
  tablets.
- **Cuándo se suelta:** al levantar el dedo (deslizadores, Pad, cuadro de tocar,
  pintar celdas), al salir del campo o cerrar la ventana (textos, menús), al
  terminar de grabar (voz), si la tablet se desconecta, por inactividad (unos
  60 s en texto, unos pocos segundos en controles) o desde el panel de admin.
- **Cada pieza que se puede tocar tiene un nombre único.** Ejemplos:
  `escena:<id>:intensidad`, `escena:<id>:pad:<capa>`, `escena:<id>:celdas:<capa>`,
  `historia:monologo`, `historia:cortes`, `voz:<escenaId>`, `voz:corrido`,
  `datos:<destino>`, `visual:mando:<id>`.
- Sin conexión no hay bloqueos: si dos tocaron lo mismo, gana el último al
  juntarse (ver plan de emergencia).

### Piezas de Azure

| Pieza | Para qué | Nota |
|---|---|---|
| Azure Container Apps | App, API, WebSocket de sincronización y bloqueos | Mínimo y máximo **1 réplica** durante el evento (todas las tablets en el mismo servidor, sin arranque en frío). Soporta WebSockets. |
| Azure Container Registry | Imagen del contenedor | Seguramente ya existe por la Expedición. |
| Azure Database for PostgreSQL Flexible (Burstable, el más pequeño) | Equipos, proyectos, versiones, archivos, actividad | Conexión con Managed Identity (sin contraseña). Alternativa: Cosmos DB serverless (límite de 2 MB por documento). |
| Azure Blob Storage | Voces, fotos, sonidos propios, archivos de datos, videos exportados | Contenedor privado. El servidor da permisos temporales de subida y lectura. |
| Log Analytics / Application Insights | Errores y conexiones durante el evento | Viene con el entorno de Container Apps. |
| Entra ID (inicio de sesión de Microsoft) | Solo para el panel de admin | Juan entra con su cuenta de la organización; no hay otra contraseña que cuidar. |

**No hace falta** para unas 100 conexiones: Azure Web PubSub ni SignalR (solo si
algún día hay varias réplicas o miles de usuarios; Web PubSub tiene integración
con Yjs, así que migrar sería sencillo).

**Costo:** del orden de unas decenas de dólares al mes con todo encendido (la
réplica fija y PostgreSQL son lo que más pesa; se pueden apagar fuera del
evento). **Confirmar con la calculadora de precios de Azure.**

### Base de datos

- `equipos`: id, nombre, código, PIN guardado con hash, creado.
- `proyectos`: id, equipo (único), estado del documento Yjs, actualizado.
- `versiones`: id, proyecto, estado Yjs, fecha, motivo (automática cada pocos minutos y antes de acciones grandes).
- `archivos`: id, proyecto, ruta en Blob, tipo, quién lo subió, fecha.
- `actividad`: conexiones, errores y acciones de admin.

### Login

1. Pantalla de entrada: **código del equipo + PIN**. El servidor responde con
   una cookie de sesión segura (HttpOnly). Hay límite de intentos.
2. Luego **«¿Quién eres?»**: nombre y color. No hay cuentas por persona; sirve
   para la presencia y los bloqueos.
3. El WebSocket solo deja entrar al proyecto del equipo de la sesión.

## 4. Fases

Al cerrar cada fase: dejar la app corriendo, explicar cómo probarla y esperar
el visto bueno de Juan antes de seguir.

1. **Servidor, login y guardado en la nube (una persona a la vez).**
   `sonora/server` con Express, Dockerfile al estilo de la Expedición, tablas,
   pantallas de entrada y «¿Quién eres?», guardado y apertura del proyecto
   desde la nube, despliegue.
   *Prueba:* un equipo entra desde dos tablets, una después de la otra, y ve su mismo proyecto.
2. **Archivos en Blob Storage.** Hoy viven en la tablet (`crearUrl` e IndexedDB
   en `src/estado/guardado.ts`). Pasan a subirse al grabarlos o elegirlos; el
   proyecto guarda su enlace.
   *Prueba:* una voz grabada en una tablet suena en la otra.
3. **Sincronización en tiempo real (Yjs).** Adaptar `actualizar`; identidad fija
   para escenas y capas; guardar las celdas de forma que dos ediciones no se
   pisen; sacar del documento lo derivado; agrupar lo que llega por cuadro y
   limitar los arrastres (rendimiento en las Lenovo M10). Es la fase más pesada.
   *Prueba:* dos tablets editan escenas distintas y cada una ve lo de la otra al instante.
4. **Bloqueos y presencia.** Tabla de bloqueos en el servidor, etiqueta
   «X lo está moviendo» en cada control, avatares en el riel de escenas, pestañas
   y ventanas, bloqueo de monólogo, cortes y voz, deshacer por persona si se agrega deshacer.
   *Prueba:* dos personas tocan el mismo control y solo una lo mueve; la otra ve el aviso.
5. **Plan de emergencia** (sección 5).
   *Prueba:* se apaga el WiFi a mitad de una edición, se sigue trabajando y al volver se junta todo.
6. **Panel de administración** (sección 6).
   *Prueba:* Juan crea un equipo, entra con su código y lo ve editar desde el panel.
7. **Ensayo general.** 10 tablets reales en un equipo y varios equipos a la vez;
   medir el rendimiento de las M10, la latencia y si la red del lugar deja pasar
   WebSockets; guía del día del evento (encender la réplica, revisar el panel,
   qué hacer si algo cae, apagar todo al final).

## 5. Plan de emergencia

1. **La app carga sin internet:** se instala como aplicación (service worker) y queda guardada en la tablet.
2. **Sin conexión se sigue trabajando:** cada tablet guarda su copia (Yjs en
   IndexedDB) y muestra «Sin conexión: tus cambios se guardan aquí y se juntan
   al volver». No hay bloqueos mientras tanto; al volver se junta todo solo.
3. **Copia manual:** «Descargar copia del proyecto» (.zip con el proyecto y sus
   archivos) y «Cargar copia», para mover el trabajo entre tablets o subirlo luego.
4. **Plan C (Azure o internet caídos por mucho tiempo):** el mismo contenedor
   corre en un portátil conectado al router del lugar, con HTTPS (necesario para
   el micrófono). Las tablets se conectan a él y al final se sube todo a Azure.
   Dejar los pasos escritos y ensayarlo.
5. **Copias automáticas** en la base de datos cada pocos minutos, restaurables desde el panel.

## 6. Panel de administración

- Crear y editar equipos (nombre, código, PIN) y resetear el PIN.
- Ver en vivo quién está conectado en cada equipo y en qué escena.
- Abrir cualquier proyecto en solo lectura y verlo cambiar en tiempo real.
- Ver y restaurar versiones; liberar un bloqueo atascado.
- Descargar copias y los videos exportados.
- «Congelar edición» al cierre de la hackatón.

## 7. Riesgos

- **Fase 3** (adaptar el modelo de datos) es la más grande: por eso va después de tener login y nube.
- **Rendimiento en las tablets:** agrupar actualizaciones y medirlo en el ensayo.
- **Partir el texto:** hoy las escenas se rehacen a partir de los cortes del monólogo; por eso va con bloqueo y las escenas necesitan identidad fija.
- **Red del lugar:** el WebSocket va por el 443 como una página normal; igual se prueba antes, y si falla queda el Plan C.
- **Ruido:** cada tablet suena por su cuenta; se recomiendan audífonos.

## 8. Preguntas pendientes para Juan

1. **Código:** ¿`sonora` se pasa a Azure DevOps como la Expedición o sigue en GitHub (`juanestmz/ProceduralDAW`)?
2. **Azure:** ¿quién tiene permisos para crear el grupo de recursos y en qué suscripción? ¿Se reusa el entorno de Container Apps de la Expedición o uno nuevo?
3. **Dirección:** ¿dominio que da Azure por defecto o uno propio?
4. **Fecha de la hackatón y número de equipos**, para fijar el calendario de las fases.
5. **GitHub Pages:** ¿la versión publicada sigue viva para practicar sin cuenta?
