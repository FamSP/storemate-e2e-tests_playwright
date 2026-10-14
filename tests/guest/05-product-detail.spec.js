// US-05 ดูรายละเอียดสินค้า (UC-05) — ชุดหลัก + ชุดเพิ่มเติม รวมในไฟล์เดียว
// ชุดเพิ่มเติมไม่มีในเอกสารเดิม จึงใช้ป้าย (เพิ่มเติม) แทนรหัสเดิม
import { test, expect } from '@playwright/test';
import { PRODUCT_ID } from '../../utils/test-data.js';
import { tid, toNumber, openProduct, readStock, readBuyQuantity, expectToast } from '../../utils/helpers.js';

const COMING_SOON = 'สินค้าจะมีเร็วๆนี้';

test.describe('US-05 ดูรายละเอียดสินค้า', () => {
  test.describe('TS-05-01 เปิดหน้ารายละเอียดสินค้า', () => {
    test('TC-05-01 (TC7001) เข้าหน้ารายละเอียดสินค้าจากหน้ารายการสินค้า', async ({ page }) => {
      await page.goto('/');
      // เลือกสินค้าที่พร้อมขาย (การ์ดที่ไม่มีป้าย "สินค้าจะมีเร็วๆนี้")
      const card = page.locator(tid('product-card')).filter({ hasNotText: COMING_SOON }).first();
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

  test.describe('TS-05-02 เลือกจำนวนก่อนซื้อ', () => {
    test('TC-05-02 (เพิ่มเติม) จำนวนเริ่มต้นเป็น 1 และปุ่ม − กดไม่ได้', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      expect(await readBuyQuantity(page)).toBe(1);
      await expect(page.locator(tid('btn-decrease'))).toBeDisabled();
      await expect(page.locator(tid('btn-increase'))).toBeEnabled();
    });

    test('TC-05-03 (เพิ่มเติม) กด + แล้วกด − จำนวนเพิ่มและลดถูกต้อง', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      const stock = await readStock(page);
      test.skip(stock < 3, `สต็อกเหลือ ${stock} ชิ้น ไม่พอทดสอบ`);
      await page.locator(tid('btn-increase')).click();
      await page.locator(tid('btn-increase')).click();
      expect(await readBuyQuantity(page)).toBe(3);
      await expect(page.locator(tid('btn-decrease'))).toBeEnabled();
      await page.locator(tid('btn-decrease')).click();
      expect(await readBuyQuantity(page)).toBe(2);
    });
  });

  test.describe('TS-05-03 สินค้าที่สต็อกหมด', () => {
    test('TC-05-04 (เพิ่มเติม) สินค้าสต็อกหมดกดเพิ่มลงรถเข็นและสั่งซื้อไม่ได้', async ({ page }) => {
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      const soldOut = page.locator(tid('product-card')).filter({ hasText: COMING_SOON }).first();
      test.skip(!(await soldOut.isVisible()), 'ตอนนี้ไม่มีสินค้าที่สต็อกหมด');
      await soldOut.click();

      await expect(page.locator(tid('product-name'))).toBeVisible();
      expect(await readStock(page)).toBe(0);
      await expect(page.locator(tid('btn-increase'))).toBeDisabled();
      await expect(page.locator(tid('btn-add-to-cart'))).toBeDisabled();
      await expect(page.locator(tid('btn-buy-cart'))).toBeDisabled();
    });
  });

  test.describe('TS-05-04 สินค้าที่ไม่มีในระบบ', () => {
    test('TC-05-05 (เพิ่มเติม) เปิดรหัสสินค้าที่ไม่มีอยู่จริง', async ({ page }) => {
      await page.goto('/product/999999');
      await expect(page.getByText('ไม่พบสินค้า', { exact: true })).toBeVisible();
      await expect(page.locator(tid('btn-add-to-cart'))).toHaveCount(0);
    });
  });

  test.describe('TS-05-05 การนำทางและความถูกต้องของข้อมูล', () => {
    test('TC-05-06 (เพิ่มเติม) ลิงก์ "หน้าหลัก" พากลับหน้าแรก', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      await page.locator(tid('click-home')).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator(tid('product-card')).first()).toBeVisible();
    });

    test('TC-05-07 (เพิ่มเติม) ชื่อและราคาตรงกับการ์ดในหน้าค้นหา', async ({ page }) => {
      await page.goto('/search');
      const card = page.locator(`${tid('product-card')}[href="/product/${PRODUCT_ID}"]`);
      await expect(card).toBeVisible();
      const cardName = (await card.locator('h2').innerText()).trim();
      const cardPrice = toNumber((await card.innerText()).match(/฿\s*([\d,]+)/)[1]);
      await card.click();

      await expect(page.locator(tid('product-name'))).toHaveText(cardName);
      await expect(page.getByText(`฿${cardPrice.toLocaleString()}`).first()).toBeVisible();
    });

    test('TC-05-08 (เพิ่มเติม) ยังไม่เข้าสู่ระบบแล้วกด "สั่งซื้อสินค้า"', async ({ page }) => {
      await openProduct(page, PRODUCT_ID);
      await page.locator(tid('btn-buy-cart')).click();
      await expectToast(page, 'กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
