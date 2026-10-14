// US-03 ดูรายการสินค้า (UC-05) — ชุดหลัก + ชุดเพิ่มเติม รวมในไฟล์เดียว
// ชุดเพิ่มเติมไม่มีในเอกสารเดิม จึงใช้ป้าย (เพิ่มเติม) แทนรหัสเดิม
import { test, expect } from '@playwright/test';
import { MSG } from '../../utils/test-data.js';
import { tid, toNumber } from '../../utils/helpers.js';

const SECTIONS = {
  'promotion-section': { title: 'โปรโมชั่นสุดพิเศษ', category: 'promotion' },
  'soap-section': { title: 'สบู่สมุนไพร', category: 'soap' },
  'drinks-section': { title: 'เครื่องดื่ม', category: 'drinks' },
  'shampoo-section': { title: 'แชมพูสมุนไพร', category: 'shampoo' },
};
const COMING_SOON = 'สินค้าจะมีเร็วๆนี้';
const cards = (page) => page.locator(tid('product-card'));

async function openHome(page) {
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
}

test.describe('US-03 ดูรายการสินค้า', () => {
  // ---------- ชุดหลัก (ตามเอกสาร) ----------
  test('TS-03-01 / TC-03-01 (TC5001) แสดงรายการสินค้าตามหมวดหมู่', async ({ page }) => {
    await openHome(page);
    for (const id of Object.keys(SECTIONS)) {
      const section = page.locator(`#${id}`);
      await expect(section, `ต้องแสดงหมวด ${id}`).toBeVisible();
      const sectionCards = section.locator(tid('product-card'));
      const empty = section.getByText(MSG.emptyCategory);
      await expect(sectionCards.first().or(empty)).toBeVisible();
      // แต่ละหมวดแสดงสินค้าไม่เกิน 4 รายการ
      expect(await sectionCards.count()).toBeLessThanOrEqual(4);
    }
    expect(await cards(page).count()).toBeGreaterThan(0);
  });

  test('TS-03-02 / TC-03-02 (TC5002) หมวดหมู่ที่ไม่มีสินค้า', async ({ page }) => {
    await openHome(page);
    const emptySection = page.locator('section').filter({ hasText: MSG.emptyCategory }).first();
    test.skip(!(await emptySection.isVisible()), 'ตอนนี้ทุกหมวดมีสินค้า จึงทดสอบกรณีหมวดว่างไม่ได้');
    await expect(emptySection.getByText(MSG.emptyCategory)).toBeVisible();
    await expect(emptySection.locator(tid('product-card'))).toHaveCount(0);
  });

  // ---------- ชุดเพิ่มเติม ----------
  test.describe('TS-03-03 องค์ประกอบของหน้าแรกและการ์ดสินค้า', () => {
    test('TC-03-03 (เพิ่มเติม) แสดงแบนเนอร์หลักและหัวข้อครบ 4 หมวด', async ({ page }) => {
      await openHome(page);
      await expect(page.locator('#hero-banner')).toBeVisible();
      for (const [id, { title }] of Object.entries(SECTIONS)) {
        await expect(page.locator(`#${id} h2`).first()).toHaveText(title);
      }
    });

    test('TC-03-04 (เพิ่มเติม) การ์ดสินค้าทุกใบมีรูป ชื่อ และราคา', async ({ page }) => {
      await openHome(page);
      const count = await cards(page).count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const card = cards(page).nth(i);
        await expect(card.locator('img').first()).toBeVisible();
        await expect(card.locator('h2, h3').first()).not.toBeEmpty();
        await expect(card).toContainText(/฿\s*[\d,]+/);
      }
    });

    test('TC-03-05 (เพิ่มเติม) สินค้าที่สต็อกหมดแสดงป้าย "สินค้าจะมีเร็วๆนี้"', async ({ page }) => {
      await openHome(page);
      const soldOut = cards(page).filter({ hasText: COMING_SOON }).first();
      test.skip(!(await soldOut.isVisible()), 'ตอนนี้ไม่มีสินค้าที่สต็อกหมดบนหน้าแรก');
      const href = await soldOut.getAttribute('href');
      await page.goto(href);
      // หน้ารายละเอียดต้องบอกว่าเหลือ 0 ชิ้น
      await expect(page.getByText(/มีสินค้าทั้งหมด\s*0\s*ชิ้น/)).toBeVisible();
    });
  });

  test.describe('TS-03-04 การนำทางจากหน้าแรก', () => {
    Object.entries(SECTIONS).forEach(([id, { title, category }], i) => {
      test(`TC-03-0${6 + i} (เพิ่มเติม) ปุ่ม "ดูทั้งหมด" ของหมวด ${title}`, async ({ page }) => {
        await openHome(page);
        await page.locator(`#${id} ${tid('see-all-link')}`).click();
        await expect(page).toHaveURL(new RegExp(`/search\\?category=${category}$`));
        await expect(page.locator(tid('filteredProduct'))).toBeVisible();
      });
    });

    test('TC-03-10 (เพิ่มเติม) เมนู "สินค้า" พาไปหน้ารวมสินค้า', async ({ page }) => {
      await openHome(page);
      await page.locator(tid('list-search')).click();
      await expect(page).toHaveURL(/\/search$/);
      await expect(page.locator(tid('input-search'))).toBeVisible();
    });

    test('TC-03-11 (เพิ่มเติม) เมนู "โปรโมชั่น" พาไปหน้าค้นหาหมวดโปรโมชั่น', async ({ page }) => {
      await openHome(page);
      await page.locator(tid('list-promo')).click();
      await expect(page).toHaveURL(/category=promotion/);
    });

    test('TC-03-12 (เพิ่มเติม) กดการ์ดแล้วไปหน้ารายละเอียดของสินค้านั้นถูกตัว', async ({ page }) => {
      await openHome(page);
      const total = Math.min(await cards(page).count(), 3);
      for (let i = 0; i < total; i++) {
        await openHome(page);
        const card = cards(page).nth(i);
        const href = await card.getAttribute('href');
        const price = toNumber((await card.innerText()).match(/฿\s*([\d,]+)/)[1]);
        await card.click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        await expect(page.locator(tid('product-name'))).toBeVisible();
        await expect(page.getByText(`฿${price.toLocaleString()}`).first()).toBeVisible();
      }
    });
  });
});
