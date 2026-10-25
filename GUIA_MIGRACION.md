# Guía: de Alumco en Laravel a Alumco en NestJS + AWS

Esta guía explica **qué se cambió, por qué, y qué pasos te faltan** para que el proyecto cumpla lo que pide Arquitectura de Sistemas: Clean Architecture, serverless en AWS, patrones de nube, Chaos Engineering, modelo de seguridad explícito, CI/CD, internacionalización y alta concurrencia.

- Versión anterior (no se tocó): `~/Proyectos/Alumco/Copia de alumco-main-valoragregado1`
- Versión nueva: `~/Proyectos/Alumco/alumco-nest`

---

## Parte 1: Qué cambió y por qué

### 1.1 El cambio de fondo

| | Laravel (ramo anterior) | NestJS (este ramo) |
|---|---|---|
| Lenguaje | PHP | TypeScript (JavaScript con tipos) |
| Estilo | MVC monolítico: el mismo servidor arma las páginas (Inertia) | **API REST** en JSON + frontend separado |
| Reglas de negocio | Dentro de los controladores, mezcladas con SQL y HTTP | En `dominio/` (clases puras), sin base de datos ni HTTP |
| Base de datos | MySQL con Eloquent y `DB::table()` en todos lados | Detrás de **puertos** (interfaces): hoy memoria, mañana DynamoDB |
| Login | Sesión de Laravel Breeze, contraseñas en tu base de datos | **Amazon Cognito** (el backend nunca ve contraseñas) |
| Archivos | `storage/app/public` del servidor | **S3 privado** con URL prefirmadas |
| Servidor | VPS / EC2 con Apache, siempre encendido | **AWS Lambda**: se ejecuta solo cuando llega una petición |
| Pruebas | Solo las de ejemplo de Breeze | 41 pruebas de las reglas reales, en 2 segundos |

**¿Por qué tanto cambio?** El ramo evalúa que la solución esté **desacoplada**. En Laravel, cambiar MySQL por DynamoDB obligaba a reescribir todos los controladores, porque cada uno tenía SQL adentro. Ahora los casos de uso solo conocen interfaces (`CursoRepository`, `InscripcionRepository`…), así que cambiar la base de datos es escribir un archivo nuevo en `infraestructura/` y cambiar una línea en `app.module.ts`.

### 1.2 Las 4 capas (Clean Architecture)

```
          ┌───────────────────────────────────────────┐
          │ presentacion/  (HTTP: controladores, DTOs) │──┐
          │ infraestructura/ (memoria, DynamoDB, S3)   │  │  dependen de ↓
          └───────────────────────────────────────────┘  │
                ┌─────────────────────────────────┐       │
                │ aplicacion/ (casos de uso,      │◄──────┘
                │              puertos)           │──┐
                └─────────────────────────────────┘  │ depende de ↓
                      ┌──────────────────────┐       │
                      │ dominio/ (reglas)    │◄──────┘
                      └──────────────────────┘
```

**Regla de dependencia:** las flechas solo apuntan hacia adentro. `dominio/` no importa nada de afuera. Si alguien lo rompe, el lint falla (`.oxlintrc.json`) y la CI queda en rojo.

### 1.3 Mapa: dónde quedó cada archivo de Laravel

