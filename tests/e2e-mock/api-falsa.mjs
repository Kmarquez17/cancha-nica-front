// API falsa para el E2E sin backend: solo responde la sesión del admin y su configuración. Los endpoints de las
// Fases 2 y 3 (categorías, ligas, mesas, clubes, delegados, equipos, portal del delegado) los simula MSW en el
// navegador. El rol sale del valor de la cookie `at_admin`: termina en `-admin` => ADMIN; si no, OWNER.
import http from 'node:http';

const org = { id: 'org-1', nombre: 'Liga SOPA', slug: 'sopa' };
const puerto = Number(process.env.PUERTO_API_FALSA ?? 3999);

http
  .createServer((req, res) => {
    const json = (status, cuerpo) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(cuerpo));
    };
    const cookie = /(?:^|;\s*)at_admin=([^;]*)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
    const esAdmin = cookie.endsWith('-admin');
    if (req.url.startsWith('/admin/me'))
      return json(200, {
        id: esAdmin ? 'u2' : 'u1',
        nombre: esAdmin ? 'Ana Admin' : 'Kevin Dueño',
        email: esAdmin ? 'admin@sopa.test' : 'dueno@sopa.test',
        role: esAdmin ? 'ADMIN' : 'OWNER',
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
