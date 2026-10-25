/**
 * Controladores HTTP: reciben la petición, sacan la identidad y los datos validados, llaman
 * al caso de uso y devuelven su resultado como JSON. No contienen reglas de negocio.
 *
 * Equivalen a routes/web.php + los controladores de Laravel, pero devuelven JSON (API REST)
 * en vez de páginas Inertia: el frontend Vue pasa a ser una aplicación separada.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ActualizarCurso,
  CrearCurso,
  DespublicarCurso,
  EliminarCurso,
  EliminarModulo,
  GuardarExamen,
  GuardarModulo,
  ListarCursosGestion,
  PedirUrlDeLectura,
  PedirUrlDeSubida,
  PublicarCurso,
  VerCursoGestion,
} from '../aplicacion/casos-de-uso/gestion-cursos';
import {
  AlternarModulo,
  ExplorarCatalogo,
  Inscribirse,
  MisCursos,
  ObtenerCertificado,
  RendirExamen,
  VerExamen,
  VerSalaDeClases,
} from '../aplicacion/casos-de-uso/alumno';
import {
  AlternarLike,
  MiGamificacion,
  PublicarComentario,
  VerForo,
} from '../aplicacion/casos-de-uso/foro-y-logros';
import {
  CambiarRol,
  CompletarPerfil,
  InscripcionMasiva,
  ListarUsuarios,
  VerEstadisticas,
  VerMiPerfil,
  VerUsuario,
} from '../aplicacion/casos-de-uso/usuarios';
import { DEPENDENCIAS } from '../aplicacion/puertos';
import type { Dependencias } from '../aplicacion/puertos';
import { Identidad, Publico, UsuarioActual } from './autenticacion';
import {
  ActualizarCursoDto,
  CambiarRolDto,
  ComentarioDto,
  CompletarPerfilDto,
  CrearCursoDto,
  GuardarExamenDto,
  GuardarModuloDto,
  InscribirseDto,
  InscripcionMasivaDto,
  ListarUsuariosDto,
  RendirExamenDto,
  UrlSubidaDto,
} from './dto';

@Controller('salud')
export class SaludControlador {
  /** Lo usa Lambda Web Adapter para saber que la app está lista. */
  @Publico()
  @Get()
  salud() {
    return { ok: true };
  }
}

@Controller('perfil')
export class PerfilControlador {
  constructor(@Inject(DEPENDENCIAS) private readonly d: Dependencias) {}

  @Post()
  completar(@UsuarioActual() yo: Identidad, @Body() dto: CompletarPerfilDto) {
    return new CompletarPerfil(this.d).ejecutar(yo, dto);
  }

  @Get()
  ver(@UsuarioActual() yo: Identidad) {
    return new VerMiPerfil(this.d).ejecutar(yo.usuarioId);
  }

  /** Logros, XP, nivel y ranking. */
  @Get('gamificacion')
  gamificacion(@UsuarioActual() yo: Identidad) {
    return new MiGamificacion(this.d).ejecutar(yo.usuarioId);
  }
}

/** Zona del profesor y del admin (gestión de cursos). */
@Controller('gestion/cursos')
export class GestionCursosControlador {
  constructor(@Inject(DEPENDENCIAS) private readonly d: Dependencias) {}

  @Get()
  listar(@UsuarioActual() yo: Identidad) {
    return new ListarCursosGestion(this.d).ejecutar(yo.usuarioId);
  }

  @Post()
  crear(@UsuarioActual() yo: Identidad, @Body() dto: CrearCursoDto) {
    return new CrearCurso(this.d).ejecutar(yo.usuarioId, dto);
  }

  @Get(':cursoId')
  ver(@UsuarioActual() yo: Identidad, @Param('cursoId') cursoId: string) {
    return new VerCursoGestion(this.d).ejecutar(yo.usuarioId, cursoId);
  }

  @Patch(':cursoId')
  actualizar(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Body() dto: ActualizarCursoDto,
  ) {
    return new ActualizarCurso(this.d).ejecutar(yo.usuarioId, cursoId, dto);
  }

  @Delete(':cursoId')
  @HttpCode(204)
  async eliminar(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
  ) {
    await new EliminarCurso(this.d).ejecutar(yo.usuarioId, cursoId);
  }

  @Post(':cursoId/modulos')
  agregarModulo(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Body() dto: GuardarModuloDto,
  ) {
    return new GuardarModulo(this.d).ejecutar(yo.usuarioId, cursoId, dto);
  }

  @Put(':cursoId/modulos/:moduloId')
  reemplazarModulo(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Param('moduloId') moduloId: string,
    @Body() dto: GuardarModuloDto,
  ) {
    return new GuardarModulo(this.d).ejecutar(yo.usuarioId, cursoId, {
      ...dto,
      moduloId,
    });
  }

  @Delete(':cursoId/modulos/:moduloId')
  eliminarModulo(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Param('moduloId') moduloId: string,
  ) {
    return new EliminarModulo(this.d).ejecutar(yo.usuarioId, cursoId, moduloId);
  }

  @Put(':cursoId/examen')
  guardarExamen(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Body() dto: GuardarExamenDto,
  ) {
    return new GuardarExamen(this.d).ejecutar(
      yo.usuarioId,
      cursoId,
      dto.preguntas,
    );
  }

  @Post(':cursoId/publicar')
  @HttpCode(200)
  publicar(@UsuarioActual() yo: Identidad, @Param('cursoId') cursoId: string) {
    return new PublicarCurso(this.d).ejecutar(yo.usuarioId, cursoId);
  }

