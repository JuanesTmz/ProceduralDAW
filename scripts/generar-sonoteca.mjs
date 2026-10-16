/**
 * Genera la Sonoteca de SONORA: sonidos sintetizados aquí mismo, sin
 * grabaciones de terceros, para que no haya problema de derechos.
 *
 *   node scripts/generar-sonoteca.mjs
 *
 * Escribe WAV mono a 22 050 Hz en public/sonoteca/. Los melódicos se afinan
 * en una nota conocida (la que dice `nota`) para que la matriz los pueda
 * transportar a cualquier casilla.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const salida = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sonoteca');
mkdirSync(salida, { recursive: true });

// ------------------------------------------------------------ utilidades
let semilla = 7;
const azar = () => {
  semilla = (semilla * 16807) % 2147483647;
  return semilla / 2147483647;
};
const ruido = () => azar() * 2 - 1;
const frec = (nota) => {
  const nombres = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const m = /^([A-G])(#?)(\d)$/.exec(nota);
  const midi = (Number(m[3]) + 1) * 12 + nombres[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
};
const buffer = (segundos) => new Float32Array(Math.round(segundos * SR));

/** Filtro biquad (RBJ) aplicado sobre todo el buffer. */
function biquad(x, tipo, f0, q = 0.707) {
  const w = (2 * Math.PI * f0) / SR;
  const a = Math.sin(w) / (2 * q);
  const c = Math.cos(w);
  let b0, b1, b2;
  if (tipo === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
  else if (tipo === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  else [b0, b1, b2] = [a, 0, -a];
  const a0 = 1 + a;
  const a1 = -2 * c;
  const a2 = 1 - a;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function normalizar(x, pico = 0.9) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= pico / m;
  // Rampas cortas en los bordes: nada de clics.
  const r = Math.min(220, x.length >> 3);
  for (let i = 0; i < r; i++) {
    x[i] *= i / r;
    x[x.length - 1 - i] *= i / r;
  }
  return x;
}

function escribirWav(nombre, x) {
  const datos = Buffer.alloc(44 + x.length * 2);
  datos.write('RIFF', 0);
  datos.writeUInt32LE(36 + x.length * 2, 4);
  datos.write('WAVE', 8);
  datos.write('fmt ', 12);
  datos.writeUInt32LE(16, 16);
  datos.writeUInt16LE(1, 20);
  datos.writeUInt16LE(1, 22);
  datos.writeUInt32LE(SR, 24);
  datos.writeUInt32LE(SR * 2, 28);
  datos.writeUInt16LE(2, 32);
  datos.writeUInt16LE(16, 34);
  datos.write('data', 36);
  datos.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) {
    datos.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  }
  writeFileSync(join(salida, `${nombre}.wav`), datos);
}

const env = (t, ataque, caida) => (t < ataque ? t / ataque : Math.exp(-(t - ataque) / caida));

// ------------------------------------------------------------ melódicos

function marimba(nota) {
  const f = frec(nota);
  const x = buffer(1.3);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] =
      Math.sin(2 * Math.PI * f * t) * env(t, 0.002, 0.35) +
      0.45 * Math.sin(2 * Math.PI * f * 4 * t) * env(t, 0.001, 0.05) +
      0.15 * Math.sin(2 * Math.PI * f * 10 * t) * env(t, 0.001, 0.015);
  }
  return normalizar(x);
}

function pianoElectrico(nota) {
  const f = frec(nota);
  const x = buffer(2.2);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const indice = 2.2 * Math.exp(-t / 0.25);
    x[i] = Math.sin(2 * Math.PI * f * t + indice * Math.sin(2 * Math.PI * f * t)) * env(t, 0.003, 0.7);
    x[i] += 0.2 * Math.sin(2 * Math.PI * f * 2 * t) * env(t, 0.003, 0.4);
  }
  return normalizar(x);
}

