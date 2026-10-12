// US-08 ดูสินค้าทั้งหมดในรถเข็น (UC-07)
import { test, expect } from '@playwright/test';
import { MSG, PRODUCT_ID, SECOND_PRODUCT_ID, UNAVAILABLE_PRODUCT_ID } from '../../utils/test-data.js';
import { tid, addToCart, clearCart, gotoCart, cartRow, openProduct, toNumber } from '../../utils/helpers.js';

const products = {};

test.describe('US-08 ดูสินค้าทั้งหมดในรถเข็น', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
    for (const [id, q] of [[PRODUCT_ID, 1], [SECOND_PRODUCT_ID, 2]]) {
      await openProduct(page, id);
      products[id] = {
        name: (await page.locator(tid('product-name')).innerText()).trim(),
        price: toNumber((await page.getByText(/฿\s*[\d,]+/).first().innerText())),
        qty: q,
      };
      await addToCart(page, id, q);
    }
    await gotoCart(page);
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: 'playwright/.auth/customer.json' });
    await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
    await page.close();
  });

  test.describe('TS-08-01 แสดงรายการและยอดรวม', () => {
    test('TC-08-01 (TC10001) แสดงรายการสินค้าในรถเข็นครบ', async ({ page }) => {
      await expect(page.locator('[data-test^="checkbox-product-"]')).toHaveCount(UNAVAILABLE_PRODUCT_ID ? 3 : 2);
      for (const id of [PRODUCT_ID, SECOND_PRODUCT_ID]) await expect(cartRow(page, id)).toBeVisible();
    });

    test('TC-08-02 (TC10002) รายละเอียดสินค้าในรถเข็น', async ({ page }) => {
      for (const [id, p] of Object.entries(products)) {
        const row = cartRow(page, id);
        await expect(row).toContainText(p.name);
        await expect(row.locator('img').first()).toBeVisible();
        await expect(row).toContainText(`฿ ${p.price}`);
        await expect(row.locator(tid('item-quantity'))).toHaveText(String(p.qty));
        await expect(row).toContainText('พร้อมจำหน่าย');
      }
    });

    test('TC-08-03 (TC10003) การคำนวณยอดรวม', async ({ page }) => {
      await page.locator(tid('radio-all-product')).click();
      const expected = Object.values(products).reduce((sum, p) => sum + p.price * p.qty, 0);
      await expect.poll(async () => toNumber(await page.locator(tid('total-price')).textContent())).toBe(expected);
    });

    test('TC-08-04 (TC10004) ปุ่มดำเนินการในหน้ารถเข็น', async ({ page }) => {
      for (const id of [PRODUCT_ID, SECOND_PRODUCT_ID]) {
        const row = cartRow(page, id);
        await expect(row.locator(tid('increase-product'))).toBeEnabled();
        await expect(row.locator(tid('decrease-product'))).toBeEnabled();
      }
      const order = page.locator(tid('btn-payment'));
      await expect(order).toBeDisabled(); // ยังไม่เลือกสินค้า
      await page.locator(tid(`checkbox-product-${PRODUCT_ID}`)).check();
      await expect(order).toBeEnabled();
      await order.click();
      await expect(page).toHaveURL(/\/payment$/);
    });
  });

  test.describe('TS-08-02 มีสินค้าไม่พร้อมจำหน่ายในรถเข็น', () => {
    test('TC-08-05 (TC10005) สินค้าไม่พร้อมจำหน่ายเลือกไม่ได้', async ({ page }) => {
      test.skip(!UNAVAILABLE_PRODUCT_ID, 'ไม่ได้กำหนด UNAVAILABLE_PRODUCT_ID (ต้องเพิ่มสินค้าเข้ารถเข็นก่อนแล้วให้เจ้าของร้านเปลี่ยนสถานะ)');
      const row = cartRow(page, UNAVAILABLE_PRODUCT_ID);
      await expect(row).toContainText(MSG.unavailable);
      await expect(page.locator(tid(`checkbox-product-${UNAVAILABLE_PRODUCT_ID}`))).toBeDisabled();
    });
  });
});
