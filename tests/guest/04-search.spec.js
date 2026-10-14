// US-04 ค้นหาและกรองสินค้า (UC-06) — ชุดหลัก + ชุดเพิ่มเติม รวมในไฟล์เดียว
// ชุดเพิ่มเติมไม่มีในเอกสารเดิม จึงใช้ป้าย (เพิ่มเติม) แทนรหัสเดิม
import { test, expect } from '@playwright/test';
import { MSG } from '../../utils/test-data.js';
import { tid, toNumber } from '../../utils/helpers.js';

const cards = (page) => page.locator('[data-test="product-card"]:visible');
const notFound = (page) => page.getByText(MSG.searchNotFound);

/** รอให้ผลค้นหาชุดล่าสุดแสดง และ "พบสินค้า N รายการ" ตรงกับจำนวนการ์ด */
async function waitForResults(page) {
  await page.waitForLoadState('networkidle');
  await expect(cards(page).first().or(notFound(page))).toBeVisible();
  await expect(async () => {
    const shown = toNumber(await page.locator(tid('filteredProduct')).textContent());
    expect(await cards(page).count()).toBe(shown);
  }).toPass();
}

/** เปิดหน้าค้นหา (ใส่เงื่อนไขใน URL ได้) แล้วรอผล */
async function openSearch(page, query = '') {
  await page.goto(`/search${query}`);
  await waitForResults(page);
}

/** กรอกเงื่อนไขในหน้าค้นหาแล้วกด "ตกลง" */
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
  await waitForResults(page);
}

/** กรอกช่วงราคาในหน้าปัจจุบันแล้วกด "ตกลง" */
async function applyPrice(page, { min, max }) {
  if (min !== undefined) await page.locator(tid('input-min-price')).fill(String(min));
  if (max !== undefined) await page.locator(tid('input-max-price')).fill(String(max));
  await page.locator(tid('apply-price-filter')).click();
  await waitForResults(page);
}

/** ราคาบนการ์ดสินค้าทุกใบ เช่น "฿35" -> 35 */
async function prices(page) {
  const texts = await cards(page).allInnerTexts();
  return texts.map((t) => toNumber((t.match(/฿\s*([\d,]+)/) || [])[1]));
}

const everyCardContains = async (page, word) =>
  expect.poll(async () => (await cards(page).allInnerTexts()).every((t) => t.includes(word))).toBe(true);

