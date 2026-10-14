import { expect } from '@playwright/test';
import { MSG, uniqueUser } from './test-data.js';

/** ตัวเลือก data-test ของหน้าเว็บ */
export const tid = (id) => `[data-test="${id}"]`;

/** toast ของ react-hot-toast แสดงใน element role="status" */
export function toast(page, text) {
  return page.getByRole('status').filter({ hasText: text }).first();
}

export async function expectToast(page, text) {
  await expect(toast(page, text)).toBeVisible();
}

/** ปุ่ม "ยืนยัน" / "ยกเลิก" ใน ConfirmToast */
export async function confirmDialog(page, answer = 'ยืนยัน') {
  await page.getByRole('button', { name: answer, exact: true }).last().click();
}

export const toNumber = (text) => Number(String(text ?? '').replace(/[^\d.]/g, ''));

// ---------- บัญชีผู้ใช้ ----------

export async function fillRegisterForm(page, { name = '', email = '', phone = '', password = '', confirm = '' }) {
  await page.goto('/register');
  await page.locator(tid('reg-input-name')).fill(name);
  await page.locator(tid('reg-input-email')).fill(email);
  await page.locator(tid('reg-input-phone')).fill(phone);
  await page.locator(tid('reg-input-password')).fill(password);
  await page.locator(tid('reg-input-confirm')).fill(confirm);
  await page.locator(tid('btn-register-submit')).click();
}

export async function registerViaUI(page, user) {
  await fillRegisterForm(page, { ...user, confirm: user.password });
  await expectToast(page, MSG.registerSuccess);
  await expect(page).toHaveURL(/\/login/);
}

export async function loginViaUI(page, email, password) {
  await page.goto('/login');
  await page.locator(tid('email')).fill(email);
  await page.locator(tid('password')).fill(password);
  await page.locator(tid('btn-submit')).click();
}

/** สมัครบัญชีใหม่แล้วเข้าสู่ระบบ ใช้กับเทสที่ต้องการบัญชีว่าง (ไม่มีที่อยู่/คำสั่งซื้อ) */
export async function createFreshCustomer(page, prefix = 'qa') {
  const user = uniqueUser(prefix);
  await registerViaUI(page, user);
  await loginViaUI(page, user.email, user.password);
  await expectToast(page, MSG.loginSuccess);
  await expect(page).not.toHaveURL(/\/login/);
  return user;
}

// ---------- สินค้า / รถเข็น ----------

export async function openProduct(page, productId) {
  await page.goto(`/product/${productId}`);
  await expect(page.locator(tid('btn-add-to-cart'))).toBeVisible();
}

/** อ่านจำนวนจาก "มีสินค้าทั้งหมด N ชิ้น" */
export async function readStock(page) {
  const text = await page.getByText(/มีสินค้าทั้งหมด\s*\d+\s*ชิ้น/).first().textContent();
  return toNumber(text);
}

export async function readBuyQuantity(page) {
  return toNumber(await page.locator(tid('buy-quantity')).textContent());
}

export async function addToCart(page, productId, quantity = 1) {
  await openProduct(page, productId);
  for (let i = 1; i < quantity; i++) await page.locator(tid('btn-increase')).click();
  await page.locator(tid('btn-add-to-cart')).click();
  await expectToast(page, MSG.addedToCart);
}

export async function gotoCart(page) {
  await page.goto('/shopping-cart');
  await expect(page.locator(tid('total-price')).or(page.getByText(MSG.emptyCart))).toBeVisible();
}

export function cartRow(page, productId) {
  // แถวสินค้า = div (border-b) ที่ใกล้ที่สุดซึ่งครอบ checkbox ของสินค้านั้น
  return page.locator(tid(`checkbox-product-${productId}`)).locator('xpath=ancestor::div[contains(@class,"border-b")][1]');
}

/** ลบสินค้าทุกรายการในรถเข็น ยกเว้นรหัสสินค้าใน keep */
export async function clearCart(page, { keep = [] } = {}) {
  await gotoCart(page);
  const keepIds = keep.filter(Boolean).map(String);
  for (let i = 0; i < 30; i++) {
    const ids = (await page.locator('[data-test^="checkbox-product-"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-test').replace('checkbox-product-', ''))));
    const target = ids.find((id) => !keepIds.includes(id));
    if (!target) break;
    await cartRow(page, target).locator(tid('btn-remove-item')).click();
    await confirmDialog(page);
    await expectToast(page, MSG.itemRemoved);
    await expect(page.locator(tid(`checkbox-product-${target}`))).toHaveCount(0);
  }
}

export async function cartBadge(page) {
  const text = await page.locator(tid('click-shop-cart')).textContent().catch(() => '0');
  return toNumber(text) || 0;
}

// ---------- ที่อยู่ ----------

async function selectFirstOption(select) {
  await expect(select).toBeEnabled();
  const option = select.locator('option:not([hidden])').first();
  await expect(option).toBeAttached();
  await select.selectOption(await option.getAttribute('value'));
}

export async function gotoAddresses(page) {
  await page.goto('/address-profile');
  await expect(page.locator(tid('address-detail')).first().or(page.getByText(MSG.noAddress))).toBeVisible();
}

