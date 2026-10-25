import { exigirArchivoPermitido } from './archivo';
import { Comentario } from './comentario';
import { Curso, Modulo } from './curso';
import { ReglaDeNegocioError, SinPermisoError } from './errores';
import { Examen, Pregunta } from './examen';
import { calcularGamificacion, ordenarRanking } from './gamificacion';
import { Inscripcion } from './inscripcion';
import { Usuario } from './usuario';

const profe = Usuario.crear({
  usuarioId: 'p1',
  nombre: 'Carla',
  correo: 'c@a.cl',
  rol: 'profesor',
});
const otroProfe = Usuario.crear({
  usuarioId: 'p2',
  nombre: 'Pedro',
  correo: 'p@a.cl',
  rol: 'profesor',
});
const admin = Usuario.crear({
  usuarioId: 'a1',
  nombre: 'Admin',
  correo: 'a@a.cl',
  rol: 'admin',
});

function curso(): Curso {
  return Curso.crear({
    cursoId: 'c1',
    profesorId: 'p1',
    titulo: 'Curso',
    descripcion: 'd',
    fechaCreacion: '2026-01-01',
  });
}

function examen(): Examen {
  return new Examen('c1', [
    new Pregunta({
      preguntaId: 'vf1',
      tipo: 'vf',
      texto: '¿Verdadero?',
      respuestaVf: true,
    }),
    new Pregunta({
      preguntaId: 'm1',
      tipo: 'multiple',
      texto: '¿Cuál?',
      opciones: [
        { opcionId: 'a', texto: 'A', esCorrecta: false },
        { opcionId: 'b', texto: 'B', esCorrecta: true },
      ],
    }),
    new Pregunta({
      preguntaId: 'vf2',
      tipo: 'vf',
      texto: '¿Falso?',
      respuestaVf: false,
    }),
  ]);
}

describe('Curso', () => {
  it('nace en borrador con los valores por defecto de Laravel (60% y 2 intentos)', () => {
    const c = curso();
    expect(c.estado).toBe('borrador');
    expect(c.exigenciaMinima).toBe(60);
    expect(c.maxIntentos).toBe(2);
  });

  it('rechaza una exigencia mínima fuera de 1 a 100', () => {
    expect(() =>
      Curso.crear({
        cursoId: 'c',
        profesorId: 'p1',
        titulo: 'T',
        descripcion: '',
        exigenciaMinima: 120,
        fechaCreacion: '',
      }),
    ).toThrow(ReglaDeNegocioError);
  });

  it('solo el profesor dueño o un admin pueden gestionarlo', () => {
    const c = curso();
    expect(() => c.exigirPuedeGestionar(profe)).not.toThrow();
    expect(() => c.exigirPuedeGestionar(admin)).not.toThrow();
    expect(() => c.exigirPuedeGestionar(otroProfe)).toThrow(SinPermisoError);
  });

  it('no se publica sin módulos ni sin preguntas', () => {
    const c = curso();
    expect(() => c.publicar(profe, 3)).toThrow('al menos un módulo');
    c.guardarModulo(profe, new Modulo({ moduloId: 'm', titulo: 'Módulo' }));
    expect(() => c.publicar(profe, 0)).toThrow('al menos una pregunta');
    c.publicar(profe, 3);
    expect(c.estado).toBe('publicado');
  });

  it('un cambio inválido no deja el curso a medias', () => {
    const c = curso();
    expect(() =>
      c.actualizar(profe, { titulo: 'Nuevo', maxIntentos: 0 }),
    ).toThrow(ReglaDeNegocioError);
    expect(c.titulo).toBe('Curso');
  });

  it('un curso publicado no puede quedar sin módulos', () => {
    const c = curso();
    c.guardarModulo(profe, new Modulo({ moduloId: 'm', titulo: 'Módulo' }));
    c.publicar(profe, 1);
    expect(() => c.eliminarModulo(profe, 'm')).toThrow(ReglaDeNegocioError);
  });
});

describe('Examen', () => {
  it('califica igual que Laravel: sin responder cuenta como incorrecta y se redondea', () => {
    const resultado = examen().calificar(
      [
        { preguntaId: 'vf1', respuesta: 'verdadero' },
        { preguntaId: 'm1', respuesta: 'b' },
      ],
      60,
    );
    expect(resultado).toEqual({
      correctas: 2,
      total: 3,
      porcentaje: 67,
      aprobado: true,
    });
  });

  it('reprueba bajo la exigencia mínima', () => {
    const resultado = examen().calificar(
      [{ preguntaId: 'vf1', respuesta: 'verdadero' }],
      60,
    );
    expect(resultado.porcentaje).toBe(33);
    expect(resultado.aprobado).toBe(false);
  });

  it('rechaza respuestas a preguntas de otro examen', () => {
    expect(() =>
      examen().calificar([{ preguntaId: 'otra', respuesta: 'a' }], 60),
    ).toThrow(ReglaDeNegocioError);
  });

  it('CONTRATO: la vista del alumno nunca incluye la respuesta correcta', () => {
    const texto = JSON.stringify(examen().vistaAlumno());
    expect(texto).not.toContain('esCorrecta');
    expect(texto).not.toContain('respuestaVf');
  });

  it('una pregunta múltiple necesita exactamente una opción correcta', () => {
    expect(
      () =>
        new Pregunta({
          preguntaId: 'x',
          tipo: 'multiple',
          texto: '¿?',
          opciones: [
            { opcionId: 'a', texto: 'A', esCorrecta: true },
            { opcionId: 'b', texto: 'B', esCorrecta: true },
          ],
        }),
    ).toThrow('exactamente 1');
  });
});

