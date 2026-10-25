<!--
  Los campos del registro de Laravel (Register.vue). El correo y la contraseña ya no se piden
  aquí: eso lo hace Cognito. Y ya no se elige el rol: todos parten como alumno.
-->
<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <form class="tarjeta w-full max-w-lg space-y-5 p-8" @submit.prevent="guardar">
      <div>
        <img src="/logo-alumco.png" :alt="t('app.logo')" class="mb-4 h-16" />
        <h1 class="text-2xl font-bold text-slate-900">{{ t('perfil.completarTitulo') }}</h1>
        <p class="text-sm text-slate-500">{{ t('perfil.completarDescripcion') }}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="nombre">{{ t('perfil.nombre') }}</label>
        <input id="nombre" v-model="form.nombre" required maxlength="120" class="campo" />
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="sexo">{{ t('perfil.sexo') }}</label>
          <select id="sexo" v-model="form.sexo" required class="campo">
            <option value="" disabled>{{ t('perfil.seleccionar') }}</option>
            <option v-for="sexo in SEXOS" :key="sexo" :value="sexo">{{ t(`sexos.${sexo}`) }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="nacimiento">{{ t('perfil.fechaNacimiento') }}</label>
          <input id="nacimiento" v-model="form.fechaNacimiento" type="date" required :max="hoy" class="campo" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="sede">{{ t('perfil.sede') }}</label>
        <select id="sede" v-model="form.sede" required class="campo">
          <option value="" disabled>{{ t('perfil.seleccionarSede') }}</option>
          <option v-for="sede in SEDES" :key="sede" :value="sede">{{ t(`sedes.${sede}`) }}</option>
        </select>
      </div>

      <button class="boton-primario w-full" :disabled="guardando">{{ t('perfil.guardar') }}</button>
      <button type="button" class="w-full text-sm text-slate-500 hover:underline" @click="volver">{{ t('nav.cerrarSesion') }}</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { completarPerfil } from '../api/alumco';
import type { Sede, Sexo } from '../api/tipos';
import { avisar, avisarError } from '../avisos';
import { cerrarSesion, inicioSegunRol, sesion } from '../sesion';

const SEXOS: Sexo[] = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'];
const SEDES: Sede[] = ['Santiago', 'Concepcion'];

const { t } = useI18n();
const router = useRouter();
const hoy = new Date().toISOString().slice(0, 10);
const guardando = ref(false);
const form = reactive({ nombre: '', sexo: '' as Sexo | '', fechaNacimiento: '', sede: '' as Sede | '' });

if (!sesion.usuarioId) {
  void router.replace('/');
}

async function guardar(): Promise<void> {
  if (!form.sexo || !form.sede) return;
  guardando.value = true;
  try {
    sesion.perfil = await completarPerfil({ ...form, sexo: form.sexo, sede: form.sede });
    sesion.faltaPerfil = false;
    avisar(t('perfil.bienvenida', { nombre: sesion.perfil.nombre }));
    await router.push(inicioSegunRol());
  } catch (error) {
    avisarError(error);
  } finally {
    guardando.value = false;
  }
}

function volver(): void {
  cerrarSesion();
  void router.push('/');
}
</script>