| Laravel | NestJS |
|---|---|
| `app/Models/Curso.php` + `Modulo.php` + `ModuloArchivo.php` | `dominio/curso.ts` (clases `Curso` y `Modulo`) |
| `app/Models/Pregunta.php` + `PreguntaOpcion.php` | `dominio/examen.ts` (clases `Pregunta` y `Examen`) |
| `app/Models/Inscripcion.php` + tabla `progreso_modulos` | `dominio/inscripcion.ts` |
| tabla `intentos_examen` | `dominio/intento.ts` |
| `app/Models/ComentarioForo.php` + `LikeComentario.php` | `dominio/comentario.ts` |
| `app/Models/User.php` | `dominio/usuario.ts` |
| `app/Services/GamificacionService.php` | `dominio/gamificacion.ts` (cálculo) + `MiGamificacion` (caso de uso) |
| `Profesor/CursoController.php` y `Admin/CursoController.php` (casi idénticos) | `aplicacion/casos-de-uso/gestion-cursos.ts` (un solo código para ambos roles) |
| `Alumno/ExplorarController.php`, `DashboardController.php`, `SalaClasesController.php` | `aplicacion/casos-de-uso/alumno.ts` y `foro-y-logros.ts` |
| `Admin/UsuarioController.php`, `RegisteredUserController.php` | `aplicacion/casos-de-uso/usuarios.ts` |
| `routes/web.php` | `presentacion/controladores.ts` (decoradores `@Get`, `@Post`…) |
| `$request->validate([...])` | `presentacion/dto.ts` (decoradores `@IsString`, `@IsInt`…) |
| Middleware `auth`, `EsAdmin`, `SoloAlumnos` | `presentacion/autenticacion.ts` (quién es) + `exigirUsuario(…, ['admin'])` en cada caso de uso (qué puede hacer) |
| `abort(403)`, `abort(404)` | `dominio/errores.ts` + `presentacion/problem-json.filtro.ts` |
| `database/migrations/*` | No hay migraciones: DynamoDB no tiene esquema. El diseño de tablas está en la Parte 3, paso 3 |
| Seeder | `infraestructura/memoria/datos-de-ejemplo.ts` |
| `resources/js/Pages/*.vue` | **Pendiente** (Parte 3, paso 2): el frontend Vue se mantiene, pero llamando a la API |

### 1.4 Errores de la versión Laravel que quedaron corregidos

Úsalos en el informe y en la presentación: muestran que la nueva arquitectura **mejora la seguridad y la fiabilidad**, no solo cambia el lenguaje.

| # | Problema en Laravel | Dónde | Cómo quedó |
|---|---|---|---|
| 1 | **Las respuestas correctas llegaban al navegador**: el examen cargaba `preguntas.opciones` con `es_correcta` | `SalaClasesController@examen` | `Pregunta.vistaAlumno()` arma la vista campo por campo, y una prueba de contrato lo verifica |
| 2 | **Intentos infinitos**: el límite solo se revisaba al abrir el examen; enviando el formulario directo se rendía sin límite | `finalizarExamen` | `exigirPuedeRendir()` se revisa **antes** de calificar |
| 3 | **Doble envío = doble intento** (doble clic o reintento por timeout) | `finalizarExamen` | Idempotencia con `intentoId` generado por el frontend |
| 4 | **El registro dejaba elegir el rol "profesor"** | `RegisteredUserController` (`'rol' => 'required\|in:alumno,profesor'`) | Todos nacen alumno; solo el admin cambia roles |
| 5 | **La zona profesor no tenía middleware de rol**: cualquier usuario logueado entraba | `routes/web.php` | Cada caso de uso exige el rol, y el curso exige ser el dueño o admin |
| 6 | Cualquier alumno abría cualquier curso, incluso sin inscribirse | `SalaClasesController@show` | `exigirInscripcion()` |
| 7 | Se podía inscribir en cursos en borrador conociendo su id | `ExplorarController@inscribir` | `curso.aceptaInscripciones()` |
| 8 | `store()` y `update()` de cursos **no validaban nada** | `CursoController` | DTOs + validación en las entidades |
| 9 | `update()` borraba y recreaba todas las preguntas en cada guardado | `CursoController@update` | El examen se guarda con su propio endpoint |
| 10 | Eliminar un curso borraba en cascada el avance y las notas de los alumnos | `destroy()` | No se elimina un curso con inscritos (se despublica) |
| 11 | El mensaje de la excepción llegaba al usuario (`'Error al guardar: ' . $e->getMessage()`) | `store()` | El 500 es genérico; el detalle va solo al log |
| 12 | Se podía volver a rendir un curso aprobado y sumar XP de nuevo | `examen()` | Un curso completado no se vuelve a rendir |
| 13 | Los logros se evaluaban interpretando un texto con regex (`'racha_dias >= 3'`) | `GamificacionService::evaluar` | Cada logro tiene una función: si el campo está mal escrito, no compila |
| 14 | Admin y profesor tenían dos controladores casi iguales (código duplicado) | `Admin/` y `Profesor/CursoController` | Un solo caso de uso; el permiso lo decide `exigirPuedeGestionar` |
| 15 | Los archivos subidos no se validaban: se aceptaba un `.exe` o un archivo de cualquier tamaño | `store()` | `exigirArchivoPermitido()`: lista blanca de extensiones y tamaño máximo por tipo (material, portada, certificado) |

