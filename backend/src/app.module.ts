/**
 * Composition root: el ÚNICO lugar que conecta las capas. Aquí se decide qué implementación
 * de los puertos se usa. Hoy: memoria. En AWS: se cambia esta fábrica por una que entregue
 * los repositorios de DynamoDB y S3, sin tocar ningún caso de uso.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DEPENDENCIAS } from './aplicacion/puertos';
import { cargarDatosDeEjemplo } from './infraestructura/memoria/datos-de-ejemplo';
import { dependenciasEnMemoria } from './infraestructura/memoria/repositorios';
import {
  AutenticacionGuard,
  modoAutenticacion,
} from './presentacion/autenticacion';
import {
  AdminControlador,
  AlumnoControlador,
  ArchivosControlador,
  ForoControlador,
  GestionCursosControlador,
  PerfilControlador,
  SaludControlador,
} from './presentacion/controladores';

@Module({
  controllers: [
    SaludControlador,
    PerfilControlador,
    GestionCursosControlador,
    ArchivosControlador,
    AlumnoControlador,
    ForoControlador,
    AdminControlador,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AutenticacionGuard },
    {
      provide: DEPENDENCIAS,
      useFactory: async () => {
        const dependencias = dependenciasEnMemoria();
        if (modoAutenticacion() === 'desarrollo') {
          await cargarDatosDeEjemplo(dependencias);
        }
        return dependencias;
      },
    },
  ],
})
export class AppModule {}
