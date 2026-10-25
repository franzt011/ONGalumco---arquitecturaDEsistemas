<!--
  Perfil propio. Reemplaza Profile/Edit.vue y Admin/Perfil.vue (que mostraba estadísticas
  inventadas: 12 cursos, 8 certificados, 95 de promedio, escritas a mano en routes/web.php).
-->
<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <div v-if="sesion.perfil" class="tarjeta p-8">
      <div class="flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-black text-white">
          {{ iniciales(sesion.perfil.nombre) }}
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ sesion.perfil.nombre }}</h1>
          <p class="text-sm text-slate-500">{{ sesion.perfil.correo }}</p>
          <span class="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase text-blue-700">
            {{ t(`roles.${sesion.perfil.rol}`) }}
          </span>
        </div>
      </div>

      <dl class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl bg-slate-50 p-4">
          <dt class="text-xs font-bold uppercase text-slate-400">{{ t('perfil.sexo') }}</dt>
          <dd class="mt-1 font-semibold text-slate-800">{{ t(`sexos.${sesion.perfil.sexo}`) }}</dd>
        </div>
        <div class="rounded-xl bg-slate-50 p-4">
          <dt class="text-xs font-bold uppercase text-slate-400">{{ t('perfil.edad') }}</dt>
          <dd class="mt-1 font-semibold text-slate-800">
            {{ sesion.perfil.edad === 'N/A' ? t('perfil.sinDato') : t('perfil.anios', { n: sesion.perfil.edad }) }}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 p-4">
          <dt class="text-xs font-bold uppercase text-slate-400">{{ t('perfil.sede') }}</dt>
          <dd class="mt-1 font-semibold text-slate-800">{{ t(`sedes.${sesion.perfil.sede}`) }}</dd>
        </div>
      </dl>

      <p class="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">{{ t('perfil.cuentaCognito') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { iniciales } from '../formatos';
import { sesion } from '../sesion';

const { t } = useI18n();
</script>
