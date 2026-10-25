/**
 * Casos de uso del Profesor (y del Admin, que puede gestionar cualquier curso).
 * Reemplazan Profesor/CursoController.php y Admin/CursoController.php, que en Laravel
 * eran casi el mismo archivo copiado dos veces.
 *
 * Cambio de diseño: en Laravel store() y update() recibían el curso, todos sus módulos
 * y todas sus preguntas en un solo formulario, y update() BORRABA todas las preguntas
 * para crearlas de nuevo. Aquí cada parte tiene su propio caso de uso.
 */
import {
  exigirArchivoPermitido,
  extensionDe,
  TipoArchivo,
} from '../../dominio/archivo';
import { CambiosCurso, Curso, DatosModulo, Modulo } from '../../dominio/curso';
import {
  ConflictoError,
  ReglaDeNegocioError,
  SinPermisoError,
} from '../../dominio/errores';
import {
  DatosOpcion,
  DatosPregunta,
  Examen,
  Pregunta,
} from '../../dominio/examen';
import { soloFecha } from '../../dominio/usuario';
import { exigirCurso, exigirUsuario } from '../comun';
import { Dependencias } from '../puertos';
import {
  VistaCurso,
  VistaPreguntaProfesor,
  vistaCurso,
  vistaExamenProfesor,
} from '../vistas';

/** El profesor ve sus cursos; el Admin ve todos. */
export class ListarCursosGestion {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(usuarioId: string): Promise<VistaCurso[]> {
    const usuario = await exigirUsuario(this.d, usuarioId, [
      'profesor',
      'admin',
    ]);
    const cursos =
      usuario.rol === 'admin'
        ? await this.d.cursos.listarTodos()
        : await this.d.cursos.listarPorProfesor(usuario.usuarioId);
    return cursos
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .map(vistaCurso);
  }
}

export class CrearCurso {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    datos: {
      titulo: string;
      descripcion: string;
      exigenciaMinima?: number;
      maxIntentos?: number;
    },
  ): Promise<VistaCurso> {
    await exigirUsuario(this.d, usuarioId, ['profesor', 'admin']);
    const curso = Curso.crear({
      ...datos,
      cursoId: this.d.ids.nuevo(),
      profesorId: usuarioId,
      fechaCreacion: this.d.reloj.ahora().toISOString(),
    });
    await this.d.cursos.guardar(curso);
    return vistaCurso(curso);
  }
}

export interface DetalleCursoGestion {
  curso: VistaCurso;
  preguntas: VistaPreguntaProfesor[];
  inscritos: number;
}

export class VerCursoGestion {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    cursoId: string,
  ): Promise<DetalleCursoGestion> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    curso.exigirPuedeGestionar(usuario);
    const [examen, inscripciones] = await Promise.all([
      this.d.examenes.buscarPorCurso(cursoId),
      this.d.inscripciones.listarPorCurso(cursoId),
    ]);
    return {
      curso: vistaCurso(curso),
      preguntas: vistaExamenProfesor(examen),
      inscritos: inscripciones.length,
    };
  }
}

export class ActualizarCurso {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    cursoId: string,
    cambios: CambiosCurso,
  ): Promise<VistaCurso> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    const portadaAnterior = curso.imagenPortada;
    const certificadoAnterior = curso.archivoCertificado;

    curso.actualizar(usuario, cambios);
    await this.d.cursos.guardar(curso);

    // Igual que en Laravel: al reemplazar la portada o el certificado se borra el archivo anterior
    await this.borrarSiCambio(portadaAnterior, curso.imagenPortada);
    await this.borrarSiCambio(certificadoAnterior, curso.archivoCertificado);
    return vistaCurso(curso);
  }

  private async borrarSiCambio(
    anterior?: string,
    actual?: string,
  ): Promise<void> {
    if (anterior && anterior !== actual) {
      await borrarSinFallar(this.d, anterior);
    }
  }
}

/**
 * Regla nueva: un curso con alumnos inscritos no se elimina (se despublica).
 * En Laravel el borrado en cascada eliminaba también el avance y las notas de los alumnos.
 */
export class EliminarCurso {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(usuarioId: string, cursoId: string): Promise<void> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    curso.exigirPuedeGestionar(usuario);

    const inscripciones = await this.d.inscripciones.listarPorCurso(cursoId);
    if (inscripciones.length > 0) {
      throw new ConflictoError(
        'curso-con-inscritos',
        'El curso tiene alumnos inscritos: despublícalo en vez de eliminarlo.',
      );
    }

    await this.d.cursos.eliminar(cursoId);
    await this.d.examenes.eliminar(cursoId);

    // Primero se borra el curso y después sus archivos: si falla un borrado en S3
    // queda un archivo huérfano que nadie ve, en vez de un curso que apunta a archivos inexistentes.
    const claves = [
      curso.imagenPortada,
      curso.archivoCertificado,
      ...curso.modulos.flatMap((m) => m.archivos.map((a) => a.clave)),
    ];
    for (const clave of claves) {
      if (clave) {
        await borrarSinFallar(this.d, clave);
      }
    }
  }
}

export class GuardarModulo {
  constructor(private readonly d: Dependencias) {}

