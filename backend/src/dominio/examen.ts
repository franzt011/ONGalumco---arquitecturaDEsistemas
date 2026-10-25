import { ReglaDeNegocioError } from './errores';

/** Igual que en Laravel: selección múltiple ('multiple') o verdadero/falso ('vf'). */
export type TipoPregunta = 'multiple' | 'vf';

export interface DatosOpcion {
  opcionId: string;
  texto: string;
  esCorrecta: boolean;
}

export interface DatosPregunta {
  preguntaId: string;
  tipo: TipoPregunta;
  texto: string;
  /** Solo en 'multiple'. */
  opciones?: DatosOpcion[];
  /** Solo en 'vf': true = la afirmación es verdadera. */
  respuestaVf?: boolean;
}

/**
 * Respuesta del alumno a una pregunta.
 * - 'multiple': el id de la opción elegida.
 * - 'vf': 'verdadero' o 'falso' (igual que enviaba el formulario de Laravel).
 */
export interface RespuestaAlumno {
  preguntaId: string;
  respuesta: string;
}

export interface ResultadoExamen {
  correctas: number;
  total: number;
  porcentaje: number;
  aprobado: boolean;
}

/** Lo que ve el alumno: sin la respuesta correcta. */
export interface PreguntaParaAlumno {
  preguntaId: string;
  tipo: TipoPregunta;
  texto: string;
  opciones: { opcionId: string; texto: string }[];
}

function invalida(detalle: string): ReglaDeNegocioError {
  return new ReglaDeNegocioError('pregunta-invalida', detalle);
}

export class Pregunta {
  readonly preguntaId: string;
  readonly tipo: TipoPregunta;
  readonly texto: string;
  readonly opciones: readonly DatosOpcion[];
  readonly respuestaVf?: boolean;

  constructor(datos: DatosPregunta) {
    if (datos.texto.trim() === '') {
      throw invalida('La pregunta necesita un enunciado.');
    }
    if (datos.tipo === 'multiple') {
      const opciones = (datos.opciones ?? []).filter(
        (o) => o.texto.trim() !== '',
      );
      if (opciones.length < 2) {
        throw invalida(
          'Una pregunta de selección múltiple necesita al menos 2 opciones.',
        );
      }
      if (opciones.filter((o) => o.esCorrecta).length !== 1) {
        throw invalida(
          'Una pregunta de selección múltiple necesita exactamente 1 opción correcta.',
        );
      }
      this.opciones = opciones.map((o) => ({ ...o }));
    } else if (datos.tipo === 'vf') {
      if (typeof datos.respuestaVf !== 'boolean') {
        throw invalida(
          'Una pregunta de verdadero/falso necesita su respuesta correcta.',
        );
      }
      this.opciones = [];
      this.respuestaVf = datos.respuestaVf;
    } else {
      throw invalida(`El tipo de pregunta "${String(datos.tipo)}" no existe.`);
    }
    this.preguntaId = datos.preguntaId;
    this.tipo = datos.tipo;
    this.texto = datos.texto;
  }

  esCorrecta(respuesta: string): boolean {
    if (this.tipo === 'multiple') {
      return this.opciones.some(
        (o) => o.opcionId === respuesta && o.esCorrecta,
      );
    }
    return (respuesta === 'verdadero') === this.respuestaVf;
  }

  /**
   * Se arma campo por campo para que la respuesta correcta nunca llegue al alumno.
   * En Laravel se enviaba preguntas.opciones completo a la vista, incluido es_correcta:
   * cualquiera podía ver las respuestas con las herramientas del navegador.
   */
  vistaAlumno(): PreguntaParaAlumno {
    return {
      preguntaId: this.preguntaId,
      tipo: this.tipo,
      texto: this.texto,
      opciones:
        this.tipo === 'multiple'
          ? this.opciones.map((o) => ({ opcionId: o.opcionId, texto: o.texto }))
          : [
              { opcionId: 'verdadero', texto: 'Verdadero' },
              { opcionId: 'falso', texto: 'Falso' },
            ],
    };
  }
}

export class Examen {
  readonly cursoId: string;
  readonly preguntas: readonly Pregunta[];

  constructor(cursoId: string, preguntas: Pregunta[]) {
    const ids = new Set(preguntas.map((p) => p.preguntaId));
    if (ids.size !== preguntas.length) {
      throw new ReglaDeNegocioError(
        'examen-invalido',
        'Hay preguntas con el mismo id.',
      );
    }
    this.cursoId = cursoId;
    this.preguntas = [...preguntas];
  }

  get cantidadPreguntas(): number {
    return this.preguntas.length;
  }

  vistaAlumno(): PreguntaParaAlumno[] {
    return this.preguntas.map((p) => p.vistaAlumno());
  }

  /**
   * Misma regla que finalizarExamen() en Laravel: una pregunta sin responder cuenta como
   * incorrecta, el porcentaje se redondea y se aprueba con porcentaje >= exigencia mínima.
   * Lo nuevo: se rechazan respuestas a preguntas que no son de este examen.
   */
  calificar(
    respuestas: RespuestaAlumno[],
    exigenciaMinima: number,
  ): ResultadoExamen {
    if (this.preguntas.length === 0) {
      throw new ReglaDeNegocioError(
        'examen-vacio',
        'El examen no tiene preguntas.',
      );
    }
    const porPregunta = new Map(
      respuestas.map((r) => [r.preguntaId, r.respuesta]),
    );
    for (const preguntaId of porPregunta.keys()) {
      if (!this.preguntas.some((p) => p.preguntaId === preguntaId)) {
        throw new ReglaDeNegocioError(
          'respuesta-invalida',
          `La pregunta ${preguntaId} no pertenece a este examen.`,
        );
      }
    }

    let correctas = 0;
    for (const pregunta of this.preguntas) {
      const respuesta = porPregunta.get(pregunta.preguntaId);
      if (respuesta !== undefined && pregunta.esCorrecta(respuesta)) {
        correctas += 1;
      }
    }
    const total = this.preguntas.length;
    const porcentaje = Math.round((correctas / total) * 100);
    return {
      correctas,
      total,
      porcentaje,
      aprobado: porcentaje >= exigenciaMinima,
    };
  }
}
