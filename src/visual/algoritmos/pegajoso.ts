/**
 * Pegajoso: figuras que se funden unas con otras como gotas de miel.
 *
 * Parte de un shader de «Creative Coding Challenge» con el tema «Sticky»:
 * varias cruces repartidas al azar, cada una descrita por su FUNCIÓN DE
 * DISTANCIA (qué tan lejos está cada punto de su borde), y unidas con un
 * «mínimo suave». El mínimo normal de dos distancias deja las figuras
 * separadas; el suave las hace puentearse cuando se acercan, como si
 * estuvieran pegajosas. Además la escena se calcula dos veces, en dos
 * momentos distintos, y se pasa de una a otra con una transición suave.
 *
 * Aquí las figuras no tienen por qué ser cruces, y reaccionan:
 *  - **La música** vuelve más pegajosas las figuras con los graves (se
 *    puentean más), las hincha con el bombo y cambia el tono con los agudos.
 *  - **El dedo** (cuadro de tocar en vivo) es una figura grande más: acércala
 *    a las otras y se funden con ella.
 *  - **Los datos** suman una figura por cada pico.
 *  - **La imagen** se ve a través de las figuras, como un vitral.
 *
 * Mandos: qué figura (cruz, círculo, cuadrado, triángulo, rombo o mezcla),
 * cuántas, qué tan pegajosas, su tamaño, el grosor de los brazos, el giro, las
 * curvas de nivel y cada cuánto se pasa de una escena a la otra.
 *
 * El tiempo, el giro y la transición se acumulan cuadro a cuadro: mover un
 * mando cambia el ritmo desde ahora y no hace saltar la imagen.
 */
import { aRgb01 } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { eleccion, porcentaje } from './tipos';
import { contextoGl, crearPrograma, GLSL_COMUN, subirPaleta, TexturaImagen } from './webgl';

const MAXIMO_FIGURAS = 24;
const MAXIMO_EXTRAS = 8;
const FIGURAS = ['Cruces', 'Círculos', 'Cuadrados', 'Triángulos', 'Rombos', 'Mezcla'];

