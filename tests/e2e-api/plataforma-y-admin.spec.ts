import { expect, test, type Browser, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_PLATAFORMA_EMAIL;
const PASSWORD = process.env.E2E_PLATAFORMA_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'Define E2E_PLATAFORMA_EMAIL y E2E_PLATAFORMA_PASSWORD');
test.describe.configure({ mode: 'serial' });

// Excluye el anunciador de rutas de Next, que también usa role=alert.
const ALERTA = '[role="alert"]:not(#__next-route-announcer__)';
const sufijo = Date.now().toString(36);
const CLAVE_DUENO = 'clave-segura-e2e-1';

async function loginPlataforma(page: Page) {
  await page.goto('/plataforma/login');
  await page.getByLabel('Correo').fill(EMAIL!);
  await page.getByLabel('Contraseña').fill(PASSWORD!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/plataforma\/clientes$/);
}

async function crearLigaConInvitacion(page: Page, slug: string) {
  await page.goto('/plataforma/clientes/nuevo');
  await page.locator('#nombre').fill(`Liga E2E ${slug}`);
  await expect(page.locator('#slug')).toHaveValue(/^liga-e2e-/); // el slug se sugiere del nombre
  await page.locator('#slug').fill(slug);
  await page.locator('#duenoNombre').fill('Dueña de Prueba');
  await page.locator('#duenoEmail').fill(`${slug}@e2e.test`);
  await page.locator('#duenoTelefono').fill('+50588888888');
  await page.getByLabel('Enviar también la invitación por correo').uncheck();
  await page.getByRole('button', { name: 'Crear cliente e invitar al dueño' }).click();

  const dialogo = page.getByRole('dialog', { name: 'Invitación creada' });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

/** El enlace usa FRONT_URL del API; lo reapuntamos al servidor de la prueba. */
async function enlaceLocal(dialogo: ReturnType<Page['getByRole']>) {
  const enlace = await dialogo.getByLabel('Enlace de invitación').inputValue();
  const url = new URL(enlace);
  return { enlace, ruta: `${url.pathname}${url.search}`, token: url.searchParams.get('token')! };
}

async function nuevoContexto(browser: Browser) {
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  return { ctx, page: await ctx.newPage() };
}

test('rutas protegidas sin sesión redirigen al login de su portal', async ({ page }) => {
  await page.goto('/plataforma/clientes');
  await expect(page).toHaveURL(/\/plataforma\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('login de plataforma: credenciales incorrectas muestran el mensaje', async ({ page }) => {
  await page.goto('/plataforma/login');
  await page.getByLabel('Correo').fill(EMAIL!);
  await page.getByLabel('Contraseña').fill('contraseña-equivocada-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator(ALERTA)).toContainText('Correo o contraseña incorrectos');
  await expect(page).toHaveURL(/\/plataforma\/login$/);
});

test('crear cliente, invitar al dueño, aceptar, bloquear (corte inmediato) y reactivar', async ({
  page,
  browser,
}) => {
  const slug = `e2e-${sufijo}-a`;
  await loginPlataforma(page);
  const dialogo = await crearLigaConInvitacion(page, slug);

  // Copiar y WhatsApp
  await dialogo.getByRole('button', { name: 'Copiar enlace' }).click();
  await expect(dialogo.getByText('Enlace copiado al portapapeles.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '/aceptar-invitacion?token=',
  );
  await expect(dialogo.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/50588888888/,
  );

  const { ruta } = await enlaceLocal(dialogo);
  await dialogo.getByRole('button', { name: 'Cerrar' }).last().click();
  await expect(page).toHaveURL(/\/plataforma\/clientes\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Invitación pendiente')).toBeVisible();

  // El dueño acepta en su propio navegador.
  const dueno = await nuevoContexto(browser);
  await dueno.page.goto(ruta);
  await expect(dueno.page.getByLabel('Contraseña nueva')).toBeVisible();
  expect(dueno.page.url()).not.toContain('token='); // el token se quita de la URL
  await dueno.page.getByLabel('Contraseña nueva').fill(CLAVE_DUENO);
  await dueno.page.getByLabel('Repite la contraseña').fill(CLAVE_DUENO);
  await dueno.page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
  await expect(dueno.page).toHaveURL(/\/admin$/);
  await expect(dueno.page.getByRole('banner').getByText(`Liga E2E ${slug}`)).toBeVisible();
  await expect(dueno.page.getByText('Dueño', { exact: false }).first()).toBeVisible();

  // El enlace ya usado deja de servir.
  const otro = await nuevoContexto(browser);
  await otro.page.goto(ruta);
  await otro.page.getByLabel('Contraseña nueva').fill(CLAVE_DUENO);
  await otro.page.getByLabel('Repite la contraseña').fill(CLAVE_DUENO);
  await otro.page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
  await expect(otro.page.locator(ALERTA)).toContainText('ya no es válido');
  await otro.ctx.close();

  // Plataforma recarga el detalle: ya hay dueño.
  await page.reload();
  await expect(page.getByText('Dueña de Prueba')).toBeVisible();

  // Bloquear exige motivo y corta al instante.
  await page.getByRole('button', { name: 'Bloquear cliente' }).click();
  await page.getByRole('button', { name: 'Bloquear cliente' }).last().click();
  await expect(page.getByText('Explica el motivo')).toBeVisible();
  await page.getByLabel('Motivo').fill('Prueba E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear cliente' }).click();
  await expect(page.getByText('Bloqueado', { exact: true }).first()).toBeVisible();

  await dueno.page.goto('/admin');
  await expect(dueno.page).toHaveURL(/\/admin\/bloqueada$/);
  await expect(
    dueno.page.getByText(
      'La cuenta del cliente está bloqueada. Contacta al administrador de la app.',
    ),
  ).toBeVisible();

  // Reactivar: la MISMA sesión vuelve a funcionar (las cookies no se borraron).
  await page.getByRole('button', { name: 'Reactivar cliente' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar cliente' }).click();
  await expect(page.getByText('Activo', { exact: true }).first()).toBeVisible();

  await dueno.page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(dueno.page).toHaveURL(/\/admin$/);
  await expect(dueno.page.getByRole('banner').getByText(`Liga E2E ${slug}`)).toBeVisible();

  // Cerrar sesión del dueño.
  await dueno.page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(dueno.page).toHaveURL(/\/admin\/login$/);
  await dueno.ctx.close();
});

test('reenviar la invitación anula el enlace anterior', async ({ page, browser }) => {
  const slug = `e2e-${sufijo}-b`;
  await loginPlataforma(page);
  const d1 = await crearLigaConInvitacion(page, slug);
  const primero = await enlaceLocal(d1);
  await d1.getByRole('button', { name: 'Cerrar' }).last().click();

  await page.getByRole('button', { name: 'Reenviar invitación' }).click();
  await expect(page.getByLabel('Correo', { exact: true })).toHaveValue(`${slug}@e2e.test`); // prellenado
  await page.getByLabel('Enviar también por correo').uncheck();
  await page.getByRole('dialog').getByRole('button', { name: 'Reenviar invitación' }).click();

  const d2 = page.getByRole('dialog', { name: 'Invitación reenviada' });
  await expect(d2).toBeVisible();
  await expect(d2.getByText(/enlace anterior ya no funciona/i)).toBeVisible();
  const segundo = await enlaceLocal(d2);
  expect(segundo.token).not.toBe(primero.token);

  // El primero ya no sirve; el segundo sí.
  const a = await nuevoContexto(browser);
  await a.page.goto(primero.ruta);
  await a.page.getByLabel('Contraseña nueva').fill(CLAVE_DUENO);
  await a.page.getByLabel('Repite la contraseña').fill(CLAVE_DUENO);
  await a.page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
  await expect(a.page.locator(ALERTA)).toContainText('ya no es válido');
  await a.ctx.close();

  const b = await nuevoContexto(browser);
  await b.page.goto(segundo.ruta);
  await b.page.getByLabel('Contraseña nueva').fill(CLAVE_DUENO);
  await b.page.getByLabel('Repite la contraseña').fill(CLAVE_DUENO);
  await b.page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
  await expect(b.page).toHaveURL(/\/admin$/);
  await b.ctx.close();
});

test('slug duplicado se marca en el campo', async ({ page }) => {
  await loginPlataforma(page);
  await page.goto('/plataforma/clientes/nuevo');
  await page.locator('#nombre').fill('Duplicada');
  await page.locator('#slug').fill(`e2e-${sufijo}-a`);
  await page.locator('#duenoNombre').fill('Otra Persona');
  await page.locator('#duenoEmail').fill(`dup-${sufijo}@e2e.test`);
  await page.getByRole('button', { name: 'Crear cliente e invitar al dueño' }).click();
  await expect(page.getByText('Ya existe un cliente con ese identificador')).toBeVisible();
});

test('las sesiones de plataforma y admin no se pisan', async ({ page, browser }) => {
  await loginPlataforma(page);
  const slug = `e2e-${sufijo}-b`;
  const dueno = await nuevoContexto(browser);
  await dueno.page.goto('/admin/login');
  await dueno.page.getByLabel('Correo').fill(`${slug}@e2e.test`);
  await dueno.page.getByLabel('Contraseña').fill(CLAVE_DUENO);
  await dueno.page.getByRole('button', { name: 'Entrar' }).click();
  await expect(dueno.page).toHaveURL(/\/admin$/);

  // En un MISMO navegador: sesión admin y sesión plataforma a la vez.
  const cookies = await dueno.ctx.cookies();
  await page.context().addCookies(cookies.filter((c) => c.name.endsWith('_admin')));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/plataforma/clientes');
  await expect(page).toHaveURL(/\/plataforma\/clientes$/);
  await dueno.ctx.close();
});

test('access token vencido: el servidor redirige a /refresh, se renueva y vuelve a la misma página', async ({
  browser,
}) => {
  const slug = `e2e-${sufijo}-b`;
  const { ctx, page } = await nuevoContexto(browser);
  await page.goto('/admin/login');
  await page.getByLabel('Correo').fill(`${slug}@e2e.test`);
  await page.getByLabel('Contraseña').fill(CLAVE_DUENO);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Simula el vencimiento de los 15 min: se pierde solo el access, queda el refresh.
  const antes = (await ctx.cookies()).find((c) => c.name === 'at_admin');
  expect(antes).toBeTruthy();
  await ctx.clearCookies({ name: 'at_admin' });
  expect((await ctx.cookies()).some((c) => c.name === 'rt_admin')).toBe(true);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  const despues = (await ctx.cookies()).find((c) => c.name === 'at_admin');
  expect(despues?.value).toBeTruthy();
  expect(despues?.value).not.toBe(antes?.value); // el access se renovó de verdad

  // Sin refresh tampoco hay sesión: login.
  await ctx.clearCookies();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await ctx.close();
});

// ---------------------------------------------------------------- Fase 1b

test('1b: ficha de solo lectura con admins y conteos; el admin configura el cliente; plataforma edita solo contacto', async ({
  page,
  browser,
}) => {
  const slug = `e2e-${sufijo}-b`;
  const nombreOriginal = `Liga E2E ${slug}`;

  // El dueño entra e invita a un admin (aún no hay pantalla de admins: se usa el API).
  const dueno = await nuevoContexto(browser);
  await dueno.page.goto('/admin/login');
  await dueno.page.getByLabel('Correo').fill(`${slug}@e2e.test`);
  await dueno.page.getByLabel('Contraseña').fill(CLAVE_DUENO);
  await dueno.page.getByRole('button', { name: 'Entrar' }).click();
  await expect(dueno.page).toHaveURL(/\/admin$/);

  const emailAdmin = `${slug}-admin@e2e.test`;
  const invitar = await dueno.page.request.post('/api/admin/usuarios/invitar', {
    data: { nombre: 'Admin de Ayuda', email: emailAdmin, enviarEmail: false },
  });
  expect(invitar.status()).toBe(201);
  const rutaAdmin = new URL((await invitar.json()).enlace);

  // Plataforma ve la ficha de solo lectura.
  await loginPlataforma(page);
  await page.getByRole('link', { name: nombreOriginal }).click();
  await expect(page.getByRole('heading', { name: nombreOriginal })).toBeVisible();
  await expect(page.getByText('Dueña de Prueba')).toBeVisible();

  const fila = page.getByRole('row', { name: new RegExp(emailAdmin) });
  await expect(fila).toContainText('Admin de Ayuda');
  await expect(fila).toContainText('Invitación pendiente');
  await expect(fila).toContainText('Vence');

  // Fase 2: categorías, ligas y mesas ya traen su conteo (un cliente nuevo parte en 0). Delegados y equipos
  // son de la Fase 3: siguen «—» y nunca 0.
  const tarjetaDe = (titulo: string) =>
    page
      .locator('dt')
      .filter({ hasText: new RegExp(`^${titulo}$`) })
      .locator('xpath=..');
  for (const titulo of ['Categorías', 'Ligas', 'Mesas']) {
    await expect(tarjetaDe(titulo)).toContainText('0');
    await expect(tarjetaDe(titulo)).not.toContainText('Aún no disponible');
  }
  for (const titulo of ['Delegados', 'Equipos']) {
    await expect(tarjetaDe(titulo)).toContainText('—');
    await expect(tarjetaDe(titulo)).toContainText('Aún no disponible');
  }
  // El admin invitado aún no tiene cuenta: cuenta como invitación pendiente, no como admin.
  // Las fichas son <dt>/<dd>; «Admins» también es un título de sección, por eso se filtra por <dt>.
  const ficha = (titulo: string) =>
    page
      .locator('dt')
      .filter({ hasText: new RegExp(`^${titulo}$`) })
      .locator('xpath=..');
  await expect(ficha('Admins')).toContainText('0');
  await expect(ficha('Invitaciones de admin pendientes')).toContainText('1');

  // Un ADMIN (no solo el dueño) acepta la invitación y configura el cliente.
  const ayuda = await nuevoContexto(browser);
  await ayuda.page.goto(`${rutaAdmin.pathname}${rutaAdmin.search}`);
  await ayuda.page.getByLabel('Contraseña nueva').fill(CLAVE_DUENO);
  await ayuda.page.getByLabel('Repite la contraseña').fill(CLAVE_DUENO);
  await ayuda.page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
  await expect(ayuda.page).toHaveURL(/\/admin$/);
  await expect(ayuda.page.getByText('Admin de Ayuda · Admin')).toBeVisible();

  await ayuda.page.getByRole('link', { name: 'Configuración' }).click();
  await expect(ayuda.page).toHaveURL(/\/admin\/configuracion$/);
  await expect(
    ayuda.page.getByRole('heading', { name: 'Configuración del cliente' }),
  ).toBeVisible();
  // Nombre, slug y teléfono: solo lectura (los administra plataforma).
  await expect(ayuda.page.getByText(slug, { exact: true })).toBeVisible();
  await expect(ayuda.page.getByLabel('Nombre')).toHaveCount(0);

  await ayuda.page.getByLabel('Moneda').fill('USD');
  await ayuda.page.getByLabel('País').fill('CR');
  await ayuda.page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(ayuda.page.getByText('Configuración guardada.')).toBeVisible();
  await ayuda.page.reload();
  await expect(ayuda.page.getByLabel('Moneda')).toHaveValue('USD');
  await expect(ayuda.page.getByLabel('País')).toHaveValue('CR');

  // El dueño también la ve (misma configuración).
  await dueno.page.goto('/admin/configuracion');
  await expect(dueno.page.getByLabel('Moneda')).toHaveValue('USD');

  // Valores inválidos: se frenan en el formulario, sin llegar al API.
  await ayuda.page.getByLabel('Zona horaria').fill('Marte/Olimpo');
  await ayuda.page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(ayuda.page.getByText(/Zona horaria IANA válida/)).toBeVisible();

  // Plataforma ve el cambio y el admin ya activo; edita SOLO contacto (sin 400).
  await page.reload();
  await expect(page.getByText('USD')).toBeVisible();
  const filaActiva = page.getByRole('row', { name: new RegExp(emailAdmin) });
  await expect(filaActiva).toContainText('Activo');
  await expect(ficha('Admins')).toContainText('1');
  await expect(ficha('Admins activos')).toContainText('1');
  await expect(ficha('Invitaciones de admin pendientes')).toContainText('0');
  await expect(page.getByLabel('Zona horaria')).toHaveCount(0); // plataforma no la edita

  await page.getByLabel('Nombre').fill(`${nombreOriginal} editada`);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: `${nombreOriginal} editada` })).toBeVisible();
  // La edición de contacto no pisó la configuración que hizo el admin.
  await expect(page.getByText('USD')).toBeVisible();

  await dueno.ctx.close();
  await ayuda.ctx.close();
});

test('1b: plataforma sigue viendo la ficha de un cliente bloqueado y el admin ve la cuenta bloqueada sin perder la sesión', async ({
  page,
  browser,
}) => {
  const slug = `e2e-${sufijo}-b`;
  const ayuda = await nuevoContexto(browser);
  await ayuda.page.goto('/admin/login');
  await ayuda.page.getByLabel('Correo').fill(`${slug}-admin@e2e.test`);
  await ayuda.page.getByLabel('Contraseña').fill(CLAVE_DUENO);
  await ayuda.page.getByRole('button', { name: 'Entrar' }).click();
  await expect(ayuda.page).toHaveURL(/\/admin$/);

  await loginPlataforma(page);
  await page.getByRole('link', { name: new RegExp(`Liga E2E ${slug}`) }).click();
  await page.getByRole('button', { name: 'Bloquear cliente' }).click();
  await page.getByLabel('Motivo').fill('Prueba 1b');
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear cliente' }).click();

  // La ficha sigue abierta con el motivo; los admins y conteos se ven igual.
  await expect(page.getByText(/Motivo: Prueba 1b/)).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(slug) }).first()).toBeVisible();

  // El admin cae al instante, también en la pantalla de configuración.
  await ayuda.page.goto('/admin/configuracion');
  await expect(ayuda.page).toHaveURL(/\/admin\/bloqueada$/);
  await expect(
    ayuda.page.getByRole('heading', { name: 'Cuenta del cliente bloqueada' }),
  ).toBeVisible();

  // Reactivar: la misma sesión vuelve a funcionar (no se borraron cookies).
  await page.getByRole('button', { name: 'Reactivar cliente' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar cliente' }).click();
  await expect(page.getByText('Activo', { exact: true }).first()).toBeVisible();
  await ayuda.page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(ayuda.page).toHaveURL(/\/admin$/);
  await ayuda.ctx.close();
});
