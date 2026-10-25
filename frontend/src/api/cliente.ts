/**
 * Cliente HTTP de la API. Reemplaza a Inertia: antes el controlador PHP mandaba los datos
 * como props de la página; ahora cada página los pide con fetch.
 */
import type { Problema } from './tipos';

const URL_BASE = (import.meta.env.VITE_API_URL ?? '') + '/v1';

/** Error de la API con el código estable del backend (para traducirlo con i18n). */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    detalle: string,
    readonly errores: string[] = [],
  ) {
    super(detalle);
  }
}

/**
 * De dónde salen los encabezados de identidad. Hoy: modo desarrollo (x-usuario-id).
 * Con Cognito: 'Authorization: Bearer <token>'. Las páginas no cambian, solo este proveedor.
 */
let encabezadosDeIdentidad: () => Record<string, string> = () => ({});

export function usarIdentidad(proveedor: () => Record<string, string>): void {
  encabezadosDeIdentidad = proveedor;
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(URL_BASE + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
        ...encabezadosDeIdentidad(),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'sin-conexion', 'No se pudo conectar con el servidor.');
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }
  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : undefined;
  if (!respuesta.ok) {
    const problema = (datos ?? {}) as Partial<Problema>;
    throw new ErrorApi(
      respuesta.status,
      problema.codigo ?? 'error-desconocido',
      problema.detail ?? respuesta.statusText,
      problema.errores,
    );
  }
  return datos as T;
}

export const http = {
  get: <T>(ruta: string) => pedir<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo: unknown = {}) => pedir<T>('POST', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo: unknown) => pedir<T>('PUT', ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo: unknown) => pedir<T>('PATCH', ruta, cuerpo),
  delete: <T>(ruta: string) => pedir<T>('DELETE', ruta),
};
