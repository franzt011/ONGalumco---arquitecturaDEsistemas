/**
 * Todos los errores salen en formato problem+json (RFC 9457), con un 'codigo' estable que
 * el frontend usa para mostrar el mensaje en el idioma del usuario (internacionalización).
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictoError,
  ErrorDeNegocio,
  NoEncontradoError,
  ReglaDeNegocioError,
  SinPermisoError,
} from '../dominio/errores';

interface Problema {
  type: string;
  title: string;
  status: number;
  detail: string;
  codigo: string;
  errores?: string[];
}

const TITULOS: Record<number, string> = {
  400: 'La solicitud tiene datos inválidos',
  401: 'Falta un token válido',
  403: 'No tienes permiso para esta acción',
  404: 'No se encontró el recurso',
  409: 'La acción choca con el estado actual',
  422: 'La acción no cumple una regla de negocio',
  500: 'Error interno del servidor',
};

function estadoDe(error: ErrorDeNegocio): number {
  if (error instanceof NoEncontradoError) return HttpStatus.NOT_FOUND;
  if (error instanceof SinPermisoError) return HttpStatus.FORBIDDEN;
  if (error instanceof ConflictoError) return HttpStatus.CONFLICT;
  if (error instanceof ReglaDeNegocioError)
    return HttpStatus.UNPROCESSABLE_ENTITY;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class ProblemJsonFiltro implements ExceptionFilter {
  private readonly logger = new Logger(ProblemJsonFiltro.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const problema = this.construir(excepcion);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(problema.status)
      .type('application/problem+json')
      .json(problema);
  }

  private construir(excepcion: unknown): Problema {
    if (excepcion instanceof ErrorDeNegocio) {
      const status = estadoDe(excepcion);
      return {
        type: `/errores/${excepcion.codigo}`,
        title: TITULOS[status],
        status,
        detail: excepcion.message,
        codigo: excepcion.codigo,
      };
    }

    if (excepcion instanceof HttpException) {
      const status = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      const errores =
        typeof cuerpo === 'object' &&
        'message' in cuerpo &&
        Array.isArray(cuerpo.message)
          ? (cuerpo.message as string[])
          : undefined;
      const codigo =
        status === 400
          ? 'solicitud-invalida'
          : status === 401
            ? 'no-autenticado'
            : 'error-http';
      return {
        type: `/errores/${codigo}`,
        title: TITULOS[status] ?? 'Error en la solicitud',
        status,
        detail: errores ? 'Revisa los campos indicados.' : excepcion.message,
        codigo,
        errores,
      };
    }

    // Error inesperado: se registra completo (CloudWatch), pero al cliente no se le dan detalles.
    // En Laravel, store() devolvía 'Error al guardar: ' . $e->getMessage() al navegador.
    this.logger.error(
      excepcion instanceof Error
        ? (excepcion.stack ?? excepcion.message)
        : String(excepcion),
    );
    return {
      type: '/errores/error-interno',
      title: TITULOS[500],
      status: 500,
      detail: 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.',
      codigo: 'error-interno',
    };
  }
}
