import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido de la Fase 2 con MSW. Cada prueba usa un navegador nuevo, así que la base simulada
 * (que vive en sessionStorage) siempre parte de los datos de ejemplo: categorías Libre y Sub-18,
 * ligas «Apertura 2026» (inscripciones abiertas) y «Clausura Sub-18», MESA1 activa y MESA2 bloqueada.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'at_admin', value: 'sesion-de-prueba', url: baseURL! }]);
});

const abrir = async (page: Page, ruta: string, esperar: string | RegExp) => {
  await page.goto(ruta);
  await expect(page.getByText(esperar).first()).toBeVisible();
};

/** Pasa una liga de «inscripciones abiertas» a «en juego» forzando los requisitos (solo el dueño puede). */
async function empezarForzando(page: Page) {
  await page.getByRole('button', { name: 'Empezar la liga' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Falta generar el calendario.')).toBeVisible();
  await page.getByRole('button', { name: 'Forzar de todos modos' }).click();
  // La insignia del estado (no el aviso emergente, que sale antes de que la liga se refresque).
  await expect(page.locator('[data-estado="EN_CURSO"]')).toBeVisible();
}

test.describe('admin: categorías', () => {
  test('«sub 18» choca con «Sub-18» y se puede crear otra', async ({ page }) => {
    await abrir(page, '/admin/categorias', 'Sub-18');
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre').fill('sub 18');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(/Ya existe una categoría con ese nombre/)).toBeVisible();

    await page.getByLabel('Nombre').fill('Veteranos');
    await page.getByLabel('Edad mínima').fill('35');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Desde 35 años')).toBeVisible();
  });

  test('archivar oculta la categoría y restaurar la devuelve', async ({ page }) => {
    await abrir(page, '/admin/categorias', 'Sub-18');
    const fila = page.getByRole('listitem').filter({ hasText: 'Sub-18' });
    await fila.getByRole('button', { name: 'Archivar' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Sub-18' })).toHaveCount(0);
    await page.getByLabel('Mostrar archivadas').check();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Sub-18' })
      .getByRole('button', { name: 'Restaurar' })
      .click();
    await page.getByLabel('Mostrar archivadas').uncheck();
    await expect(page.getByRole('listitem').filter({ hasText: 'Sub-18' })).toHaveCount(1);
  });
});

test.describe('admin: ligas', () => {
  test('al elegir modalidad se carga el preset y una regla rota se marca en su campo', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/nueva', 'Nueva liga');
    await page.getByLabel('Nombre', { exact: true }).fill('Copa Veteranos');
    await page.getByLabel('Categoría').selectOption({ label: 'Sub-18' });
    await page.getByLabel('Modalidad').selectOption('FUTBOL_11');
    await expect(page.getByText(/Cargamos las reglas de Fútbol 11/)).toBeVisible();
    await expect(page.getByLabel('Plantel máximo')).toHaveValue('30');

    await page.getByLabel('Plantel máximo').fill('5');
    await page.getByRole('button', { name: 'Crear liga' }).click();
    await expect(page.getByText(/No puede ser menor que los convocados por partido/)).toBeVisible();

    await page.getByLabel('Plantel máximo').fill('30');
    await page.getByRole('button', { name: 'Crear liga' }).click();
    await expect(page).toHaveURL(/\/admin\/ligas\/ed-/);
    await expect(page.getByRole('heading', { name: 'Copa Veteranos' })).toBeVisible();
  });

  test('una liga nueva trae las sanciones y los costos del plan', async ({ page }) => {
    await abrir(page, '/admin/ligas/nueva', 'Nueva liga');
    await expect(page.getByLabel('Fechas de suspensión por roja directa')).toHaveValue('1');
    await expect(page.getByLabel('Amarillas acumuladas para una fecha')).toHaveValue('5');
    await expect(page.getByLabel('Goles que se dan al ganador por W.O.')).toHaveValue('3');
    await expect(page.getByLabel('Costo de inscripción por equipo')).toHaveValue('0.00');
    await expect(page.getByLabel('Un jugador con multa sin pagar no puede jugar')).toBeChecked();
    await expect(
      page.getByLabel('No dejar jugar al equipo con deuda de arbitraje'),
    ).not.toBeChecked();
  });

  test('un importe inválido se rechaza y uno válido se guarda con dos decimales', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await page.getByLabel('Multa por roja').fill('abc');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(
      page.getByText('Escribe un importe, por ejemplo 150 o 12.50.').first(),
    ).toBeVisible();

    await page.getByLabel('Multa por roja').fill('7,5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Multa por roja')).toHaveValue('7.50');
  });

  test('empezar sin requisitos muestra el reporte; el dueño puede forzar y las reglas quedan congeladas', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await expect(page.getByLabel('Plantel máximo')).toBeEnabled();
    await expect(page.getByLabel('Dirección pública (slug)')).toBeDisabled();

    await empezarForzando(page);
    await expect(page.getByLabel('Plantel máximo')).toBeDisabled();
    await expect(page.getByLabel('Multa por roja')).toBeDisabled();
    await expect(page.getByLabel('Fecha de inicio')).toBeDisabled();
  });

  test('en juego los costos se siguen pudiendo cambiar', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await empezarForzando(page);
    await page.getByLabel('Costo de arbitraje por equipo y partido').fill('12.5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Costo de arbitraje por equipo y partido')).toHaveValue('12.50');
  });

  test('finalizar pide confirmación y deja la liga solo de lectura', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await empezarForzando(page);
    await page.getByRole('button', { name: 'Pasar a eliminatorias' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-estado="EN_ELIMINATORIAS"]')).toBeVisible();

    await page.getByRole('button', { name: 'Finalizar liga' }).click();
    const confirmar = page.getByRole('button', { name: 'Confirmar' });
    await expect(confirmar).toBeDisabled();
    await page.getByLabel('Entiendo que no se puede deshacer.').check();
    await expect(confirmar).toBeEnabled();
    await confirmar.click();

    await expect(page.getByText('La liga terminó. No hay forma de reabrirla.')).toBeVisible();
    await expect(page.getByText(/ya no se puede cambiar nada/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
  });

  test('archivar una liga en configuración la saca del listado', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await page.getByRole('button', { name: 'Archivar liga' }).click();
    await expect(page.getByText('Liga archivada.')).toBeVisible();
    await abrir(page, '/admin/ligas', 'Apertura 2026');
    await expect(page.getByText('Clausura Sub-18')).toHaveCount(0);
  });
});

