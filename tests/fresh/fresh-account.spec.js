// เทสที่ต้องใช้บัญชีใหม่ที่ยังไม่มีข้อมูล (ไม่มีที่อยู่ / คำสั่งซื้อ / การแจ้งเตือน)
// และเทสที่ทำให้ออกจากระบบ (เปลี่ยนอีเมล) จึงแยกออกจากบัญชีลูกค้าหลัก
import { test, expect } from '@playwright/test';
import { MSG, uniqueUser } from '../../utils/test-data.js';
import {
  tid, registerViaUI, loginViaUI, createFreshCustomer, gotoAddresses, addAddress, gotoOrders, expectToast, confirmDialog,
} from '../../utils/helpers.js';

let user;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  user = uniqueUser('fresh');
  await registerViaUI(page, user);
  await page.close();
});

test.beforeEach(async ({ page }) => {
  await loginViaUI(page, user.email, user.password);
  await expectToast(page, MSG.loginSuccess);
  await expect(page).not.toHaveURL(/\/login/);
});

test.describe.serial('บัญชีใหม่', () => {
  test('TS-11-02 / TC-11-02 (TC13002) แสดงผลเมื่อไม่มีที่อยู่', async ({ page }) => {
    await gotoAddresses(page);
    await expect(page.getByText(MSG.noAddress)).toBeVisible();
    await expect(page.locator(tid('address-detail'))).toHaveCount(0);
    await expect(page.locator(tid('btn-add-address'))).toBeVisible();
  });

  test('TS-14-02 / TC-14-04 (TC16004) หน้าจอเมื่อไม่มีที่อยู่เหลือ', async ({ page }) => {
    await gotoAddresses(page);
    await expect(page.getByText(MSG.noAddress)).toBeVisible();
  });

  test('TS-17-02 / TC-17-03 (TC19003) ไม่มีประวัติคำสั่งซื้อ', async ({ page }) => {
    await gotoOrders(page);
    await expect(page.getByText(MSG.noOrders)).toBeVisible();
  });

  test('TS-19-02 / TC-19-08 (TC21008) ไม่พบการแจ้งเตือนในหมวดหมู่ที่เลือก', async ({ page }) => {
    await page.goto('/notify');
    await page.locator(tid('filter-desktop-REFUNDED')).click();
    await expect(page.locator(tid('empty-state'))).toBeVisible();
    await expect(page.getByText(MSG.noNotification)).toBeVisible();
  });

  // รันหลังสุดในกลุ่มนี้ เพราะเพิ่มที่อยู่ให้บัญชี
  test('TS-14-02 / TC-14-03 (TC16003) ลบที่อยู่สุดท้ายที่เหลืออยู่', async ({ page }) => {
    const street = await addAddress(page, `99/9 หมู่ 1 QA-last-${Date.now()}`);
    await expect(page.locator(tid('address-detail'))).toHaveCount(1);

    await page.locator('[data-test^="btn-delete-address-"]').first().click();

    await expectToast(page, MSG.lastAddress);
    await expect(page.getByText(street)).toBeVisible(); // ที่อยู่ยังอยู่
  });
});

test.describe('เปลี่ยนอีเมล', () => {
  test('TS-10-01 / TC-10-02 (TC12002) แก้ไขอีเมลสำเร็จ', async ({ page, context }) => {
    // ใช้บัญชีแยกอีกบัญชี เพราะระบบจะออกจากระบบหลังเปลี่ยนอีเมล
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    const own = await createFreshCustomer(page, 'email');
    const newEmail = uniqueUser('newmail').email;

    await page.goto('/profile');
    await page.locator(tid('btn-change-email')).click();
    await page.locator(tid('input-email')).fill(newEmail);
    await page.locator(tid('edit-modal-save-button')).click();

    await expectToast(page, MSG.profileSaved);
    await expect(page).toHaveURL(/\/login/); // ระบบให้เข้าสู่ระบบใหม่

    await loginViaUI(page, newEmail, own.password);
    await expectToast(page, MSG.loginSuccess); // เข้าสู่ระบบด้วยอีเมลใหม่ได้
  });
});
