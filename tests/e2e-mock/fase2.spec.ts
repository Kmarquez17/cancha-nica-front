import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido de la Fase 2 con MSW siguiendo el contrato real (`docs/contrato/FRONT_FASE_02.md`). Cada prueba usa un
 * navegador nuevo, así que la base simulada (que vive en sessionStorage) parte de los datos de ejemplo: categorías
 * Libre y Sub-18 (y Sub-15 archivada), ligas «Apertura 2026» (inscripciones abiertas) y «Clausura Sub-18» (en
 * configuración), MESA1 activa con Apertura y MESA2 bloqueada.
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

  test('las edades van de 5 a 80', async ({ page }) => {
    await abrir(page, '/admin/categorias', 'Sub-18');
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre').fill('Niños');
    await page.getByLabel('Edad máxima').fill('3');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Escribe una edad entre 5 y 80, o déjala vacía.')).toBeVisible();
  });

  test('cuenta las ligas de cada categoría', async ({ page }) => {
    await abrir(page, '/admin/categorias', 'Sub-18');
    await expect(tarjeta(page, 'Libre').getByText(/En 1 liga/)).toBeVisible();
  });

  test('archivar oculta la categoría y restaurar la devuelve', async ({ page }) => {
    await abrir(page, '/admin/categorias', 'Sub-18');
    await tarjeta(page, 'Sub-18').getByRole('button', { name: 'Archivar' }).click();
    await expect(tarjeta(page, 'Sub-18')).toHaveCount(0);
    await page.getByLabel('Mostrar archivadas').check();
    await tarjeta(page, 'Sub-18').getByRole('button', { name: 'Restaurar' }).click();
    await page.getByLabel('Mostrar archivadas').uncheck();
    await expect(tarjeta(page, 'Sub-18')).toHaveCount(1);
  });
});

test.describe('admin: crear una liga', () => {
  test('pide solo lo básico, muestra el preset y abre el detalle', async ({ page }) => {
    await abrir(page, '/admin/ligas/nueva', 'Nueva liga');
    await page.getByLabel('Nombre', { exact: true }).fill('Copa Veteranos');
    await page.getByLabel('Categoría').selectOption({ label: 'Sub-18' });
    await page.getByLabel('Modalidad').selectOption('FUTBOL_11');
    await expect(page.getByText('Plantel de 14 a 30 jugadores')).toBeVisible();
    await expect(page.getByText('No se registran faltas')).toBeVisible();

    await page.getByRole('button', { name: 'Crear liga' }).click();
    await expect(page).toHaveURL(/\/admin\/ligas\/ed-/);
    await expect(page.getByRole('heading', { name: 'Copa Veteranos' })).toBeVisible();
    // El preset llegó cargado desde el servidor.
    await expect(page.getByLabel('Plantel máximo')).toHaveValue('30');
    // Las edades de la categoría se copian a la liga.
    await expect(page.getByLabel('Edad máxima')).toHaveValue('17');
  });

  test('valida el nombre y la categoría antes de enviar', async ({ page }) => {
    await abrir(page, '/admin/ligas/nueva', 'Nueva liga');
    await page.getByRole('button', { name: 'Crear liga' }).click();
    await expect(page.getByText('Escribe el nombre (mínimo 3 letras).')).toBeVisible();
    await expect(page.getByText('Elige una categoría.')).toBeVisible();
  });

  test('una categoría archivada no aparece para crear ligas', async ({ page }) => {
    await abrir(page, '/admin/ligas/nueva', 'Nueva liga');
    const categoria = page.getByLabel('Categoría');
    await expect(categoria.getByRole('option', { name: 'Libre' })).toHaveCount(1);
    await expect(categoria.getByRole('option', { name: 'Sub-15' })).toHaveCount(0);
  });
});

