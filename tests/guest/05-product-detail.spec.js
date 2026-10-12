// US-05 ดูรายละเอียดสินค้า (UC-05)
import { test, expect } from '@playwright/test';
import { tid } from '../../utils/helpers.js';

test.describe('US-05 ดูรายละเอียดสินค้า', () => {
  test.describe('TS-05-01 เปิดหน้ารายละเอียดสินค้า', () => {
    test('TC-05-01 (TC7001) เข้าหน้ารายละเอียดสินค้าจากหน้ารายการสินค้า', async ({ page }) => {
      await page.goto('/');
      // เลือกสินค้าที่พร้อมขาย (การ์ดที่ไม่มีป้าย "สินค้าจะมีเร็วๆนี้")
      const card = page.locator(tid('product-card')).filter({ hasNotText: 'สินค้าจะมีเร็วๆนี้' }).first();
      await expect(card).toBeVisible();
      const href = await card.getAttribute('href');
      const cardText = await card.innerText();
      await card.click();

      await expect(page).toHaveURL(new RegExp(`${href}$`));
      const name = page.locator(tid('product-name'));
      await expect(name).toBeVisible();
      // ชื่อบนการ์ดต้องตรงกับชื่อในหน้ารายละเอียด
      expect(cardText).toContain((await name.innerText()).trim().slice(0, 15));
      await expect(page.locator('img').first()).toBeVisible(); // รูปภาพ
      await expect(page.getByText(/฿\s*[\d,]+/).first()).toBeVisible(); // ราคา
      await expect(page.getByText(/มีสินค้าทั้งหมด\s*\d+\s*ชิ้น/)).toBeVisible(); // สต็อก
      await expect(page.locator(tid('btn-add-to-cart'))).toBeVisible();
      await expect(page.locator(tid('btn-buy-cart'))).toBeVisible();
    });
  });
});
