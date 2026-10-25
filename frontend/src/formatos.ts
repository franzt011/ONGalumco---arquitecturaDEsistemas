/** Utilidades de presentación. Usan Intl, así que respetan el idioma elegido (i18n). */

export function iniciales(nombre: string | undefined): string {
  return (nombre ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** "hace 2 horas" / "2 hours ago". Reemplaza a diffForHumans() de Laravel. */
export function fechaRelativa(iso: string, idioma: string): string {
  const segundos = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const formato = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto' });
  const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unidad, tamano] of unidades) {
    if (Math.abs(segundos) >= tamano) {
      return formato.format(Math.round(segundos / tamano), unidad);
    }
  }
  return formato.format(segundos, 'second');
}

export function fechaLarga(fecha: Date | string, idioma: string, conDia = false): string {
  return new Date(fecha).toLocaleDateString(idioma, {
    ...(conDia ? { weekday: 'long' } : {}),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function fechaCorta(fecha: string, idioma: string): string {
  return new Date(fecha).toLocaleDateString(idioma, { day: 'numeric', month: 'short' });
}

export function numero(valor: number, idioma: string): string {
  return valor.toLocaleString(idioma);
}
