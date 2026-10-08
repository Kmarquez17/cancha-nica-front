import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * Cuidado con los intentos fallidos de login: el backend bloquea la red tras 5 (`IP_LOCKED`, unos 15 minutos). Esta
 * suite hace solo 2 a propósito; si se corre varias veces seguidas junto con la de plataforma, puede toparse con el bloqueo.
 *
 * Fase 2 contra la API REAL (sin MSW): categorías, ligas con su máquina de estados, mesas y login de mesa.
 * Valida de punta a punta lo que el prototipo con MSW solo podía suponer: los nombres de campo del contrato, los
 * `camposEditables` y `transicionesPosibles` que manda el servidor, los `incumplimientos` forzables y la sesión real
 * de la mesa con cookies. Requiere la API local y las credenciales de plataforma del seed (ver playwright.api.config.ts).
 */
const EMAIL = process.env.E2E_PLATAFORMA_EMAIL;
const PASSWORD = process.env.E2E_PLATAFORMA_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'Define E2E_PLATAFORMA_EMAIL y E2E_PLATAFORMA_PASSWORD');
test.describe.configure({ mode: 'serial' });

const sufijo = Date.now().toString(36);
const SLUG = `e2e-f2-${sufijo}`;
const CLAVE_DUENO = 'clave-segura-e2e-1';

let plataforma: { ctx: BrowserContext; page: Page };
let dueno: { ctx: BrowserContext; page: Page };
let clienteUrl = '';

async function nuevoContexto(browser: Browser) {
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  return { ctx, page: await ctx.newPage() };
}

const tarjeta = (page: Page, texto: string) =>
  page.getByRole('listitem').filter({ hasText: texto });

/** Crea un cliente nuevo desde plataforma e invita al dueño, que acepta en su propio navegador. */
test.beforeAll(async ({ browser }) => {
  plataforma = await nuevoContexto(browser);
  const p = plataforma.page;
  await p.goto('/plataforma/login');
  await p.getByLabel('Correo').fill(EMAIL!);
  await p.getByLabel('Contraseña').fill(PASSWORD!);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await expect(p).toHaveURL(/\/plataforma\/clientes$/);

  await p.goto('/plataforma/clientes/nuevo');
  await p.locator('#nombre').fill(`Liga E2E ${SLUG}`);
  await p.locator('#slug').fill(SLUG);
  await p.locator('#duenoNombre').fill('Dueña de Prueba');
  await p.locator('#duenoEmail').fill(`${SLUG}@e2e.test`);
  await p.locator('#duenoTelefono').fill('+50588888888');
  await p.getByLabel('Enviar también la invitación por correo').uncheck();
  await p.getByRole('button', { name: 'Crear cliente e invitar al dueño' }).click();
  const dialogo = p.getByRole('dialog', { name: 'Invitación creada' });
  await expect(dialogo).toBeVisible();
  const enlace = await dialogo.getByLabel('Enlace de invitación').inputValue();
  const url = new URL(enlace);
  await dialogo.getByRole('button', { name: 'Cerrar' }).last().click();
  await expect(p).toHaveURL(/\/plataforma\/clientes\/[0-9a-f-]{36}$/);
  clienteUrl = new URL(p.url()).pathname;

  dueno = await nuevoContexto(browser);
  await dueno.page.goto(`${url.pathname}${url.search}`);
  await dueno.page.getByLabel('Contraseña nueva').fill(CLAVE_DUENO);
  await dueno.page.getByLabel('Repite la contraseña').fill(CLAVE_DUENO);
  await dueno.page.getByRole('button', { name: 'Crear contraseña y entrar' }).click();
  await expect(dueno.page).toHaveURL(/\/admin$/);
});

test.afterAll(async () => {
  await plataforma?.ctx.close();
  await dueno?.ctx.close();
});

