<!-- Foro de discusión del curso (la segunda mitad de Alumno/Show.vue en Laravel). -->
<template>
  <section class="tarjeta space-y-5 p-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 font-bold text-slate-800">
        <MessageSquare class="h-5 w-5 text-blue-500" /> {{ t('foro.titulo') }}
      </div>
      <span class="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
        {{ t('foro.publicaciones', { n: comentarios.length }, comentarios.length) }}
      </span>
    </div>

    <form class="space-y-3" @submit.prevent="publicar()">
      <textarea
        v-model="nuevo.contenido"
        rows="3"
        maxlength="2000"
        :placeholder="t('foro.placeholder')"
        class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <input
        v-model="nuevo.enlace"
        type="url"
        :placeholder="t('foro.enlaceOpcional')"
        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-sm text-slate-500">
          {{ t('foro.sobreModulo') }}
          <select v-model="nuevo.moduloId" class="rounded-lg border-slate-200 py-1 text-sm">
            <option v-for="modulo in modulos" :key="modulo.moduloId" :value="modulo.moduloId">{{ modulo.titulo }}</option>
          </select>
        </label>
        <button class="boton-primario flex items-center gap-2 px-5 py-2 text-sm" :disabled="!nuevo.contenido.trim() || enviando">
          <Send class="h-4 w-4" /> {{ t('foro.publicar') }}
        </button>
      </div>
    </form>

    <p v-if="!comentarios.length" class="py-6 text-center text-sm text-slate-400">{{ t('foro.vacio') }}</p>

    <div class="space-y-5 pt-2">
      <article v-for="c in comentarios" :key="c.comentarioId" class="flex gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{{ iniciales(c.autor.nombre) }}</div>
        <div class="flex-1 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-bold text-slate-800">{{ c.autor.nombre }}</span>
            <span class="text-xs text-slate-400">{{ fechaRelativa(c.fecha, locale) }}</span>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{{ tituloModulo(c.moduloId) }}</span>
          </div>
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{{ c.contenido }}</p>
          <a
            v-if="c.enlace"
            :href="c.enlace"
            target="_blank"
            rel="noopener nofollow"
            class="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-blue-600 transition hover:bg-slate-100"
          >
            <Link2 class="h-3.5 w-3.5 shrink-0" /> <span class="truncate">{{ c.enlace }}</span>
          </a>
          <div class="flex items-center gap-4 pt-1">
            <BotonLike :comentario="c" @cambio="recargar" />
            <button class="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-600" @click="alternarRespuesta(c.comentarioId)">
              <CornerDownRight class="h-4 w-4" /> {{ t('foro.responder') }}
            </button>
            <button v-if="c.respuestas.length" class="text-xs text-slate-400 transition hover:text-slate-600" @click="alternarVisibles(c.comentarioId)">
              {{ visibles.has(c.comentarioId) ? t('foro.ocultarRespuestas') : t('foro.verRespuestas', { n: c.respuestas.length }, c.respuestas.length) }}
            </button>
          </div>

          <form v-if="respondiendo === c.comentarioId" class="mt-2 space-y-2" @submit.prevent="publicar(c)">
            <textarea
              v-model="textoRespuesta"
              rows="2"
              maxlength="2000"
              :placeholder="t('foro.escribeRespuesta')"
              class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div class="flex justify-end gap-2">
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600" @click="respondiendo = null">{{ t('app.cancelar') }}</button>
              <button class="boton-primario flex items-center gap-1.5 px-4 py-1.5 text-xs" :disabled="!textoRespuesta.trim() || enviando">
                <Send class="h-3.5 w-3.5" /> {{ t('foro.responder') }}
              </button>
            </div>
          </form>

          <div v-if="visibles.has(c.comentarioId)" class="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
            <div v-for="r in c.respuestas" :key="r.comentarioId" class="flex gap-3">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">{{ iniciales(r.autor.nombre) }}</div>
              <div class="flex-1 space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-800">{{ r.autor.nombre }}</span>
                  <span class="text-xs text-slate-400">{{ fechaRelativa(r.fecha, locale) }}</span>
                </div>
                <p class="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{{ r.contenido }}</p>
                <BotonLike :comentario="r" pequeno @cambio="recargar" />
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CornerDownRight, Link2, MessageSquare, Send } from 'lucide-vue-next';
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { comentar, verForo } from '../../api/alumco';
import type { ComentarioConRespuestas, Modulo } from '../../api/tipos';
import { avisarError } from '../../avisos';
import { fechaRelativa, iniciales } from '../../formatos';
import BotonLike from './BotonLike.vue';

const props = defineProps<{ cursoId: string; modulos: Modulo[] }>();
const { t, locale } = useI18n();

const comentarios = ref<ComentarioConRespuestas[]>([]);
const nuevo = reactive({ contenido: '', enlace: '', moduloId: props.modulos[0]?.moduloId ?? '' });
const respondiendo = ref<string | null>(null);
const textoRespuesta = ref('');
const visibles = reactive(new Set<string>());
const enviando = ref(false);

watch(
  () => props.modulos,
  (modulos) => {
    if (!modulos.some((m) => m.moduloId === nuevo.moduloId)) nuevo.moduloId = modulos[0]?.moduloId ?? '';
  },
);

async function recargar(): Promise<void> {
  try {
    comentarios.value = await verForo(props.cursoId);
  } catch (e) {
    avisarError(e);
  }
}
void recargar();

const tituloModulo = (moduloId: string) => props.modulos.find((m) => m.moduloId === moduloId)?.titulo ?? '';

function alternarRespuesta(id: string): void {
  respondiendo.value = respondiendo.value === id ? null : id;
  textoRespuesta.value = '';
}

function alternarVisibles(id: string): void {
  if (visibles.has(id)) visibles.delete(id);
  else visibles.add(id);
}

async function publicar(original?: ComentarioConRespuestas): Promise<void> {
  const contenido = original ? textoRespuesta.value : nuevo.contenido;
  if (!contenido.trim()) return;
  enviando.value = true;
  try {
    await comentar(props.cursoId, original?.moduloId ?? nuevo.moduloId, {
      contenido,
      enlace: !original && nuevo.enlace ? nuevo.enlace : undefined,
      respuestaA: original?.comentarioId,
    });
    if (original) {
      respondiendo.value = null;
      visibles.add(original.comentarioId);
    } else {
      nuevo.contenido = '';
      nuevo.enlace = '';
    }
    await recargar();
  } catch (e) {
    avisarError(e);
  } finally {
    enviando.value = false;
  }
}
</script>
