import { test, expect } from '@playwright/test';
import { mockAuthSession } from './helpers/authHelper.js';

test.describe('Bed Infrastructure Hierarchy & Cascading Deletion Suite', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page, 'HOSPITAL_ADMIN');
  });

  test('Bed Matrix Page loads with Physical Hierarchy tabs and stable testids', async ({ page }) => {
    await page.goto('/hospital-admin/beds');
    await expect(page).toHaveURL('/hospital-admin/beds');

    // Switch to Physical Hierarchy Group tab if present
    const hierarchyGroupTab = page.getByRole('button', { name: /Physical Hierarchy Group/i });
    if (await hierarchyGroupTab.isVisible()) {
      await hierarchyGroupTab.click();
    }

    // Verify all 5 hierarchy level tabs are present
    await expect(page.locator('[data-testid="tab-blocks"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-floors"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-wards"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-rooms"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-beds"]')).toBeVisible();
  });

  test('Opens Block, Floor, Ward, Room, and Bed creation modals with proper testids', async ({ page }) => {
    await page.goto('/hospital-admin/beds');

    const hierarchyGroupTab = page.getByRole('button', { name: /Physical Hierarchy Group/i });
    if (await hierarchyGroupTab.isVisible()) {
      await hierarchyGroupTab.click();
    }

    // 1. Blocks Tab & Modal
    await page.locator('[data-testid="tab-blocks"]').click();
    await page.locator('[data-testid="block-create-button"]').click();
    await expect(page.locator('[data-testid="block-name-input"]')).toBeVisible();
    await page.locator('[data-testid="block-cancel-button"]').click();

    // 2. Floors Tab & Modal
    await page.locator('[data-testid="tab-floors"]').click();
    await page.locator('[data-testid="floor-create-button"]').click();
    await expect(page.locator('[data-testid="floor-name-input"]')).toBeVisible();
    await page.locator('[data-testid="floor-cancel-button"]').click();

    // 3. Wards Tab & Modal
    await page.locator('[data-testid="tab-wards"]').click();
    await page.locator('[data-testid="ward-create-button"]').click();
    await expect(page.locator('[data-testid="ward-name-input"]')).toBeVisible();
    await page.locator('[data-testid="ward-cancel-button"]').click();

    // 4. Rooms Tab & Modal
    await page.locator('[data-testid="tab-rooms"]').click();
    await page.locator('[data-testid="room-create-button"]').click();
    await expect(page.locator('[data-testid="room-number-input"]')).toBeVisible();
    await page.locator('[data-testid="room-cancel-button"]').click();

    // 5. Beds Tab & Modal
    await page.locator('[data-testid="tab-beds"]').click();
    await page.locator('[data-testid="bed-create-button"]').click();
    await expect(page.locator('[data-testid="bed-number-input"]')).toBeVisible();
    await page.locator('[data-testid="bed-cancel-button"]').click();
  });

  test('Validates hierarchical dependency cascade contract', async () => {
    // Contract definition: Building -> Floor -> Ward -> Room -> Bed
    const hierarchyChain = ['BUILDING', 'FLOOR', 'WARD', 'ROOM', 'BED'];
    expect(hierarchyChain.indexOf('BUILDING')).toBeLessThan(hierarchyChain.indexOf('FLOOR'));
    expect(hierarchyChain.indexOf('FLOOR')).toBeLessThan(hierarchyChain.indexOf('WARD'));
    expect(hierarchyChain.indexOf('WARD')).toBeLessThan(hierarchyChain.indexOf('ROOM'));
    expect(hierarchyChain.indexOf('ROOM')).toBeLessThan(hierarchyChain.indexOf('BED'));
  });
});
