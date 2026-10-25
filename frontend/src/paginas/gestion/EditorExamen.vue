<!-- Editor de las preguntas del examen. Se guarda todo junto con un solo botón. -->
<template>
  <form class="space-y-6" @submit.prevent="emit('guardar', limpiar())">
    <div v-for="(pregunta, i) in lista" :key="i" class="tarjeta relative p-6">
      <button type="button" class="absolute right-4 top-4 text-sm text-red-500" @click="lista.splice(i, 1)">{{ t('app.eliminar') }}</button>
      <div class="mb-4 flex flex-wrap items-center gap-4">
        <h4 class="font-bold text-slate-800">{{ t('examen.pregunta', { n: i + 1 }) }}</h4>
        <select v-model="pregunta.tipo" class="rounded-lg border-slate-300 py-1.5 pl-3 pr-10 text-sm">
          <option value="multiple">{{ t('gestion.multiple') }}</option>
          <option value="vf">{{ t('gestion.vf') }}</option>
        </select>
      </div>
      <textarea v-model="pregunta.texto" rows="2" required maxlength="1000" class="campo mb-4" :placeholder="t('gestion.enunciado')" />

      <div v-if="pregunta.tipo === 'multiple'" class="space-y-3">
        <p class="text-xs text-slate-400">{{ t('gestion.marcaCorrecta') }}</p>
        <div v-for="(opcion, j) in pregunta.opciones" :key="j" class="flex items-center gap-3">
          <input type="radio" :name="`correcta-${i}`" :checked="opcion.esCorrecta" class="h-5 w-5 text-blue-600" :aria-label="t('gestion.esCorrecta')" @change="marcarCorrecta(i, j)" />
          <input v-model="opcion.texto" class="campo flex-1" maxlength="500" :placeholder="t('gestion.opcion', { n: j + 1 })" />
          <button v-if="pregunta.opciones.length > 2" type="button" class="text-slate-400 hover:text-red-500" :aria-label="t('app.quitar')" @click="pregunta.opciones.splice(j, 1)">✕</button>
        </div>
        <button v-if="pregunta.opciones.length < 6" type="button" class="text-sm font-medium text-blue-600" @click="pregunta.opciones.push({ texto: '', esCorrecta: false })">
          + {{ t('gestion.agregarOpcion') }}
        </button>
      </div>
      <div v-else class="flex items-center gap-6 text-sm text-slate-700">
        <label class="flex items-center gap-2"><input v-model="pregunta.respuestaVf" type="radio" :value="true" :name="`vf-${i}`" /> {{ t('examen.verdadero') }}</label>
        <label class="flex items-center gap-2"><input v-model="pregunta.respuestaVf" type="radio" :value="false" :name="`vf-${i}`" /> {{ t('examen.falso') }}</label>
      </div>
    </div>

    <button type="button" class="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 font-medium text-slate-600 hover:bg-white" @click="lista.push(nuevaPregunta())">
      + {{ t('gestion.agregarPregunta') }}
    </button>
    <div class="flex justify-end">
      <button class="boton-oscuro" :disabled="ocupado">{{ t('gestion.guardarExamen') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PreguntaProfesor } from '../../api/tipos';

const props = defineProps<{ preguntas: PreguntaProfesor[]; ocupado: boolean }>();
const emit = defineEmits<{ guardar: [preguntas: PreguntaProfesor[]] }>();
const { t } = useI18n();

function nuevaPregunta(): PreguntaProfesor {
  return {
    tipo: 'multiple',
    texto: '',
    respuestaVf: true,
    opciones: [
      { texto: '', esCorrecta: true },
      { texto: '', esCorrecta: false },
      { texto: '', esCorrecta: false },
    ],
  };
}

function copiar(preguntas: PreguntaProfesor[]): PreguntaProfesor[] {
  const copia = preguntas.map((p) => ({ ...p, opciones: p.opciones.map((o) => ({ ...o })) }));
  return copia.length ? copia : [nuevaPregunta()];
}

const lista = ref<PreguntaProfesor[]>(copiar(props.preguntas));
watch(() => props.preguntas, (p) => (lista.value = copiar(p)));

function marcarCorrecta(i: number, j: number): void {
  lista.value[i].opciones.forEach((o, k) => (o.esCorrecta = k === j));
}

/** Lo que espera la API: sin ids (los pone el backend) y solo los campos del tipo elegido. */
function limpiar(): PreguntaProfesor[] {
  return lista.value.map((p) =>
    p.tipo === 'vf'
      ? { tipo: 'vf', texto: p.texto, respuestaVf: p.respuestaVf ?? true, opciones: [] }
      : { tipo: 'multiple', texto: p.texto, opciones: p.opciones.filter((o) => o.texto.trim()).map((o) => ({ texto: o.texto, esCorrecta: o.esCorrecta })) },
  );
}
</script>
