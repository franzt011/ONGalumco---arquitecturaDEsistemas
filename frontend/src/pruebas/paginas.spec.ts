/**
 * Pruebas de las páginas: montan la app completa (router + i18n), navegan a cada página y
 * revisan que se muestre lo esperado. La API se reemplaza por respuestas reales grabadas
 * del backend (carpeta datos/), así no hace falta levantar el servidor.
 * También fallan si falta alguna traducción (vue-i18n avisa por consola).
 */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.vue';
import { i18n } from '../i18n';
import { router } from '../router';
import { sesion } from '../sesion';
import catalogo from './datos/catalogo.json';
import estadisticas from './datos/estadisticas.json';
import examen from './datos/examen.json';
import foro from './datos/foro.json';
import gamificacion from './datos/gamificacion.json';
import gestionCurso from './datos/gestion-curso.json';
import gestionCursos from './datos/gestion-cursos.json';
import misCursos from './datos/mis-cursos.json';
import perfilAdmin from './datos/perfil-admin.json';
import perfilAlumno from './datos/perfil-alumno.json';
import perfilProfe from './datos/perfil-profe.json';
import sala from './datos/sala.json';
import usuarioDetalle from './datos/usuario-detalle.json';
import usuariosAlumnos from './datos/usuarios-alumnos.json';

const PERFILES: Record<string, unknown> = { 'alumno-1': perfilAlumno, 'profe-1': perfilProfe, 'admin-1': perfilAdmin };

/** Respuestas grabadas, por "MÉTODO ruta". */
const RESPUESTAS: Record<string, unknown> = {
  'GET /v1/catalogo': catalogo,
  'GET /v1/mis-cursos': misCursos,
  'GET /v1/cursos/curso-1': sala,
  'GET /v1/cursos/curso-1/foro': foro,
  'GET /v1/cursos/curso-1/examen': examen,
  'GET /v1/perfil/gamificacion': gamificacion,
  'GET /v1/gestion/cursos': gestionCursos,
  'GET /v1/gestion/cursos/curso-1': gestionCurso,
  'GET /v1/admin/usuarios?tipo=alumnos': usuariosAlumnos,
  'GET /v1/admin/usuarios/alumno-1': usuarioDetalle,
  'GET /v1/admin/estadisticas': estadisticas,
  'POST /v1/cursos/curso-1/examen/intentos': { aprobado: true, porcentaje: 100, correctas: 2, total: 2, intentosRestantes: 0 },
};

let pedidos: { metodo: string; ruta: string; cuerpo?: unknown; usuario?: string }[] = [];
let avisosDeConsola: string[] = [];

beforeEach(() => {
  i18n.global.locale.value = 'es';
  pedidos = [];
  avisosDeConsola = [];
  vi.spyOn(console, 'warn').mockImplementation((...args) => void avisosDeConsola.push(args.join(' ')));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opciones: RequestInit = {}) => {
      const metodo = opciones.method ?? 'GET';
      const ruta = url.replace(/^https?:\/\/[^/]+/, '');
      const usuario = (opciones.headers as Record<string, string> | undefined)?.['x-usuario-id'];
      pedidos.push({ metodo, ruta, usuario, cuerpo: opciones.body ? JSON.parse(String(opciones.body)) : undefined });
      const datos = ruta === '/v1/perfil' && metodo === 'GET' ? PERFILES[usuario ?? ''] : RESPUESTAS[`${metodo} ${ruta}`];
      if (datos === undefined) {
        return new Response(JSON.stringify({ status: 404, codigo: 'no-encontrado', detail: `Sin datos para ${metodo} ${ruta}` }), { status: 404 });
      }
      return new Response(JSON.stringify(datos), { status: 200 });
    }),
  );
  vi.stubGlobal('confirm', () => true);
  vi.stubGlobal('open', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sesion.usuarioId = null;
  sesion.perfil = null;
  sesion.faltaPerfil = false;
  i18n.global.locale.value = 'es';
});

async function abrir(ruta: string, usuarioId?: string) {
  sesion.usuarioId = usuarioId ?? null;
  sesion.perfil = null;
  await router.push(ruta);
  await router.isReady();
  const app = mount(App, { global: { plugins: [router, i18n] } });
  await flushPromises();
  await flushPromises();
  return app;
}

function sinTraduccionesFaltantes(): void {
  const faltantes = avisosDeConsola.filter((a) => a.includes('Not found') || a.includes('[intlify]'));
  expect(faltantes).toEqual([]);
}

