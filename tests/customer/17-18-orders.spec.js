// US-17 ดูคำสั่งซื้อของตนเอง และ US-18 ดูรายละเอียดคำสั่งซื้อ (UC-12)
// กรณีไม่มีคำสั่งซื้อ (TC-17-03) อยู่ใน tests/fresh/fresh-account.spec.js
import { test, expect } from '@playwright/test';
import { ORDER_STATUS, PRODUCT_ID } from '../../utils/test-data.js';
import {
  tid, gotoOrders, orderCards, placeCodOrder, placePendingOrder, cancelOrderViaUI, gotoAddresses, openProduct, toNumber, orderCard
} from '../../utils/helpers.js';

/** การ์ดคำสั่งซื้อจาก orderNo ถ้าไม่มีให้ใช้ใบแรก */
const cardOf = (page, orderNo) => (orderNo ? orderCard(page, orderNo) : orderCards(page).first());

/** ข้ามเทสถ้าไม่มีคำสั่งซื้อในสถานะนั้น (สถานะที่ต้องให้ร้านเปลี่ยนให้ เช่น ที่ต้องได้รับ / สำเร็จ / คืนเงิน) */
async function requireOrders(page, status, filter) {
  await gotoOrders(page, status);
  let cards = orderCards(page);
  if (filter) cards = cards.filter({ has: page.locator(tid(filter)) });
  test.skip((await cards.count()) === 0, `บัญชีนี้ไม่มีคำสั่งซื้อสถานะ "${ORDER_STATUS[status]}"${filter ? ` ที่มี ${filter}` : ''} ให้เจ้าของร้านเปลี่ยนสถานะก่อน`);
  return cards;
}

test.describe('US-17 ดูคำสั่งซื้อของตนเอง', () => {
  test.describe('TS-17-01 ดูและกรองคำสั่งซื้อ', () => {
    test('TC-17-01 (TC19001) ดูรายการคำสั่งซื้อทั้งหมด', async ({ page }) => {
      await gotoOrders(page);
      if ((await orderCards(page).count()) === 0) {
        await placeCodOrder(page, PRODUCT_ID);
        await gotoOrders(page);
      }
      const card = orderCards(page).first();
      await expect(card.locator(tid('order-item-name')).first()).not.toBeEmpty();
      await expect(card.locator(tid('order-item-quantity')).first()).toContainText(/\d/);
      await expect(card.locator(tid('order-total'))).toBeVisible(); // "ยอดรวมสุทธิ"
      await expect(card).toContainText(/ยอดรวมสุทธิ\s*฿\s*[\d,.]+/);
      await expect(card).toContainText(new RegExp(Object.values(ORDER_STATUS).slice(1).join('|')));
    });

    test('TC-17-02 (TC19002) กรองคำสั่งซื้อตามสถานะ', async ({ page }) => {
      await placeCodOrder(page, PRODUCT_ID);
      await gotoOrders(page);
      await page.getByText(ORDER_STATUS.PROCESSING, { exact: true }).first().click();

      await expect(page).toHaveURL(/status=PROCESSING/);
      const cards = orderCards(page);
      await expect(cards.first()).toBeVisible();
      for (const text of await cards.allInnerTexts()) expect(text).toContain(ORDER_STATUS.PROCESSING);
    });
  });

  test.describe('TS-17-03 ปุ่มดำเนินการตามสถานะ', () => {
    test('TC-17-04 (TC19004) ปุ่มของสถานะ "ที่ต้องชำระ"', async ({ page }) => {
      const orderNo = await placePendingOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PENDING');
      const card = cardOf(page, orderNo);
      await expect(card.locator(tid('btn-retry-payment'))).toHaveText('ชำระเงิน');
      await expect(card.locator(tid('btn-cancel-order'))).toHaveText('ยกเลิกคำสั่งซื้อ');
    });

    test('TC-17-05 (TC19005) ปุ่มของสถานะ "ที่ต้องจัดส่ง" (เก็บเงินปลายทาง)', async ({ page }) => {
      const orderNo = await placeCodOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PROCESSING');
      const card = cardOf(page, orderNo);
      await expect(card.locator(tid('btn-cancel-order'))).toHaveText('ยกเลิกคำสั่งซื้อ');
      await expect(card.locator(tid('btn-retry-payment'))).toHaveCount(0);
    });

    test('TC-17-06 (TC19006) ปุ่มของสถานะ "ที่ต้องได้รับ"', async ({ page }) => {
      const cards = await requireOrders(page, 'RECEIVED');
      const card = cards.first();
      // ตาม UC-12 สถานะนี้ไม่มีปุ่มชำระเงิน/ยกเลิก
      await expect(card.locator(tid('btn-retry-payment'))).toHaveCount(0);
      await expect(card.locator(tid('btn-cancel-order'))).toHaveCount(0);
    });

    test('TC-17-07 (TC19007) ปุ่มของสถานะ "สำเร็จ" ที่ยังไม่รีวิว', async ({ page }) => {
      const card = (await requireOrders(page, 'COMPLETED', 'btn-add-review')).first();
      await expect(card.locator(tid('btn-add-review'))).toHaveText('เขียนรีวิว');
      await expect(card.locator(tid('btn-retry-orders'))).toHaveText('ซื้ออีกครั้ง');
    });

    test('TC-17-08 (TC19008) ปุ่มของสถานะ "สำเร็จ" ที่รีวิวแล้ว', async ({ page }) => {
      const card = (await requireOrders(page, 'COMPLETED', 'btn-see-review')).first();
      await expect(card.locator(tid('btn-see-review'))).toHaveText('ดูรีวิว');
      await expect(card.locator(tid('btn-retry-orders'))).toHaveText('ซื้ออีกครั้ง');
      await expect(card.locator(tid('btn-add-review'))).toHaveCount(0);
    });

    test('TC-17-09 (TC19009) ปุ่มของสถานะ "ยกเลิก"', async ({ page }) => {
      const orderNo = await placePendingOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PENDING');
      await cancelOrderViaUI(page, cardOf(page, orderNo));
      await expect(page).toHaveURL(/status=CANCELLED/);
      const card = cardOf(page, orderNo);
      await expect(card.locator(tid('btn-retry-orders'))).toHaveText('ซื้ออีกครั้ง');
      await expect(card.locator(tid('btn-cancel-order'))).toHaveCount(0);
    });

    test('TC-17-10 (TC190010) ปุ่มของสถานะ "คืนเงิน/คืนสินค้า"', async ({ page }) => {
      const card = (await requireOrders(page, 'REFUNDED')).first();
      await expect(card.locator(tid('btn-retry-orders'))).toHaveText('ซื้ออีกครั้ง');
    });
  });
});

