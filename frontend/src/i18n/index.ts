/**
 * Internacionalización (lo pide el proyecto del ramo). Todos los textos de la interfaz
 * están en es.json y en.json; los errores de la API se traducen por su 'codigo'.
 * Para agregar un idioma: crea pt.json con las mismas claves y súmalo aquí.
 */
import { createI18n } from 'vue-i18n';
import en from './en.json';
import es from './es.json';

export type Idioma = 'es' | 'en';
const CLAVE = 'alumco.idioma';

function idiomaInicial(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'es' || guardado === 'en') return guardado;
  } catch {
    // sin localStorage: se usa el idioma del navegador
  }
  return navigator.language.startsWith('en') ? 'en' : 'es';
}

export const i18n = createI18n({
  legacy: false,
  locale: idiomaInicial(),
  fallbackLocale: 'es',
  messages: { es, en },
});

export function cambiarIdioma(idioma: Idioma): void {
  i18n.global.locale.value = idioma;
  document.documentElement.lang = idioma;
  try {
    localStorage.setItem(CLAVE, idioma);
  } catch {
    // no se recuerda entre visitas, pero funciona
  }
}

document.documentElement.lang = i18n.global.locale.value;
