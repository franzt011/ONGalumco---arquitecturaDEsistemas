/**
 * Errores de negocio. No conocen HTTP: solo dicen qué tipo de problema hubo.
 * La capa de presentación los traduce a un código HTTP (ver problem-json.filtro.ts).
 *
 * En Laravel esto se hacía con abort(403) o abort(404) dentro del controlador,
 * lo que mezclaba la regla de negocio con el protocolo HTTP.
 */
export abstract class ErrorDeNegocio extends Error {
  constructor(
    /** Identificador estable del error, por ejemplo 'curso-no-encontrado'. El frontend lo usa para traducir el mensaje (i18n). */
    readonly codigo: string,
    detalle: string,
  ) {
    super(detalle);
    this.name = new.target.name;
  }
}

/** El recurso no existe (404). */
export class NoEncontradoError extends ErrorDeNegocio {}

/** Quien pide no tiene permiso para esta acción (403). */
export class SinPermisoError extends ErrorDeNegocio {}

/** La acción choca con el estado actual (409), por ejemplo inscribirse dos veces. */
export class ConflictoError extends ErrorDeNegocio {}

/** Los datos tienen buen formato pero incumplen una regla de negocio (422). */
export class ReglaDeNegocioError extends ErrorDeNegocio {}
