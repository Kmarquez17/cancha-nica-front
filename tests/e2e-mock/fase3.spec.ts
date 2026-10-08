import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido de la Fase 3 con MSW. Datos de ejemplo: clubes Los Tigres, Deportivo Norte y Atlético Sur;
 * delegados Pedro Gómez (+50588880001, PIN 111111, nunca entró), Ana Ruiz (+50588880002, ya entró) y
 * Marta Díaz (+50588880009, sin equipos); Los Tigres y Deportivo Norte juegan «Apertura 2026» (categoría Libre,
 * inscripciones abiertas). «Clausura Sub-18» está en configuración.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'at_admin', value: 'sesion-de-prueba', url: baseURL! }]);
});

const abrir = async (page: Page, ruta: string, esperar: string | RegExp) => {
  await page.goto(ruta);
  await expect(page.getByText(esperar).first()).toBeVisible();
};

const tarjeta = (page: Page, texto: string) =>
  page.getByRole('listitem').filter({ hasText: texto });

test.describe('admin: clubes', () => {
  test('un nombre repetido (sin importar mayúsculas ni espacios) se rechaza', async ({ page }) => {
    await abrir(page, '/admin/clubes', 'Los Tigres');
    await page.getByRole('button', { name: 'Nuevo club' }).click();
    await page.getByLabel('Nombre del club').fill('los  tigres');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(/Ya existe un club con ese nombre/)).toBeVisible();
    await page.getByLabel('Nombre del club').fill('Los Halcones');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Club creado.')).toBeVisible();
    await expect(tarjeta(page, 'Los Halcones')).toBeVisible();
  });

  test('se renombra y se desactiva; cuenta en cuántas ligas juega', async ({ page }) => {
    await abrir(page, '/admin/clubes', 'Atlético Sur');
    await expect(tarjeta(page, 'Los Tigres').getByText(/En 1 liga/)).toBeVisible();
    await expect(tarjeta(page, 'Atlético Sur').getByText(/Sin ligas/)).toBeVisible();

    await tarjeta(page, 'Atlético Sur').getByRole('button', { name: 'Renombrar' }).click();
    await page.getByLabel('Nombre del club').fill('Atlético del Sur');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta(page, 'Atlético del Sur')).toBeVisible();

    await tarjeta(page, 'Atlético del Sur').getByRole('button', { name: 'Desactivar' }).click();
    await expect(tarjeta(page, 'Atlético del Sur').getByText('Desactivado')).toBeVisible();
  });
});

test.describe('admin: delegados', () => {
  test('el listado distingue a quien nunca entró y a quien sigue con el PIN temporal', async ({
    page,
  }) => {
    await abrir(page, '/admin/delegados', 'Pedro Gómez');
    await expect(tarjeta(page, 'Pedro Gómez').getByText('PIN aún no usado')).toBeVisible();
    await expect(tarjeta(page, 'Ana Ruiz').getByText('PIN temporal')).toBeVisible();
    await expect(tarjeta(page, 'Pedro Gómez').getByText(/Los Tigres/)).toBeVisible();
  });

  test('resetear el PIN muestra uno nuevo una sola vez y vuelve a marcar «aún no usado»', async ({
    page,
  }) => {
    await abrir(page, '/admin/delegados', 'Ana Ruiz');
    await tarjeta(page, 'Ana Ruiz').getByRole('button', { name: 'Resetear PIN' }).click();
    await page.getByRole('button', { name: 'Resetear PIN' }).last().click();
    await expect(page.getByText('PIN nuevo')).toBeVisible();
    const pin = (await page.locator('dd.marcador').nth(1).innerText()).trim();
    expect(pin).toMatch(/^\d{6}$/);
    await expect(page.getByText('El PIN anterior ya no funciona.')).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText(pin)).toHaveCount(0);
    await expect(tarjeta(page, 'Ana Ruiz').getByText('PIN aún no usado')).toBeVisible();
  });
});

