/**
 * Lo que comparten los algoritmos que pinta la tarjeta gráfica: armar el
 * programa, cubrir la pantalla con un triángulo, subir la foto como textura
 * y un ruido (simplex) para los shaders.
 *
 * Cada algoritmo trae su fórmula (el fragmento) y lo demás es esto.
 */

export const VERTICE = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** Ruido simplex 2D, la rampa de cinco colores y utilidades de los shaders. */
export const GLSL_COMUN = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec3 uC0, uC1, uC2, uC3, uC4;
uniform sampler2D uImg;
uniform float uImgAmt, uImgAR, uAspect;

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
vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
vec3 girarTono(vec3 col, float a){
  const vec3 k = vec3(0.57735026);
  float cs = cos(a);
  return col * cs + cross(k, col) * sin(a) + k * dot(k, col) * (1.0 - cs);
}
/* La foto, ajustada a la pantalla sin deformarla (cubre, como «cover»). */
vec3 muestraImg(vec2 uv){
  vec2 su = vec2(uv.x, 1.0 - uv.y);
  if (uImgAR > uAspect) su.x = 0.5 + (su.x - 0.5) * (uAspect / uImgAR);
  else                  su.y = 0.5 + (su.y - 0.5) * (uImgAR / uAspect);
  return texture2D(uImg, clamp(su, 0.0, 1.0)).rgb;
}
`;

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

/** El contexto WebGL de un lienzo, o un error que se lee en pantalla. */
export function contextoGl(lienzo: HTMLCanvasElement): WebGLRenderingContext {
  const gl =
    (lienzo.getContext('webgl', { antialias: false, alpha: false }) as WebGLRenderingContext | null) ??
    (lienzo.getContext('experimental-webgl') as WebGLRenderingContext | null);
  if (!gl) throw new Error('Esta tablet no ofrece WebGL');
  return gl;
}

/** Programa de pantalla completa con su triángulo, y la ubicación de cada uniform. */
export function crearPrograma(
  gl: WebGLRenderingContext,
  fragmento: string,
  uniforms: string[],
): { programa: WebGLProgram; u: Record<string, WebGLUniformLocation | null> } {
  const programa = gl.createProgram();
  if (!programa) throw new Error('No se pudo crear el programa');
  gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICE));
  gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, fragmento));
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    throw new Error(`Programa: ${gl.getProgramInfoLog(programa)}`);
  }
  gl.useProgram(programa);

  // Un triángulo enorme que tapa la pantalla: toda la obra pasa en el fragmento.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const nombre of uniforms) u[nombre] = gl.getUniformLocation(programa, nombre);
  return { programa, u };
}

/** La foto como textura; mientras no haya, un píxel negro para que el shader tenga algo. */
export class TexturaImagen {
  private gl: WebGLRenderingContext;
  private u: Record<string, WebGLUniformLocation | null>;
  private textura: WebGLTexture;
  private subida: unknown = null;

  constructor(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation | null>) {
    this.gl = gl;
    this.u = u;
    const textura = gl.createTexture();
    if (!textura) throw new Error('No se pudo crear la textura');
    this.textura = textura;
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(u.uImg, 0);
  }

  /** Sube la foto si cambió y la deja lista para dibujar. */
  usar(fuente: TexImageSource | null, proporcion: number, cuanto: number, aspecto: number): void {
    const gl = this.gl;
    if (fuente && this.subida !== fuente) {
      gl.bindTexture(gl.TEXTURE_2D, this.textura);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fuente);
      this.subida = fuente;
    }
    gl.uniform1f(this.u.uImgAmt, fuente ? cuanto : 0);
    gl.uniform1f(this.u.uImgAR, fuente ? proporcion : 1);
    gl.uniform1f(this.u.uAspect, aspecto);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textura);
  }

  destruir(): void {
    this.gl.deleteTexture(this.textura);
  }
}

/** Los cinco colores de la paleta, al shader. */
export function subirPaleta(
  gl: WebGLRenderingContext,
  u: Record<string, WebGLUniformLocation | null>,
  colores: [number, number, number][],
): void {
  gl.uniform3fv(u.uC0, colores[0]);
  gl.uniform3fv(u.uC1, colores[1]);
  gl.uniform3fv(u.uC2, colores[2]);
  gl.uniform3fv(u.uC3, colores[3]);
  gl.uniform3fv(u.uC4, colores[4]);
}
