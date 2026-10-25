/**
 * Casos de uso del Alumno. Reemplazan Alumno/ExplorarController.php,
 * Alumno/DashboardController.php y Alumno/SalaClasesController.php.
 */
import {
  ConflictoError,
  NoEncontradoError,
  ReglaDeNegocioError,
  SinPermisoError,
} from '../../dominio/errores';
import { EstadoVisible, Inscripcion } from '../../dominio/inscripcion';
import { Intento } from '../../dominio/intento';
import { PreguntaParaAlumno, RespuestaAlumno } from '../../dominio/examen';
import { exigirCurso, exigirInscripcion, exigirUsuario } from '../comun';
import { Dependencias } from '../puertos';
import { VistaCurso, vistaCurso } from '../vistas';

export interface CursoDelCatalogo {
  cursoId: string;
  titulo: string;
  descripcion: string;
  imagenPortada?: string;
  cantidadModulos: number;
  inscrito: boolean;
}

/** Cursos publicados, indicando en cuáles ya está inscrito (ExplorarController@index). */
export class ExplorarCatalogo {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(alumnoId: string): Promise<CursoDelCatalogo[]> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const [cursos, inscripciones] = await Promise.all([
      this.d.cursos.listarPublicados(),
      this.d.inscripciones.listarPorAlumno(alumnoId),
    ]);
    const inscritos = new Set(inscripciones.map((i) => i.cursoId));
    return cursos
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .map((c) => ({
        cursoId: c.cursoId,
        titulo: c.titulo,
        descripcion: c.descripcion,
        imagenPortada: c.imagenPortada,
        cantidadModulos: c.modulos.length,
        inscrito: inscritos.has(c.cursoId),
      }));
  }
}

/**
 * Inscripción por cuenta propia. Lo nuevo respecto a Laravel: se valida que el curso esté
 * publicado (antes se podía inscribir en un borrador conociendo su id) y que no haya duplicados.
 */
export class Inscribirse {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(alumnoId: string, cursoId: string): Promise<void> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const curso = await exigirCurso(this.d, cursoId);
    if (!curso.aceptaInscripciones()) {
      throw new ReglaDeNegocioError(
        'curso-no-publicado',
        'Este curso no acepta inscripciones.',
      );
    }
    const creada = await this.d.inscripciones.crearSiNoExiste(
      new Inscripcion({
        alumnoId,
        cursoId,
        fechaInscripcion: this.d.reloj.ahora().toISOString(),
      }),
    );
    if (!creada) {
      throw new ConflictoError(
        'ya-inscrito',
        'Ya estás inscrito en este curso.',
      );
    }
  }
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

/** Panel del alumno (Alumno/DashboardController@index). */
export class MisCursos {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(alumnoId: string): Promise<MiCurso[]> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const inscripciones = await this.d.inscripciones.listarPorAlumno(alumnoId);
    const resultado: MiCurso[] = [];
    for (const inscripcion of inscripciones) {
      const curso = await this.d.cursos.buscarPorId(inscripcion.cursoId);
      if (!curso) {
        continue;
      }
      resultado.push({
        cursoId: curso.cursoId,
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        imagenPortada: curso.imagenPortada,
        estado: inscripcion.estadoVisible(curso.maxIntentos),
        // Solo cuentan los módulos que el curso tiene hoy (si el profesor borró uno, deja de contar)
        modulosCompletados: inscripcion.modulosCompletados.filter((id) =>
          curso.tieneModulo(id),
        ).length,
        modulosTotales: curso.modulos.length,
        intentosRestantes: inscripcion.intentosRestantes(curso.maxIntentos),
        calificacion: inscripcion.calificacion,
      });
    }
    return resultado;
  }
}

export interface SalaDeClases {
  curso: VistaCurso;
  modulosCompletados: string[];
  estado: EstadoVisible;
  intentosRestantes: number;
  intentosAgotados: boolean;
}

/** Vista del curso para estudiar (SalaClasesController@show). */
export class VerSalaDeClases {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(alumnoId: string, cursoId: string): Promise<SalaDeClases> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const curso = await exigirCurso(this.d, cursoId);
    // En Laravel cualquier alumno podía abrir cualquier curso (incluso sin inscribirse)
    const inscripcion = await exigirInscripcion(this.d, alumnoId, cursoId);
    const estado = inscripcion.estadoVisible(curso.maxIntentos);
    return {
      curso: vistaCurso(curso),
      modulosCompletados: inscripcion.modulosCompletados.filter((id) =>
        curso.tieneModulo(id),
      ),
      estado,
      intentosRestantes: inscripcion.intentosRestantes(curso.maxIntentos),
      intentosAgotados: estado === 'reprobado',
    };
  }
}

/**
 * Marca o desmarca un módulo como completado (SalaClasesController@completarModulo).
 * Al completar, actualiza la racha de días del alumno (gamificación). En Laravel la racha
 * se recalculaba recién cuando el alumno abría la página de logros.
 */
