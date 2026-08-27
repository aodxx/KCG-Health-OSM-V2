# KCG Health OSM — งานระบบจริง

- [x] ตรวจสอบ branch `main` และโครงสร้าง repository KCG-Health-OSM-V2 ซึ่งเป็น repository ว่าง
- [x] ตรวจสอบโฟลเดอร์ Google Drive `อนามัยตำบท.โคกชะงาย` และสิทธิ์เข้าถึงสำหรับระยะพัฒนา โดยเปิดแบบ Anyone with link ตามที่ผู้ใช้อนุมัติ
- [x] ตรวจสอบ Google Sheets ที่อยู่ในโฟลเดอร์ และยืนยันว่าเป็นชีตเริ่มต้นที่ยังไม่มี backend เดิม
- [ ] สร้างโครงสร้าง Apps Script, Sheets และ Drive สำหรับ Staging โดยใช้ข้อมูลสังเคราะห์เท่านั้น
- [ ] วางค่า environment และ API client โดยไม่มี secret ใน frontend หรือ GitHub
- [ ] พัฒนาและทดสอบการยืนยันตัวตน Google, RBAC และ Area Scope
- [ ] พัฒนาทะเบียน งานเยี่ยมบ้าน การคัดกรอง ความเสี่ยง และรายงานตาม MVP
- [ ] ทดสอบการบันทึก ข้อผิดพลาด และการใช้งานมือถือ
- [ ] ก่อน Production ต้องปิด Anyone with link และแยกโฟลเดอร์/ชีต Production
- [ ] commit และ push การเปลี่ยนแปลงที่ผ่านการทดสอบไปยัง `main`
