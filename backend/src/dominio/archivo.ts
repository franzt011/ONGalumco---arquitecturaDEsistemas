import { ReglaDeNegocioError } from './errores';

/**
 * Tipos de archivo que se suben a S3. En Laravel se guardaban en storage/app/public
 * sin validar el tipo ni el tamaño; aquí cada tipo tiene sus reglas.
 */
export type TipoArchivo = 'material' | 'portada' | 'certificado';

const MB = 1024 * 1024;

const REGLAS: Record<
  TipoArchivo,
  { extensiones: string[]; maximoBytes: number }
> = {
  material: {
    extensiones: ['pdf', 'ppt', 'pptx', 'doc', 'docx'],
    maximoBytes: 50 * MB,
  },
  portada: { extensiones: ['jpg', 'jpeg', 'png', 'webp'], maximoBytes: 5 * MB },
  certificado: { extensiones: ['pdf'], maximoBytes: 10 * MB },
};

export interface ArchivoAdjunto {
  /** Clave del archivo en el almacenamiento (S3). */
  clave: string;
  /** Nombre original, para mostrarlo al alumno. */
  nombre: string;
}

export function extensionDe(nombre: string): string {
  const partes = nombre.split('.');
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : '';
}

/** Revisa extensión y tamaño antes de entregar una URL de subida. */
export function exigirArchivoPermitido(
  tipo: TipoArchivo,
  nombre: string,
  tamanoBytes: number,
): void {
  const regla = REGLAS[tipo];
  if (!regla.extensiones.includes(extensionDe(nombre))) {
    throw new ReglaDeNegocioError(
      'archivo-no-permitido',
      `Para ${tipo} solo se aceptan: ${regla.extensiones.join(', ')}.`,
    );
  }
  if (!(tamanoBytes > 0)) {
    throw new ReglaDeNegocioError(
      'archivo-no-permitido',
      'El archivo está vacío.',
    );
  }
  if (tamanoBytes > regla.maximoBytes) {
    throw new ReglaDeNegocioError(
      'archivo-no-permitido',
      `El archivo supera los ${regla.maximoBytes / MB} MB permitidos.`,
    );
  }
}
