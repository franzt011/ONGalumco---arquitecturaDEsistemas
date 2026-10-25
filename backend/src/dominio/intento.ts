import { ReglaDeNegocioError } from './errores';
import { ResultadoExamen } from './examen';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DatosIntento {
  /**
   * Lo genera el frontend al abrir el examen. Si la respuesta se pierde (timeout) y el
   * navegador reintenta, llega el mismo id y no se cobra un segundo intento (idempotencia).
   */
  intentoId: string;
  alumnoId: string;
  cursoId: string;
  numeroIntento: number;
  fecha: string;
  resultado: ResultadoExamen;
}

/** Historial de un examen rendido (tabla intentos_examen de Laravel). No cambia después de crearse. */
export class Intento {
  readonly intentoId: string;
  readonly alumnoId: string;
  readonly cursoId: string;
  readonly numeroIntento: number;
  readonly fecha: string;
  readonly correctas: number;
  readonly total: number;
  readonly porcentaje: number;
  readonly aprobado: boolean;

  constructor(datos: DatosIntento) {
    if (!UUID.test(datos.intentoId)) {
      throw new ReglaDeNegocioError(
        'intento-invalido',
        'El intentoId debe ser un UUID.',
      );
    }
    this.intentoId = datos.intentoId;
    this.alumnoId = datos.alumnoId;
    this.cursoId = datos.cursoId;
    this.numeroIntento = datos.numeroIntento;
    this.fecha = datos.fecha;
    this.correctas = datos.resultado.correctas;
    this.total = datos.resultado.total;
    this.porcentaje = datos.resultado.porcentaje;
    this.aprobado = datos.resultado.aprobado;
  }

  get resultado(): ResultadoExamen {
    return {
      correctas: this.correctas,
      total: this.total,
      porcentaje: this.porcentaje,
      aprobado: this.aprobado,
    };
  }
}