> Sobre el `.env` que marcó la auditoría: en la versión Laravel está en `.gitignore` y no está versionado, así que no se subió al repo. En AWS los secretos van en Secrets Manager, no en archivos.

**Reglas nuevas** (no existían en Laravel; decídelas con tu equipo): para publicar se necesita al menos 1 módulo y 1 pregunta; un admin no puede cambiar su propio rol; las respuestas del foro tienen un solo nivel.

**Lo que se mantuvo igual a propósito:** la nota se calcula con `round(correctas / total * 100)`, las preguntas sin responder cuentan como incorrectas, se aprueba con nota ≥ exigencia mínima (por defecto 60), hay 2 intentos por defecto, el estado "reprobado" se calcula al agotar intentos, marcar un módulo es un *toggle*, la gamificación da 100 XP por módulo y 200 por examen, se sube de nivel cada 1000 XP, los 6 logros son los mismos y las estadísticas usan los mismos rangos de edad.

---

## Parte 2: Cómo correr y probar lo que ya está hecho

```bash
cd ~/Proyectos/Alumco/alumco-nest/backend
npm install                         # solo la primera vez
npm test                            # 41 pruebas
AUTH_MODO=desarrollo npm run start:dev
```

En otra terminal, recorre el flujo completo del alumno:

```bash
B=http://localhost:8080/v1
curl -H 'x-usuario-id: alumno-1' $B/catalogo
curl -H 'x-usuario-id: alumno-1' -H 'content-type: application/json' -X POST $B/inscripciones -d '{"cursoId":"curso-1"}'
curl -H 'x-usuario-id: alumno-1' $B/cursos/curso-1/examen        # fíjate: no trae las respuestas correctas
curl -H 'x-usuario-id: alumno-1' -H 'content-type: application/json' -X POST $B/cursos/curso-1/examen/intentos \
  -d '{"intentoId":"0192f3c4-7a1b-7c3d-8e4f-5a6b7c8d9e01","respuestas":[{"preguntaId":"p1","respuesta":"verdadero"},{"preguntaId":"p2","respuesta":"p2-b"}]}'
# Repite el último comando: el resultado es el mismo y no se gasta otro intento (idempotencia)
curl -H 'x-usuario-id: alumno-1' $B/perfil/gamificacion
```

> En zsh, si guardas los encabezados en una variable (`A='-H x-usuario-id:alumno-1'`), no se separan en palabras y curl no los manda. Escríbelos directo, como arriba.

---

## Parte 3: Los pasos que te faltan (en orden)

Cada paso dice **qué hacer**, **cómo** y **qué concepto del ramo demuestra**. Marca cada uno al terminarlo.

### ☐ Paso 1: Git, GitHub y CI (1 hora)

```bash
cd ~/Proyectos/Alumco/alumco-nest
git init && git add . && git commit -m "Migración de Alumco a NestJS con Clean Architecture"
gh repo create alumco-nest --private --source=. --push    # o créalo desde github.com
```

