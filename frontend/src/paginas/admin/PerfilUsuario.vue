<!-- Perfil de un usuario visto por el admin (AlumnoPerfil.vue + ProfesorPerfil.vue). -->
<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <button class="mb-6 text-sm text-slate-500 hover:text-slate-800" @click="router.back()">← {{ t('app.volver') }}</button>
    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <div v-if="datos" class="tarjeta p-8">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-black text-white">{{ iniciales(datos.nombre) }}</div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">{{ datos.nombre }}</h1>
            <p class="text-sm text-slate-500">{{ datos.correo }}</p>
            <span class="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase text-blue-700">{{ t(`roles.${datos.rol}`) }}</span>
          </div>
        </div>
        <dl class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs font-bold uppercase text-slate-400">{{ t('perfil.sexo') }}</dt><dd class="font-semibold">{{ t(`sexos.${datos.sexo}`) }}</dd></div>
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs font-bold uppercase text-slate-400">{{ t('perfil.edad') }}</dt><dd class="font-semibold">{{ datos.edad === 'N/A' ? t('perfil.sinDato') : datos.edad }}</dd></div>
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs font-bold uppercase text-slate-400">{{ t('perfil.sede') }}</dt><dd class="font-semibold">{{ t(`sedes.${datos.sede}`) }}</dd></div>
          <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs font-bold uppercase text-slate-400">{{ t('logros.racha') }}</dt><dd class="font-semibold">{{ datos.rachaDias }}</dd></div>
        </dl>

        <h2 class="mb-3 mt-8 font-bold text-slate-900">{{ datos.rol === 'alumno' ? t('admin.cursosInscritos') : t('admin.cursosDictados') }}</h2>
        <p v-if="!datos.cursos.length" class="text-sm text-slate-400">{{ t('admin.sinCursos') }}</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="curso in datos.cursos" :key="curso.cursoId" class="flex items-center justify-between py-3 text-sm">
            <span class="text-slate-700">{{ curso.titulo }}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{{ t(`estados.${curso.estado}`) }}</span>
          </li>
        </ul>
      </div>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { verUsuario } from '../../api/alumco';
import { useCarga } from '../../carga';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import { iniciales } from '../../formatos';

const props = defineProps<{ usuarioId: string }>();
const { t } = useI18n();
const router = useRouter();
const { datos, cargando, error, recargar } = useCarga(() => verUsuario(props.usuarioId));
</script>
