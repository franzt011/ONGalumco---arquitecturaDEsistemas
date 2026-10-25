/** Búsquedas y permisos que repiten varios casos de uso. */
import { Curso } from '../dominio/curso';
import { NoEncontradoError, SinPermisoError } from '../dominio/errores';
import { Inscripcion } from '../dominio/inscripcion';
import { Rol, Usuario } from '../dominio/usuario';
import { Dependencias } from './puertos';

/**
 * El usuario que hace la petición. Su id viene del token de Cognito, pero el rol se lee
 * de la tabla Usuarios, porque el Admin puede cambiarlo (igual que la columna rol de Laravel).
 */
export async function exigirUsuario(
  d: Pick<Dependencias, 'usuarios'>,
  usuarioId: string,
  roles?: Rol[],
): Promise<Usuario> {
  const usuario = await d.usuarios.buscarPorId(usuarioId);
  if (!usuario) {
    throw new NoEncontradoError(
      'perfil-no-encontrado',
      'Tu cuenta no tiene perfil. Completa tu registro.',
    );
  }
  if (roles && !roles.includes(usuario.rol)) {
    throw new SinPermisoError(
      'rol-no-permitido',
      `Esta acción es solo para: ${roles.join(', ')}.`,
    );
  }
  return usuario;
}

export async function exigirCurso(
  d: Pick<Dependencias, 'cursos'>,
  cursoId: string,
): Promise<Curso> {
  const curso = await d.cursos.buscarPorId(cursoId);
  if (!curso) {
    throw new NoEncontradoError(
      'curso-no-encontrado',
      `No existe el curso ${cursoId}.`,
    );
  }
  return curso;
}

export async function exigirInscripcion(
  d: Pick<Dependencias, 'inscripciones'>,
  alumnoId: string,
  cursoId: string,
): Promise<Inscripcion> {
  const inscripcion = await d.inscripciones.buscar(alumnoId, cursoId);
  if (!inscripcion) {
    throw new NoEncontradoError(
      'no-inscrito',
      'No estás inscrito en este curso.',
    );
  }
  return inscripcion;
}
