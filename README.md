# Alumco ONG: NestJS + Vue (TypeScript)

Plataforma de capacitación para la ONG Alumco: cursos con módulos (texto, video y archivos), examen de selección múltiple y verdadero/falso, certificado al aprobar, foro por módulo y gamificación (XP, niveles, logros, racha y ranking).

Es la migración de la versión anterior en **Laravel + Vue + Inertia** (`../Copia de alumco-main-valoragregado1`) a **TypeScript + NestJS con Clean Architecture**, preparada para desplegarse **serverless en AWS**, como pide Arquitectura de Sistemas (IIP322W).

El paso a paso de la migración y lo que falta está en [GUIA_MIGRACION.md](GUIA_MIGRACION.md).

## Arquitectura

```
backend/   API REST en NestJS (Clean Architecture)
frontend/  Aplicación Vue 3 + TypeScript que consume la API (SPA, español e inglés)
```

```
backend/src/
  dominio/           Reglas de negocio en TypeScript puro (sin NestJS, sin AWS)
  aplicacion/        Casos de uso + puertos (interfaces de repositorios y servicios)
  infraestructura/   Implementaciones de los puertos (hoy: memoria; después: DynamoDB y S3)
  presentacion/      HTTP: controladores, DTOs, autenticación y filtro de errores
  app.module.ts      Composition root: único lugar que conecta las capas
  main.ts            Arranque: prefijo /v1, validación, errores y CORS
```

Las dependencias solo apuntan hacia adentro. Un linter (`.oxlintrc.json`) hace fallar la CI si `dominio/` o `aplicacion/` importan NestJS, Express o AWS.

```
frontend/src/
  api/          Cliente HTTP, tipos de las respuestas y una función por endpoint
  paginas/      Una página por pantalla (alumno/, gestion/, admin/)
  componentes/  Piezas reutilizables (layout, portada, barra de progreso, avisos)
  i18n/         Textos en es.json y en.json
  router.ts     Rutas y qué rol puede ver cada una
  sesion.ts     Usuario actual (hoy modo desarrollo; después Cognito)
```

## Cómo levantarlo en tu computador

Requisitos: Node.js 22 o superior. Se usan **dos terminales**:

```bash
# Terminal 1: API
cd backend
npm install
AUTH_MODO=desarrollo npm run start:dev

# Terminal 2: página web
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173** y elige un usuario de ejemplo. Vite redirige `/v1` a la API, así que no hace falta configurar CORS.

La API queda en `http://localhost:8080/v1`. En modo desarrollo los datos viven en memoria (se pierden al reiniciar) y vienen tres usuarios de ejemplo. Para elegir quién hace la petición, se manda el encabezado `x-usuario-id`:

| x-usuario-id | Rol |
|---|---|
| `admin-1` | admin |
| `profe-1` | profesor (dueño de `curso-1`) |
| `alumno-1` | alumno |

```bash
curl -H 'x-usuario-id: alumno-1' http://localhost:8080/v1/catalogo
```

En modo desarrollo no hay S3: subir archivos guarda solo la referencia, y las portadas se muestran con un ícono.

## Comandos

```bash
# backend/
npm test               # 44 pruebas unitarias (jest)
npm run lint           # lint, incluida la regla de capas
npm run build          # compila a dist/
npm run format         # formatea con Prettier

# frontend/
npm test               # 12 pruebas de las páginas (vitest)
npm run revisar-i18n   # revisa que todos los textos existan en español e inglés
npm run build          # revisa tipos (vue-tsc) y compila a dist/
```

## Endpoints (prefijo `/v1`)

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `GET /salud` | público | Lo usa Lambda Web Adapter para saber si la app está lista |
| `POST /perfil` · `GET /perfil` | autenticado | Completar y ver el perfil propio (siempre nace como alumno) |
| `GET /perfil/gamificacion` | alumno | XP, nivel, logros y ranking |
| `GET/POST /gestion/cursos` | profesor, admin | Listar y crear cursos |
| `GET/PATCH/DELETE /gestion/cursos/:id` | dueño o admin | Ver, editar y eliminar (solo sin inscritos) |
| `POST /gestion/cursos/:id/modulos` · `PUT/DELETE …/modulos/:moduloId` | dueño o admin | Agregar, reemplazar y eliminar módulos |
| `PUT /gestion/cursos/:id/examen` | dueño o admin | Reemplazar el examen |
| `POST /gestion/cursos/:id/publicar` · `…/despublicar` | dueño o admin | Cambiar el estado |
| `POST /archivos/url-subida` | profesor, admin | URL prefirmada para subir un archivo a S3 |
| `GET /archivos/url-lectura?clave=` | autenticado | URL temporal de una portada o material (nunca de un certificado) |
| `GET /catalogo` | alumno | Cursos publicados |
| `POST /inscripciones` | alumno | Inscribirse |
| `GET /mis-cursos` | alumno | Panel con estado (en progreso, completado o reprobado) |
| `GET /cursos/:id` | alumno inscrito | Sala de clases |
| `POST /cursos/:id/modulos/:moduloId/completar` | alumno inscrito | Marcar o desmarcar un módulo |
| `GET /cursos/:id/examen` | alumno inscrito con todos los módulos completos | Preguntas sin las respuestas correctas |
| `POST /cursos/:id/examen/intentos` | alumno inscrito | Rendir (idempotente por `intentoId`) |
| `GET /cursos/:id/certificado` | alumno que aprobó | URL temporal del certificado |
| `GET /cursos/:id/foro` · `POST …/modulos/:moduloId/comentarios` · `POST /comentarios/:id/like` | inscritos, dueño o admin | Foro |
| `GET /admin/usuarios?tipo=alumnos\|profesores&buscar=` · `GET /admin/usuarios/:id` | admin | Usuarios |
| `PUT /admin/usuarios/:id/rol` | admin | Cambiar rol (no el propio) |
| `POST /admin/inscripciones-masivas` | admin | Inscribir o desinscribir en bloque |
| `GET /admin/estadisticas` | admin | Totales por rol, sexo, sede y edad, y últimas finalizaciones |

Los errores salen en `application/problem+json` (RFC 9457) con un campo `codigo` estable para traducir el mensaje en el frontend.