function pluck(nota) {
  const f = frec(nota);
  const x = buffer(1.6);
  const n = Math.round(SR / f);
  const linea = Array.from({ length: n }, () => ruido());
  for (let i = 0; i < x.length; i++) {
    const j = i % n;
    const v = linea[j];
    linea[j] = 0.996 * 0.5 * (v + linea[(j + 1) % n]);
    x[i] = v;
  }
  return normalizar(biquad(x, 'lp', 5000));
}

function bajo808(nota) {
  const f = frec(nota);
  const x = buffer(1.6);
  let fase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    fase += (2 * Math.PI * f * (1 + 1.5 * Math.exp(-t / 0.03))) / SR;
    x[i] = Math.tanh(1.8 * Math.sin(fase)) * env(t, 0.002, 0.55);
  }
  return normalizar(x);
}

function campana(nota, largo = 2.6) {
  const f = frec(nota);
  const parciales = [[1, 1, 1], [2.76, 0.5, 0.6], [5.4, 0.3, 0.35], [8.93, 0.18, 0.2], [0.5, 0.25, 1.2]];
  const x = buffer(largo);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [r, a, d] of parciales) v += a * Math.sin(2 * Math.PI * f * r * t) * env(t, 0.001, d * largo * 0.35);
    x[i] = v;
  }
  return normalizar(x);
}

function pad(nota) {
  const f = frec(nota);
  const x = buffer(3);
  const fases = [0, 0, 0, 0];
  const des = [1, 1.004, 0.996, 2.002];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let v = 0;
    des.forEach((d, k) => {
      fases[k] = (fases[k] + (f * d) / SR) % 1;
      v += (fases[k] * 2 - 1) * (k === 3 ? 0.3 : 1);
    });
    const a = Math.min(1, t / 0.6) * Math.min(1, (3 - t) / 0.8);
    x[i] = v * a;
  }
  return normalizar(biquad(biquad(x, 'lp', 1800), 'lp', 2400));
}

function silbido(nota) {
  const f = frec(nota);
  const x = buffer(1.6);
  let fase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    fase += (2 * Math.PI * f * (1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.3))) / SR;
    const a = Math.min(1, t / 0.06) * Math.min(1, (1.6 - t) / 0.25);
    x[i] = (Math.sin(fase) + 0.04 * ruido()) * a;
  }
  return normalizar(x);
}

function vozAh(nota) {
  const f = frec(nota);
  const x = buffer(1.8);
  let fase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    fase = (fase + (f * (1 + 0.006 * Math.sin(2 * Math.PI * 5 * t))) / SR) % 1;
    x[i] = (fase * 2 - 1) * Math.min(1, t / 0.08) * Math.min(1, (1.8 - t) / 0.3);
  }
  const f1 = biquad(x, 'bp', 800, 6);
  const f2 = biquad(x, 'bp', 1150, 7);
  const f3 = biquad(x, 'bp', 2900, 9);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = f1[i] + 0.6 * f2[i] + 0.25 * f3[i];
  return normalizar(y);
}

function kalimba(nota) {
  const f = frec(nota);
  const x = buffer(1.4);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] =
      Math.sin(2 * Math.PI * f * t) * env(t, 0.001, 0.45) +
      0.3 * Math.sin(2 * Math.PI * f * 5.95 * t) * env(t, 0.0005, 0.03);
  }
  return normalizar(x);
}

// ------------------------------------------------------------ percusión

function shaker() {
  const x = buffer(0.25);
  for (let i = 0; i < x.length; i++) x[i] = ruido() * env(i / SR, 0.03, 0.05);
  return normalizar(biquad(x, 'bp', 6500, 1.2), 0.7);
}

function conga() {
  const x = buffer(0.6);
  let fase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    fase += (2 * Math.PI * 210 * (1 + 0.4 * Math.exp(-t / 0.02))) / SR;
    x[i] = Math.sin(fase) * env(t, 0.001, 0.13) + 0.2 * ruido() * env(t, 0.0005, 0.008);
  }
  return normalizar(x);
}

