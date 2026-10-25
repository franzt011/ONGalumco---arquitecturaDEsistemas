<!--
  Panel del alumno (Alumno/Dashboard.vue). Arreglo: en Laravel la barra de progreso usaba
  curso.progreso, que el backend nunca enviaba, así que siempre quedaba en 0%.
-->
<template>
  <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900">{{ t('misCursos.titulo') }}</h1>
        <p class="text-slate-600">{{ t('misCursos.descripcion') }}</p>
      </div>
      <RouterLink to="/explorar" class="font-semibold text-blue-600 transition-colors hover:text-blue-800">
        {{ t('misCursos.explorarMas') }} &rarr;
      </RouterLink>
    </div>

    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <div v-if="datos?.length" class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="curso in datos"
          :key="curso.cursoId"
          class="flex flex-col overflow-hidden rounded-2xl border shadow-sm"
          :class="curso.estado === 'reprobado' ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'"
        >
          <div class="h-40">
            <Portada :clave="curso.imagenPortada" :alt="curso.titulo">
              <span class="absolute right-4 top-4 rounded-full border px-3 py-1 text-xs font-extrabold uppercase shadow-sm" :class="insignia(curso).clase">
                {{ t(insignia(curso).texto) }}
              </span>
            </Portada>
          </div>
          <div class="flex flex-1 flex-col p-6">
            <h3 class="mb-2 text-xl font-bold text-slate-800">{{ curso.titulo }}</h3>
            <p class="mb-2 text-xs text-slate-500">
              {{ t('misCursos.modulosCompletados', { hechos: curso.modulosCompletados, total: curso.modulosTotales }) }}
              <template v-if="curso.calificacion !== undefined"> · {{ t('misCursos.nota', { nota: curso.calificacion }) }}</template>
            </p>
            <div class="mb-6 mt-2">
              <BarraProgreso :valor="progreso(curso)" :color="colorBarra(curso)" />
            </div>
            <RouterLink
              :to="`/cursos/${curso.cursoId}`"
              class="mt-auto block w-full rounded-xl py-3 text-center font-bold text-white transition"
              :class="curso.estado === 'reprobado' ? 'bg-red-700 hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-800'"
            >
              {{ curso.estado === 'reprobado' ? t('misCursos.revisar') : t('misCursos.ingresar') }}
            </RouterLink>
          </div>
        </article>
      </div>

      <div v-else class="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <div class="mb-4 text-5xl">📚</div>
        <h3 class="text-xl font-bold text-slate-800">{{ t('misCursos.vacioTitulo') }}</h3>
        <p class="mb-8 text-slate-500">{{ t('misCursos.vacioDescripcion') }}</p>
        <RouterLink to="/explorar" class="boton-primario">{{ t('misCursos.irCatalogo') }}</RouterLink>
      </div>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { verMisCursos } from '../../api/alumco';
import type { MiCurso } from '../../api/tipos';
import { useCarga } from '../../carga';
import BarraProgreso from '../../componentes/BarraProgreso.vue';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import Portada from '../../componentes/Portada.vue';

const { t } = useI18n();
const { datos, cargando, error, recargar } = useCarga(verMisCursos);

function progreso(curso: MiCurso): number {
  if (curso.estado === 'completado') return 100;
  return curso.modulosTotales ? Math.round((curso.modulosCompletados / curso.modulosTotales) * 100) : 0;
}

function colorBarra(curso: MiCurso): string {
  if (curso.estado === 'completado') return 'bg-green-500';
  if (curso.estado === 'reprobado') return 'bg-red-500';
  return 'bg-blue-500';
}

function insignia(curso: MiCurso): { texto: string; clase: string } {
  if (curso.estado === 'completado') return { texto: 'estados.completado', clase: 'bg-green-100 text-green-700 border-green-200' };
  if (curso.estado === 'reprobado') return { texto: 'estados.reprobado', clase: 'bg-red-100 text-red-700 border-red-200' };
  if (curso.modulosCompletados > 0) return { texto: 'estados.en_progreso', clase: 'bg-blue-100 text-blue-700 border-blue-200' };
  return { texto: 'estados.listo', clase: 'bg-white/95 text-slate-700 border-slate-200' };
}
</script>
