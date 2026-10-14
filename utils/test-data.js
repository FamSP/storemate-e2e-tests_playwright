import 'dotenv/config';

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();

export const CUSTOMER = {
  email: env('CUSTOMER_EMAIL', 'customer@test.com'),
  password: env('CUSTOMER_PASSWORD', 'Customer1234'),
};

export const SUSPENDED = {
  email: env('SUSPENDED_EMAIL'),
  password: env('SUSPENDED_PASSWORD'),
};

export const EXISTING = {
  email: env('EXISTING_EMAIL'),
  phone: env('EXISTING_PHONE'),
};

export const PRODUCT_ID = env('PRODUCT_ID', '53');
export const SECOND_PRODUCT_ID = env('SECOND_PRODUCT_ID', '64');
export const UNAVAILABLE_PRODUCT_ID = env('UNAVAILABLE_PRODUCT_ID');


export const VALID_PASSWORD = 'Test1234';

// ข้อความจากโค้ดหน้าเว็บ (storemate/src) ต้องตรงทุกตัวอักษร
export const MSG = {
  registerSuccess: 'ลงทะเบียนสำเร็จ',
  requiredName: 'กรุณากรอกชื่อ-นามสกุล',
  requiredEmail: 'กรุณากรอกอีเมล',
  requiredPhone: 'กรุณากรอกเบอร์โทรศัพท์',
  requiredPassword: 'กรุณากรอกรหัสผ่าน',
  requiredConfirm: 'กรุณายืนยันรหัสผ่าน',
  invalidEmail: 'กรุณากรอกอีเมลให้ถูกต้อง',
  invalidPhone: 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 10 หลัก',
  pwMin: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
  pwUpper: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัวอักษร',
  // หมายเหตุ: ในโค้ดเขียนว่า "ตัวตัวพิมพ์เล็ก" (คำซ้ำ) จึงใช้ regex ให้ผ่านทั้งแบบเดิมและแบบที่แก้แล้ว
  pwLower: /รหัสผ่านต้องมีตัว(ตัว)?พิมพ์เล็กอย่างน้อย 1 ตัวอักษร/,
  pwDigit: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัวเลข',
  pwMismatch: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน',
  duplicateEmail: /อีเมลนี้ถูกใช้งานแล้ว|Exist by email/i,
  duplicatePhone: /เบอร์โทรศัพท์นี้มีผู้ใช้แล้ว|Exist by phone/i,
  loginSuccess: 'เข้าสู่ระบบสำเร็จ',
  loginInvalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  loginSuspended: 'บัญชีนี้ถูกระงับการใช้งาน',
  loginIncomplete: 'กรุณากรอกข้อมูลให้ครบถ้วน',
  emptyCategory: 'ไม่พบรายการสินค้า',
  searchNotFound: 'ไม่พบสินค้าที่คุณค้นหา',
  addedToCart: 'เพิ่มสินค้าเข้ารถเข็นเรียบร้อยแล้ว',
  loginBeforeCart: 'กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงรถเข็น',
  alreadyInCart: /ไม่สามารถเพิ่มจำนวนสินค้าได้ เนื่องจากคุณเพิ่มสินค้านี้ไว้ในรถเข็นแล้ว \d+ ชิ้น/,
  cartStockLimit: 'ขออภัย สินค้าชิ้นนี้มีจำนวนจำกัดในคลังไม่สามารถเพิ่มได้',
  confirmRemoveItem: 'คุณต้องการลบสินค้านี้ใช่หรือไม่?',
  confirmRemoveAll: 'คุณต้องการลบสินค้าทั้งหมดนี้ใช่หรือไม่?',
  itemRemoved: 'ลบสินค้าแล้ว',
  itemsRemoved: 'ลบสินค้าสำเร็จ',
  selectItemFirst: 'กรุณาเลือกสินค้าก่อน',
  emptyCart: 'ไม่มีสินค้าในรถเข็น',
  unavailable: 'ไม่พร้อมจำหน่าย',
  profileSaved: 'แก้ไขข้อมูลโปรไฟล์สำเร็จ',
  fileTooLarge: 'ขนาดไฟล์ต้องไม่เกิน 5 MB',
  fileType: 'รองรับเฉพาะไฟล์ PNG, JPEG และ JPG',
  noAddress: 'ไม่มีข้อมูลที่อยู่ของคุณ',
  addressAdded: 'เพิ่มที่อยู่สำเร็จ',
  addressEdited: 'แก้ไขที่อยู่สำเร็จ',
  addressDeleted: 'ลบที่อยู่สำเร็จ',
  addressRequired: 'กรุณากรอกข้อมูลให้ครบถ้วน',
  lastAddress: 'ไม่สามารถลบได้ เนื่องจากต้องมีที่อยู่เริ่มต้นอย่างน้อย 1 รายการ',
  confirmDeleteAddress: 'คุณต้องการลบที่อยู่นี้ใช่หรือไม่?',
  orderSuccess: 'คำสั่งซื้อสำเร็จ',
  noOrders: 'ยังไม่มีรายการคำสั่งซื้อ',
  noNotification: 'ไม่มีการแจ้งเตือนในหมวดหมู่นี้',
  cancelSuccess: 'ส่งคำขอยกเลิกสำเร็จ',
  cancelReasonRequired: 'กรุณาเลือกเหตุผลในการยกเลิกคำสั่งซื้อ',
};

// แท็บสถานะในหน้า "การซื้อของฉัน" (/orders?status=...)
export const ORDER_STATUS = {
  ALL: 'ทั้งหมด',
  COMPLETED: 'คำสั่งซื้อสำเร็จ',
  PENDING: 'ที่ต้องชำระ',
  PROCESSING: 'ที่ต้องจัดส่ง',
  RECEIVED: 'ที่ต้องได้รับ',
  CANCELLED: 'ยกเลิก',
  REFUNDED: 'คืนเงิน',
};

export function uniqueUser(prefix = 'qa') {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: 'สมชาย ใจดี',
    email: `${prefix}.${stamp}@storemate-test.com`,
    // 09 + 8 หลักสุ่ม = 10 หลัก ขึ้นต้นด้วย 0 ตามกฎของระบบ
    phone: `09${stamp.slice(-8)}`,
    password: VALID_PASSWORD,
  };
}