function cencerro() {
  const x = buffer(0.5);
  let a = 0, b = 0;
  for (let i = 0; i < x.length; i++) {
    a = (a + 545 / SR) % 1;
    b = (b + 815 / SR) % 1;
    x[i] = ((a < 0.5 ? 1 : -1) + (b < 0.5 ? 1 : -1)) * env(i / SR, 0.001, 0.09);
  }
  return normalizar(biquad(x, 'bp', 1600, 1.5), 0.8);
}

function clave() {
  const x = buffer(0.2);
  for (let i = 0; i < x.length; i++) x[i] = Math.sin(2 * Math.PI * 2450 * (i / SR)) * env(i / SR, 0.0005, 0.025);
  return normalizar(x, 0.8);
}

function guiro() {
  const x = buffer(0.45);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const raspa = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 55 * t));
    x[i] = ruido() * raspa * Math.min(1, t / 0.02) * Math.min(1, (0.45 - t) / 0.08);
  }
  return normalizar(biquad(x, 'bp', 3800, 1.5), 0.75);
}

function chasquido() {
  const x = buffer(0.18);
  for (let i = 0; i < x.length; i++) x[i] = ruido() * env(i / SR, 0.0005, 0.012);
  return normalizar(biquad(x, 'bp', 2600, 2), 0.85);
}

// ------------------------------------------------------------ ciudad

function lluvia() {
  const x = buffer(5);
  for (let i = 0; i < x.length; i++) x[i] = ruido() * 0.35;
  const y = biquad(biquad(x, 'lp', 3500), 'hp', 300);
  // Gotas sueltas encima.
  for (let k = 0; k < 140; k++) {
    const i0 = Math.floor(azar() * (x.length - 600));
    const f = 1500 + azar() * 2500;
    for (let j = 0; j < 500; j++) y[i0 + j] += 0.25 * Math.sin(2 * Math.PI * f * (j / SR)) * Math.exp(-j / 70);
  }
  return normalizar(y, 0.7);
}

function viento() {
  const x = buffer(5);
  for (let i = 0; i < x.length; i++) x[i] = ruido();
  const y = biquad(x, 'bp', 500, 0.8);
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    y[i] *= 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.23 * t + Math.sin(2 * Math.PI * 0.07 * t) * 2));
  }
  return normalizar(y, 0.7);
}

function trafico() {
  const x = buffer(5);
  let marron = 0;
  for (let i = 0; i < x.length; i++) {
    marron = (marron + 0.02 * ruido()) * 0.998;
    const t = i / SR;
    x[i] = marron * 6 + 0.15 * Math.sin(2 * Math.PI * 62 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.3 * t));
  }
  return normalizar(biquad(x, 'lp', 900), 0.7);
}

function bocina() {
  const x = buffer(1.1);
  let a = 0, b = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    a = (a + 405 / SR) % 1;
    b = (b + 508 / SR) % 1;
    const sonando = (t < 0.28 || (t > 0.4 && t < 0.95)) ? 1 : 0;
    x[i] = ((a < 0.5 ? 1 : -1) + (b < 0.5 ? 1 : -1)) * sonando;
  }
  return normalizar(biquad(biquad(x, 'lp', 2200), 'hp', 250), 0.75);
}

function metro() {
  const x = buffer(5);
  let marron = 0;
  for (let i = 0; i < x.length; i++) {
    marron = (marron + 0.03 * ruido()) * 0.997;
    x[i] = marron * 4;
  }
  const y = biquad(x, 'lp', 400);
  // El traqueteo de los rieles: dos golpes juntos, cada tanto.
  for (let golpe = 0.3; golpe < 4.8; golpe += 0.9) {
    for (const d of [0, 0.12]) {
      const i0 = Math.floor((golpe + d) * SR);
      for (let j = 0; j < 1600 && i0 + j < y.length; j++) {
        y[i0 + j] += 0.5 * ruido() * Math.exp(-j / 240) + 0.4 * Math.sin(2 * Math.PI * 140 * (j / SR)) * Math.exp(-j / 500);
      }
    }
  }
  return normalizar(y, 0.75);
}

