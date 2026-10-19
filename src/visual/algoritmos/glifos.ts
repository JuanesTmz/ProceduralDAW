/**
 * Constelación de glifos: la pantalla como una rejilla de caracteres, y la
 * foto pasada a letras.
 *
 * Es la idea más vieja del arte por computadora —dibujar con letras— puesta
 * a correr en tiempo real y en la tarjeta gráfica. La pantalla se parte en
 * casillas; en cada una se mide qué tan clara es la imagen (o el ruido, si
 * no hay foto) y ese número elige un carácter de la escala: lo oscuro, un
 * punto; lo claro, una «@» o un bloque. El carácter se pinta con el color
 * de la paleta o con el color original de la foto, y se pueden mezclar.
 *
 * Encima de eso, las deformaciones, cada una con su mando:
 *  - **Ondulación**: cada fila de letras se mece de lado a lado, como una bandera.
 *  - **Remolino**: la imagen se tuerce en espiral antes de pasarla a letras.
 *  - **Turbulencia**: el ruido la arruga, como imagen vista a través de agua.
 *  - **Lluvia digital**: columnas que caen, con cabeza brillante y estela.
 *  - **Centelleo**: cada carácter parpadea hacia sus vecinos de la escala.
 *  - **Interferencia**: filas que se corren de golpe, como señal mala (y con el bombo).
 *  - **Negativo**: lo claro se vuelve oscuro.
 * Y el alfabeto: de «.:-=+*#%@» a código, hex, katakana, formas, o las
 * letras de su propio relato.
 *
 * El dedo y los datos arremolinan la imagen; la música abre la constelación
 * (la amplitud sube lo que se ve) y el bombo la sacude.
 */
import { aRgb01 } from '../paletas';
import type { Algoritmo, Entorno, Instancia } from './tipos';
import { eleccion, porcentaje } from './tipos';
import { ALFABETOS, caracteresDe, construirAtlas, GLIFO_ALTO, GLIFO_ANCHO } from './atlasGlifos';
import { contextoGl, crearPrograma, GLSL_COMUN, subirPaleta, TexturaImagen } from './webgl';

const MAXIMO_REMOLINOS = 20;
/** Un glifo de terminal es más alto que ancho. */
const PROPORCION_CELDA = 0.56;

