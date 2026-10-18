/**
 * Nebulosa líquida: mármol cósmico pintado por la tarjeta gráfica.
 *
 * Los otros algoritmos calculan en la CPU y dibujan formas. Este no dibuja
 * nada: le da a la GPU una fórmula y la GPU la resuelve en cada píxel a la
 * vez. La técnica se llama «domain warping» —ruido que deforma las
 * coordenadas de más ruido— y es lo que hace que parezca líquido.
 *
 * Cada mando toca UNA cosa, y se nota:
 *
 *  - **Velocidad**: cuánto corre la corriente por dentro de las manchas.
 *  - **Deriva**: cuánto viajan las manchas por la pantalla (a 0 se quedan
 *    quietas aunque la corriente siga).
 *  - **Pliegue**: cuánto se retuerce el líquido sobre sí mismo.
 *  - **Tamaño de las vetas**: el grano del dibujo dentro de cada mancha.
 *  - **Manchas**: cuántas hay y de qué tamaño (independiente de las vetas).
 *  - **Cuánto cubre**: cuánta pantalla ocupan.
 *  - **Filo**: de nube suave a mármol de bordes duros, en bandas.
 *  - **Remolino**: tuerce todo el dibujo en espiral, como una galaxia.
 *  - **Espejos**: lo dobla en un caleidoscopio de 2 a 8 lados.
 *  - **Venas de luz**: curvas de nivel que brillan sobre el mármol.
 *
 * El tiempo no es `tiempo × velocidad`: se va sumando cuadro a cuadro. Si se
 * multiplicara, mover la velocidad haría saltar todo el dibujo de golpe.
 *
 *  - **La música** acelera la corriente con los graves, rota el color con
 *    los agudos y abre la nube con el bombo.
 *  - **La imagen** se vuelve la pintura, untada por la corriente.
 *  - **El dedo y los datos** son remolinos que arrastran el líquido.
 */
import { aRgb01 } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { porcentaje } from './tipos';
import { contextoGl, crearPrograma, GLSL_COMUN, subirPaleta, TexturaImagen } from './webgl';

const MAXIMO_REMOLINOS = 20;