- La CI (`.github/workflows/ci.yml`) ya existe: corre formato, lint (incluida la regla de capas), build y pruebas en cada PR.
- Trabaja con **una rama y un pull request por tarea**. El examen revisa los aportes de cada integrante en el repositorio.
- **Concepto:** integración continua (Unidad III).

### ☐ Paso 2: Frontend Vue como SPA separada (lo más largo)

Hoy las páginas Vue reciben los datos de Inertia (`defineProps`). Hay que hacer que los pidan a la API.

1. Crea `frontend/` con `npm create vite@latest frontend -- --template vue-ts` (Vue + TypeScript).
2. Copia `resources/js/Pages`, `Components` y `Layouts` de la versión Laravel.
3. Cambia Inertia por **Vue Router** (rutas) y **fetch/axios** (datos):

```ts
// Antes (Inertia): los datos llegaban como props desde el controlador PHP
const props = defineProps<{ cursos: Curso[] }>();
router.post(route('alumno.inscribir', curso.id));

// Después (SPA): el componente los pide a la API
const cursos = ref<CursoDelCatalogo[]>([]);
onMounted(async () => { cursos.value = await api.get('/catalogo'); });
await api.post('/inscripciones', { cursoId: curso.cursoId });
```

4. En `Show.vue`, `toggleCompletado` hoy hace `router.post(route('alumno.modulos.completar', moduloId))`. Cámbialo por ``api.post(`/cursos/${cursoId}/modulos/${moduloId}/completar`)`` y usa el `completado` que responde la API, en vez de cambiar la lista local antes de saber si el backend aceptó.
5. En el examen, genera el `intentoId` al abrir la página: `const intentoId = crypto.randomUUID();`.
6. **Internacionalización** (lo pide el proyecto): instala `vue-i18n`, pon los textos en `locales/es.json` y `locales/en.json`, y traduce los errores con el `codigo` que devuelve la API (`ya-inscrito`, `intentos-agotados`…).
7. Muestra las fechas del foro con `Intl.RelativeTimeFormat` ("hace 2 horas" / "2 hours ago"), que reemplaza a `diffForHumans()`.
8. Despliega en **AWS Amplify Hosting** o en S3 + CloudFront.

- **Concepto:** separar frontend y backend (desacoplamiento), i18n.

### ☐ Paso 3: DynamoDB (reemplaza MySQL)

Crea `backend/src/infraestructura/dynamodb/` con una clase por puerto. Por ejemplo, `CursoRepositoryDynamo implements CursoRepository`, usando `@aws-sdk/lib-dynamodb`. **No cambia ningún caso de uso.**

Diseño de tablas (en DynamoDB se diseña según **cómo se consulta**, no según las relaciones):

| Tabla | Clave (PK / SK) | Índices (GSI) | Reemplaza en MySQL |
|---|---|---|---|
| Usuarios | `usuarioId` | por `rol` | users |
| Cursos (con sus módulos adentro) | `cursoId` | por `estado`, por `profesorId` | cursos, modulos, modulo_archivos |
| Examenes (preguntas adentro) | `cursoId` | | preguntas, pregunta_opciones |
| Inscripciones | `alumnoId` / `cursoId` | por `cursoId` | inscripciones, progreso_modulos |
| Intentos | `alumnoId` / `cursoId#intentoId` | por fecha (estadísticas) | intentos_examen |
| Comentarios | `cursoId` / `comentarioId` | | comentarios_foro, likes_comentario |

Puntos clave al implementar:
- `crearSiNoExiste` → `PutCommand` con `ConditionExpression: 'attribute_not_exists(alumnoId)'`. Si falla con `ConditionalCheckFailedException`, devuelve `false`.
- `guardarConInscripcion` → `TransactWriteCommand` con el intento (condición `attribute_not_exists`) y la inscripción, **todo o nada**.
- Las preguntas van en una tabla aparte de los cursos: así las respuestas correctas nunca se leen al mostrar el curso.
- El ranking (`MiGamificacion`) recorre a todos los alumnos. En DynamoDB eso es un Scan, que es caro: guarda el XP en el usuario cada vez que completa un módulo o aprueba.
- En `app.module.ts`, cambia `dependenciasEnMemoria()` por una función `dependenciasDynamo()` cuando `process.env.ALMACEN === 'dynamodb'`.
- **Concepto:** patrón Repositorio, consistencia, escrituras condicionales, transacciones.