  @Post(':cursoId/despublicar')
  @HttpCode(200)
  despublicar(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
  ) {
    return new DespublicarCurso(this.d).ejecutar(yo.usuarioId, cursoId);
  }
}

@Controller('archivos')
export class ArchivosControlador {
  constructor(@Inject(DEPENDENCIAS) private readonly d: Dependencias) {}

  @Post('url-subida')
  urlDeSubida(@UsuarioActual() yo: Identidad, @Body() dto: UrlSubidaDto) {
    return new PedirUrlDeSubida(this.d).ejecutar(yo.usuarioId, dto);
  }

  @Get('url-lectura')
  urlDeLectura(@UsuarioActual() yo: Identidad, @Query('clave') clave: string) {
    return new PedirUrlDeLectura(this.d).ejecutar(yo.usuarioId, clave ?? '');
  }
}

/** Zona del alumno. */
@Controller()
export class AlumnoControlador {
  constructor(@Inject(DEPENDENCIAS) private readonly d: Dependencias) {}

  @Get('catalogo')
  catalogo(@UsuarioActual() yo: Identidad) {
    return new ExplorarCatalogo(this.d).ejecutar(yo.usuarioId);
  }

  @Post('inscripciones')
  @HttpCode(201)
  async inscribirse(
    @UsuarioActual() yo: Identidad,
    @Body() dto: InscribirseDto,
  ) {
    await new Inscribirse(this.d).ejecutar(yo.usuarioId, dto.cursoId);
    return { inscrito: true };
  }

  @Get('mis-cursos')
  misCursos(@UsuarioActual() yo: Identidad) {
    return new MisCursos(this.d).ejecutar(yo.usuarioId);
  }

  @Get('cursos/:cursoId')
  sala(@UsuarioActual() yo: Identidad, @Param('cursoId') cursoId: string) {
    return new VerSalaDeClases(this.d).ejecutar(yo.usuarioId, cursoId);
  }

  @Post('cursos/:cursoId/modulos/:moduloId/completar')
  @HttpCode(200)
  completarModulo(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Param('moduloId') moduloId: string,
  ) {
    return new AlternarModulo(this.d).ejecutar(yo.usuarioId, cursoId, moduloId);
  }

  @Get('cursos/:cursoId/examen')
  examen(@UsuarioActual() yo: Identidad, @Param('cursoId') cursoId: string) {
    return new VerExamen(this.d).ejecutar(yo.usuarioId, cursoId);
  }

  @Post('cursos/:cursoId/examen/intentos')
  @HttpCode(200)
  rendir(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Body() dto: RendirExamenDto,
  ) {
    return new RendirExamen(this.d).ejecutar(yo.usuarioId, cursoId, dto);
  }

  @Get('cursos/:cursoId/certificado')
  certificado(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
  ) {
    return new ObtenerCertificado(this.d).ejecutar(yo.usuarioId, cursoId);
  }
}

@Controller()
export class ForoControlador {
  constructor(@Inject(DEPENDENCIAS) private readonly d: Dependencias) {}

  @Get('cursos/:cursoId/foro')
  ver(@UsuarioActual() yo: Identidad, @Param('cursoId') cursoId: string) {
    return new VerForo(this.d).ejecutar(yo.usuarioId, cursoId);
  }

  @Post('cursos/:cursoId/modulos/:moduloId/comentarios')
  comentar(
    @UsuarioActual() yo: Identidad,
    @Param('cursoId') cursoId: string,
    @Param('moduloId') moduloId: string,
    @Body() dto: ComentarioDto,
  ) {
    return new PublicarComentario(this.d).ejecutar(
      yo.usuarioId,
      cursoId,
      moduloId,
      dto,
    );
  }

  @Post('comentarios/:comentarioId/like')
  @HttpCode(200)
  like(
    @UsuarioActual() yo: Identidad,
    @Param('comentarioId') comentarioId: string,
  ) {
    return new AlternarLike(this.d).ejecutar(yo.usuarioId, comentarioId);
  }
}

/** Zona del administrador. */
@Controller('admin')
export class AdminControlador {
  constructor(@Inject(DEPENDENCIAS) private readonly d: Dependencias) {}

  @Get('usuarios')
  usuarios(@UsuarioActual() yo: Identidad, @Query() filtro: ListarUsuariosDto) {
    return new ListarUsuarios(this.d).ejecutar(yo.usuarioId, filtro);
  }

  @Get('usuarios/:usuarioId')
  usuario(
    @UsuarioActual() yo: Identidad,
    @Param('usuarioId') usuarioId: string,
  ) {
    return new VerUsuario(this.d).ejecutar(yo.usuarioId, usuarioId);
  }

  @Put('usuarios/:usuarioId/rol')
  cambiarRol(
    @UsuarioActual() yo: Identidad,
    @Param('usuarioId') usuarioId: string,
    @Body() dto: CambiarRolDto,
  ) {
    return new CambiarRol(this.d).ejecutar(yo.usuarioId, usuarioId, dto.rol);
  }

  @Post('inscripciones-masivas')
  @HttpCode(200)
  masiva(@UsuarioActual() yo: Identidad, @Body() dto: InscripcionMasivaDto) {
    return new InscripcionMasiva(this.d).ejecutar(yo.usuarioId, dto);
  }

  @Get('estadisticas')
  estadisticas(@UsuarioActual() yo: Identidad) {
    return new VerEstadisticas(this.d).ejecutar(yo.usuarioId);
  }
}
