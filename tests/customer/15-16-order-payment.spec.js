// US-15 สั่งซื้อสินค้า (UC-10) และ US-16 ชำระเงิน (UC-11)
// หมายเหตุ: เทสในไฟล์นี้สร้างคำสั่งซื้อจริงและตัดสต็อกสินค้า PRODUCT_ID
import { test, expect } from '@playwright/test';
import { MSG, PRODUCT_ID, CARD, UNAVAILABLE_PRODUCT_ID } from '../../utils/test-data.js';
import {
  tid, buyNow, placeCodOrder, placePendingOrder, openProduct, readStock, addToCart, clearCart, gotoCart,
  cartRow, gotoAddresses, gotoOrders, expectToast, toNumber, orderCard, orderCards
} from '../../utils/helpers.js';

async function productInfo(page, id) {
  await openProduct(page, id);
  return {
    name: (await page.locator(tid('product-name')).innerText()).trim(),
    price: toNumber(await page.getByText(/฿\s*[\d,]+/).first().innerText()),
    stock: await readStock(page),
  };
}

async function defaultAddressText(page) {
  await gotoAddresses(page);
  const card = page.locator(tid('address-detail'));
  return (await card.first().innerText()).trim();
}

async function expectSummary(page, { name, qty, total }) {
  await expect(page.locator(tid('shipping-address'))).not.toContainText('ยังไม่มีข้อมูลที่อยู่');
  const item = page.locator(tid('order-item')).first();
  await expect(item.locator(tid('product-name'))).toContainText(name.slice(0, 15));
  await expect(item.locator(tid('product-quantity'))).toContainText(String(qty));
  await expect.poll(async () => toNumber(await page.locator(tid('order-total-price-desktop')).textContent())).toBe(total);
  const methods = page.locator(tid('payment-method'));
  await expect(methods).toContainText('พร้อมเพย์ (PromptPay)');
  await expect(methods).toContainText('บัตรเครดิต / บัตรเดบิต');
  await expect(methods).toContainText('เก็บเงินปลายทาง');
  await expect(page.locator(tid('btn-confirm-payment-desktop'))).toBeVisible();
}

async function openAddCardPage(page) {
  await buyNow(page, PRODUCT_ID);
  await page.locator(tid('select-credit-desktop')).click();
  await page.locator(tid('btn-add-credit-card-desktop')).click();
  await expect(page).toHaveURL(/\/add-credit-card/);
}

/** ช่องบัตรเป็น iframe ของ Stripe */
async function fillCard(page, { name, number, expiry, cvc }) {
  await page.locator(tid('card-name-input')).fill(name);
  const stripeInput = (id) => page.locator(tid(id)).frameLocator('iframe').getByRole('textbox');
  await stripeInput('card-number-input').fill(number);
  await stripeInput('card-expiry-input').fill(expiry);
  await stripeInput('card-cvc-input').fill(cvc);
  await page.locator(tid('confirm-add-card-btn')).click();
}

