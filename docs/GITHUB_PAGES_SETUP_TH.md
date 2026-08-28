# คู่มือเปิดใช้งาน KCG Health OSM บน GitHub Pages

เอกสารนี้อธิบายการเปิดใช้งานระบบจาก repository `aodxx/KCG-Health-OSM-V2` โดยให้ GitHub Actions เป็นผู้ติดตั้ง dependencies, build และเผยแพร่เว็บไซต์ไปยัง GitHub Pages อัตโนมัติ ผู้ใช้ไม่ต้องติดตั้ง Node.js, pnpm หรือโปรแกรมพัฒนาใด ๆ ลงในเครื่อง

> **ขอบเขตของคู่มือนี้:** ใช้สำหรับ Staging ที่กำลังพัฒนาอยู่ โฟลเดอร์ Google Drive และ Google Sheets อาจยังเปิดตามที่อนุมัติไว้ แต่ต้องใช้ข้อมูลสังเคราะห์เท่านั้น ห้ามใส่ข้อมูลสุขภาพจริงจนกว่าจะปิดสิทธิ์สาธารณะและแยก Production เรียบร้อยแล้ว

## 1. สิ่งที่เตรียมไว้แล้ว

โค้ดบน branch `main` มีรายการสำคัญดังนี้

| รายการ | ตำแหน่งหรือค่า |
|---|---|
| Repository | <https://github.com/aodxx/KCG-Health-OSM-V2> |
| Branch | `main` |
| GitHub Actions workflow | `.github/workflows/deploy-pages.yml` |
| Build command สำหรับ Pages | `pnpm build:pages` |
| Vite base path | `/KCG-Health-OSM-V2/` เมื่อ build บน GitHub Actions |
| Google Apps Script Web App | URL ที่กำหนดใน `VITE_APPS_SCRIPT_URL` หรือ fallback ใน API client |
| หน้าเว็บที่คาดว่าจะได้ | `https://aodxx.github.io/KCG-Health-OSM-V2/` |

Workflow จะทำงานเมื่อมี push ไปที่ `main` หรือเมื่อกด Run workflow เองจากหน้า Actions

## 2. สร้าง Google OAuth Client ID

ระบบใช้ Google Identity Services เพื่อให้เจ้าหน้าที่เข้าสู่ระบบด้วยบัญชี Google และส่ง ID token ไปตรวจสอบที่ Google Apps Script ค่า Client ID เป็นค่าที่เปิดเผยใน frontend ได้ แต่ **ห้ามนำ Client Secret มาใส่ในเว็บไซต์**

### 2.1 เปิด Google Cloud Console

