/**
 * Subida y lectura de archivos con URL prefirmadas de S3.
 * Flujo de subida: 1) pedir URL al backend (valida tipo y tamaño), 2) PUT del archivo directo
 * a S3, 3) guardar la clave en el curso o módulo. El archivo nunca pasa por la Lambda.
 */
import { pedirUrlDeLectura, pedirUrlDeSubida } from './api/alumco';
import type { TipoArchivo } from './api/tipos';

/** El backend en memoria (modo desarrollo) entrega URL falsas: no hay S3 donde subir. */
const esUrlFalsa = (url: string) => /^http:\/\/localhost\/(subida|archivo)-falsa\//.test(url);

export async function subirArchivo(tipo: TipoArchivo, archivo: File): Promise<string> {
  const { clave, url } = await pedirUrlDeSubida({ tipo, nombre: archivo.name, tamanoBytes: archivo.size });
  if (esUrlFalsa(url)) {
    console.info(`[modo desarrollo] No hay S3: se guarda la clave ${clave} sin subir el archivo.`);
    return clave;
  }
  const respuesta = await fetch(url, {
    method: 'PUT',
    body: archivo,
    headers: { 'content-type': archivo.type || 'application/octet-stream' },
  });
  if (!respuesta.ok) {
    throw new Error(`S3 rechazó la subida (${respuesta.status}).`);
  }
  return clave;
}

const cache = new Map<string, Promise<string | null>>();

/** URL temporal para mostrar una portada o descargar un material. Devuelve null si no hay archivo real. */
export function urlDeArchivo(clave: string | undefined): Promise<string | null> {
  if (!clave) {
    return Promise.resolve(null);
  }
  if (!cache.has(clave)) {
    cache.set(
      clave,
      pedirUrlDeLectura(clave)
        .then(({ url }) => (esUrlFalsa(url) ? null : url))
        .catch(() => null),
    );
  }
  return cache.get(clave)!;
}
