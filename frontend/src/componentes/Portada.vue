<!-- Imagen de portada de un curso. Pide la URL temporal a la API; si no hay imagen, muestra un ícono. -->
<template>
  <div class="relative h-full w-full overflow-hidden bg-slate-100">
    <img v-if="url" :src="url" :alt="alt" class="absolute inset-0 h-full w-full object-cover" @error="url = null" />
    <div v-else class="absolute inset-0 flex items-center justify-center text-slate-300">
      <ImageIcon class="h-12 w-12" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Image as ImageIcon } from 'lucide-vue-next';
import { ref, watchEffect } from 'vue';
import { urlDeArchivo } from '../archivos';

const props = defineProps<{ clave?: string; alt: string }>();
const url = ref<string | null>(null);

watchEffect(async () => {
  url.value = await urlDeArchivo(props.clave);
});
</script>
