import { expect, test } from '@playwright/test';

test('la home muestra API conectada con MSW', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/API conectada/)).toBeVisible();
});

test('el cambio de tema pone la clase dark en html', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
