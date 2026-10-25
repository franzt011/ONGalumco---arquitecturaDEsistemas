<!-- Muestra "cargando" o el error de la página; si todo está bien, muestra el contenido. -->
<template>
  <div v-if="cargando" class="flex items-center justify-center gap-2 py-24 text-slate-400">
    <Loader2 class="h-5 w-5 animate-spin" /> {{ t('app.cargando') }}
  </div>
  <div v-else-if="error" class="mx-auto my-16 max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
    <p class="font-semibold">{{ error }}</p>
    <button class="mt-4 text-sm font-bold underline" @click="emit('reintentar')">{{ t('app.reintentar') }}</button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

defineProps<{ cargando: boolean; error: string | null }>();
const emit = defineEmits<{ reintentar: [] }>();
const { t } = useI18n();
</script>
