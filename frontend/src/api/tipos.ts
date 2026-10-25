/**
 * Tipos de lo que responde la API (copiados de backend/src/aplicacion/vistas.ts y de los
 * casos de uso). Si cambias una respuesta en el backend, actualiza el tipo aquí.
 */
export type Rol = 'admin' | 'profesor' | 'alumno';
export type Sexo = 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo';
export type Sede = 'Santiago' | 'Concepcion';
export type EstadoCurso = 'borrador' | 'publicado';
export type EstadoVisible = 'en_progreso' | 'completado' | 'reprobado';
export type TipoPregunta = 'multiple' | 'vf';
export type TipoArchivo = 'material' | 'portada' | 'certificado';

export interface ArchivoAdjunto {
  clave: string;
  nombre: string;
}

export interface Modulo {
  moduloId: string;
  titulo: string;
  contenido?: string;
  duracion?: string;
  linkVideo?: string;
  archivos: ArchivoAdjunto[];
}

export interface Curso {
  cursoId: string;
  profesorId: string;
  titulo: string;
  descripcion: string;
  estado: EstadoCurso;
  exigenciaMinima: number;
  maxIntentos: number;
  imagenPortada?: string;
  tieneCertificado: boolean;
  modulos: Modulo[];
  fechaCreacion: string;
}

export interface OpcionProfesor {
  opcionId?: string;
  texto: string;
  esCorrecta: boolean;
}

export interface PreguntaProfesor {
  preguntaId?: string;
  tipo: TipoPregunta;
  texto: string;
  opciones: OpcionProfesor[];
  respuestaVf?: boolean;
}

export interface DetalleCursoGestion {
  curso: Curso;
  preguntas: PreguntaProfesor[];
  inscritos: number;
}

export interface Usuario {
  usuarioId: string;
  nombre: string;
  correo: string;
  rol: Rol;
  sexo: Sexo | 'No definido';
  edad: number | 'N/A';
  sede: Sede | 'Sin sede';
  rachaDias: number;
}

export interface UsuarioDetalle extends Usuario {
  cursos: { cursoId: string; titulo: string; estado: string }[];
}

export interface CursoDelCatalogo {
  cursoId: string;
  titulo: string;
  descripcion: string;
  imagenPortada?: string;
  cantidadModulos: number;
  inscrito: boolean;
}

export interface MiCurso {
  cursoId: string;
  titulo: string;
  descripcion: string;
  imagenPortada?: string;
  estado: EstadoVisible;
  modulosCompletados: number;
  modulosTotales: number;
  intentosRestantes: number;
  calificacion?: number;
}

export interface SalaDeClases {
  curso: Curso;
  cantidadPreguntas: number;
  modulosCompletados: string[];
  estado: EstadoVisible;
  intentosRestantes: number;
  intentosAgotados: boolean;
}

export interface PreguntaAlumno {
  preguntaId: string;
  tipo: TipoPregunta;
  texto: string;
  opciones: { opcionId: string; texto: string }[];
}

export interface ExamenAlumno {
  titulo: string;
  exigenciaMinima: number;
  intentosRestantes: number;
  preguntas: PreguntaAlumno[];
}

export interface ResultadoRendicion {
  aprobado: boolean;
  porcentaje: number;
  correctas: number;
  total: number;
  intentosRestantes: number;
}

export interface Comentario {
  comentarioId: string;
  moduloId: string;
  autor: { usuarioId: string; nombre: string };
  contenido: string;
  enlace?: string;
  fecha: string;
  likes: number;
  meGusta: boolean;
}

export interface ComentarioConRespuestas extends Comentario {
  respuestas: Comentario[];
}

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  desbloqueado: boolean;
}

export interface EstadoGamificacion {
  modulosCompletados: number;
  examenesAprobados: number;
  cursosCompletados: number;
  rachaDias: number;
  xpTotal: number;
  xpEnNivel: number;
  xpParaSiguiente: number;
  nivel: number;
  logros: Logro[];
  logrosDesbloqueados: number;
  logrosTotal: number;
}

export interface PosicionRanking {
  usuarioId: string;
  nombre: string;
  sede: string;
  rachaDias: number;
  xp: number;
  posicion: number;
  esYo: boolean;
}

export interface Estadisticas {
  totalUsuarios: number;
  porRol: { rol: string; total: number }[];
  porSexo: { sexo: string; total: number }[];
  porSede: { sede: string; total: number }[];
  porEdad: { rango: string; total: number }[];
  finalizaciones: {
    alumno: string;
    curso: string;
    sede: string;
    puntuacion: number;
    aprobado: boolean;
    fecha: string;
  }[];
}

export interface ResultadoMasivo {
  procesados: number;
  omitidos: { usuarioId: string; motivo: string }[];
}

/** Error en formato problem+json (RFC 9457) que devuelve la API. */
export interface Problema {
  type: string;
  title: string;
  status: number;
  detail: string;
  codigo: string;
  errores?: string[];
}
