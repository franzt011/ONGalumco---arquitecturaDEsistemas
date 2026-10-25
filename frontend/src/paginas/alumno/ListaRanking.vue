<!-- Lista del ranking. Antes estaba copiada en MisLogros.vue y en Ranking.vue; ahora es un solo componente. -->
<template>
  <p v-if="!ranking.length" class="py-12 text-center text-sm text-slate-400">{{ t('logros.sinRanking') }}</p>
  <ol v-else class="space-y-2">
    <li
      v-for="alumno in ranking"
      :key="alumno.usuarioId"
      class="flex items-center gap-3 rounded-xl border px-4 py-3 transition"
      :class="alumno.esYo ? 'border-blue-100 border-l-4 border-l-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'"
    >
      <div class="w-7 shrink-0 text-center">
        <Medal v-if="alumno.posicion <= 3" class="mx-auto h-5 w-5" :class="['text-yellow-400', 'text-slate-400', 'text-amber-600'][alumno.posicion - 1]" />
        <span v-else class="text-sm font-bold text-slate-400">{{ alumno.posicion }}</span>
      </div>
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" :class="alumno.esYo ? 'bg-blue-600' : 'bg-slate-500'">
        {{ iniciales(alumno.nombre) }}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="truncate text-sm font-semibold text-slate-800">{{ alumno.nombre }}</span>
          <span v-if="alumno.esYo" class="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-bold text-white">{{ t('logros.tu') }}</span>
        </div>
        <p class="truncate text-xs text-slate-400">{{ t(`sedes.${alumno.sede}`) }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-1 text-xs text-slate-500"><Flame class="h-3.5 w-3.5 text-orange-400" /> {{ alumno.rachaDias }}d</div>
      <div class="shrink-0 text-right">
        <p class="text-sm font-black text-slate-900">{{ numero(alumno.xp, locale) }}</p>
        <p class="text-xs text-slate-400">XP</p>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { Flame, Medal } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { PosicionRanking } from '../../api/tipos';
import { iniciales, numero } from '../../formatos';

defineProps<{ ranking: PosicionRanking[] }>();
const { t, locale } = useI18n();
</script>
