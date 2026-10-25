import { identidadDesdeApiGateway } from './autenticacion';

describe('identidadDesdeApiGateway', () => {
  it('lee sub y email de los claims de Cognito (API REST)', () => {
    const encabezado = JSON.stringify({
      authorizer: { claims: { sub: 'abc', email: 'ana@a.cl' } },
    });
    expect(identidadDesdeApiGateway(encabezado)).toEqual({
      usuarioId: 'abc',
      correo: 'ana@a.cl',
    });
  });

  it('también acepta el formato de API HTTP (authorizer.jwt.claims)', () => {
    const encabezado = JSON.stringify({
      authorizer: { jwt: { claims: { sub: 'xyz' } } },
    });
    expect(identidadDesdeApiGateway(encabezado)?.usuarioId).toBe('xyz');
  });

  it('devuelve null si falta el encabezado, el JSON es inválido o no hay sub', () => {
    expect(identidadDesdeApiGateway(undefined)).toBeNull();
    expect(identidadDesdeApiGateway('{no es json')).toBeNull();
    expect(
      identidadDesdeApiGateway(JSON.stringify({ authorizer: { claims: {} } })),
    ).toBeNull();
  });
});