/** เพิ่มที่อยู่ใหม่ โดยเลือกจังหวัด/อำเภอ/ตำบล ตัวแรกในรายการ */
export async function addAddress(page, street = `99/9 หมู่ 1 QA-${Date.now()}`) {
  await gotoAddresses(page);
  await page.locator(tid('btn-add-address')).click();
  await page.locator('input[name="streetAddress"]').fill(street);
  await selectFirstOption(page.locator('select[name="province"]'));
  await selectFirstOption(page.locator('select[name="district"]'));
  await selectFirstOption(page.locator('select[name="subDistrict"]'));
  const zip = page.locator('select:not([name])').last();
  if ((await zip.isEnabled()) && !(await zip.inputValue())) await selectFirstOption(zip);
  await page.locator(tid('btn-save-address')).click();
  await expectToast(page, MSG.addressAdded);
  await expect(page.getByText(street)).toBeVisible();
  return street;
}

export function addressCard(page, street) {
  // การ์ดที่อยู่ = div (p-4) ที่ใกล้ที่สุดซึ่งครอบข้อความที่อยู่
  return page.locator(tid('address-detail')).filter({ hasText: street }).locator('xpath=ancestor::div[contains(@class,"p-4")][1]');
}

export async function ensureAddress(page) {
  await gotoAddresses(page);
  if (await page.getByText(MSG.noAddress).isVisible()) await addAddress(page);
}

// ---------- คำสั่งซื้อ / ชำระเงิน ----------

/** กด "ซื้อสินค้า" จากหน้ารายละเอียดสินค้า แล้วรอหน้าสรุปคำสั่งซื้อ */
export async function buyNow(page, productId) {
  await openProduct(page, productId);
  await page.locator(tid('btn-buy-cart')).click();
  await expect(page).toHaveURL(/\/payment$/);
  await expect(page.locator(tid('order-item')).first()).toBeVisible();
  // ต้องรอที่อยู่เริ่มต้นโหลดเสร็จก่อน ไม่อย่างนั้นกดยืนยันแล้วจะขึ้น "กรุณาเลือกที่อยู่ในการรับสินค้า"
  await expect(page.locator(tid('address'))).toBeVisible();
}

/** รอ response ของ API ที่ส่ง orderNo กลับมา (ใช้หาเลขที่คำสั่งซื้อที่เพิ่งสร้าง) */
function waitForOrderNo(page) {
  return page
    .waitForResponse(async (res) => {
      if (res.request().method() !== 'POST') return false;
      try { return Boolean((await res.json())?.orderNo); } catch { return false; }
    }, { timeout: 30_000 })
    .then(async (res) => (await res.json()).orderNo)
    .catch(() => null);
}

/** สั่งซื้อแบบเก็บเงินปลายทาง -> คำสั่งซื้อสถานะ "ที่ต้องจัดส่ง" คืนค่า orderNo (หรือ null ถ้าอ่านไม่ได้) */
export async function placeCodOrder(page, productId) {
  await buyNow(page, productId);
  await page.locator(tid('select-destination-desktop')).click();
  const orderNo = waitForOrderNo(page);
  await page.locator(tid('btn-confirm-payment-desktop')).click();
  await expectToast(page, MSG.orderSuccess);
  await expect(page).toHaveURL(/\/orders/);
  return orderNo;
}

/** ยกเลิกคำสั่งซื้อผ่านหน้า /cancel-orders/:orderNo */
export async function cancelOrderViaUI(page, card, reason = 'no_longer_want') {
  await card.locator(tid('btn-cancel-order')).click();
  await expect(page).toHaveURL(/\/cancel-orders\//);
  if (reason) {
    await page.locator(tid('dropdown-reason')).click();
    await page.locator(tid(`reason-option-${reason}`)).click();
  }
  await page.locator(tid('btn-submit-cancel')).click();
}

/** สร้างคำสั่งซื้อ PromptPay แล้วไม่ชำระ -> ได้คำสั่งซื้อสถานะ "ที่ต้องชำระ" */
export async function placePendingOrder(page, productId) {
  await buyNow(page, productId);
  await page.locator(tid('select-promptpay-desktop')).click();
  await page.locator(tid('btn-confirm-payment-desktop')).click();
  await expect(page).toHaveURL(/\/payment-qr/);
  await expect(page.locator(tid('promptpay-qr-image'))).toBeVisible();
  const orderNo = await page.evaluate(() => localStorage.getItem('orderNo'));
  await page.getByRole('button', { name: /ข้อมูลการชำระเงิน/ }).click();
  return orderNo;
}

export async function gotoOrders(page, status = 'ALL') {
  await page.goto(status === 'ALL' ? '/orders' : `/orders?status=${status}`);
  await expect(orderCards(page).first().or(page.getByText(MSG.noOrders))).toBeVisible();
}

/** การ์ดคำสั่งซื้อทั้งใบ (order-card-<id>) */
export const orderCards = (page) => page.locator('[data-test^="order-card-"]');

/** การ์ดของคำสั่งซื้อเลขที่ orderNo (เลขที่อยู่ใน card-order-<orderNo>) */
export const orderCard = (page, orderNo) =>
  orderCards(page).filter({ has: page.locator(tid(`card-order-${orderNo}`)) });
