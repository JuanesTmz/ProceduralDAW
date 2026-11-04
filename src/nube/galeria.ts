// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Mandar el video final del equipo a la galería del panel. Un video de 2:30
 * pesa unos 100 MB: se sube con XMLHttpRequest para poder mostrar el avance.
 */
export function enviarVideo(video: Blob, persona: string, alAvance: (avance: number) => void): Promise<void> {
  return new Promise((cumplir, fallar) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/videos');
    xhr.setRequestHeader('Content-Type', video.type.split(';')[0] || 'video/webm');
    xhr.setRequestHeader('X-Sonora-Persona', encodeURIComponent(persona));
    xhr.upload.onprogress = (ev) => ev.lengthComputable && alAvance(ev.loaded / ev.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return cumplir();
      let mensaje = 'No se pudo enviar el video.';
      try {
        mensaje = JSON.parse(xhr.responseText).error ?? mensaje;
      } catch {
        // Sin detalle: queda el mensaje general.
      }
      fallar(new Error(mensaje));
    };
    xhr.onerror = () => fallar(new Error('Sin conexión: el video no se pudo enviar. Descárgalo y prueba otra vez con WiFi.'));
    xhr.send(video);
  });
}
