import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export const AUTH_FILE = 'playwright/.auth/customer.json';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // ทุกเทสใช้บัญชีลูกค้าเดียวกัน (รถเข็น/ที่อยู่/คำสั่งซื้อ) จึงรันทีละเทสเพื่อไม่ให้ข้อมูลชนกัน
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://storemate-final.vercel.app',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // เข้าสู่ระบบบัญชีลูกค้าหนึ่งครั้ง แล้วเก็บ session ไว้ให้ project "customer"
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    // ผู้เยี่ยมชม (ยังไม่เข้าสู่ระบบ)
    { name: 'guest', testDir: './tests/guest' },
    // ลูกค้าที่เข้าสู่ระบบแล้ว (ใช้ session จาก setup)
    {
      name: 'customer',
      testDir: './tests/customer',
      use: { storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    // เทสที่ต้องการบัญชีใหม่ที่ไม่มีข้อมูล (สมัครบัญชีใหม่ในตัวเทสเอง)
    { name: 'fresh', testDir: './tests/fresh' },
  ],
});
