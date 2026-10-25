<template>
  <div class="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2" aria-live="polite">
    <div
      v-for="aviso in avisos"
      :key="aviso.id"
      class="pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
      :class="aviso.tipo === 'exito' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'"
    >
      <CheckCircle v-if="aviso.tipo === 'exito'" class="mt-0.5 h-4 w-4 shrink-0" />
      <AlertTriangle v-else class="mt-0.5 h-4 w-4 shrink-0" />
      <span>{{ aviso.texto }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle } from 'lucide-vue-next';
import { avisos } from '../avisos';
</script>
