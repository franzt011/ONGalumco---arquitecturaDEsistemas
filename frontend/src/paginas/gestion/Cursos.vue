<!--
  Lista de cursos del profesor, o de todos los cursos si es admin. Reemplaza
  Profesor/Cursos/Index.vue y Admin/Cursos/Index.vue (eran casi el mismo archivo).
  Crear un curso ahora solo pide los datos básicos; módulos y examen se agregan después.
-->
<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-800">{{ sesion.perfil?.rol === 'admin' ? t('gestion.todosLosCursos') : t('gestion.misCursos') }}</h2>
        <p class="text-sm text-slate-500">{{ t('gestion.descripcion') }}</p>
      </div>
      <button class="boton-oscuro flex items-center gap-2" @click="creando = !creando"><Plus class="h-4 w-4" /> {{ t('gestion.crear') }}</button>
    </div>

    <form v-if="creando" class="tarjeta mb-8 grid gap-4 p-6 md:grid-cols-2" @submit.prevent="crear">
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="titulo">{{ t('gestion.titulo') }}</label>
        <input id="titulo" v-model="nuevo.titulo" required maxlength="150" class="campo" />
      </div>
      <div class="md:col-span-2">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="descripcion">{{ t('gestion.descripcionCurso') }}</label>
        <textarea id="descripcion" v-model="nuevo.descripcion" rows="3" maxlength="5000" class="campo" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="exigencia">{{ t('gestion.exigencia') }}</label>
        <input id="exigencia" v-model.number="nuevo.exigenciaMinima" type="number" min="1" max="100" class="campo" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="intentos">{{ t('gestion.intentos') }}</label>
        <input id="intentos" v-model.number="nuevo.maxIntentos" type="number" min="1" max="10" class="campo" />
      </div>
      <div class="flex justify-end gap-3 md:col-span-2">
        <button type="button" class="boton-secundario" @click="creando = false">{{ t('app.cancelar') }}</button>
        <button class="boton-primario" :disabled="guardando">{{ t('gestion.crearYEditar') }}</button>
      </div>
    </form>

    <div class="relative mb-8">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input v-model="busqueda" type="search" class="block w-full rounded-xl border border-slate-200 bg-white p-4 pl-10 text-sm shadow-sm" :placeholder="t('gestion.buscar')" />
    </div>

    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <p v-if="!filtrados.length" class="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center font-medium text-slate-500">
          {{ t('gestion.sinResultados') }}
        </p>
        <article v-for="curso in filtrados" :key="curso.cursoId" class="tarjeta flex flex-col overflow-hidden transition hover:shadow-md">
          <div class="h-48">
            <Portada :clave="curso.imagenPortada" :alt="curso.titulo">
              <span
                class="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur"
                :class="curso.estado === 'borrador' ? 'bg-amber-100/90 text-amber-800' : 'bg-emerald-100/90 text-emerald-800'"
              >
                {{ t(`estados.${curso.estado}`) }}
              </span>
            </Portada>
          </div>
          <div class="flex flex-1 flex-col p-5">
            <h3 class="mb-2 line-clamp-2 text-lg font-bold text-slate-900">{{ curso.titulo }}</h3>
            <p class="mb-4 line-clamp-3 flex-1 text-sm text-slate-500">{{ curso.descripcion }}</p>
            <div class="mb-5 flex items-center gap-4 text-xs font-medium text-slate-500">
              <span class="flex items-center gap-1.5"><CheckCircle class="h-4 w-4 text-slate-400" /> {{ t('gestion.exigenciaCorta', { n: curso.exigenciaMinima }) }}</span>
              <span class="flex items-center gap-1.5"><Layers class="h-4 w-4 text-slate-400" /> {{ t('explorar.modulos', { n: curso.modulos.length }, curso.modulos.length) }}</span>
            </div>
            <RouterLink :to="`/gestion/cursos/${curso.cursoId}`" class="block w-full rounded-lg bg-slate-900 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-slate-800">
              {{ t('gestion.gestionar') }}
            </RouterLink>
          </div>
        </article>
      </div>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, Layers, Plus, Search } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { crearCurso, listarCursosGestion } from '../../api/alumco';
import { avisar, avisarError } from '../../avisos';
import { useCarga } from '../../carga';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import Portada from '../../componentes/Portada.vue';
import { sesion } from '../../sesion';

const { t } = useI18n();
const router = useRouter();
const { datos, cargando, error, recargar } = useCarga(listarCursosGestion);
const busqueda = ref('');
const creando = ref(false);
const guardando = ref(false);
const nuevo = reactive({ titulo: '', descripcion: '', exigenciaMinima: 60, maxIntentos: 2 });

const filtrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();
  return (datos.value ?? []).filter((c) => !texto || c.titulo.toLowerCase().includes(texto));
});

async function crear(): Promise<void> {
  guardando.value = true;
  try {
    const curso = await crearCurso({ ...nuevo });
    avisar(t('gestion.creado'));
    await router.push(`/gestion/cursos/${curso.cursoId}`);
  } catch (e) {
    avisarError(e);
  } finally {
    guardando.value = false;
  }
}
</script>