const FRAGMENTO = `${GLSL_COMUN}
#define MAXN ${MAXIMO_FIGURAS}
#define MAXE ${MAXIMO_EXTRAS}
uniform float uTime, uFaseB, uCuantas, uGrosor, uPeg, uCont, uFigura, uPulso, uHue, uGiro, uTam;
uniform vec3 uExtras[MAXE];
uniform int uNExtras;
/* Cada figura de cada escena ya viene resuelta de la CPU: x, y, tamaño y ángulo.
   Calcular senos y azares por píxel y por figura era trabajo de más. */
uniform vec4 uA[MAXN];
uniform vec4 uB[MAXN];
uniform vec2 uAtrib[MAXN];     // x: atributo de color · y: qué figura es (para la mezcla)

/* Las distancias de cada figura al punto q (negativa dentro). r es su tamaño. */
float sdCruz(vec2 q, float r, float g){
  vec2 a = abs(q);
  float brazo = r * g;
  return min(max(a.x - brazo, a.y - r), max(a.x - r, a.y - brazo));
}
float sdCuadrado(vec2 q, float r){ vec2 a = abs(q) - vec2(r * 0.78); return length(max(a, 0.0)) + min(max(a.x, a.y), 0.0) - r * 0.08; }
float sdRombo(vec2 q, float r){ return (abs(q.x) + abs(q.y)) - r * 1.05; }
float sdTriangulo(vec2 p, float r){
  const float k = 1.7320508;
  p /= 1.15;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if(p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y) * 1.15;
}

float figura(vec2 q, float r, float t){
  if(t < 0.5) return sdCruz(q, r, uGrosor);
  if(t < 1.5) return length(q) - r * 0.85;
  if(t < 2.5) return sdCuadrado(q, r);
  if(t < 3.5) return sdTriangulo(q, r * 0.8);
  return sdRombo(q, r);
}

/* Mínimo suave que además mezcla un atributo (el color): las figuras
   se pegan y sus colores se funden en el puente. */
vec2 pegar(vec2 a, vec2 b, float k){
  float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0);
  return vec2(mix(b.x, a.x, h) - k * h * (1.0 - h), mix(b.y, a.y, h));
}

/* La escena: el conjunto A o el B, ya con las posiciones resueltas. */
vec2 escena(vec2 p, bool primera, float k){
  vec2 acc = vec2(1.0e3, 0.0);
  for(int i = 0; i < MAXN; i++){
    if(float(i) >= uCuantas) break;
    vec4 f = primera ? uA[i] : uB[i];
    vec2 at = uAtrib[i];
    float d = figura(rot(p - f.xy, f.w), f.z * (1.0 + uPulso * 0.35), at.y);
    acc = pegar(acc, vec2(d, at.x), k);
  }
  // El dedo y los datos: figuras grandes que también se pegan.
  for(int j = 0; j < MAXE; j++){
    if(j >= uNExtras) break;
    vec3 e = uExtras[j];
    vec2 pos = vec2((e.x - 0.5) * uAspect, 0.5 - e.y);
    float r = uTam * 0.24 * (0.6 + e.z * 0.8) * (1.0 + uPulso * 0.2);
    float d = figura(rot(p - pos, uGiro + float(j)), r, uFigura > 4.5 ? mod(float(j), 5.0) : uFigura);
    acc = pegar(acc, vec2(d, 0.9), k);
  }
  return acc;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  float k = max(0.004, uPeg);

  // Dos escenas en dos momentos distintos, y una transición suave entre ellas.
  vec2 a = escena(p, true, k);
  vec2 b = escena(p, false, k);
  float m = smoothstep(0.3, 0.7, 0.5 + 0.5 * sin(uFaseB));
  float d = mix(a.x, b.x, m);
  float c = mix(a.y, b.y, m);

  vec3 col = uC0 * 0.5;
  col += rampa(0.25 + 0.5 * c) * exp(-max(d, 0.0) * 14.0) * 0.28;       // resplandor fuera

  float dentro = 1.0 - smoothstep(-0.004, 0.004, d);
  vec3 interior = rampa(clamp(0.38 + 0.5 * c - d * 2.6, 0.0, 1.0));
  if(uImgAmt > 0.001){
    vec3 foto = muestraImg(uv);
    interior = mix(interior, foto * (0.7 + 0.5 * clamp(-d * 8.0, 0.0, 1.0)), uImgAmt);
  }
  col = mix(col, interior, dentro);

  // Las curvas de nivel de la distancia, dentro y fuera.
  float lin = 1.0 - smoothstep(0.0, 0.1, abs(fract(d * uCont + 0.5) - 0.5));
  col += mix(uC3, uC4, 0.5) * lin * 0.38 * step(0.01, uCont);

  // El borde de las figuras.
  col += uC4 * (1.0 - smoothstep(0.0, 0.012, abs(d))) * 0.85;

  col = girarTono(col, uHue);
  col *= 1.0 - smoothstep(0.55, 1.1, length(p)) * 0.45;
  col += (hash21(uv * 512.0 + fract(uTime)) - 0.5) * 0.015;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class Pegajoso implements Instancia {
  private gl: WebGLRenderingContext;
  private programa: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private imagen: TexturaImagen;
  private ancho = 1;
  private alto = 1;
  private fase = 0;
  private faseTransicion = 0;
  private conjuntoA = new Float32Array(MAXIMO_FIGURAS * 4);
  private conjuntoB = new Float32Array(MAXIMO_FIGURAS * 4);
  private atributos = new Float32Array(MAXIMO_FIGURAS * 2);
  private giro = 0;
  private pulso = 0;

  constructor(lienzo: HTMLCanvasElement) {
    this.gl = contextoGl(lienzo);
    const { programa, u } = crearPrograma(this.gl, FRAGMENTO, [
      'uTime', 'uFaseB', 'uGiro', 'uCuantas', 'uTam', 'uGrosor', 'uPeg', 'uCont', 'uFigura',
      'uPulso', 'uHue', 'uA', 'uB', 'uAtrib', 'uExtras', 'uNExtras', 'uAspect', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4',
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

  /**
   * Dónde está cada figura en el instante t: una trayectoria propia para cada
   * una, que sale de la semilla. Se resuelve aquí, una vez por cuadro, y no
   * en cada píxel de la pantalla.
   */
  private colocar(destino: Float32Array, t: number, cuantas: number, tam: number, aspecto: number, giro: number, semilla: number): void {
    for (let i = 0; i < cuantas; i++) {
      const id = i + semilla;
      const h1 = azar(id, 1);
      const h2 = azar(id, 2);
      const h3 = azar(id, 3);
      const h4 = azar(id, 4);
      const h5 = azar(id, 5);
      const h6 = azar(id, 6);
      destino[i * 4] = Math.sin(t * (0.15 + 0.25 * h1) + h2 * 6.2832) * 0.62 * aspecto;
      destino[i * 4 + 1] = Math.cos(t * (0.12 + 0.22 * h3) + h4 * 6.2832) * 0.44;
      destino[i * 4 + 2] = tam * (0.05 + 0.15 * h5);
      destino[i * 4 + 3] = giro * (0.6 + h6) + h6 * 6.2832;
    }
  }

  dibujar(e: Entorno): void {
    const gl = this.gl;
    const { parametros: p, bandas, reaccion } = e;
    gl.useProgram(this.programa);

    // Todo lo que corre se acumula: cambiar un mando no reescribe el pasado.
    this.fase += e.delta * (0.15 + p.velocidad * 0.85);
    this.faseTransicion += e.delta * (0.05 + p.cambio * 0.9);
    this.giro += e.delta * p.giro * 0.4;
    const objetivo = reaccion * (bandas.golpe * 0.9 + bandas.graves * 0.4);
    this.pulso += (objetivo - this.pulso) * Math.min(1, e.delta * (objetivo > this.pulso ? 20 : 5));

    this.imagen.usar(e.imagen?.fuente ?? null, e.imagen?.proporcion ?? 1, e.influenciaImagen, this.ancho / Math.max(1, this.alto));
    subirPaleta(gl, this.u, [0, 1, 2, 3, 4].map((i) => aRgb01(e.paleta[i] ?? e.paleta[e.paleta.length - 1])));

    // Los graves vuelven las figuras más pegajosas: se puentean desde más lejos.
    const pegajoso = 0.01 + p.pegajoso * 0.32 + reaccion * bandas.graves * 0.1;
    const cuantas = Math.min(MAXIMO_FIGURAS, Math.round(p.cantidad));
    const tam = 0.3 + p.tamano * 1.1;
    const aspecto = this.ancho / Math.max(1, this.alto);
    const semilla = (e.semilla % 997) * 0.37;
    // Las dos escenas: el mismo reparto en dos momentos distintos.
    this.colocar(this.conjuntoA, this.fase, cuantas, tam, aspecto, this.giro, semilla);
    this.colocar(this.conjuntoB, this.fase + 13, cuantas, tam, aspecto, this.giro, semilla);
    for (let i = 0; i < cuantas; i++) {
      const id = i + semilla;
      this.atributos[i * 2] = azar(id, 6);
      // Con «Mezcla», cada figura sortea la suya.
      this.atributos[i * 2 + 1] = p.figura > 4.5 ? Math.floor(azar(id, 31) * 5) : Math.round(p.figura);
    }
    gl.uniform4fv(this.u.uA, this.conjuntoA);
    gl.uniform4fv(this.u.uB, this.conjuntoB);
    gl.uniform2fv(this.u.uAtrib, this.atributos);

    gl.uniform1f(this.u.uTime, e.tiempo);
    gl.uniform1f(this.u.uFaseB, this.faseTransicion);
    gl.uniform1f(this.u.uGiro, this.giro);
    gl.uniform1f(this.u.uCuantas, cuantas);
    gl.uniform1f(this.u.uTam, tam);
    gl.uniform1f(this.u.uGrosor, 0.12 + p.grosor * 0.5);
    gl.uniform1f(this.u.uPeg, pegajoso);
    gl.uniform1f(this.u.uCont, p.curvas * 14);
    gl.uniform1f(this.u.uFigura, Math.round(p.figura));
    gl.uniform1f(this.u.uPulso, this.pulso);
    gl.uniform1f(this.u.uHue, p.tono * 6.283 + reaccion * bandas.agudos * 0.6);

    const extras = new Float32Array(MAXIMO_EXTRAS * 3);
    const cuantos = Math.min(MAXIMO_EXTRAS, e.picos.length);
    for (let i = 0; i < cuantos; i++) {
      extras[i * 3] = e.picos[i].x;
      extras[i * 3 + 1] = e.picos[i].y;
      extras[i * 3 + 2] = e.picos[i].fuerza;
    }
    gl.uniform3fv(this.u.uExtras, extras);
    gl.uniform1i(this.u.uNExtras, cuantos);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destruir(): void {
    this.imagen.destruir();
    this.gl.deleteProgram(this.programa);
  }
}

/** Un azar repetible de dos números: la misma figura cae siempre en el mismo sitio. */
function azar(a: number, b: number): number {
  let h = Math.imul(Math.floor(a * 1000), 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const signoVeces = (v: number) => (Math.abs(v) < 0.03 ? 'quietas' : `${v > 0 ? '↻' : '↺'} ${Math.abs(v).toFixed(2)}×`);

export const pegajoso: Algoritmo = {
  id: 'pegajoso',
  nombre: 'Pegajoso',
  descripcion:
    'Figuras que se funden como gotas de miel: cada una sabe a qué distancia está su borde, y un mínimo suave las puentea cuando se acercan.',
  escucha: 'Los graves las vuelven más pegajosas · el bombo las hincha · los agudos cambian el tono',
  conImagen: 'La foto se ve a través de las figuras, como un vitral',
  conDatos: 'Tu dedo (y cada dato) es una figura grande más, que se pega a las demás',
  mandos: [
    eleccion('figura', 'Figura', FIGURAS, 0),
    { id: 'cantidad', etiqueta: 'Cuántas', min: 3, max: MAXIMO_FIGURAS, paso: 1, valor: 12, lectura: (v) => `${Math.round(v)}` },
    { id: 'pegajoso', etiqueta: 'Qué tan pegajosas', min: 0, max: 1, paso: 0.02, valor: 0.55, lectura: porcentaje },
    { id: 'tamano', etiqueta: 'Tamaño', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
    { id: 'grosor', etiqueta: 'Grosor de los brazos (cruces)', min: 0, max: 1, paso: 0.02, valor: 0.3, lectura: porcentaje },
    { id: 'giro', etiqueta: 'Giro', min: -2, max: 2, paso: 0.05, valor: 0.3, lectura: signoVeces },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 2, paso: 0.05, valor: 0.5, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'curvas', etiqueta: 'Curvas de nivel', min: 0, max: 1, paso: 0.02, valor: 0.35, lectura: porcentaje },
    { id: 'cambio', etiqueta: 'Cambio entre escenas', min: 0, max: 1, paso: 0.02, valor: 0.3, lectura: porcentaje },
    { id: 'tono', etiqueta: 'Giro de color', min: 0, max: 1, paso: 0.01, valor: 0, lectura: porcentaje },
  ],
  crear: (lienzo) => new Pegajoso(lienzo),
};