test.describe('US-18 ดูรายละเอียดคำสั่งซื้อ', () => {
  let orderNo;
  let product;
  let street;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: 'playwright/.auth/customer.json' });
    await gotoAddresses(page);
    street = (await page.locator(tid('address-detail')).first().innerText()).split(' ต.')[0].trim();
    await openProduct(page, PRODUCT_ID);
    product = {
      name: (await page.locator(tid('product-name')).innerText()).trim(),
      price: toNumber(await page.getByText(/฿\s*[\d,]+/).first().innerText()),
    };
    orderNo = await placeCodOrder(page, PRODUCT_ID);
    await page.close();
  });

  async function openDetail(page) {
    await gotoOrders(page, 'PROCESSING');
    await cardOf(page, orderNo).locator(tid('btn-order-details')).click();
    await expect(page).toHaveURL(/\/orders\/[^/?]+$/);
  }

  test('TS-18-01 / TC-18-01 (TC20001) เปิดหน้ารายละเอียดคำสั่งซื้อ', async ({ page }) => {
    await openDetail(page);
    if (orderNo) await expect(page).toHaveURL(new RegExp(`/orders/${orderNo}$`));
    await expect(page.getByText('สถานะปัจจุบัน')).toBeVisible();
  });

  test('TS-18-01 / TC-18-02 (TC20002) ความถูกต้องของข้อมูลในคำสั่งซื้อ', async ({ page }) => {
    await openDetail(page);
    await expect(page.getByText(product.name.slice(0, 15)).first()).toBeVisible();
    await expect(page.getByText(`ราคาต่อหน่วย ฿ ${product.price}`).first()).toBeVisible();
    await expect(page.getByText('ยอดรวมสุทธิ').first()).toBeVisible();
    await expect(page.getByText(/ช่องทาง(การ)?ชำระเงิน/).first()).toBeVisible();
  });

  test('TS-18-01 / TC-18-03 (TC20004) ข้อมูลผู้รับสินค้า', async ({ page }) => {
    await openDetail(page);
    await expect(page.getByText('ชื่อผู้สั่งซื้อ')).toBeVisible();
    await expect(page.getByText('เบอร์โทรศัพท์').first()).toBeVisible();
    await expect(page.getByText('ที่อยู่สำหรับการจัดส่ง')).toBeVisible();
    await expect(page.getByText(street).first()).toBeVisible(); // ตรงกับที่อยู่เริ่มต้นของบัญชี
  });
});
