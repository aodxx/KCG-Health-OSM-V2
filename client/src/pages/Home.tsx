/**
 * KCG Health OSM — แนวทาง “แดชบอร์ดแสงเช้า”
 * หน้านี้ใช้โครงสร้างแถบสถานะ + คอลัมน์ปฏิบัติการ เพื่อให้ mobile-first,
 * อ่านลำดับความสำคัญได้เร็ว และสื่ออย่างซื่อสัตย์ว่านี่คือโหมดสาธิตฝั่งหน้าบ้าน
 * ที่พร้อมเชื่อม Google Apps Script ผ่าน API client กลางในขั้นถัดไป
 */
import { useMemo, useState } from "react";
import {
  ArrowUpRight, Bell, BookOpen, CalendarDays, Check, ChevronRight,
  CircleHelp, ClipboardCheck, Clock3, FileDown, Home as HomeIcon,
  LayoutDashboard, LogIn, Menu, Phone, Plus, Search, ShieldCheck,
  Siren, Sparkles, Users, X, MapPin, Activity, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const navItems = [
  { label: "ภาพรวม", icon: LayoutDashboard },
  { label: "งานเยี่ยมบ้าน", icon: ClipboardList },
  { label: "ทะเบียนชุมชน", icon: Users },
  { label: "รายงาน", icon: FileDown },
];

const taskData = [
  { id: "KCG-2401", person: "นางสมใจ แก้วคำ", place: "หมู่ ๔ · บ้านหนองหว้า", type: "ติดตามความดัน", due: "วันนี้ 10:30 น.", priority: "เร่งด่วน", color: "coral" },
  { id: "KCG-2402", person: "นายประสิทธิ์ บุญช่วย", place: "หมู่ ๒ · บ้านโคกชะงาย", type: "เยี่ยมบ้านประจำรอบ", due: "วันนี้ 13:00 น.", priority: "ปกติ", color: "blue" },
  { id: "KCG-2403", person: "นางสาววาสนา ทองดี", place: "หมู่ ๖ · บ้านทุ่งยาว", type: "คัดกรองผู้สูงอายุ", due: "พรุ่งนี้ 09:00 น.", priority: "ปกติ", color: "blue" },
];

const activityData = [
  { time: "09:12", title: "ส่งผลเยี่ยมบ้านแล้ว", detail: "นางละเอียด · หมู่ ๓", tone: "success" },
  { time: "08:46", title: "รับงานใหม่เข้าคิว", detail: "คัดกรองผู้สูงอายุ ๓ ราย", tone: "blue" },
  { time: "เมื่อวาน", title: "เจ้าหน้าที่ตรวจรับข้อมูล", detail: "งานเยี่ยมบ้าน KCG-2388", tone: "yellow" },
];

function StatusPill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "coral" | "yellow" | "green" }) {
  const styles = { blue: "bg-[#e4eff8] text-[#235476]", coral: "bg-[#f9e5df] text-[#a94835]", yellow: "bg-[#fff1bd] text-[#775a10]", green: "bg-[#e4f0e6] text-[#2d6846]" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

function Metric({ label, value, note, accent, icon: Icon }: { label: string; value: string; note: string; accent: string; icon: React.ElementType }) {
  return <div className="metric-card group">
    <div className="flex items-start justify-between"><span className="section-kicker">{label}</span><span className={`metric-icon ${accent}`}><Icon size={17} strokeWidth={2.2} /></span></div>
    <div className="mt-5 flex items-end gap-2"><span className="font-display text-[2.35rem] leading-none text-[#19364b]">{value}</span><span className="mb-0.5 text-xs font-medium text-[#5d7788]">{note}</span></div>
  </div>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("ภาพรวม");
  const [publicMode, setPublicMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);

  const filteredTasks = useMemo(() => taskData.filter((task) => `${task.person} ${task.place} ${task.type}`.toLowerCase().includes(search.toLowerCase())), [search]);

  const startTask = (id: string) => {
    if (!completed.includes(id)) {
      setCompleted((items) => [...items, id]);
      toast.success("เปิดงานแล้ว", { description: "โหมดสาธิต: ขั้นตอนต่อไปคือแบบฟอร์มเยี่ยมบ้าน" });
    }
  };

  if (publicMode) return <PublicPortal onBack={() => setPublicMode(false)} />;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><img src="/manus-storage/kcg-mark_2780bda1.png" alt="KCG Health OSM" className="brand-mark" /><div><div className="brand-name">KCG</div><div className="brand-sub">HEALTH OSM</div></div></div>
      <div className="sidebar-context"><span className="context-dot" /> <span>โคกชะงาย · พัทลุง</span></div>
      <nav className="nav-list" aria-label="เมนูหลัก">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => { setActiveNav(label); setMenuOpen(false); if (label !== "ภาพรวม") toast.info(`${label} กำลังเตรียมเชื่อมต่อ`, { description: "โครงหน้าจอพร้อมใช้งานในเวอร์ชันถัดไป" }); }}><Icon size={18} /><span>{label}</span>{label === "งานเยี่ยมบ้าน" && <span className="nav-count">8</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="safety-note"><ShieldCheck size={17} /><div><strong>ข้อมูลอยู่ในขอบเขต</strong><span>แสดงตามสิทธิ์พื้นที่ของคุณ</span></div></div><button className="public-link" onClick={() => setPublicMode(true)}><HomeIcon size={16} /> ดูหน้าสำหรับประชาชน <ArrowUpRight size={14} /></button><div className="profile-row"><div className="avatar">ส</div><div className="min-w-0"><div className="profile-name">สมชาย ใจดี</div><div className="profile-role">อสม. · หมู่ ๔</div></div><button className="icon-button" aria-label="ช่วยเหลือ" onClick={() => toast.info("ศูนย์ช่วยเหลือ", { description: "ติดต่อ รพ.สต.โคกชะงาย ในเวลาราชการ" })}><CircleHelp size={17} /></button></div></div>
    </aside>
    {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู" />}
    <main className="main-panel">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู"><Menu size={21} /></button><div className="breadcrumb"><span>งานของฉัน</span><ChevronRight size={14} /><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" onClick={() => toast.info("ยังไม่มีการแจ้งเตือนใหม่")} aria-label="การแจ้งเตือน"><Bell size={19} /><span className="notification-dot" /></button><button className="user-chip" onClick={() => toast.info("บัญชีผู้ใช้", { description: "สมชาย ใจดี · อสม. หมู่ ๔" })}><span className="avatar small">ส</span><span className="hidden sm:block">สมชาย</span></button></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="sun-line" /> วันพฤหัสบดี ๒๘ สิงหาคม ๒๕๖๙</div><h1>สวัสดีครับ, สมชาย <span className="wave-mark">/</span></h1><p>วันนี้มี <strong>๘ งาน</strong> ที่พาเราเข้าใกล้ชุมชนมากขึ้น</p></div><div className="quick-actions"><Button className="primary-button" onClick={() => toast.info("เริ่มบันทึกเยี่ยมบ้าน", { description: "เลือกบุคคลจากทะเบียนเพื่อเริ่มงาน" })}><Plus size={17} /> บันทึกเยี่ยมบ้าน</Button><button className="secondary-action" onClick={() => toast.info("เปิดตัวกรองพื้นที่")}><MapPin size={16} /> หมู่ ๔ <ChevronRight size={15} /></button></div></section>
        <div className="notice-bar"><div className="notice-icon"><Sparkles size={16} /></div><div><strong>เริ่มจากงานที่ต้องติดตามวันนี้</strong><span>มี ๑ เคสที่ควรตรวจสอบก่อนเวลา ๑๐:๓๐ น.</span></div><button onClick={() => document.getElementById("task-list")?.scrollIntoView({ behavior: "smooth" })}>เปิดงานถัดไป <ArrowUpRight size={15} /></button></div>
        <section className="metrics-grid"><Metric label="งานวันนี้" value="๘" note="รายการ" accent="metric-yellow" icon={ClipboardCheck} /><Metric label="งานค้าง" value="๓" note="ต้องติดตาม" accent="metric-coral" icon={Clock3} /><Metric label="ส่งแล้วเดือนนี้" value="๒๔" note="รายการ" accent="metric-blue" icon={Activity} /><Metric label="ครัวเรือนรับผิดชอบ" value="๔๘" note="หลังคาเรือน" accent="metric-green" icon={HomeIcon} /></section>
        <div className="section-grid"><section id="task-list" className="task-panel"><div className="panel-heading"><div><div className="section-kicker">คิวปฏิบัติการ</div><h2>งานที่ต้องทำ</h2></div><button className="text-action" onClick={() => toast.info("แสดงงานทั้งหมด", { description: "ตัวกรองขั้นสูงจะพร้อมในเวอร์ชันถัดไป" })}>ดูทั้งหมด <ArrowUpRight size={15} /></button></div><div className="search-box"><Search size={17} /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ บ้าน หรือประเภทงาน" /></div><div className="task-list">{filteredTasks.map((task) => <div className={`task-row ${completed.includes(task.id) ? "task-done" : ""}`} key={task.id}><div className={`task-priority ${task.color}`} /><div className="task-main"><div className="flex flex-wrap items-center gap-2"><span className="task-code">{task.id}</span><StatusPill tone={task.priority === "เร่งด่วน" ? "coral" : "blue"}>{completed.includes(task.id) ? "เปิดแล้ว" : task.priority}</StatusPill></div><h3>{task.person}</h3><p>{task.type} <span>·</span> {task.place}</p></div><div className="task-due"><span>{task.due}</span><button className="task-arrow" onClick={() => startTask(task.id)} aria-label={`เปิดงาน ${task.person}`}><ChevronRight size={18} /></button></div></div>)}{filteredTasks.length === 0 && <div className="empty-state">ไม่พบงานที่ตรงกับการค้นหา</div>}</div></section><aside className="activity-panel"><div className="panel-heading"><div><div className="section-kicker">บันทึกล่าสุด</div><h2>ความเคลื่อนไหว</h2></div><button className="icon-button" aria-label="ดูความเคลื่อนไหวทั้งหมด" onClick={() => toast.info("ประวัติกิจกรรม", { description: "แสดงเฉพาะกิจกรรมในขอบเขตงานของคุณ" })}><ArrowUpRight size={16} /></button></div><div className="timeline">{activityData.map((item) => <div className="timeline-item" key={item.time + item.title}><div className={`timeline-dot ${item.tone}`} /><div><div className="timeline-time">{item.time}</div><h3>{item.title}</h3><p>{item.detail}</p></div></div>)}</div><div className="mini-card"><div className="mini-card-icon"><CalendarDays size={18} /></div><div><strong>ตารางออกหน่วย</strong><span>ศุกร์นี้ · ศาลาประชาคม หมู่ ๔</span></div><button onClick={() => toast.info("ตารางบริการ", { description: "ศูนย์คัดกรอง NCD · 09:00–12:00 น." })}><ChevronRight size={17} /></button></div></aside></div>
        <section className="bottom-strip"><div className="strip-copy"><div className="section-kicker">การบันทึกที่ปลอดภัย</div><h2>ทุกการเยี่ยมบ้านมีร่องรอยให้ตรวจสอบ</h2><p>ข้อมูลจะถูกตรวจสิทธิ์พื้นที่และบันทึกประวัติการเปลี่ยนแปลงก่อนส่งต่อเจ้าหน้าที่</p></div><div className="strip-stat"><span className="strip-number">100%</span><span>รายการที่ส่งแล้ว<br />มีสถานะตรวจสอบย้อนหลัง</span></div><div className="strip-mark"><ShieldCheck size={28} /><span>Privacy<br />by design</span></div></section>
        <footer className="footer"><span>KCG Health OSM · เวอร์ชันสาธิตหน้าบ้าน</span><span><button onClick={() => toast.info("สถานะระบบ", { description: "Frontend พร้อมใช้งาน · Backend ยังไม่ได้เชื่อมต่อ" })}>สถานะระบบ</button><span className="footer-sep">/</span><button onClick={() => toast.info("นโยบายข้อมูล", { description: "ใช้ข้อมูลเท่าที่จำเป็นตามบทบาทและพื้นที่" })}>นโยบายข้อมูล</button></span></footer>
      </div>
    </main>
  </div>;
}

function PublicPortal({ onBack }: { onBack: () => void }) {
  return <div className="public-page"><header className="public-topbar"><div className="brand-lockup"><img src="/manus-storage/kcg-mark_2780bda1.png" alt="KCG Health OSM" className="brand-mark" /><div><div className="brand-name">KCG</div><div className="brand-sub">HEALTH OSM</div></div></div><button className="public-back" onClick={onBack}><LogIn size={16} /> สำหรับเจ้าหน้าที่</button></header><main className="public-content"><section className="public-hero"><div className="public-hero-copy"><div className="eyebrow"><span className="sun-line" /> หน่วยบริการปฐมภูมิใกล้บ้าน</div><h1>สุขภาพชุมชน<br /><em>เริ่มต้นที่โคกชะงาย</em></h1><p>ข่าวสาร ตารางบริการ และช่องทางติดต่อจาก รพ.สต.โคกชะงาย เปิดดูได้ทันทีโดยไม่ต้องติดตั้งแอป</p><div className="public-hero-actions"><a className="primary-button" href="tel:074000000"><Phone size={17} /> โทรติดต่อหน่วยบริการ</a><button className="secondary-action" onClick={() => toast.info("ข้อมูลบริการ", { description: "เปิดให้บริการวันจันทร์–ศุกร์ 08:30–16:30 น." })}>ดูตารางบริการ <ChevronRight size={15} /></button></div></div><div className="hero-image-wrap"><img src="/manus-storage/kcg-community-hero_a5872689.jpg" alt="เจ้าหน้าที่และ อสม. ในชุมชน" /><div className="hero-caption"><MapPin size={14} /> ตำบลโคกชะงาย · จังหวัดพัทลุง</div></div></section><section className="public-cards"><article className="public-card feature"><div className="card-label">ประกาศล่าสุด · ๒๘ ส.ค. ๒๕๖๙</div><h2>ตรวจสุขภาพกลุ่มเสี่ยง<br />ประจำเดือนกันยายน</h2><p>ลงทะเบียนคัดกรองเบาหวานและความดัน ณ ศาลาประชาคมหมู่ ๔ ในวันศุกร์นี้</p><button onClick={() => toast.info("ประกาศกิจกรรม", { description: "เวลา 09:00–12:00 น. กรุณานำบัตรประชาชนมาด้วย" })}>อ่านรายละเอียด <ArrowUpRight size={15} /></button></article><article className="public-card"><div className="public-card-icon yellow"><CalendarDays size={21} /></div><div className="card-label">ตารางบริการ</div><h3>ออกหน่วยใกล้บ้าน</h3><p>ดูวัน เวลา และพื้นที่ให้บริการของเดือนนี้</p><button onClick={() => toast.info("ตารางบริการ", { description: "มี ๔ กิจกรรมในเดือนนี้" })}>ดูตาราง <ChevronRight size={15} /></button></article><article className="public-card"><div className="public-card-icon blue"><BookOpen size={21} /></div><div className="card-label">ความรู้สุขภาพ</div><h3>ดูแลตัวเองได้ทุกวัน</h3><p>เนื้อหาที่ผ่านการตรวจทานจากบุคลากรสุขภาพ</p><button onClick={() => toast.info("คลังความรู้", { description: "กำลังเตรียมบทความสำหรับประชาชน" })}>เปิดคลังความรู้ <ChevronRight size={15} /></button></article></section><section className="emergency-banner"><div className="emergency-icon"><Siren size={22} /></div><div><strong>กรณีฉุกเฉิน โทร 1669</strong><span>เว็บนี้ไม่ใช่บริการฉุกเฉิน หากมีอาการรุนแรงให้โทรขอความช่วยเหลือทันที</span></div><a href="tel:1669"><Phone size={17} /> โทร 1669</a></section></main><footer className="public-footer"><span>รพ.สต.โคกชะงาย · ตำบลโคกชะงาย จังหวัดพัทลุง</span><span>ระบบสาธารณะไม่แสดงข้อมูลสุขภาพรายบุคคล</span></footer></div>;
}
