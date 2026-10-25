import { ReglaDeNegocioError } from './errores';

export interface DatosComentario {
  comentarioId: string;
  cursoId: string;
  moduloId: string;
  autorId: string;
  autorNombre: string;
  contenido: string;
  enlace?: string;
  /** Si es una respuesta, el id del comentario original. */
  respuestaA?: string;
  fecha: string;
  likes?: string[];
}

const MAXIMO_CARACTERES = 2000;

/** Comentario del foro de un módulo (tablas comentarios_foro + likes_comentario de Laravel). */
export class Comentario {
  readonly comentarioId: string;
  readonly cursoId: string;
  readonly moduloId: string;
  readonly autorId: string;
  readonly autorNombre: string;
  readonly contenido: string;
  readonly enlace?: string;
  readonly respuestaA?: string;
  readonly fecha: string;
  private _likes: Set<string>;

  constructor(datos: DatosComentario) {
    const contenido = datos.contenido.trim();
    if (contenido === '' || contenido.length > MAXIMO_CARACTERES) {
      throw new ReglaDeNegocioError(
        'comentario-invalido',
        `El comentario debe tener entre 1 y ${MAXIMO_CARACTERES} caracteres.`,
      );
    }
    if (datos.enlace && !/^https?:\/\/\S+$/i.test(datos.enlace)) {
      throw new ReglaDeNegocioError(
        'comentario-invalido',
        'El enlace debe ser una URL.',
      );
    }
    this.comentarioId = datos.comentarioId;
    this.cursoId = datos.cursoId;
    this.moduloId = datos.moduloId;
    this.autorId = datos.autorId;
    this.autorNombre = datos.autorNombre;
    this.contenido = contenido;
    this.enlace = datos.enlace;
    this.respuestaA = datos.respuestaA;
    this.fecha = datos.fecha;
    this._likes = new Set(datos.likes ?? []);
  }

  get likes(): string[] {
    return [...this._likes];
  }

  get cantidadLikes(): number {
    return this._likes.size;
  }

  leGustaA(usuarioId: string): boolean {
    return this._likes.has(usuarioId);
  }

  /** Da o quita el like (toggleLike en Laravel). Un Set evita likes duplicados. Devuelve true si quedó con like. */
  alternarLike(usuarioId: string): boolean {
    if (this._likes.has(usuarioId)) {
      this._likes.delete(usuarioId);
      return false;
    }
    this._likes.add(usuarioId);
    return true;
  }
}
