/**
 * Caleidoscopio: un fractal plegado sobre sí mismo, en espejo.
 *
 * Son dos ideas de las matemáticas puestas una sobre otra:
 *
 *  1. **El espejo.** El plano se corta en gajos iguales y todo lo que cae en
 *     uno se repite, reflejado, en los demás. Con 3 gajos es un copo de
 *     nieve; con 12, una flor de vitral.
 *  2. **El pliegue.** Cada punto se pasa varias veces por la misma cuenta
 *     —valor absoluto, inversión, resta, giro— y lo que va quedando de cada
 *     pasada se suma. Con cuatro líneas sale una filigrana que nadie dibujó.
 *     Es la familia de los fractales «Kali».
 *
 * Qué hace cada cosa:
 *  - **La música** late con los graves (el patrón respira), gira más rápido
 *    con los agudos y suelta un anillo de luz con cada golpe.
 *  - **El dedo** (cuadro de tocar en vivo) arrastra el centro del espejo: el
 *    caleidoscopio se corre hacia donde lo pones y vuelve solo al soltar.
 *  - **La imagen** se refleja en los gajos: la foto, en espejo, repetida.
 *
 * Como en los demás algoritmos, el tiempo y el giro se acumulan: mover la
 * velocidad o el giro cambia el ritmo desde ahora, sin saltos.
 */
import { aRgb01 } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';
import { contextoGl, crearPrograma, GLSL_COMUN, subirPaleta, TexturaImagen } from './webgl';

