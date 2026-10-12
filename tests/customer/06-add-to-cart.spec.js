// US-06 เพิ่มสินค้าเข้ารถเข็น (UC-07)
import { test, expect } from '@playwright/test';
import { MSG, PRODUCT_ID, UNAVAILABLE_PRODUCT_ID } from '../../utils/test-data.js';
import {
  tid, openProduct, addToCart, clearCart, gotoCart, cartRow, readStock, readBuyQuantity, expectToast, cartBadge,
} from '../../utils/helpers.js';

test.describe('US-06 เพิ่มสินค้าเข้ารถเข็น', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: 'playwright/.auth/customer.json' });
    await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
    await page.close();
  });

  test.describe('TS-06-01 เพิ่มสินค้าเข้ารถเข็นสำเร็จ', () => {
    test('TC-06-01 (TC8001) เพิ่มสินค้าเข้ารถเข็นสำเร็จ', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      const badgeBefore = await cartBadge(page);
      await page.locator(tid('btn-add-to-cart')).click();
      await expectToast(page, MSG.addedToCart);
      await expect.poll(() => cartBadge(page)).toBe(badgeBefore + 1);

      await gotoCart(page);
      await expect(cartRow(page, PRODUCT_ID).locator(tid('item-quantity'))).toHaveText('1');
    });
  });

  test.describe('TS-06-03 จำนวนเกินสต็อก', () => {
    test('TC-06-03 (TC8003) จำนวนสินค้าในสต็อกไม่เพียงพอ', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      const stock = await readStock(page);
      test.skip(stock > 150, `สต็อกมี ${stock} ชิ้น มากเกินไปสำหรับการกดทีละชิ้น ให้ใช้สินค้าที่สต็อกน้อยกว่า`);

      const increase = page.locator(tid('btn-increase'));
      for (let i = 1; i < stock; i++) await increase.click();

      // ระบบไม่ให้เลือกเกินสต็อก: จำนวนหยุดที่สต็อกและปุ่ม + ถูกปิด
      expect(await readBuyQuantity(page)).toBe(stock);
      await expect(increase).toBeDisabled();
    });

    test('TC-06-04 (TC8004) จำนวนในรถเข็นรวมกับจำนวนที่เพิ่มเกินสต็อก', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 1);

      await openProduct(page, PRODUCT_ID);
      const stock = await readStock(page);
      test.skip(stock > 150, `สต็อกมี ${stock} ชิ้น มากเกินไปสำหรับการกดทีละชิ้น`);
      for (let i = 1; i < stock; i++) await page.locator(tid('btn-increase')).click();
      await page.locator(tid('btn-add-to-cart')).click(); // 1 ในรถเข็น + stock ชิ้น > stock

      await expectToast(page, MSG.alreadyInCart);
      await gotoCart(page);
      await expect(cartRow(page, PRODUCT_ID).locator(tid('item-quantity'))).toHaveText('1');
    });
  });
});