test.describe('admin: equipos de una liga', () => {
  test('lista los equipos inscritos con su delegado', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await expect(tarjeta(page, 'Los Tigres').getByText(/Pedro Gómez/)).toBeVisible();
    await expect(tarjeta(page, 'Los Tigres').getByText('PIN aún no usado')).toBeVisible();
    await expect(tarjeta(page, 'Deportivo Norte').getByText(/Ana Ruiz/)).toBeVisible();
  });

  test('inscribe un equipo creando club y delegado en un solo paso, y entrega el PIN una vez', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await page.getByRole('button', { name: 'Inscribir equipo' }).click();

    await page.getByRole('group', { name: 'Club' }).getByLabel('Un club nuevo').check();
    await page.getByLabel('Nombre del club').fill('Estrella Roja');
    await page.getByRole('group', { name: 'Delegado' }).getByLabel('Un delegado nuevo').check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('+505 8888 0003');
    await page.getByRole('dialog').getByRole('button', { name: 'Inscribir equipo' }).click();

    await expect(page.getByText('Equipo inscrito')).toBeVisible();
    const pin = (await page.locator('dd.marcador').nth(1).innerText()).trim();
    expect(pin).toMatch(/^\d{6}$/);
    await expect(page.locator('dd.marcador').first()).toHaveText('+50588880003');
    await page.getByRole('button', { name: 'Copiar PIN' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pin);

    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText(pin)).toHaveCount(0);
    await expect(tarjeta(page, 'Estrella Roja').getByText('PIN aún no usado')).toBeVisible();
    await expect(tarjeta(page, 'Estrella Roja').getByText(/Luis Mora/)).toBeVisible();
  });

  test('un delegado que ya lleva un equipo de la categoría no se puede elegir', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await page.getByRole('button', { name: 'Inscribir equipo' }).click();
    const delegado = page.getByRole('combobox', { name: 'Delegado' });
    await expect(
      delegado.getByRole('option', { name: /Pedro Gómez.*ya lleva un equipo de esta categoría/ }),
    ).toBeDisabled();
    await expect(delegado.getByRole('option', { name: /Marta Díaz/ })).toBeEnabled();
  });

  test('solo se ofrecen los clubes que aún no están en la liga', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await page.getByRole('button', { name: 'Inscribir equipo' }).click();
    const club = page.getByRole('combobox', { name: 'Club' });
    await expect(club.getByRole('option', { name: 'Atlético Sur' })).toHaveCount(1);
    await expect(club.getByRole('option', { name: 'Los Tigres' })).toHaveCount(0);
  });

  test('un teléfono ya registrado se rechaza con un mensaje claro', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await page.getByRole('button', { name: 'Inscribir equipo' }).click();
    await page.getByRole('group', { name: 'Club' }).getByLabel('Un club nuevo').check();
    await page.getByLabel('Nombre del club').fill('Club Fantasma');
    await page.getByRole('group', { name: 'Delegado' }).getByLabel('Un delegado nuevo').check();
    await page.getByLabel('Nombre del delegado').fill('Otro Pedro');
    await page.getByLabel('Teléfono (WhatsApp)').fill('+50588880001');
    await page.getByRole('dialog').getByRole('button', { name: 'Inscribir equipo' }).click();
    await expect(page.getByText(/Ya hay un delegado con ese teléfono/)).toBeVisible();
  });

  test('valida el formulario antes de enviar', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await page.getByRole('button', { name: 'Inscribir equipo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Inscribir equipo' }).click();
    await expect(page.getByText('Elige un club.')).toBeVisible();
    await expect(page.getByText('Elige un delegado.')).toBeVisible();
  });

  test('con las inscripciones cerradas no se puede inscribir', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2/equipos', 'Equipos de Clausura Sub-18');
    await expect(page.getByRole('button', { name: 'Inscribir equipo' })).toBeDisabled();
    await expect(page.getByText(/Abre las inscripciones de la liga/)).toBeVisible();
  });

  test('cambia el delegado de un equipo', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1/equipos', 'Equipos de Apertura 2026');
    await tarjeta(page, 'Los Tigres').getByRole('button', { name: 'Cambiar delegado' }).click();
    await page
      .getByRole('combobox', { name: 'Delegado' })
      .selectOption({ label: 'Marta Díaz · +50588880009' });
    await page.getByRole('dialog').getByRole('button', { name: 'Cambiar delegado' }).click();
    await expect(tarjeta(page, 'Los Tigres').getByText(/Marta Díaz/)).toBeVisible();
  });

  test('se llega desde el detalle de la liga', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await page.getByRole('link', { name: 'Equipos inscritos' }).click();
    await expect(page).toHaveURL(/\/admin\/ligas\/ed-1\/equipos$/);
  });
});

