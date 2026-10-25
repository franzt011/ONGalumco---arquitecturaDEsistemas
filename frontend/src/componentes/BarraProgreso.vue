<template>
  <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
    <div class="h-full rounded-full transition-all duration-500" :class="color" :style="{ width: `${Math.min(100, Math.max(0, valor))}%` }" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ valor: number; color?: string }>(), { color: 'bg-blue-600' });
</script>