const FRAGMENTO = `${GLSL_COMUN}
#define MAXC ${MAXIMO_REMOLINOS}
uniform float uTime, uFase, uFaseB, uInfluence;
uniform float uWarp, uFreq, uBlob, uCover, uSoft, uEdge, uTwist, uMirror, uVeins, uHueRot, uGrano;
uniform vec2 uDeriva;
uniform vec4 uRemolinos[MAXC];
uniform int uCuantos;

/* Los datos y el dedo no encienden luces: mueven el líquido. Cada pico es un
   remolino que arrastra la pintura a su alrededor. */
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

/* Dobla el plano en uMirror gajos iguales: lo que cae en un gajo se repite
   en espejo en todos los demás. */
vec2 plegar(vec2 p){
  if (uMirror < 1.5) return p;
  float r = length(p);
  float a = atan(p.y, p.x);
  float seg = 6.2831853 / uMirror;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  return r * vec2(cos(a), sin(a));
}

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
  vec2 pc = (uv - 0.5) * vec2(uAspect, 1.0);
  vec2 df = corrienteDeDatos(pc);

  // El remolino tuerce más el centro que los bordes: una espiral, no una rotación.
  float r0 = length(pc);
  vec2 ps = rot(pc, uTwist * (1.5 - r0) * 2.4);
  ps = plegar(ps);

  vec2 p = ps * uFreq + df * 0.55;
  float t = uFase;
  vec2 w = vec2(fbm(p + t * 0.10 + df * 0.30), fbm(p + vec2(6.3, 1.8) - t * 0.08 - df.yx * 0.30));
  float f = fbm(p * 1.15 + uWarp * w);
  float fn = clamp(f * 0.5 + 0.5, 0.0, 1.0);
  float rl = clamp(dot(w, w) * 0.7, 0.0, 1.0);

  // Las manchas tienen su propia escala y su propia deriva: no dependen de las vetas.
  float grande = fbm(ps * uBlob + uDeriva * uFaseB + vec2(30.0)) * 0.5 + 0.5;
  float mascara = smoothstep(uCover, uCover + uSoft, grande);
  float nube = fn * mascara;
  float x = clamp(nube * 1.25, 0.0, 1.0);
  x = mix(x, smoothstep(0.30, 0.70, x), uEdge);      // el filo: bandas duras

  vec3 col = rampa(x);
  col = mix(col, uC4, rl * smoothstep(0.5, 1.0, x) * 0.6);
  vec3 vacio = mix(uC0, uC1, 0.35);
  float borde = mix(0.22, 0.03, uEdge);
  col = mix(vacio, col, smoothstep(0.01, borde, nube));
  col = girarTono(col, uHueRot);
  col += mix(uC4, vec3(1.0, 0.96, 0.9), 0.5) * smoothstep(0.45, 1.0, rl) * length(df) * 0.22;

  // Venas de luz: las curvas de nivel del mármol, encendidas.
  float c = abs(fract(fn * 7.0 + t * 0.04) - 0.5);
  float vena = smoothstep(0.075, 0.0, c) * smoothstep(0.02, 0.2, nube);
  col += mix(uC3, uC4, 0.6) * vena * uVeins * 1.5;

  if(uImgAmt > 0.001){
    vec2 uvImg = uMirror > 1.5 ? ps / vec2(uAspect, 1.0) + 0.5 : uv;
    col = mix(col, oleo(uvImg, w, df, fn, rl), uImgAmt);
  }
  col += (hash21(uv * 512.0 + fract(uTime)) - 0.5) * uGrano;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class Nebulosa implements Instancia {
  private gl: WebGLRenderingContext;
  private programa: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private imagen: TexturaImagen;
  private ancho = 1;
  private alto = 1;
  /** El tiempo de la corriente: se va sumando, no se multiplica. */
  private fase = 0;
  /** El tiempo de la deriva de las manchas. */
  private faseDeriva = 0;

  constructor(lienzo: HTMLCanvasElement) {
    this.gl = contextoGl(lienzo);
    const { programa, u } = crearPrograma(this.gl, FRAGMENTO, [
      'uTime', 'uFase', 'uFaseB', 'uAspect', 'uInfluence', 'uWarp', 'uFreq', 'uBlob', 'uCover',
      'uSoft', 'uEdge', 'uTwist', 'uMirror', 'uVeins', 'uHueRot', 'uGrano', 'uDeriva',
      'uC0', 'uC1', 'uC2', 'uC3', 'uC4', 'uRemolinos', 'uCuantos', 'uImg', 'uImgAmt', 'uImgAR',
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

    // Los graves aceleran la corriente. El tiempo se acumula: cambiar el mando
    // cambia el ritmo desde ahora, no reescribe el pasado.
    this.fase += e.delta * (0.15 + p.velocidad * 0.85) * (1 + reaccion * bandas.graves * 0.9);
    this.faseDeriva += e.delta * p.deriva * 0.25;

    this.imagen.usar(e.imagen?.fuente ?? null, e.imagen?.proporcion ?? 1, e.influenciaImagen, this.ancho / Math.max(1, this.alto));
    subirPaleta(gl, this.u, [0, 1, 2, 3, 4].map((i) => aRgb01(e.paleta[i] ?? e.paleta[e.paleta.length - 1])));

    gl.uniform1f(this.u.uTime, e.tiempo);
    gl.uniform1f(this.u.uFase, this.fase);
    gl.uniform1f(this.u.uFaseB, this.faseDeriva);
    gl.uniform1f(this.u.uWarp, p.pliegue * (1 + reaccion * bandas.medios * 0.5));
    gl.uniform1f(this.u.uFreq, 0.6 + (1 - p.tamano) * 5);
    gl.uniform1f(this.u.uBlob, 0.35 + p.manchas * 2.6);
    // El bombo abre la nube: se ve como si respirara con la pieza.
    gl.uniform1f(this.u.uCover, Math.max(0.05, p.cobertura - reaccion * bandas.golpe * 0.22));
    gl.uniform1f(this.u.uSoft, 0.42 - p.filo * 0.38);
    gl.uniform1f(this.u.uEdge, p.filo);
    gl.uniform1f(this.u.uTwist, p.remolino);
    gl.uniform1f(this.u.uMirror, Math.round(p.espejos));
    gl.uniform1f(this.u.uVeins, p.venas);
    // Los agudos giran el color.
    gl.uniform1f(this.u.uHueRot, p.tono * 6.283 + reaccion * bandas.agudos * 0.9);
    gl.uniform1f(this.u.uGrano, p.grano * 0.03);
    gl.uniform1f(this.u.uInfluence, e.influenciaDatos);
    // La dirección en que viajan las manchas sale de la semilla.
    const angulo = (e.semilla % 628) / 100;
    gl.uniform2f(this.u.uDeriva, Math.cos(angulo), Math.sin(angulo));

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

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destruir(): void {
    this.imagen.destruir();
    this.gl.deleteProgram(this.programa);
  }
}

const signo = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;

export const nebulosa: Algoritmo = {
  id: 'nebulosa',
  nombre: 'Nebulosa líquida',
  descripcion:
    'Mármol cósmico resuelto por la tarjeta gráfica: ruido que deforma las coordenadas de más ruido, dos millones de veces por cuadro.',
  escucha: 'Los graves aceleran la corriente · los agudos giran el color · el bombo abre la nube',
  conImagen: 'La foto se vuelve la pintura, untada y arrastrada por la corriente',
  conDatos: 'Cada dato (y tu dedo) es un remolino que arrastra el líquido',
  mandos: [
    { id: 'velocidad', etiqueta: 'Velocidad de la corriente', min: 0, max: 2, paso: 0.05, valor: 0.45, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'deriva', etiqueta: 'Deriva de las manchas', min: 0, max: 2, paso: 0.05, valor: 0.5, lectura: (v) => (v < 0.03 ? 'quietas' : `${v.toFixed(2)}×`) },
    { id: 'pliegue', etiqueta: 'Pliegue', min: 0, max: 6, paso: 0.1, valor: 2.6, lectura: (v) => v.toFixed(1) },
    { id: 'tamano', etiqueta: 'Tamaño de las vetas', min: 0, max: 1, paso: 0.02, valor: 0.55, lectura: porcentaje },
    { id: 'manchas', etiqueta: 'Tamaño de las manchas', min: 0, max: 1, paso: 0.02, valor: 0.4, lectura: porcentaje },
    { id: 'cobertura', etiqueta: 'Cuánto cubre', min: 0.05, max: 0.9, paso: 0.02, valor: 0.45, lectura: porcentaje },
    { id: 'filo', etiqueta: 'Filo (nube ↔ mármol)', min: 0, max: 1, paso: 0.02, valor: 0.15, lectura: porcentaje },
    { id: 'remolino', etiqueta: 'Remolino', min: -1, max: 1, paso: 0.02, valor: 0, lectura: signo },
    { id: 'espejos', etiqueta: 'Espejos', min: 0, max: 8, paso: 1, valor: 0, lectura: (v) => (v < 2 ? 'sin espejo' : `${Math.round(v)} lados`) },
    { id: 'venas', etiqueta: 'Venas de luz', min: 0, max: 1, paso: 0.02, valor: 0.1, lectura: porcentaje },
    { id: 'tono', etiqueta: 'Giro de color', min: 0, max: 1, paso: 0.01, valor: 0, lectura: porcentaje },
    { id: 'grano', etiqueta: 'Grano', min: 0, max: 1, paso: 0.02, valor: 0.5, lectura: porcentaje },
  ],
  crear: (lienzo) => new Nebulosa(lienzo),
};
