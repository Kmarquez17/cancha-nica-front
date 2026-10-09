import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido de la Fase 3 con MSW (src/mocks/fase3), según `docs/contrato/FRONT_FASE_03.md`.
 *
 * Datos de ejemplo: clubes Los Tigres, Deportivo Norte y Atlético Sur; delegados Pedro Gómez (+50588880001,
 * PIN 111111, nunca entró), Ana Ruiz (+50588880002, PIN 222222, ya entró, PIN temporal) y Marta Díaz
 * (+50588880009, PIN propio, sin equipos). «Apertura 2026» (Libre, EN_REGISTRO) tiene Los Tigres (Pedro) y
 * Deportivo Norte (Ana); «Clausura Sub-18» (CONFIGURACION) tiene «Tigres Sub-18», del club Los Tigres con Pedro.
 *
 * El rol del admin sale de la cookie `at_admin`: `sesion-de-prueba` = dueño, `sesion-de-prueba-admin` = ADMIN.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'at_admin', value: 'sesion-de-prueba', url: baseURL! }]);
});

const abrir = async (page: Page, ruta: string, esperar: string | RegExp) => {
  await page.goto(ruta);
  await expect(page.getByText(esperar).first()).toBeVisible();
};

const tarjeta = (page: Page, texto: string | RegExp) =>
  page.getByRole('listitem').filter({ hasText: texto });

/** Llama al API simulado desde la propia página (MSW lo intercepta), para preparar el estado de la demo. */
async function api(page: Page, metodo: string, ruta: string, cuerpo?: unknown) {
  return page.evaluate(
    async ([m, r, c]) => {
      const res = await fetch(`/api${r}`, {
        method: m as string,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: c === undefined ? undefined : JSON.stringify(c),
      });
      return res.status;
    },
    [metodo, ruta, cuerpo] as const,
  );
}

const LIBRE = '/admin/ligas/ed-1/equipos';
const SUB18 = '/admin/ligas/ed-2/equipos';
const TITULO_LIBRE = 'Equipos de Apertura 2026';

async function abrirInscripcion(page: Page) {
  await abrir(page, LIBRE, TITULO_LIBRE);
  await page.getByRole('button', { name: 'Inscribir equipo' }).click();
}

const enviarInscripcion = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: 'Inscribir equipo' }).click();

async function pasarALigaEnCurso(page: Page) {
  expect(
    await api(page, 'POST', '/admin/ediciones/ed-1/estado', { a: 'EN_CURSO', forzar: true }),
  ).toBe(200);
}

