import {
  ConflictoError,
  NoEncontradoError,
  ReglaDeNegocioError,
  SinPermisoError,
} from '../../dominio/errores';
import { Usuario } from '../../dominio/usuario';
import { cargarDatosDeEjemplo } from '../../infraestructura/memoria/datos-de-ejemplo';
import { dependenciasEnMemoria } from '../../infraestructura/memoria/repositorios';
import {
  AlternarModulo,
  Inscribirse,
  ObtenerCertificado,
  RendirExamen,
  VerExamen,
  VerSalaDeClases,
} from './alumno';
import {
  AlternarLike,
  MiGamificacion,
  PublicarComentario,
  VerForo,
} from './foro-y-logros';
import {
  ActualizarCurso,
  CrearCurso,
  EliminarCurso,
  GuardarExamen,
  PublicarCurso,
} from './gestion-cursos';
import { CambiarRol, CompletarPerfil, InscripcionMasiva } from './usuarios';

const INTENTO_1 = '0192f3c4-7a1b-7c3d-8e4f-5a6b7c8d9e01';
const INTENTO_2 = '0192f3c4-7a1b-7c3d-8e4f-5a6b7c8d9e02';
const INTENTO_3 = '0192f3c4-7a1b-7c3d-8e4f-5a6b7c8d9e03';
const BIEN = [
  { preguntaId: 'p1', respuesta: 'verdadero' },
  { preguntaId: 'p2', respuesta: 'p2-b' },
];
const MAL = [
  { preguntaId: 'p1', respuesta: 'falso' },
  { preguntaId: 'p2', respuesta: 'p2-a' },
];

/** Datos de ejemplo (admin-1, profe-1, alumno-1, curso-1 publicado con 2 preguntas) y un reloj fijo. */
async function preparar() {
  let contador = 0;
  const d = dependenciasEnMemoria({
    reloj: { ahora: () => new Date('2026-10-25T12:00:00Z') },
    ids: { nuevo: () => `id-${++contador}` },
  });
  await cargarDatosDeEjemplo(d);
  return d;
}

describe('Alumno: inscripción y sala de clases', () => {
  it('no puede ver un curso sin inscribirse', async () => {
    const d = await preparar();
    await expect(
      new VerSalaDeClases(d).ejecutar('alumno-1', 'curso-1'),
    ).rejects.toThrow(NoEncontradoError);
  });

  it('se inscribe una sola vez', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    await expect(
      new Inscribirse(d).ejecutar('alumno-1', 'curso-1'),
    ).rejects.toThrow(ConflictoError);
  });

  it('no puede inscribirse en un borrador', async () => {
    const d = await preparar();
    const borrador = await new CrearCurso(d).ejecutar('profe-1', {
      titulo: 'Nuevo',
      descripcion: '',
    });
    await expect(
      new Inscribirse(d).ejecutar('alumno-1', borrador.cursoId),
    ).rejects.toThrow(ReglaDeNegocioError);
  });

  it('un profesor no usa la zona del alumno', async () => {
    const d = await preparar();
    await expect(
      new Inscribirse(d).ejecutar('profe-1', 'curso-1'),
    ).rejects.toThrow(SinPermisoError);
  });

  it('completar un módulo actualiza la racha del alumno', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    expect(
      await new AlternarModulo(d).ejecutar('alumno-1', 'curso-1', 'mod-1'),
    ).toEqual({ completado: true });
    expect((await d.usuarios.buscarPorId('alumno-1'))?.rachaDias).toBe(1);
  });
});

describe('Alumno: examen', () => {
  it('la vista del examen no trae respuestas correctas', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    const vista = await new VerExamen(d).ejecutar('alumno-1', 'curso-1');
    expect(JSON.stringify(vista)).not.toMatch(/esCorrecta|respuestaVf/);
  });

  it('IDEMPOTENCIA: el mismo intentoId enviado dos veces gasta un solo intento', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    const rendir = new RendirExamen(d);
    const primero = await rendir.ejecutar('alumno-1', 'curso-1', {
      intentoId: INTENTO_1,
      respuestas: MAL,
    });
    const repetido = await rendir.ejecutar('alumno-1', 'curso-1', {
      intentoId: INTENTO_1,
      respuestas: BIEN,
    });
    expect(repetido).toEqual(primero);
    expect(primero.intentosRestantes).toBe(1);
    expect(
      (await d.inscripciones.buscar('alumno-1', 'curso-1'))?.intentosUsados,
    ).toBe(1);
  });

  it('con los intentos agotados no se califica (en Laravel se podía saltar enviando el formulario)', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    const rendir = new RendirExamen(d);
    await rendir.ejecutar('alumno-1', 'curso-1', {
      intentoId: INTENTO_1,
      respuestas: MAL,
    });
    await rendir.ejecutar('alumno-1', 'curso-1', {
      intentoId: INTENTO_2,
      respuestas: MAL,
    });
    await expect(
      rendir.ejecutar('alumno-1', 'curso-1', {
        intentoId: INTENTO_3,
        respuestas: BIEN,
      }),
    ).rejects.toThrow('máximo de intentos');
  });

  it('al aprobar puede pedir el certificado si el profesor lo subió', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    await expect(
      new ObtenerCertificado(d).ejecutar('alumno-1', 'curso-1'),
    ).rejects.toThrow(SinPermisoError);

    const resultado = await new RendirExamen(d).ejecutar(
      'alumno-1',
      'curso-1',
      { intentoId: INTENTO_1, respuestas: BIEN },
    );
    expect(resultado).toMatchObject({
      aprobado: true,
      porcentaje: 100,
      intentosRestantes: 0,
    });

    await new ActualizarCurso(d).ejecutar('profe-1', 'curso-1', {
      archivoCertificado: 'certificado/x.pdf',
    });
    const { url } = await new ObtenerCertificado(d).ejecutar(
      'alumno-1',
      'curso-1',
    );
    expect(url).toContain('certificado%2Fx.pdf');
  });
});

