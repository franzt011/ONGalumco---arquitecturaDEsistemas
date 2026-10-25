/**
 * Implementaciones en memoria de los puertos: cada "tabla" es un Map.
 * Sirven para las pruebas y para levantar la API en tu computador sin AWS.
 * Al reiniciar el servidor, los datos se pierden.
 */
import { randomUUID } from 'node:crypto';
import { TipoArchivo } from '../../dominio/archivo';
import { Comentario } from '../../dominio/comentario';
import { Curso } from '../../dominio/curso';
import { Examen } from '../../dominio/examen';
import { Inscripcion } from '../../dominio/inscripcion';
import { Intento } from '../../dominio/intento';
import { Rol, Usuario } from '../../dominio/usuario';
import {
  AlmacenamientoArchivos,
  ComentarioRepository,
  CursoRepository,
  Dependencias,
  ExamenRepository,
  GeneradorIds,
  InscripcionRepository,
  IntentoRepository,
  Reloj,
  UsuarioRepository,
} from '../../aplicacion/puertos';

export class UsuarioRepositoryMemoria implements UsuarioRepository {
  private readonly datos = new Map<string, Usuario>();

  async guardar(usuario: Usuario): Promise<void> {
    this.datos.set(usuario.usuarioId, usuario);
  }
  async buscarPorId(usuarioId: string): Promise<Usuario | undefined> {
    return this.datos.get(usuarioId);
  }
  async listarPorRoles(roles: Rol[]): Promise<Usuario[]> {
    return [...this.datos.values()].filter((u) => roles.includes(u.rol));
  }
}

export class CursoRepositoryMemoria implements CursoRepository {
  private readonly datos = new Map<string, Curso>();

  async guardar(curso: Curso): Promise<void> {
    this.datos.set(curso.cursoId, curso);
  }
  async buscarPorId(cursoId: string): Promise<Curso | undefined> {
    return this.datos.get(cursoId);
  }
  async listarPublicados(): Promise<Curso[]> {
    return [...this.datos.values()].filter((c) => c.estado === 'publicado');
  }
  async listarPorProfesor(profesorId: string): Promise<Curso[]> {
    return [...this.datos.values()].filter((c) => c.profesorId === profesorId);
  }
  async listarTodos(): Promise<Curso[]> {
    return [...this.datos.values()];
  }
  async eliminar(cursoId: string): Promise<void> {
    this.datos.delete(cursoId);
  }
}

export class ExamenRepositoryMemoria implements ExamenRepository {
  private readonly datos = new Map<string, Examen>();

  async guardar(examen: Examen): Promise<void> {
    this.datos.set(examen.cursoId, examen);
  }
  async buscarPorCurso(cursoId: string): Promise<Examen | undefined> {
    return this.datos.get(cursoId);
  }
  async eliminar(cursoId: string): Promise<void> {
    this.datos.delete(cursoId);
  }
}

/** La clave junta alumno y curso, como la clave primaria (PK + SK) que tendrá la tabla en DynamoDB. */
const claveInscripcion = (alumnoId: string, cursoId: string) =>
  `${alumnoId}#${cursoId}`;

export class InscripcionRepositoryMemoria implements InscripcionRepository {
  readonly datos = new Map<string, Inscripcion>();

  async guardar(inscripcion: Inscripcion): Promise<void> {
    this.datos.set(
      claveInscripcion(inscripcion.alumnoId, inscripcion.cursoId),
      inscripcion,
    );
  }
  async buscar(
    alumnoId: string,
    cursoId: string,
  ): Promise<Inscripcion | undefined> {
    return this.datos.get(claveInscripcion(alumnoId, cursoId));
  }
  async crearSiNoExiste(inscripcion: Inscripcion): Promise<boolean> {
    const clave = claveInscripcion(inscripcion.alumnoId, inscripcion.cursoId);
    if (this.datos.has(clave)) {
      return false;
    }
    this.datos.set(clave, inscripcion);
    return true;
  }
  async listarPorAlumno(alumnoId: string): Promise<Inscripcion[]> {
    return [...this.datos.values()].filter((i) => i.alumnoId === alumnoId);
  }
  async listarPorCurso(cursoId: string): Promise<Inscripcion[]> {
    return [...this.datos.values()].filter((i) => i.cursoId === cursoId);
  }
  async eliminar(alumnoId: string, cursoId: string): Promise<void> {
    this.datos.delete(claveInscripcion(alumnoId, cursoId));
  }
}