describe('Inscripcion', () => {
  const resultado = (aprobado: boolean) => ({
    correctas: 0,
    total: 1,
    porcentaje: aprobado ? 100 : 0,
    aprobado,
  });

  it('marcar un módulo dos veces lo desmarca (toggle)', () => {
    const i = new Inscripcion({
      alumnoId: 'al',
      cursoId: 'c1',
      fechaInscripcion: '',
    });
    expect(i.alternarModulo('m1')).toBe(true);
    expect(i.alternarModulo('m1')).toBe(false);
    expect(i.modulosCompletados).toEqual([]);
  });

  it('se muestra como reprobado al agotar los intentos sin aprobar', () => {
    const i = new Inscripcion({
      alumnoId: 'al',
      cursoId: 'c1',
      fechaInscripcion: '',
    });
    i.registrarIntento(resultado(false), 'f');
    i.registrarIntento(resultado(false), 'f');
    expect(i.estadoVisible(2)).toBe('reprobado');
    expect(() => i.exigirPuedeRendir(2, [])).toThrow('máximo de intentos');
  });

  it('no se rinde con módulos pendientes', () => {
    const i = new Inscripcion({
      alumnoId: 'al',
      cursoId: 'c1',
      fechaInscripcion: '',
    });
    i.alternarModulo('m1');
    expect(() => i.exigirPuedeRendir(2, ['m1', 'm2'])).toThrow('faltan 1');
    i.alternarModulo('m2');
    expect(() => i.exigirPuedeRendir(2, ['m1', 'm2'])).not.toThrow();
  });

  it('un curso aprobado no se vuelve a rendir', () => {
    const i = new Inscripcion({
      alumnoId: 'al',
      cursoId: 'c1',
      fechaInscripcion: '',
    });
    i.registrarIntento(resultado(true), '2026-10-25');
    expect(i.estado).toBe('completado');
    expect(i.fechaTermino).toBe('2026-10-25');
    expect(() => i.exigirPuedeRendir(2, [])).toThrow('Ya aprobaste');
  });
});

describe('Usuario', () => {
  const alumno = () =>
    Usuario.crear({
      usuarioId: 'u',
      nombre: 'Ana',
      correo: 'ana@a.cl',
      rol: 'alumno',
      fechaNacimiento: '2000-10-26',
    });

  it('la racha sube con días seguidos y se reinicia si se salta un día', () => {
    const u = alumno();
    u.registrarActividad(new Date('2026-10-01T10:00:00Z'));
    u.registrarActividad(new Date('2026-10-01T18:00:00Z'));
    u.registrarActividad(new Date('2026-10-02T09:00:00Z'));
    expect(u.rachaDias).toBe(2);
    u.registrarActividad(new Date('2026-10-05T09:00:00Z'));
    expect(u.rachaDias).toBe(1);
  });

  it('calcula la edad cumplida', () => {
    expect(alumno().edad(new Date('2026-10-25T00:00:00Z'))).toBe(25);
    expect(alumno().edad(new Date('2026-10-26T00:00:00Z'))).toBe(26);
  });

  it('un admin no puede cambiar su propio rol', () => {
    expect(() => admin.cambiarRol('alumno', admin)).toThrow(SinPermisoError);
  });
});

describe('Gamificación', () => {
  it('suma 100 XP por módulo y 200 por examen, y sube de nivel cada 1000', () => {
    const estado = calcularGamificacion({
      modulosCompletados: 8,
      examenesAprobados: 1,
      cursosCompletados: 1,
      rachaDias: 3,
    });
    expect(estado.xpTotal).toBe(1000);
    expect(estado.nivel).toBe(2);
    expect(estado.xpEnNivel).toBe(0);
    const desbloqueados = estado.logros
      .filter((l) => l.desbloqueado)
      .map((l) => l.id);
    expect(desbloqueados).toEqual([
      'primer_modulo',
      'en_racha',
      'curioso',
      'campeon',
    ]);
  });

  it('el ranking ordena por XP y marca al usuario actual', () => {
    const ranking = ordenarRanking(
      [
        {
          usuarioId: 'a',
          nombre: 'Ana',
          sede: 'Santiago',
          rachaDias: 0,
          xp: 100,
        },
        {
          usuarioId: 'b',
          nombre: 'Beto',
          sede: 'Santiago',
          rachaDias: 0,
          xp: 300,
        },
      ],
      'a',
    );
    expect(ranking.map((r) => [r.usuarioId, r.posicion, r.esYo])).toEqual([
      ['b', 1, false],
      ['a', 2, true],
    ]);
  });
});

describe('Comentario y archivos', () => {
  it('un like dos veces se quita (y no hay likes duplicados)', () => {
    const c = new Comentario({
      comentarioId: 'k',
      cursoId: 'c',
      moduloId: 'm',
      autorId: 'u',
      autorNombre: 'U',
      contenido: 'Hola',
      fecha: '',
    });
    expect(c.alternarLike('x')).toBe(true);
    expect(c.alternarLike('x')).toBe(false);
    expect(c.cantidadLikes).toBe(0);
  });

  it('solo acepta archivos permitidos y del tamaño correcto', () => {
    expect(() =>
      exigirArchivoPermitido('material', 'clase.PDF', 1000),
    ).not.toThrow();
    expect(() => exigirArchivoPermitido('material', 'virus.exe', 1000)).toThrow(
      ReglaDeNegocioError,
    );
    expect(() =>
      exigirArchivoPermitido('portada', 'foto.png', 6 * 1024 * 1024),
    ).toThrow('5 MB');
  });
});
