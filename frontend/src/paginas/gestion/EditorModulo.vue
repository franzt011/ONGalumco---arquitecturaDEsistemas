<!-- Formulario de un módulo: se usa para editar uno existente o para crear uno nuevo. -->
<template>
  <form class="tarjeta relative p-6" @submit.prevent="emit('guardar', { ...form, archivos: [...form.archivos] })">
    <h4 class="mb-4 font-bold text-slate-800">{{ t('sala.modulo', { n: numero }) }}</h4>
    <div class="mb-4">
      <label class="mb-2 block text-sm font-medium text-slate-700">{{ t('gestion.tituloModulo') }}</label>
      <input v-model="form.titulo" required maxlength="150" class="campo" />
    </div>
    <div class="mb-4">
      <label class="mb-2 block text-sm font-medium text-slate-700">{{ t('gestion.contenido') }}</label>
      <textarea v-model="form.contenido" rows="3" class="campo" />
    </div>
    <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">{{ t('gestion.duracion') }}</label>
        <input v-model="form.duracion" maxlength="50" class="campo" :placeholder="t('gestion.duracionEjemplo')" />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">{{ t('gestion.video') }}</label>
        <input v-model="form.linkVideo" type="url" class="campo" placeholder="https://www.youtube.com/..." />
      </div>
    </div>

    <div class="mb-4">
      <p class="mb-2 text-xs font-bold uppercase text-slate-500">{{ t('gestion.archivos') }}</p>
      <div v-for="(archivo, i) in form.archivos" :key="archivo.clave" class="mb-2 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-2">
        <span class="truncate text-sm text-blue-700">📄 {{ archivo.nombre }}</span>
        <button type="button" class="ml-4 rounded bg-red-50 px-2 py-1 text-xs text-red-500 hover:bg-red-100" @click="form.archivos.splice(i, 1)">{{ t('app.quitar') }}</button>
      </div>
      <input type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" class="block w-full text-sm text-slate-500 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700" :disabled="subiendo" @change="agregarArchivos" />
      <p class="mt-1 text-xs text-slate-400">{{ subiendo ? t('gestion.subiendo') : t('gestion.formatoMaterial') }}</p>
    </div>

    <div class="flex justify-between border-t border-slate-100 pt-4">
      <button v-if="modulo" type="button" class="text-sm font-medium text-red-500" @click="emit('eliminar')">{{ t('app.eliminar') }}</button>
      <button v-else type="button" class="text-sm font-medium text-slate-500" @click="emit('cancelar')">{{ t('app.cancelar') }}</button>
      <button class="boton-oscuro" :disabled="ocupado || subiendo">{{ t('app.guardar') }}</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DatosModulo } from '../../api/alumco';
import type { ArchivoAdjunto, Modulo } from '../../api/tipos';
import { subirArchivo } from '../../archivos';
import { avisarError } from '../../avisos';

const props = defineProps<{ numero: number; modulo?: Modulo; ocupado: boolean }>();
const emit = defineEmits<{ guardar: [datos: DatosModulo]; eliminar: []; cancelar: [] }>();
const { t } = useI18n();
const subiendo = ref(false);

const form = reactive({
  titulo: props.modulo?.titulo ?? '',
  contenido: props.modulo?.contenido ?? '',
  duracion: props.modulo?.duracion ?? '',
  linkVideo: props.modulo?.linkVideo ?? '',
  archivos: [...(props.modulo?.archivos ?? [])] as ArchivoAdjunto[],
});

async function agregarArchivos(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement;
  subiendo.value = true;
  try {
    for (const archivo of Array.from(entrada.files ?? [])) {
      form.archivos.push({ clave: await subirArchivo('material', archivo), nombre: archivo.name });
    }
  } catch (e) {
    avisarError(e);
  } finally {
    subiendo.value = false;
    entrada.value = '';
  }
}
</script>
