// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Ajusta la vista a la tablet.
 *
 * Desde nov. 2026 la interfaz es responsive en horizontal: se acomoda sola
 * desde unos 1180 × 520 px CSS (la tablet Lenovo, de 1280 × 800, se ve a
 * tamaño real). En una pantalla más chica —un celular acostado— el navegador
 * móvil trabaja con una «ventana virtual» de esa medida y la encoge para que
 * quepa. Aquí se calcula cuánto hay que encoger y se le dice al navegador
 * con la etiqueta viewport. En computador o con la pantalla en vertical no
 * se toca nada.
 */
const ANCHO_BASE = 1180;
const ALTO_BASE = 520;

export function ajustarVista(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta || !matchMedia('(pointer: coarse)').matches) return;

  // Cuánto se está encogiendo ahora: la ventana nativa es la virtual por esta escala.
  let escalaActual = 1;

  const ajustar = () => {
    const nativoAncho = window.innerWidth * escalaActual;
    const nativoAlto = window.innerHeight * escalaActual;
    const vertical = nativoAlto > nativoAncho;
    const escala = vertical ? 1 : Math.min(1, nativoAncho / ANCHO_BASE, nativoAlto / ALTO_BASE);
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
