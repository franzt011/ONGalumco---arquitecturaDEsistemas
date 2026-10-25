<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6 flex items-center gap-3">
      <RouterLink to="/mis-logros" class="text-sm text-slate-400 hover:text-slate-600">← {{ t('app.volver') }}</RouterLink>
      <h1 class="text-2xl font-extrabold text-slate-900">{{ t('logros.rankingCompleto') }}</h1>
    </div>
    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <div class="tarjeta p-6">
        <ListaRanking :ranking="datos?.ranking ?? []" />
      </div>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { verGamificacion } from '../../api/alumco';
import { useCarga } from '../../carga';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import ListaRanking from './ListaRanking.vue';

const { t } = useI18n();
const { datos, cargando, error, recargar } = useCarga(verGamificacion);
</script>