test('un cliente nuevo empieza sin categorías y el inicio guía los primeros pasos', async () => {
  const p = dueno.page;
  await expect(p.getByText('Para empezar')).toBeVisible();
  await p.goto('/admin/categorias');
  await expect(p.getByText('Aún no tienes categorías')).toBeVisible();
});

test('categorías: crear, duplicado, rango de edad y archivar', async () => {
  const p = dueno.page;
  await p.goto('/admin/categorias');

  await p.getByRole('button', { name: 'Nueva categoría' }).click();
  await p.getByLabel('Nombre').fill('Libre');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await expect(tarjeta(p, 'Libre')).toBeVisible();
  await expect(tarjeta(p, 'Libre').getByText(/Sin límite de edad/)).toBeVisible();

  // «LIBRE» es la misma categoría (sin distinguir mayúsculas): el servidor responde 409.
  await p.getByRole('button', { name: 'Nueva categoría' }).click();
  await p.getByLabel('Nombre').fill('LIBRE');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await expect(p.getByText(/Ya existe una categoría con ese nombre/)).toBeVisible();
  await p.keyboard.press('Escape');

  await p.getByRole('button', { name: 'Nueva categoría' }).click();
  await p.getByLabel('Nombre').fill('Sub-18');
  await p.getByLabel('Edad mínima').fill('15');
  await p.getByLabel('Edad máxima').fill('17');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await expect(tarjeta(p, 'Sub-18').getByText('15 a 17 años')).toBeVisible();

  await tarjeta(p, 'Sub-18').getByRole('button', { name: 'Archivar' }).click();
  await expect(tarjeta(p, 'Sub-18')).toHaveCount(0);
  await p.getByLabel('Mostrar archivadas').check();
  await expect(tarjeta(p, 'Sub-18').getByText('Archivada')).toBeVisible();
  await tarjeta(p, 'Sub-18').getByRole('button', { name: 'Restaurar' }).click();
  await p.getByLabel('Mostrar archivadas').uncheck();
  await expect(tarjeta(p, 'Sub-18')).toBeVisible();
});

test('ligas: crear con preset, ajustar reglas y costos, y ver lo que fija el servidor', async () => {
  const p = dueno.page;
  await p.goto('/admin/ligas/nueva');
  await p.getByLabel('Nombre', { exact: true }).fill('Apertura E2E');
  await p.getByLabel('Categoría').selectOption({ label: 'Libre' });
  await p.getByLabel('Fecha de inicio (opcional)').fill('2026-11-01');
  await p.getByRole('button', { name: 'Crear liga' }).click();
  await expect(p).toHaveURL(/\/admin\/ligas\/[0-9a-f-]{36}$/);
  await expect(p.getByRole('heading', { name: 'Apertura E2E' })).toBeVisible();
  await expect(p.locator('[data-estado="CONFIGURACION"]')).toBeVisible();

  // El preset del futsal llegó cargado desde el servidor, y el día de inicio no se corre.
  await expect(p.getByLabel('Plantel máximo')).toHaveValue('18');
  await expect(p.getByLabel('Plantel mínimo')).toHaveValue('6');
  await expect(p.getByLabel('Fecha de inicio')).toHaveValue('2026-11-01');
  await expect(p.getByLabel('Equipos mínimos para empezar')).toHaveValue('4');
  await expect(p.getByLabel('Multa por roja')).toHaveValue('0.00');

  // En configuración todo es editable; se guardan reglas, sanciones y costos.
  await p.getByLabel('Plantel máximo').fill('20');
  await p.getByLabel('Multa por roja').fill('7,5');
  await p.getByLabel('Costo de inscripción por equipo').fill('150');
  await p.getByLabel('Clasificados a eliminatorias').selectOption('8');
  await p.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(p.getByText('Cambios guardados.')).toBeVisible();

  await p.reload();
  await expect(p.getByLabel('Plantel máximo')).toHaveValue('20');
  await expect(p.getByLabel('Multa por roja')).toHaveValue('7.50');
  await expect(p.getByLabel('Costo de inscripción por equipo')).toHaveValue('150.00');
  await expect(p.getByLabel('Clasificados a eliminatorias')).toHaveValue('8');
  await expect(p.getByLabel('Fecha de inicio')).toHaveValue('2026-11-01');
});

