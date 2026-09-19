# 🚀 IT Support Services Suite

ระบบบริหารจัดการงานซ่อมบำรุงและ Helpdesk แบบครบวงจร (Standalone Web Application) ออกแบบมาสำหรับการทำงานบนระบบปฏิบัติการ Windows โดยเฉพาะ รองรับการทำงานแบบ Real-time และระบบจัดการฐานข้อมูลในตัว (Self-contained) โดยไม่ต้องพึ่งพา Database Server ภายนอก

## 🌟 จุดเด่นของโปรเจกต์ (Key Features)

*   **Standalone Deployment:** แพ็กเกจระบบทั้งหมดจบในไฟล์ `.exe` พร้อมตัวติดตั้ง (Installer) ทำให้สามารถนำไป Deploy บน Windows Server หรือ PC ทั่วไปได้ทันทีโดยไม่ต้องติดตั้ง Node.js ล่วงหน้า
*   **Real-time Communication:** ใช้ `Socket.io` ในการอัปเดตสถานะเคสและระบบแชทแบบเรียลไทม์ โดยไม่ต้องรีเฟรชหน้าจอ
*   **Self-Contained Database:** จัดเก็บข้อมูลด้วย `SQLite3` ไว้ในโฟลเดอร์โปรเจกต์โดยตรง ทำให้ง่ายต่อการสำรองข้อมูล (Backup) และย้ายเซิร์ฟเวอร์ (Migration)
*   **Smart Triage & Auto-Sorting:** ระบบประเมินความเร่งด่วนของปัญหาจากลูกค้าอัตโนมัติ พร้อมจัดเรียงคิวงาน (Priority) บน Dashboard เพื่อให้ทีม IT โฟกัสถูกจุด
*   **Role-Based Access Control (RBAC):** แบ่งสิทธิ์ผู้ใช้งานชัดเจนถึง 5 ระดับ (Host Admin, Admin, IT Staff, Client, Audit)
*   **Secure Session & Soft Delete:** มีระบบระงับบัญชีผู้ใช้ (Soft Delete) เพื่อรักษาประวัติ Log การทำงานเก่า พร้อมระบบ Force Logout เตะผู้ใช้ที่ถูกระงับออกจากระบบทันที
*   **Internal Notes:** ระบบแชทลับ (Internal Chat) เฉพาะทีม IT และ Admin ภายในโฟลเดอร์งานของลูกค้าแต่ละราย
*   **Automated Monthly Reporting:** สรุปยอดเคส (Token Billing) ประจำเดือนอัตโนมัติ

## 🛠️ Tech Stack

*   **Frontend:** HTML5, Tailwind CSS, JavaScript (Vanilla)
*   **Backend:** Node.js, Express.js
*   **Real-time Engine:** Socket.io
*   **Database:** SQLite3
*   **File Upload:** Multer
*   **Build & Deployment:** pkg (Node.js executable), Inno Setup (Windows Installer)

## 👥 ระบบสิทธิ์ผู้ใช้งาน (User Roles)

1.  **Client (ผู้แจ้ง):** เปิดเคส, ประเมินความรุนแรง, อัปโหลดไฟล์รูป/วิดีโอ, และแชทคุยกับ IT
2.  **IT Staff (ช่างเทคนิค):** รับงาน (In Progress), สื่อสารกับลูกค้า, บันทึกข้อความภายใน, และส่งงานตรวจ
3.  **Admin (ผู้กระจายงาน):** ตรวจสอบภาพรวม, กำหนดช่างเทคนิคให้เคส, และตรวจสอบงาน
4.  **Host Admin (ผู้ดูแลระบบสูงสุด):** อนุมัติปิดเคส (Sign & Approve), ลบเคส, สร้าง/ระงับบัญชีผู้ใช้, และรีเซ็ตรหัสผ่าน (ต้องใช้ PIN)
5.  **Audit (ผู้ตรวจสอบ):** ดูภาพรวมทั้งหมดแบบ Read-Only รวมถึงรายงานประจำเดือน

## ⚙️ การติดตั้งและใช้งาน (Installation)

### สำหรับผู้ใช้งานทั่วไป (Production)
1. ดาวน์โหลดไฟล์ `IT-Support-Setup.exe` จาก Release
2. ดับเบิลคลิกเพื่อติดตั้ง ระบบจะทำการเปิด Port 3000 บน Windows Firewall ให้อัตโนมัติ
3. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` (หรือใช้ IP ของเครื่องเซิร์ฟเวอร์ในวง LAN)

### สำหรับนักพัฒนา (Development)
```bash
# 1. Clone โปรเจกต์
git clone https://github.com/yourusername/it-ticket-app.git

# 2. เข้าสู่โฟลเดอร์
cd it-ticket-app

# 3. ติดตั้ง Dependencies
npm install

# 4. รันเซิร์ฟเวอร์
node server.js

# 5. production
localhost:3000
```

## 📸 ภาพหน้าจอ (Screenshots)
*(นำรูปภาพหน้าจอโปรเจกต์ของคุณ เช่น หน้า Login, Dashboard, หน้าต่าง Chat มาใส่ที่นี่ เพื่อให้อาจารย์เห็นภาพชัดเจนขึ้น)*
<img width="1308" height="741" alt="image" src="https://github.com/user-attachments/assets/cc45c90d-9257-4680-91d3-2dfa439772e9" />

<img width="1357" height="860" alt="image" src="https://github.com/user-attachments/assets/5c603279-8c92-4b5d-bfa4-7af88519de98" />
