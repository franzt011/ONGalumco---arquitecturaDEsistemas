/**
 * Mensajes flotantes ("toast"). Reemplazan los alert() de la versión Laravel, que bloqueaban
 * la página. La auditoría pedía notificaciones tras inscribirse o completar un módulo.
 */
import { reactive } from 'vue';
import { ErrorApi } from './api/cliente';
import { i18n } from './i18n';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error';
  texto: string;
}

export const avisos = reactive<Aviso[]>([]);
let siguiente = 1;

export function avisar(texto: string, tipo: Aviso['tipo'] = 'exito'): void {
  const id = siguiente++;
  avisos.push({ id, tipo, texto });
  setTimeout(() => {
    const posicion = avisos.findIndex((a) => a.id === id);
    if (posicion !== -1) avisos.splice(posicion, 1);
  }, 4500);
}

/**
 * Texto de un error en el idioma actual, usando el 'codigo' que manda la API (problem+json).
 * En español se muestra el detalle del servidor, que ya viene en español y es más específico
 * ("La exigencia mínima debe ser un entero entre 1 y 100"). En otro idioma se usa la
 * traducción 'errores.<codigo>' y, si no existe, el detalle del servidor.
 */
export function textoDeError(error: unknown): string {
  const { t, te, locale } = i18n.global;
  if (error instanceof ErrorApi) {
    const clave = `errores.${error.codigo}`;
    return locale.value !== 'es' && te(clave) ? t(clave) : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

export function avisarError(error: unknown): void {
  avisar(textoDeError(error), 'error');
}