test('ligas: abrir inscripciones fija lo que dice camposEditables', async () => {
  const p = dueno.page;
  await expect(p.getByLabel('Dirección pública (slug)')).toBeEnabled();
  await p.getByRole('button', { name: 'Abrir inscripciones' }).click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  await expect(p.locator('[data-estado="EN_REGISTRO"]')).toBeVisible();

  // Con las inscripciones abiertas quedan fijos el slug, la fecha de inicio y la categoría; las reglas siguen.
  await expect(p.getByLabel('Dirección pública (slug)')).toBeDisabled();
  await expect(p.getByLabel('Fecha de inicio')).toBeDisabled();
  await expect(p.getByLabel('Categoría')).toBeDisabled();
  await expect(p.getByLabel('Plantel máximo')).toBeEnabled();
});

test('ligas: no se abren dos de la misma categoría y modalidad', async () => {
  const p = dueno.page;
  await p.goto('/admin/ligas/nueva');
  await p.getByLabel('Nombre', { exact: true }).fill('Clausura E2E');
  await p.getByLabel('Categoría').selectOption({ label: 'Libre' });
  await p.getByRole('button', { name: 'Crear liga' }).click();
  await expect(p.getByRole('heading', { name: 'Clausura E2E' })).toBeVisible();

  await p.getByRole('button', { name: 'Abrir inscripciones' }).click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  await expect(
    p.getByText(/Ya hay una liga abierta de esta categoría y modalidad/).first(),
  ).toBeVisible();
  const requisitos = p.getByRole('list', { name: 'Requisitos' });
  await expect(requisitos.getByText('(no se puede saltar)')).toBeVisible();
  await expect(p.getByRole('button', { name: 'Forzar de todos modos' })).toHaveCount(0);
  await p.keyboard.press('Escape');
  await expect(p.locator('[data-estado="CONFIGURACION"]')).toBeVisible();
});

test('ligas: arrancar sin requisitos muestra el checklist; el dueño fuerza y las reglas se congelan', async () => {
  const p = dueno.page;
  await p.goto('/admin/ligas');
  await p.getByRole('link', { name: /Apertura E2E/ }).click();
  await expect(p.getByRole('heading', { name: 'Apertura E2E' })).toBeVisible();

  await p.getByRole('button', { name: 'Empezar la liga' }).click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  const requisitos = p.getByRole('list', { name: 'Requisitos' });
  await expect(requisitos).toBeVisible();
  await expect(requisitos.getByText('(se puede saltar)').first()).toBeVisible();
  // Todavía no hay equipos ni calendario (Fases 3 a 5): es lo esperado.
  await expect(p.getByText(/Como dueño puedes forzar el cambio/)).toBeVisible();

  await p.getByRole('button', { name: 'Forzar de todos modos' }).click();
  await expect(p.locator('[data-estado="EN_CURSO"]')).toBeVisible();

  // En juego solo se cambian nombre, fin estimado y costos.
  await expect(p.getByLabel('Plantel máximo')).toBeDisabled();
  await expect(p.getByLabel('Multa por roja')).toBeDisabled();
  await expect(p.getByLabel('Nombre', { exact: true })).toBeEnabled();
  await expect(p.getByLabel('Costo de arbitraje por equipo y partido')).toBeEnabled();

  await p.getByLabel('Costo de arbitraje por equipo y partido').fill('12.5');
  await p.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(p.getByText('Cambios guardados.')).toBeVisible();
  await p.reload();
  await expect(p.getByLabel('Costo de arbitraje por equipo y partido')).toHaveValue('12.50');
});