const FRAGMENTO = `${GLSL_COMUN}
uniform float uTime, uFase, uGiro, uLados, uZoom, uCapas, uLineas, uHue, uPulso, uAnilloR, uAnilloA, uGrano;
uniform vec2 uCentro;

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0) - uCentro;
  float r = length(p);

  // 1. El espejo: se dobla el plano en uLados gajos.
  float a = atan(p.y, p.x) + uGiro;
  float seg = 6.2831853 / uLados;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 q = r * vec2(cos(a), sin(a));
  q *= uZoom * (1.0 + uPulso * 0.3);

  // 2. El pliegue: la misma cuenta, varias veces, sumando lo que queda.
  vec2 z = q + vec2(uFase * 0.11, -uFase * 0.07);
  float acumulado = 0.0;
  float previo = 0.0;
  for(int i = 0; i < 7; i++){
    if(float(i) >= uCapas) break;
    vec2 c = vec2(0.62 + 0.20 * sin(uFase * 0.23 + float(i)), 0.50 + 0.17 * cos(uFase * 0.19 + float(i) * 1.3));
    z = abs(z) / (dot(z, z) * 0.6 + 0.4) - c;
    z = rot(z, 0.30 + 0.06 * float(i));
    float l = length(z);
    acumulado += abs(l - previo);
    previo = l;
  }
  float v = acumulado / max(uCapas, 1.0);
  v = v / (1.0 + v);                                  // se aplana sin saturar

  vec3 col = rampa(clamp(v * 1.6, 0.0, 1.0));
  col = mix(rampa(0.05), col, smoothstep(0.02, 0.3, v));

  // Las líneas de luz: curvas de nivel del fractal, encendidas.
  float linea = abs(fract(v * 7.0 + uFase * 0.03) - 0.5);
  col += mix(uC3, uC4, 0.6) * smoothstep(0.09, 0.0, linea) * uLineas * 1.4;

  // El centro brilla con los graves y cada golpe suelta un anillo.
  col += uC3 * exp(-r * 3.2) * uPulso * 0.55;
  col += mix(uC4, vec3(1.0), 0.5) * exp(-pow((r - uAnilloR) * 7.0, 2.0)) * uAnilloA;

  col = girarTono(col, uHue);

  if(uImgAmt > 0.001){
    // La foto, reflejada en los gajos y repetida como un mosaico en espejo.
    vec2 m = q * 0.32 + 0.5;
    m = abs(fract(m * 0.5) * 2.0 - 1.0);
    vec3 foto = muestraImg(m) * (0.55 + 0.9 * v);
    col = mix(col, foto, uImgAmt);
  }

  col *= 1.0 - smoothstep(0.55, 1.05, r) * 0.55;       // viñeta
  col += (hash21(uv * 512.0 + fract(uTime)) - 0.5) * uGrano;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class Caleidoscopio implements Instancia {
  private gl: WebGLRenderingContext;
  private programa: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private imagen: TexturaImagen;
  private ancho = 1;
  private alto = 1;
  private fase = 0;
  private giro = 0;
  private pulso = 0;
  /** El centro del espejo, que sigue al dedo con un poco de retraso. */
  private cx = 0;
  private cy = 0;
  private anillo = 9;
  private golpePrevio = 0;
  private edadesPrevias = { destello: 99, zoom: 99, sacudon: 99, corte: 99 };

  constructor(lienzo: HTMLCanvasElement) {
    this.gl = contextoGl(lienzo);
    const { programa, u } = crearPrograma(this.gl, FRAGMENTO, [
      'uTime', 'uFase', 'uGiro', 'uLados', 'uZoom', 'uCapas', 'uLineas', 'uHue', 'uPulso',
      'uAnilloR', 'uAnilloA', 'uGrano', 'uCentro', 'uAspect', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4',
      'uImg', 'uImgAmt', 'uImgAR',
    ]);
    this.programa = programa;
    this.u = u;
    this.imagen = new TexturaImagen(this.gl, u);
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    this.gl.viewport(0, 0, ancho, alto);
  }

  dibujar(e: Entorno): void {
    const gl = this.gl;
    const { parametros: p, bandas, reaccion } = e;
    gl.useProgram(this.programa);
    const aspecto = this.ancho / Math.max(1, this.alto);

    // Todo lo que corre se acumula: cambiar un mando no reescribe el pasado.
    this.fase += e.delta * (0.15 + p.velocidad * 0.85);
    this.giro += e.delta * p.giro * 0.35 * (1 + reaccion * bandas.agudos * 2.2);
    // El pulso sube de golpe con los graves y baja suave.
    const objetivo = reaccion * (bandas.graves * 0.8 + bandas.golpe * 0.6);
    this.pulso += (objetivo - this.pulso) * Math.min(1, e.delta * (objetivo > this.pulso ? 18 : 5));

    // El dedo arrastra el centro; al soltar, vuelve.
    const meta = e.toque ? { x: (e.toque.x - 0.5) * aspecto * 0.6, y: (0.5 - e.toque.y) * 0.6 } : { x: 0, y: 0 };
    const k = Math.min(1, e.delta * 7);
    this.cx += (meta.x - this.cx) * k;
    this.cy += (meta.y - this.cy) * k;

    // Un anillo de luz con el bombo y con cada golpe tocado.
    this.anillo += e.delta;
    if (reaccion > 0.05 && bandas.golpe > 0.55 && this.golpePrevio <= 0.55) this.anillo = 0;
    this.golpePrevio = bandas.golpe;
    for (const tipo of ['destello', 'zoom', 'sacudon', 'corte'] as const) {
      if (e.edadGolpe[tipo] < this.edadesPrevias[tipo]) this.anillo = 0;
      this.edadesPrevias[tipo] = e.edadGolpe[tipo];
    }

    this.imagen.usar(e.imagen?.fuente ?? null, e.imagen?.proporcion ?? 1, e.influenciaImagen, aspecto);
    subirPaleta(gl, this.u, [0, 1, 2, 3, 4].map((i) => aRgb01(e.paleta[i] ?? e.paleta[e.paleta.length - 1])));

    gl.uniform1f(this.u.uTime, e.tiempo);
    gl.uniform1f(this.u.uFase, this.fase);
    gl.uniform1f(this.u.uGiro, this.giro);
    gl.uniform1f(this.u.uLados, Math.max(2, Math.round(p.espejos)));
    gl.uniform1f(this.u.uZoom, 0.6 + (1 - p.tamano) * 2.6);
    gl.uniform1f(this.u.uCapas, Math.round(p.complejidad));
    gl.uniform1f(this.u.uLineas, p.lineas);
    gl.uniform1f(this.u.uHue, p.tono * 6.283 + reaccion * bandas.agudos * 0.5);
    gl.uniform1f(this.u.uPulso, this.pulso);
    gl.uniform1f(this.u.uAnilloR, this.anillo * 0.9);
    gl.uniform1f(this.u.uAnilloA, Math.max(0, 1 - this.anillo / 1.3) * 0.9);
    gl.uniform1f(this.u.uGrano, 0.015);
    gl.uniform2f(this.u.uCentro, this.cx, this.cy);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destruir(): void {
    this.imagen.destruir();
    this.gl.deleteProgram(this.programa);
  }
}

const signoVeces = (v: number) => (Math.abs(v) < 0.03 ? 'quieto' : `${v > 0 ? '↻' : '↺'} ${Math.abs(v).toFixed(2)}×`);

export const caleidoscopio: Algoritmo = {
  id: 'caleidoscopio',
  nombre: 'Caleidoscopio',
  descripcion:
    'Un fractal plegado sobre sí mismo y reflejado en gajos de espejo: la misma cuenta repetida unas cuantas veces dibuja filigranas que nadie dibujó.',
  escucha: 'Los graves hacen latir el patrón · los agudos lo hacen girar · cada golpe suelta un anillo de luz',
  conImagen: 'La foto se refleja en los gajos, repetida como un mosaico en espejo',
  conDatos: 'Tu dedo arrastra el centro del espejo',
  mandos: [
    { id: 'espejos', etiqueta: 'Espejos', min: 3, max: 16, paso: 1, valor: 6, lectura: (v) => `${Math.round(v)} lados` },
    { id: 'tamano', etiqueta: 'Tamaño del patrón', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'complejidad', etiqueta: 'Capas del fractal', min: 2, max: 7, paso: 1, valor: 5, lectura: (v) => `${Math.round(v)}` },
    { id: 'giro', etiqueta: 'Giro', min: -2, max: 2, paso: 0.05, valor: 0.3, lectura: signoVeces },
    { id: 'velocidad', etiqueta: 'Corriente', min: 0, max: 2, paso: 0.05, valor: 0.5, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'lineas', etiqueta: 'Líneas de luz', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'tono', etiqueta: 'Giro de color', min: 0, max: 1, paso: 0.01, valor: 0, lectura: porcentaje },
  ],
  crear: (lienzo) => new Caleidoscopio(lienzo),
};
