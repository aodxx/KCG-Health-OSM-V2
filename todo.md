# KCG Health OSM — งานระบบจริง

- [x] ตรวจสอบ branch `main` และโครงสร้าง repository KCG-Health-OSM-V2 ซึ่งเป็น repository ว่าง
- [x] ตรวจสอบโฟลเดอร์ Google Drive `อนามัยตำบท.โคกชะงาย` และสิทธิ์เข้าถึงสำหรับระยะพัฒนา โดยเปิดแบบ Anyone with link ตามที่ผู้ใช้อนุมัติ
- [x] ตรวจสอบ Google Sheets ที่อยู่ในโฟลเดอร์ และยืนยันว่าเป็นชีตเริ่มต้นที่ยังไม่มี backend เดิม
- [x] สร้างโครงสร้างชีต Staging และหัวตารางตาม Data Model โดยใช้ข้อมูลสังเคราะห์เท่านั้น; การสร้าง Apps Script project ยังรอสิทธิ์ OAuth เพิ่ม
- [ ] วางค่า environment และ API client โดยไม่มี secret ใน frontend หรือ GitHub
- [ ] ขอ/อนุมัติ OAuth scope `script.projects` สำหรับสร้างและอัปโหลด Google Apps Script backend
- [ ] พัฒนาและทดสอบการยืนยันตัวตน Google, RBAC และ Area Scope
- [ ] พัฒนาทะเบียน งานเยี่ยมบ้าน การคัดกรอง ความเสี่ยง และรายงานตาม MVP
- [ ] ทดสอบการบันทึก ข้อผิดพลาด และการใช้งานมือถือ
- [ ] ก่อน Production ต้องปิด Anyone with link และแยกโฟลเดอร์/ชีต Production
- [x] commit และ push การเปลี่ยนแปลงที่ผ่านการทดสอบไปยัง `main` ที่ commit `ce7cb33`
- [x] ผู้ใช้คัดลอก `apps-script/Code.gs` และ `apps-script/appsscript.json` ไปยัง Google Apps Script แล้ว Deploy เป็น Web App สำหรับ Staging
- [ ] ตั้งค่า `VITE_APPS_SCRIPT_URL` ใน frontend และทดสอบ Web App endpoint
