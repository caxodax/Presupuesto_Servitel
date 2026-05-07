import { test, expect } from '@playwright/test';

test.describe('Flujo Contable Completo', () => {
  const userEmail = process.env.E2E_USER_EMAIL || 'fox@gmail.com';
  const userPassword = process.env.E2E_USER_PASSWORD || 'password123';

  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('#email', userEmail);
    await page.fill('#password', userPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Test 2 & 3: Plan de cuentas visible y filtros', async ({ page }) => {
    // 3. Ir a /dashboard/cuentas
    await page.goto('/dashboard/cuentas');
    await expect(page.locator('h1')).toContainText('Plan de Cuentas');
    
    // 4. Confirmar que se ve el árbol de cuentas (al menos las raíces 4, 5, 6)
    // Usamos selectores más precisos para los códigos de cuenta
    await expect(page.locator('span').filter({ hasText: /^4$/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span').filter({ hasText: /^5$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^6$/ })).toBeVisible();

    // Filtros
    await page.fill('input[placeholder*="Buscar"]', 'INGRESOS');
    await expect(page.locator('text=INGRESOS').first()).toBeVisible();
  });

  test('Test 4: Activar/desactivar cuenta', async ({ page }) => {
    await page.goto('/dashboard/cuentas');
    // Buscamos una cuenta y probamos el toggle
    const deactivateBtn = page.getByRole('button', { name: 'Desactivar' }).first();
    await expect(deactivateBtn).toBeVisible({ timeout: 10000 });
    await deactivateBtn.click();
    await expect(page.locator('text=Cuenta desactivada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activar' }).first()).toBeVisible();
  });

  test('Test 6: Mapeo legacy', async ({ page }) => {
    await page.goto('/dashboard/cuentas/mapeo');
    await expect(page.locator('h1')).toContainText('Mapeo Contable');
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('Test 14: Reportes - Pestaña Plan de Cuentas', async ({ page }) => {
    await page.goto('/dashboard/reportes');
    await page.click('button:has-text("Plan de Cuentas")');
    await expect(page.locator('text=Estado de Resultados Jerárquico')).toBeVisible();
    
    const rowCount = await page.locator('table tr').count();
    expect(rowCount).toBeGreaterThan(1);
  });
});
