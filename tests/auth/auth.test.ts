/**
 * Testes do núcleo de autenticação (lib/auth.ts).
 *
 * Substitui tests/auth/auth-validation.test.ts, que continha 12 casos
 * placeholder (`expect(true).toBe(true)`) testando componentes React
 * (AuthGuard/AuthProvider) com token em localStorage — modelo de sessão já
 * substituído por cookie httpOnly (ver SECURITY.md). Este arquivo testa o
 * que hoje protege de fato o acesso: hashing de senha, emissão/verificação
 * de JWT e extração do token da requisição (cookie httpOnly como caminho
 * principal, header Bearer como alternativa).
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-jest-only';

import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getTokenFromRequest,
  authCookieOptions,
  toAuthUser,
  AUTH_COOKIE_NAME,
} from '@/lib/auth';

describe('lib/auth — hashing de senha', () => {
  test('hashPassword nunca retorna a senha em texto plano', async () => {
    const hash = await hashPassword('minhaSenha123');
    expect(hash).not.toBe('minhaSenha123');
    expect(hash.length).toBeGreaterThan(20);
  });

  test('verifyPassword aceita a senha correta', async () => {
    const hash = await hashPassword('minhaSenha123');
    await expect(verifyPassword('minhaSenha123', hash)).resolves.toBe(true);
  });

  test('verifyPassword rejeita senha incorreta', async () => {
    const hash = await hashPassword('minhaSenha123');
    await expect(verifyPassword('senhaErrada', hash)).resolves.toBe(false);
  });

  test('duas senhas iguais geram hashes diferentes (salt aleatório)', async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword('mesmaSenha'),
      hashPassword('mesmaSenha'),
    ]);
    expect(hashA).not.toBe(hashB);
  });
});

describe('lib/auth — JWT', () => {
  test('signToken produz um token que verifyToken consegue decodificar de volta', () => {
    const token = signToken({ sub: 'user-1', email: 'a@b.com', role: 'Cliente' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('a@b.com');
    expect(payload.role).toBe('Cliente');
  });

  test('verifyToken rejeita um token assinado com outro segredo', () => {
    const forged = jwt.sign({ sub: 'attacker', role: 'Administrador' }, 'segredo-errado');
    expect(() => verifyToken(forged)).toThrow();
  });

  test('verifyToken rejeita um token malformado', () => {
    expect(() => verifyToken('isto-nao-e-um-jwt')).toThrow();
  });

  test('signToken expira em 30 dias', () => {
    const token = signToken({ sub: 'user-1' });
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    const diffDays = (decoded.exp! - decoded.iat!) / (60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });
});

describe('lib/auth — extração do token da requisição', () => {
  test('prioriza o header Authorization: Bearer quando presente', () => {
    const req = new Request('http://localhost/api/x', {
      headers: {
        authorization: 'Bearer token-do-header',
        cookie: `${AUTH_COOKIE_NAME}=token-do-cookie`,
      },
    });
    expect(getTokenFromRequest(req)).toBe('token-do-header');
  });

  test('usa o cookie httpOnly quando não há header Authorization (caminho principal da sessão web)', () => {
    const req = new Request('http://localhost/api/x', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=token-do-cookie` },
    });
    expect(getTokenFromRequest(req)).toBe('token-do-cookie');
  });

  test('retorna null quando não há token em nenhum dos dois lugares', () => {
    const req = new Request('http://localhost/api/x');
    expect(getTokenFromRequest(req)).toBeNull();
  });

  test('decodifica corretamente um valor de cookie URL-encoded', () => {
    const req = new Request('http://localhost/api/x', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent('a.b.c+d/e')}` },
    });
    expect(getTokenFromRequest(req)).toBe('a.b.c+d/e');
  });
});

describe('lib/auth — opções do cookie de sessão', () => {
  test('cookie é sempre httpOnly (mitiga roubo de token via XSS)', () => {
    expect(authCookieOptions().httpOnly).toBe(true);
  });

  test('cookie usa sameSite strict', () => {
    expect(authCookieOptions().sameSite).toBe('strict');
  });

  test('secure é controlado por COOKIE_SECURE, não hardcoded', () => {
    const original = process.env.COOKIE_SECURE;
    process.env.COOKIE_SECURE = 'true';
    expect(authCookieOptions().secure).toBe(true);
    process.env.COOKIE_SECURE = 'false';
    expect(authCookieOptions().secure).toBe(false);
    process.env.COOKIE_SECURE = original;
  });
});

describe('lib/auth — toAuthUser', () => {
  test('nunca inclui o hash de senha no objeto retornado ao cliente', () => {
    const fakeUser = {
      id: 'u1',
      name: 'Fulano',
      email: 'fulano@teste.com',
      role: 'Cliente',
      plan: 'Free',
      status: 'Ativo',
      credits: 3,
      avatar: null,
      createdAt: new Date('2026-01-01'),
      password: 'hash-secreto-nao-deveria-vazar',
    } as any;

    const authUser = toAuthUser(fakeUser);
    expect(authUser).not.toHaveProperty('password');
    expect(authUser.id).toBe('u1');
    expect(authUser.email).toBe('fulano@teste.com');
  });
});
