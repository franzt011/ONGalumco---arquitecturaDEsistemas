/**
 * Sesión del usuario (reemplaza $page.props.auth.user de Inertia).
 *
 * Modo desarrollo: se elige un usuario de ejemplo y se manda como x-usuario-id.
 * Modo cognito (pendiente, paso 5 de la guía): el login lo hace Cognito y aquí se guarda el token.
 */
import { reactive } from 'vue';
import { ErrorApi, usarIdentidad } from './api/cliente';
import { verPerfil } from './api/alumco';
import type { Usuario } from './api/tipos';

const CLAVE = 'alumco.usuarioId';

function leerGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export const sesion = reactive<{
  usuarioId: string | null;
  perfil: Usuario | null;
  /** true si inició sesión pero todavía no completó su perfil (POST /v1/perfil). */
  faltaPerfil: boolean;
}>({ usuarioId: leerGuardado(), perfil: null, faltaPerfil: false });

usarIdentidad((): Record<string, string> =>
  sesion.usuarioId ? { 'x-usuario-id': sesion.usuarioId } : {},
);

/** Carga el perfil del usuario actual. Si no tiene perfil, marca faltaPerfil. */
export async function cargarPerfil(): Promise<void> {
  if (!sesion.usuarioId) {
    sesion.perfil = null;
    return;
  }
  try {
    sesion.perfil = await verPerfil();
    sesion.faltaPerfil = false;
  } catch (error) {
    if (error instanceof ErrorApi && error.codigo === 'perfil-no-encontrado') {
      sesion.perfil = null;
      sesion.faltaPerfil = true;
      return;
    }
    throw error;
  }
}

export async function iniciarSesion(usuarioId: string): Promise<void> {
  sesion.usuarioId = usuarioId;
  try {
    localStorage.setItem(CLAVE, usuarioId);
  } catch {
    // Sin localStorage (modo privado): la sesión dura hasta recargar la página
  }
  await cargarPerfil();
}

export function cerrarSesion(): void {
  sesion.usuarioId = null;
  sesion.perfil = null;
  sesion.faltaPerfil = false;
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que limpiar
  }
}

/** Página de inicio de cada rol (lo que hacía la ruta /dashboard de Laravel). */
export function inicioSegunRol(): string {
  switch (sesion.perfil?.rol) {
    case 'admin':
      return '/gestion/cursos';
    case 'profesor':
      return '/gestion/cursos';
    case 'alumno':
      return '/mis-cursos';
    default:
      return '/';
  }
}
