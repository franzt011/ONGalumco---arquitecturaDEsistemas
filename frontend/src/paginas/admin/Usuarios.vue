<!--
  Gestión de alumnos o de profesores (Admin/Usuarios/Alumnos.vue y Profesores.vue en una sola página).
  Cambios: el cambio de rol pide confirmación y se revierte si la API lo rechaza (antes la tabla
  quedaba mostrando el rol nuevo aunque fallara), y la inscripción masiva informa a quién omitió.
-->
<template>
  <div class="mx-auto max-w-7xl p-4 sm:p-8">
    <h2 class="mb-6 text-2xl font-bold">{{ tipo === 'alumnos' ? t('admin.gestionAlumnos') : t('admin.gestionProfesores') }}</h2>

    <div class="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
      <input v-model="buscar" type="search" :placeholder="t('admin.buscar')" class="flex-1 rounded-lg border-slate-300" />
      <div v-if="tipo === 'alumnos'" class="flex flex-wrap items-center gap-2">
        <select v-model="cursoSeleccionado" class="rounded-lg border-slate-300 text-sm">
          <option value="">{{ t('admin.seleccionarCurso') }}</option>
          <option v-for="curso in cursos" :key="curso.cursoId" :value="curso.cursoId">{{ curso.titulo }}</option>
        </select>
        <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" :disabled="!puedeActuar" @click="masivo('inscribir')">{{ t('admin.inscribir') }}</button>
        <button class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 disabled:opacity-50" :disabled="!puedeActuar" @click="masivo('desinscribir')">
          {{ t('admin.desinscribir') }}
        </button>
      </div>
    </div>

    <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full text-left">
          <thead class="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
            <tr>
              <th v-if="tipo === 'alumnos'" class="w-10 p-4">
                <input type="checkbox" :checked="todosSeleccionados" :aria-label="t('admin.seleccionarTodos')" @change="alternarTodos" />
              </th>
              <th class="p-4">{{ t('perfil.nombre') }}</th>
              <th class="p-4">{{ t('perfil.sexo') }}</th>
              <th class="p-4">{{ t('perfil.edad') }}</th>
              <th class="p-4">{{ t('perfil.sede') }}</th>
              <th class="p-4">{{ t('admin.rol') }}</th>
              <th class="p-4 text-right">{{ t('admin.acciones') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-if="!datos?.length"><td colspan="7" class="p-8 text-center text-slate-400">{{ t('admin.sinUsuarios') }}</td></tr>
            <tr v-for="usuario in datos" :key="usuario.usuarioId" :class="seleccionados.includes(usuario.usuarioId) ? 'bg-blue-50/50' : ''">
              <td v-if="tipo === 'alumnos'" class="p-4"><input v-model="seleccionados" type="checkbox" :value="usuario.usuarioId" :aria-label="usuario.nombre" /></td>
              <td class="p-4 text-slate-800">{{ usuario.nombre }}<span class="block text-xs text-slate-400">{{ usuario.correo }}</span></td>
              <td class="p-4 text-slate-600">{{ t(`sexos.${usuario.sexo}`) }}</td>
              <td class="p-4 text-slate-600">{{ usuario.edad === 'N/A' ? t('perfil.sinDato') : t('perfil.anios', { n: usuario.edad }) }}</td>
              <td class="p-4 font-medium text-slate-700">{{ t(`sedes.${usuario.sede}`) }}</td>
              <td class="p-4">
                <select
                  :value="usuario.rol"
                  :disabled="usuario.usuarioId === sesion.usuarioId"
                  class="cursor-pointer rounded-md border-slate-300 py-1 pl-2 pr-8 text-sm"
                  @change="cambiar(usuario, ($event.target as HTMLSelectElement))"
                >
                  <option v-for="rol in ROLES" :key="rol" :value="rol">{{ t(`roles.${rol}`) }}</option>
                </select>
              </td>
              <td class="p-4 text-right">
                <RouterLink :to="`/admin/usuarios/${usuario.usuarioId}`" class="rounded-lg bg-blue-50 px-3 py-1.5 font-semibold text-blue-600 transition hover:text-blue-800">
                  {{ t('admin.verPerfil') }}
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </EstadoCarga>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { cambiarRol, inscripcionMasiva, listarCursosGestion, listarUsuarios } from '../../api/alumco';
import type { Curso, Rol, Usuario } from '../../api/tipos';
import { avisar, avisarError } from '../../avisos';
import { useCarga } from '../../carga';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import { sesion } from '../../sesion';

const props = defineProps<{ tipo: 'alumnos' | 'profesores' }>();
const ROLES: Rol[] = ['alumno', 'profesor', 'admin'];
const { t } = useI18n();

const buscar = ref('');
const { datos, cargando, error, recargar } = useCarga(() => listarUsuarios(props.tipo, buscar.value));
const cursos = ref<Curso[]>([]);
const seleccionados = ref<string[]>([]);
const cursoSeleccionado = ref('');

// Espera a que se deje de escribir antes de buscar (en Laravel se pedía una página por cada tecla)
let espera: ReturnType<typeof setTimeout> | undefined;
watch(buscar, () => {
  clearTimeout(espera);
  espera = setTimeout(() => void recargar(), 300);
});
watch(() => props.tipo, () => {
  seleccionados.value = [];
  void recargar();
});

if (props.tipo === 'alumnos') {
  listarCursosGestion()
    .then((lista) => (cursos.value = lista.filter((c) => c.estado === 'publicado')))
    .catch(avisarError);
}

const puedeActuar = computed(() => seleccionados.value.length > 0 && cursoSeleccionado.value !== '');
const todosSeleccionados = computed(() => !!datos.value?.length && seleccionados.value.length === datos.value.length);

function alternarTodos(evento: Event): void {
  seleccionados.value = (evento.target as HTMLInputElement).checked ? (datos.value ?? []).map((u) => u.usuarioId) : [];
}

async function masivo(accion: 'inscribir' | 'desinscribir'): Promise<void> {
  if (!confirm(t(`admin.confirmar.${accion}`, { n: seleccionados.value.length }))) return;
  try {
    const resultado = await inscripcionMasiva({ usuarioIds: seleccionados.value, cursoId: cursoSeleccionado.value, accion });
    avisar(t('admin.masivoResultado', { procesados: resultado.procesados, omitidos: resultado.omitidos.length }));
    seleccionados.value = [];
  } catch (e) {
    avisarError(e);
  }
}

async function cambiar(usuario: Usuario, select: HTMLSelectElement): Promise<void> {
  const nuevo = select.value as Rol;
  if (!confirm(t('admin.confirmarRol', { nombre: usuario.nombre, rol: t(`roles.${nuevo}`) }))) {
    select.value = usuario.rol;
    return;
  }
  try {
    await cambiarRol(usuario.usuarioId, nuevo);
    avisar(t('admin.rolActualizado'));
    await recargar();
  } catch (e) {
    select.value = usuario.rol;
    avisarError(e);
  }
}
</script>
