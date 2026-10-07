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
  await expect(page).toHaveURL(/\/plataforma\/ligas$/);
}

async function crearLigaConInvitacion(page: Page, slug: string) {
  await page.goto('/plataforma/ligas/nueva');
  await page.locator('#nombre').fill(`Liga E2E ${slug}`);
  await expect(page.locator('#slug')).toHaveValue(/^liga-e2e-/); // el slug se sugiere del nombre
  await page.locator('#slug').fill(slug);
  await page.locator('#duenoNombre').fill('Dueña de Prueba');
  await page.locator('#duenoEmail').fill(`${slug}@e2e.test`);
  await page.locator('#duenoTelefono').fill('+50588888888');
  await page.getByLabel('Enviar también la invitación por correo').uncheck();
  await page.getByRole('button', { name: 'Crear liga e invitar al dueño' }).click();

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
  await page.goto('/plataforma/ligas');
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

test('crear liga, invitar al dueño, aceptar, bloquear (corte inmediato) y reactivar', async ({
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
  await expect(page).toHaveURL(/\/plataforma\/ligas\/[0-9a-f-]{36}$/);
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
  await expect(dueno.page.getByText(`Liga E2E ${slug}`)).toBeVisible();
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
  await page.getByRole('button', { name: 'Bloquear liga' }).click();
  await page.getByRole('button', { name: 'Bloquear liga' }).last().click();
  await expect(page.getByText('Explica el motivo')).toBeVisible();
  await page.getByLabel('Motivo').fill('Prueba E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear liga' }).click();
  await expect(page.getByText('Bloqueada', { exact: true }).first()).toBeVisible();

  await dueno.page.goto('/admin');
  await expect(dueno.page).toHaveURL(/\/admin\/bloqueada$/);
  await expect(
    dueno.page.getByText('Esta liga está bloqueada. Contacta al administrador de la app.'),
  ).toBeVisible();

  // Reactivar: la MISMA sesión vuelve a funcionar (las cookies no se borraron).
  await page.getByRole('button', { name: 'Reactivar liga' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar liga' }).click();
  await expect(page.getByText('Activa', { exact: true }).first()).toBeVisible();

  await dueno.page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(dueno.page).toHaveURL(/\/admin$/);
  await expect(dueno.page.getByText(`Liga E2E ${slug}`)).toBeVisible();

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
  await page.goto('/plataforma/ligas/nueva');
  await page.locator('#nombre').fill('Duplicada');
  await page.locator('#slug').fill(`e2e-${sufijo}-a`);
  await page.locator('#duenoNombre').fill('Otra Persona');
  await page.locator('#duenoEmail').fill(`dup-${sufijo}@e2e.test`);
  await page.getByRole('button', { name: 'Crear liga e invitar al dueño' }).click();
  await expect(page.getByText('Ya existe una liga con ese identificador')).toBeVisible();
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
  await page.goto('/plataforma/ligas');
  await expect(page).toHaveURL(/\/plataforma\/ligas$/);
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
