<template>
  <button
    class="flex items-center gap-1.5 text-xs font-medium transition"
    :class="comentario.meGusta ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'"
    :aria-pressed="comentario.meGusta"
    :disabled="enviando"
    @click="alternar"
  >
    <ThumbsUp :class="[pequeno ? 'h-3.5 w-3.5' : 'h-4 w-4', comentario.meGusta ? 'fill-blue-600' : '']" />
    {{ comentario.likes }}
  </button>
</template>

<script setup lang="ts">
import { ThumbsUp } from 'lucide-vue-next';
import { ref } from 'vue';
import { alternarLike } from '../../api/alumco';
import type { Comentario } from '../../api/tipos';
import { avisarError } from '../../avisos';

const props = defineProps<{ comentario: Comentario; pequeno?: boolean }>();
const emit = defineEmits<{ cambio: [] }>();
const enviando = ref(false);

async function alternar(): Promise<void> {
  enviando.value = true;
  try {
    await alternarLike(props.comentario.comentarioId);
    emit('cambio');
  } catch (e) {
    avisarError(e);
  } finally {
    enviando.value = false;
  }
}
</script>
