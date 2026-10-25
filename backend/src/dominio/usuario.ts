import { ReglaDeNegocioError, SinPermisoError } from './errores';

export type Rol = 'admin' | 'profesor' | 'alumno';
export type Sexo = 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo';
export type Sede = 'Santiago' | 'Concepcion';

export const ROLES: readonly Rol[] = ['admin', 'profesor', 'alumno'];
export const SEDES: readonly Sede[] = ['Santiago', 'Concepcion'];
export const SEXOS: readonly Sexo[] = [
  'Masculino',
  'Femenino',
  'Otro',
  'Prefiero no decirlo',
];

export interface DatosUsuario {
  usuarioId: string;
  nombre: string;
  correo: string;
  rol: Rol;
  sexo?: Sexo;
  /** Formato AAAA-MM-DD. */
  fechaNacimiento?: string;
  sede?: Sede;
  rachaDias?: number;
  /** Último día (AAAA-MM-DD) en que completó un módulo. */
  ultimaActividad?: string;
}

/** Fecha de hoy en formato AAAA-MM-DD. */
export function soloFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export class Usuario {
  readonly usuarioId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly sexo?: Sexo;
  readonly fechaNacimiento?: string;
  readonly sede?: Sede;
  private _rol: Rol;
  private _rachaDias: number;
  private _ultimaActividad?: string;

  private constructor(datos: DatosUsuario) {
    this.usuarioId = datos.usuarioId;
    this.nombre = datos.nombre;
    this.correo = datos.correo;
    this.sexo = datos.sexo;
    this.fechaNacimiento = datos.fechaNacimiento;
    this.sede = datos.sede;
    this._rol = datos.rol;
    this._rachaDias = datos.rachaDias ?? 0;
    this._ultimaActividad = datos.ultimaActividad;
  }

  /** Crea un usuario validando sus datos. Si algo no cumple, lanza un error y no se crea. */
  static crear(datos: DatosUsuario): Usuario {
    if (datos.nombre.trim() === '') {
      throw new ReglaDeNegocioError(
        'usuario-invalido',
        'El usuario necesita un nombre.',
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
      throw new ReglaDeNegocioError(
        'usuario-invalido',
        'El correo no es válido.',
      );
    }
    if (!ROLES.includes(datos.rol)) {
      throw new ReglaDeNegocioError(
        'usuario-invalido',
        `El rol "${datos.rol}" no existe.`,
      );
    }
    return new Usuario(datos);
  }

  get rol(): Rol {
    return this._rol;
  }

  get rachaDias(): number {
    return this._rachaDias;
  }

  get ultimaActividad(): string | undefined {
    return this._ultimaActividad;
  }

  /** Edad cumplida a la fecha indicada, o undefined si no registró su fecha de nacimiento. */
  edad(hoy: Date): number | undefined {
    if (!this.fechaNacimiento) {
      return undefined;
    }
    const nacimiento = new Date(`${this.fechaNacimiento}T00:00:00Z`);
    let edad = hoy.getUTCFullYear() - nacimiento.getUTCFullYear();
    const yaCumplio =
      hoy.getUTCMonth() > nacimiento.getUTCMonth() ||
      (hoy.getUTCMonth() === nacimiento.getUTCMonth() &&
        hoy.getUTCDate() >= nacimiento.getUTCDate());
    if (!yaCumplio) {
      edad -= 1;
    }
    return edad;
  }

  /** Solo el Admin cambia roles, y no puede cambiarse el suyo (así nunca queda el sistema sin administrador). */
  cambiarRol(nuevoRol: Rol, solicitante: Usuario): void {
    if (solicitante.usuarioId === this.usuarioId) {
      throw new SinPermisoError(
        'rol-propio',
        'Un administrador no puede cambiar su propio rol.',
      );
    }
    if (!ROLES.includes(nuevoRol)) {
      throw new ReglaDeNegocioError(
        'rol-invalido',
        `El rol "${nuevoRol}" no existe.`,
      );
    }
    this._rol = nuevoRol;
  }

  /**
   * Racha de días seguidos con actividad (gamificación).
   * - Si ya registró actividad hoy, no cambia.
   * - Si la última actividad fue ayer, la racha sube en 1.
   * - Si no, la racha vuelve a empezar en 1.
   */
  registrarActividad(hoy: Date): void {
    const fechaHoy = soloFecha(hoy);
    if (this._ultimaActividad === fechaHoy) {
      return;
    }
    const ayer = soloFecha(new Date(hoy.getTime() - 24 * 60 * 60 * 1000));
    this._rachaDias = this._ultimaActividad === ayer ? this._rachaDias + 1 : 1;
    this._ultimaActividad = fechaHoy;
  }
}