test.describe('US-04 ค้นหาและกรองสินค้า', () => {
  test.describe('TS-04-01 ค้นหาด้วยคำค้นและตัวกรอง', () => {
    test('TC-04-01 (TC6001) ค้นหาสินค้าด้วย Keyword', async ({ page }) => {
      await search(page, { keyword: 'น้ำ' });
      await expect(cards(page).first()).toBeVisible();
      await everyCardContains(page, 'น้ำ');
    });

    test('TC-04-02 (TC6002) กรองด้วยหมวดหมู่โดยไม่ระบุ Keyword', async ({ page }) => {
      await search(page, { category: 'drink' });
      await expect(page).toHaveURL(/category=drinks/);
      await expect(cards(page).first()).toBeVisible();
    });

    test('TC-04-03 (TC6004) กรองสินค้าด้วยช่วงราคา 35-500', async ({ page }) => {
      await search(page, { min: 35, max: 500 });
      const list = await prices(page);
      expect(list.length).toBeGreaterThan(0);
      for (const p of list) {
        expect(p).toBeGreaterThanOrEqual(35);
        expect(p).toBeLessThanOrEqual(500);
      }
    });

    test('TC-04-04 (TC6005) ค้นหาด้วย Keyword ร่วมกับช่วงราคา', async ({ page }) => {
      await search(page, { keyword: 'น้ำ', min: 35, max: 500 });
      await expect(cards(page).first()).toBeVisible();
      await everyCardContains(page, 'น้ำ');
      for (const p of await prices(page)) {
        expect(p).toBeGreaterThanOrEqual(35);
        expect(p).toBeLessThanOrEqual(500);
      }
    });
  });

  test.describe('TS-04-02 ค้นหาแล้วไม่พบสินค้า', () => {
    test('TC-04-05 (TC6003) ค้นหาสินค้าที่ไม่มีในระบบ', async ({ page }) => {
      await search(page, { keyword: 'มือถือ' });
      await expect(notFound(page)).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
    });

    test('TC-04-09 (เพิ่มเติม) ค้นหาด้วยอักขระพิเศษ', async ({ page }) => {
      await search(page, { keyword: '@@@' });
      await expect(notFound(page)).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
    });
  });

  test.describe('TS-04-03 ค้นหาด้วยวิธีอื่น', () => {
    test('TC-04-06 (เพิ่มเติม) กด Enter ในช่องค้นหา', async ({ page }) => {
      await openSearch(page);
      await page.locator(tid('input-search')).fill('สบู่');
      await page.locator(tid('input-search')).press('Enter');
      await expect(page).toHaveURL(/keyword=/);
      await waitForResults(page);
      expect(await cards(page).count()).toBeGreaterThan(0);
      await everyCardContains(page, 'สบู่');
    });

    test('TC-04-07 (เพิ่มเติม) ค้นหาจากไอคอนแว่นขยายบนแถบเมนู', async ({ page }) => {
      await page.goto('/');
      await page.locator(`${tid('search')} svg`).first().click();
      await page.locator(tid('search-input')).fill('สบู่');
      await page.locator(tid('search-input')).press('Enter');
      await expect(page).toHaveURL(/\/search\?keyword=/);
      await waitForResults(page);
      expect(await cards(page).count()).toBeGreaterThan(0);
    });

    test('TC-04-08 (เพิ่มเติม) เปิดลิงก์ที่มีคำค้น ช่องค้นหาแสดงคำนั้น', async ({ page }) => {
      await openSearch(page, `?keyword=${encodeURIComponent('สบู่')}`);
      await expect(page.locator(tid('input-search'))).toHaveValue('สบู่');
      expect(await cards(page).count()).toBeGreaterThan(0);
    });
  });

  test.describe('TS-04-04 กรองตามหมวดหมู่', () => {
    test('TC-04-10 (เพิ่มเติม) หมวด "ทั้งหมด" แสดงจำนวนเท่ากับไม่กรอง', async ({ page }) => {
      await openSearch(page);
      const all = await cards(page).count();
      await page.locator(tid('category-soap')).click();
      await waitForResults(page);
      await page.locator(tid('category-all')).click();
      await expect(page).not.toHaveURL(/category=/);
      await waitForResults(page);
      expect(await cards(page).count()).toBe(all);
    });

    const categories = [
      ['TC-04-11', 'soap', 'soap', 'สบู่'],
      ['TC-04-12', 'shampoo', 'shampoo', 'แชมพู'],
      ['TC-04-13', 'drink', 'drinks', 'เครื่องดื่ม'],
    ];
    for (const [tc, button, param, label] of categories) {
      test(`${tc} (เพิ่มเติม) หมวด "${label}" แสดงผลตรงกับจำนวนที่พบ`, async ({ page }) => {
        await openSearch(page);
        const all = await cards(page).count();
        await page.locator(tid(`category-${button}`)).click();
        await expect(page).toHaveURL(new RegExp(`category=${param}`));
        await waitForResults(page);
        const count = await cards(page).count();
        expect(count).toBeLessThanOrEqual(all);
        if (count === 0) await expect(notFound(page)).toBeVisible(); // หมวดว่างต้องแจ้งไม่พบ
      });
    }
  });

  test.describe('TS-04-05 กรองตามช่วงราคา', () => {
    test('TC-04-14 (เพิ่มเติม) ใส่ราคาต่ำสุดอย่างเดียว', async ({ page }) => {
      await openSearch(page);
      await applyPrice(page, { min: 300 });
      await expect(page).toHaveURL(/minPrice=300/);
      for (const p of await prices(page)) expect(p).toBeGreaterThanOrEqual(300);
    });

    test('TC-04-15 (เพิ่มเติม) ใส่ราคาสูงสุดอย่างเดียว', async ({ page }) => {
      await openSearch(page);
      await applyPrice(page, { max: 100 });
      await expect(page).toHaveURL(/maxPrice=100/);
      for (const p of await prices(page)) expect(p).toBeLessThanOrEqual(100);
    });

    test('TC-04-16 (เพิ่มเติม) ราคาต่ำสุดมากกว่าราคาสูงสุด', async ({ page }) => {
      await openSearch(page);
      await applyPrice(page, { min: 500, max: 100 });
      await expect(notFound(page)).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
    });

    test('TC-04-17 (เพิ่มเติม) ผลลัพธ์เรียงจากราคาน้อยไปมาก', async ({ page }) => {
      await openSearch(page);
      const list = await prices(page);
      expect(list.length).toBeGreaterThan(1);
      expect(list).toEqual([...list].sort((a, b) => a - b));
    });
  });

  test.describe('TS-04-06 ล้างตัวกรอง', () => {
    test('TC-04-18 (เพิ่มเติม) กด "ล้างค่า" แล้วคำค้นและตัวกรองถูกล้าง', async ({ page }) => {
      await openSearch(page);
      const all = await cards(page).count();
      await page.locator(tid('input-search')).fill('สบู่');
      await applyPrice(page, { min: 100, max: 300 });
      await expect(page).toHaveURL(/keyword=.*minPrice=100/);

      await page.locator(tid('clear-filter')).click();

      await expect(page).toHaveURL(/\/search$/);
      await expect(page.locator(tid('input-search'))).toHaveValue('');
      await expect(page.locator(tid('input-min-price'))).toHaveValue('');
      await expect(page.locator(tid('input-max-price'))).toHaveValue('');
      await waitForResults(page);
      expect(await cards(page).count()).toBe(all);
    });
  });
});