test.describe('US-15 สั่งซื้อสินค้า', () => {
  test.describe('TS-15-01 ไปหน้าสรุปคำสั่งซื้อ', () => {
    test('TC-15-01 (TC17001) สั่งซื้อจากหน้ารายละเอียดสินค้า', async ({ page }) => {
      const address = await defaultAddressText(page);
      const p = await productInfo(page, PRODUCT_ID);
      await buyNow(page, PRODUCT_ID);
      await expect(page.locator(tid('address'))).toContainText(address.split(' ต.')[0]);
      await expectSummary(page, { name: p.name, qty: 1, total: p.price });
    });

    test('TC-15-02 (TC17002) สั่งซื้อจากรถเข็นสินค้า', async ({ page }) => {
      const p = await productInfo(page, PRODUCT_ID);
      await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
      await addToCart(page, PRODUCT_ID, 2);
      await gotoCart(page);
      await page.locator(tid(`checkbox-product-${PRODUCT_ID}`)).check();
      await page.locator(tid('btn-payment')).click();

      await expect(page).toHaveURL(/\/payment$/);
      await expectSummary(page, { name: p.name, qty: 2, total: p.price * 2 });
    });
  });

  test.describe('TS-15-02 ย้อนกลับก่อนยืนยันคำสั่งซื้อ', () => {
    test('TC-15-03 (TC17003) ย้อนกลับจากหน้าสรุปที่มาจากรถเข็น', async ({ page }) => {
      await clearCart(page, { keep: [UNAVAILABLE_PRODUCT_ID] });
      await addToCart(page, PRODUCT_ID, 1);
      await gotoOrders(page);
      const ordersBefore = await orderCards(page).count();
      await gotoCart(page);
      await page.locator(tid(`checkbox-product-${PRODUCT_ID}`)).check();
      await page.locator(tid('btn-payment')).click();
      await expect(page).toHaveURL(/\/payment$/);

      await page.goBack();

      await expect(page).toHaveURL(/\/shopping-cart/);
      await expect(cartRow(page, PRODUCT_ID)).toBeVisible();
      await gotoOrders(page);
      await expect(orderCards(page)).toHaveCount(ordersBefore);
    });

    test('TC-15-04 (TC17004) ย้อนกลับจากหน้าสรุปที่มาจากหน้ารายละเอียดสินค้า', async ({ page }) => {
      const { stock } = await productInfo(page, PRODUCT_ID);
      await page.locator(tid('btn-buy-cart')).click();
      await expect(page).toHaveURL(/\/payment$/);

      await page.goBack();

      await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_ID}$`));
      expect(await readStock(page)).toBe(stock); // ไม่ตัดสต็อก
    });
  });
});

test.describe('US-16 ชำระเงิน', () => {
  test.describe('TS-16-01 ชำระเงินสำเร็จ', () => {
    test('TC-16-01 (TC18001) ชำระแบบเก็บเงินปลายทาง (COD)', async ({ page }) => {
      const { stock } = await productInfo(page, PRODUCT_ID);
      const orderNo = await placeCodOrder(page, PRODUCT_ID);

      await gotoOrders(page, 'PROCESSING');
      if (orderNo) await expect(orderCard(page, orderNo)).toBeVisible();
      await openProduct(page, PRODUCT_ID);
      expect(await readStock(page)).toBe(stock - 1);
    });

    test('TC-16-02 (TC18002) ชำระด้วยบัตรเครดิต/เดบิต (บัตรทดสอบ Stripe)', async ({ page }) => {
      await openAddCardPage(page);
      await fillCard(page, CARD);
      await expect(page).toHaveURL(/\/payment$/);
      await page.locator(tid('select-credit-desktop')).click();
      await page.locator(tid('btn-select-card-method-desktop')).click();
      await page.locator(tid('btn-confirm-payment-desktop')).click();

      await expectToast(page, MSG.orderSuccess);
      await expect(page).toHaveURL(/\/orders/);
    });

    test('TC-16-03 (TC18003) ชำระด้วย PromptPay (ตรวจการสร้าง QR)', async ({ page }) => {
      test.info().annotations.push({
        type: 'manual-step',
        description: 'การสแกน QR และยืนยันการชำระเงินจริงต้องทดสอบด้วยมือ (Manual)',
      });
      const p = await productInfo(page, PRODUCT_ID);
      await buyNow(page, PRODUCT_ID);
      await page.locator(tid('select-promptpay-desktop')).click();
      await page.locator(tid('btn-confirm-payment-desktop')).click();

      await expect(page).toHaveURL(/\/payment-qr/);
      await expect(page.locator(tid('promptpay-qr-image'))).toBeVisible();
      await expect(page.locator(tid('payment-countdown'))).toHaveText(/\d{2}:\d{2}/);
      await expect.poll(async () => toNumber(await page.locator(tid('payment-total-price-desktop')).textContent())).toBe(p.price);
    });
  });

  test.describe('TS-16-02 ข้อมูลการชำระเงินไม่ถูกต้อง', () => {
    test('TC-16-04 (TC18004) ไม่เลือกช่องทางการชำระเงิน', async ({ page }) => {
      await buyNow(page, PRODUCT_ID);
      await page.locator(tid('btn-confirm-payment-desktop')).click();
      await expectToast(page, MSG.selectPayment);
      await expect(page).toHaveURL(/\/payment$/);
    });

    test('TC-16-05 (TC18005) ชื่อบนบัตรเป็นตัวเลขหรืออักขระพิเศษ', async ({ page }) => {
      await openAddCardPage(page);
      await fillCard(page, { ...CARD, name: '12345@#' });
      await expectToast(page, MSG.cardNameLetters);
      await expect(page).toHaveURL(/\/add-credit-card/);
    });

    test('TC-16-06 (TC18006) หมายเลขบัตรไม่ครบ', async ({ page }) => {
      await openAddCardPage(page);
      await fillCard(page, { ...CARD, number: '424242424242' });
      await expectToast(page, MSG.cardIncomplete);
      await expect(page).toHaveURL(/\/add-credit-card/);
    });

    test('TC-16-07 (TC18007) วันหมดอายุบัตรไม่ถูกต้อง', async ({ page }) => {
      await openAddCardPage(page);
      await fillCard(page, { ...CARD, expiry: '13/30', cvc: '000' });
      await expectToast(page, MSG.cardExpiry);
      await expect(page).toHaveURL(/\/add-credit-card/);
    });
  });

  test.describe('TS-16-03 PromptPay ไม่เสร็จสมบูรณ์', () => {
    test('TC-16-08 (TC18008) ปิดหน้าต่าง QR Code ก่อนชำระเงิน', async ({ page }) => {
      const orderNo = await placePendingOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PENDING');
      const card = orderCard(page, orderNo);
      await expect(card).toBeVisible();
      await expect(card.locator(tid('btn-retry-payment'))).toBeVisible();
    });

    test('TC-16-09 (TC18009) QR Code หมดอายุ', async ({ page }) => {
      await page.clock.install(); // ควบคุมเวลาของหน้าเว็บ เพื่อเร่งให้ QR หมดอายุ
      await buyNow(page, PRODUCT_ID);
      await page.locator(tid('select-promptpay-desktop')).click();
      await page.locator(tid('btn-confirm-payment-desktop')).click();
      await expect(page.locator(tid('promptpay-qr-image'))).toBeVisible();
      const orderNo = await page.evaluate(() => localStorage.getItem('orderNo'));

      await page.clock.fastForward('30:00');

      await expectToast(page, MSG.qrExpired);
      await expect(page).toHaveURL(/\/orders/);
      await gotoOrders(page, 'PENDING');
      const card = orderCard(page, orderNo);
      await expect(card).toBeVisible(); // ยังอยู่ "ที่ต้องชำระ"
      await expect(card.locator(tid('btn-retry-payment'))).toBeVisible(); // ชำระใหม่ได้
    });
  });
});
