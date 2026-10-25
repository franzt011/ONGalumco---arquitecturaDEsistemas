<!-- Catálogo (Alumno/Explorar.vue de Laravel). -->
<template>
  <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-slate-900">{{ t('explorar.titulo') }}</h1>
      <p class="text-slate-600">{{ t('explorar.descripcion') }}</p>
    </div>

    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <div v-if="datos?.length" class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <article v-for="curso in datos" :key="curso.cursoId" class="tarjeta flex flex-col overflow-hidden transition-shadow hover:shadow-md">
          <div class="h-48"><Portada :clave="curso.imagenPortada" :alt="curso.titulo" /></div>
          <div class="flex flex-1 flex-col justify-between p-6">
            <div>
              <h3 class="mb-2 text-xl font-bold text-slate-800">{{ curso.titulo }}</h3>
              <p class="mb-2 line-clamp-3 text-sm text-slate-500">{{ curso.descripcion }}</p>
              <p class="mb-6 text-xs font-medium text-slate-400">{{ t('explorar.modulos', { n: curso.cantidadModulos }, curso.cantidadModulos) }}</p>
            </div>
            <div v-if="curso.inscrito" class="w-full rounded-xl bg-slate-100 py-2.5 text-center font-semibold text-slate-500">
              {{ t('explorar.yaParticipas') }}
            </div>
            <button v-else class="boton-primario w-full" :disabled="inscribiendo === curso.cursoId" @click="inscribirme(curso.cursoId)">
              {{ t('explorar.inscribirme') }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="py-12 text-center text-gray-500">{{ t('explorar.vacio') }}</p>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { inscribirse, verCatalogo } from '../../api/alumco';
import { avisar, avisarError } from '../../avisos';
import { useCarga } from '../../carga';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import Portada from '../../componentes/Portada.vue';

const { t } = useI18n();
const router = useRouter();
const { datos, cargando, error, recargar } = useCarga(verCatalogo);
const inscribiendo = ref<string | null>(null);

async function inscribirme(cursoId: string): Promise<void> {
  inscribiendo.value = cursoId;
  try {
    await inscribirse(cursoId);
    avisar(t('explorar.inscripcionExitosa'));
    await router.push('/mis-cursos');
  } catch (e) {
    avisarError(e);
  } finally {
    inscribiendo.value = null;
  }
}
</script>