### ☐ Paso 4: S3 para archivos

Crea `infraestructura/s3/almacenamiento-s3.ts` que implemente `AlmacenamientoArchivos`:
- `urlDeSubida` → `getSignedUrl(new PutObjectCommand(...), { expiresIn: 300 })` (5 minutos)
- `urlDeLectura` → `getSignedUrl(new GetObjectCommand(...), { expiresIn: 900 })` (15 minutos)
- Bucket **privado** (Block Public Access activado). El navegador sube directo a S3 con la URL, así el archivo nunca pasa por Lambda.
- Configura CORS del bucket para el dominio del frontend.
- **Concepto:** seguridad (mínimo privilegio, URL temporales), offloading de carga.

### ☐ Paso 5: Cognito (reemplaza el login de Laravel)

1. Crea un User Pool (registro con correo y verificación de correo).
2. El frontend usa el login de Cognito (Hosted UI o `aws-amplify/auth`) y obtiene un token JWT.
3. Después del primer login, el frontend llama a `POST /v1/perfil` con nombre, sexo, fecha de nacimiento y sede (los campos del formulario de registro de Laravel).
4. El primer admin se crea a mano: registra la cuenta y cambia su `rol` a `admin` directamente en la tabla Usuarios.
- **Concepto:** seguridad por diseño (el backend nunca guarda contraseñas).

### ☐ Paso 6: Desplegar en Lambda + API Gateway

Opción recomendada (la misma del repo del grupo): **una Lambda con toda la API** usando Lambda Web Adapter.
1. Empaqueta con `npm run build` (o esbuild para un artefacto más chico).
2. Lambda con runtime Node 22, la capa de Lambda Web Adapter y `PORT=8080`. La readiness check va a `/v1/salud`.
3. API Gateway con **autorizador de Cognito** en todas las rutas, salvo `/v1/salud`.
4. Variables de entorno: `NODE_ENV=production`, `ORIGEN_FRONTEND=https://tu-frontend`, `ALMACEN=dynamodb`, nombres de tablas y bucket. **Nunca** `AUTH_MODO=desarrollo` (la app se niega a arrancar).
5. Throttling en API Gateway (por ejemplo 50 rps con ráfagas de 100).
6. En el Learner Lab usa el rol `LabRole`; no se pueden crear roles nuevos.
- Infraestructura como código: escribe todo esto en **Serverless Framework**, **SAM** o **Terraform** (los manuales están en la carpeta del ramo). No lo hagas con clics en la consola, porque el ramo evalúa IaC.
- **Concepto:** serverless, IaC, throttling (Unidades I y II).

### ☐ Paso 7: Despliegue canario

- Publica cada despliegue como **versión** de Lambda y apunta API Gateway a un **alias** (`live`).
- Para una versión nueva, manda el 10% del tráfico (`routing-config`), mira errores y latencia en CloudWatch y después promueve o revierte. Es exactamente el **Lab Canary** del ramo (`lab_canary_codigo.zip`).
- Automatízalo en GitHub Actions: merge a `main` → desplegar en dev → si pasa, desplegar en prod como canario.
- **Concepto:** CI/CD, despliegue canario (Unidades II y III).

### ☐ Paso 8: Patrones de resiliencia

