<!--
  Página de entrada. Reemplaza Welcome.vue (que era la plantilla por defecto de Laravel,
  algo que la auditoría marcó) y Login.vue. En modo desarrollo se elige un usuario de ejemplo;
  con Cognito, este botón llevará al login real.
-->
<template>
  <div class="min-h-screen bg-gradient-to-b from-alumco-blue-lightest to-white">
    <header class="flex items-center justify-between px-6 py-4 sm:px-10">
      <img src="/logo-alumco.png" :alt="t('app.logo')" class="h-20 w-auto" />
      <SelectorIdioma />
    </header>

    <main class="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-6 sm:px-10 lg:grid-cols-2">
      <section>
        <p class="mb-3 text-sm font-bold uppercase tracking-widest text-alumco-coral">{{ t('inicio.etiqueta') }}</p>
        <h1 class="text-4xl font-black leading-tight text-alumco-blue sm:text-5xl">{{ t('inicio.titulo') }}</h1>
        <p class="mt-5 text-lg text-slate-600">{{ t('inicio.descripcion') }}</p>
        <ul class="mt-8 space-y-3 text-slate-700">
          <li v-for="punto in ['modulos', 'examen', 'certificado', 'logros']" :key="punto" class="flex items-center gap-3">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-alumco-green-light text-alumco-green-dark">
              <Check class="h-4 w-4" />
            </span>
            {{ t(`inicio.puntos.${punto}`) }}
          </li>
        </ul>
      </section>

      <section class="tarjeta p-8">
        <h2 class="text-xl font-bold text-slate-900">{{ t('inicio.entrar') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('inicio.modoDesarrollo') }}</p>

        <div class="mt-6 space-y-3">
          <button
            v-for="usuario in USUARIOS_DE_EJEMPLO"
            :key="usuario.id"
            class="flex w-full items-center gap-4 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
            :disabled="entrando"
            @click="entrar(usuario.id)"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" :class="usuario.color">
              {{ iniciales(usuario.nombre) }}
            </span>
            <span class="flex-1">
              <span class="block font-semibold text-slate-800">{{ usuario.nombre }}</span>
              <span class="text-xs uppercase text-slate-400">{{ t(`roles.${usuario.rol}`) }} · {{ usuario.id }}</span>
            </span>
            <ArrowRight class="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <form class="mt-6 border-t border-slate-100 pt-6" @submit.prevent="entrar(otroId.trim())">
          <label class="text-sm font-medium text-slate-700" for="otro">{{ t('inicio.otroUsuario') }}</label>
          <p class="mb-2 text-xs text-slate-400">{{ t('inicio.otroUsuarioAyuda') }}</p>
          <div class="flex gap-2">
            <input id="otro" v-model="otroId" class="campo flex-1" placeholder="nuevo-1" />
            <button class="boton-oscuro" :disabled="!otroId.trim() || entrando">{{ t('inicio.entrarBoton') }}</button>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Check } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { avisarError } from '../avisos';
import SelectorIdioma from '../componentes/SelectorIdioma.vue';
import { iniciales } from '../formatos';
import { iniciarSesion, inicioSegunRol, sesion } from '../sesion';

const { t } = useI18n();
const router = useRouter();
const otroId = ref('');
const entrando = ref(false);

/** Los mismos usuarios que carga el backend en modo desarrollo (datos-de-ejemplo.ts). */
const USUARIOS_DE_EJEMPLO = [
  { id: 'alumno-1', nombre: 'Diego Muñoz', rol: 'alumno', color: 'bg-blue-600' },
  { id: 'profe-1', nombre: 'Carla Rojas', rol: 'profesor', color: 'bg-alumco-coral' },
  { id: 'admin-1', nombre: 'Administración Alumco', rol: 'admin', color: 'bg-slate-800' },
] as const;

async function entrar(usuarioId: string): Promise<void> {
  if (!usuarioId) return;
  entrando.value = true;
  try {
    await iniciarSesion(usuarioId);
    await router.push(sesion.faltaPerfil ? '/completar-perfil' : inicioSegunRol());
  } catch (error) {
    avisarError(error);
  } finally {
    entrando.value = false;
  }
}
</script>