export class AlternarModulo {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    alumnoId: string,
    cursoId: string,
    moduloId: string,
  ): Promise<{ completado: boolean }> {
    const alumno = await exigirUsuario(this.d, alumnoId, ['alumno']);
    const curso = await exigirCurso(this.d, cursoId);
    if (!curso.tieneModulo(moduloId)) {
      throw new NoEncontradoError(
        'modulo-no-encontrado',
        `El curso no tiene el módulo ${moduloId}.`,
      );
    }
    const inscripcion = await exigirInscripcion(this.d, alumnoId, cursoId);
    const completado = inscripcion.alternarModulo(moduloId);
    await this.d.inscripciones.guardar(inscripcion);
    if (completado) {
      alumno.registrarActividad(this.d.reloj.ahora());
      await this.d.usuarios.guardar(alumno);
    }
    return { completado };
  }
}

/** Preguntas del examen SIN las respuestas correctas (SalaClasesController@examen). */
export class VerExamen {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    alumnoId: string,
    cursoId: string,
  ): Promise<{
    titulo: string;
    exigenciaMinima: number;
    intentosRestantes: number;
    preguntas: PreguntaParaAlumno[];
  }> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const curso = await exigirCurso(this.d, cursoId);
    const inscripcion = await exigirInscripcion(this.d, alumnoId, cursoId);
    inscripcion.exigirPuedeRendir(curso.maxIntentos);
    const examen = await this.d.examenes.buscarPorCurso(cursoId);
    if (!examen) {
      throw new NoEncontradoError(
        'examen-no-encontrado',
        'Este curso aún no tiene examen.',
      );
    }
    return {
      titulo: curso.titulo,
      exigenciaMinima: curso.exigenciaMinima,
      intentosRestantes: inscripcion.intentosRestantes(curso.maxIntentos),
      preguntas: examen.vistaAlumno(),
    };
  }
}

export interface ResultadoRendicion {
  aprobado: boolean;
  porcentaje: number;
  correctas: number;
  total: number;
  intentosRestantes: number;
}

/**
 * Rendir el examen (SalaClasesController@finalizarExamen).
 * Lo nuevo:
 * - Idempotencia: el frontend manda un intentoId; si llega repetido, se devuelve el mismo resultado.
 * - Se revisa que queden intentos ANTES de calificar (en Laravel solo se revisaba al abrir el examen,
 *   así que enviando el formulario directo se podían rendir intentos infinitos).
 * - El intento y la inscripción se guardan juntos (todo o nada).
 */
export class RendirExamen {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    alumnoId: string,
    cursoId: string,
    datos: { intentoId: string; respuestas: RespuestaAlumno[] },
  ): Promise<ResultadoRendicion> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const curso = await exigirCurso(this.d, cursoId);
    const inscripcion = await exigirInscripcion(this.d, alumnoId, cursoId);

    const repetido = await this.d.intentos.buscar(
      alumnoId,
      cursoId,
      datos.intentoId,
    );
    if (repetido) {
      return this.respuesta(repetido, inscripcion, curso.maxIntentos);
    }

    inscripcion.exigirPuedeRendir(curso.maxIntentos);
    const examen = await this.d.examenes.buscarPorCurso(cursoId);
    if (!examen) {
      throw new NoEncontradoError(
        'examen-no-encontrado',
        'Este curso aún no tiene examen.',
      );
    }

    const resultado = examen.calificar(datos.respuestas, curso.exigenciaMinima);
    const fecha = this.d.reloj.ahora().toISOString();
    const intento = new Intento({
      intentoId: datos.intentoId,
      alumnoId,
      cursoId,
      numeroIntento: inscripcion.intentosUsados + 1,
      fecha,
      resultado,
    });
    inscripcion.registrarIntento(resultado, fecha);

    const guardado = await this.d.intentos.guardarConInscripcion(
      intento,
      inscripcion,
    );
    if (!guardado) {
      // Llegó otra petición con el mismo intentoId al mismo tiempo y ganó: se devuelve su resultado
      const ganador = await this.d.intentos.buscar(
        alumnoId,
        cursoId,
        datos.intentoId,
      );
      const inscripcionActual = await exigirInscripcion(
        this.d,
        alumnoId,
        cursoId,
      );
      if (ganador) {
        return this.respuesta(ganador, inscripcionActual, curso.maxIntentos);
      }
    }
    return this.respuesta(intento, inscripcion, curso.maxIntentos);
  }

  private respuesta(
    intento: Intento,
    inscripcion: Inscripcion,
    maxIntentos: number,
  ): ResultadoRendicion {
    return {
      ...intento.resultado,
      intentosRestantes: inscripcion.intentosRestantes(maxIntentos),
    };
  }
}

/**
 * URL temporal del certificado PDF que subió el profesor (SalaClasesController@verCertificado).
 * Solo para quien aprobó el curso.
 */
export class ObtenerCertificado {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(alumnoId: string, cursoId: string): Promise<{ url: string }> {
    await exigirUsuario(this.d, alumnoId, ['alumno']);
    const curso = await exigirCurso(this.d, cursoId);
    const inscripcion = await exigirInscripcion(this.d, alumnoId, cursoId);
    if (inscripcion.estado !== 'completado') {
      throw new SinPermisoError(
        'curso-no-aprobado',
        'Debes aprobar el curso para ver su certificado.',
      );
    }
    if (!curso.archivoCertificado) {
      throw new NoEncontradoError(
        'sin-certificado',
        'El profesor aún no ha subido el certificado.',
      );
    }
    return {
      url: await this.d.archivos.urlDeLectura(curso.archivoCertificado),
    };
  }
}
