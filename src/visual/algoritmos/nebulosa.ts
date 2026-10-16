/**
 * Nebulosa líquida: mármol cósmico pintado por la tarjeta gráfica.
 *
 * Los otros tres algoritmos calculan en la CPU y dibujan formas. Este no
 * dibuja nada: le da a la GPU una fórmula y la GPU la resuelve en cada uno
 * de los píxeles a la vez. La técnica se llama «domain warping» —ruido que
 * deforma las coordenadas de más ruido— y es lo que hace que parezca
 * líquido en vez de humo.
 *
 * Está aquí por dos razones. Una, porque es el más vistoso. Y dos, porque
 * es el que deja ver que un algoritmo no es «un dibujo que se mueve» sino
 * una cuenta: la misma fórmula, resuelta dos millones de veces por cuadro.
 *
 *  - **La música** acelera la corriente con los graves, rota el color con
 *    los agudos y abre la nube con el bombo.
 *  - **La imagen** se vuelve la pintura: el mármol deja de ser color de
 *    paleta y pasa a ser la foto, untada y arrastrada por la corriente.
 *  - **Los datos** son remolinos que arrastran el líquido a su alrededor.
 *
 * Si la tablet no da WebGL, el motor avisa y ofrece otro algoritmo: más
 * vale decirlo que dejar un rectángulo negro.
 */
import { aRgb01 } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';

const MAXIMO_REMOLINOS = 20;

const VERTICE = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENTO = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define MAXC ${MAXIMO_REMOLINOS}
varying vec2 vUv;
uniform float uTime, uAspect, uSpeed, uInfluence;
uniform float uWarp, uFreq, uCover, uHueRot, uGrano;
uniform vec3 uC0, uC1, uC2, uC3, uC4;
uniform vec4 uRemolinos[MAXC];
uniform int uCuantos;
uniform sampler2D uImg;
uniform float uImgAmt, uImgAR;

/* Los datos no encienden luces: mueven el líquido. Cada pico es un remolino
   que arrastra la pintura a su alrededor. */
vec2 corrienteDeDatos(vec2 pc){
  vec2 acc = vec2(0.0);
  for(int i = 0; i < MAXC; i++){
    if(i >= uCuantos) break;
    vec4 c = uRemolinos[i];
    vec2 cp = (c.xy - 0.5) * vec2(uAspect, 1.0);
    vec2 d = pc - cp;
    float r = length(d) + 1e-4;
    float rad = 0.10 + c.z * 0.30;
    float caida = exp(-(r * r) / (rad * rad));
    vec2 tang = vec2(-d.y, d.x) / r;
    acc += tang * c.w * caida * c.z * 1.15;      // el giro
    acc -= (d / r) * caida * c.z * 0.30;         // y la succión al núcleo
  }
  return acc * uInfluence;
}

vec3 muestraImg(vec2 uv){
  vec2 su = vec2(uv.x, 1.0 - uv.y);
  if (uImgAR > uAspect) su.x = 0.5 + (su.x - 0.5) * (uAspect / uImgAR);
  else                  su.y = 0.5 + (su.y - 0.5) * (uImgAR / uAspect);
  return texture2D(uImg, clamp(su, 0.0, 1.0)).rgb;
}

vec3 girarTono(vec3 col, float a){
  const vec3 k = vec3(0.57735026);
  float cs = cos(a);
  return col * cs + cross(k, col) * sin(a) + k * dot(k, col) * (1.0 - cs);
}

vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x){ return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 4; i++){ v += a * snoise(p); p *= 2.0; a *= 0.5; } return v; }

vec3 rampa(float x){
  x = clamp(x, 0.0, 1.0);
  if(x < 0.25) return mix(uC0, uC1, x / 0.25);
  if(x < 0.50) return mix(uC1, uC2, (x - 0.25) / 0.25);
  if(x < 0.75) return mix(uC2, uC3, (x - 0.50) / 0.25);
  return mix(uC3, uC4, (x - 0.75) / 0.25);
}
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

/* La imagen no se superpone al mármol: ES la pintura. Se muestrea con las
   coordenadas ya arrastradas por la corriente, como óleo untado con espátula. */