test.describe('delegado: login e inicio', () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('no distingue la causa de un fallo; entra y avisa que el PIN es temporal', async ({
    page,
  }) => {
    await page.goto('/delegado/sopa');
    await page.getByLabel('Teléfono').fill('+50588880001');
    await page.getByLabel('PIN').fill('000000');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();

    await page.getByLabel('Teléfono').fill('+505 8888 0001');
    await page.getByLabel('PIN').fill('111111');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/delegado$/);
    await expect(page.getByRole('heading', { name: 'Pedro Gómez' })).toBeVisible();
    await expect(page.getByText('Tu PIN es temporal.')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Los Tigres/ })).toBeVisible();
  });

  test('otro cliente o un teléfono desconocido responden igual', async ({ page }) => {
    await page.goto('/delegado/otra-liga');
    await page.getByLabel('Teléfono').fill('+50588880001');
    await page.getByLabel('PIN').fill('111111');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();
  });

  test('valida el teléfono y el PIN en el cliente', async ({ page }) => {
    await page.goto('/delegado/sopa');
    await page.getByLabel('Teléfono').fill('88888888');
    await page.getByLabel('PIN').fill('12');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText(/código de país/)).toBeVisible();
    await expect(page.getByText('El PIN tiene 6 números.')).toBeVisible();
  });

  test('cambia su PIN: el aviso desaparece y el PIN viejo ya no sirve', async ({ page }) => {
    await page.goto('/delegado/sopa');
    await page.getByLabel('Teléfono').fill('+50588880001');
    await page.getByLabel('PIN').fill('111111');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Tu PIN es temporal.')).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar mi PIN' }).click();
    await page.getByLabel('PIN actual').fill('111111');
    await page.getByLabel('PIN nuevo', { exact: true }).fill('999888');
    await page.getByLabel('Repite el PIN nuevo').fill('999000');
    await page.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText('Los dos PIN nuevos no coinciden.')).toBeVisible();

    await page.getByLabel('Repite el PIN nuevo').fill('999888');
    await page.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText('PIN actualizado.')).toBeVisible();
    await expect(page.getByText('Tu PIN es temporal.')).toHaveCount(0);

    await page.getByRole('button', { name: 'Salir' }).click();
    await page.goto('/delegado/sopa');
    await page.getByLabel('Teléfono').fill('+50588880001');
    await page.getByLabel('PIN').fill('111111');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();
  });

  test('un PIN actual equivocado se marca en su campo', async ({ page }) => {
    await page.goto('/delegado/sopa');
    await page.getByLabel('Teléfono').fill('+50588880001');
    await page.getByLabel('PIN').fill('111111');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('button', { name: 'Cambiar mi PIN' }).click();
    await page.getByLabel('PIN actual').fill('123123');
    await page.getByLabel('PIN nuevo', { exact: true }).fill('999888');
    await page.getByLabel('Repite el PIN nuevo').fill('999888');
    await page.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText('Ese no es tu PIN actual.')).toBeVisible();
  });
});

test('un delegado con dos equipos en categorías distintas los ve y elige entre ellos', async ({
  page,
}) => {
  // 1) El dueño abre las inscripciones de la liga Sub-18 e inscribe a Atlético Sur con Pedro (que ya lleva
  //    un equipo Libre): es otra categoría, así que se permite.
  await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
  await page.getByRole('button', { name: 'Abrir inscripciones' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Inscripciones abiertas').first()).toBeVisible();

  await page.goto('/admin/ligas/ed-2/equipos');
  await page.getByRole('button', { name: 'Inscribir equipo' }).click();
  await page.getByRole('combobox', { name: 'Club' }).selectOption({ label: 'Atlético Sur' });
  await page
    .getByRole('combobox', { name: 'Delegado' })
    .selectOption({ label: 'Pedro Gómez · +50588880001' });
  await page.getByRole('dialog').getByRole('button', { name: 'Inscribir equipo' }).click();
  await expect(tarjeta(page, 'Atlético Sur').getByText(/Pedro Gómez/)).toBeVisible();

  // 2) Pedro entra y ve sus dos equipos.
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('/delegado/sopa');
  await page.getByLabel('Teléfono').fill('+50588880001');
  await page.getByLabel('PIN').fill('111111');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Mis equipos' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await expect(page.getByRole('radio', { name: /Los Tigres/ })).toBeChecked();

  await page.getByRole('radio', { name: /Atlético Sur/ }).click();
  await expect(page.getByRole('radio', { name: /Atlético Sur/ })).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Atlético Sur' })).toBeVisible();
});
