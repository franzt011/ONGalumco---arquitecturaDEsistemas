import { ReglaDeNegocioError } from './errores';
import { ResultadoExamen } from './examen';

/** 'reprobado' no se guarda: se calcula cuando el alumno agotó sus intentos sin aprobar. */
export type EstadoInscripcion = 'en_progreso' | 'completado';
export type EstadoVisible = EstadoInscripcion | 'reprobado';

export interface DatosInscripcion {
  alumnoId: string;
  cursoId: string;
  fechaInscripcion: string;
  estado?: EstadoInscripcion;
  modulosCompletados?: string[];
  intentosUsados?: number;
  calificacion?: number;
  fechaTermino?: string;
}

/** Avance de un alumno en un curso. Reemplaza las tablas inscripciones + progreso_modulos de Laravel. */
export class Inscripcion {
  readonly alumnoId: string;
  readonly cursoId: string;
  readonly fechaInscripcion: string;
  private _estado: EstadoInscripcion;
  private _modulosCompletados: string[];
  private _intentosUsados: number;
  private _calificacion?: number;
  private _fechaTermino?: string;

  constructor(datos: DatosInscripcion) {
    this.alumnoId = datos.alumnoId;
    this.cursoId = datos.cursoId;
    this.fechaInscripcion = datos.fechaInscripcion;
    this._estado = datos.estado ?? 'en_progreso';
    this._modulosCompletados = [...(datos.modulosCompletados ?? [])];
    this._intentosUsados = datos.intentosUsados ?? 0;
    this._calificacion = datos.calificacion;
    this._fechaTermino = datos.fechaTermino;
  }

  get estado(): EstadoInscripcion {
    return this._estado;
  }
  get modulosCompletados(): readonly string[] {
    return this._modulosCompletados;
  }
  get intentosUsados(): number {
    return this._intentosUsados;
  }
  get calificacion(): number | undefined {
    return this._calificacion;
  }
  get fechaTermino(): string | undefined {
    return this._fechaTermino;
  }

  /**
   * Marca o desmarca un módulo, igual que completarModulo() en Laravel (era un toggle).
   * Devuelve true si el módulo quedó completado.
   */
  alternarModulo(moduloId: string): boolean {
    if (this._modulosCompletados.includes(moduloId)) {
      this._modulosCompletados = this._modulosCompletados.filter(
        (id) => id !== moduloId,
      );
      return false;
    }
    this._modulosCompletados.push(moduloId);
    return true;
  }

  intentosRestantes(maxIntentos: number): number {
    if (this._estado === 'completado') {
      return 0;
    }
    return Math.max(0, maxIntentos - this._intentosUsados);
  }

  /** Igual que el DashboardController de Laravel: si agotó los intentos sin aprobar, se muestra 'reprobado'. */
  estadoVisible(maxIntentos: number): EstadoVisible {
    if (this._estado === 'en_progreso' && this._intentosUsados >= maxIntentos) {
      return 'reprobado';
    }
    return this._estado;
  }

  /**
   * Se llama antes de calificar, para no gastar un intento si el alumno no puede rendir.
   * Lo nuevo: un curso ya aprobado no se vuelve a rendir (en Laravel sí se podía, y sumaba XP de nuevo).
   */
  exigirPuedeRendir(maxIntentos: number): void {
    if (this._estado === 'completado') {
      throw new ReglaDeNegocioError(
        'curso-aprobado',
        'Ya aprobaste este curso.',
      );
    }
    if (this._intentosUsados >= maxIntentos) {
      throw new ReglaDeNegocioError(
        'intentos-agotados',
        'Has alcanzado el número máximo de intentos permitidos.',
      );
    }
  }

  registrarIntento(resultado: ResultadoExamen, fecha: string): void {
    this._intentosUsados += 1;
    this._calificacion = resultado.porcentaje;
    if (resultado.aprobado) {
      this._estado = 'completado';
      this._fechaTermino = fecha;
    }
  }
}
