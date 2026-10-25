import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { modoAutenticacion } from './presentacion/autenticacion';
import { ProblemJsonFiltro } from './presentacion/problem-json.filtro';

async function iniciar(): Promise<void> {
  if (
    modoAutenticacion() === 'desarrollo' &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error('AUTH_MODO=desarrollo no se puede usar en producción.');
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // quita los campos que el DTO no declara
      forbidNonWhitelisted: true, // y si llegan, responde 400
      transform: true, // convierte el JSON en instancias del DTO
    }),
  );
  app.useGlobalFilters(new ProblemJsonFiltro());
  // Solo el frontend puede llamar a la API desde el navegador
  app.enableCors({
    origin: process.env.ORIGEN_FRONTEND ?? 'http://localhost:5173',
  });

  // Lambda Web Adapter espera la app en el puerto 8080
  const puerto = Number(process.env.PORT ?? 8080);
  await app.listen(puerto);
  const log = new Logger('Alumco');
  log.log(
    `API en http://localhost:${puerto}/v1 (autenticación: ${modoAutenticacion()})`,
  );
  if (modoAutenticacion() === 'desarrollo') {
    log.warn(
      'Modo desarrollo: datos en memoria y usuario por encabezado x-usuario-id (admin-1, profe-1, alumno-1).',
    );
  }
}

void iniciar();
