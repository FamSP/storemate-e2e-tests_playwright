import { test as setup, expect } from '@playwright/test';
import { AUTH_FILE } from '../playwright.config.js';
import { CUSTOMER, MSG } from '../utils/test-data.js';
import { loginViaUI, expectToast, ensureAddress } from '../utils/helpers.js';

setup('เข้าสู่ระบบบัญชีลูกค้าและเตรียมข้อมูลพื้นฐาน', async ({ page }) => {
  await loginViaUI(page, CUSTOMER.email, CUSTOMER.password);
  await expectToast(page, MSG.loginSuccess);
  await expect(page).not.toHaveURL(/\/login/);

  // การสั่งซื้อต้องมีที่อยู่จัดส่งอย่างน้อย 1 รายการ
  await ensureAddress(page);

  await page.context().storageState({ path: AUTH_FILE });
});
