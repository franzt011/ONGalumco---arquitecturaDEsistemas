/**
 * Perfil propio y administración de usuarios. Reemplazan RegisteredUserController.php,
 * ProfileController.php y Admin/UsuarioController.php.
 *
 * El login y la contraseña ya no los maneja el backend: los maneja Amazon Cognito.
 * El backend solo guarda el perfil (nombre, sexo, fecha de nacimiento, sede y rol).
 */
import {
  ConflictoError,
  NoEncontradoError,
  ReglaDeNegocioError,
} from '../../dominio/errores';
import { Inscripcion } from '../../dominio/inscripcion';
import { Rol, Sede, Sexo, Usuario } from '../../dominio/usuario';
import { exigirCurso, exigirUsuario } from '../comun';
import { Dependencias } from '../puertos';
import { VistaUsuario, vistaUsuario } from '../vistas';

/**
 * Después de registrarse en Cognito, el usuario completa su perfil.
 * Arreglo de seguridad: en Laravel el formulario de registro dejaba elegir el rol 'profesor'.
 * Aquí todos parten como 'alumno' y solo un Admin puede cambiar el rol.
 */
export class CompletarPerfil {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    identidad: { usuarioId: string; correo: string },
    datos: { nombre: string; sexo: Sexo; fechaNacimiento: string; sede: Sede },
  ): Promise<VistaUsuario> {
    const existente = await this.d.usuarios.buscarPorId(identidad.usuarioId);
    if (existente) {
      throw new ConflictoError(
        'perfil-existente',
        'Tu perfil ya está registrado.',
      );
    }
    const hoy = this.d.reloj.ahora();
    if (new Date(`${datos.fechaNacimiento}T00:00:00Z`) > hoy) {
      throw new ReglaDeNegocioError(
        'fecha-invalida',
        'La fecha de nacimiento no puede ser futura.',
      );
    }
    const usuario = Usuario.crear({ ...identidad, ...datos, rol: 'alumno' });
    await this.d.usuarios.guardar(usuario);
    return vistaUsuario(usuario, hoy);
  }
}

export class VerMiPerfil {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(usuarioId: string): Promise<VistaUsuario> {
    const usuario = await exigirUsuario(this.d, usuarioId);
    return vistaUsuario(usuario, this.d.reloj.ahora());
  }
}

/** Lista de alumnos o de profesores (los admin aparecen junto a los profesores, como en Laravel). */
export class ListarUsuarios {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    adminId: string,
    filtro: { tipo: 'alumnos' | 'profesores'; buscar?: string },
  ): Promise<VistaUsuario[]> {
    await exigirUsuario(this.d, adminId, ['admin']);
    const roles: Rol[] =
      filtro.tipo === 'alumnos' ? ['alumno'] : ['profesor', 'admin'];
    const texto = filtro.buscar?.trim().toLowerCase();
    const hoy = this.d.reloj.ahora();
    return (await this.d.usuarios.listarPorRoles(roles))
      .filter((u) => !texto || u.nombre.toLowerCase().includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((u) => vistaUsuario(u, hoy));
  }
}

export class VerUsuario {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    adminId: string,
    usuarioId: string,
  ): Promise<
    VistaUsuario & {
      cursos: { cursoId: string; titulo: string; estado: string }[];
    }
  > {
    await exigirUsuario(this.d, adminId, ['admin']);
    const usuario = await this.d.usuarios.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NoEncontradoError(
        'usuario-no-encontrado',
        `No existe el usuario ${usuarioId}.`,
      );
    }

    let cursos: { cursoId: string; titulo: string; estado: string }[];
    if (usuario.rol === 'alumno') {
      cursos = [];
      for (const inscripcion of await this.d.inscripciones.listarPorAlumno(
        usuarioId,
      )) {
        const curso = await this.d.cursos.buscarPorId(inscripcion.cursoId);
        if (curso) {
          cursos.push({
            cursoId: curso.cursoId,
            titulo: curso.titulo,
            estado: inscripcion.estadoVisible(curso.maxIntentos),
          });
        }
      }
    } else {
      cursos = (await this.d.cursos.listarPorProfesor(usuarioId)).map((c) => ({
        cursoId: c.cursoId,
        titulo: c.titulo,
        estado: c.estado,
      }));
    }
    return { ...vistaUsuario(usuario, this.d.reloj.ahora()), cursos };
  }
}