export class IntentoRepositoryMemoria implements IntentoRepository {
  private readonly datos = new Map<string, Intento>();

  constructor(private readonly inscripciones: InscripcionRepositoryMemoria) {}

  async guardarConInscripcion(
    intento: Intento,
    inscripcion: Inscripcion,
  ): Promise<boolean> {
    const clave = `${intento.alumnoId}#${intento.cursoId}#${intento.intentoId}`;
    if (this.datos.has(clave)) {
      return false;
    }
    // En memoria las dos escrituras son seguidas y no hay nada entre ellas que pueda fallar
    this.datos.set(clave, intento);
    await this.inscripciones.guardar(inscripcion);
    return true;
  }
  async buscar(
    alumnoId: string,
    cursoId: string,
    intentoId: string,
  ): Promise<Intento | undefined> {
    return this.datos.get(`${alumnoId}#${cursoId}#${intentoId}`);
  }
  async listarRecientes(limite: number): Promise<Intento[]> {
    return [...this.datos.values()]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, limite);
  }
}

export class ComentarioRepositoryMemoria implements ComentarioRepository {
  private readonly datos = new Map<string, Comentario>();

  async guardar(comentario: Comentario): Promise<void> {
    this.datos.set(comentario.comentarioId, comentario);
  }
  async buscarPorId(comentarioId: string): Promise<Comentario | undefined> {
    return this.datos.get(comentarioId);
  }
  async listarPorCurso(cursoId: string): Promise<Comentario[]> {
    return [...this.datos.values()].filter((c) => c.cursoId === cursoId);
  }
}

/** Almacenamiento falso: recuerda las claves y entrega URL de mentira. */
export class AlmacenamientoArchivosMemoria implements AlmacenamientoArchivos {
  readonly eliminados: string[] = [];

  async urlDeSubida(clave: string, tipo: TipoArchivo): Promise<string> {
    return `http://localhost/subida-falsa/${tipo}/${encodeURIComponent(clave)}`;
  }
  async urlDeLectura(clave: string): Promise<string> {
    return `http://localhost/archivo-falso/${encodeURIComponent(clave)}`;
  }
  async eliminar(clave: string): Promise<void> {
    this.eliminados.push(clave);
  }
}

export class RelojDelSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}

export class GeneradorUuid implements GeneradorIds {
  nuevo(): string {
    return randomUUID();
  }
}

/** Arma todas las dependencias en memoria. Las pruebas pueden reemplazar el reloj y los ids. */
export function dependenciasEnMemoria(
  cambios: Partial<Pick<Dependencias, 'reloj' | 'ids'>> = {},
): Dependencias & {
  inscripciones: InscripcionRepositoryMemoria;
  archivos: AlmacenamientoArchivosMemoria;
} {
  const inscripciones = new InscripcionRepositoryMemoria();
  return {
    usuarios: new UsuarioRepositoryMemoria(),
    cursos: new CursoRepositoryMemoria(),
    examenes: new ExamenRepositoryMemoria(),
    inscripciones,
    intentos: new IntentoRepositoryMemoria(inscripciones),
    comentarios: new ComentarioRepositoryMemoria(),
    archivos: new AlmacenamientoArchivosMemoria(),
    reloj: cambios.reloj ?? new RelojDelSistema(),
    ids: cambios.ids ?? new GeneradorUuid(),
  };
}
