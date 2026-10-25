/**
 * DTOs: describen y validan el JSON que llega a cada endpoint (reemplazan $request->validate()).
 * El ValidationPipe de main.ts rechaza con 400 lo que no cumpla, antes de llegar al caso de uso.
 * En Laravel, store() y update() de cursos no validaban nada.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { TipoArchivo } from '../dominio/archivo';
import type { TipoPregunta } from '../dominio/examen';
import { ROLES, SEDES, SEXOS } from '../dominio/usuario';
import type { Rol, Sede, Sexo } from '../dominio/usuario';

export class CompletarPerfilDto {
  @IsString() @IsNotEmpty() @MaxLength(120) nombre!: string;
  @IsIn([...SEXOS]) sexo!: Sexo;
  @IsDateString({ strict: true }) fechaNacimiento!: string;
  @IsIn([...SEDES]) sede!: Sede;
}

export class CrearCursoDto {
  @IsString() @IsNotEmpty() @MaxLength(150) titulo!: string;
  @IsString() @MaxLength(5000) descripcion!: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) exigenciaMinima?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) maxIntentos?: number;
}

export class ActualizarCursoDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) titulo?: string;
  @IsOptional() @IsString() @MaxLength(5000) descripcion?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) exigenciaMinima?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) maxIntentos?: number;
  /** Clave devuelta por POST /v1/archivos/url-subida. */
  @IsOptional() @IsString() @MaxLength(300) imagenPortada?: string;
  @IsOptional() @IsString() @MaxLength(300) archivoCertificado?: string;
}

export class ArchivoAdjuntoDto {
  @IsString() @IsNotEmpty() @MaxLength(300) clave!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) nombre!: string;
}

export class GuardarModuloDto {
  @IsString() @IsNotEmpty() @MaxLength(150) titulo!: string;
  @IsOptional() @IsString() @MaxLength(20000) contenido?: string;
  @IsOptional() @IsString() @MaxLength(50) duracion?: string;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  linkVideo?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ArchivoAdjuntoDto)
  archivos?: ArchivoAdjuntoDto[];
}

export class OpcionDto {
  @IsString() @IsNotEmpty() @MaxLength(500) texto!: string;
  @IsBoolean() esCorrecta!: boolean;
}

export class PreguntaDto {
  @IsIn(['multiple', 'vf']) tipo!: TipoPregunta;
  @IsString() @IsNotEmpty() @MaxLength(1000) texto!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => OpcionDto)
  opciones?: OpcionDto[];
  @IsOptional() @IsBoolean() respuestaVf?: boolean;
}

export class GuardarExamenDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PreguntaDto)
  preguntas!: PreguntaDto[];
}

export class UrlSubidaDto {
  @IsIn(['material', 'portada', 'certificado']) tipo!: TipoArchivo;
  @IsString() @IsNotEmpty() @MaxLength(255) nombre!: string;
  @IsInt() @Min(1) tamanoBytes!: number;
}

export class InscribirseDto {
  @IsString() @IsNotEmpty() cursoId!: string;
}

export class RespuestaDto {
  @IsString() @IsNotEmpty() preguntaId!: string;
  /** Id de la opción elegida, o 'verdadero' / 'falso'. */
  @IsString() @IsNotEmpty() respuesta!: string;
}

export class RendirExamenDto {
  /** UUID que genera el frontend al abrir el examen (idempotencia). */
  @IsUUID() intentoId!: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RespuestaDto)
  respuestas!: RespuestaDto[];
}

export class ComentarioDto {
  @IsString() @IsNotEmpty() @MaxLength(2000) contenido!: string;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  enlace?: string;
  @IsOptional() @IsString() respuestaA?: string;
}

export class ListarUsuariosDto {
  @IsIn(['alumnos', 'profesores']) tipo!: 'alumnos' | 'profesores';
  @IsOptional() @IsString() @MaxLength(100) buscar?: string;
}

export class CambiarRolDto {
  @IsIn([...ROLES]) rol!: Rol;
}

export class InscripcionMasivaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  usuarioIds!: string[];
  @IsString() @IsNotEmpty() cursoId!: string;
  @IsIn(['inscribir', 'desinscribir']) accion!: 'inscribir' | 'desinscribir';
}