vec3 oleo(vec2 uv, vec2 wv, vec2 df, float fn, float rl){
  float amp = 0.012 + 0.05 * clamp(uWarp / 4.5, 0.0, 1.0);
  vec2 duv = uv + wv * amp + df * amp * 0.9;
  vec3 c0 = muestraImg(duv);
  vec3 c1 = muestraImg(duv + wv * amp * 0.75);
  vec3 base = mix(c0, c1, 0.40);
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  vec3 col = base * (0.68 + 0.72 * fn);
  float brillo = smoothstep(0.30, 1.0, rl) * (0.30 + 0.70 * lum);
  col += mix(vec3(1.0), rampa(clamp(lum + 0.15, 0.0, 1.0)), 0.55) * brillo * 0.45;
  col = mix(col, col * rampa(clamp(fn * 0.8 + rl * 0.45, 0.0, 1.0)) * 1.75, 0.18);
  return col;
}

void main(){
  vec2 uv = vUv;
  float t = uTime * (0.15 + uSpeed * 0.85);
  vec2 pc = (uv - 0.5) * vec2(uAspect, 1.0);
  vec2 df = corrienteDeDatos(pc);
  vec2 p = pc * uFreq + df * 0.55;
  vec2 w = vec2(fbm(p + t * 0.10 + df * 0.30), fbm(p + vec2(6.3, 1.8) - t * 0.08 - df.yx * 0.30));
  float f = fbm(p * 1.15 + uWarp * w);
  float fn = clamp(f * 0.5 + 0.5, 0.0, 1.0);
  float rl = clamp(dot(w, w) * 0.7, 0.0, 1.0);
  float grande = fbm(p * 0.5 + vec2(30.0) + t * 0.03) * 0.5 + 0.5;
  float mascara = smoothstep(uCover, uCover + 0.42, grande);
  float nube = fn * mascara;
  float x = clamp(nube * 1.25, 0.0, 1.0);

  vec3 col = rampa(x);
  col = mix(col, uC4, rl * smoothstep(0.5, 1.0, x) * 0.6);
  vec3 vacio = mix(uC0, uC1, 0.35);
  col = mix(vacio, col, smoothstep(0.01, 0.22, nube));
  col = girarTono(col, uHueRot);
  col += mix(uC4, vec3(1.0, 0.96, 0.9), 0.5) * smoothstep(0.45, 1.0, rl) * length(df) * 0.22;

  if(uImgAmt > 0.001) col = mix(col, oleo(uv, w, df, fn, rl), uImgAmt);
  col += (hash21(uv * 512.0 + fract(uTime)) - 0.5) * uGrano;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string): WebGLShader {
  const sh = gl.createShader(tipo);
  if (!sh) throw new Error('No se pudo crear el shader');
  gl.shaderSource(sh, fuente);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader: ${log}`);
  }
  return sh;
}

class Nebulosa implements Instancia {
  private gl: WebGLRenderingContext;
  private programa: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private textura: WebGLTexture;
  /** Para no volver a subir la misma imagen en cada cuadro. */
  private imagenSubida: unknown = null;
  private ancho = 1;
  private alto = 1;

  constructor(lienzo: HTMLCanvasElement) {
    const gl =
      (lienzo.getContext('webgl', { antialias: false, alpha: false }) as WebGLRenderingContext) ??
      (lienzo.getContext('experimental-webgl') as WebGLRenderingContext);
    if (!gl) throw new Error('Esta tablet no ofrece WebGL');
    this.gl = gl;

    const programa = gl.createProgram();
    if (!programa) throw new Error('No se pudo crear el programa');
    gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICE));
    gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTO));
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
      throw new Error(`Programa: ${gl.getProgramInfoLog(programa)}`);
    }
    this.programa = programa;
    gl.useProgram(programa);

    // Dos triángulos que tapan la pantalla: toda la obra pasa en el fragmento.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(programa, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    for (const nombre of [
      'uTime', 'uAspect', 'uSpeed', 'uInfluence', 'uWarp', 'uFreq', 'uCover', 'uHueRot',
      'uGrano', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4', 'uRemolinos', 'uCuantos', 'uImg',
      'uImgAmt', 'uImgAR',
    ]) {
      this.u[nombre] = gl.getUniformLocation(programa, nombre);
    }

    const textura = gl.createTexture();
    if (!textura) throw new Error('No se pudo crear la textura');
    this.textura = textura;
    gl.bindTexture(gl.TEXTURE_2D, textura);
    // Un píxel negro mientras no haya imagen: así el shader siempre tiene algo.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(this.u.uImg, 0);
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

    if (e.imagen && this.imagenSubida !== e.imagen) {
      gl.bindTexture(gl.TEXTURE_2D, this.textura);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.imagen.fuente);
      this.imagenSubida = e.imagen;
    }

    const colores = [0, 1, 2, 3, 4].map((i) => aRgb01(e.paleta[i] ?? e.paleta[e.paleta.length - 1]));
    gl.uniform3fv(this.u.uC0, colores[0]);
    gl.uniform3fv(this.u.uC1, colores[1]);
    gl.uniform3fv(this.u.uC2, colores[2]);
    gl.uniform3fv(this.u.uC3, colores[3]);
    gl.uniform3fv(this.u.uC4, colores[4]);

    gl.uniform1f(this.u.uTime, e.tiempo);
    gl.uniform1f(this.u.uAspect, this.ancho / Math.max(1, this.alto));
    // Los graves aceleran la corriente; el resto son los mandos de la derecha.
    gl.uniform1f(this.u.uSpeed, p.velocidad * (1 + reaccion * bandas.graves * 0.9));
    gl.uniform1f(this.u.uWarp, p.pliegue * (1 + reaccion * bandas.medios * 0.5));
    gl.uniform1f(this.u.uFreq, 0.6 + (1 - p.tamano) * 5);
    // El bombo abre la nube: se ve como si respirara con la pieza.
    gl.uniform1f(this.u.uCover, Math.max(0.05, p.cobertura - reaccion * bandas.golpe * 0.22));
    // Los agudos giran el color.
    gl.uniform1f(this.u.uHueRot, p.tono * 6.283 + reaccion * bandas.agudos * 0.9);
    gl.uniform1f(this.u.uGrano, p.grano * 0.03);
    gl.uniform1f(this.u.uInfluence, e.influenciaDatos);

    const remolinos = new Float32Array(MAXIMO_REMOLINOS * 4);
    const cuantos = Math.min(MAXIMO_REMOLINOS, e.picos.length);
    for (let i = 0; i < cuantos; i++) {
      const pico = e.picos[i];
      remolinos[i * 4] = pico.x;
      remolinos[i * 4 + 1] = 1 - pico.y; // el shader tiene la y hacia arriba
      remolinos[i * 4 + 2] = pico.fuerza;
      remolinos[i * 4 + 3] = pico.giro;
    }
    gl.uniform4fv(this.u.uRemolinos, remolinos);
    gl.uniform1i(this.u.uCuantos, cuantos);

    gl.uniform1f(this.u.uImgAmt, e.imagen ? e.influenciaImagen : 0);
    gl.uniform1f(this.u.uImgAR, e.imagen ? e.imagen.proporcion : 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textura);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destruir(): void {
    const gl = this.gl;
    gl.deleteTexture(this.textura);
    gl.deleteProgram(this.programa);
  }
}

export const nebulosa: Algoritmo = {
  id: 'nebulosa',
  nombre: 'Nebulosa líquida',
  descripcion:
    'Mármol cósmico resuelto por la tarjeta gráfica: ruido que deforma las coordenadas de más ruido, dos millones de veces por cuadro.',
  escucha: 'Los graves aceleran la corriente · los agudos giran el color · el bombo abre la nube',
  conImagen: 'La foto se vuelve la pintura, untada y arrastrada por la corriente',
  conDatos: 'Cada dato es un remolino que arrastra el líquido',
  mandos: [
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 2, paso: 0.05, valor: 0.45, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'pliegue', etiqueta: 'Pliegue', min: 0, max: 6, paso: 0.1, valor: 2.6, lectura: (v) => v.toFixed(1) },
    { id: 'tamano', etiqueta: 'Tamaño de las vetas', min: 0, max: 1, paso: 0.02, valor: 0.55, lectura: porcentaje },
    { id: 'cobertura', etiqueta: 'Cuánto cubre', min: 0.05, max: 0.9, paso: 0.02, valor: 0.45, lectura: porcentaje },
    { id: 'tono', etiqueta: 'Giro de color', min: 0, max: 1, paso: 0.01, valor: 0, lectura: porcentaje },
    { id: 'grano', etiqueta: 'Grano', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
  ],
  crear: (lienzo) => new Nebulosa(lienzo),
};