เปิด [Google Cloud Console – Credentials](https://console.cloud.google.com/apis/credentials) แล้วเลือก Google Cloud Project ที่จะใช้กับระบบ หากยังไม่มี ให้กดสร้าง Project ใหม่และตั้งชื่อ เช่น `KCG Health OSM Staging`

### 2.2 ตั้งค่า OAuth consent screen

จากเมนูด้านซ้าย ให้เข้า **Google Auth Platform** หรือเมนู **OAuth consent screen** แล้วกำหนดค่าพื้นฐานดังนี้

| ช่อง | ค่าที่แนะนำสำหรับ Staging |
|---|---|
| App name | `KCG Health OSM Staging` |
| User support email | อีเมลผู้ดูแลระบบ |
| Developer contact information | อีเมลผู้ดูแลระบบ |
| Audience | เลือก Internal หากเป็น Google Workspace เดียวกัน; เลือก External หากต้องให้บัญชี Google ภายนอกทดสอบ |

สำหรับการทดสอบแบบ External อาจต้องเพิ่มบัญชีผู้ทดสอบใน **Test users** ก่อน การใช้ Internal เหมาะกับองค์กรที่ใช้ Google Workspace domain เดียวกันและมีสิทธิ์จัดการแอปภายในองค์กร

ระบบในระยะนี้ใช้การยืนยันตัวตนเพื่อรับ ID token จึงไม่ควรขอ scope ของ Google Drive หรือ Google Sheets จากผู้ใช้ฝั่ง frontend เพิ่ม ให้ Apps Script เป็นผู้เข้าถึงข้อมูลด้วยสิทธิ์ของเจ้าของสคริปต์แทน

### 2.3 สร้าง OAuth Client ID แบบ Web application

เข้า **Credentials → Create credentials → OAuth client ID** แล้วเลือก **Web application** จากนั้นเพิ่ม Authorized JavaScript origins ต่อไปนี้

| ใช้งาน | Origin ที่ต้องเพิ่ม |
|---|---|
| GitHub Pages | `https://aodxx.github.io` |
| ทดสอบ local หากจำเป็น | `http://localhost:5173` |
| โดเมนอื่นในอนาคต | ใส่เฉพาะ scheme + host + port เช่น `https://health.example.go.th` |

> **ข้อควรระวัง:** Authorized JavaScript origin ต้องเป็น origin เท่านั้น ไม่ต้องใส่ path `/KCG-Health-OSM-V2/` และไม่ต้องใส่ `/` ต่อท้ายในกรณีที่ระบบแจ้งว่าไม่ถูกต้อง

กด **Create** แล้วคัดลอก Client ID ที่มีรูปแบบใกล้เคียงกับ:

```text
123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

เก็บค่านี้ไว้ชั่วคราวเพื่อใส่ใน GitHub และ Apps Script ในขั้นตอนถัดไป ไม่ต้องส่ง Client ID หรือ Client Secret มาในแชต

## 3. เพิ่มค่าใน Google Apps Script

เปิด Apps Script project ที่ผูกกับ Google Sheets `อนามัย ตำบท.โคกชะงาย` แล้วเลือก **Project Settings** ทางซ้าย เลื่อนลงไปที่ **Script Properties** และเพิ่มค่าดังนี้

| Property | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID ที่สร้างจาก Google Cloud Console |
| `SPREADSHEET_ID` | `1fDkI4cGOb4bl7QEYnZxpAuwh6VDyHvy5Zqe3z8hjDXg` |
| `DRIVE_ROOT_ID` | `1DXPgX8WShuCn7cE-Cw8tf01fbO9yaXww` |
| `ENVIRONMENT` | `staging` |

กด Save ทุกค่า จากนั้นตรวจสอบว่า Apps Script Web App deployment มีค่าดังนี้

| Deployment setting | ค่าที่ควรใช้ใน Staging |
|---|---|
| Execute as | Me หรือบัญชีเจ้าของ Script |
| Who has access | ตามสิทธิ์ที่ต้องการทดสอบ; หาก frontend เรียกโดยผู้ใช้ภายนอก ต้องเลือกผู้มีสิทธิ์เข้าถึงที่สอดคล้องกับองค์กร |
| Version | New version หลังแก้ Code.gs หรือ Script Properties สำคัญ |

เมื่อแก้ Code.gs แล้ว ต้องสร้าง **New deployment version** หรือกด Manage deployments แล้วเลือกแก้ไข deployment ให้ชี้ไปที่ version ล่าสุด มิฉะนั้น URL `/exec` อาจยังใช้โค้ดเก่า

## 4. เพิ่มค่าใน GitHub Repository Variables

เปิดหน้า [Repository Settings](https://github.com/aodxx/KCG-Health-OSM-V2/settings) แล้วทำตามลำดับนี้

1. เลือกเมนู **Secrets and variables → Actions**
2. เลือกแท็บ **Variables** ไม่ใช่แท็บ Secrets
3. กด **New repository variable**
4. เพิ่มตัวแปรชื่อ `VITE_GOOGLE_CLIENT_ID`
5. วางค่า Client ID จาก Google Cloud Console
6. กด **Add variable**

จากนั้นเพิ่มตัวแปรอีกตัวเพื่อให้เปลี่ยน Web App URL ได้ภายหลังโดยไม่ต้องแก้ source code

| Name | Value |
|---|---|
| `VITE_APPS_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbx-HW8T0xB83aRzlFHFe_n0DhBGBNfdAaSLys5tIG0o52I1AmkaaHnwKSL0BSFqZ9jJxQ/exec` |

`VITE_GOOGLE_CLIENT_ID` และ `VITE_APPS_SCRIPT_URL` เป็นค่าที่ frontend ต้องใช้ตอน build จึงอยู่ใน **Variables** ได้ ไม่ใช่ข้อมูลลับแบบ password อย่างไรก็ตามห้ามใส่ Client Secret, JWT secret หรือ token สำหรับจัดการระบบไว้ในตัวแปร `VITE_*` เพราะค่า `VITE_*` จะถูกส่งเข้า browser

## 5. เปิด GitHub Pages ให้ใช้ GitHub Actions

เปิด [Repository Settings → Pages](https://github.com/aodxx/KCG-Health-OSM-V2/settings/pages) แล้วตั้งค่า

1. ในส่วน **Build and deployment**
2. ที่ช่อง **Source** เลือก `GitHub Actions`
3. ไม่ต้องเลือก branch ในช่อง Deploy from a branch เพราะ workflow จะจัดการ deployment เอง
4. หาก GitHub แสดงปุ่มให้อนุมัติ environment `github-pages` ให้กดยืนยันตามหน้าจอ

หากไม่เห็นเมนู Pages หรือเปลี่ยน Source ไม่ได้ ให้ตรวจสอบว่าเป็นเจ้าของ repository หรือมีสิทธิ์ **Admin** ใน repository นั้น การตั้งค่าผ่าน API อาจตอบ `403 Resource not accessible by integration` ได้แม้มีสิทธิ์ push code ดังนั้นการทำผ่านหน้า Settings เป็นวิธีที่เหมาะสมกว่าในกรณีนี้

## 6. รัน GitHub Actions ครั้งแรก

หลังเพิ่ม Variables และเปิด Pages แล้ว

1. เปิดแท็บ [Actions](https://github.com/aodxx/KCG-Health-OSM-V2/actions)
2. เลือก workflow ชื่อ **Deploy KCG Health OSM to GitHub Pages**
3. หากต้องการรันเอง ให้กด **Run workflow**
4. เลือก branch `main`
5. กด **Run workflow** สีเขียว
6. เปิดรายการ run ล่าสุดและรอให้ job `build` และ `deploy` เป็นเครื่องหมายถูกสีเขียว

Workflow ทำงานตามลำดับดังนี้

| Job | การทำงาน |
|---|---|
| `build` | checkout code, setup pnpm/Node.js, install dependencies และ build Vite |
| `Upload Pages artifact` | อัปโหลดโฟลเดอร์ `dist/public` เป็น Pages artifact |
| `deploy` | ใช้ `actions/deploy-pages` เผยแพร่ artifact ไปยัง GitHub Pages |

การ push ครั้งต่อไปไปที่ `main` จะรัน workflow โดยอัตโนมัติ ไม่ต้องกดรันเองทุกครั้ง

## 7. เปิดเว็บไซต์และตรวจสอบผล

เมื่อ workflow สำเร็จ เปิด URL นี้:

<https://aodxx.github.io/KCG-Health-OSM-V2/>

ตรวจสอบทีละข้อ

1. หน้าเว็บต้องเปิดได้โดยไม่ขึ้น 404
2. โลโก้และภาพประกอบต้องโหลดได้
3. เปิด DevTools หรือดูหน้าเว็บบนมือถือเพื่อตรวจว่า CSS และ JavaScript ไม่ 404
4. กด **เข้าสู่ระบบด้วย Google**
5. ตรวจสอบว่า Google popup หรือ One Tap แสดงขึ้น
6. หลัง login สำเร็จ ต้องเข้าสู่ Dashboard ไม่ใช่ค้างที่หน้า login
7. Dashboard ต้องเรียก `dashboard` และ `tasks.list`
8. เมื่อกดเปิดงาน ต้องเรียก `tasks.updateStatus`
9. แบบฟอร์มต้องแสดงขั้น **ตรวจสอบก่อนส่ง** ก่อนเรียก `visits.create`
10. หลังบันทึกสำเร็จ ต้องเห็น `visitId` และกลับ Dashboard ได้

> หน้า GitHub Pages เป็น static frontend จึงไม่ควรพยายามเปิด `/api/...` หรือคาดหวังให้ server ใน repository ทำงานบน Pages การอ่านและเขียนข้อมูลของระบบนี้ผ่าน Google Apps Script Web App URL โดยตรง

## 8. เพิ่มผู้ใช้งานทดสอบในชีต Users

การ login ด้วย Google สำเร็จไม่ได้หมายความว่าจะเข้า Dashboard ได้ทันที Backend ยังตรวจ allowlist ในชีต `Users` อีกชั้นหนึ่ง ให้เพิ่มแถวของบัญชีทดสอบตามหัวตารางที่มีอยู่ในชีต โดยค่าหลักต้องสอดคล้องกัน

| ฟิลด์ | ค่าตัวอย่างสำหรับ Staging |
|---|---|
| `googleEmail` | อีเมล Google ของผู้ทดสอบ |
| `status` | `active` |
| `role` | บทบาทที่กำหนดใน Code.gs เช่น `osm`, `staff` หรือค่าตาม schema ที่ใช้จริง |
| `areaId` | รหัสพื้นที่ที่ผู้ใช้มีสิทธิ์เห็น |

อย่าใช้ชื่อหรืออีเมลของบุคคลจริงในข้อมูลสาธิตโดยไม่จำเป็น และอย่าใส่ข้อมูลสุขภาพจริงในชีต Staging

## 9. ปัญหาที่พบบ่อยและวิธีแก้

### 9.1 ขึ้นว่า “ยังไม่ได้ตั้งค่า Google Client ID”

สาเหตุคือ GitHub Actions build ไม่ได้รับ `VITE_GOOGLE_CLIENT_ID` หรือ workflow run เกิดก่อนเพิ่ม variable

วิธีแก้คือกลับไปที่ **Settings → Secrets and variables → Actions → Variables** ตรวจชื่อให้ตรงตัวพิมพ์เล็กใหญ่ แล้วรัน workflow ใหม่ หากเพิ่ม variable แล้วแต่หน้าเว็บยังเป็นของเดิม ให้ตรวจว่า run ล่าสุดสำเร็จและ browser ไม่ได้ cache bundle เก่า

### 9.2 Google แจ้งว่า origin ไม่ได้รับอนุญาต

ให้กลับไปที่ Google Cloud Console → Credentials → OAuth Client ID แล้วเพิ่ม origin ให้ตรงกับเว็บไซต์จริง:

```text
https://aodxx.github.io
```

อย่าใส่ `https://aodxx.github.io/KCG-Health-OSM-V2/` เป็น origin และอย่าลืมกด Save จากนั้นรอให้การตั้งค่ากระจายก่อนทดสอบใหม่

### 9.3 Login ผ่าน Google แต่ backend ตอบ ACCESS_DENIED

ตรวจสามจุด ได้แก่ `GOOGLE_CLIENT_ID` ใน Script Properties ต้องตรงกับ frontend, อีเมลต้องอยู่ในชีต `Users`, และแถวนั้นต้องมี `status=active` รวมถึง area/role ต้องตรงกับค่าที่ backend ยอมรับ

### 9.4 Dashboard โหลดไม่สำเร็จ

ตรวจว่า Apps Script deployment ใช้ version ล่าสุด, URL ที่ใส่ใน `VITE_APPS_SCRIPT_URL` ลงท้ายด้วย `/exec`, Script Properties มี `SPREADSHEET_ID` ถูกต้อง และ deployment อนุญาตให้บัญชีที่ใช้ทดสอบเข้าถึงได้ จากนั้นทดสอบ endpoint ด้วยเมนู **Run** หรือ Executions ใน Apps Script และรัน GitHub Actions ใหม่

### 9.5 หน้าเว็บเปิดได้แต่รูปหรือไฟล์ CSS เป็น 404

ตรวจว่า URL อยู่ที่ `/KCG-Health-OSM-V2/` และ workflow ใช้ base path นี้แล้ว ถ้าดู source แล้ว asset ขึ้นต้นด้วย `/assets/` แทน `/KCG-Health-OSM-V2/assets/` แสดงว่า build ไม่ได้ตั้ง `GITHUB_ACTIONS=true` หรือกำลังดู artifact เก่า ให้ rerun workflow ล่าสุด

### 9.6 กด Deploy แล้ว workflow ถูกหยุดด้วย permission error

เข้า **Settings → Actions → General → Workflow permissions** และเลือก **Read and write permissions** หากองค์กรอนุญาต จากนั้นตรวจว่า repository มี Pages environment และ workflow มี permissions `pages: write` กับ `id-token: write` ตามไฟล์ที่เตรียมไว้ หากไม่มีสิทธิ์เปลี่ยนค่าเหล่านี้ ให้ผู้ดูแล repository ทำขั้นตอนแทน

## 10. สิ่งที่ต้องทำก่อนเปลี่ยนจาก Staging เป็น Production

ก่อนใช้งานข้อมูลจริง ต้องดำเนินการอย่างน้อยดังนี้

1. ปิดสิทธิ์ **Anyone with the link** ของ Google Drive folder และ Google Sheets ที่เก็บข้อมูลสุขภาพ
2. สร้างโฟลเดอร์และ Sheet แยกสำหรับ Production
3. เปลี่ยน `ENVIRONMENT` เป็น `production` ใน Apps Script project Production
4. สร้าง Apps Script deployment แยกและใช้ URL Production ใน GitHub Environment variable
5. จำกัดผู้ใช้ใน `Users` ให้เฉพาะบุคลากรที่ได้รับอนุญาต
6. ตรวจสอบ role, area scope และ audit log ด้วยบัญชีทดสอบหลายบทบาท
7. สำรองข้อมูลและกำหนดผู้รับผิดชอบเมื่อเกิดข้อผิดพลาด
8. ทดสอบ backup/restore และการปิดสิทธิ์ก่อนเปิดให้ใช้งานจริง

## 11. ลำดับสั้นที่สุดสำหรับการเปิดใช้งาน

หากตั้งค่า Google Cloud และ Apps Script ไว้แล้ว ให้ทำตามลำดับนี้

1. สร้าง Google OAuth Web Client ID
2. เพิ่ม `https://aodxx.github.io` ใน Authorized JavaScript origins
3. ใส่ Client ID ใน Apps Script Property ชื่อ `GOOGLE_CLIENT_ID`
4. เพิ่ม `VITE_GOOGLE_CLIENT_ID` ใน GitHub Actions Variables
5. เพิ่ม `VITE_APPS_SCRIPT_URL` ใน GitHub Actions Variables
6. เปิด GitHub Pages Source เป็น `GitHub Actions`
7. รัน workflow จากแท็บ Actions
8. เปิด `https://aodxx.github.io/KCG-Health-OSM-V2/`
9. เพิ่มบัญชีทดสอบในชีต `Users` หาก login แล้วถูกปฏิเสธ

## แหล่งอ้างอิง

- [Google Cloud – Manage OAuth client credentials](https://console.cloud.google.com/apis/credentials)
- [Google Identity Services – Web guides](https://developers.google.com/identity/gsi/web)
- [GitHub Docs – Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Docs – Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