test('ligas: con eliminatorias no se finaliza desde «en juego»; se pasa por esa fase', async () => {
  const p = dueno.page;
  // La liga de arriba tiene 8 clasificados: finalizar desde «en juego» no es posible (no forzable).
  await p.getByRole('button', { name: 'Finalizar liga' }).click();
  await p.getByLabel('Entiendo que no se puede deshacer.').check();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  const requisitos = p.getByRole('list', { name: 'Requisitos' });
  await expect(requisitos.getByText('(no se puede saltar)')).toBeVisible();
  await expect(p.getByRole('button', { name: 'Forzar de todos modos' })).toHaveCount(0);
  await p.keyboard.press('Escape');
});

test('mesas: alta con PIN de un solo uso, copiar y asignar la liga', async () => {
  const p = dueno.page;
  await p.goto('/admin/mesas');
  await p.getByRole('button', { name: 'Nueva mesa' }).click();
  await p.getByLabel('Nombre de quien opera (opcional)').fill('Luis');
  await p.getByRole('button', { name: 'Crear mesa' }).click();
  await expect(p.getByText('Mesa creada')).toBeVisible();

  const pin = (await p.locator('dd.marcador').nth(1).innerText()).trim();
  expect(pin).toMatch(/^\d{6}$/);
  await expect(p.locator('dd.marcador').first()).toHaveText('MESA1');
  await expect(p.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\//,
  );
  await p.getByRole('button', { name: 'Copiar PIN' }).click();
  expect(await p.evaluate(() => navigator.clipboard.readText())).toBe(pin);
  process.env.E2E_F2_PIN = pin; // solo vive en este proceso de prueba

  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await expect(p.getByText(pin)).toHaveCount(0);

  const mesa1 = tarjeta(p, 'MESA1');
  await expect(mesa1.getByText('Activa', { exact: true })).toBeVisible();
  await expect(mesa1.getByText('Sin ligas asignadas')).toBeVisible();

  await mesa1.getByRole('button', { name: 'Ligas' }).click();
  await p.getByRole('checkbox', { name: /Apertura E2E/ }).check();
  await p.getByRole('button', { name: 'Guardar' }).click();
  await expect(p.getByText('Ligas de la mesa actualizadas.')).toBeVisible();
  await expect(mesa1.getByText('Apertura E2E')).toBeVisible();
});

test('mesa: login real con cookies, ve su liga, y el alcance y la desactivación surten efecto al instante', async ({
  browser,
}) => {
  const pin = process.env.E2E_F2_PIN!;
  const mesa = await nuevoContexto(browser);
  const m = mesa.page;
  await m.setViewportSize({ width: 400, height: 800 });

  await m.goto(`/mesa/${SLUG}`);
  // El usuario no distingue mayúsculas. (No se prueba aquí un PIN errado: cada fallo suma al bloqueo de la red.)
  await m.getByLabel('Usuario').fill('mesa1');
  await m.getByLabel('PIN').fill(pin);
  await m.getByRole('button', { name: 'Entrar' }).click();
  await expect(m).toHaveURL(/\/mesa$/);
  await expect(m.getByRole('heading', { name: /MESA1/ })).toBeVisible();
  await expect(m.getByText('Apertura E2E')).toBeVisible();

  // La sesión es real: sobrevive a recargar y la ruta está protegida por el servidor.
  await m.reload();
  await expect(m.getByRole('heading', { name: /MESA1/ })).toBeVisible();

  // El dueño le quita la liga: el siguiente request ya lo refleja.
  const p = dueno.page;
  await p.goto('/admin/mesas');
  await tarjeta(p, 'MESA1').getByRole('button', { name: 'Ligas' }).click();
  await p.getByRole('checkbox', { name: /Apertura E2E/ }).uncheck();
  await p.getByRole('button', { name: 'Guardar' }).click();
  await expect(p.getByText('Ligas de la mesa actualizadas.')).toBeVisible();
  await m.reload();
  await expect(m.getByText(/Todavía no tienes ligas asignadas/)).toBeVisible();

  // Desactivar la mesa le corta el acceso aunque tenga la sesión abierta.
  await tarjeta(p, 'MESA1').getByRole('button', { name: 'Desactivar' }).click();
  await expect(tarjeta(p, 'MESA1').getByText('Desactivada')).toBeVisible();
  await m.reload();
  await expect(m).toHaveURL(/\/$/);

  // (Que una mesa desactivada no pueda volver a entrar lo cubre el backend: cada intento fallido suma al bloqueo de la red.)
  await tarjeta(p, 'MESA1').getByRole('button', { name: 'Activar' }).click();
  await expect(tarjeta(p, 'MESA1').getByText('Activa', { exact: true })).toBeVisible();
  await mesa.ctx.close();
});