  /** Si datos.moduloId no viene, se crea un módulo nuevo; si viene, se reemplaza ese módulo. */
  async ejecutar(
    usuarioId: string,
    cursoId: string,
    datos: Omit<DatosModulo, 'moduloId'> & { moduloId?: string },
  ): Promise<VistaCurso> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    const modulo = new Modulo({
      ...datos,
      moduloId: datos.moduloId ?? this.d.ids.nuevo(),
    });
    const anterior = curso.modulos.find((m) => m.moduloId === modulo.moduloId);

    curso.guardarModulo(usuario, modulo);
    await this.d.cursos.guardar(curso);

    // Archivos que estaban en la versión anterior del módulo y ya no están
    const actuales = new Set(modulo.archivos.map((a) => a.clave));
    for (const archivo of anterior?.archivos ?? []) {
      if (!actuales.has(archivo.clave)) {
        await borrarSinFallar(this.d, archivo.clave);
      }
    }
    return vistaCurso(curso);
  }
}

export class EliminarModulo {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    cursoId: string,
    moduloId: string,
  ): Promise<VistaCurso> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    const eliminado = curso.eliminarModulo(usuario, moduloId);
    await this.d.cursos.guardar(curso);
    for (const archivo of eliminado.archivos) {
      await borrarSinFallar(this.d, archivo.clave);
    }
    return vistaCurso(curso);
  }
}

/** Una pregunta tal como la envía el profesor: los ids los pone el backend. */
export type PreguntaNueva = Omit<DatosPregunta, 'preguntaId' | 'opciones'> & {
  opciones?: Omit<DatosOpcion, 'opcionId'>[];
};

/** Reemplaza el examen completo del curso (hay uno por curso). */
export class GuardarExamen {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    cursoId: string,
    preguntas: PreguntaNueva[],
  ): Promise<VistaPreguntaProfesor[]> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    curso.exigirPuedeGestionar(usuario);

    // Cada Pregunta valida sus datos: si una falla, se lanza el error y no se guarda nada
    const examen = new Examen(
      cursoId,
      preguntas.map(
        (p) =>
          new Pregunta({
            ...p,
            preguntaId: this.d.ids.nuevo(),
            opciones: p.opciones?.map((o) => ({
              ...o,
              opcionId: this.d.ids.nuevo(),
            })),
          }),
      ),
    );
    if (curso.estado === 'publicado' && examen.cantidadPreguntas === 0) {
      throw new ReglaDeNegocioError(
        'curso-incompleto',
        'Un curso publicado necesita al menos una pregunta.',
      );
    }
    await this.d.examenes.guardar(examen);
    return vistaExamenProfesor(examen);
  }
}

export class PublicarCurso {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(usuarioId: string, cursoId: string): Promise<VistaCurso> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    const examen = await this.d.examenes.buscarPorCurso(cursoId);
    curso.publicar(usuario, examen?.cantidadPreguntas ?? 0);
    await this.d.cursos.guardar(curso);
    return vistaCurso(curso);
  }
}

export class DespublicarCurso {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(usuarioId: string, cursoId: string): Promise<VistaCurso> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    curso.despublicar(usuario);
    await this.d.cursos.guardar(curso);
    return vistaCurso(curso);
  }
}

/**
 * Los archivos ya no pasan por el servidor: el backend valida tipo y tamaño y entrega una
 * URL prefirmada de S3 (válida unos minutos) para que el navegador suba el archivo directo.
 * Con Lambda esto es necesario: API Gateway no acepta cuerpos de más de 10 MB.
 */
export class PedirUrlDeSubida {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    datos: { tipo: TipoArchivo; nombre: string; tamanoBytes: number },
  ): Promise<{ clave: string; url: string }> {
    await exigirUsuario(this.d, usuarioId, ['profesor', 'admin']);
    exigirArchivoPermitido(datos.tipo, datos.nombre, datos.tamanoBytes);
    const fecha = soloFecha(this.d.reloj.ahora());
    const clave = `${datos.tipo}/${fecha}/${this.d.ids.nuevo()}.${extensionDe(datos.nombre)}`;
    return { clave, url: await this.d.archivos.urlDeSubida(clave, datos.tipo) };
  }
}

/**
 * URL temporal para ver una portada o descargar un material de módulo.
 * Los certificados NO se entregan por aquí: tienen su propio caso de uso, que exige haber aprobado.
 */
export class PedirUrlDeLectura {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(usuarioId: string, clave: string): Promise<{ url: string }> {
    await exigirUsuario(this.d, usuarioId);
    if (!/^(material|portada)\/[\w./-]+$/.test(clave) || clave.includes('..')) {
      throw new SinPermisoError(
        'archivo-protegido',
        'Este archivo no se puede pedir por aquí.',
      );
    }
    return { url: await this.d.archivos.urlDeLectura(clave) };
  }
}

/** Un archivo que no se pudo borrar no debe hacer fallar la operación principal. */
async function borrarSinFallar(
  d: Pick<Dependencias, 'archivos'>,
  clave: string,
): Promise<void> {
  try {
    await d.archivos.eliminar(clave);
  } catch {
    // Queda un archivo huérfano en S3; se puede limpiar con una regla de ciclo de vida
  }
}
