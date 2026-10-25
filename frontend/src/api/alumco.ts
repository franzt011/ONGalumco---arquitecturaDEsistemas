/**
 * Una función por endpoint de la API. Las páginas solo llaman a estas funciones
 * (equivale a la lista de rutas de routes/web.php, pero del lado del cliente).
 */
import { http } from './cliente';
import type {
  ComentarioConRespuestas,
  Curso,
  CursoDelCatalogo,
  DetalleCursoGestion,
  EstadoGamificacion,
  Estadisticas,
  ExamenAlumno,
  MiCurso,
  Modulo,
  PosicionRanking,
  PreguntaProfesor,
  ResultadoMasivo,
  ResultadoRendicion,
  Rol,
  SalaDeClases,
  Sede,
  Sexo,
  TipoArchivo,
  Usuario,
  UsuarioDetalle,
} from './tipos';

const c = encodeURIComponent;

// Perfil
export const verPerfil = () => http.get<Usuario>('/perfil');
export const completarPerfil = (datos: { nombre: string; sexo: Sexo; fechaNacimiento: string; sede: Sede }) =>
  http.post<Usuario>('/perfil', datos);
export const verGamificacion = () =>
  http.get<{ estado: EstadoGamificacion; ranking: PosicionRanking[] }>('/perfil/gamificacion');

// Alumno
export const verCatalogo = () => http.get<CursoDelCatalogo[]>('/catalogo');
export const inscribirse = (cursoId: string) => http.post<{ inscrito: true }>('/inscripciones', { cursoId });
export const verMisCursos = () => http.get<MiCurso[]>('/mis-cursos');
export const verSala = (cursoId: string) => http.get<SalaDeClases>(`/cursos/${c(cursoId)}`);
export const alternarModulo = (cursoId: string, moduloId: string) =>
  http.post<{ completado: boolean }>(`/cursos/${c(cursoId)}/modulos/${c(moduloId)}/completar`);
export const verExamen = (cursoId: string) => http.get<ExamenAlumno>(`/cursos/${c(cursoId)}/examen`);
export const rendirExamen = (
  cursoId: string,
  datos: { intentoId: string; respuestas: { preguntaId: string; respuesta: string }[] },
) => http.post<ResultadoRendicion>(`/cursos/${c(cursoId)}/examen/intentos`, datos);
export const verCertificado = (cursoId: string) => http.get<{ url: string }>(`/cursos/${c(cursoId)}/certificado`);

// Foro
export const verForo = (cursoId: string) => http.get<ComentarioConRespuestas[]>(`/cursos/${c(cursoId)}/foro`);
export const comentar = (
  cursoId: string,
  moduloId: string,
  datos: { contenido: string; enlace?: string; respuestaA?: string },
) => http.post<{ comentarioId: string }>(`/cursos/${c(cursoId)}/modulos/${c(moduloId)}/comentarios`, datos);
export const alternarLike = (comentarioId: string) =>
  http.post<{ meGusta: boolean; likes: number }>(`/comentarios/${c(comentarioId)}/like`);

// Gestión de cursos (profesor y admin)
export type DatosCurso = Partial<Pick<Curso, 'titulo' | 'descripcion' | 'exigenciaMinima' | 'maxIntentos'>> & {
  imagenPortada?: string;
  archivoCertificado?: string;
};
export type DatosModulo = Omit<Modulo, 'moduloId'>;

export const listarCursosGestion = () => http.get<Curso[]>('/gestion/cursos');
export const crearCurso = (datos: Required<Pick<DatosCurso, 'titulo' | 'descripcion'>> & DatosCurso) =>
  http.post<Curso>('/gestion/cursos', datos);
export const verCursoGestion = (cursoId: string) => http.get<DetalleCursoGestion>(`/gestion/cursos/${c(cursoId)}`);
export const actualizarCurso = (cursoId: string, datos: DatosCurso) =>
  http.patch<Curso>(`/gestion/cursos/${c(cursoId)}`, datos);
export const eliminarCurso = (cursoId: string) => http.delete<void>(`/gestion/cursos/${c(cursoId)}`);
export const agregarModulo = (cursoId: string, datos: DatosModulo) =>
  http.post<Curso>(`/gestion/cursos/${c(cursoId)}/modulos`, datos);
export const reemplazarModulo = (cursoId: string, moduloId: string, datos: DatosModulo) =>
  http.put<Curso>(`/gestion/cursos/${c(cursoId)}/modulos/${c(moduloId)}`, datos);
export const eliminarModulo = (cursoId: string, moduloId: string) =>
  http.delete<Curso>(`/gestion/cursos/${c(cursoId)}/modulos/${c(moduloId)}`);
export const guardarExamen = (cursoId: string, preguntas: PreguntaProfesor[]) =>
  http.put<PreguntaProfesor[]>(`/gestion/cursos/${c(cursoId)}/examen`, { preguntas });
export const publicarCurso = (cursoId: string) => http.post<Curso>(`/gestion/cursos/${c(cursoId)}/publicar`);
export const despublicarCurso = (cursoId: string) => http.post<Curso>(`/gestion/cursos/${c(cursoId)}/despublicar`);

// Archivos (S3 con URL prefirmadas)
export const pedirUrlDeSubida = (datos: { tipo: TipoArchivo; nombre: string; tamanoBytes: number }) =>
  http.post<{ clave: string; url: string }>('/archivos/url-subida', datos);
export const pedirUrlDeLectura = (clave: string) => http.get<{ url: string }>(`/archivos/url-lectura?clave=${c(clave)}`);

// Admin
export const listarUsuarios = (tipo: 'alumnos' | 'profesores', buscar = '') =>
  http.get<Usuario[]>(`/admin/usuarios?tipo=${tipo}${buscar ? `&buscar=${c(buscar)}` : ''}`);
export const verUsuario = (usuarioId: string) => http.get<UsuarioDetalle>(`/admin/usuarios/${c(usuarioId)}`);
export const cambiarRol = (usuarioId: string, rol: Rol) => http.put<Usuario>(`/admin/usuarios/${c(usuarioId)}/rol`, { rol });
export const inscripcionMasiva = (datos: { usuarioIds: string[]; cursoId: string; accion: 'inscribir' | 'desinscribir' }) =>
  http.post<ResultadoMasivo>('/admin/inscripciones-masivas', datos);
export const verEstadisticas = () => http.get<Estadisticas>('/admin/estadisticas');
