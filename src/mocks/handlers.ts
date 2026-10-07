import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/ping', () => HttpResponse.json({ ok: true, serverNow: new Date().toISOString() })),
  // Ejemplo de error problem+json (cámbialo por /api/... reales según el snapshot).
  http.get('/api/_mock/error', () =>
    HttpResponse.json(
      {
        status: 409,
        code: 'ROSTER_FULL',
        title: 'Plantilla completa',
        detail: 'El equipo alcanzó el máximo de jugadores.',
        requestId: 'req_mock_123',
      },
      { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
    ),
  ),
];
