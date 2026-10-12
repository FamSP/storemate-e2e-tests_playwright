// US-11 ดู / US-12 เพิ่ม / US-13 แก้ไข / US-14 ลบ ข้อมูลที่อยู่ (UC-09)
// กรณีบัญชีไม่มีที่อยู่ (TC-11-02, TC-14-03, TC-14-04) อยู่ใน tests/fresh/fresh-account.spec.js
import { test, expect } from '@playwright/test';
import { MSG } from '../../utils/test-data.js';
import { tid, gotoAddresses, addAddress, addressCard, expectToast, confirmDialog } from '../../utils/helpers.js';

const DEFAULT_BADGE = 'ค่าเริ่มต้น';
// ป้าย "ค่าเริ่มต้น" (ต้อง exact เพราะปุ่ม "ตั้งเป็นค่าเริ่มต้น" ก็มีคำนี้)
const badge = (card) => card.getByText(DEFAULT_BADGE, { exact: true });
const qaStreet = (tag) => `99/9 หมู่ 1 QA-${tag}-${Date.now()}`;

async function setDefault(page, street) {
  const card = addressCard(page, street);
  if (await card.locator(tid('btn-set-default')).isEnabled()) {
    await card.locator(tid('btn-set-default')).click();
    await expectToast(page, 'ตั้งค่าที่อยู่เริ่มต้นสำเร็จ');
  }
  await expect(badge(card)).toBeVisible();
}

async function deleteAddress(page, street) {
  await addressCard(page, street).locator('[data-test^="btn-delete-address-"]').click();
  await expect(page.getByText(MSG.confirmDeleteAddress)).toBeVisible();
  await confirmDialog(page);
  await expectToast(page, MSG.addressDeleted);
  await expect(page.getByText(street)).toHaveCount(0);
}

test.describe('ข้อมูลที่อยู่ (US-11 ถึง US-14)', () => {
  // ลบที่อยู่ที่เทสสร้างไว้ (มีคำว่า QA-) แต่คงไว้อย่างน้อย 1 รายการ
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: 'playwright/.auth/customer.json' });
    await gotoAddresses(page);
    for (let i = 0; i < 20; i++) {
      const all = page.locator(tid('address-detail'));
      const qa = all.filter({ hasText: 'QA-' });
      if ((await all.count()) <= 1 || (await qa.count()) === 0) break;
      const street = (await qa.first().innerText()).split(' ต.')[0].trim();
      await deleteAddress(page, street);
    }
    await page.close();
  });

  test.describe('US-11 ดูข้อมูลที่อยู่', () => {
    test('TS-11-01 / TC-11-01 (TC13001) แสดงข้อมูลที่อยู่และปุ่มจัดการครบ', async ({ page }) => {
      const street = await addAddress(page, qaStreet('view'));
      const card = addressCard(page, street);
      await expect(card.locator(tid('receiver-name'))).not.toBeEmpty();
      await expect(card.locator(tid('receiver-phone'))).toHaveText(/^0\d{9}$/);
      await expect(card.locator(tid('address-detail'))).toContainText(/ต\..+ อ\..+ จ\..+ \d{5}/);
      await expect(page.locator(tid('btn-add-address'))).toBeVisible();
      await expect(card.locator(tid('btn-set-default'))).toBeVisible();
      await expect(card.locator('[data-test^="btn-edit-address-"]')).toBeVisible();
      await expect(card.locator('[data-test^="btn-delete-address-"]')).toBeVisible();
    });
  });

  test.describe('US-12 เพิ่มข้อมูลที่อยู่', () => {
    test('TS-12-01 / TC-12-01 (TC14001) เพิ่มที่อยู่สำเร็จ', async ({ page }) => {
      const street = await addAddress(page, qaStreet('add')); // ตรวจ toast "เพิ่มที่อยู่สำเร็จ"
      const card = addressCard(page, street);
      await expect(card).toBeVisible();
      // ตามเอกสาร ที่อยู่ใหม่ต้องเป็นค่าเริ่มต้น (soft: รายงานผลแต่ไม่หยุดเทส)
      await expect.soft(badge(card)).toBeVisible();
    });

    test('TS-12-02 / TC-12-02 (TC14002) ไม่กรอกข้อมูลที่อยู่', async ({ page }) => {
      await gotoAddresses(page);
      const before = await page.locator(tid('address-detail')).count();
      await page.locator(tid('btn-add-address')).click();
      await page.locator(tid('btn-save-address')).click();

      await expectToast(page, MSG.addressRequired);
      await page.locator(tid('btn-cancel-address')).click();
      await expect(page.locator(tid('address-detail'))).toHaveCount(before);
    });
  });

  test.describe('US-13 แก้ไขข้อมูลที่อยู่', () => {
    test('TS-13-01 / TC-13-01 (TC15002) ฟอร์มแก้ไขแสดงข้อมูลเดิม', async ({ page }) => {
      const street = await addAddress(page, qaStreet('edit-view'));
      await addressCard(page, street).locator('[data-test^="btn-edit-address-"]').click();

      await expect(page.locator('input[name="streetAddress"]')).toHaveValue(street);
      for (const name of ['province', 'district', 'subDistrict']) {
        await expect(page.locator(`select[name="${name}"]`)).not.toHaveValue(/^0?$/);
      }
      await expect(page.locator('select:not([name])').last()).not.toHaveValue(/^0?$/); // รหัสไปรษณีย์
      await page.locator(tid('btn-cancel-address')).click();
    });

    test('TS-13-01 / TC-13-02 (TC15001) แก้ไขที่อยู่สำเร็จ', async ({ page }) => {
      const street = await addAddress(page, qaStreet('edit'));
      const newStreet = street.replace('99/9', '99/10');
      await addressCard(page, street).locator('[data-test^="btn-edit-address-"]').click();
      await page.locator('input[name="streetAddress"]').fill(newStreet);
      await page.locator(tid('btn-save-address')).click();

      await expectToast(page, MSG.addressEdited);
      await expect(page.getByText(newStreet)).toBeVisible();
      await expect(page.getByText(street)).toHaveCount(0);
    });
  });

  test.describe('US-14 ลบข้อมูลที่อยู่', () => {
    test('TS-14-01 / TC-14-01 (TC16001) ลบที่อยู่ที่ไม่ใช่ค่าเริ่มต้น', async ({ page }) => {
      const a = await addAddress(page, qaStreet('del-a'));
      const b = await addAddress(page, qaStreet('del-b'));
      await setDefault(page, a); // ให้ A เป็นค่าเริ่มต้น แล้วลบ B

      await deleteAddress(page, b);
      await expect(badge(addressCard(page, a))).toBeVisible();
    });

    test('TS-14-01 / TC-14-02 (TC16002) ลบที่อยู่ที่เป็นค่าเริ่มต้น', async ({ page }) => {
      const a = await addAddress(page, qaStreet('def-a'));
      await addAddress(page, qaStreet('def-b'));
      await setDefault(page, a);

      await deleteAddress(page, a);
      // ระบบต้องตั้งที่อยู่อื่นเป็นค่าเริ่มต้นแทนอัตโนมัติ
      await expect(page.getByText(DEFAULT_BADGE, { exact: true })).toHaveCount(1);
    });
  });
});
