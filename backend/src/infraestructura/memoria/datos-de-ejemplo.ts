/**
 * Datos de ejemplo para probar la API en tu computador (equivale a un seeder de Laravel).
 * Usa ids fáciles de escribir en los encabezados: x-usuario-id: admin-1, profe-1 o alumno-1.
 */
import { Curso, Modulo } from '../../dominio/curso';
import { Examen, Pregunta } from '../../dominio/examen';
import { Usuario } from '../../dominio/usuario';
import { Dependencias } from '../../aplicacion/puertos';

export async function cargarDatosDeEjemplo(d: Dependencias): Promise<void> {
  const admin = Usuario.crear({
    usuarioId: 'admin-1',
    nombre: 'Administración Alumco',
    correo: 'admin@alumco.cl',
    rol: 'admin',
    sede: 'Santiago',
  });
  const profe = Usuario.crear({
    usuarioId: 'profe-1',
    nombre: 'Carla Rojas',
    correo: 'carla@alumco.cl',
    rol: 'profesor',
    sede: 'Concepcion',
    sexo: 'Femenino',
    fechaNacimiento: '1988-03-14',
  });
  const alumno = Usuario.crear({
    usuarioId: 'alumno-1',
    nombre: 'Diego Muñoz',
    correo: 'diego@alumco.cl',
    rol: 'alumno',
    sede: 'Santiago',
    sexo: 'Masculino',
    fechaNacimiento: '1999-11-02',
  });
  for (const u of [admin, profe, alumno]) {
    await d.usuarios.guardar(u);
  }

  const curso = Curso.crear({
    cursoId: 'curso-1',
    profesorId: profe.usuarioId,
    titulo: 'Prevención de caídas en adultos mayores',
    descripcion:
      'Cómo reconocer riesgos y movilizar a un residente de forma segura.',
    exigenciaMinima: 60,
    maxIntentos: 2,
    fechaCreacion: '2026-10-01T12:00:00.000Z',
  });
  curso.guardarModulo(
    profe,
    new Modulo({
      moduloId: 'mod-1',
      titulo: 'Factores de riesgo',
      contenido: 'Medicamentos, calzado, iluminación y superficies.',
      duracion: '15 min',
    }),
  );
  curso.guardarModulo(
    profe,
    new Modulo({
      moduloId: 'mod-2',
      titulo: 'Movilización segura',
      contenido: 'Técnicas para levantar y trasladar.',
      linkVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duracion: '20 min',
    }),
  );

  const examen = new Examen(curso.cursoId, [
    new Pregunta({
      preguntaId: 'p1',
      tipo: 'vf',
      texto: 'Una buena iluminación reduce el riesgo de caídas.',
      respuestaVf: true,
    }),
    new Pregunta({
      preguntaId: 'p2',
      tipo: 'multiple',
      texto: '¿Qué calzado es el más seguro?',
      opciones: [
        { opcionId: 'p2-a', texto: 'Pantuflas abiertas', esCorrecta: false },
        {
          opcionId: 'p2-b',
          texto: 'Zapato cerrado con suela antideslizante',
          esCorrecta: true,
        },
        { opcionId: 'p2-c', texto: 'Calcetines', esCorrecta: false },
      ],
    }),
  ]);
  await d.examenes.guardar(examen);
  curso.publicar(profe, examen.cantidadPreguntas);
  await d.cursos.guardar(curso);
}
