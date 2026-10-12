// US-04 ค้นหาและกรองสินค้า (UC-06)
import { test, expect } from '@playwright/test';
import { MSG } from '../../utils/test-data.js';
import { tid, toNumber } from '../../utils/helpers.js';

const cards = (page) => page.locator('[data-test="product-card"]:visible');

async function search(page, { keyword, category, min, max } = {}) {
  await page.goto('/search');
  if (keyword !== undefined) await page.locator(tid('input-search')).fill(keyword);
  if (category) await page.locator(tid(`category-${category}`)).click();
  if (min !== undefined) await page.locator(tid('input-min-price')).fill(String(min));
  if (max !== undefined) await page.locator(tid('input-max-price')).fill(String(max));
  await page.locator(tid('apply-price-filter')).click();
  // รอให้ URL มีเงื่อนไขค้นหา แล้วรอผลค้นหาชุดใหม่โหลดเสร็จ
  if (keyword) await expect(page).toHaveURL(/keyword=/);
  if (min !== undefined) await expect(page).toHaveURL(/minPrice=/);
  await page.waitForLoadState('networkidle');
  await expect(cards(page).first().or(page.getByText(MSG.searchNotFound))).toBeVisible();
  await expectCountMatches(page);
}

/** ราคาบนการ์ดสินค้า เช่น "฿35" */
async function cardPrices(page) {
  const texts = await cards(page).allInnerTexts();
  return texts.map((t) => toNumber((t.match(/฿\s*([\d,]+(\.\d+)?)/) || [])[1]));
}

/** จำนวนที่แสดงใน "พบสินค้า N รายการ" ต้องเท่ากับจำนวนการ์ดที่เห็น */
async function expectCountMatches(page) {
  await expect(async () => {
    const shown = toNumber(await page.locator(tid('filteredProduct')).textContent());
    expect(await cards(page).count()).toBe(shown);
  }).toPass();
}

test.describe('US-04 ค้นหาและกรองสินค้า', () => {
  test.describe('TS-04-01 ค้นหาด้วยคำค้นและตัวกรอง', () => {
    test('TC-04-01 (TC6001) ค้นหาสินค้าด้วย Keyword', async ({ page }) => {
      await search(page, { keyword: 'น้ำ' });
      await expect(cards(page).first()).toBeVisible();
      await expect.poll(async () => (await cards(page).allInnerTexts()).every((t) => t.includes('น้ำ'))).toBe(true);
      await expectCountMatches(page);
    });

    test('TC-04-02 (TC6002) กรองด้วยหมวดหมู่โดยไม่ระบุ Keyword', async ({ page }) => {
      await search(page, { category: 'drink' });
      await expect(page).toHaveURL(/category=drinks/);
      await expect(cards(page).first()).toBeVisible();
      await expectCountMatches(page);
    });

    test('TC-04-03 (TC6004) กรองสินค้าด้วยช่วงราคา 35-500', async ({ page }) => {
      await search(page, { min: 35, max: 500 });
      const prices = await cardPrices(page);
      expect(prices.length).toBeGreaterThan(0);
      for (const p of prices) {
        expect(p).toBeGreaterThanOrEqual(35);
        expect(p).toBeLessThanOrEqual(500);
      }
    });

    test('TC-04-04 (TC6005) ค้นหาด้วย Keyword ร่วมกับช่วงราคา', async ({ page }) => {
      await search(page, { keyword: 'น้ำ', min: 35, max: 500 });
      await expect(cards(page).first()).toBeVisible();
      await expect.poll(async () => (await cards(page).allInnerTexts()).every((t) => t.includes('น้ำ'))).toBe(true);
      for (const p of await cardPrices(page)) {
        expect(p).toBeGreaterThanOrEqual(35);
        expect(p).toBeLessThanOrEqual(500);
      }
    });
  });

  test.describe('TS-04-02 ค้นหาแล้วไม่พบสินค้า', () => {
    test('TC-04-05 (TC6003) ค้นหาสินค้าที่ไม่มีในระบบ', async ({ page }) => {
      await search(page, { keyword: 'มือถือ' });
      await expect(page.getByText(MSG.searchNotFound)).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
    });
  });
});
