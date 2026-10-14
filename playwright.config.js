import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // รันทีละเทสเพื่อลดภาระเว็บจริงและให้ผลคงที่
  fullyParallel: false,
  workers: 1,
  // เว็บจริงบางครั้งตอบช้า ให้ลองใหม่ 1 ครั้งก่อนสรุปว่าไม่ผ่าน
  retries: 1,
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
    // US-03 ดูรายการสินค้า, US-04 ค้นหาและกรองสินค้า, US-05 ดูรายละเอียดสินค้า (ไม่ต้องเข้าสู่ระบบ)
    { name: 'guest', testDir: './tests/guest' },
  ],
});