test.describe('admin: configurar una liga', () => {
  test('una regla rota se marca en su campo y no se envía', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await page.getByLabel('Plantel máximo').fill('5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText(/No puede ser menor que los convocados por partido/)).toBeVisible();
  });

  test('cambiar la modalidad carga las reglas de la nueva', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await page.getByLabel('Modalidad').selectOption('FUTBOL_11');
    await expect(page.getByText(/Cargamos las reglas de Fútbol 11/)).toBeVisible();
    await expect(page.getByLabel('Plantel máximo')).toHaveValue('30');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Plantel máximo')).toHaveValue('30');
    await expect(page.getByLabel('Modalidad')).toHaveValue('FUTBOL_11');
  });

  test('trae las sanciones y los costos del plan', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
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

  test('eliminatorias, tercer puesto y equipos mínimos se guardan', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await page.getByLabel('Clasificados a eliminatorias').selectOption('8');
    await page.getByLabel('Jugar partido por el tercer puesto').check();
    await page.getByLabel('Equipos mínimos para empezar').fill('6');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Clasificados a eliminatorias')).toHaveValue('8');
    await expect(page.getByLabel('Jugar partido por el tercer puesto')).toBeChecked();
    await expect(page.getByLabel('Equipos mínimos para empezar')).toHaveValue('6');
  });

  test('las edades se pueden borrar', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await expect(page.getByLabel('Edad máxima')).toHaveValue('17');
    await page.getByLabel('Edad máxima').fill('');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Edad máxima')).toHaveValue('');
  });

  test('con inscripciones abiertas lo que dice la API como fijo queda deshabilitado', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await expect(page.getByLabel('Plantel máximo')).toBeEnabled();
    await expect(page.getByLabel('Dirección pública (slug)')).toBeDisabled();
    await expect(page.getByLabel('Fecha de inicio')).toBeDisabled();
    await expect(page.getByLabel('Categoría')).toBeDisabled();
  });
});

