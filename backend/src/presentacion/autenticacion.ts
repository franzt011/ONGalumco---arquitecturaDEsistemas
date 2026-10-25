/**
 * Autenticación. Reemplaza el login con sesión de Laravel (Breeze + middleware 'auth').
 *
 * En AWS: API Gateway valida el token de Cognito ANTES de llegar a Lambda, y Lambda Web
 * Adapter entrega los datos del token (claims) en el encabezado x-amzn-request-context.
 * Este guard solo lee quién es el usuario; QUÉ puede hacer lo deciden los casos de uso
 * según su rol guardado en la tabla Usuarios.
 *
 * En tu computador (AUTH_MODO=desarrollo) no hay Cognito: el usuario se indica con el
 * encabezado x-usuario-id. Ese modo nunca debe usarse en producción (main.ts lo impide).
 */
import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

export interface Identidad {
  usuarioId: string;
  correo: string;
}

interface SolicitudConIdentidad extends Request {
  identidad?: Identidad;
}

const CLAVE_PUBLICO = 'publico';

/** Marca un endpoint que no exige token (por ejemplo /v1/salud). */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/** Entrega al controlador la identidad del usuario autenticado. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): Identidad =>
    contexto.switchToHttp().getRequest<SolicitudConIdentidad>()
      .identidad as Identidad,
);

export type ModoAutenticacion = 'apigateway' | 'desarrollo';

export function modoAutenticacion(): ModoAutenticacion {
  return process.env.AUTH_MODO === 'desarrollo' ? 'desarrollo' : 'apigateway';
}

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Lee sub y email de los claims de Cognito. Devuelve null si falta algo o el JSON es inválido. */
export function identidadDesdeApiGateway(
  encabezado: string | undefined,
): Identidad | null {
  if (!encabezado) {
    return null;
  }
  try {
    const contexto = JSON.parse(encabezado) as {
      authorizer?: {
        claims?: Record<string, unknown>;
        jwt?: { claims?: Record<string, unknown> };
      };
    };
    // API REST deja los claims en authorizer.claims; API HTTP los deja en authorizer.jwt.claims
    const claims =
      contexto.authorizer?.claims ?? contexto.authorizer?.jwt?.claims;
    const sub = claims?.sub;
    const email = claims?.email;
    if (typeof sub !== 'string' || sub === '') {
      return null;
    }
    return { usuarioId: sub, correo: typeof email === 'string' ? email : '' };
  } catch {
    return null;
  }
}

@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) {
      return true;
    }

    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudConIdentidad>();
    const identidad =
      modoAutenticacion() === 'desarrollo'
        ? this.identidadDeDesarrollo(solicitud)
        : identidadDesdeApiGateway(
            primero(solicitud.headers['x-amzn-request-context']),
          );

    if (!identidad) {
      throw new UnauthorizedException('Falta un token válido');
    }
    solicitud.identidad = identidad;
    return true;
  }

  private identidadDeDesarrollo(solicitud: Request): Identidad | null {
    const usuarioId = primero(solicitud.headers['x-usuario-id']);
    if (!usuarioId) {
      return null;
    }
    return {
      usuarioId,
      correo:
        primero(solicitud.headers['x-usuario-correo']) ??
        `${usuarioId}@alumco.local`,
    };
  }
}