test('mesas: resetear el PIN invalida el anterior', async ({ browser }) => {
  const viejo = process.env.E2E_F2_PIN!;
  const p = dueno.page;
  await p.goto('/admin/mesas');
  await tarjeta(p, 'MESA1').getByRole('button', { name: 'Resetear PIN' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Resetear PIN' }).click();
  await expect(p.getByText('PIN nuevo')).toBeVisible();
  const nuevo = (await p.locator('dd.marcador').nth(1).innerText()).trim();
  expect(nuevo).toMatch(/^\d{6}$/);
  await p.getByRole('button', { name: 'Cerrar' }).first().click();

  const mesa = await nuevoContexto(browser);
  const m = mesa.page;
  await m.goto(`/mesa/${SLUG}`);
  await m.getByLabel('Usuario').fill('MESA1');
  await m.getByLabel('PIN').fill(viejo);
  await m.getByRole('button', { name: 'Entrar' }).click();
  await expect(m.getByText('Usuario o PIN incorrectos.')).toBeVisible();
  await m.getByLabel('PIN').fill(nuevo);
  await m.getByRole('button', { name: 'Entrar' }).click();
  await expect(m).toHaveURL(/\/mesa$/);
  await mesa.ctx.close();
});

test('mesas: cambiar el operador, el límite de 6 y el aviso de cupo', async () => {
  const p = dueno.page;
  await p.goto('/admin/mesas');
  const mesa1 = tarjeta(p, 'MESA1');
  await mesa1.getByRole('button', { name: 'Operador' }).click();
  await expect(p.getByLabel('Nombre de quien opera')).toHaveValue('Luis');
  await p.getByLabel('Nombre de quien opera').fill('María López');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await expect(mesa1.getByText('María López')).toBeVisible();

  for (let i = 0; i < 5; i++) {
    await p.getByRole('button', { name: 'Nueva mesa' }).click();
    await p.getByRole('button', { name: 'Crear mesa' }).click();
    await expect(p.getByText('Mesa creada')).toBeVisible();
    await p.getByRole('button', { name: 'Cerrar' }).first().click();
  }
  await expect(p.getByRole('button', { name: 'Nueva mesa' })).toBeDisabled();
  await expect(p.getByText('Ya tienes las 6 mesas que permite un cliente.')).toBeVisible();
});

test('ligas: finalizar exige confirmación, es irreversible y deja la liga solo de lectura', async () => {
  const p = dueno.page;
  // Otra categoría, para no chocar con la liga «Apertura» que sigue abierta.
  await p.goto('/admin/ligas/nueva');
  await p.getByLabel('Nombre', { exact: true }).fill('Copa Sub-18 E2E');
  await p.getByLabel('Categoría').selectOption({ label: 'Sub-18' });
  await p.getByRole('button', { name: 'Crear liga' }).click();
  await expect(p.getByRole('heading', { name: 'Copa Sub-18 E2E' })).toBeVisible();
  await p.getByRole('button', { name: 'Abrir inscripciones' }).click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  await expect(p.locator('[data-estado="EN_REGISTRO"]')).toBeVisible();
  await p.getByRole('button', { name: 'Empezar la liga' }).click();
  await p.getByRole('button', { name: 'Confirmar' }).click();
  await p.getByRole('button', { name: 'Forzar de todos modos' }).click();
  await expect(p.locator('[data-estado="EN_CURSO"]')).toBeVisible();

  // Sin eliminatorias se puede finalizar desde «en juego», pero pide confirmación explícita.
  await p.getByRole('button', { name: 'Finalizar liga' }).click();
  const confirmar = p.getByRole('button', { name: 'Confirmar' });
  await expect(confirmar).toBeDisabled();
  await p.getByLabel('Entiendo que no se puede deshacer.').check();
  await confirmar.click();

  await expect(p.getByText('La liga terminó. No hay forma de reabrirla.')).toBeVisible();
  await expect(p.locator('[data-estado="FINALIZADA"]')).toBeVisible();
  await expect(p.getByText(/ya no se puede cambiar nada/)).toBeVisible();
  await expect(p.getByLabel('Nombre', { exact: true })).toBeDisabled();
  await expect(p.getByLabel('Costo de arbitraje por equipo y partido')).toBeDisabled();
  await expect(p.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
  await expect(p.getByRole('button', { name: 'Archivar liga' })).toHaveCount(0);
});

test('ligas: archivar una liga en configuración, ocultarla y restaurarla', async () => {
  const p = dueno.page;
  await p.goto('/admin/ligas');
  await p.getByRole('link', { name: /Clausura E2E/ }).click();
  await expect(p.getByRole('heading', { name: 'Clausura E2E' })).toBeVisible();
  // «Clausura» no puede abrirse mientras «Apertura» siga abierta: se archiva y se prueba el listado.
  await p.getByRole('button', { name: 'Archivar liga' }).click();
  await expect(p.getByText(/Esta liga está archivada/)).toBeVisible();
  await expect(p.getByLabel('Nombre', { exact: true })).toBeDisabled();
  await expect(p.getByRole('button', { name: 'Abrir inscripciones' })).toHaveCount(0);

  await p.goto('/admin/ligas');
  await expect(p.getByText('Clausura E2E')).toHaveCount(0);
  await p.getByLabel('Mostrar archivadas').check();
  await expect(p.getByText('Clausura E2E')).toBeVisible();

  await p.getByRole('link', { name: /Clausura E2E/ }).click();
  await p.getByRole('button', { name: 'Restaurar liga' }).click();
  await expect(p.getByLabel('Nombre', { exact: true })).toBeEnabled();
});

test('plataforma ve en solo lectura lo que armó el cliente', async () => {
  const p = plataforma.page;
  await p.goto(clienteUrl);
  await expect(p.getByText('Lo que armó el cliente')).toBeVisible();

  const tarjetaDe = (titulo: string) =>
    p
      .locator('dt')
      .filter({ hasText: new RegExp(`^${titulo}$`) })
      .locator('xpath=..');
  await expect(tarjetaDe('Categorías')).toContainText('2');
  await expect(tarjetaDe('Ligas')).toContainText('3');
  await expect(tarjetaDe('Mesas')).toContainText('6');

  const grupo = p.getByRole('group', { name: 'Qué ver del cliente' });
  await grupo.getByRole('button', { name: 'Categorías' }).click();
  await expect(p.getByRole('list', { name: 'Categorías del cliente' })).toContainText('Libre');
  await grupo.getByRole('button', { name: 'Ligas' }).click();
  await expect(p.getByRole('list', { name: 'Ligas del cliente' })).toContainText('Apertura E2E');
  await grupo.getByRole('button', { name: 'Mesas' }).click();
  await expect(p.getByRole('list', { name: 'Mesas del cliente' })).toContainText('MESA1');

  // Plataforma no escribe nada de esto: no hay botones de crear, editar ni resetear.
  await expect(
    p.getByRole('button', { name: /Nueva mesa|Resetear PIN|Nueva categoría/ }),
  ).toHaveCount(0);
});
