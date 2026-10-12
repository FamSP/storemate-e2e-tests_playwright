// US-01 สมัครสมาชิก (UC-01)
import { test, expect } from '@playwright/test';
import { MSG, CUSTOMER, EXISTING, VALID_PASSWORD, uniqueUser } from '../../utils/test-data.js';
import { fillRegisterForm, registerViaUI, loginViaUI, expectToast } from '../../utils/helpers.js';

test.describe('US-01 สมัครสมาชิก', () => {
  test.describe('TS-01-01 สมัครสมาชิกด้วยข้อมูลครบถ้วนและถูกต้อง', () => {
    test('TC-01-01 (TC1001) สมัครสมาชิกสำเร็จ', async ({ page }) => {
      const user = uniqueUser('register');
      await registerViaUI(page, user); // ตรวจ toast "ลงทะเบียนสำเร็จ" และไปหน้า /login
      await loginViaUI(page, user.email, user.password);
      await expectToast(page, MSG.loginSuccess);
      await expect(page).not.toHaveURL(/\/login/);
    });
  });

  test.describe('TS-01-02 ไม่กรอกข้อมูลในช่องบังคับ', () => {
    const cases = [
      ['TC-01-02 (TC1002) ไม่กรอกชื่อ-นามสกุล', { name: '' }, MSG.requiredName],
      ['TC-01-03 (TC1003) ไม่กรอกอีเมล', { email: '' }, MSG.requiredEmail],
      ['TC-01-04 (TC1004) ไม่กรอกเบอร์โทรศัพท์', { phone: '' }, MSG.requiredPhone],
      ['TC-01-05 (TC1005) ไม่กรอกรหัสผ่าน', { password: '' }, MSG.requiredPassword],
      ['TC-01-06 (TC1006) ไม่กรอกยืนยันรหัสผ่าน', { confirm: '' }, MSG.requiredConfirm],
    ];
    for (const [title, override, message] of cases) {
      test(title, async ({ page }) => {
        const u = uniqueUser('required');
        await fillRegisterForm(page, { ...u, confirm: u.password, ...override });
        await expect(page.getByText(message, { exact: true })).toBeVisible();
        await expect(page).toHaveURL(/\/register/);
      });
    }
  });

  test.describe('TS-01-03 กรอกข้อมูลผิดรูปแบบ', () => {
    test('TC-01-07 (TC1007) รูปแบบอีเมลไม่ถูกต้อง', async ({ page }) => {
      const u = uniqueUser('format');
      await fillRegisterForm(page, { ...u, email: 'somchaigmail.com', confirm: u.password });
      await expect(page.getByText(MSG.invalidEmail)).toBeVisible();
      await expect(page).toHaveURL(/\/register/);
    });

    test('TC-01-08 (TC1009) เบอร์โทรศัพท์ไม่ถูกต้อง (เกิน 10 หลัก)', async ({ page }) => {
      const u = uniqueUser('format');
      await fillRegisterForm(page, { ...u, phone: '08111112345678', confirm: u.password });
      await expect(page.getByText(MSG.invalidPhone)).toBeVisible();
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('TS-01-04 ใช้อีเมลหรือเบอร์โทรศัพท์ที่มีในระบบแล้ว', () => {
    test('TC-01-09 (TC1008) อีเมลซ้ำในระบบ', async ({ page }) => {
      const u = uniqueUser('dup');
      const existingEmail = EXISTING.email || CUSTOMER.email;
      await fillRegisterForm(page, { ...u, email: existingEmail, confirm: u.password });
      await expectToast(page, MSG.duplicateEmail);
      await expect(page).toHaveURL(/\/register/);
    });

    test('TC-01-10 (TC10010) เบอร์โทรศัพท์ซ้ำในระบบ', async ({ page }) => {
      let existingPhone = EXISTING.phone;
      if (!existingPhone) {
        // ไม่ได้กำหนดเบอร์ที่มีอยู่แล้ว -> สมัครบัญชีขึ้นมาก่อน แล้วใช้เบอร์นั้นซ้ำ
        const first = uniqueUser('dupphone');
        await registerViaUI(page, first);
        existingPhone = first.phone;
      }
      const u = uniqueUser('dup');
      await fillRegisterForm(page, { ...u, phone: existingPhone, confirm: u.password });
      await expectToast(page, MSG.duplicatePhone);
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('TS-01-05 รหัสผ่านไม่ผ่านเงื่อนไขความปลอดภัย', () => {
    const cases = [
      ['TC-01-11 (TC10011) รหัสผ่านน้อยกว่า 8 ตัวอักษร', 'Test1', 'Test1', MSG.pwMin],
      ['TC-01-12 (TC10012) รหัสผ่านไม่มีตัวพิมพ์ใหญ่', 'test1234', 'test1234', MSG.pwUpper],
      ['TC-01-13 (TC10013) รหัสผ่านไม่มีตัวพิมพ์เล็ก', 'TEST1234', 'TEST1234', MSG.pwLower],
      ['TC-01-14 (TC10014) รหัสผ่านไม่มีตัวเลข', 'TESTtest', 'TESTtest', MSG.pwDigit],
      ['TC-01-15 (TC10015) รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', VALID_PASSWORD, 'Test5678', MSG.pwMismatch],
    ];
    for (const [title, password, confirm, message] of cases) {
      test(title, async ({ page }) => {
        const u = uniqueUser('password');
        await fillRegisterForm(page, { ...u, password, confirm });
        await expect(page.getByText(message)).toBeVisible();
        await expect(page).toHaveURL(/\/register/);
      });
    }
  });
});