test.describe('admin: mesas', () => {
  test('el alta muestra el PIN una sola vez y se puede copiar', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    await page.getByRole('button', { name: 'Nueva mesa' }).click();
    await page.getByLabel('Nombre de quien opera (opcional)').fill('Luis');
    await page.getByRole('button', { name: 'Crear mesa' }).click();
    await expect(page.getByText('Mesa creada')).toBeVisible();

    const pin = (await page.locator('dd.marcador').nth(1).innerText()).trim();
    expect(pin).toMatch(/^\d{6}$/);
    await page.getByRole('button', { name: 'Copiar PIN' }).click();
    await expect(page.getByText('Copiado al portapapeles.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pin);

    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText(pin)).toHaveCount(0);
  });

  test('el límite de 6 mesas deshabilita «Nueva mesa»', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Nueva mesa' }).click();
      await page.getByRole('button', { name: 'Crear mesa' }).click();
      await expect(page.getByText('Mesa creada')).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar' }).first().click();
    }
    await expect(page.getByRole('button', { name: 'Nueva mesa' })).toBeDisabled();
    await expect(page.getByText('Ya tienes las 6 mesas que permite un cliente.')).toBeVisible();
  });

  test('cambiar el operador no toca el usuario', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    const mesa1 = page.getByRole('listitem').filter({ hasText: 'MESA1' });
    await mesa1.getByRole('button', { name: 'Operador' }).click();
    await expect(page.getByLabel('Nombre de quien opera')).toHaveValue('Carlos Pérez');
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await page.getByLabel('Nombre de quien opera').fill('María López');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Operador actualizado.')).toBeVisible();
    await expect(mesa1.getByText('María López')).toBeVisible();
    await expect(mesa1.getByText('MESA1')).toBeVisible();
  });

  test('quitar el nombre deja «Sin nombre de operador»', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    const mesa1 = page.getByRole('listitem').filter({ hasText: 'MESA1' });
    await mesa1.getByRole('button', { name: 'Operador' }).click();
    await page.getByLabel('Nombre de quien opera').fill('');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(mesa1.getByText('Sin nombre de operador')).toBeVisible();
  });

  test('desbloquear una mesa bloqueada', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA2');
    const mesa2 = page.getByRole('listitem').filter({ hasText: 'MESA2' });
    await expect(mesa2.getByText(/Bloqueada hasta las/)).toBeVisible();
    await mesa2.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(mesa2.getByText('Activa')).toBeVisible();
  });
});

test.describe('mesa: login e inicio', () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('PIN erróneo no distingue la causa; el correcto entra y muestra sus ligas', async ({
    page,
  }) => {
    await page.goto('/mesa/sopa');
    await page.getByLabel('Usuario').fill('mesa1');
    await page.getByLabel('PIN').fill('000000');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Usuario o PIN incorrectos.')).toBeVisible();

    await page.getByLabel('PIN').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/mesa$/);
    await expect(page.getByRole('heading', { name: /MESA1/ })).toBeVisible();
    await expect(page.getByText('Apertura 2026')).toBeVisible();
  });

  test('un usuario de otro cliente responde igual que un PIN errónea', async ({ page }) => {
    await page.goto('/mesa/otra-liga');
    await page.getByLabel('Usuario').fill('MESA1');
    await page.getByLabel('PIN').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Usuario o PIN incorrectos.')).toBeVisible();
  });

  test('una mesa bloqueada avisa que está bloqueada', async ({ page }) => {
    await page.goto('/mesa/sopa');
    await page.getByLabel('Usuario').fill('MESA2');
    await page.getByLabel('PIN').fill('654321');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText(/bloqueada por intentos fallidos/)).toBeVisible();
  });

  test('validación en el cliente: usuario y PIN con formato', async ({ page }) => {
    await page.goto('/mesa/sopa');
    await page.getByLabel('Usuario').fill('juan');
    await page.getByLabel('PIN').fill('12');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Escribe tu usuario, por ejemplo MESA1.')).toBeVisible();
    await expect(page.getByText('El PIN tiene 6 números.')).toBeVisible();
  });
});
