<!--
  Examen y resultado (Alumno/Examen/Show.vue + Resultado.vue). Cambios:
  - Se genera un intentoId al abrir el examen: si el envío se repite (doble clic, timeout),
    el backend devuelve el mismo resultado y no se gasta otro intento.
  - El resultado muestra los XP reales (+200). Antes decía "+850 XP", escrito a mano.
  - Se quitaron los botones "Escanear QR" y "Califica este curso", que no hacían nada.
-->
<template>
  <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
    <div v-if="examen" class="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <!-- 1. Advertencia -->
      <div v-if="fase === 'advertencia'" class="tarjeta mt-10 p-8 text-center">
        <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">⚠️</div>
        <h2 class="mb-4 text-2xl font-bold text-slate-900">{{ t('examen.listo') }}</h2>
        <p class="mb-6 text-lg text-slate-600">
          {{ t('examen.vasAIniciar') }} <strong>{{ examen.titulo }}</strong>.
        </p>
        <ul class="mb-8 list-inside list-disc space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-800">
          <li>{{ t('examen.cantidad', { n: examen.preguntas.length }, examen.preguntas.length) }}</li>
          <li>{{ t('examen.minimo', { n: examen.exigenciaMinima }) }}</li>
          <li>{{ t('examen.intentos', { n: examen.intentosRestantes }, examen.intentosRestantes) }}</li>
          <li><strong>{{ t('examen.importante') }}</strong> {{ t('examen.sinGuardar') }}</li>
        </ul>
        <div class="flex flex-wrap justify-center gap-4">
          <RouterLink :to="`/cursos/${cursoId}`" class="boton-secundario">{{ t('examen.volverCurso') }}</RouterLink>
          <button class="boton-primario px-8 shadow-md" @click="fase = 'examen'">{{ t('examen.comenzar') }}</button>
        </div>
      </div>

      <!-- 2. Preguntas -->
      <div v-else-if="fase === 'examen' && pregunta">
        <button class="mb-6 flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-900" @click="salir">
          &larr; {{ t('examen.volverCurso') }}
        </button>
        <div class="tarjeta mb-6 p-6">
          <div class="mb-3 flex items-end justify-between">
            <span class="font-bold text-slate-800">{{ t('examen.preguntaDe', { actual: indice + 1, total: examen.preguntas.length }) }}</span>
            <span class="text-sm font-bold text-slate-900">{{ avance }}%</span>
          </div>
          <BarraProgreso :valor="avance" color="bg-slate-900" />
        </div>

        <fieldset class="tarjeta mb-8 min-h-[300px] p-8">
          <legend class="sr-only">{{ pregunta.texto }}</legend>
          <h3 class="mb-2 font-bold text-slate-900">{{ t('examen.pregunta', { n: indice + 1 }) }}</h3>
          <p class="mb-8 text-lg text-slate-700">{{ pregunta.texto }}</p>
          <div class="space-y-3">
            <label
              v-for="opcion in pregunta.opciones"
              :key="opcion.opcionId"
              class="group flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition"
              :class="respuestas[pregunta.preguntaId] === opcion.opcionId ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'"
            >
              <input v-model="respuestas[pregunta.preguntaId]" type="radio" :name="pregunta.preguntaId" :value="opcion.opcionId" class="h-5 w-5 text-slate-900" />
              <span class="font-medium text-slate-700 group-hover:text-slate-900">
                {{ pregunta.tipo === 'vf' ? t(`examen.${opcion.opcionId}`) : opcion.texto }}
              </span>
            </label>
          </div>
        </fieldset>

        <div class="flex items-center justify-between">
          <button class="boton-secundario" :class="indice === 0 ? 'invisible' : ''" @click="indice--">&larr; {{ t('examen.anterior') }}</button>
          <button v-if="indice < examen.preguntas.length - 1" class="boton-oscuro px-8" :disabled="!respuestas[pregunta.preguntaId]" @click="indice++">
            {{ t('examen.siguiente') }} &rarr;
          </button>
          <button v-else class="boton-primario px-8 shadow-md" :disabled="!respuestas[pregunta.preguntaId] || enviando" @click="finalizar">
            {{ t('examen.finalizar') }} ✓
          </button>
        </div>
      </div>

      <!-- 3. Resultado -->
      <div v-else-if="fase === 'resultado' && resultado" class="relative flex flex-col items-center gap-6 overflow-hidden py-6 text-center">
        <span
          v-for="punto in PUNTOS"
          :key="punto.id"
          class="punto absolute rounded-full"
          :style="{ width: `${punto.tamano}px`, height: `${punto.tamano}px`, top: `${punto.arriba}%`, left: `${punto.izquierda}%`, backgroundColor: punto.color, animationDelay: `${punto.retraso}s` }"
        />
        <div class="relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-lg" :class="resultado.aprobado ? 'bg-yellow-400' : 'bg-red-400'">
          <Trophy class="h-12 w-12 text-white" />
        </div>
        <div class="relative z-10">
          <h1 class="text-4xl font-extrabold" :class="resultado.aprobado ? 'text-blue-700' : 'text-red-600'">
            {{ resultado.aprobado ? t('examen.felicidades') : t('examen.vuelveAIntentarlo') }}
          </h1>
          <p class="mt-2 text-gray-600">
            {{ resultado.aprobado ? t('examen.hasCompletado') : t('examen.noCompletaste') }} <strong>{{ examen.titulo }}</strong>
          </p>
        </div>

        <div v-if="!resultado.aprobado" class="relative z-10 w-full">
          <div v-if="resultado.intentosRestantes > 0" class="flex items-start gap-3 rounded-r-xl border-l-4 border-orange-500 bg-orange-100 p-4 text-left text-orange-800 shadow-sm">
            <span class="text-xl">⚠️</span>
            <div>
              <p class="font-bold">{{ t('examen.quedanIntentos', { n: resultado.intentosRestantes }, resultado.intentosRestantes) }}</p>
              <p class="mt-0.5 text-xs text-orange-700">{{ t('examen.repasa') }}</p>
            </div>
          </div>
          <div v-else class="flex items-start gap-3 rounded-r-xl border-l-4 border-red-500 bg-red-100 p-4 text-left text-red-800 shadow-sm">
            <span class="text-xl">⛔</span>
            <div>
              <p class="font-bold">{{ t('examen.sinIntentos') }}</p>
              <p class="mt-0.5 text-xs text-red-700">{{ t('examen.hablaConProfesor') }}</p>
            </div>
          </div>
        </div>

        <div class="relative z-10 flex flex-wrap justify-center gap-3">
          <span class="flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
            <CheckCircle class="h-4 w-4" /> {{ t('examen.nota', { n: resultado.porcentaje }) }} ({{ resultado.correctas }}/{{ resultado.total }})
          </span>
          <span v-if="resultado.aprobado" class="flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700">
            <Award class="h-4 w-4" /> +{{ XP_POR_EXAMEN }} XP
          </span>
        </div>

        <div v-if="resultado.aprobado" class="relative z-10 flex w-full items-center gap-4 rounded-2xl border-2 border-yellow-400 bg-blue-900 p-5 text-left shadow-lg">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-yellow-400 bg-blue-800">
            <Trophy class="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <p class="mb-0.5 text-xs font-bold uppercase tracking-widest text-yellow-400">{{ t('examen.certificadoFinalizacion') }}</p>
            <p class="font-bold leading-tight text-white">{{ examen.titulo }}</p>
            <p class="mt-0.5 text-sm text-blue-300">{{ t('examen.otorgadoA', { nombre: sesion.perfil?.nombre, fecha: fechaLarga(new Date(), locale) }) }}</p>
          </div>
        </div>

        <div class="relative z-10 flex w-full flex-wrap justify-center gap-3">
          <button v-if="resultado.aprobado" class="boton-primario flex items-center gap-2" @click="abrirCertificado">
            <Share2 class="h-5 w-5" /> {{ t('examen.verCertificado') }}
          </button>
          <RouterLink :to="`/cursos/${cursoId}`" class="boton-oscuro">{{ t('examen.volverCurso') }}</RouterLink>
        </div>
      </div>
    </div>
  </EstadoCarga>
