<!--
  Editor de curso (Profesor/Cursos/Edit.vue + Create.vue). Cambio de diseño: antes un solo
  botón "Guardar" mandaba TODO (curso, módulos, archivos y preguntas) y el backend borraba y
  recreaba las preguntas. Ahora cada pestaña guarda lo suyo con su propio endpoint.
-->
<template>
  <EstadoCarga :cargando="cargando" :error="error" @reintentar="recargar">
    <div v-if="detalle" class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-wrap items-center gap-4">
        <RouterLink to="/gestion/cursos" class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          &larr; {{ t('app.volver') }}
        </RouterLink>
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-slate-800">{{ detalle.curso.titulo }}</h2>
          <p class="text-sm text-slate-500">
            <span class="font-semibold" :class="detalle.curso.estado === 'publicado' ? 'text-emerald-600' : 'text-amber-600'">{{ t(`estados.${detalle.curso.estado}`) }}</span>
            · {{ t('gestion.inscritos', { n: detalle.inscritos }, detalle.inscritos) }}
          </p>
        </div>
        <button v-if="detalle.curso.estado === 'borrador'" class="boton-oscuro" :disabled="ocupado" @click="cambiarEstado('publicar')">{{ t('gestion.publicar') }}</button>
        <button v-else class="boton-secundario" :disabled="ocupado" @click="cambiarEstado('despublicar')">{{ t('gestion.despublicar') }}</button>
      </div>

      <div class="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          v-for="pestana in (['informacion', 'modulos', 'examen'] as const)"
          :key="pestana"
          class="flex-1 rounded-lg px-4 py-2.5 text-sm transition"
          :class="pestanaActiva === pestana ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="pestanaActiva = pestana"
        >
          {{ t(`gestion.pestanas.${pestana}`) }}
        </button>
      </div>

      <!-- Información general -->
      <form v-show="pestanaActiva === 'informacion'" class="tarjeta space-y-6 p-8" @submit.prevent="guardarInformacion">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700" for="titulo">{{ t('gestion.titulo') }}</label>
          <input id="titulo" v-model="info.titulo" required maxlength="150" class="campo" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700" for="descripcion">{{ t('gestion.descripcionCurso') }}</label>
          <textarea id="descripcion" v-model="info.descripcion" rows="4" maxlength="5000" class="campo" />
        </div>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700" for="exigencia">{{ t('gestion.exigencia') }}</label>
            <input id="exigencia" v-model.number="info.exigenciaMinima" type="number" min="1" max="100" class="campo" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700" for="intentos">{{ t('gestion.intentos') }}</label>
            <input id="intentos" v-model.number="info.maxIntentos" type="number" min="1" max="10" class="campo" />
          </div>
          <div>
            <p class="mb-2 text-sm font-medium text-slate-700">{{ t('gestion.portada') }}</p>
            <div class="mb-3 h-36 overflow-hidden rounded-xl border border-slate-200"><Portada :clave="detalle.curso.imagenPortada" :alt="detalle.curso.titulo" /></div>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" class="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white" @change="subir('portada', $event)" />
            <p class="mt-1 text-xs text-slate-400">{{ t('gestion.formatoPortada') }}</p>
          </div>
          <div>
            <p class="mb-2 text-sm font-medium text-slate-700">{{ t('gestion.certificado') }}</p>
            <p class="mb-3 rounded-lg px-4 py-2 text-sm" :class="detalle.curso.tieneCertificado ? 'border border-green-200 bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'">
              {{ detalle.curso.tieneCertificado ? t('gestion.certificadoSubido') : t('gestion.sinCertificado') }}
            </p>
            <input type="file" accept=".pdf" class="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white" @change="subir('certificado', $event)" />
            <p class="mt-1 text-xs text-slate-400">{{ t('gestion.formatoCertificado') }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-slate-200 pt-6">
          <button type="button" class="rounded-lg px-4 py-2 font-medium text-red-600 hover:bg-red-50" @click="eliminar">🗑️ {{ t('gestion.eliminar') }}</button>
          <button class="boton-oscuro" :disabled="ocupado">{{ t('app.guardar') }}</button>
        </div>
      </form>

      <!-- Módulos -->
      <div v-show="pestanaActiva === 'modulos'" class="space-y-6">
        <EditorModulo
          v-for="(modulo, indice) in detalle.curso.modulos"
          :key="modulo.moduloId"
          :numero="indice + 1"
          :modulo="modulo"
          :ocupado="ocupado"
          @guardar="(datos) => guardarModulo(datos, modulo.moduloId)"
          @eliminar="borrarModulo(modulo.moduloId)"
        />
        <EditorModulo v-if="agregandoModulo" :numero="detalle.curso.modulos.length + 1" :ocupado="ocupado" @guardar="(datos) => guardarModulo(datos)" @cancelar="agregandoModulo = false" />
        <button v-else class="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 font-medium text-slate-600 hover:bg-white" @click="agregandoModulo = true">
          + {{ t('gestion.agregarModulo') }}
        </button>
      </div>

      <!-- Examen -->
      <div v-show="pestanaActiva === 'examen'">
        <EditorExamen :preguntas="detalle.preguntas" :ocupado="ocupado" @guardar="guardarPreguntas" />
      </div>
    </div>
  </EstadoCarga>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  actualizarCurso,
  agregarModulo,
  type DatosModulo,
  despublicarCurso,
  eliminarCurso,
  eliminarModulo,
  guardarExamen,
  publicarCurso,
  reemplazarModulo,
  verCursoGestion,
} from '../../api/alumco';
import type { PreguntaProfesor } from '../../api/tipos';
import { subirArchivo } from '../../archivos';
import { avisar, avisarError } from '../../avisos';
import { useCarga } from '../../carga';
import EstadoCarga from '../../componentes/EstadoCarga.vue';
import Portada from '../../componentes/Portada.vue';
import EditorExamen from './EditorExamen.vue';
import EditorModulo from './EditorModulo.vue';