test.describe('admin: estado de la liga', () => {
  test('los botones salen de lo que permite la API', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await expect(page.getByRole('button', { name: 'Empezar la liga' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pausar liga' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finalizar liga' })).toHaveCount(0);
  });

  test('empezar sin requisitos muestra el checklist; el dueño puede forzar y las reglas se congelan', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await page.getByRole('button', { name: 'Empezar la liga' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    const requisitos = page.getByRole('list', { name: 'Requisitos' });
    await expect(requisitos.getByText(/Faltan equipos confirmados/)).toBeVisible();
    await expect(requisitos.getByText('(se puede saltar)').first()).toBeVisible();
    await page.getByRole('button', { name: 'Forzar de todos modos' }).click();
    await expect(page.locator('[data-estado="EN_CURSO"]')).toBeVisible();

    await expect(page.getByLabel('Plantel máximo')).toBeDisabled();
    await expect(page.getByLabel('Multa por roja')).toBeDisabled();
    await expect(page.getByLabel('Nombre', { exact: true })).toBeEnabled();
  });

  test('lo que no se puede saltar no ofrece «Forzar»', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await empezarForzando(page);
    await page.getByRole('button', { name: 'Pasar a eliminatorias' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    const requisitos = page.getByRole('list', { name: 'Requisitos' });
    await expect(requisitos.getByText(/Define cuántos equipos clasifican/)).toBeVisible();
    await expect(requisitos.getByText('(no se puede saltar)')).toBeVisible();
    await expect(page.getByText(/Hay requisitos que no se pueden saltar/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forzar de todos modos' })).toHaveCount(0);
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

  test('pausar y reanudar vuelven al estado anterior', async ({ page }) => {
    await abrir(page, '/admin/ligas/ed-1', 'Estado de la liga');
    await page.getByRole('button', { name: 'Pausar liga' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-estado="PAUSADA"]')).toBeVisible();
    await page.getByRole('button', { name: 'Reanudar liga' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-estado="EN_REGISTRO"]')).toBeVisible();
  });

  test('archivar una liga en configuración la saca del listado, no se edita y se restaura', async ({
    page,
  }) => {
    await abrir(page, '/admin/ligas/ed-2', 'Estado de la liga');
    await page.getByRole('button', { name: 'Archivar liga' }).click();
    await expect(page.getByText('Liga archivada.').first()).toBeVisible();
    await expect(page.getByText(/Esta liga está archivada/)).toBeVisible();
    await expect(page.getByLabel('Nombre', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Abrir inscripciones' })).toHaveCount(0);

    await abrir(page, '/admin/ligas', 'Apertura 2026');
    await expect(page.getByText('Clausura Sub-18')).toHaveCount(0);

    await page.goto('/admin/ligas/ed-2');
    await page.getByRole('button', { name: 'Restaurar liga' }).click();
    await expect(page.getByLabel('Nombre', { exact: true })).toBeEnabled();
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
    await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\//,
    );
    await page.getByRole('button', { name: 'Copiar PIN' }).click();
    await expect(page.getByText('Copiado al portapapeles.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pin);

    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(page.getByText(pin)).toHaveCount(0);
  });

  test('resetear el PIN muestra uno nuevo y levanta el bloqueo', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA2');
    const mesa2 = tarjeta(page, 'MESA2');
    await expect(mesa2.getByText(/Bloqueada hasta las/)).toBeVisible();
    await mesa2.getByRole('button', { name: 'Resetear PIN' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Resetear PIN' }).click();
    await expect(page.getByText('PIN nuevo')).toBeVisible();
    await expect(page.getByText('El PIN anterior ya no funciona.')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).first().click();
    await expect(mesa2.getByText('Activa', { exact: true })).toBeVisible();
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

  test('desactivar una mesa y volver a activarla', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    const mesa1 = tarjeta(page, 'MESA1');
    await mesa1.getByRole('button', { name: 'Desactivar' }).click();
    await expect(mesa1.getByText('Desactivada')).toBeVisible();
    await mesa1.getByRole('button', { name: 'Activar' }).click();
    await expect(mesa1.getByText('Activa', { exact: true })).toBeVisible();
  });

  test('las ligas de una mesa se asignan y se quitan', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    const mesa1 = tarjeta(page, 'MESA1');
    await expect(mesa1.getByText('Apertura 2026')).toBeVisible();
    await mesa1.getByRole('button', { name: 'Ligas' }).click();
    const apertura = page.getByRole('checkbox', { name: /Apertura 2026/ });
    await expect(apertura).toBeChecked();
    await apertura.uncheck();
    await page.getByRole('checkbox', { name: /Clausura Sub-18/ }).check();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ligas de la mesa actualizadas.')).toBeVisible();
    await expect(mesa1.getByText('Clausura Sub-18')).toBeVisible();
    await expect(mesa1.getByText('Apertura 2026')).toHaveCount(0);
  });

  test('cambiar el operador no toca el usuario', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA1');
    const mesa1 = tarjeta(page, 'MESA1');
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
    const mesa1 = tarjeta(page, 'MESA1');
    await mesa1.getByRole('button', { name: 'Operador' }).click();
    await page.getByLabel('Nombre de quien opera').fill('');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(mesa1.getByText('Sin nombre de operador')).toBeVisible();
  });

  test('desbloquear una mesa bloqueada', async ({ page }) => {
    await abrir(page, '/admin/mesas', 'MESA2');
    const mesa2 = tarjeta(page, 'MESA2');
    await expect(mesa2.getByText(/Bloqueada hasta las/)).toBeVisible();
    await mesa2.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(mesa2.getByText('Activa', { exact: true })).toBeVisible();
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
    await expect(page.getByText(/Libre · Fútbol sala/)).toBeVisible();
  });

  test('un cliente que no existe responde igual que un PIN errónea', async ({ page }) => {
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
    await expect(page.getByText(/Demasiados intentos/)).toBeVisible();
  });

  test('validación en el cliente: usuario y PIN con formato', async ({ page }) => {
    await page.goto('/mesa/sopa');
    await page.getByLabel('Usuario').fill('juan');
    await page.getByLabel('PIN').fill('12');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Escribe tu usuario, por ejemplo MESA1.')).toBeVisible();
    await expect(page.getByText('El PIN tiene 6 números.')).toBeVisible();
  });

  test('salir cierra la sesión y vuelve al inicio', async ({ page }) => {
    await page.goto('/mesa/sopa');
    await page.getByLabel('Usuario').fill('MESA1');
    await page.getByLabel('PIN').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { name: /MESA1/ })).toBeVisible();
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
