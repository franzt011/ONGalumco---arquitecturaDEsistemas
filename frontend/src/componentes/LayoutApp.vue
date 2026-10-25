<!-- Barra de navegación por rol (AuthenticatedLayout.vue de Laravel), ahora con menú para celular. -->
<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <nav class="border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-8">
          <RouterLink :to="inicioSegunRol()" class="flex items-center gap-3 transition-transform hover:scale-105">
            <img src="/logo-alumco.png" :alt="t('app.logo')" class="h-16 w-auto object-contain sm:h-20" />
          </RouterLink>
          <div class="hidden items-center gap-6 text-sm font-medium md:flex">
            <RouterLink v-for="enlace in enlaces" :key="enlace.a" :to="enlace.a" :class="claseEnlace(enlace.a)">
              {{ t(enlace.texto) }}
            </RouterLink>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <SelectorIdioma />
          <RouterLink
            to="/perfil"
            class="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
          >
            <UserIcon class="h-5 w-5 text-slate-500" />
            <span class="text-sm font-medium">{{ sesion.perfil?.nombre }}</span>
            <span class="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
              {{ t(`roles.${sesion.perfil?.rol}`) }}
            </span>
          </RouterLink>
          <button class="hidden text-sm font-medium text-red-500 transition hover:text-red-700 sm:block" @click="salir">
            {{ t('nav.cerrarSesion') }}
          </button>
          <button class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" :aria-label="t('nav.menu')" @click="menuAbierto = !menuAbierto">
            <X v-if="menuAbierto" class="h-6 w-6" />
            <Menu v-else class="h-6 w-6" />
          </button>
        </div>
      </div>

      <div v-if="menuAbierto" class="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-3 md:hidden">
        <RouterLink
          v-for="enlace in enlaces"
          :key="enlace.a"
          :to="enlace.a"
          class="rounded-lg px-3 py-2 text-sm font-medium"
          :class="claseEnlace(enlace.a)"
          @click="menuAbierto = false"
        >
          {{ t(enlace.texto) }}
        </RouterLink>
        <RouterLink to="/perfil" class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600" @click="menuAbierto = false">
          {{ t('nav.perfil') }} · {{ sesion.perfil?.nombre }}
        </RouterLink>
        <button class="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500" @click="salir">
          {{ t('nav.cerrarSesion') }}
        </button>
      </div>
    </nav>

    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Menu, User as UserIcon, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { cerrarSesion, inicioSegunRol, sesion } from '../sesion';
import SelectorIdioma from './SelectorIdioma.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const menuAbierto = ref(false);

const ENLACES = {
  admin: [
    { a: '/gestion/cursos', texto: 'nav.todosLosCursos' },
    { a: '/admin/alumnos', texto: 'nav.alumnos' },
    { a: '/admin/profesores', texto: 'nav.profesores' },
    { a: '/admin/estadisticas', texto: 'nav.estadisticas' },
  ],
  profesor: [{ a: '/gestion/cursos', texto: 'nav.misCursos' }],
  alumno: [
    { a: '/explorar', texto: 'nav.explorar' },
    { a: '/mis-cursos', texto: 'nav.misCursos' },
    { a: '/mis-logros', texto: 'nav.misLogros' },
  ],
} as const;

const enlaces = computed(() => (sesion.perfil ? ENLACES[sesion.perfil.rol] : []));

function claseEnlace(a: string): string {
  return route.path.startsWith(a) ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900 transition';
}

function salir(): void {
  cerrarSesion();
  void router.push('/');
}
</script>
