/**
 * Revisa la internacionalización:
 * 1) es.json y en.json tienen exactamente las mismas claves (salvo 'errores', que solo se traduce a inglés).
 * 2) Toda clave fija usada como t('...') en el código existe en los dos idiomas.
 * Uso: npm run revisar-i18n (también corre en la CI).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const es = JSON.parse(readFileSync('src/i18n/es.json', 'utf8'));
const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8'));

function claves(objeto, prefijo = '') {
  return Object.entries(objeto).flatMap(([k, v]) =>
    typeof v === 'object' ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`],
  );
}

const sinErrores = (lista) => lista.filter((c) => !c.startsWith('errores.'));
const clavesEs = new Set(sinErrores(claves(es)));
const clavesEn = new Set(sinErrores(claves(en)));
const problemas = [];
for (const c of clavesEs) if (!clavesEn.has(c)) problemas.push(`Falta en en.json: ${c}`);
for (const c of clavesEn) if (!clavesEs.has(c)) problemas.push(`Falta en es.json: ${c}`);

function archivos(dir) {
  return readdirSync(dir).flatMap((f) => {
    const ruta = join(dir, f);
    return statSync(ruta).isDirectory() ? archivos(ruta) : /\.(vue|ts)$/.test(f) ? [ruta] : [];
  });
}

const usadas = new Set();
for (const archivo of archivos('src')) {
  const texto = readFileSync(archivo, 'utf8');
  for (const [, clave] of texto.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) usadas.add(clave);
  for (const [, clave] of texto.matchAll(/(?:texto|etiqueta|titulo): '([a-z]+\.[a-zA-Z_.]+)'/g)) usadas.add(clave);
  for (const [, clave] of texto.matchAll(/'(gestion\.[a-zA-Z]+)'/g)) usadas.add(clave);
}
for (const c of usadas) {
  if (!clavesEs.has(c)) problemas.push(`Clave usada en el código pero no definida: ${c}`);
}

if (problemas.length) {
  console.error(problemas.join('\n'));
  process.exit(1);
}
console.log(`i18n OK: ${clavesEs.size} textos en es y en, ${usadas.size} claves fijas usadas en el código.`);
