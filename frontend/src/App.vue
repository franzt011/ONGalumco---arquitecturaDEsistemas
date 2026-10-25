<template>
  <LayoutApp v-if="sesion.perfil && !route.meta.publica">
    <RouterView />
  </LayoutApp>
  <RouterView v-else />
  <Avisos />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import Avisos from './componentes/Avisos.vue';
import LayoutApp from './componentes/LayoutApp.vue';
import { sesion } from './sesion';

const route = useRoute();
</script>