function pajaros() {
  const x = buffer(4);
  for (let k = 0; k < 18; k++) {
    const i0 = Math.floor(azar() * (x.length - 6000));
    const f0 = 2500 + azar() * 2000;
    const dur = 0.06 + azar() * 0.12;
    const n = Math.floor(dur * SR);
    let fase = 0;
    for (let j = 0; j < n; j++) {
      const p = j / n;
      fase += (2 * Math.PI * f0 * (1 + 0.35 * Math.sin(Math.PI * p))) / SR;
      x[i0 + j] += Math.sin(fase) * Math.sin(Math.PI * p) * 0.6;
    }
  }
  return normalizar(x, 0.7);
}

function murmullo() {
  const x = buffer(5);
  for (let i = 0; i < x.length; i++) x[i] = ruido();
  const voces = [biquad(x, 'bp', 450, 3), biquad(x, 'bp', 900, 3), biquad(x, 'bp', 1600, 4)];
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    y[i] =
      voces[0][i] * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3.1 * t)) +
      voces[1][i] * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4.3 * t + 1)) +
      voces[2][i] * 0.5 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 5.7 * t + 2));
  }
  return normalizar(y, 0.65);
}

function moto() {
  const x = buffer(3.5);
  let fase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const cerca = Math.exp(-Math.pow((t - 1.6) / 0.7, 2));
    const f = 85 * (t < 1.6 ? 1.08 : 0.92) * (1 + 0.15 * cerca);
    fase = (fase + f / SR) % 1;
    x[i] = ((fase * 2 - 1) + 0.3 * ruido()) * (0.1 + 0.9 * cerca);
  }
  return normalizar(biquad(x, 'lp', 1400), 0.75);
}

// ------------------------------------------------------------ catálogo

const sonidos = [
  ['marimba', 'Marimba', 'melodico', 'C4', () => marimba('C4')],
  ['piano', 'Piano eléctrico', 'melodico', 'C4', () => pianoElectrico('C4')],
  ['pluck', 'Cuerda pulsada', 'melodico', 'C4', () => pluck('C4')],
  ['bajo808', 'Bajo 808', 'melodico', 'C2', () => bajo808('C2')],
  ['campana', 'Campana', 'melodico', 'C5', () => campana('C5')],
  ['pad', 'Colchón', 'melodico', 'C3', () => pad('C3')],
  ['silbido', 'Silbido', 'melodico', 'C5', () => silbido('C5')],
  ['vozah', 'Voz «ah»', 'melodico', 'C3', () => vozAh('C3')],
  ['kalimba', 'Kalimba', 'melodico', 'C5', () => kalimba('C5')],
  ['shaker', 'Shaker', 'percusion', null, shaker],
  ['conga', 'Conga', 'percusion', null, conga],
  ['cencerro', 'Cencerro', 'percusion', null, cencerro],
  ['clave', 'Clave', 'percusion', null, clave],
  ['guiro', 'Güiro', 'percusion', null, guiro],
  ['chasquido', 'Chasquido', 'percusion', null, chasquido],
  ['lluvia', 'Lluvia', 'ciudad', null, lluvia],
  ['viento', 'Viento en la loma', 'ciudad', null, viento],
  ['trafico', 'Tráfico lejano', 'ciudad', null, trafico],
  ['bocina', 'Bocina', 'ciudad', null, bocina],
  ['metro', 'Metro en los rieles', 'ciudad', null, metro],
  ['campanario', 'Campanario', 'ciudad', null, () => campana('G3', 4)],
  ['pajaros', 'Pájaros', 'ciudad', null, pajaros],
  ['murmullo', 'Murmullo de gente', 'ciudad', null, murmullo],
  ['moto', 'Moto que pasa', 'ciudad', null, moto],
];

for (const [id, , , , hacer] of sonidos) escribirWav(id, hacer());
const catalogo = sonidos.map(([id, nombre, grupo, nota]) => ({ id, nombre, grupo, ...(nota ? { nota } : {}) }));
writeFileSync(join(salida, 'catalogo.json'), JSON.stringify(catalogo, null, 2));
console.log(`${sonidos.length} sonidos en ${salida}`);
