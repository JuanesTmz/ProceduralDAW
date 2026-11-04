// Diseñado y desarrollado por Juan Esteban Trillos · www.linkedin.com/in/juan-esteban-trillos
/**
 * Dónde viven los archivos de los equipos: voces, fotos y sonidos grabados.
 * Con BLOB_CUENTA definido, en Azure Blob Storage (contenedor privado, con
 * la identidad administrada); si no, en una carpeta local.
 *
 * Las tablets nunca hablan con el almacén: suben y bajan por el servidor,
 * que revisa que cada archivo sea del equipo de la sesión.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { DefaultAzureCredential } from '@azure/identity';
import { BlobServiceClient } from '@azure/storage-blob';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const CONTENEDOR = 'archivos';

export async function abrirArchivos() {
  if (process.env.BLOB_CUENTA) {
    const credencial = new DefaultAzureCredential(
      process.env.AZURE_CLIENT_ID ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID } : {},
    );
    const servicio = new BlobServiceClient(`https://${process.env.BLOB_CUENTA}.blob.core.windows.net`, credencial);
    const contenedor = servicio.getContainerClient(CONTENEDOR);
    await contenedor.createIfNotExists();
    return {
      async guardar(ruta, entrada, tipo) {
        await contenedor
          .getBlockBlobClient(ruta)
          .uploadStream(entrada, 4 * 1024 * 1024, 4, { blobHTTPHeaders: { blobContentType: tipo } });
      },
      async leer(ruta, desde, cuantos) {
        const r = await contenedor.getBlobClient(ruta).download(desde, cuantos);
        return r.readableStreamBody;
      },
      async borrar(ruta) {
        await contenedor.getBlobClient(ruta).deleteIfExists();
      },
    };
  }

  const carpeta = path.join(process.env.DATOS_CARPETA ?? path.join(aqui, '.datos'), 'archivos');
  return {
    async guardar(ruta, entrada) {
      const destino = path.join(carpeta, ruta);
      await fsp.mkdir(path.dirname(destino), { recursive: true });
      await pipeline(entrada, fs.createWriteStream(destino));
    },
    async leer(ruta, desde, cuantos) {
      return fs.createReadStream(path.join(carpeta, ruta), { start: desde, end: desde + cuantos - 1 });
    },
    async borrar(ruta) {
      await fsp.rm(path.join(carpeta, ruta), { force: true });
    },
  };
}
