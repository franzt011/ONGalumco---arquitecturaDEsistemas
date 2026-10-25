/**
 * Vistas: objetos de datos simples (solo strings, números, booleanos y arreglos) que los
 * casos de uso devuelven hacia afuera. Así ningún objeto del dominio cruza la frontera
 * hacia la capa HTTP (el "Result Model" de Clean Architecture).
 */
import { ArchivoAdjunto } from '../dominio/archivo';
import { Curso, EstadoCurso } from '../dominio/curso';
import { DatosOpcion, Examen, TipoPregunta } from '../dominio/examen';
import { Rol, Sede, Sexo, Usuario } from '../dominio/usuario';

export interface VistaModulo {
  moduloId: string;
  titulo: string;
  contenido?: string;
  duracion?: string;
  linkVideo?: string;
  archivos: ArchivoAdjunto[];
}

export interface VistaCurso {
  cursoId: string;
  profesorId: string;
  titulo: string;
  descripcion: string;
  estado: EstadoCurso;
  exigenciaMinima: number;
  maxIntentos: number;
  imagenPortada?: string;
  tieneCertificado: boolean;
  modulos: VistaModulo[];
  fechaCreacion: string;
}

export function vistaCurso(curso: Curso): VistaCurso {
  return {
    cursoId: curso.cursoId,
    profesorId: curso.profesorId,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    estado: curso.estado,
    exigenciaMinima: curso.exigenciaMinima,
    maxIntentos: curso.maxIntentos,
    imagenPortada: curso.imagenPortada,
    tieneCertificado: curso.archivoCertificado !== undefined,
    modulos: curso.modulos.map((m) => ({
      moduloId: m.moduloId,
      titulo: m.titulo,
      contenido: m.contenido,
      duracion: m.duracion,
      linkVideo: m.linkVideo,
      archivos: [...m.archivos],
    })),
    fechaCreacion: curso.fechaCreacion,
  };
}

/** Lo que ve el profesor al editar su examen: incluye las respuestas correctas. */
export interface VistaPreguntaProfesor {
  preguntaId: string;
  tipo: TipoPregunta;
  texto: string;
  opciones: DatosOpcion[];
  respuestaVf?: boolean;
}

export function vistaExamenProfesor(
  examen: Examen | undefined,
): VistaPreguntaProfesor[] {
  return (examen?.preguntas ?? []).map((p) => ({
    preguntaId: p.preguntaId,
    tipo: p.tipo,
    texto: p.texto,
    opciones: p.opciones.map((o) => ({ ...o })),
    respuestaVf: p.respuestaVf,
  }));
}

export interface VistaUsuario {
  usuarioId: string;
  nombre: string;
  correo: string;
  rol: Rol;
  sexo: Sexo | 'No definido';
  edad: number | 'N/A';
  sede: Sede | 'Sin sede';
  rachaDias: number;
}

/** Mismos textos por defecto que UsuarioController.php ('No definido', 'N/A', 'Sin sede'). */
export function vistaUsuario(usuario: Usuario, hoy: Date): VistaUsuario {
  return {
    usuarioId: usuario.usuarioId,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sexo: usuario.sexo ?? 'No definido',
    edad: usuario.edad(hoy) ?? 'N/A',
    sede: usuario.sede ?? 'Sin sede',
    rachaDias: usuario.rachaDias,
  };
}