| Patrón | Dónde aplicarlo en Alumco | Ya está |
|---|---|---|
| Idempotencia | Rendir examen (`intentoId`) | ✅ |
| Escritura condicional | Inscripción única (`crearSiNoExiste`) | ✅ (interfaz; falta DynamoDB) |
| Transacción todo o nada | Intento + inscripción | ✅ (interfaz; falta DynamoDB) |
| Degradación elegante | Borrar archivos en S3 sin tumbar la operación | ✅ (`borrarSinFallar`) |
| Throttling | API Gateway | Paso 6 |
| Retry con backoff + jitter | Llamadas a DynamoDB y S3 (el SDK de AWS ya lo hace; configura `maxAttempts`) | ☐ |
| Circuit Breaker | Si integras YouTube oEmbed para validar videos o miniaturas (librería `opossum`) | ☐ |
| Cola + DLQ | Enviar correos o generar el certificado PDF en segundo plano (SQS + Lambda worker + DLQ) | ☐ (buena idea para "alta concurrencia") |
| Cache | Catálogo de cursos publicados (CloudFront o caché en memoria con TTL corto) | ☐ |

### ☐ Paso 9: Chaos Engineering (Unidad III)

Con **AWS FIS** (o simulando en código si el Learner Lab no lo permite):
1. **Hipótesis:** "Si DynamoDB responde lento, el alumno recibe un error claro y no pierde intentos."
2. **Experimento:** inyecta latencia o errores en la Lambda (acción `aws:lambda:invocation-add-delay` o `invocation-error`), o usa una variable `FALLA_SIMULADA` como en el lab canario.
3. **Medir:** tasa de 5xx, latencia p95, intentos duplicados (deberían ser 0 gracias a la idempotencia).
4. **Conclusión** en el informe: qué falló, qué patrón lo protegió y qué mejorarías.

### ☐ Paso 10: Observabilidad y modelo de seguridad (para el informe)

- **Logs estructurados** en JSON (CloudWatch) y **métricas de negocio**: exámenes rendidos, tasa de aprobación, inscripciones por día.
- Alarmas sobre las **golden signals**: latencia, tráfico, errores y saturación.
- **Modelo de seguridad** (el proyecto pide explicitarlo): Cognito (autenticación); rol en tabla y verificación en cada caso de uso (autorización); API Gateway con autorizador y throttling, más WAF si está disponible; S3 privado con URL temporales; IAM de mínimo privilegio; secretos en Secrets Manager; la respuesta correcta nunca sale al alumno; errores 500 sin detalle; CORS solo para el frontend; validación con lista blanca (`forbidNonWhitelisted`).

---

## Parte 4: Conceptos nuevos que tienes que poder explicar

| Concepto | En una frase | Dónde verlo |
|---|---|---|
| Entidad | Clase que protege sus reglas: sus datos solo cambian por métodos que validan | `dominio/curso.ts` |
| Caso de uso | Una acción del sistema; orquesta y deja que la entidad decida | `aplicacion/casos-de-uso/` |
| Puerto | Interfaz que dice qué necesita el caso de uso, sin decir cómo | `aplicacion/puertos.ts` |
| Adaptador | Implementación concreta de un puerto (memoria, DynamoDB, S3) | `infraestructura/memoria/` |
| Composition root | Único lugar donde se eligen los adaptadores | `app.module.ts` |
| DTO | Clase que valida el JSON de entrada | `presentacion/dto.ts` |
| Vista / Result Model | Objeto plano que devuelve el caso de uso (nunca la entidad) | `aplicacion/vistas.ts` |
| Inyección de dependencias | El caso de uso recibe sus repositorios en el constructor | `constructor(private readonly d: Dependencias)` |
| Reloj y GeneradorIds inyectados | Para que las pruebas fijen "hoy" y los ids | `casos-de-uso.spec.ts`, función `preparar()` |
| Idempotencia | Repetir la petición no repite el efecto | `RendirExamen` |
| problem+json | Formato estándar de errores, con `codigo` para traducirlos | `presentacion/problem-json.filtro.ts` |

Para repasar TypeScript desde cero, usa `~/Downloads/arquitectura de sistemas/certamen2-estudio.md`: los conceptos son los mismos que en este código.
