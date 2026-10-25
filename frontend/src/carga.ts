/** Estado de carga de una página: cargando, error o datos. Evita repetir el mismo try/catch. */
import { ref, type Ref } from 'vue';
import { textoDeError } from './avisos';

export function useCarga<T>(cargar: () => Promise<T>) {
  const datos = ref<T | null>(null) as Ref<T | null>;
  const cargando = ref(true);
  const error = ref<string | null>(null);

  async function recargar(): Promise<void> {
    cargando.value = true;
    error.value = null;
    try {
      datos.value = await cargar();
    } catch (e) {
      error.value = textoDeError(e);
    } finally {
      cargando.value = false;
    }
  }

  void recargar();
  return { datos, cargando, error, recargar };
}
