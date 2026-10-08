// API falsa para el E2E de la Fase 2: solo responde la sesión del admin y su configuración.
// Los endpoints de la Fase 2 (categorías, ligas, mesas, login de mesa) los simula MSW en el navegador.
import http from 'node:http';

const org = { id: 'org-1', nombre: 'Liga SOPA', slug: 'sopa' };
const puerto = Number(process.env.PUERTO_API_FALSA ?? 3999);

http
  .createServer((req, res) => {
    const json = (status, cuerpo) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(cuerpo));
    };
    if (req.url.startsWith('/admin/me'))
      return json(200, {
        id: 'u1',
        nombre: 'Kevin Dueño',
        email: 'dueno@sopa.test',
        role: 'OWNER',
        organizacion: org,
      });
    if (req.url.startsWith('/admin/organizacion'))
      return json(200, {
        ...org,
        colorPrimario: '#16A34A',
        moneda: 'NIO',
        pais: 'NI',
        zonaHoraria: 'America/Managua',
      });
    json(404, { status: 404, code: 'NOT_FOUND', title: 'No encontrado' });
  })
  .listen(puerto, () => console.log(`API falsa en ${puerto}`));