async function entrarComoDelegado(page: Page, telefono: string, pin: string) {
  await page.goto('/delegado/sopa');
  await page.getByLabel('Teléfono').fill(telefono);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('admin: clubes', () => {
  test('lista en cuántas ligas juega cada club y quién lo registró', async ({ page }) => {
    await abrir(page, '/admin/clubes', 'Los Tigres');
    await expect(tarjeta(page, 'Los Tigres').getByText(/2 equipos/)).toBeVisible();
    await expect(
      tarjeta(page, 'Los Tigres').getByText(/Apertura 2026, Clausura Sub-18/),
    ).toBeVisible();
    await expect(tarjeta(page, 'Atlético Sur').getByText('Sin equipos')).toBeVisible();
    await expect(tarjeta(page, 'Atlético Sur').getByText(/Registrado por/)).toBeVisible();
    // No hay «Nuevo club»: los clubes nacen al inscribir un equipo.
    await expect(page.getByRole('button', { name: /Nuevo club|Crear club/ })).toHaveCount(0);
  });

  test('el buscador no distingue tildes y los archivados salen con el conmutador', async ({
    page,
  }) => {
    await abrir(page, '/admin/clubes', 'Atlético Sur');
    await page.getByLabel('Buscar club').fill('atletico');
    await expect(tarjeta(page, 'Atlético Sur')).toBeVisible();
    await expect(tarjeta(page, 'Los Tigres')).toHaveCount(0);
    await page.getByLabel('Buscar club').fill('');

    await tarjeta(page, 'Atlético Sur').getByRole('button', { name: 'Archivar' }).click();
    await expect(page.getByText('Club archivado.')).toBeVisible();
    await expect(tarjeta(page, 'Atlético Sur')).toHaveCount(0);

    await page.getByLabel('Ver archivados').check();
    await expect(tarjeta(page, 'Atlético Sur').getByText('Archivado')).toBeVisible();
    await tarjeta(page, 'Atlético Sur').getByRole('button', { name: 'Restaurar' }).click();
    await expect(page.getByText('Club restaurado.')).toBeVisible();
    await page.getByLabel('Ver archivados').uncheck();
    await expect(tarjeta(page, 'Atlético Sur')).toBeVisible();
  });
});

test.describe('admin: delegados', () => {
  test('el listado distingue «PIN aún no usado», «PIN temporal» y «PIN propio»', async ({
    page,
  }) => {
    await abrir(page, '/admin/delegados', 'Pedro Gómez');
    await expect(tarjeta(page, 'Pedro Gómez').getByText('PIN aún no usado')).toBeVisible();
    await expect(tarjeta(page, 'Ana Ruiz').getByText('PIN temporal')).toBeVisible();
    await expect(tarjeta(page, 'Marta Díaz').getByText('PIN propio')).toBeVisible();
    await expect(
      tarjeta(page, 'Pedro Gómez').getByText(/Los Tigres · Apertura 2026/),
    ).toBeVisible();
    await expect(
      tarjeta(page, 'Pedro Gómez').getByText(/Tigres Sub-18 · Clausura Sub-18/),
    ).toBeVisible();
  });

  test('resetear el PIN muestra uno nuevo una sola vez y vuelve a marcar «aún no usado»', async ({
    page,
  }) => {
    await abrir(page, '/admin/delegados', 'Ana Ruiz');
    await tarjeta(page, 'Ana Ruiz').getByRole('button', { name: 'Resetear PIN' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Resetear PIN' }).click();
    const pin = (await page.locator('dd.marcador').nth(1).innerText()).trim();
    expect(pin).toMatch(/^\d{6}$/);

    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText(pin)).toHaveCount(0);
    await expect(tarjeta(page, 'Ana Ruiz').getByText('PIN aún no usado')).toBeVisible();
  });

  test('edita el teléfono escribiéndolo local', async ({ page }) => {
    await abrir(page, '/admin/delegados', 'Marta Díaz');
    await tarjeta(page, 'Marta Díaz').getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Teléfono').fill('8888 0020');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta(page, 'Marta Díaz').getByText('+50588880020')).toBeVisible();
  });

  test('un teléfono ya usado por otro delegado se rechaza', async ({ page }) => {
    await abrir(page, '/admin/delegados', 'Marta Díaz');
    await tarjeta(page, 'Marta Díaz').getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Teléfono').fill('8888 0001');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(/ya lleva un equipo|ya está registrado|ya existe/i)).toBeVisible();
  });

  test('desactivar a quien lleva un equipo vivo pide reasignar primero; sin equipos se desactiva', async ({
    page,
  }) => {
    await abrir(page, '/admin/delegados', 'Ana Ruiz');
    await tarjeta(page, 'Ana Ruiz').getByRole('button', { name: 'Desactivar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Desactivar' }).click();
    await expect(page.getByText(/Reasigna sus equipos antes de desactivarlo/)).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('link', { name: /Deportivo Norte · Apertura 2026/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).first().click();

    await tarjeta(page, 'Marta Díaz').getByRole('button', { name: 'Desactivar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Desactivar' }).click();
    await expect(tarjeta(page, 'Marta Díaz').getByText('Desactivado')).toBeVisible();
    await tarjeta(page, 'Marta Díaz').getByRole('button', { name: 'Activar' }).click();
    await expect(tarjeta(page, 'Marta Díaz').getByText('Desactivado')).toHaveCount(0);
  });

  test('un delegado bloqueado por intentos muestra «bloqueado hasta» y se desbloquea', async ({
    page,
  }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto('/delegado/sopa');
      await page.getByLabel('Teléfono').fill('8888 0002');
      await page.getByLabel('PIN').fill('999999');
      await page.getByRole('button', { name: 'Entrar' }).click();
      await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();
    }
    await abrir(page, '/admin/delegados', 'Ana Ruiz');
    await expect(tarjeta(page, 'Ana Ruiz').getByText(/Bloqueado hasta las/)).toBeVisible();
    await tarjeta(page, 'Ana Ruiz').getByRole('button', { name: 'Desbloquear' }).click();
    await expect(tarjeta(page, 'Ana Ruiz').getByText(/Bloqueado hasta las/)).toHaveCount(0);
  });
});

test.describe('admin: equipos de una liga', () => {
  test('lista los equipos con su nombre en la liga, su club y su delegado', async ({ page }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await expect(tarjeta(page, 'Los Tigres').getByText(/Pedro Gómez/)).toBeVisible();
    await expect(tarjeta(page, 'Deportivo Norte').getByText(/Ana Ruiz/)).toBeVisible();
    await expect(tarjeta(page, 'Los Tigres').getByText(/Inscrito por/)).toBeVisible();
    // El mismo club se llama distinto en la otra liga.
    await abrir(page, SUB18, 'Equipos de Clausura Sub-18');
    await expect(tarjeta(page, 'Tigres Sub-18').getByText('Club Los Tigres')).toBeVisible();
  });

  test('inscribe con un delegado nuevo, teléfono local y PIN que se ve una sola vez', async ({
    page,
  }) => {
    await abrirInscripcion(page);
    await page.getByLabel('Nombre del equipo en esta liga').fill('Estrella Roja');
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0003');
    await expect(page.getByText('Se guardará como +50588880003.')).toBeVisible();
    await enviarInscripcion(page);

    const pin = (await page.locator('dd.marcador').nth(1).innerText()).trim();
    expect(pin).toMatch(/^\d{6}$/);
    await expect(page.locator('dd.marcador').first()).toHaveText('+50588880003');
    await page.getByRole('button', { name: 'Copiar PIN' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pin);

    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText(pin)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(pin)).toHaveCount(0);
    await expect(tarjeta(page, 'Estrella Roja').getByText(/Luis Mora/)).toBeVisible();
    // Nunca llega a los listados.
    await abrir(page, '/admin/delegados', 'Luis Mora');
    await expect(page.getByText(pin)).toHaveCount(0);
    await expect(tarjeta(page, 'Luis Mora').getByText('PIN aún no usado')).toBeVisible();
  });

  test('el club se reutiliza en silencio: sin avisos y sin duplicarlo', async ({ page }) => {
    await abrirInscripcion(page);
    // Solo se escribe el nombre del club (sin elegirlo): el API usa «Atlético Sur» en silencio.
    await page.getByLabel('Nombre del equipo en esta liga').fill('atletico  sur');
    await page
      .getByRole('combobox', { name: 'Delegado' })
      .selectOption({ label: 'Marta Díaz · +50588880009' });
    await enviarInscripcion(page);
    await expect(page.getByText(/no se genera PIN/)).toBeVisible();
    await expect(page.getByText(/ya existe/i)).toHaveCount(0);
    await page.getByRole('button', { name: 'Cerrar' }).first().click();

    await abrir(page, '/admin/clubes', 'Atlético Sur');
    await expect(tarjeta(page, 'Atlético Sur').getByText(/1 equipo · Apertura 2026/)).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /Atl.tico/ })).toHaveCount(1);
  });

  test('un teléfono que ya existe reutiliza al delegado y confirma su nombre, sin PIN', async ({
    page,
  }) => {
    await abrirInscripcion(page);
    await page.getByLabel('Nombre del equipo en esta liga').fill('Estrella Roja');
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Otro nombre');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0009');
    await enviarInscripcion(page);
    await expect(
      page.getByText(/delegado existente \(no se genera PIN\): Marta Díaz/),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar PIN' })).toHaveCount(0);
  });

  test('EQUIPO_DUPLICADO: el mismo nombre en la liga se rechaza, en otra liga no', async ({
    page,
  }) => {
    await abrirInscripcion(page);
    await page.getByLabel('Nombre del equipo en esta liga').fill('deportivo  NORTE');
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0003');
    await enviarInscripcion(page);
    await expect(page.getByText(/ya hay un equipo con ese nombre/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).first().click();

    // En la Sub-18 ese nombre está libre: no se avisa nada.
    await abrir(page, SUB18, 'Equipos de Clausura Sub-18');
    await page.getByRole('button', { name: 'Inscribir equipo' }).click();
    await page.getByLabel('Nombre del equipo en esta liga').fill('Deportivo Norte');
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0003');
    await enviarInscripcion(page);
    await expect(page.getByRole('button', { name: 'Copiar PIN' })).toBeVisible();
  });

  test('un delegado que ya lleva un equipo en la liga se rechaza; el teléfono inválido, también', async ({
    page,
  }) => {
    await abrirInscripcion(page);
    await page.getByLabel('Nombre del equipo en esta liga').fill('Club Fantasma');
    await page
      .getByRole('combobox', { name: 'Delegado' })
      .selectOption({ label: 'Pedro Gómez · +50588880001 (ya lleva un equipo en esta liga)' });
    await enviarInscripcion(page);
    await expect(page.getByText('Ese delegado ya lleva un equipo en esta liga.')).toBeVisible();

    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('888');
    await enviarInscripcion(page);
    await expect(page.getByText(/largo válido|teléfono/i).last()).toBeVisible();
  });

  test('valida el formulario antes de enviar', async ({ page }) => {
    await abrirInscripcion(page);
    await enviarInscripcion(page);
    await expect(page.getByText(/nombre del equipo/i).last()).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('renombrar cambia el nombre solo en esa liga', async ({ page }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await tarjeta(page, 'Los Tigres').getByRole('button', { name: 'Renombrar' }).click();
    await page.getByLabel('Nombre del equipo').fill('Tigres FC');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Equipo renombrado.')).toBeVisible();
    await expect(tarjeta(page, 'Tigres FC')).toBeVisible();

    await abrir(page, SUB18, 'Equipos de Clausura Sub-18');
    await expect(tarjeta(page, 'Tigres Sub-18')).toBeVisible();

    // Un nombre ya usado en la liga se rechaza.
    await abrir(page, LIBRE, TITULO_LIBRE);
    await tarjeta(page, 'Tigres FC').getByRole('button', { name: 'Renombrar' }).click();
    await page.getByLabel('Nombre del equipo').fill('deportivo norte');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(/ya hay un equipo con ese nombre/i)).toBeVisible();
  });

  test('retirar pide el motivo y no borra; reincorporar lo devuelve antes de arrancar', async ({
    page,
  }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await tarjeta(page, 'Deportivo Norte').getByRole('button', { name: 'Retirar' }).click();
    await page.getByRole('button', { name: 'Retirar equipo' }).click();
    await expect(page.getByText('Cuéntanos el motivo del retiro.')).toBeVisible();
    await page.getByLabel('Motivo').fill('No pudo pagar la inscripción');
    await page.getByRole('button', { name: 'Retirar equipo' }).click();

    const card = tarjeta(page, 'Deportivo Norte');
    await expect(card.getByText('Retirado', { exact: true })).toBeVisible();
    await expect(card.getByText(/No pudo pagar la inscripción/)).toBeVisible();
    await expect(card.getByRole('button', { name: 'Reincorporar' })).toBeVisible();

    await card.getByRole('button', { name: 'Reincorporar' }).click();
    await expect(card.getByText('Retirado', { exact: true })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Retirar' })).toBeVisible();
  });

  test('un equipo retirado sigue ocupando su nombre en la liga', async ({ page }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await tarjeta(page, 'Deportivo Norte').getByRole('button', { name: 'Retirar' }).click();
    await page.getByLabel('Motivo').fill('Se salió');
    await page.getByRole('button', { name: 'Retirar equipo' }).click();
    await expect(
      tarjeta(page, 'Deportivo Norte').getByText('Retirado', { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Inscribir equipo' }).click();
    await page.getByLabel('Nombre del equipo en esta liga').fill('Deportivo Norte');
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0003');
    await enviarInscripcion(page);
    await expect(page.getByText(/ya hay un equipo con ese nombre/i)).toBeVisible();
  });

  test('cambia el delegado a uno existente (sin PIN) y a uno nuevo (con PIN)', async ({ page }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await tarjeta(page, 'Los Tigres').getByRole('button', { name: 'Cambiar delegado' }).click();
    await page
      .getByRole('combobox', { name: 'Delegado' })
      .selectOption({ label: 'Marta Díaz · +50588880009' });
    await page.getByRole('dialog').getByRole('button', { name: 'Cambiar delegado' }).click();
    await expect(page.getByText(/no se genera PIN/)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(tarjeta(page, 'Los Tigres').getByText(/Marta Díaz/)).toBeVisible();

    await tarjeta(page, 'Los Tigres').getByRole('button', { name: 'Cambiar delegado' }).click();
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0003');
    await page.getByRole('dialog').getByRole('button', { name: 'Cambiar delegado' }).click();
    await expect(page.getByRole('button', { name: 'Copiar PIN' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(tarjeta(page, 'Los Tigres').getByText(/Luis Mora/)).toBeVisible();
  });

  test('con la liga en marcha el dueño agrega un equipo tardío', async ({ page }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await pasarALigaEnCurso(page);
    await page.reload();
    await expect(page.getByText(/entra como tardío/i)).toBeVisible();
    await page.getByRole('button', { name: 'Agregar equipo' }).click();
    await page.getByLabel('Nombre del equipo en esta liga').fill('Tardío FC');
    await page.getByRole('radio', { name: 'Un delegado nuevo' }).check();
    await page.getByLabel('Nombre del delegado').fill('Luis Mora');
    await page.getByLabel('Teléfono (WhatsApp)').fill('8888 0003');
    await page.getByRole('dialog').getByRole('button', { name: 'Agregar equipo' }).click();
    await expect(page.getByRole('button', { name: 'Copiar PIN' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(tarjeta(page, 'Tardío FC').getByText('Tardío', { exact: true })).toBeVisible();
    // Con la liga en marcha ya no se reincorpora.
    await tarjeta(page, 'Tardío FC').getByRole('button', { name: 'Retirar' }).click();
    await expect(page.getByText(/el retiro es definitivo/)).toBeVisible();
  });

  test('un ADMIN no puede agregar equipos tardíos ni retirar con la liga en marcha', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: 'at_admin', value: 'sesion-de-prueba-admin', url: baseURL! },
    ]);
    await abrir(page, LIBRE, TITULO_LIBRE);
    // Antes de arrancar, dueño y admin inscriben.
    await expect(page.getByRole('button', { name: 'Inscribir equipo' })).toBeVisible();
    await pasarALigaEnCurso(page);
    await page.reload();
    await expect(page.getByText(/solo el dueño/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Agregar equipo|Inscribir equipo/ })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Retirar' })).toHaveCount(0);
  });

  test('con la liga pausada no se inscribe', async ({ page }) => {
    await abrir(page, LIBRE, TITULO_LIBRE);
    await pasarALigaEnCurso(page);
    expect(await api(page, 'POST', '/admin/ediciones/ed-1/estado', { a: 'PAUSADA' })).toBe(200);
    await page.reload();
    await expect(page.getByRole('button', { name: /Agregar equipo|Inscribir equipo/ })).toHaveCount(
      0,
    );
    await expect(page.getByText(/ya no admite inscripciones/i)).toBeVisible();
  });

  test('se llega desde el detalle de la liga', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await page.getByRole('link', { name: 'Equipos inscritos' }).click();
    await expect(page).toHaveURL(/\/admin\/ligas\/ed-1\/equipos$/);
  });
});

test.describe('delegado: login e inicio', () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('un fallo de login no dice la causa; con el número local entra y avisa que el PIN es temporal', async ({
    page,
  }) => {
    await entrarComoDelegado(page, '+50588880001', '000000');
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();

    await entrarComoDelegado(page, '8888 0001', '111111');
    await expect(page).toHaveURL(/\/delegado$/);
    await expect(page.getByRole('heading', { name: 'Pedro Gómez' })).toBeVisible();
    await expect(page.getByText('Cambia tu PIN.')).toBeVisible();
  });

  test('otro cliente, un teléfono desconocido o mal escrito responden igual', async ({ page }) => {
    await page.goto('/delegado/otra-liga');
    await page.getByLabel('Teléfono').fill('+50588880001');
    await page.getByLabel('PIN').fill('111111');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();

    await entrarComoDelegado(page, '8888 9999', '111111');
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();
  });

  test('valida el formato antes de enviar', async ({ page }) => {
    await entrarComoDelegado(page, '88', '12');
    await expect(page.getByText('El PIN tiene 6 números.')).toBeVisible();
  });

  test('tras varios intentos fallidos avisa del bloqueo temporal', async ({ page }) => {
    for (let i = 0; i < 5; i++) await entrarComoDelegado(page, '8888 0002', '999999');
    await entrarComoDelegado(page, '8888 0002', '222222');
    await expect(page.getByText(/Demasiados intentos/)).toBeVisible();
  });

  test('un delegado con equipos en dos ligas los ve y elige entre ellos', async ({ page }) => {
    await entrarComoDelegado(page, '8888 0001', '111111');
    await expect(page.getByRole('heading', { name: 'Mis equipos' })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(2);
    await expect(page.getByRole('radio', { name: /^Los Tigres/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Tigres Sub-18/ })).not.toBeChecked();

    await page.getByRole('radio', { name: /Tigres Sub-18/ }).click();
    await expect(page.getByRole('radio', { name: /Tigres Sub-18/ })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Tigres Sub-18' })).toBeVisible();
    await expect(page.getByText(/Clausura Sub-18 · Sub-18/).first()).toBeVisible();
  });

  test('cambia su PIN: rechaza el obvio y el actual errado; luego el aviso desaparece y el viejo no sirve', async ({
    page,
  }) => {
    await entrarComoDelegado(page, '8888 0001', '111111');
    await page.getByRole('button', { name: 'Cambiar mi PIN' }).first().click();
    const dialogo = page.getByRole('dialog');

    await dialogo.getByLabel('PIN actual').fill('111111');
    await dialogo.getByLabel('PIN nuevo', { exact: true }).fill('999888');
    await dialogo.getByLabel('Repite el PIN nuevo').fill('999000');
    await dialogo.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText('Los dos PIN nuevos no coinciden.')).toBeVisible();

    // PIN obvio: lo rechaza el API (PIN_DEBIL).
    await dialogo.getByLabel('PIN nuevo', { exact: true }).fill('123456');
    await dialogo.getByLabel('Repite el PIN nuevo').fill('123456');
    await dialogo.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText(/menos obvio/i).first()).toBeVisible();

    // PIN actual equivocado.
    await dialogo.getByLabel('PIN actual').fill('123123');
    await dialogo.getByLabel('PIN nuevo', { exact: true }).fill('999888');
    await dialogo.getByLabel('Repite el PIN nuevo').fill('999888');
    await dialogo.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText(/PIN actual no es correcto/i)).toBeVisible();

    await dialogo.getByLabel('PIN actual').fill('111111');
    await dialogo.getByRole('button', { name: 'Guardar PIN' }).click();
    await expect(page.getByText('PIN actualizado.')).toBeVisible();
    await expect(page.getByText('Cambia tu PIN.')).toHaveCount(0);

    await page.getByRole('button', { name: 'Salir' }).click();
    await entrarComoDelegado(page, '8888 0001', '111111');
    await expect(page.getByText('Teléfono o PIN incorrectos.')).toBeVisible();
    await entrarComoDelegado(page, '8888 0001', '999888');
    await expect(page.getByRole('heading', { name: 'Pedro Gómez' })).toBeVisible();
  });

  test('un equipo retirado sale marcado y ya no se abre', async ({ page }) => {
    await entrarComoDelegado(page, '8888 0002', '222222');
    await expect(page.getByRole('heading', { name: 'Deportivo Norte' })).toBeVisible();
    expect(
      await api(page, 'POST', '/admin/ediciones/ed-1/equipos/eq-2/retirar', { motivo: 'Se salió' }),
    ).toBe(200);
    await page.reload();
    await expect(page.getByText('Retirado', { exact: true })).toBeVisible();
    await expect(page.getByText(/ya no se puede abrir/)).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
  });

  test('si lo reasignan mientras tiene la pantalla abierta, pierde el acceso a esa liga', async ({
    page,
  }) => {
    await entrarComoDelegado(page, '8888 0002', '222222');
    await expect(page.getByRole('heading', { name: 'Deportivo Norte' })).toBeVisible();
    expect(
      await api(page, 'PATCH', '/admin/ediciones/ed-1/equipos/eq-2/delegado', {
        delegado: { id: 'del-3' },
      }),
    ).toBe(200);
    await page.reload();
    await expect(page.getByText(/Sin ligas activas/)).toBeVisible();
  });
});
