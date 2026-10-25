import { ArchivoAdjunto } from './archivo';
import {
  NoEncontradoError,
  ReglaDeNegocioError,
  SinPermisoError,
} from './errores';
import { Usuario } from './usuario';

export type EstadoCurso = 'borrador' | 'publicado';

export interface DatosModulo {
  moduloId: string;
  titulo: string;
  contenido?: string;
  duracion?: string;
  linkVideo?: string;
  archivos?: ArchivoAdjunto[];
}

/** Un módulo del curso. Es inmutable: para editarlo se reemplaza por uno nuevo con el mismo id. */
export class Modulo {
  readonly moduloId: string;
  readonly titulo: string;
  readonly contenido?: string;
  readonly duracion?: string;
  readonly linkVideo?: string;
  readonly archivos: readonly ArchivoAdjunto[];

  constructor(datos: DatosModulo) {
    if (datos.titulo.trim() === '') {
      throw new ReglaDeNegocioError(
        'modulo-invalido',
        'El módulo necesita un título.',
      );
    }
    if (datos.linkVideo && !/^https?:\/\//i.test(datos.linkVideo)) {
      throw new ReglaDeNegocioError(
        'modulo-invalido',
        'El enlace del video debe ser una URL.',
      );
    }
    this.moduloId = datos.moduloId;
    this.titulo = datos.titulo;
    this.contenido = datos.contenido;
    this.duracion = datos.duracion;
    this.linkVideo = datos.linkVideo;
    this.archivos = [...(datos.archivos ?? [])];
  }
}

export interface DatosCurso {
  cursoId: string;
  profesorId: string;
  titulo: string;
  descripcion: string;
  /** Porcentaje mínimo para aprobar (1 a 100). En Laravel: exigencia_minima, por defecto 60. */
  exigenciaMinima?: number;
  /** Intentos permitidos para el examen. En Laravel: max_intentos, por defecto 2. */
  maxIntentos?: number;
  imagenPortada?: string;
  archivoCertificado?: string;
  fechaCreacion: string;
}

export interface CambiosCurso {
  titulo?: string;
  descripcion?: string;
  exigenciaMinima?: number;
  maxIntentos?: number;
  imagenPortada?: string;
  archivoCertificado?: string;
}

export const EXIGENCIA_POR_DEFECTO = 60;
export const INTENTOS_POR_DEFECTO = 2;

function invalido(detalle: string): ReglaDeNegocioError {
  return new ReglaDeNegocioError('curso-invalido', detalle);
}

function exigirDatosValidos(
  titulo: string,
  exigenciaMinima: number,
  maxIntentos: number,
): void {
  if (titulo.trim() === '') {
    throw invalido('El curso necesita un título.');
  }
  if (
    !Number.isInteger(exigenciaMinima) ||
    exigenciaMinima < 1 ||
    exigenciaMinima > 100
  ) {
    throw invalido('La exigencia mínima debe ser un entero entre 1 y 100.');
  }
  if (!Number.isInteger(maxIntentos) || maxIntentos < 1 || maxIntentos > 10) {
    throw invalido('Los intentos permitidos deben ser un entero entre 1 y 10.');
  }
}

export class Curso {
  readonly cursoId: string;
  readonly profesorId: string;
  readonly fechaCreacion: string;
  private _titulo: string;
  private _descripcion: string;
  private _exigenciaMinima: number;
  private _maxIntentos: number;
  private _imagenPortada?: string;
  private _archivoCertificado?: string;
  private _estado: EstadoCurso = 'borrador';
  private _modulos: Modulo[] = [];

  private constructor(datos: DatosCurso) {
    this.cursoId = datos.cursoId;
    this.profesorId = datos.profesorId;
    this.fechaCreacion = datos.fechaCreacion;
    this._titulo = datos.titulo;
    this._descripcion = datos.descripcion;
    this._exigenciaMinima = datos.exigenciaMinima ?? EXIGENCIA_POR_DEFECTO;
    this._maxIntentos = datos.maxIntentos ?? INTENTOS_POR_DEFECTO;
    this._imagenPortada = datos.imagenPortada;
    this._archivoCertificado = datos.archivoCertificado;
  }

  /** Un curso nuevo siempre nace en borrador. */
  static crear(datos: DatosCurso): Curso {
    exigirDatosValidos(
      datos.titulo,
      datos.exigenciaMinima ?? EXIGENCIA_POR_DEFECTO,
      datos.maxIntentos ?? INTENTOS_POR_DEFECTO,
    );
    return new Curso(datos);
  }