const props = defineProps<{ cursoId: string }>();
const { t } = useI18n();
const router = useRouter();
const { datos: detalle, cargando, error, recargar } = useCarga(() => verCursoGestion(props.cursoId));

const pestanaActiva = ref<'informacion' | 'modulos' | 'examen'>('informacion');
const ocupado = ref(false);
const agregandoModulo = ref(false);
const info = reactive({ titulo: '', descripcion: '', exigenciaMinima: 60, maxIntentos: 2 });

watch(detalle, (d) => {
  if (d) Object.assign(info, { titulo: d.curso.titulo, descripcion: d.curso.descripcion, exigenciaMinima: d.curso.exigenciaMinima, maxIntentos: d.curso.maxIntentos });
});

/** Ejecuta una acción, avisa el resultado y recarga el curso desde la API. */
async function hacer(accion: () => Promise<unknown>, mensaje: string): Promise<boolean> {
  ocupado.value = true;
  try {
    await accion();
    avisar(t(mensaje));
    await recargar();
    return true;
  } catch (e) {
    avisarError(e);
    return false;
  } finally {
    ocupado.value = false;
  }
}

const guardarInformacion = () => hacer(() => actualizarCurso(props.cursoId, { ...info }), 'gestion.guardado');

async function subir(tipo: 'portada' | 'certificado', evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  if (!archivo) return;
  await hacer(async () => {
    const clave = await subirArchivo(tipo, archivo);
    await actualizarCurso(props.cursoId, tipo === 'portada' ? { imagenPortada: clave } : { archivoCertificado: clave });
  }, 'gestion.archivoSubido');
  entrada.value = '';
}

async function guardarModulo(datos: DatosModulo, moduloId?: string): Promise<void> {
  const ok = await hacer(() => (moduloId ? reemplazarModulo(props.cursoId, moduloId, datos) : agregarModulo(props.cursoId, datos)), 'gestion.moduloGuardado');
  if (ok && !moduloId) agregandoModulo.value = false;
}

function borrarModulo(moduloId: string): void {
  if (confirm(t('gestion.confirmarEliminarModulo'))) void hacer(() => eliminarModulo(props.cursoId, moduloId), 'gestion.moduloEliminado');
}

const guardarPreguntas = (preguntas: PreguntaProfesor[]) => hacer(() => guardarExamen(props.cursoId, preguntas), 'gestion.examenGuardado');

const cambiarEstado = (accion: 'publicar' | 'despublicar') =>
  hacer(() => (accion === 'publicar' ? publicarCurso(props.cursoId) : despublicarCurso(props.cursoId)), accion === 'publicar' ? 'gestion.publicado' : 'gestion.despublicado');

async function eliminar(): Promise<void> {
  if (!confirm(t('gestion.confirmarEliminar'))) return;
  try {
    await eliminarCurso(props.cursoId);
    avisar(t('gestion.eliminado'));
    await router.push('/gestion/cursos');
  } catch (e) {
    avisarError(e);
  }
}
</script>
