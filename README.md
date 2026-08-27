# KCG Health OSM V2

ระบบเว็บสำหรับสนับสนุนงาน อสม. และเจ้าหน้าที่ รพ.สต.โคกชะงาย ตาม PRD โดยแยกหน้าบ้านแบบ React/Vite ออกจาก backend ที่ทำงานบน Google Apps Script และใช้ Google Sheets เป็นฐานข้อมูลหลักกับ Google Drive เป็นพื้นที่ไฟล์

## ระยะพัฒนา Staging

การพัฒนาใช้โฟลเดอร์ Google Drive ที่ผู้ใช้ระบุไว้แล้ว โดยมีค่าอ้างอิงดังนี้

| รายการ | ค่า |
|---|---|
| Repository | `aodxx/KCG-Health-OSM-V2` |
| Branch | `main` |
| Drive Folder ID | `1DXPgX8WShuCn7cE-Cw8tf01fbO9yaXww` |
| Spreadsheet ID | `1fDkI4cGOb4bl7QEYnZxpAuwh6VDyHvy5Zqe3z8hjDXg` |
| Timezone | `Asia/Bangkok` |
| Environment | `staging` |

ช่วงพัฒนานี้อนุญาตให้โฟลเดอร์เปิดแบบ Anyone with the link ได้ตามคำสั่งของผู้ใช้ แต่ **ห้ามใส่ข้อมูลสุขภาพจริง** ให้ใช้ข้อมูลสังเคราะห์เท่านั้น เพราะสิทธิ์เปิดลิงก์ไม่เหมาะกับ Production

## โครงสร้างฐานข้อมูล

Apps Script จะใช้ชีตต่อไปนี้ โดยแถวแรกเป็นชื่อคอลัมน์และห้ามเปลี่ยนชื่อเองหลังเริ่มใช้งานจริง: `Config`, `Users`, `UserAreas`, `Sessions`, `Areas`, `Households`, `Persons`, `PersonAssignments`, `Tasks`, `TaskEvents`, `Visits`, `Measurements`, `ScreeningResponses`, `RiskFlags`, `Referrals`, `FollowUps`, `Attachments`, `ExportJobs`, `AuditLog`, `Lookups` ทั้งหมดมี ID แบบ UUID และ timestamp แบบ ISO 8601

## ตั้งค่า Apps Script

สร้างหรือเปิด Apps Script ที่ผูกกับ Spreadsheet แล้วคัดลอก `apps-script/Code.gs` และ `apps-script/appsscript.json` เข้าไป จากนั้นกำหนด Script Properties ต่อไปนี้ใน Project Settings

| Property | ค่า |
|---|---|
| `SPREADSHEET_ID` | `1fDkI4cGOb4bl7QEYnZxpAuwh6VDyHvy5Zqe3z8hjDXg` |
| `DRIVE_ROOT_ID` | `1DXPgX8WShuCn7cE-Cw8tf01fbO9yaXww` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID ของ Google Identity Services สำหรับ frontend |
| `ENVIRONMENT` | `staging` |

ก่อน Deploy ต้องรันฟังก์ชันเตรียมชีตใน migration ที่จะเพิ่มในขั้นถัดไป และตรวจว่าไม่มีข้อมูลจริงใน Staging

## API contract เบื้องต้น

Backend รับ `POST` ที่ body เป็น JSON และคืน JSON พร้อม `requestId` และ `apiVersion` เสมอ ตัวอย่าง action ที่รองรับใน Staging ได้แก่ `health`, `public.home`, `auth.google`, `auth.logout`, `dashboard`, `tasks.list`, `tasks.updateStatus`, `registry.search` และ `visits.create` ทุกคำขอข้อมูลสุขภาพต้องส่ง `sessionToken` และตรวจสิทธิ์ฝั่ง server

## ความปลอดภัยก่อน Production

ก่อนเปิดใช้งานจริงต้องสร้าง Spreadsheet และ Drive Folder สำหรับ Production แยกจาก Staging ปิดสิทธิ์ Anyone with link ทั้งโฟลเดอร์และไฟล์ ตั้ง Apps Script deployment ให้ใช้บัญชีหน่วยงานตามนโยบาย และตรวจสอบ allowlist ผู้ใช้, RBAC, Area Scope, Audit Log, Session Revocation และการสำรองข้อมูลก่อนนำข้อมูลจริงเข้า

## คำสั่งพัฒนา

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```
