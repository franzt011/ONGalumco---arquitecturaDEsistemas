<!--
  Sala de clases + foro (Alumno/Show.vue de Laravel). Cambios:
  - Marcar un módulo espera la respuesta de la API antes de cambiar la pantalla.
  - En el foro se elige a qué módulo va el comentario (antes siempre iba al primer módulo).
  - Los likes y las respuestas se recargan desde la API, en vez de copiar props viejas.
  - Se quitó la pestaña "Notas y Chat", que solo decía "Próximamente".
-->
<template>
  <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
    <div v-if="sala" class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div class="tarjeta p-6">
        <div class="mb-1 flex items-center justify-between">
          <span class="font-bold text-slate-800">{{ t('sala.tuProgreso') }}</span>
          <span class="text-sm font-bold text-blue-600">{{ porcentaje }}%</span>
        </div>
        <p class="mb-3 text-sm text-slate-500">
          {{ t('sala.modulosCompletados', { hechos: completados.length, total: sala.curso.modulos.length }) }}
        </p>
        <BarraProgreso :valor="porcentaje" />
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="space-y-5 lg:col-span-2">
          <div class="flex gap-2">
            <button
              v-for="pestana in (['contenido', 'informacion'] as const)"
              :key="pestana"
              class="rounded-full px-5 py-2 text-sm font-semibold transition"
              :class="pestanaActiva === pestana ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
              @click="pestanaActiva = pestana"
            >
              {{ t(`sala.pestanas.${pestana}`) }}
            </button>
          </div>

          <div v-show="pestanaActiva === 'contenido'" class="space-y-5">
            <section v-for="(modulo, indice) in sala.curso.modulos" :key="modulo.moduloId" class="tarjeta space-y-4 p-6">
              <div class="flex items-center gap-3">
                <span class="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {{ t('sala.modulo', { n: indice + 1 }) }}
                </span>
                <span v-if="modulo.duracion" class="flex items-center gap-1 text-xs text-slate-400">
                  <Clock class="h-3.5 w-3.5" /> {{ modulo.duracion }}
                </span>
              </div>
              <h2 class="text-3xl font-black text-slate-900">{{ modulo.titulo }}</h2>
              <p v-if="modulo.contenido" class="whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{{ modulo.contenido }}</p>

              <div v-if="!iniciados.has(modulo.moduloId) && !estaCompletado(modulo.moduloId)">
                <button class="boton-primario w-full py-3.5" @click="iniciados.add(modulo.moduloId)">{{ t('sala.iniciarModulo') }}</button>
              </div>
              <div v-else class="space-y-4">
                <a
                  v-if="modulo.linkVideo"
                  :href="modulo.linkVideo"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  <PlayCircle class="h-4 w-4" /> {{ t('sala.verVideo') }}
                </a>
                <div v-if="modulo.archivos.length">
                  <p class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{{ t('sala.recursos') }}</p>
                  <button
                    v-for="archivo in modulo.archivos"
                    :key="archivo.clave"
                    class="group mb-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                    @click="descargar(archivo.clave)"
                  >
                    <FileText class="h-5 w-5 shrink-0 text-blue-400" />
                    <span class="flex-1 truncate text-sm font-medium text-slate-700">{{ archivo.nombre }}</span>
                    <Download class="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
                  </button>
                </div>
                <button
                  class="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition"
                  :class="estaCompletado(modulo.moduloId) ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'"
                  :disabled="marcando === modulo.moduloId"
                  @click="alternar(modulo.moduloId)"
                >
                  <CheckSquare class="h-5 w-5" />
                  {{ estaCompletado(modulo.moduloId) ? t('sala.completado') : t('sala.marcarCompletado') }}
                </button>
              </div>
            </section>
          </div>

          <div v-show="pestanaActiva === 'informacion'" class="tarjeta p-6">
            <h3 class="mb-3 font-bold text-slate-900">{{ t('sala.sobreCurso') }}</h3>
            <p class="mb-2 text-sm text-slate-600">{{ sala.curso.descripcion }}</p>
            <p class="text-sm text-slate-500">{{ t('sala.minimoAprobar') }}: <strong>{{ sala.curso.exigenciaMinima }}%</strong></p>
          </div>

          <Foro :curso-id="cursoId" :modulos="sala.curso.modulos" />
        </div>

        <aside>
          <div class="tarjeta sticky top-6 p-6">
            <h3 class="mb-5 font-bold text-slate-900">{{ t('sala.evaluacionFinal') }}</h3>
            <dl class="mb-5 space-y-3 text-sm">
              <div v-for="fila in filasExamen" :key="fila.etiqueta" class="flex justify-between text-slate-600">
                <dt>{{ t(fila.etiqueta) }}</dt>
                <dd class="font-bold text-slate-900">{{ fila.valor }}</dd>
              </div>
            </dl>

            <div v-if="sala.estado === 'completado'" class="mb-4 space-y-3">
              <div class="rounded-xl border border-green-200 bg-green-100 py-3 text-center text-sm font-bold text-green-700">
                {{ t('sala.aprobado') }}
              </div>
              <button class="boton-primario w-full" @click="abrirCertificado">{{ t('sala.verCertificado') }}</button>
            </div>
            <div v-else-if="sala.intentosAgotados" class="mb-4 w-full rounded-xl border border-red-200 bg-red-100 py-3 text-center text-sm font-bold text-red-700">
              {{ t('sala.sinIntentos') }}
            </div>
            <template v-else>
              <div v-if="porcentaje < 100" class="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" /> {{ t('sala.completaModulos') }}
              </div>
              <RouterLink
                v-if="porcentaje === 100"
                :to="`/cursos/${cursoId}/examen`"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                {{ t('sala.realizarExamen') }}
              </RouterLink>
              <button v-else disabled class="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-400">
                <Lock class="h-4 w-4" /> {{ t('sala.realizarExamen') }}
              </button>
            </template>

            <div class="mt-6">
              <p class="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{{ t('sala.modulosDelCurso') }}</p>
              <div
                v-for="(modulo, indice) in sala.curso.modulos"
                :key="modulo.moduloId"
                class="mb-2 flex items-center gap-3 rounded-xl p-2.5"
                :class="estaCompletado(modulo.moduloId) ? 'bg-blue-50' : 'bg-slate-50'"
              >
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" :class="estaCompletado(modulo.moduloId) ? 'bg-blue-600' : 'bg-slate-200'">
                  <Check v-if="estaCompletado(modulo.moduloId)" class="h-3.5 w-3.5 text-white" />
                  <span v-else class="text-xs font-bold text-slate-500">{{ indice + 1 }}</span>
                </div>
                <span class="truncate text-xs font-medium" :class="estaCompletado(modulo.moduloId) ? 'text-blue-700' : 'text-slate-600'">
                  {{ modulo.titulo }}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </EstadoCarga>
