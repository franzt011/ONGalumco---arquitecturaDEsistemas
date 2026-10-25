<template>
  <label class="flex items-center gap-1 text-sm text-slate-500">
    <Languages class="h-4 w-4" />
    <span class="sr-only">{{ t('app.idioma') }}</span>
    <select
      :value="locale"
      class="rounded-md border-slate-200 py-1 pl-2 pr-7 text-sm"
      @change="cambiarIdioma(($event.target as HTMLSelectElement).value as Idioma)"
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { Languages } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { cambiarIdioma, type Idioma } from '../i18n';

const { t, locale } = useI18n();
</script>
