/**
 * Rutas del frontend (reemplazan routes/web.php + los middleware EsAdmin y SoloAlumnos).
 * OJO: esto solo decide qué páginas se muestran. La seguridad real está en el backend:
 * aunque alguien entre a /admin/estadisticas, la API responde 403 si no es admin.
 */
import { createRouter, createWebHistory } from 'vue-router';
import type { Rol } from './api/tipos';
import { cargarPerfil, inicioSegunRol, sesion } from './sesion';

declare module 'vue-router' {
  interface RouteMeta {
    publica?: boolean;
    roles?: Rol[];
  }
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: () => import('./paginas/Inicio.vue'), meta: { publica: true } },
    { path: '/completar-perfil', component: () => import('./paginas/CompletarPerfil.vue'), meta: { publica: true } },
    { path: '/perfil', component: () => import('./paginas/Perfil.vue') },

    // Alumno
    { path: '/explorar', component: () => import('./paginas/alumno/Explorar.vue'), meta: { roles: ['alumno'] } },
    { path: '/mis-cursos', component: () => import('./paginas/alumno/MisCursos.vue'), meta: { roles: ['alumno'] } },
    { path: '/cursos/:cursoId', component: () => import('./paginas/alumno/SalaClases.vue'), props: true, meta: { roles: ['alumno'] } },
    { path: '/cursos/:cursoId/examen', component: () => import('./paginas/alumno/Examen.vue'), props: true, meta: { roles: ['alumno'] } },
    { path: '/mis-logros', component: () => import('./paginas/alumno/MisLogros.vue'), meta: { roles: ['alumno'] } },
    { path: '/ranking', component: () => import('./paginas/alumno/Ranking.vue'), meta: { roles: ['alumno'] } },

    // Profesor y admin
    { path: '/gestion/cursos', component: () => import('./paginas/gestion/Cursos.vue'), meta: { roles: ['profesor', 'admin'] } },
    { path: '/gestion/cursos/:cursoId', component: () => import('./paginas/gestion/EditarCurso.vue'), props: true, meta: { roles: ['profesor', 'admin'] } },

    // Admin
    { path: '/admin/alumnos', component: () => import('./paginas/admin/Usuarios.vue'), props: { tipo: 'alumnos' }, meta: { roles: ['admin'] } },
    { path: '/admin/profesores', component: () => import('./paginas/admin/Usuarios.vue'), props: { tipo: 'profesores' }, meta: { roles: ['admin'] } },
    { path: '/admin/usuarios/:usuarioId', component: () => import('./paginas/admin/PerfilUsuario.vue'), props: true, meta: { roles: ['admin'] } },
    { path: '/admin/estadisticas', component: () => import('./paginas/admin/Estadisticas.vue'), meta: { roles: ['admin'] } },

    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (destino) => {
  if (sesion.usuarioId && !sesion.perfil && !sesion.faltaPerfil) {
    try {
      await cargarPerfil();
    } catch {
      // Si la API no responde, se deja seguir: cada página muestra su propio error
    }
  }
  if (destino.meta.publica) {
    if (destino.path === '/' && sesion.perfil) {
      return inicioSegunRol();
    }
    return true;
  }
  if (!sesion.usuarioId) {
    return '/';
  }
  if (sesion.faltaPerfil) {
    return '/completar-perfil';
  }
  const roles = destino.meta.roles;
  if (roles && sesion.perfil && !roles.includes(sesion.perfil.rol)) {
    return inicioSegunRol();
  }
  return true;
});