describe('Profesor: gestión de cursos', () => {
  it('otro profesor no puede editar un curso ajeno', async () => {
    const d = await preparar();
    await d.usuarios.guardar(
      Usuario.crear({
        usuarioId: 'profe-2',
        nombre: 'Otro',
        correo: 'o@a.cl',
        rol: 'profesor',
      }),
    );
    await expect(
      new ActualizarCurso(d).ejecutar('profe-2', 'curso-1', {
        titulo: 'Hackeado',
      }),
    ).rejects.toThrow(SinPermisoError);
  });

  it('no se elimina un curso con inscritos, y al eliminar uno vacío se borran sus archivos', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    await expect(
      new EliminarCurso(d).ejecutar('profe-1', 'curso-1'),
    ).rejects.toThrow(ConflictoError);

    const nuevo = await new CrearCurso(d).ejecutar('profe-1', {
      titulo: 'Temporal',
      descripcion: '',
    });
    await new ActualizarCurso(d).ejecutar('profe-1', nuevo.cursoId, {
      imagenPortada: 'portada/a.png',
    });
    await new EliminarCurso(d).ejecutar('profe-1', nuevo.cursoId);
    expect(await d.cursos.buscarPorId(nuevo.cursoId)).toBeUndefined();
    expect(d.archivos.eliminados).toContain('portada/a.png');
  });

  it('publicar exige examen; el examen se valida pregunta por pregunta', async () => {
    const d = await preparar();
    const nuevo = await new CrearCurso(d).ejecutar('profe-1', {
      titulo: 'Nuevo',
      descripcion: '',
    });
    await expect(
      new GuardarExamen(d).ejecutar('profe-1', nuevo.cursoId, [
        { tipo: 'vf', texto: 'Sin respuesta' },
      ]),
    ).rejects.toThrow(ReglaDeNegocioError);
    await expect(
      new PublicarCurso(d).ejecutar('profe-1', nuevo.cursoId),
    ).rejects.toThrow('al menos un módulo');
  });
});

describe('Usuarios', () => {
  it('el registro siempre crea alumnos (en Laravel se podía elegir profesor)', async () => {
    const d = await preparar();
    const perfil = await new CompletarPerfil(d).ejecutar(
      { usuarioId: 'nuevo', correo: 'nuevo@a.cl' },
      {
        nombre: 'Nueva',
        sexo: 'Otro',
        fechaNacimiento: '2001-05-05',
        sede: 'Concepcion',
      },
    );
    expect(perfil.rol).toBe('alumno');
    expect(perfil.edad).toBe(25);
  });

  it('solo el admin cambia roles', async () => {
    const d = await preparar();
    await expect(
      new CambiarRol(d).ejecutar('profe-1', 'alumno-1', 'admin'),
    ).rejects.toThrow(SinPermisoError);
    const cambiado = await new CambiarRol(d).ejecutar(
      'admin-1',
      'alumno-1',
      'profesor',
    );
    expect(cambiado.rol).toBe('profesor');
  });

  it('la inscripción masiva informa a quién omitió', async () => {
    const d = await preparar();
    const resultado = await new InscripcionMasiva(d).ejecutar('admin-1', {
      usuarioIds: ['alumno-1', 'profe-1', 'alumno-1'],
      cursoId: 'curso-1',
      accion: 'inscribir',
    });
    expect(resultado).toEqual({
      procesados: 1,
      omitidos: [{ usuarioId: 'profe-1', motivo: 'no es un alumno' }],
    });
  });
});

describe('Foro y logros', () => {
  it('solo los inscritos comentan; las respuestas quedan bajo su comentario', async () => {
    const d = await preparar();
    await expect(
      new PublicarComentario(d).ejecutar('alumno-1', 'curso-1', 'mod-1', {
        contenido: 'Hola',
      }),
    ).rejects.toThrow(SinPermisoError);

    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    const { comentarioId } = await new PublicarComentario(d).ejecutar(
      'alumno-1',
      'curso-1',
      'mod-1',
      { contenido: '¿Dudas?' },
    );
    await new PublicarComentario(d).ejecutar('profe-1', 'curso-1', 'mod-1', {
      contenido: 'Respuesta',
      respuestaA: comentarioId,
    });
    await new AlternarLike(d).ejecutar('profe-1', comentarioId);

    const foro = await new VerForo(d).ejecutar('alumno-1', 'curso-1');
    expect(foro).toHaveLength(1);
    expect(foro[0]).toMatchObject({ likes: 1, meGusta: false });
    expect(foro[0].respuestas.map((r) => r.contenido)).toEqual(['Respuesta']);
  });

  it('la gamificación suma XP por módulos y examen aprobado', async () => {
    const d = await preparar();
    await new Inscribirse(d).ejecutar('alumno-1', 'curso-1');
    await new AlternarModulo(d).ejecutar('alumno-1', 'curso-1', 'mod-1');
    await new RendirExamen(d).ejecutar('alumno-1', 'curso-1', {
      intentoId: INTENTO_1,
      respuestas: BIEN,
    });
    const { estado, ranking } = await new MiGamificacion(d).ejecutar(
      'alumno-1',
    );
    expect(estado.xpTotal).toBe(300);
    expect(ranking[0]).toMatchObject({
      usuarioId: 'alumno-1',
      posicion: 1,
      esYo: true,
    });
  });
});
