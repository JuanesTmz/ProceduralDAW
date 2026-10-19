/**
 * Ajusta la vista a la tablet.
 *
 * La interfaz está pensada para una pantalla de al menos 1366 × 715 px CSS.
 * En una tablet más chica (o con la barra del navegador ocupando alto), el
 * navegador móvil puede trabajar con una «ventana virtual» más ancha y
 * encogerla para que quepa: todo se ve igual que en el computador, solo más
 * pequeño. Aquí se calcula cuánto hay que encoger y se le dice al navegador
 * con la etiqueta viewport. En computador o con la tablet en vertical no se
 * toca nada.
 */
const ANCHO_BASE = 1366;
const ALTO_BASE = 715;

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