describe('Inicio y sesión', () => {
  it('sin sesión muestra la página de entrada con los usuarios de ejemplo', async () => {
    const app = await abrir('/');
    expect(app.text()).toContain('Aprende a cuidar mejor');
    expect(app.text()).toContain('Diego Muñoz');
    sinTraduccionesFaltantes();
  });

  it('una ruta protegida sin sesión vuelve al inicio', async () => {
    await abrir('/mis-cursos');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('un alumno que entra a una ruta de admin es devuelto a su inicio', async () => {
    await abrir('/admin/estadisticas', 'alumno-1');
    expect(router.currentRoute.value.path).toBe('/mis-cursos');
  });

  it('manda la identidad en cada petición', async () => {
    await abrir('/mis-cursos', 'alumno-1');
    expect(pedidos.every((p) => p.usuario === 'alumno-1')).toBe(true);
  });
});

describe('Páginas del alumno', () => {
  it('Mis cursos muestra el avance real (antes la barra quedaba en 0%)', async () => {
    const app = await abrir('/mis-cursos', 'alumno-1');
    expect(app.text()).toContain('Prevención de caídas');
    expect(app.text()).toContain('1 de 2 módulos');
    expect(app.html()).toContain('width: 50%');
    sinTraduccionesFaltantes();
  });

  it('Explorar marca los cursos donde ya participa', async () => {
    const app = await abrir('/explorar', 'alumno-1');
    expect(app.text()).toContain('Ya estás participando');
    sinTraduccionesFaltantes();
  });

  it('la sala bloquea el examen hasta completar los módulos y muestra el foro', async () => {
    const app = await abrir('/cursos/curso-1', 'alumno-1');
    expect(app.text()).toContain('Tu progreso');
    expect(app.text()).toContain('Completa todos los módulos');
    expect(app.text()).toContain('¿Alguien tiene el PDF del módulo?');
    sinTraduccionesFaltantes();
  });

  it('el examen manda un intentoId y muestra el resultado', async () => {
    const app = await abrir('/cursos/curso-1/examen', 'alumno-1');
    await app.find('button.boton-primario').trigger('click'); // Comenzar examen
    for (const pregunta of examen.preguntas) {
      await app.find(`input[value="${pregunta.opciones[0].opcionId}"]`).setValue(true);
      const siguiente = app.findAll('button').find((b) => /Siguiente|Finalizar/.test(b.text()))!;
      await siguiente.trigger('click');
    }
    await flushPromises();
    const envio = pedidos.find((p) => p.metodo === 'POST');
    expect(envio?.cuerpo).toMatchObject({ intentoId: expect.stringMatching(/^[0-9a-f-]{36}$/), respuestas: expect.any(Array) });
    expect(app.text()).toContain('¡Felicidades!');
    expect(app.text()).toContain('+200 XP');
    sinTraduccionesFaltantes();
  });

  it('Mis logros muestra nivel, logros traducidos y ranking', async () => {
    const app = await abrir('/mis-logros', 'alumno-1');
    expect(app.text()).toContain('Nivel 1');
    expect(app.text()).toContain('Primer paso');
    expect(app.text()).toContain('Tabla de líderes');
    sinTraduccionesFaltantes();
  });
});

describe('Páginas del profesor y del admin', () => {
  it('el profesor ve sus cursos y el editor con sus tres pestañas', async () => {
    const lista = await abrir('/gestion/cursos', 'profe-1');
    expect(lista.text()).toContain('Mis cursos');
    expect(lista.text()).toContain('Publicado');
    lista.unmount();
    const editor = await abrir('/gestion/cursos/curso-1', 'profe-1');
    expect(editor.text()).toContain('Información general');
    expect(editor.text()).toContain('Examen final');
    const titulos = editor.findAll('input[required]').map((i) => (i.element as HTMLInputElement).value);
    expect(titulos).toContain('Movilización segura');
    sinTraduccionesFaltantes();
  });

  it('el admin ve alumnos, un perfil y las estadísticas', async () => {
    const usuarios = await abrir('/admin/alumnos', 'admin-1');
    expect(usuarios.text()).toContain('Gestión de alumnos');
    expect(usuarios.text()).toContain('Diego Muñoz');
    usuarios.unmount();
    const perfil = await abrir('/admin/usuarios/alumno-1', 'admin-1');
    expect(perfil.text()).toContain('Cursos inscritos');
    perfil.unmount();
    const stats = await abrir('/admin/estadisticas', 'admin-1');
    expect(stats.text()).toContain('Distribución por sede');
    expect(stats.text()).toContain('Concepción');
    sinTraduccionesFaltantes();
  });
});

describe('Internacionalización', () => {
  it('la misma página en inglés', async () => {
    i18n.global.locale.value = 'en';
    const app = await abrir('/mis-logros', 'alumno-1');
    expect(app.text()).toContain('Leaderboard');
    expect(app.text()).toContain('First step');
    expect(app.text()).not.toContain('Tabla de líderes');
    sinTraduccionesFaltantes();
  });
});
