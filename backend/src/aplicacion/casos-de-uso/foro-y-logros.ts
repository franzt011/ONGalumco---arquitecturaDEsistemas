/**
 * Foro por módulo y gamificación: el "valor agregado" de la versión Laravel
 * (SalaClasesController@publicarComentario/toggleLike y GamificacionService.php).
 */
import { Comentario } from '../../dominio/comentario';
import { Curso } from '../../dominio/curso';
import {
  NoEncontradoError,
  ReglaDeNegocioError,
  SinPermisoError,
} from '../../dominio/errores';
import {
  EstadoGamificacion,
  PosicionRanking,
  calcularGamificacion,
  calcularXp,
  ordenarRanking,
} from '../../dominio/gamificacion';
import { Inscripcion } from '../../dominio/inscripcion';
import { Usuario } from '../../dominio/usuario';
import { exigirCurso, exigirUsuario } from '../comun';
import { Dependencias } from '../puertos';

/** En el foro participan los alumnos inscritos y quienes gestionan el curso (su profesor y los admin). */
async function exigirParticipante(
  d: Dependencias,
  usuario: Usuario,
  curso: Curso,
): Promise<void> {
  if (usuario.rol === 'alumno') {
    const inscripcion = await d.inscripciones.buscar(
      usuario.usuarioId,
      curso.cursoId,
    );
    if (!inscripcion) {
      throw new SinPermisoError(
        'no-inscrito',
        'Debes estar inscrito para participar en el foro.',
      );
    }
    return;
  }
  curso.exigirPuedeGestionar(usuario);
}

export interface VistaComentario {
  comentarioId: string;
  moduloId: string;
  autor: { usuarioId: string; nombre: string };
  contenido: string;
  enlace?: string;
  /** ISO 8601. El frontend lo muestra como "hace 2 horas" en el idioma del usuario. */
  fecha: string;
  likes: number;
  meGusta: boolean;
  respuestas: Omit<VistaComentario, 'respuestas'>[];
}

function vista(
  c: Comentario,
  yoId: string,
): Omit<VistaComentario, 'respuestas'> {
  return {
    comentarioId: c.comentarioId,
    moduloId: c.moduloId,
    autor: { usuarioId: c.autorId, nombre: c.autorNombre },
    contenido: c.contenido,
    enlace: c.enlace,
    fecha: c.fecha,
    likes: c.cantidadLikes,
    meGusta: c.leGustaA(yoId),
  };
}

export class VerForo {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    cursoId: string,
  ): Promise<VistaComentario[]> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    await exigirParticipante(this.d, usuario, curso);

    const comentarios = await this.d.comentarios.listarPorCurso(cursoId);
    const masNuevoPrimero = (a: Comentario, b: Comentario) =>
      b.fecha.localeCompare(a.fecha);
    return comentarios
      .filter((c) => !c.respuestaA)
      .sort(masNuevoPrimero)
      .map((c) => ({
        ...vista(c, usuarioId),
        respuestas: comentarios
          .filter((r) => r.respuestaA === c.comentarioId)
          .sort(masNuevoPrimero)
          .map((r) => vista(r, usuarioId)),
      }));
  }
}

export class PublicarComentario {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    cursoId: string,
    moduloId: string,
    datos: { contenido: string; enlace?: string; respuestaA?: string },
  ): Promise<{ comentarioId: string }> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const curso = await exigirCurso(this.d, cursoId);
    await exigirParticipante(this.d, usuario, curso);
    if (!curso.tieneModulo(moduloId)) {
      throw new NoEncontradoError(
        'modulo-no-encontrado',
        `El curso no tiene el módulo ${moduloId}.`,
      );
    }
    if (datos.respuestaA) {
      const original = await this.d.comentarios.buscarPorId(datos.respuestaA);
      if (
        !original ||
        original.cursoId !== cursoId ||
        original.moduloId !== moduloId
      ) {
        throw new NoEncontradoError(
          'comentario-no-encontrado',
          'El comentario que respondes no existe.',
        );
      }
      if (original.respuestaA) {
        throw new ReglaDeNegocioError(
          'respuesta-anidada',
          'Solo se puede responder a un comentario principal.',
        );
      }
    }

    const comentario = new Comentario({
      ...datos,
      comentarioId: this.d.ids.nuevo(),
      cursoId,
      moduloId,
      autorId: usuario.usuarioId,
      autorNombre: usuario.nombre,
      fecha: this.d.reloj.ahora().toISOString(),
    });
    await this.d.comentarios.guardar(comentario);
    return { comentarioId: comentario.comentarioId };
  }
}

export class AlternarLike {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    usuarioId: string,
    comentarioId: string,
  ): Promise<{ meGusta: boolean; likes: number }> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    const comentario = await this.d.comentarios.buscarPorId(comentarioId);
    if (!comentario) {
      throw new NoEncontradoError(
        'comentario-no-encontrado',
        'El comentario no existe.',
      );
    }
    const curso = await exigirCurso(this.d, comentario.cursoId);
    await exigirParticipante(this.d, usuario, curso);
    const meGusta = comentario.alternarLike(usuarioId);
    await this.d.comentarios.guardar(comentario);
    return { meGusta, likes: comentario.cantidadLikes };
  }
}

function actividadDe(alumno: Usuario, inscripciones: Inscripcion[]) {
  const completados = inscripciones.filter(
    (i) => i.estado === 'completado',
  ).length;
  return {
    modulosCompletados: inscripciones.reduce(
      (total, i) => total + i.modulosCompletados.length,
      0,
    ),
    // Desde esta versión un curso aprobado no se vuelve a rendir, así que hay 1 examen aprobado por curso completado
    examenesAprobados: completados,
    cursosCompletados: completados,
    rachaDias: alumno.rachaDias,
  };
}

/** Logros, nivel, XP y ranking (rutas /mis-logros y /alumno/ranking de Laravel). */
export class MiGamificacion {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    alumnoId: string,
  ): Promise<{ estado: EstadoGamificacion; ranking: PosicionRanking[] }> {
    const alumno = await exigirUsuario(this.d, alumnoId, ['alumno']);
    const alumnos = await this.d.usuarios.listarPorRoles(['alumno']);

    // Ojo de escalabilidad: recorre a todos los alumnos (igual que en Laravel). Con muchos
    // usuarios conviene precalcular el XP al completar módulos y guardarlo en el usuario.
    const participantes = [];
    let estado: EstadoGamificacion | undefined;
    for (const a of alumnos) {
      const actividad = actividadDe(
        a,
        await this.d.inscripciones.listarPorAlumno(a.usuarioId),
      );
      if (a.usuarioId === alumno.usuarioId) {
        estado = calcularGamificacion(actividad);
      }
      participantes.push({
        usuarioId: a.usuarioId,
        nombre: a.nombre,
        sede: a.sede ?? 'Sin sede',
        rachaDias: a.rachaDias,
        xp: calcularXp(actividad),
      });
    }
    return {
      estado: estado ?? calcularGamificacion(actividadDe(alumno, [])),
      ranking: ordenarRanking(participantes, alumnoId),
    };
  }
}
