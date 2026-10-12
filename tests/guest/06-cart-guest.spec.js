// กรณีผู้ใช้ยังไม่เข้าสู่ระบบ ของ US-06 และ US-07
import { test, expect } from '@playwright/test';
import { MSG, PRODUCT_ID } from '../../utils/test-data.js';
import { tid, openProduct, expectToast } from '../../utils/helpers.js';

test.describe('US-06 เพิ่มสินค้าเข้ารถเข็น (ยังไม่เข้าสู่ระบบ)', () => {
  test('TS-06-02 / TC-06-02 (TC8002) บังคับเข้าสู่ระบบก่อนเพิ่มสินค้าเข้ารถเข็น', async ({ page }) => {
    await openProduct(page, PRODUCT_ID);
    await page.locator(tid('btn-add-to-cart')).click();
    await expectToast(page, MSG.loginBeforeCart);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('US-07 จัดการสินค้าในรถเข็น (ยังไม่เข้าสู่ระบบ)', () => {
  test('TS-07-04 / TC-07-08 (TC9008) เปิดหน้ารถเข็นโดยยังไม่เข้าสู่ระบบ', async ({ page }) => {
    // ผู้ที่ยังไม่เข้าสู่ระบบจะไม่เห็นไอคอนรถเข็นบนแถบเมนู จึงเปิด URL ตรง
    await page.goto('/');
    await expect(page.locator(tid('login-btn'))).toBeVisible();
    await expect(page.locator(tid('click-shop-cart'))).toBeHidden();
    await page.goto('/shopping-cart');
    await expect(page).toHaveURL(/\/login/);
  });
});