export class CambiarRol {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    adminId: string,
    usuarioId: string,
    rol: Rol,
  ): Promise<VistaUsuario> {
    const admin = await exigirUsuario(this.d, adminId, ['admin']);
    const usuario = await this.d.usuarios.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NoEncontradoError(
        'usuario-no-encontrado',
        `No existe el usuario ${usuarioId}.`,
      );
    }
    usuario.cambiarRol(rol, admin);
    await this.d.usuarios.guardar(usuario);
    return vistaUsuario(usuario, this.d.reloj.ahora());
  }
}

export interface ResultadoMasivo {
  procesados: number;
  omitidos: { usuarioId: string; motivo: string }[];
}

/**
 * Inscribe o desinscribe a varios alumnos en un curso (UsuarioController@procesarMasivo).
 * Lo nuevo: informa a quiénes no se pudo procesar en vez de fallar o ignorarlos en silencio.
 */
export class InscripcionMasiva {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(
    adminId: string,
    datos: {
      usuarioIds: string[];
      cursoId: string;
      accion: 'inscribir' | 'desinscribir';
    },
  ): Promise<ResultadoMasivo> {
    await exigirUsuario(this.d, adminId, ['admin']);
    await exigirCurso(this.d, datos.cursoId);
    const resultado: ResultadoMasivo = { procesados: 0, omitidos: [] };

    for (const usuarioId of new Set(datos.usuarioIds)) {
      const usuario = await this.d.usuarios.buscarPorId(usuarioId);
      if (!usuario || usuario.rol !== 'alumno') {
        resultado.omitidos.push({ usuarioId, motivo: 'no es un alumno' });
        continue;
      }
      if (datos.accion === 'inscribir') {
        const creada = await this.d.inscripciones.crearSiNoExiste(
          new Inscripcion({
            alumnoId: usuarioId,
            cursoId: datos.cursoId,
            fechaInscripcion: this.d.reloj.ahora().toISOString(),
          }),
        );
        if (!creada) {
          resultado.omitidos.push({ usuarioId, motivo: 'ya estaba inscrito' });
          continue;
        }
      } else {
        const existente = await this.d.inscripciones.buscar(
          usuarioId,
          datos.cursoId,
        );
        if (!existente) {
          resultado.omitidos.push({ usuarioId, motivo: 'no estaba inscrito' });
          continue;
        }
        await this.d.inscripciones.eliminar(usuarioId, datos.cursoId);
      }
      resultado.procesados += 1;
    }
    return resultado;
  }
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

function contar(
  valores: (string | undefined)[],
): { valor: string; total: number }[] {
  const conteo = new Map<string, number>();
  for (const valor of valores) {
    if (valor !== undefined) {
      conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
    }
  }
  return [...conteo].map(([valor, total]) => ({ valor, total }));
}

/** Mismos rangos que UsuarioController@estadisticas. */
function rangoDeEdad(edad: number): string {
  if (edad < 20) return 'Menores de 20';
  if (edad <= 29) return '20-29 años';
  if (edad <= 39) return '30-39 años';
  return '40+ años';
}

export class VerEstadisticas {
  constructor(private readonly d: Dependencias) {}

  async ejecutar(adminId: string): Promise<Estadisticas> {
    await exigirUsuario(this.d, adminId, ['admin']);
    const hoy = this.d.reloj.ahora();
    const usuarios = await this.d.usuarios.listarPorRoles([
      'admin',
      'profesor',
      'alumno',
    ]);

    const finalizaciones = [];
    for (const intento of await this.d.intentos.listarRecientes(10)) {
      const [alumno, curso] = await Promise.all([
        this.d.usuarios.buscarPorId(intento.alumnoId),
        this.d.cursos.buscarPorId(intento.cursoId),
      ]);
      finalizaciones.push({
        alumno: alumno?.nombre ?? 'Usuario eliminado',
        curso: curso?.titulo ?? 'Curso eliminado',
        sede: alumno?.sede ?? 'Sin sede',
        puntuacion: intento.porcentaje,
        aprobado: intento.aprobado,
        fecha: intento.fecha,
      });
    }

    return {
      totalUsuarios: usuarios.length,
      porRol: contar(usuarios.map((u) => u.rol)).map(({ valor, total }) => ({
        rol: valor,
        total,
      })),
      porSexo: contar(usuarios.map((u) => u.sexo)).map(({ valor, total }) => ({
        sexo: valor,
        total,
      })),
      porSede: contar(usuarios.map((u) => u.sede)).map(({ valor, total }) => ({
        sede: valor,
        total,
      })),
      porEdad: contar(
        usuarios.map((u) => {
          const edad = u.edad(hoy);
          return edad === undefined ? undefined : rangoDeEdad(edad);
        }),
      ).map(({ valor, total }) => ({ rango: valor, total })),
      finalizaciones,
    };
  }
}
