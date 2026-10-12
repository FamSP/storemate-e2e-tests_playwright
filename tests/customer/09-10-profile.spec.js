// US-09 ดูโปรไฟล์ และ US-10 แก้ไขโปรไฟล์ (UC-08)
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { MSG, EXISTING, uniqueUser } from '../../utils/test-data.js';
import { tid, expectToast, registerViaUI } from '../../utils/helpers.js';

const IMAGES = path.resolve('tests/fixtures/images');

async function openProfileFromMenu(page) {
  await page.goto('/');
  await page.locator(tid('btn-user-profile')).click();
  await page.locator(tid('btn-edit-profile')).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.locator(tid('profile-name'))).toBeVisible();
}

async function editField(page, field, value) {
  await page.locator(tid(`btn-change-${field}`)).click();
  await page.locator(tid(`input-${field}`)).fill(value);
  await page.locator(tid('edit-modal-save-button')).click();
}

async function uploadImage(page, file) {
  await page.locator(tid('btn-open-image-modal')).click();
  await expect(page.locator(tid('image-modal'))).toBeVisible();
  await page.locator(tid('file-input')).setInputFiles(path.join(IMAGES, file));
}

/** สมัครบัญชีสำรองใน context แยก (ไม่กระทบ session หลัก) เพื่อใช้เป็นข้อมูลซ้ำ */
async function spareUser(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const user = uniqueUser('spare');
  await registerViaUI(page, user);
  await ctx.close();
  return user;
}

test.describe('US-09 ดูโปรไฟล์', () => {
  test('TS-09-01 / TC-09-01 (TC11001) เข้าหน้าโปรไฟล์และแสดงข้อมูลครบ', async ({ page }) => {
    await openProfileFromMenu(page);
    await expect(page.locator(tid('profile-image')).or(page.locator(tid('default-profile-icon')))).toBeVisible();
    await expect(page.locator(tid('profile-name'))).not.toBeEmpty();
    await expect(page.locator(tid('profile-email'))).toContainText('@');
    await expect(page.locator(tid('profile-phone'))).toHaveText(/\d{2}$/);
    await expect(page.locator(tid('profile-created-at'))).not.toBeEmpty();
  });
});

test.describe('US-10 แก้ไขโปรไฟล์', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator(tid('profile-name'))).toBeVisible();
  });

  test.describe('TS-10-01 แก้ไขข้อมูลและรูปสำเร็จ', () => {
    test('TC-10-01 (TC12001) แก้ไขชื่อ-นามสกุลสำเร็จ', async ({ page }) => {
      const original = (await page.locator(tid('profile-name')).innerText()).trim();
      const newName = `สมชาย ใจดี QA${Date.now() % 1000}`;

      await editField(page, 'name', newName);
      await expectToast(page, MSG.profileSaved);
      await expect(page.locator(tid('profile-name'))).toContainText(newName);

      await editField(page, 'name', original); // คืนค่าเดิม
      await expectToast(page, MSG.profileSaved);
    });

    // TC-10-02 (TC12002) แก้ไขอีเมลสำเร็จ อยู่ใน tests/fresh เพราะระบบจะออกจากระบบหลังเปลี่ยนอีเมล

    test('TC-10-03 (TC12003) อัปโหลดรูปโปรไฟล์ JPG/JPEG', async ({ page }) => {
      await uploadImage(page, 'profile-valid.jpg');
      await page.locator(tid('btn-save-crop')).click();
      await expectToast(page, MSG.profileSaved);
      await expect(page.locator(tid('profile-image'))).toBeVisible();
    });

    test('TC-10-04 (TC12004) อัปโหลดรูปโปรไฟล์ PNG', async ({ page }) => {
      await uploadImage(page, 'profile-valid.png');
      await page.locator(tid('btn-save-crop')).click();
      await expectToast(page, MSG.profileSaved);
      await expect(page.locator(tid('profile-image'))).toBeVisible();
    });
  });

  test.describe('TS-10-02 ไฟล์รูปไม่ผ่านเงื่อนไข', () => {
    test('TC-10-05 (TC12005) อัปโหลดไฟล์เกิน 5 MB', async ({ page }) => {
      await uploadImage(page, '4k-invalid.jpg'); // ~7 MB
      await expectToast(page, MSG.fileTooLarge);
      await expect(page.locator(tid('btn-save-crop'))).toBeHidden();
    });

    test('TC-10-06 (TC12006) อัปโหลดไฟล์ที่ไม่ใช่ PNG/JPG/JPEG', async ({ page }) => {
      await uploadImage(page, 'profile-invalid.txt');
      await expectToast(page, MSG.fileType);
      await expect(page.locator(tid('btn-save-crop'))).toBeHidden();
    });
  });

  test.describe('TS-10-03 ข้อมูลที่แก้ไขไม่ถูกต้องหรือซ้ำ', () => {
    test('TC-10-07 (TC12007) อีเมลผิดรูปแบบ', async ({ page }) => {
      const before = await page.locator(tid('profile-email')).innerText();
      await editField(page, 'email', 'somchaigmail.com');
      await expectToast(page, MSG.invalidEmail);
      await page.reload();
      await expect(page.locator(tid('profile-email'))).toHaveText(before);
    });

    test('TC-10-08 (TC12008) อีเมลซ้ำกับผู้ใช้อื่น', async ({ page, browser }) => {
      const email = EXISTING.email || (await spareUser(browser)).email;
      await editField(page, 'email', email);
      await expectToast(page, MSG.duplicateEmail);
      await expect(page).toHaveURL(/\/profile/); // ไม่ถูกออกจากระบบ
    });

    test('TC-10-09 (TC12009) เบอร์โทรศัพท์ซ้ำกับผู้ใช้อื่น', async ({ page, browser }) => {
      const phone = EXISTING.phone || (await spareUser(browser)).phone;
      const before = await page.locator(tid('profile-phone')).innerText();
      await editField(page, 'phone', phone);
      await expectToast(page, MSG.duplicatePhone);
      await page.reload();
      await expect(page.locator(tid('profile-phone'))).toHaveText(before);
    });
  });
});