</template>

<script setup lang="ts">
import { Award, CheckCircle, Share2, Trophy } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { rendirExamen, verCertificado, verExamen } from '../../api/alumco';
import type { ResultadoRendicion } from '../../api/tipos';
import { avisarError } from '../../avisos';
import { useCarga } from '../../carga';
import BarraProgreso from '../../componentes/BarraProgreso.vue';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import { fechaLarga } from '../../formatos';
import { sesion } from '../../sesion';

/** Igual que XP_POR_EXAMEN en backend/src/dominio/gamificacion.ts. */
const XP_POR_EXAMEN = 200;

const props = defineProps<{ cursoId: string }>();
const { t, locale } = useI18n();
const router = useRouter();
const { datos: examen, cargando, error, recargar } = useCarga(() => verExamen(props.cursoId));

const fase = ref<'advertencia' | 'examen' | 'resultado'>('advertencia');
const indice = ref(0);
const respuestas = reactive<Record<string, string>>({});
const resultado = ref<ResultadoRendicion | null>(null);
const enviando = ref(false);
/** Clave de idempotencia: una por apertura del examen. */
const intentoId = crypto.randomUUID();

const pregunta = computed(() => examen.value?.preguntas[indice.value]);
const avance = computed(() => (examen.value?.preguntas.length ? Math.round(((indice.value + 1) / examen.value.preguntas.length) * 100) : 0));

onBeforeRouteLeave(() => {
  if (fase.value === 'examen' && !confirm(t('examen.confirmarSalir'))) return false;
  return true;
});

function salir(): void {
  void router.push(`/cursos/${props.cursoId}`);
}

async function finalizar(): Promise<void> {
  if (!examen.value || !confirm(t('examen.confirmarEnvio'))) return;
  enviando.value = true;
  try {
    resultado.value = await rendirExamen(props.cursoId, {
      intentoId,
      respuestas: Object.entries(respuestas).map(([preguntaId, respuesta]) => ({ preguntaId, respuesta })),
    });
    fase.value = 'resultado';
  } catch (e) {
    avisarError(e);
  } finally {
    enviando.value = false;
  }
}

async function abrirCertificado(): Promise<void> {
  try {
    const { url } = await verCertificado(props.cursoId);
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    avisarError(e);
  }
}

const COLORES = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];
const PUNTOS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  tamano: Math.random() * 10 + 8,
  arriba: Math.random() * 90,
  izquierda: Math.random() * 95,
  color: COLORES[i % COLORES.length],
  retraso: (Math.random() * 2).toFixed(2),
}));
</script>

<style scoped>
@keyframes rebote {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(18px);
    opacity: 1;
  }
}
.punto {
  animation: rebote 2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .punto {
    animation: none;
  }
}
</style>
