// US-07 จัดการสินค้าในรถเข็น (UC-07)
import { test, expect } from '@playwright/test';
import { MSG, PRODUCT_ID, SECOND_PRODUCT_ID, UNAVAILABLE_PRODUCT_ID } from '../../utils/test-data.js';
import {
  tid, addToCart, clearCart, gotoCart, cartRow, openProduct, readStock, expectToast, confirmDialog, toNumber,
} from '../../utils/helpers.js';

const qty = (row) => row.locator(tid('item-quantity'));
const subtotal = async (row) => toNumber(await row.locator(tid('subtotal-product')).textContent());

test.describe('US-07 จัดการสินค้าในรถเข็น', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: 'playwright/.auth/customer.json' });
    await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
    await page.close();
  });

  test.describe('TS-07-01 ปรับจำนวนสินค้า', () => {
    test('TC-07-01 (TC9001) เพิ่มจำนวนสินค้าในรถเข็น', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 1);
      await gotoCart(page);
      const row = cartRow(page, PRODUCT_ID);
      const before = await subtotal(row);

      await row.locator(tid('increase-product')).click();

      await expect(qty(row)).toHaveText('2');
      await expect.poll(() => subtotal(row)).toBe(before * 2);
    });

    test('TC-07-02 (TC9003) ลดจำนวนสินค้าในรถเข็น', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 2);
      await gotoCart(page);
      const row = cartRow(page, PRODUCT_ID);
      const before = await subtotal(row);

      await row.locator(tid('decrease-product')).click();

      await expect(qty(row)).toHaveText('1');
      await expect.poll(() => subtotal(row)).toBe(before / 2);
    });

    test('TC-07-03 (TC9004) ลดจำนวนจนเหลือ 0 ชิ้น', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 1);
      await gotoCart(page);
      const row = cartRow(page, PRODUCT_ID);

      await row.locator(tid('decrease-product')).click();

      await expect(page.getByText(MSG.confirmRemoveItem)).toBeVisible();
      await confirmDialog(page, 'ยกเลิก');
      await expect(qty(row)).toHaveText('1'); // กดยกเลิก สินค้ายังอยู่
    });
  });

  test.describe('TS-07-02 เพิ่มจำนวนเกินสต็อกในรถเข็น', () => {
    test('TC-07-04 (TC9002) เพิ่มจำนวนสินค้าเกินสต็อก', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      const stock = await readStock(page);
      test.skip(stock > 150, `สต็อกมี ${stock} ชิ้น มากเกินไปสำหรับการกดทีละชิ้น`);
      await addToCart(page, PRODUCT_ID, stock); // ใส่รถเข็นเท่ากับสต็อก

      await gotoCart(page);
      const row = cartRow(page, PRODUCT_ID);
      await expect(qty(row)).toHaveText(String(stock));
      await row.locator(tid('increase-product')).click();

      await expectToast(page, MSG.cartStockLimit);
      await expect(qty(row)).toHaveText(String(stock));
    });
  });

  test.describe('TS-07-03 ลบสินค้าออกจากรถเข็น', () => {
    test('TC-07-05 (TC9005) ลบสินค้ารายการเดียว', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 1);
      await addToCart(page, SECOND_PRODUCT_ID, 1);
      await gotoCart(page);

      await cartRow(page, PRODUCT_ID).locator(tid('btn-remove-item')).click();
      await expect(page.getByText(MSG.confirmRemoveItem)).toBeVisible();
      await confirmDialog(page);

      await expectToast(page, MSG.itemRemoved);
      await expect(page.locator(tid(`checkbox-product-${PRODUCT_ID}`))).toHaveCount(0);
      await expect(page.locator(tid(`checkbox-product-${SECOND_PRODUCT_ID}`))).toBeVisible();
    });

    test('TC-07-06 (TC9006) ลบสินค้าที่เลือกทั้งหมด', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 1);
      await addToCart(page, SECOND_PRODUCT_ID, 1);
      await gotoCart(page);

      await page.locator(tid('radio-all-product')).click();
      await page.getByRole('button', { name: 'ลบออกทั้งหมด' }).click();
      await expect(page.getByText(MSG.confirmRemoveAll)).toBeVisible();
      await confirmDialog(page);

      await expectToast(page, MSG.itemsRemoved);
      for (const id of [PRODUCT_ID, SECOND_PRODUCT_ID]) await expect(page.locator(tid(`checkbox-product-${id}`))).toHaveCount(0);
      // ถ้าไม่มีสินค้าไม่พร้อมจำหน่ายค้างอยู่ รถเข็นต้องว่าง
      if (!UNAVAILABLE_PRODUCT_ID) await expect(page.getByText(MSG.emptyCart)).toBeVisible();
    });
  });

  test.describe('TS-07-04 ลบโดยไม่เลือกสินค้า', () => {
    test('TC-07-07 (TC9007) กดลบออกทั้งหมดโดยไม่เลือกสินค้า', async ({ page }) => {
      await addToCart(page, PRODUCT_ID, 1);
      await addToCart(page, SECOND_PRODUCT_ID, 1);
      await gotoCart(page);
      const rows = page.locator('[data-test^="checkbox-product-"]');
      const before = await rows.count();

      await page.getByRole('button', { name: 'ลบออกทั้งหมด' }).click();

      await expectToast(page, MSG.selectItemFirst);
      await expect(rows).toHaveCount(before);
    });
    // TC-07-08 (TC9008) อยู่ใน tests/guest/06-cart-guest.spec.js เพราะต้องยังไม่เข้าสู่ระบบ
  });
});
