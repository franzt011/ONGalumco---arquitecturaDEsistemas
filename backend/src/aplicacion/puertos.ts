/**
 * Puertos: interfaces que dicen QUÉ necesitan los casos de uso, sin decir CÓMO.
 * - infraestructura/memoria/  los implementa con Map (pruebas y desarrollo local).
 * - infraestructura/dynamodb/ los implementará con DynamoDB (producción en AWS).
 *
 * En Laravel los controladores usaban Eloquent y DB::table() directamente, así que
 * cambiar MySQL por otra base de datos obligaba a reescribir todos los controladores.
 */
import { TipoArchivo } from '../dominio/archivo';
import { Comentario } from '../dominio/comentario';
import { Curso } from '../dominio/curso';
import { Examen } from '../dominio/examen';
import { Inscripcion } from '../dominio/inscripcion';
import { Intento } from '../dominio/intento';
import { Rol, Usuario } from '../dominio/usuario';

export interface UsuarioRepository {
  guardar(usuario: Usuario): Promise<void>;
  buscarPorId(usuarioId: string): Promise<Usuario | undefined>;
  listarPorRoles(roles: Rol[]): Promise<Usuario[]>;
}

export interface CursoRepository {
  guardar(curso: Curso): Promise<void>;
  buscarPorId(cursoId: string): Promise<Curso | undefined>;
  listarPublicados(): Promise<Curso[]>;
  listarPorProfesor(profesorId: string): Promise<Curso[]>;
  listarTodos(): Promise<Curso[]>;
  eliminar(cursoId: string): Promise<void>;
}

export interface ExamenRepository {
  guardar(examen: Examen): Promise<void>;
  buscarPorCurso(cursoId: string): Promise<Examen | undefined>;
  eliminar(cursoId: string): Promise<void>;
}

export interface InscripcionRepository {
  guardar(inscripcion: Inscripcion): Promise<void>;
  buscar(alumnoId: string, cursoId: string): Promise<Inscripcion | undefined>;
  /**
   * Crea la inscripción solo si no existe (en DynamoDB: escritura condicional
   * attribute_not_exists). Devuelve false si ya existía. Evita duplicados aunque
   * lleguen dos peticiones al mismo tiempo.
   */
  crearSiNoExiste(inscripcion: Inscripcion): Promise<boolean>;
  listarPorAlumno(alumnoId: string): Promise<Inscripcion[]>;
  listarPorCurso(cursoId: string): Promise<Inscripcion[]>;
  eliminar(alumnoId: string, cursoId: string): Promise<void>;
}

export interface IntentoRepository {
  /**
   * Guarda el intento junto con la inscripción actualizada, todo o nada
   * (en DynamoDB: TransactWriteItems). Si el intentoId ya existe, no guarda nada y devuelve false.
   */
  guardarConInscripcion(
    intento: Intento,
    inscripcion: Inscripcion,
  ): Promise<boolean>;
  buscar(
    alumnoId: string,
    cursoId: string,
    intentoId: string,
  ): Promise<Intento | undefined>;
  listarRecientes(limite: number): Promise<Intento[]>;
}

export interface ComentarioRepository {
  guardar(comentario: Comentario): Promise<void>;
  buscarPorId(comentarioId: string): Promise<Comentario | undefined>;
  listarPorCurso(cursoId: string): Promise<Comentario[]>;
}

/** Archivos en S3 privado, con URL temporales (prefirmadas). */
export interface AlmacenamientoArchivos {
  urlDeSubida(clave: string, tipo: TipoArchivo): Promise<string>;
  urlDeLectura(clave: string): Promise<string>;
  eliminar(clave: string): Promise<void>;
}

/** Fecha y hora actual. Se inyecta para que las pruebas puedan fijar "hoy". */
export interface Reloj {
  ahora(): Date;
}

/** Genera ids únicos (UUID). Se inyecta para que las pruebas usen ids predecibles. */
export interface GeneradorIds {
  nuevo(): string;
}

/** Todos los puertos juntos: es lo que recibe cada caso de uso. */
export interface Dependencias {
  usuarios: UsuarioRepository;
  cursos: CursoRepository;
  examenes: ExamenRepository;
  inscripciones: InscripcionRepository;
  intentos: IntentoRepository;
  comentarios: ComentarioRepository;
  archivos: AlmacenamientoArchivos;
  reloj: Reloj;
  ids: GeneradorIds;
}

/** Token de inyección de NestJS (las interfaces desaparecen al compilar; el Symbol no). */
export const DEPENDENCIAS = Symbol('DEPENDENCIAS');
