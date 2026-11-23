// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Ajusta el tamaño de la interfaz a la pantalla táctil.
 *
 * La interfaz está pensada para la tablet (1280 × 800, se ve a tamaño real).
 * En un celular acostado no sirve ni el tamaño completo (todo sale gigante y
 * hay que bajar con scroll) ni encogerla al mínimo (sale diminuta). Aquí se
 * reduce en proporción a la pantalla: la interfaz trabaja sobre una «ventana
 * virtual» de unos 1000 × 465 px CSS y el navegador la encoge para que quepa,
 * nunca por debajo del 82 %. Un celular de 844 × 390 queda al 84 %.
 * Encima, las reglas de pantalla baja (max-height: 500px, en escenas.css e
 * historia.css) acomodan cada paso para que la mecánica se vea sin bajar.
 * En computador o con la pantalla en vertical no se toca nada.
 */
const ANCHO_BASE = 1000;
const ALTO_BASE = 465;
const ESCALA_MINIMA = 0.82;

export function ajustarVista(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta || !matchMedia('(pointer: coarse)').matches) return;

  // Cuánto se está encogiendo ahora: la ventana nativa es la virtual por esta escala.
  let escalaActual = 1;

  const ajustar = () => {
    const nativoAncho = window.innerWidth * escalaActual;
    const nativoAlto = window.innerHeight * escalaActual;
    const vertical = nativoAlto > nativoAncho;
    const escala = vertical ? 1 : Math.min(1, Math.max(ESCALA_MINIMA, Math.min(nativoAncho / ANCHO_BASE, nativoAlto / ALTO_BASE)));
    const redondeada = Math.round(escala * 100) / 100;
    if (Math.abs(redondeada - escalaActual) < 0.015) return;
    escalaActual = redondeada;
    meta.setAttribute(
      'content',
      redondeada >= 0.99
        ? 'width=device-width, initial-scale=1.0'
        : `width=${Math.round(nativoAncho / redondeada)}, user-scalable=no`,
    );
  };

  // Al cambiar la etiqueta, el navegador manda varios «resize» seguidos con
  // medidas a medias: se espera a que se asiente antes de volver a calcular.
  let espera: number | undefined;
  const luego = () => {
    window.clearTimeout(espera);
    espera = window.setTimeout(ajustar, 450);
  };

  ajustar();
  window.addEventListener('resize', luego);
  window.addEventListener('orientationchange', luego);
}
