# SONORA — narrativa musical

Herramienta web para contar una historia de Medellín envuelta en música que
**se genera por reglas** y tiene **estructura** (intro, cuerpo, giro, cierre).

Hecha para el reto final del SmartFest, con estudiantes de 8° a 11°. Es
**100% interactiva**: el estudiante nunca ve ni escribe código. Todo en español.

**Demo:** https://juanestmz.github.io/ProceduralDAW/

---

## La idea

El corazón es el **relato** —un monólogo de unas 100 palabras, narrado—. La
música procedural y el visual reactivo son el vehículo que lo amplifica.

Dos niveles de música:

- **El patrón** — el loop, armado en un secuenciador de pasos.
- **Las secciones** — el arco: Intro → Cuerpo → Giro → Cierre. La pieza avanza
  de principio a fin y termina; no es un bucle plano.

Y por debajo, un motor generativo propio: semilla reproducible, probabilidad
por paso, ritmos euclidianos y mutación.

## Qué se puede hacer

| Paso | Qué hace |
|---|---|
| **Pantalla 0** | Elegir Urban Lab (IA / Música Urbana). Cambia el orden de la guía y su lenguaje, **no** el acceso: las dos rutas usan todas las herramientas. |
| **Historia** | Qué vas a contar y por qué es Medellín. |
| **Monólogo** | Editor con contador de ~100 palabras, grabadora de voz (o subir audio), y reparto del texto entre las secciones. |
| **Arco** | La curva del relato. Cada punto escribe la intensidad y las capas de una sección. |
| **Patrón** | Grilla de 16/32/64 pasos, kit de percusión sintetizado, subir sample, matriz tonal de 16 notas con acordes y escalas, reverb/eco/filtro. |
| **Motor** | Semilla, Variar, Mutar, reglas euclidianas y probabilísticas por fila, candado, probabilidad por paso, y un mapa de reglas legible. |
| **Secciones** | Capas, intensidad, tempo, semilla y desvanecido por sección. |
| **Visual** | Tres presets procedurales reactivos al FFT, imagen propia como fuente, y texto cinético sincronizado con la narración. |
| **Exportar** | Puerta que revisa los mínimos antes de dejar exportar. |

## Lo que todavía no está

- **Exportar de verdad** (WAV, video, ficha del jurado): los botones existen y
  la puerta funciona, pero la exportación aún no.
- **Guardado**: no hay persistencia. Si recargas la página, se pierde el trabajo.
- **PWA / offline**, Sonoteca de Medellín, sampleadero con slices y galería.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:5173/

El navegador no deja sonar hasta el primer clic: dale a **▶ Tocar** o a la
barra espaciadora.

## Stack

- **Vite + React + TypeScript**
- **Tone.js** para todo el audio (Transport, síntesis, samples, secciones)
- **Motor generativo propio**: `mulberry32` con semilla, ritmos euclidianos
  (Bjorklund), probabilidad por paso y mutación
- **Hydra** (`hydra-synth`) + `AnalyserNode` para el visual reactivo
- CSS propio, sin librerías de UI ni fuentes externas (tiene que funcionar offline)

## Sobre las referencias

El modelo de interacción del secuenciador se inspira en las cajas de ritmos por
pasos, y el de la matriz tonal en ToneMatrix. **La implementación es original**:
no se usa código, sonidos ni marca de terceros. Toda la percusión está
sintetizada con Tone.js.
