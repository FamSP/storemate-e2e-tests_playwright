// US-19 ดูการแจ้งเตือน (UC-13) และ US-20 ยกเลิกคำสั่งซื้อ (UC-14)
// กรณีหมวดที่ไม่มีการแจ้งเตือน (TC-19-08) อยู่ใน tests/fresh/fresh-account.spec.js
import { test, expect } from '@playwright/test';
import { MSG, PRODUCT_ID } from '../../utils/test-data.js';
import {
  tid, gotoOrders, placeCodOrder, placePendingOrder, cancelOrderViaUI, orderCards, expectToast, orderCard
} from '../../utils/helpers.js';

const FILTERS = { ALL: 'ทั้งหมด', ORDERED: 'คำสั่งซื้อ', REFUNDED: 'คำขอคืนเงิน', STORE: 'ร้านค้า' };
// data-test ในโค้ดสะกดว่า "notification-ดitem" (มีตัว ด ปนอยู่) ต้องใช้ตามนั้น
const items = (page) => page.locator('[data-test="notification-ดitem"]');

async function openNotifications(page) {
  await page.goto('/');
  await page.locator(tid('click-notifications')).click();
  await page.getByText('ดูทั้งหมด').click();
  await expect(page).toHaveURL(/\/notify/);
  await expect(items(page).first().or(page.locator(tid('empty-state')))).toBeVisible();
}

async function selectFilter(page, id) {
  await page.locator(tid(`filter-desktop-${id}`)).click();
  await expect(items(page).first().or(page.locator(tid('empty-state')))).toBeVisible();
}

test.describe('US-19 ดูการแจ้งเตือน', () => {
  test.beforeAll(async ({ browser }) => {
    // สร้างคำสั่งซื้อ 1 รายการเพื่อให้มีการแจ้งเตือนหมวด "คำสั่งซื้อ"
    const page = await browser.newPage({ storageState: 'playwright/.auth/customer.json' });
    await placeCodOrder(page, PRODUCT_ID);
    await page.close();
  });

  test.describe('TS-19-01 ดูการแจ้งเตือนตามหมวดหมู่', () => {
    test('TC-19-01 (TC21001) แสดงการแจ้งเตือนทั้งหมด', async ({ page }) => {
      await openNotifications(page);
      await expect(items(page).first()).toBeVisible();
    });

    test('TC-19-02 (TC21002) แท็บหมวดหมู่การแจ้งเตือน', async ({ page }) => {
      await openNotifications(page);
      for (const [id, label] of Object.entries(FILTERS)) {
        await expect(page.locator(tid(`filter-desktop-${id}`))).toContainText(label);
      }
    });

    test('TC-19-03 (TC21003) หมวด "ทั้งหมด"', async ({ page }) => {
      await openNotifications(page);
      await selectFilter(page, 'ORDERED');
      const ordered = await items(page).count();
      await selectFilter(page, 'ALL');
      expect(await items(page).count()).toBeGreaterThanOrEqual(ordered); // ทั้งหมด >= แต่ละหมวด
    });

    test('TC-19-04 (TC21004) หมวด "คำสั่งซื้อ"', async ({ page }) => {
      await openNotifications(page);
      await selectFilter(page, 'ORDERED');
      await expect(items(page).first()).toBeVisible();
      for (const text of await items(page).allInnerTexts()) expect(text).toMatch(/คำสั่งซื้อ|ออร์เดอร์/);
    });

    for (const [tc, old, id] of [['TC-19-05', 'TC21005', 'REFUNDED'], ['TC-19-06', 'TC21006', 'STORE']]) {
      test(`${tc} (${old}) หมวด "${FILTERS[id]}"`, async ({ page }) => {
        await openNotifications(page);
        await selectFilter(page, 'ALL');
        const all = await items(page).count();
        await selectFilter(page, id);
        const count = await items(page).count();
        expect(count).toBeLessThanOrEqual(all);
        if (count === 0) await expect(page.getByText(MSG.noNotification)).toBeVisible();
      });
    }

    test('TC-19-07 (TC21007) รายละเอียดของการแจ้งเตือน', async ({ page }) => {
      await openNotifications(page);
      const first = items(page).first();
      const lines = (await first.innerText()).split('\n').map((s) => s.trim()).filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(3); // หัวข้อ, รายละเอียด, วันเวลา
      await expect(first).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}.*\d{1,2}:\d{2}/); // วัน/เดือน/ปี และเวลา (th-TH)
    });
  });
});

test.describe('US-20 ยกเลิกคำสั่งซื้อ', () => {
  test.describe('TS-20-01 ยกเลิกคำสั่งซื้อสำเร็จ', () => {
    test('TC-20-01 (TC22001) ยกเลิกคำสั่งซื้อสถานะ "ที่ต้องชำระ"', async ({ page }) => {
      const orderNo = await placePendingOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PENDING');
      await cancelOrderViaUI(page, orderCard(page, orderNo), 'no_longer_want');

      await expectToast(page, MSG.cancelSuccess);
      await expect(page).toHaveURL(/status=CANCELLED/);
      const card = orderCard(page, orderNo);
      await expect(card).toBeVisible();
      await expect(card).toContainText('ไม่ต้องการสินค้านี้แล้ว'); // เหตุผลที่เลือก
    });

    test('TC-20-02 (TC22002) ยกเลิกคำสั่งซื้อเก็บเงินปลายทางสถานะ "ที่ต้องจัดส่ง"', async ({ page }) => {
      const orderNo = await placeCodOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PROCESSING');
      const card = orderNo ? orderCard(page, orderNo) : orderCards(page).first();
      await cancelOrderViaUI(page, card, 'edit_order_details');

      await expectToast(page, MSG.cancelSuccess);
      await expect(page).toHaveURL(/status=CANCELLED/);
      if (orderNo) await expect(orderCard(page, orderNo)).toContainText('สั่งซื้อสินค้าผิด');
    });
  });

  test.describe('TS-20-02 ไม่เลือกเหตุผลการยกเลิก', () => {
    test('TC-20-03 (TC22003) ไม่เลือกเหตุผลในการยกเลิก', async ({ page }) => {
      const orderNo = await placeCodOrder(page, PRODUCT_ID);
      await gotoOrders(page, 'PROCESSING');
      const card = orderNo ? orderCard(page, orderNo) : orderCards(page).first();
      await cancelOrderViaUI(page, card, null);

      await expectToast(page, MSG.cancelReasonRequired);
      await expect(page).toHaveURL(/\/cancel-orders\//);
      await gotoOrders(page, 'PROCESSING');
      if (orderNo) await expect(orderCard(page, orderNo)).toBeVisible(); // สถานะไม่เปลี่ยน
    });
  });
});
