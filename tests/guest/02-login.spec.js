// US-02 เข้าสู่ระบบ (UC-02)
import { test, expect } from '@playwright/test';
import { MSG, CUSTOMER, SUSPENDED } from '../../utils/test-data.js';
import { loginViaUI, expectToast, tid } from '../../utils/helpers.js';

test.describe('US-02 เข้าสู่ระบบ', () => {
  test.describe('TS-02-01 เข้าสู่ระบบด้วยข้อมูลที่ถูกต้อง', () => {
    test('TC-02-01 (TC2001) เข้าสู่ระบบสำเร็จด้วยบัญชี Customer', async ({ page }) => {
      await page.goto('/');
      await page.locator(tid('login-btn')).click();
      await expect(page).toHaveURL(/\/login/);
      await page.locator(tid('email')).fill(CUSTOMER.email);
      await page.locator(tid('password')).fill(CUSTOMER.password);
      await page.locator(tid('btn-submit')).click();

      await expectToast(page, MSG.loginSuccess);
      await expect(page).toHaveURL(/\/$/); // Customer ไปหน้าร้าน (Store Page)
      await expect(page.locator(tid('login-btn'))).toBeHidden();
    });
  });

  test.describe('TS-02-02 เข้าสู่ระบบไม่สำเร็จ', () => {
    test('TC-02-02 (TC2004) อีเมลหรือรหัสผ่านไม่ถูกต้อง', async ({ page }) => {
      await loginViaUI(page, CUSTOMER.email, 'Wrong1234');
      await expectToast(page, MSG.loginInvalid);
      await expect(page).toHaveURL(/\/login/);
    });

    test('TC-02-03 (TC2005) เข้าสู่ระบบด้วยบัญชีที่ถูกระงับ', async ({ page }) => {
      test.skip(!SUSPENDED.email, 'ไม่ได้กำหนด SUSPENDED_EMAIL ใน .env');
      await loginViaUI(page, SUSPENDED.email, SUSPENDED.password);
      await expectToast(page, MSG.loginSuspended);
      await expect(page).toHaveURL(/\/login/);
    });

    test('TC-02-04 (TC2006) กรอกข้อมูลไม่ครบ', async ({ page }) => {
      await loginViaUI(page, '', '');
      await expectToast(page, MSG.loginIncomplete);
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
