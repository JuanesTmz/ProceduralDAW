// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Lo que cuida la entrada: el nombre del equipo normalizado, la contraseña
 * guardada con hash, la cookie de sesión firmada y el límite de intentos.
 */
import crypto from 'node:crypto';

// ---------- nombre y contraseña ----------

/** El nombre del panel en la entrada: «Admin» con la contraseña del panel abre el panel. */
export const NOMBRE_ADMIN = 'admin';

/**
 * Cómo se compara un nombre de equipo: sin importar mayúsculas, tildes ni
 * espacios de más («Los  Truenos», «los truenos» y «LOS TRUENÓS» son el mismo).
 */
export function normalizarNombre(nombre) {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hashClave(clave) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(clave, sal, 32);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

export function claveCorrecta(clave, guardado) {
  const [tipo, sal, hash] = String(guardado).split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const dado = crypto.scryptSync(clave, Buffer.from(sal, 'hex'), esperado.length);
  return crypto.timingSafeEqual(dado, esperado);
}

/** Una contraseña de equipo: texto libre, de 4 a 64 caracteres. */
export const claveValida = (clave) => typeof clave === 'string' && clave.length >= 4 && clave.length <= 64;

// ---------- sesión ----------

export const COOKIE = 'sonora_sesion';
/** Una jornada de hackatón entera, con margen. */
export const DURACION_SESION = 14 * 60 * 60 * 1000;

export function crearSesiones(secreto) {
  const firmar = (texto) => crypto.createHmac('sha256', secreto).update(texto).digest('base64url');
  return {
    emitir(equipoId) {
      const datos = Buffer.from(JSON.stringify({ e: equipoId, v: Date.now() + DURACION_SESION })).toString('base64url');
      return `${datos}.${firmar(datos)}`;
    },
    /** El id del equipo, o null si la cookie no vale o ya venció. */
    leer(valor) {
      const [datos, firma] = String(valor ?? '').split('.');
      if (!datos || !firma) return null;
      const esperada = Buffer.from(firmar(datos));
      const dada = Buffer.from(firma);
      if (esperada.length !== dada.length || !crypto.timingSafeEqual(esperada, dada)) return null;
      try {
        const { e, v } = JSON.parse(Buffer.from(datos, 'base64url').toString());
        return Date.now() < v ? e : null;
      } catch {
        return null;
      }
    },
  };
}

export function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave === nombre) return decodeURIComponent(resto.join('='));
  }
  return null;
}

// ---------- intentos ----------

const VENTANA = 10 * 60 * 1000;
const MAXIMO = 8;

/** Cuenta los fallos por dirección y código; pasado el máximo, hay que esperar. */
export function crearLimite() {
  const fallos = new Map();
  const vigente = (clave) => {
    const f = fallos.get(clave);
    if (f && Date.now() - f.desde > VENTANA) fallos.delete(clave);
    return fallos.get(clave);
  };
  return {
    bloqueado: (clave) => (vigente(clave)?.cuenta ?? 0) >= MAXIMO,
    fallo(clave) {
      const f = vigente(clave) ?? { cuenta: 0, desde: Date.now() };
      f.cuenta++;
      fallos.set(clave, f);
    },
    limpiar: (clave) => fallos.delete(clave),
  };
}
