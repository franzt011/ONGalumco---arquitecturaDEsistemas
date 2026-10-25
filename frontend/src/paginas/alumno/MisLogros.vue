<!-- Logros, nivel, racha y ranking (Alumno/MisLogros.vue). Los nombres de logros se traducen por su id. -->
<template>
  <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
    <div v-if="datos" class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900">{{ t('logros.hola', { nombre: sesion.perfil?.nombre }) }} 👋</h1>
        <p class="mt-1 text-sm text-slate-400">{{ fechaLarga(new Date(), locale, true) }}</p>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div class="lg:col-span-2">
          <div class="tarjeta space-y-6 p-6">
            <div class="flex items-center gap-4">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-xl font-black text-white">{{ iniciales(sesion.perfil?.nombre) }}</div>
              <div>
                <p class="font-bold leading-tight text-slate-900">{{ sesion.perfil?.nombre }}</p>
                <p class="text-sm text-slate-400">{{ t(`sedes.${sesion.perfil?.sede}`) }}</p>
                <span class="mt-1 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{{ t('logros.nivel', { n: e.nivel }) }}</span>
              </div>
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-widest text-slate-400">{{ t('logros.puntosXp') }}</span>
                <span class="text-sm font-bold text-blue-600">{{ numero(e.xpEnNivel, locale) }} / {{ numero(e.xpParaSiguiente, locale) }}</span>
              </div>
              <BarraProgreso :valor="(e.xpEnNivel / e.xpParaSiguiente) * 100" />
              <p class="mt-1 text-xs text-slate-400">{{ t('logros.paraSiguiente', { n: e.xpParaSiguiente - e.xpEnNivel }) }}</p>
              <p class="mt-0.5 text-xs text-slate-400">{{ t('logros.xpTotal') }}: <strong class="text-slate-600">{{ numero(e.xpTotal, locale) }}</strong></p>
            </div>

            <div class="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <p class="mb-2 font-bold uppercase tracking-wider text-slate-500">{{ t('logros.comoGano') }}</p>
              <p class="flex items-center gap-2"><BookOpen class="h-3.5 w-3.5 text-blue-400" /> {{ t('logros.reglaModulo') }}</p>
              <p class="flex items-center gap-2"><Trophy class="h-3.5 w-3.5 text-amber-400" /> {{ t('logros.reglaExamen') }}</p>
              <p class="flex items-center gap-2"><Zap class="h-3.5 w-3.5 text-yellow-400" /> {{ t('logros.reglaNivel') }}</p>
            </div>

            <div class="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <span class="text-2xl">🔥</span>
              <div>
                <p class="text-sm font-bold text-amber-700">
                  <span class="text-xl font-black">{{ e.rachaDias }}</span> {{ t('logros.diasRacha', e.rachaDias) }}
                </p>
                <p class="text-xs text-amber-500">{{ e.rachaDias < 3 ? t('logros.sigueAsi') : t('logros.constancia') }}</p>
              </div>
            </div>

            <div>
              <div class="mb-3 flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-widest text-slate-400">{{ t('logros.logros') }}</span>
                <span class="text-xs font-bold text-blue-600">{{ t('logros.desbloqueados', { n: e.logrosDesbloqueados, total: e.logrosTotal }) }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div
                  v-for="logro in e.logros"
                  :key="logro.id"
                  class="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition"
                  :class="logro.desbloqueado ? COLOR_FONDO[logro.color] : 'border-slate-100 bg-slate-50 opacity-40 grayscale'"
                  :title="t(`logros.lista.${logro.id}.descripcion`)"
                >
                  <component :is="ICONOS[logro.icono] ?? Star" class="h-6 w-6" :class="logro.desbloqueado ? COLOR_ICONO[logro.color] : 'text-slate-400'" />
                  <span class="text-center text-xs font-semibold leading-tight" :class="logro.desbloqueado ? 'text-slate-700' : 'text-slate-400'">
                    {{ t(`logros.lista.${logro.id}.nombre`) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-3">
          <div class="tarjeta p-6">
            <h2 class="text-lg font-bold text-slate-900">{{ t('logros.tablaLideres') }}</h2>
            <p class="mb-5 mt-0.5 text-xs text-slate-400">{{ t('logros.ordenados') }}</p>
            <ListaRanking :ranking="datos.ranking.slice(0, 5)" />
            <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <p class="text-xs text-slate-400">{{ t('logros.registrados', { n: datos.ranking.length }, datos.ranking.length) }}</p>
              <RouterLink to="/ranking" class="text-sm font-medium text-blue-600 hover:underline">{{ t('logros.verRanking') }} →</RouterLink>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-4">
            <div v-for="dato in resumen" :key="dato.texto" class="tarjeta p-4 text-center">
              <component :is="dato.icono" class="mx-auto mb-1 h-6 w-6" :class="dato.color" />
              <p class="text-2xl font-black text-slate-900">{{ dato.valor }}</p>
              <p class="text-xs text-slate-400">{{ t(dato.texto) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </EstadoCarga>
</template>

<script setup lang="ts">
import { BookOpen, Diamond, Flame, Globe, Medal, Star, Trophy, Zap, type LucideIcon } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { verGamificacion } from '../../api/alumco';
import { useCarga } from '../../carga';
import BarraProgreso from '../../componentes/BarraProgreso.vue';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import { fechaLarga, iniciales, numero } from '../../formatos';
import { sesion } from '../../sesion';
import ListaRanking from './ListaRanking.vue';

const { t, locale } = useI18n();
const { datos, cargando, error, recargar } = useCarga(verGamificacion);
const e = computed(() => datos.value!.estado);

const ICONOS: Record<string, LucideIcon> = { Zap, Flame, BookOpen, Trophy, Diamond, Globe, Star, Medal };
const COLOR_FONDO: Record<string, string> = {
  yellow: 'bg-yellow-50 border-yellow-100',
  orange: 'bg-orange-50 border-orange-100',
  purple: 'bg-purple-50 border-purple-100',
  amber: 'bg-amber-50 border-amber-100',
  cyan: 'bg-cyan-50 border-cyan-100',
  green: 'bg-green-50 border-green-100',
};
const COLOR_ICONO: Record<string, string> = {
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  amber: 'text-amber-500',
  cyan: 'text-cyan-500',
  green: 'text-green-500',
};

const resumen = computed(() => [
  { icono: BookOpen, color: 'text-blue-400', valor: e.value.modulosCompletados, texto: 'logros.modulos' },
  { icono: Trophy, color: 'text-amber-400', valor: e.value.examenesAprobados, texto: 'logros.examenes' },
  { icono: Star, color: 'text-purple-400', valor: e.value.cursosCompletados, texto: 'logros.cursos' },
]);
</script>