const FRAGMENTO = `${GLSL_COMUN}
#define MAXC ${MAXIMO_REMOLINOS}
uniform sampler2D uAtlas;
uniform vec2 uRes, uCelda;
uniform float uTime, uFase, uN, uColor, uFondo, uContraste, uUmbral, uOnda, uRemolino, uTurb;
uniform float uLluvia, uCentelleo, uGlitch, uInvertir, uEscala, uHue, uInfluence, uPulso;
uniform vec4 uRemolinos[MAXC];
uniform int uCuantos;

vec2 corriente(vec2 pc){
  vec2 acc = vec2(0.0);
  for(int i = 0; i < MAXC; i++){
    if(i >= uCuantos) break;
    vec4 c = uRemolinos[i];
    vec2 cp = (c.xy - 0.5) * vec2(uAspect, 1.0);
    vec2 d = pc - cp;
    float r = length(d) + 1e-4;
    float rad = 0.10 + c.z * 0.30;
    float caida = exp(-(r * r) / (rad * rad));
    acc += (vec2(-d.y, d.x) / r) * c.w * caida * c.z * 1.15 - (d / r) * caida * c.z * 0.30;
  }
  return acc * uInfluence;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);     // píxeles, origen arriba a la izquierda
  float filas = uRes.y / uCelda.y;
  float fila0 = floor(px.y / uCelda.y);

  // Deformar la rejilla: la ondulación mece cada fila y la interferencia la corre de golpe.
  px.x += uOnda * 70.0 * sin(fila0 * 0.33 + uFase * 3.0);
  float tic = floor(uTime * 16.0);
  float falla = step(0.72, hash21(vec2(fila0, tic))) * uGlitch;
  px.x += falla * (hash21(vec2(fila0 * 1.7, tic)) - 0.5) * uRes.x * 0.4;

  vec2 celda = floor(px / uCelda);
  vec2 centro = (celda + 0.5) * uCelda;
  vec2 uvArriba = vec2(centro.x / uRes.x, 1.0 - centro.y / uRes.y);

  // Deformar lo que se mira: remolino, turbulencia y la corriente del dedo y los datos.
  vec2 pc = (uvArriba - 0.5) * vec2(uAspect, 1.0);
  vec2 df = corriente(pc);
  float r0 = length(pc);
  vec2 ps = rot(pc, uRemolino * (1.5 - r0) * 2.4);
  ps += uTurb * 0.14 * vec2(snoise(pc * 3.0 + uFase), snoise(pc * 3.0 + vec2(7.3, 2.1) - uFase));
  ps += df * 0.22;
  vec2 uvS = ps / vec2(uAspect, 1.0) + 0.5;

  // Cuánta luz hay en esta casilla: de la foto si la hay, del ruido si no.
  float ruidoL = fbm(ps * uEscala + vec2(uFase * 0.1) + df * 0.4) * 0.5 + 0.5;
  vec3 foto = vec3(0.0);
  float l = ruidoL;
  if(uImgAmt > 0.001){
    foto = muestraImg(uvS);
    // Se levantan un poco los oscuros: una foto de noche no debe quedar en blanco.
    float lf = pow(dot(foto, vec3(0.299, 0.587, 0.114)), 0.7);
    l = mix(ruidoL, lf, uImgAmt);
  }
  l = clamp((l - 0.5) * uContraste + 0.5, 0.0, 1.0);
  l = mix(l, 1.0 - l, uInvertir);

  // Lluvia digital: cada columna tiene una cabeza que baja y deja estela.
  if(uLluvia > 0.001){
    float cabeza = fract(hash21(vec2(celda.x, 3.0)) * 7.0 + uFase * (0.35 + 0.9 * hash21(vec2(celda.x, 9.0))));
    float d = fract(cabeza - celda.y / filas);
    float estela = pow(1.0 - d, 3.0);
    l = mix(l, clamp(l * (0.2 + 1.7 * estela) + step(d, 0.012) * 0.9, 0.0, 1.0), uLluvia);
  }

  float visible = smoothstep(uUmbral, uUmbral + 0.06, l);
  float n = clamp((l - uUmbral) / max(0.05, 1.0 - uUmbral), 0.0, 0.999);
  float indice = floor(n * uN);

  // Centelleo: el carácter salta a uno vecino de la escala.
  float chispa = hash21(celda + vec2(floor(uTime * 9.0), 1.0));
  if(chispa < uCentelleo * 0.6) indice += floor(hash21(celda + vec2(floor(uTime * 9.0), 5.0)) * 3.0) - 1.0;
  indice = clamp(indice, 0.0, uN - 1.0);

  // El glifo de esta casilla, de la tira.
  vec2 local = clamp(fract(px / uCelda), 0.03, 0.97);
  float tinta = texture2D(uAtlas, vec2((indice + local.x) / uN, local.y)).a;

  // Color: el de la paleta según la luz, el de la foto, o una mezcla.
  vec3 dePaleta = rampa(0.15 + 0.85 * n);
  vec3 color = dePaleta;
  if(uImgAmt > 0.001){
    float m = max(max(foto.r, foto.g), foto.b);
    vec3 viva = foto / max(m, 0.2) * (0.35 + 0.65 * m);        // los oscuros no desaparecen
    color = mix(dePaleta, viva, uColor);
  }
  color *= 0.55 + 0.6 * n + uPulso * 0.35;

  vec3 fondo = uC0 * 0.45;
  if(uImgAmt > 0.001) fondo += foto * uFondo * 0.5;
  vec3 col = mix(fondo, color, tinta * visible);
  col = girarTono(col, uHue);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class Glifos implements Instancia {
  private gl: WebGLRenderingContext;
  private programa: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private imagen: TexturaImagen;
  private atlas: WebGLTexture;
  private cantidad = 2;
  /** Qué atlas hay subido: alfabeto y letras, para rehacerlo solo si cambió. */
  private claveAtlas = '';
  private ancho = 1;
  private alto = 1;
  private fase = 0;
  private pulso = 0;
  private golpePrevio = 0;
  private glitch = 0;

  constructor(lienzo: HTMLCanvasElement) {
    this.gl = contextoGl(lienzo);
    const { programa, u } = crearPrograma(this.gl, FRAGMENTO, [
      'uAtlas', 'uRes', 'uCelda', 'uTime', 'uFase', 'uN', 'uColor', 'uFondo', 'uContraste', 'uUmbral',
      'uOnda', 'uRemolino', 'uTurb', 'uLluvia', 'uCentelleo', 'uGlitch', 'uInvertir', 'uEscala', 'uHue',
      'uInfluence', 'uPulso', 'uRemolinos', 'uCuantos', 'uAspect', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4',
      'uImg', 'uImgAmt', 'uImgAR',
    ]);
    this.programa = programa;
    this.u = u;
    this.imagen = new TexturaImagen(this.gl, u);
    const textura = this.gl.createTexture();
    if (!textura) throw new Error('No se pudo crear la textura de glifos');
    this.atlas = textura;
    this.gl.uniform1i(u.uAtlas, 1);
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    this.gl.viewport(0, 0, ancho, alto);
  }

  /** Sube el atlas del alfabeto elegido si cambió. */
  private preparar(indice: number, texto: string): void {
    const caracteres = caracteresDe(indice, texto);
    const clave = `${indice}|${caracteres}`;
    if (clave === this.claveAtlas) return;
    this.claveAtlas = clave;
    const { lienzo, cantidad } = construirAtlas(caracteres);
    this.cantidad = cantidad;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lienzo);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
  }

  dibujar(e: Entorno): void {
    const gl = this.gl;
    const { parametros: p, bandas, reaccion } = e;
    gl.useProgram(this.programa);

    this.preparar(Math.round(p.alfabeto), e.texto);

    // El tiempo se acumula: mover la velocidad no hace saltar la constelación.
    this.fase += e.delta * p.velocidad * 0.5;
    // El pulso sube con el bombo y cae suave; la interferencia con el bombo y el corte.
    const objetivo = reaccion * (bandas.golpe * 0.8 + bandas.amplitud * 0.3);
    this.pulso += (objetivo - this.pulso) * Math.min(1, e.delta * (objetivo > this.pulso ? 20 : 6));
    if (reaccion > 0.05 && bandas.golpe > 0.55 && this.golpePrevio <= 0.55) this.glitch = 1;
    this.golpePrevio = bandas.golpe;
    if (e.edadGolpe.corte < e.delta + 0.001) this.glitch = 1;
    this.glitch = Math.max(0, this.glitch - e.delta * 3.5);

    this.imagen.usar(e.imagen?.fuente ?? null, e.imagen?.proporcion ?? 1, e.influenciaImagen, this.ancho / Math.max(1, this.alto));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.activeTexture(gl.TEXTURE0);
    subirPaleta(gl, this.u, [0, 1, 2, 3, 4].map((i) => aRgb01(e.paleta[i] ?? e.paleta[e.paleta.length - 1])));

    // La amplitud destapa la constelación: en silencio solo se ven las zonas claras.
    const umbral = Math.max(0, p.umbral - reaccion * bandas.amplitud * 0.3);
    const alto = Math.max(5, p.cuerpo);
    gl.uniform2f(this.u.uRes, this.ancho, this.alto);
    gl.uniform2f(this.u.uCelda, alto * PROPORCION_CELDA, alto);
    gl.uniform1f(this.u.uTime, e.tiempo);
    gl.uniform1f(this.u.uFase, this.fase);
    gl.uniform1f(this.u.uN, this.cantidad);
    gl.uniform1f(this.u.uColor, p.color);
    gl.uniform1f(this.u.uFondo, p.fondo);
    gl.uniform1f(this.u.uContraste, p.contraste);
    gl.uniform1f(this.u.uUmbral, umbral);
    gl.uniform1f(this.u.uOnda, p.ondulacion);
    gl.uniform1f(this.u.uRemolino, p.remolino);
    gl.uniform1f(this.u.uTurb, p.turbulencia);
    gl.uniform1f(this.u.uLluvia, p.lluvia);
    gl.uniform1f(this.u.uCentelleo, Math.min(1, p.centelleo + reaccion * bandas.agudos * 0.5));
    gl.uniform1f(this.u.uGlitch, Math.min(1, p.interferencia * 0.5 + this.glitch * (0.3 + p.interferencia)));
    gl.uniform1f(this.u.uInvertir, p.negativo);
    gl.uniform1f(this.u.uEscala, 0.8 + (1 - p.tamano) * 5);
    gl.uniform1f(this.u.uHue, reaccion * bandas.agudos * 0.6);
    gl.uniform1f(this.u.uInfluence, e.influenciaDatos);
    gl.uniform1f(this.u.uPulso, this.pulso);

    const remolinos = new Float32Array(MAXIMO_REMOLINOS * 4);
    const cuantos = Math.min(MAXIMO_REMOLINOS, e.picos.length);
    for (let i = 0; i < cuantos; i++) {
      const pico = e.picos[i];
      remolinos[i * 4] = pico.x;
      remolinos[i * 4 + 1] = 1 - pico.y;
      remolinos[i * 4 + 2] = pico.fuerza;
      remolinos[i * 4 + 3] = pico.giro;
    }
    gl.uniform4fv(this.u.uRemolinos, remolinos);
    gl.uniform1i(this.u.uCuantos, cuantos);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destruir(): void {
    this.imagen.destruir();
    this.gl.deleteTexture(this.atlas);
    this.gl.deleteProgram(this.programa);
  }
}

/** Lo que mide el glifo en el atlas, por si otra pieza necesita saberlo. */
export const GLIFO_PROPORCION = GLIFO_ANCHO / GLIFO_ALTO;

export const glifos: Algoritmo = {
  id: 'glifos',
  nombre: 'Constelación de glifos',
  descripcion:
    'La foto (o el ruido) pasada a letras: cada casilla mide qué tan clara es y elige un carácter. Con el color de la paleta o el de la foto, y encima, deformaciones.',
  escucha: 'La amplitud destapa la constelación · el bombo la sacude e interfiere · los agudos hacen centellear',
  conImagen: 'Tu foto se escribe con letras, en su color original o en el de la paleta',
  conDatos: 'Tu dedo y los datos arremolinan la imagen',
  mandos: [
    eleccion('alfabeto', 'Alfabeto', ALFABETOS.map((a) => a.etiqueta), 0),
    { id: 'cuerpo', etiqueta: 'Tamaño del glifo', min: 7, max: 40, paso: 1, valor: 11, lectura: (v) => `${Math.round(v)} px` },
    { id: 'color', etiqueta: 'Color (paleta ↔ foto)', min: 0, max: 1, paso: 0.02, valor: 0.8, lectura: (v) => (v < 0.05 ? 'paleta' : v > 0.95 ? 'foto' : porcentaje(v)) },
    { id: 'fondo', etiqueta: 'Foto de fondo', min: 0, max: 1, paso: 0.02, valor: 0.25, lectura: porcentaje },
    { id: 'contraste', etiqueta: 'Contraste', min: 0.4, max: 3, paso: 0.05, valor: 1.2, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'umbral', etiqueta: 'Cuánto se tapa', min: 0, max: 0.9, paso: 0.02, valor: 0.12, lectura: porcentaje },
    { id: 'tamano', etiqueta: 'Tamaño de las formas', min: 0, max: 1, paso: 0.02, valor: 0.6, lectura: porcentaje },
    { id: 'velocidad', etiqueta: 'Velocidad', min: 0, max: 3, paso: 0.05, valor: 0.8, lectura: (v) => `${v.toFixed(2)}×` },
    { id: 'ondulacion', etiqueta: 'Ondulación', min: 0, max: 1, paso: 0.02, valor: 0, lectura: porcentaje },
    { id: 'remolino', etiqueta: 'Remolino', min: -1, max: 1, paso: 0.02, valor: 0, lectura: (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%` },
    { id: 'turbulencia', etiqueta: 'Turbulencia', min: 0, max: 1, paso: 0.02, valor: 0, lectura: porcentaje },
    { id: 'lluvia', etiqueta: 'Lluvia digital', min: 0, max: 1, paso: 0.02, valor: 0, lectura: porcentaje },
    { id: 'centelleo', etiqueta: 'Centelleo', min: 0, max: 1, paso: 0.02, valor: 0.1, lectura: porcentaje },
    { id: 'interferencia', etiqueta: 'Interferencia', min: 0, max: 1, paso: 0.02, valor: 0, lectura: porcentaje },
    { id: 'negativo', etiqueta: 'Negativo', min: 0, max: 1, paso: 0.02, valor: 0, lectura: porcentaje },
  ],
  crear: (lienzo) => new Glifos(lienzo),
};

/** Para las pantallas viejas que listaban los alfabetos. */
export const NOMBRES_ALFABETO: { id: string; etiqueta: string }[] = ALFABETOS.map((a) => ({
  id: a.id,
  etiqueta: a.etiqueta,
}));

/** El alfabeto ahora es un mando del algoritmo; se deja para no romper las pantallas viejas. */
export function fijarAlfabeto(instancia: Instancia, id: string): void {
  void instancia;
  void id;
  // Nada: el alfabeto viaja en los parámetros.
}
