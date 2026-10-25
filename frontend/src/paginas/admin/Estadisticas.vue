<!-- Estadísticas de la plataforma (Admin/Estadisticas.vue), con las mismas barras por rol, sexo, sede y edad. -->
<template>
  <div class="mx-auto max-w-7xl p-4 sm:p-8">
    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <template v-if="datos">
        <div class="mb-8">
          <h2 class="text-3xl font-extrabold text-slate-900">{{ t('estadisticas.titulo') }}</h2>
          <p class="mt-1 text-slate-600">{{ t('estadisticas.descripcion', { n: datos.totalUsuarios }, datos.totalUsuarios) }}</p>
        </div>

        <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
          <section v-for="grupo in grupos" :key="grupo.titulo" class="tarjeta p-6">
            <h3 class="mb-6 text-lg font-bold text-slate-800">{{ t(grupo.titulo) }}</h3>
            <p v-if="!grupo.filas.length" class="py-4 text-center text-sm text-slate-500">{{ t('estadisticas.sinDatos') }}</p>
            <div v-for="fila in grupo.filas" :key="fila.etiqueta" class="mb-4">
              <div class="mb-1 flex justify-between text-sm font-semibold">
                <span class="text-slate-700">{{ fila.etiqueta }}</span>
                <span :class="grupo.texto">{{ fila.total }} ({{ porcentaje(fila.total) }}%)</span>
              </div>
              <BarraProgreso :valor="porcentaje(fila.total)" :color="grupo.barra" />
            </div>
          </section>

          <section class="tarjeta p-6 md:col-span-2">
            <h3 class="mb-6 text-lg font-bold text-slate-800">{{ t('estadisticas.porEdad') }}</h3>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div v-for="rango in datos.porEdad" :key="rango.rango" class="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h4 class="mb-2 text-sm font-semibold text-slate-500">{{ te(`rangosEdad.${rango.rango}`) ? t(`rangosEdad.${rango.rango}`) : rango.rango }}</h4>
                <p class="mb-3"><span class="text-3xl font-black text-slate-800">{{ rango.total }}</span> <span class="text-sm text-slate-500">{{ t('estadisticas.usuarios', rango.total) }}</span></p>
                <BarraProgreso :valor="porcentaje(rango.total)" color="bg-indigo-500" />
              </div>
            </div>
          </section>

          <section class="tarjeta overflow-x-auto p-6 md:col-span-2">
            <h3 class="mb-4 text-lg font-bold text-slate-800">{{ t('estadisticas.finalizaciones') }}</h3>
            <p v-if="!datos.finalizaciones.length" class="py-4 text-center text-sm text-slate-500">{{ t('estadisticas.sinFinalizaciones') }}</p>
            <table v-else class="w-full text-left text-sm">
              <thead class="text-xs uppercase text-slate-400">
                <tr>
                  <th class="pb-3">{{ t('estadisticas.alumno') }}</th>
                  <th class="pb-3">{{ t('estadisticas.curso') }}</th>
                  <th class="pb-3">{{ t('perfil.sede') }}</th>
                  <th class="pb-3">{{ t('estadisticas.puntuacion') }}</th>
                  <th class="pb-3">{{ t('estadisticas.fecha') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(fila, i) in datos.finalizaciones" :key="i">
                  <td class="py-3 font-medium text-slate-800">{{ fila.alumno }}</td>
                  <td class="py-3 text-slate-600">{{ fila.curso }}</td>
                  <td class="py-3 text-slate-600">{{ t(`sedes.${fila.sede}`) }}</td>
                  <td class="py-3 font-bold" :class="fila.puntuacion > 90 ? 'text-green-600' : fila.puntuacion > 70 ? 'text-blue-600' : 'text-red-500'">
                    {{ fila.puntuacion }}% <span class="text-xs font-medium">{{ fila.aprobado ? '✓' : '✕' }}</span>
                  </td>
                  <td class="py-3 text-slate-500">{{ fechaCorta(fila.fecha, locale) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </template>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { verEstadisticas } from '../../api/alumco';
import { useCarga } from '../../carga';
import BarraProgreso from '../../componentes/BarraProgreso.vue';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import { fechaCorta } from '../../formatos';

const { t, te, locale } = useI18n();
const { datos, cargando, error, recargar } = useCarga(verEstadisticas);

const porcentaje = (total: number) => (datos.value?.totalUsuarios ? Math.round((total / datos.value.totalUsuarios) * 100) : 0);

const grupos = computed(() => {
  const d = datos.value;
  if (!d) return [];
  return [
    { titulo: 'estadisticas.porRol', barra: 'bg-blue-500', texto: 'text-blue-600', filas: d.porRol.map((f) => ({ etiqueta: t(`roles.${f.rol}`), total: f.total })) },
    { titulo: 'estadisticas.porSexo', barra: 'bg-emerald-500', texto: 'text-emerald-600', filas: d.porSexo.map((f) => ({ etiqueta: t(`sexos.${f.sexo}`), total: f.total })) },
    { titulo: 'estadisticas.porSede', barra: 'bg-orange-500', texto: 'text-orange-600', filas: d.porSede.map((f) => ({ etiqueta: t(`sedes.${f.sede}`), total: f.total })) },
  ];
});
</script>
