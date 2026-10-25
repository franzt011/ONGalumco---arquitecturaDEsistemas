/**
 * Gamificación (GamificacionService.php en Laravel), ahora como funciones puras:
 * reciben números y devuelven números. No consultan la base de datos, así se prueban en milisegundos.
 */

export const XP_POR_MODULO = 100;
export const XP_POR_EXAMEN = 200;
export const XP_POR_NIVEL = 1000;

export interface Actividad {
  modulosCompletados: number;
  examenesAprobados: number;
  cursosCompletados: number;
  rachaDias: number;
}

interface DefinicionLogro {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  /**
   * En Laravel la condición era un texto ('racha_dias >= 3') que se interpretaba con una regex.
   * Una función es más segura: si alguien escribe mal el nombre del campo, no compila.
   */
  condicion: (a: Actividad & { nivel: number }) => boolean;
}

const LOGROS: readonly DefinicionLogro[] = [
  {
    id: 'primer_modulo',
    nombre: 'Primer Paso',
    descripcion: 'Completa tu primer módulo',
    icono: 'Zap',
    color: 'yellow',
    condicion: (a) => a.modulosCompletados >= 1,
  },
  {
    id: 'en_racha',
    nombre: 'En Racha',
    descripcion: '3 días de racha',
    icono: 'Flame',
    color: 'orange',
    condicion: (a) => a.rachaDias >= 3,
  },
  {
    id: 'curioso',
    nombre: 'Curioso',
    descripcion: 'Completa 5 módulos',
    icono: 'BookOpen',
    color: 'purple',
    condicion: (a) => a.modulosCompletados >= 5,
  },
  {
    id: 'campeon',
    nombre: 'Campeón',
    descripcion: 'Aprueba tu primer examen',
    icono: 'Trophy',
    color: 'amber',
    condicion: (a) => a.examenesAprobados >= 1,
  },
  {
    id: 'diamante',
    nombre: 'Diamante',
    descripcion: 'Alcanza el nivel 5',
    icono: 'Diamond',
    color: 'cyan',
    condicion: (a) => a.nivel >= 5,
  },
  {
    id: 'global',
    nombre: 'Global',
    descripcion: 'Completa 3 cursos',
    icono: 'Globe',
    color: 'green',
    condicion: (a) => a.cursosCompletados >= 3,
  },
];

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  desbloqueado: boolean;
}

export interface EstadoGamificacion extends Actividad {
  xpTotal: number;
  xpEnNivel: number;
  xpParaSiguiente: number;
  nivel: number;
  logros: Logro[];
  logrosDesbloqueados: number;
  logrosTotal: number;
}

export function calcularXp(
  actividad: Pick<Actividad, 'modulosCompletados' | 'examenesAprobados'>,
): number {
  return (
    actividad.modulosCompletados * XP_POR_MODULO +
    actividad.examenesAprobados * XP_POR_EXAMEN
  );
}

export function calcularGamificacion(actividad: Actividad): EstadoGamificacion {
  const xpTotal = calcularXp(actividad);
  const nivel = Math.floor(xpTotal / XP_POR_NIVEL) + 1;
  const logros = LOGROS.map(({ condicion, ...logro }) => ({
    ...logro,
    desbloqueado: condicion({ ...actividad, nivel }),
  }));
  return {
    ...actividad,
    xpTotal,
    xpEnNivel: xpTotal % XP_POR_NIVEL,
    xpParaSiguiente: XP_POR_NIVEL,
    nivel,
    logros,
    logrosDesbloqueados: logros.filter((l) => l.desbloqueado).length,
    logrosTotal: LOGROS.length,
  };
}

export interface ParticipanteRanking {
  usuarioId: string;
  nombre: string;
  sede: string;
  rachaDias: number;
  xp: number;
}

export interface PosicionRanking extends ParticipanteRanking {
  posicion: number;
  esYo: boolean;
}

/** Ordena de mayor a menor XP; con empate, gana la racha más larga y luego el nombre. */
export function ordenarRanking(
  participantes: ParticipanteRanking[],
  yoId: string,
): PosicionRanking[] {
  return [...participantes]
    .sort(
      (a, b) =>
        b.xp - a.xp ||
        b.rachaDias - a.rachaDias ||
        a.nombre.localeCompare(b.nombre),
    )
    .map((p, i) => ({ ...p, posicion: i + 1, esYo: p.usuarioId === yoId }));
}