  /** Reconstruye un curso ya guardado (lo usa el repositorio al leer de la base de datos). */
  static restaurar(
    datos: DatosCurso,
    estado: EstadoCurso,
    modulos: DatosModulo[],
  ): Curso {
    const curso = new Curso(datos);
    curso._estado = estado;
    curso._modulos = modulos.map((m) => new Modulo(m));
    return curso;
  }

  get titulo(): string {
    return this._titulo;
  }
  get descripcion(): string {
    return this._descripcion;
  }
  get exigenciaMinima(): number {
    return this._exigenciaMinima;
  }
  get maxIntentos(): number {
    return this._maxIntentos;
  }
  get imagenPortada(): string | undefined {
    return this._imagenPortada;
  }
  get archivoCertificado(): string | undefined {
    return this._archivoCertificado;
  }
  get estado(): EstadoCurso {
    return this._estado;
  }
  get modulos(): readonly Modulo[] {
    return this._modulos;
  }

  /**
   * El profesor dueño o un Admin pueden modificar el curso.
   * En Laravel la zona profesor no tenía middleware: cualquier usuario logueado podía entrar.
   */
  exigirPuedeGestionar(solicitante: Usuario): void {
    const esDueno =
      solicitante.rol === 'profesor' &&
      solicitante.usuarioId === this.profesorId;
    if (!esDueno && solicitante.rol !== 'admin') {
      throw new SinPermisoError(
        'sin-permiso-curso',
        'Solo el profesor del curso o un administrador pueden hacer esto.',
      );
    }
  }

  /** Valida todo antes de asignar, para que un cambio rechazado no deje el curso a medias. */
  actualizar(solicitante: Usuario, cambios: CambiosCurso): void {
    this.exigirPuedeGestionar(solicitante);
    const titulo = cambios.titulo ?? this._titulo;
    const exigencia = cambios.exigenciaMinima ?? this._exigenciaMinima;
    const intentos = cambios.maxIntentos ?? this._maxIntentos;
    exigirDatosValidos(titulo, exigencia, intentos);
    this._titulo = titulo;
    this._descripcion = cambios.descripcion ?? this._descripcion;
    this._exigenciaMinima = exigencia;
    this._maxIntentos = intentos;
    this._imagenPortada = cambios.imagenPortada ?? this._imagenPortada;
    this._archivoCertificado =
      cambios.archivoCertificado ?? this._archivoCertificado;
  }

  /** Agrega un módulo, o lo reemplaza si ya existe uno con el mismo id. */
  guardarModulo(solicitante: Usuario, modulo: Modulo): void {
    this.exigirPuedeGestionar(solicitante);
    const posicion = this._modulos.findIndex(
      (m) => m.moduloId === modulo.moduloId,
    );
    if (posicion === -1) {
      this._modulos.push(modulo);
    } else {
      this._modulos[posicion] = modulo;
    }
  }

  /** Devuelve el módulo eliminado para que el caso de uso borre sus archivos del almacenamiento. */
  eliminarModulo(solicitante: Usuario, moduloId: string): Modulo {
    this.exigirPuedeGestionar(solicitante);
    const posicion = this._modulos.findIndex((m) => m.moduloId === moduloId);
    if (posicion === -1) {
      throw new NoEncontradoError(
        'modulo-no-encontrado',
        `El curso no tiene el módulo ${moduloId}.`,
      );
    }
    if (this._estado === 'publicado' && this._modulos.length === 1) {
      throw new ReglaDeNegocioError(
        'curso-incompleto',
        'Un curso publicado necesita al menos un módulo.',
      );
    }
    return this._modulos.splice(posicion, 1)[0];
  }

  tieneModulo(moduloId: string): boolean {
    return this._modulos.some((m) => m.moduloId === moduloId);
  }

  /**
   * Regla nueva (en Laravel se podía publicar un curso vacío):
   * para publicar se necesita al menos 1 módulo y un examen con al menos 1 pregunta.
   * La cantidad de preguntas la entrega el caso de uso, porque el examen se guarda aparte.
   */
  publicar(solicitante: Usuario, cantidadPreguntas: number): void {
    this.exigirPuedeGestionar(solicitante);
    if (this._modulos.length === 0) {
      throw new ReglaDeNegocioError(
        'curso-incompleto',
        'El curso necesita al menos un módulo.',
      );
    }
    if (cantidadPreguntas === 0) {
      throw new ReglaDeNegocioError(
        'curso-incompleto',
        'El curso necesita un examen con al menos una pregunta.',
      );
    }
    this._estado = 'publicado';
  }

  /** Vuelve a borrador: sale del catálogo, pero los alumnos inscritos conservan su avance. */
  despublicar(solicitante: Usuario): void {
    this.exigirPuedeGestionar(solicitante);
    this._estado = 'borrador';
  }

  aceptaInscripciones(): boolean {
    return this._estado === 'publicado';
  }
}