</template>

<script setup lang="ts">
import { AlertTriangle, Check, CheckSquare, Clock, Download, FileText, Lock, PlayCircle } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { alternarModulo, verCertificado, verSala } from '../../api/alumco';
import { urlDeArchivo } from '../../archivos';
import { avisar, avisarError } from '../../avisos';
import { useCarga } from '../../carga';
import BarraProgreso from '../../componentes/BarraProgreso.vue';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import Foro from './Foro.vue';

const props = defineProps<{ cursoId: string }>();
const { t } = useI18n();
const { datos: sala, cargando, error, recargar } = useCarga(() => verSala(props.cursoId));

const pestanaActiva = ref<'contenido' | 'informacion'>('contenido');
const iniciados = reactive(new Set<string>());
const marcando = ref<string | null>(null);

const completados = computed(() => sala.value?.modulosCompletados ?? []);
const estaCompletado = (moduloId: string) => completados.value.includes(moduloId);
const porcentaje = computed(() => {
  const total = sala.value?.curso.modulos.length ?? 0;
  return total ? Math.round((completados.value.length / total) * 100) : 0;
});
const filasExamen = computed(() => [
  { etiqueta: 'sala.preguntas', valor: sala.value?.cantidadPreguntas ?? 0 },
  { etiqueta: 'sala.minimoAprobar', valor: `${sala.value?.curso.exigenciaMinima}%` },
  { etiqueta: 'sala.tiempo', valor: t('sala.sinLimite') },
  { etiqueta: 'sala.intentosRestantes', valor: `${sala.value?.intentosRestantes} / ${sala.value?.curso.maxIntentos}` },
]);

async function alternar(moduloId: string): Promise<void> {
  if (!sala.value) return;
  marcando.value = moduloId;
  try {
    const { completado } = await alternarModulo(props.cursoId, moduloId);
    const lista = sala.value.modulosCompletados.filter((id) => id !== moduloId);
    sala.value.modulosCompletados = completado ? [...lista, moduloId] : lista;
    if (completado) avisar(t('sala.moduloCompletado'));
  } catch (e) {
    avisarError(e);
  } finally {
    marcando.value = null;
  }
}

async function descargar(clave: string): Promise<void> {
  const url = await urlDeArchivo(clave);
  if (url) window.open(url, '_blank', 'noopener');
  else avisar(t('sala.archivoNoDisponible'), 'error');
}

async function abrirCertificado(): Promise<void> {
  try {
    const { url } = await verCertificado(props.cursoId);
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    avisarError(e);
  }
}
</script>
