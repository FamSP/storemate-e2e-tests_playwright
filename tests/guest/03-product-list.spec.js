// US-03 ดูรายการสินค้า (UC-05)
import { test, expect } from '@playwright/test';
import { MSG } from '../../utils/test-data.js';

const SECTIONS = ['promotion-section', 'soap-section', 'drinks-section', 'shampoo-section'];

test.describe('US-03 ดูรายการสินค้า', () => {
  test('TS-03-01 / TC-03-01 (TC5001) แสดงรายการสินค้าตามหมวดหมู่', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-test="product-card"]').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    for (const id of SECTIONS) {
      const section = page.locator(`#${id}`);
      await expect(section, `ต้องแสดงหมวด ${id}`).toBeVisible();
      const cards = section.locator('[data-test="product-card"]');
      const empty = section.getByText(MSG.emptyCategory);
      await expect(cards.first().or(empty)).toBeVisible();
      // แต่ละหมวดแสดงสินค้าไม่เกิน 4 รายการ
      expect(await cards.count()).toBeLessThanOrEqual(4);
    }
    expect(await page.locator('[data-test="product-card"]').count()).toBeGreaterThan(0);
  });

  test('TS-03-02 / TC-03-02 (TC5002) หมวดหมู่ที่ไม่มีสินค้า', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-test="product-card"]').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    const emptySection = page.locator('section').filter({ hasText: MSG.emptyCategory }).first();
    test.skip(!(await emptySection.isVisible()), 'ตอนนี้ทุกหมวดมีสินค้า จึงทดสอบกรณีหมวดว่างไม่ได้');
    await expect(emptySection.getByText(MSG.emptyCategory)).toBeVisible();
    await expect(emptySection.locator('[data-test="product-card"]')).toHaveCount(0);
  });
});
