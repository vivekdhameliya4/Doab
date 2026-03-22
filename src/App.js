import { useState, useEffect, createContext, useContext, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  useVendors, useInvoices, useProducts, useCustomers,
  useExpenses, usePOs, useRecipes, useWaste, useCash,
  useShifts, useSchedules, LoadingScreen, DbError, HAS_SUPABASE,
} from "./hooks";


// ── Download utilities ────────────────────────────────────────────────────────
const downloadCSV = (filename, headers, rows) => {
  const escape = v => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const downloadTimesheetCSV = (shifts) => {
  // Group by week (Sun-Sat) and employee
  const rows = [];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  
  // Get all unique employee names
  const employees = [...new Set(shifts.map(s => s.staffName))].sort();
  
  // Get all unique dates sorted
  const dates = [...new Set(shifts.map(s => s.date))].sort();
  
  // Get week start (Sunday) for each date
  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0];
  };
  
  const weeks = [...new Set(dates.map(getWeekStart))].sort();
  
  // Header
  const headers = ['Employee', 'Week', 'Sun','Mon','Tue','Wed','Thu','Fri','Sat',
                   'Sun In','Sun Out','Mon In','Mon Out','Tue In','Tue Out',
                   'Wed In','Wed Out','Thu In','Thu Out','Fri In','Fri Out',
                   'Sat In','Sat Out','Total Hours'];
  
  weeks.forEach(weekStart => {
    const weekDates = days.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
    
    employees.forEach(emp => {
      const row = [emp, `Week of ${weekStart}`];
      let totalHours = 0;
      
      // Daily hours
      const dailyHours = weekDates.map(date => {
        const shift = shifts.find(s => s.staffName === emp && s.date === date);
        if (shift) { totalHours += Number(shift.hours || 0); }
        return shift ? Number(shift.hours || 0) : '';
      });
      row.push(...dailyHours);
      
      // Clock in/out per day
      weekDates.forEach(date => {
        const shift = shifts.find(s => s.staffName === emp && s.date === date);
        row.push(shift?.clockIn || '');
        row.push(shift?.clockOut || '');
      });
      
      row.push(totalHours.toFixed(2));
      rows.push(row);
    });
  });
  
  downloadCSV(`timesheet_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
};

// ── API endpoint — proxy server for production, direct for dev ────────────────
// Always use relative path — React proxy forwards to server.js (no CORS issues)
const IS_ARTIFACT = typeof window !== "undefined" && window.location.hostname.includes("claude.ai");
const API_URL = (() => {
  if (typeof window === "undefined") return "/api/claude";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:3001/api/claude";
  if (h.includes("claude.ai")) return "https://api.anthropic.com/v1/messages";
  return "/api/claude"; // Vercel
})();

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
const SEED_VENDORS = [];
const SEED_INVOICES = [];
const SEED_PRODUCTS = [];
const SEED_CUSTOMERS = [];
const SEED_EXPENSES = [];
const SEED_STAFF = [];
const SEED_SHIFTS = [];
const SALES_DATA = [
  { day:"Mon", sales:3200, orders:42 }, { day:"Tue", sales:2800, orders:36 },
  { day:"Wed", sales:4100, orders:54 }, { day:"Thu", sales:3600, orders:47 },
  { day:"Fri", sales:4800, orders:62 }, { day:"Sat", sales:5200, orders:71 },
  { day:"Sun", sales:2400, orders:31 },
];
const MONTHLY_DATA = [
  { month:"Oct", sales:38000 }, { month:"Nov", sales:42000 }, { month:"Dec", sales:61000 },
  { month:"Jan", sales:35000 }, { month:"Feb", sales:39000 }, { month:"Mar", sales:28000 },
];
const CATEGORY_SALES = [
  { category:"Dairy",     sales:12400 }, { category:"Bakery", sales:8200 },
  { category:"Beverages", sales:6800 },  { category:"Snacks", sales:5100 },
  { category:"Other",     sales:3200 },
];
const ROLE_COLORS = { Admin:{bg:"#fff0e6",text:"#c45c00",dot:"#e87c2b"}, Manager:{bg:"#e8f0ff",text:"#2952c4",dot:"#4a7cf7"}, Cashier:{bg:"#e8f7ee",text:"#1a7a42",dot:"#2ecc71"} };
const EXPENSE_CATS = ["Utilities","Rent","Equipment","Maintenance","Software","Marketing","Other"];
const FEATURES = [
  { key:"pos",         label:"Point of Sale",         icon:"🛒", color:"#2ecc71", desc:"Process transactions & sales",     roles:["Admin","Manager","Cashier"] },
  { key:"inventory",   label:"Inventory",             icon:"📦", color:"#4a7cf7", desc:"Stock levels & product catalog",   roles:["Admin","Manager"] },
  { key:"reports",     label:"Sales Reports",         icon:"📊", color:"#e87c2b", desc:"Analytics & performance",          roles:["Admin","Manager"] },
  { key:"pnl",         label:"Profit & Loss",         icon:"💹", color:"#059669", desc:"Revenue, costs & margins",         roles:["Admin","Manager"] },
  { key:"bestsellers", label:"Best Sellers",          icon:"🏆", color:"#f59e0b", desc:"Top items by sales",               roles:["Admin","Manager"] },
  { key:"vendors",     label:"Vendors & Invoices",    icon:"🏭", color:"#10b981", desc:"Suppliers, invoices & prices",     roles:["Admin","Manager"] },
  { key:"purchase",    label:"Purchase Orders",       icon:"📋", color:"#6366f1", desc:"Create & track POs",               roles:["Admin","Manager"] },
  { key:"reorder",     label:"Reorder Alerts",        icon:"🔄", color:"#f97316", desc:"Low stock reorder suggestions",    roles:["Admin","Manager"] },
  { key:"recipes",     label:"Recipes & Costing",     icon:"🧾", color:"#8b5cf6", desc:"Menu items & profit margins",      roles:["Admin","Manager"] },
  { key:"pricing",     label:"Smart Pricing",         icon:"🤖", color:"#06b6d4", desc:"AI price suggestions",             roles:["Admin","Manager"] },
  { key:"customers",   label:"Customers & Loyalty",   icon:"🧑‍🤝‍🧑", color:"#f59e0b",desc:"CRM & loyalty programs",           roles:["Admin","Manager"] },
  { key:"expenses",    label:"Expenses",              icon:"💳", color:"#ec4899", desc:"Track costs & outgoings",          roles:["Admin","Manager"] },
  { key:"receiptscan", label:"Receipt Scanner",       icon:"📷", color:"#14b8a6", desc:"AI scan receipts & bills",         roles:["Admin","Manager"] },
  { key:"cash",        label:"Cash Register",         icon:"🏧", color:"#84cc16", desc:"Daily cash reconciliation",        roles:["Admin","Manager","Cashier"] },
  { key:"waste",       label:"Waste & Spoilage",      icon:"🗑️", color:"#ef4444", desc:"Log waste & track losses",         roles:["Admin","Manager"] },
  { key:"forecast",    label:"AI Forecasting",        icon:"🔮", color:"#a855f7", desc:"Predict stock & sales trends",     roles:["Admin","Manager"] },
  { key:"schedule",    label:"Staff Scheduling",      icon:"📅", color:"#0ea5e9", desc:"Weekly shift planner",             roles:["Admin","Manager"] },
  { key:"payroll",     label:"Payroll",               icon:"💰", color:"#22c55e", desc:"Calculate staff pay",              roles:["Admin","Manager"] },
  { key:"checklist",   label:"Daily Checklist",       icon:"✅", color:"#64748b", desc:"Opening & closing tasks",          roles:["Admin","Manager","Cashier"] },
  { key:"attendance",  label:"Staff Attendance",      icon:"🗓️", color:"#06b6d4", desc:"Shifts & time tracking",           roles:["Admin","Manager"] },
  { key:"users",       label:"User Management",       icon:"👥", color:"#6366f1", desc:"Staff accounts & access",          roles:["Admin"] },
];
const NAV_GROUPS = [
  { label:"MAIN",       items:[{key:"home",label:"Home",icon:"🏠"}] },
  { label:"OPERATIONS", items:[{key:"pos",label:"Point of Sale",icon:"🛒"},{key:"inventory",label:"Inventory",icon:"📦"},{key:"purchase",label:"Purchase Orders",icon:"📋"},{key:"vendors",label:"Vendors & Invoices",icon:"🏭"},{key:"customers",label:"Customers",icon:"🧑‍🤝‍🧑"}] },
  { label:"MENU",       items:[{key:"recipes",label:"Recipes & Costing",icon:"🧾"},{key:"waste",label:"Waste & Spoilage",icon:"🗑️"},{key:"reorder",label:"Reorder Alerts",icon:"🔄"}] },
  { label:"FINANCE",    items:[{key:"reports",label:"Sales Reports",icon:"📊"},{key:"pnl",label:"Profit & Loss",icon:"💹"},{key:"bestsellers",label:"Best Sellers",icon:"🏆"},{key:"cash",label:"Cash Register",icon:"🏧"},{key:"expenses",label:"Expenses",icon:"💳"},{key:"receiptscan",label:"Receipt Scanner",icon:"📷"}] },
  { label:"AI",         items:[{key:"forecast",label:"AI Forecasting",icon:"🔮"},{key:"pricing",label:"Smart Pricing",icon:"🤖"}] },
  { label:"TEAM",       items:[{key:"schedule",label:"Staff Schedule",icon:"📅"},{key:"attendance",label:"Attendance",icon:"🗓️"},{key:"payroll",label:"Payroll",icon:"💰"},{key:"checklist",label:"Daily Checklist",icon:"✅"},{key:"users",label:"User Management",icon:"👥"}] },
  { label:"SYSTEM",     items:[{key:"alerts",label:"Notifications",icon:"🔔"},{key:"activity",label:"Activity Log",icon:"📋"}] },
];

// ── New feature seed data ─────────────────────────────────────────────────────
const SEED_PURCHASE_ORDERS = [];
const SEED_RECIPES = [];
const SEED_CASH_SESSIONS = [];
const SEED_WASTE = [];
const SEED_SCHEDULES = [];
const SEED_PAYROLL = [];
const SEED_CHECKLIST = {
  opening:[
    {id:1,task:"Unlock doors and disable alarm",category:"Security"},
    {id:2,task:"Turn on all equipment (coffee, oven, deli case)",category:"Equipment"},
    {id:3,task:"Check and restock display cases",category:"Stock"},
    {id:4,task:"Count opening cash float",category:"Cash"},
    {id:5,task:"Check fridge/freezer temperatures",category:"Food Safety"},
    {id:6,task:"Prep sandwich fillings and toppings",category:"Prep"},
    {id:7,task:"Bake or receive fresh bagels",category:"Prep"},
    {id:8,task:"Clean and sanitize prep surfaces",category:"Cleaning"},
  ],
  closing:[
    {id:1,task:"Count closing cash and prepare deposit",category:"Cash"},
    {id:2,task:"Clean all equipment and surfaces",category:"Cleaning"},
    {id:3,task:"Store all perishables correctly",category:"Food Safety"},
    {id:4,task:"Check all fridge/freezer temps logged",category:"Food Safety"},
    {id:5,task:"Take out trash and recycling",category:"Cleaning"},
    {id:6,task:"Lock all doors and set alarm",category:"Security"},
    {id:7,task:"Complete daily sales summary",category:"Admin"},
    {id:8,task:"Note any maintenance issues",category:"Maintenance"},
  ],
};
const WASTE_REASONS = ["Expired","Damaged","Over-prep","Dropped","Wrong order","Other"];
const PO_STATUS_COLORS = { pending:{bg:"#fef3c7",text:"#92400e"}, ordered:{bg:"#dbeafe",text:"#1e40af"}, received:{bg:"#d1fae5",text:"#065f46"}, cancelled:{bg:"#fee2e2",text:"#991b1b"} };

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — persistent user management
// ─────────────────────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// Default admin account stored in localStorage
const USERS_KEY = "doab_users";
const SESSION_KEY = "doab_session";

const getStoredUsers = () => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  // Default admin
  const defaults = [
    { id:1, name:"Admin", username:"admin", password:"admin123", role:"Admin", status:"active", avatar:"AD", email:"admin@doab.com", createdAt: new Date().toISOString() }
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
};

const saveStoredUsers = (users) => {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch(e) {}
};

const getSession = () => {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
};

const saveSession = (user) => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch(e) {}
};

const clearSession = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
};

// ─────────────────────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  card:  { background:"#ffffff", border:"1px solid #e5e9f0", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  input: { width:"100%", background:"#f8fafc", border:"1px solid #e5e9f0", borderRadius:9, padding:"9px 12px", color:"#111827", fontSize:13, outline:"none", boxSizing:"border-box" },
  th:    { padding:"11px 14px", textAlign:"left", color:"#6b7280", fontSize:11, fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", background:"#f8fafc" },
  td:    { padding:"13px 14px", fontSize:13 },
};
const Avatar = ({ initials, size=36 }) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.33,fontWeight:700,flexShrink:0}}>{initials}</div>
);
const RoleBadge = ({ role }) => {
  const c=ROLE_COLORS[role]||{bg:"#f0f0f0",text:"#666",dot:"#999"};
  return <span style={{background:c.bg,color:c.text,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:c.dot,display:"inline-block"}}/>{role}</span>;
};
const Pill = ({ active }) => (
  <span style={{background:active?"#dcfce7":"#fef2f2",color:active?"#15803d":"#dc2626",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>{active?"● Active":"○ Inactive"}</span>
);
const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{...S.card,padding:"16px 18px",display:"flex",gap:12,alignItems:"center"}}>
    <div style={{width:42,height:42,borderRadius:10,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div>
    <div><div style={{color:"#111827",fontSize:21,fontWeight:800}}>{value}</div><div style={{color:"#6b7280",fontSize:12}}>{label}</div>{sub&&<div style={{color:"#9ca3af",fontSize:11}}>{sub}</div>}</div>
  </div>
);
const PageHeader = ({ title, subtitle, action }) => (
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
    <div><h1 style={{color:"#111827",fontSize:23,fontWeight:800,margin:0,letterSpacing:"-0.3px"}}>{title}</h1>{subtitle&&<p style={{color:"#6b7280",fontSize:14,marginTop:4,marginBottom:0}}>{subtitle}</p>}</div>
    {action&&<div style={{display:"flex",gap:8}}>{action}</div>}
  </div>
);
const FBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{padding:"8px 14px",borderRadius:9,border:"1px solid",borderColor:active?"#3b82f6":"#e5e9f0",background:active?"#eff6ff":"#ffffff",color:active?"#1d4ed8":"#6b7280",fontSize:13,cursor:"pointer",fontWeight:600}}>{children}</button>
);
const PBtn = ({ onClick, children, color="#3b82f6", disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{padding:"9px 18px",background:disabled?"#e5e9f0":`linear-gradient(135deg,#1e3a8a,${color})`,border:"none",borderRadius:9,color:disabled?"#9ca3af":"#ffffff",fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",boxShadow:disabled?"none":"0 4px 12px rgba(59,130,246,0.25)"}}>{children}</button>
);
const TxtInput = ({ label, value, onChange, placeholder, type="text", style:sx }) => (
  <div style={{marginBottom:13,...sx}}>
    {label&&<div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} style={{...S.input}}/>
  </div>
);
const Sel = ({ label, value, onChange, options, style:sx }) => (
  <div style={{marginBottom:13,...sx}}>
    {label&&<div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{...S.input}}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select>
  </div>
);
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px"}}
    onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div style={{background:"#ffffff",border:"1px solid #e5e9f0",borderRadius:18,boxShadow:"0 20px 60px rgba(15,23,42,0.2)",width:"100%",maxWidth:wide?700:460,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 0"}}>
        <div style={{color:"#111827",fontSize:16,fontWeight:800}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",fontSize:20,cursor:"pointer",lineHeight:1,padding:4}}>✕</button>
      </div>
      <div style={{padding:"14px 22px 28px"}}>{children}</div>
    </div>
  </div>
);
const Spinner = () => (
  <div style={{width:15,height:15,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>
);

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }) {
  const { user, logout } = useAuth();
  return (
    <aside style={{width:228,background:"#1e3a8a",borderRight:"1px solid rgba(255,255,255,0.1)",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"18px 16px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 4px 12px rgba(59,130,246,0.3)"}}>🏪</div>
        <div><div style={{color:"#ffffff",fontWeight:800,fontSize:14}}>Deli On A Bagel Cafe</div><div style={{color:"#374151",fontSize:10,letterSpacing:"0.5px"}}>CAFE & DELI</div></div>
      </div>
      <nav style={{flex:1,padding:"8px 8px"}}>
        {NAV_GROUPS.map(g=>(
          <div key={g.label} style={{marginBottom:4}}>
            <div style={{color:"#374151",fontSize:9,fontWeight:700,letterSpacing:"1px",padding:"7px 8px 3px"}}>{g.label}</div>
            {g.items.map(item=>{
              const on=active===item.key;
              return <button key={item.key} onClick={()=>setActive(item.key)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",marginBottom:1,background:on?"rgba(255,255,255,0.15)":"transparent",color:on?"#ffffff":"rgba(255,255,255,0.6)",fontWeight:on?600:400,fontSize:13,textAlign:"left",borderLeft:on?"2px solid #3b82f6":"2px solid transparent"}}><span style={{fontSize:14}}>{item.icon}</span>{item.label}</button>;
            })}
          </div>
        ))}
      </nav>
      <div style={{padding:"10px 8px",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
        {user&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"7px 8px",background:"rgba(255,255,255,0.1)",borderRadius:9}}><Avatar initials={user.avatar} size={28}/><div><div style={{color:"#374151",fontSize:12,fontWeight:600}}>{user.name}</div><div style={{color:"#3b82f6",fontSize:10,fontWeight:600}}>{user.role}</div></div></div>}
        <button onClick={logout} style={{width:"100%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,padding:"7px",color:"#f87171",fontSize:12,cursor:"pointer",fontWeight:600}}>Sign Out</button>
        <div style={{marginTop:8,padding:"5px 8px",borderRadius:6,background:HAS_SUPABASE?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.15)",border:`1px solid ${HAS_SUPABASE?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.3)"}`,textAlign:"center",fontSize:10,fontWeight:700,color:HAS_SUPABASE?"#10b981":"#f59e0b"}}>
          {HAS_SUPABASE?"🟢 Supabase Connected":"🟡 Local Only (no DB)"}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────────────────────────
function HomePage({ setActive, user }) {
  const h=new Date().getHours();
  const gr=h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  return (
    <div style={{maxWidth:1080}}>
      <div style={{background:"linear-gradient(120deg,#1e3a8a 0%,#1d4ed8 50%,#1e40af 100%)",border:"1px solid #bfdbfe",borderRadius:18,padding:"26px 30px",marginBottom:22,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative"}}>
          <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginBottom:3}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div><div style={{color:"#ffffff",fontSize:24,fontWeight:800,marginBottom:4}}>{gr}, {user?.name?.split(" ")[0]} 👋</div><div style={{color:"rgba(255,255,255,0.7)",fontSize:13}}>Here's what's happening at your store today.</div></div>
          <div style={{display:"flex",gap:8}}>
            <PBtn onClick={()=>setActive("pos")}>🛒 New Sale</PBtn>
            <button onClick={()=>setActive("vendors")} style={{padding:"9px 16px",borderRadius:9,border:"1px solid #bfdbfe",background:"rgba(255,255,255,0.04)",color:"#374151",fontSize:13,fontWeight:600,cursor:"pointer"}}>🏭 Add Invoice</button>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:26}}>
        <StatCard icon="💰" label="Today's Sales"   value="$4,280" color="#2ecc71" sub="+12% vs yesterday"/>
        <StatCard icon="📦" label="Low Stock Items" value="3"      color="#f59e0b" sub="Need reorder"/>
        <StatCard icon="🧑‍🤝‍🧑" label="Total Customers" value="1,240" color="#e87c2b" sub="+18 this week"/>
        <StatCard icon="💳" label="Monthly Expenses" value="$2,893" color="#ec4899" sub="Within budget"/>
        <StatCard icon="🗓️" label="Staff On Shift"  value="4 / 4"  color="#06b6d4" sub="All present"/>
        <StatCard icon="🧾" label="Pending Invoices" value="2"     color="#6366f1" sub="Awaiting approval"/>
      </div>
      <div style={{marginBottom:10}}><div style={{color:"#0f172a",fontSize:15,fontWeight:700,marginBottom:3}}>All Modules</div><div style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Quick access to every part of your store</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:11}}>
        {FEATURES.filter(f=>f.roles.includes(user?.role)).map(f=>(
          <HomeFeatureCard key={f.key} feature={f} onClick={()=>setActive(f.key)}/>
        ))}
      </div>
    </div>
  );
}

function HomeFeatureCard({ feature:f, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?"#0f172a":"#ffffff",border:`1px solid ${hov?f.color+"44":"#374151"}`,borderRadius:13,padding:"16px",cursor:"pointer",textAlign:"left",transition:"all 0.15s",transform:hov?"translateY(-2px)":"none",boxShadow:hov?`0 8px 20px ${f.color}14`:"none"}}>
      <div style={{width:38,height:38,borderRadius:10,background:`${f.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:10}}>{f.icon}</div>
      <div style={{color:"#374151",fontSize:13,fontWeight:700,marginBottom:3}}>{f.label}</div>
      <div style={{color:"#374151",fontSize:11}}>{f.desc}</div>
      <div style={{marginTop:10,color:f.color,fontSize:11,fontWeight:600}}>Open →</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POS
// ─────────────────────────────────────────────────────────────────────────────
function POSPage() {
  const [products]  = useState(SEED_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [paid, setPaid] = useState(false);
  const [catFilter, setCatFilter] = useState("All");
  const cats = ["All",...new Set(products.map(p=>p.category))];
  const filtered = products.filter(p=>(catFilter==="All"||p.category===catFilter)&&(p.name.toLowerCase().includes(search.toLowerCase())));
  const addToCart = p => { setCart(c=>{ const ex=c.find(x=>x.id===p.id); return ex?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}]; }); };
  const setQty = (id,qty) => { if(qty<=0){setCart(c=>c.filter(x=>x.id!==id));}else{setCart(c=>c.map(x=>x.id===id?{...x,qty}:x));} };
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const tax = subtotal*0.07;
  const total = subtotal+tax;
  if(paid) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
      <div style={{fontSize:56,marginBottom:16}}>✅</div>
      <div style={{color:"#10b981",fontSize:22,fontWeight:800,marginBottom:6}}>Payment Successful!</div>
      <div style={{color:"#6b7280",fontSize:14,marginBottom:24}}>Total charged: <strong style={{color:"#0f172a"}}>${total.toFixed(2)}</strong></div>
      <PBtn onClick={()=>{setCart([]);setPaid(false);}}>Start New Sale</PBtn>
    </div>
  );
  return (
    <div style={{display:"grid",gridTemplateColumns:"min(100%,1fr) min(100%,360px)",gap:20,flexWrap:"wrap"}}>
      <div style={{display:"flex",flexDirection:"column",gap:14,overflow:"hidden"}}>
        <PageHeader title="Point of Sale" subtitle="Select products to add to cart."/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…" style={{...S.input,flex:1,minWidth:160}}/>
          {cats.map(c=><FBtn key={c} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</FBtn>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,overflowY:"auto"}}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#93c5fd"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e9f0"}>
              <div style={{color:"#374151",fontSize:11,marginBottom:4}}>{p.category}</div>
              <div style={{color:"#374151",fontSize:14,fontWeight:700,marginBottom:4}}>{p.name}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{color:"#10b981",fontSize:16,fontWeight:800}}>${p.price.toFixed(2)}</div>
                <div style={{color:p.stock<10?"#f59e0b":"#cbd5e1",fontSize:11}}>Stock: {p.stock}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div style={{...S.card,padding:"18px",display:"flex",flexDirection:"column",height:"fit-content",maxHeight:"calc(100vh - 80px)",overflowY:"auto",position:"sticky",top:0}}>
        <div style={{color:"#0f172a",fontSize:15,fontWeight:800,marginBottom:14}}>🛒 Cart <span style={{color:"#6b7280",fontWeight:400,fontSize:12}}>({cart.length} items)</span></div>
        {cart.length===0&&<div style={{color:"#374151",fontSize:13,textAlign:"center",padding:"30px 0"}}>Cart is empty.<br/>Click products to add.</div>}
        {cart.map(item=>(
          <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 0",borderBottom:"1px solid #e2e8f0"}}>
            <div style={{flex:1}}><div style={{color:"#374151",fontSize:13,fontWeight:600}}>{item.name}</div><div style={{color:"#6b7280",fontSize:12}}>${item.price.toFixed(2)} ea.</div></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setQty(item.id,item.qty-1)} style={{width:24,height:24,borderRadius:6,background:"#374151",border:"none",color:"#374151",cursor:"pointer",fontSize:14}}>−</button>
              <span style={{color:"#374151",fontSize:13,fontWeight:700,minWidth:20,textAlign:"center"}}>{item.qty}</span>
              <button onClick={()=>setQty(item.id,item.qty+1)} style={{width:24,height:24,borderRadius:6,background:"#374151",border:"none",color:"#374151",cursor:"pointer",fontSize:14}}>+</button>
            </div>
            <div style={{color:"#10b981",fontSize:13,fontWeight:700,minWidth:52,textAlign:"right"}}>${(item.price*item.qty).toFixed(2)}</div>
          </div>
        ))}
        {cart.length>0&&(<>
          <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:12,marginTop:4}}>
            {[["Subtotal",`$${subtotal.toFixed(2)}`],["Tax (7%)",`$${tax.toFixed(2)}`],["Total",`$${total.toFixed(2)}`]].map(([l,v],i)=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:i===2?"#0f172a":"#9ca3af",fontSize:i===2?15:13,fontWeight:i===2?800:400}}>{l}</span><span style={{color:i===2?"#10b981":"#9ca3af",fontSize:i===2?17:13,fontWeight:700}}>{v}</span></div>
            ))}
          </div>
          <button onClick={()=>setPaid(true)} style={{marginTop:12,width:"100%",padding:"13px",background:"linear-gradient(135deg,#064e3b,#10b981)",border:"none",borderRadius:10,color:"#d1fae5",fontSize:14,fontWeight:700,cursor:"pointer"}}>💳 Charge ${total.toFixed(2)}</button>
          <button onClick={()=>setCart([])} style={{marginTop:8,width:"100%",padding:"8px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:9,color:"#6b7280",fontSize:12,cursor:"pointer"}}>Clear Cart</button>
        </>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
function InventoryPage() {
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [modal, setModal] = useState(null); // null | {mode:"add"|"edit", data?}
  const cats = ["All",...new Set(products.map(p=>p.category))];
  const filtered = products.filter(p=>(catFilter==="All"||p.category===catFilter)&&p.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter(p=>p.stock<=p.minStock);
  const saveProduct = p => {
    if(p.id) setProducts(ps=>ps.map(x=>x.id===p.id?p:x));
    else setProducts(ps=>[...ps,{...p,id:Date.now()}]);
    setModal(null);
  };
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Manage products, stock levels and pricing." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadCSV(`inventory_${new Date().toISOString().split('T')[0]}.csv`,
            ["Name","Category","Sell Price","Cost","Stock","Min Stock","Unit","Barcode"],
            products.map(p=>[p.name,p.category,p.price,p.cost,p.stock,p.minStock,p.unit,p.barcode])
          )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Add Product</PBtn>
        </div>}/>
      {lowStock.length>0&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:11,padding:"11px 16px",marginBottom:18,display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>⚠️</span><span style={{color:"#f59e0b",fontSize:13,fontWeight:600}}>{lowStock.length} items below minimum stock level: </span><span style={{color:"#9ca3af",fontSize:13}}>{lowStock.map(p=>p.name).join(", ")}</span></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="📦" label="Total Products" value={products.length} color="#4a7cf7"/>
        <StatCard icon="⚠️" label="Low Stock"      value={lowStock.length} color="#f59e0b"/>
        <StatCard icon="💰" label="Inventory Value" value={`$${products.reduce((s,p)=>s+p.cost*p.stock,0).toLocaleString()}`} color="#10b981"/>
        <StatCard icon="🏷" label="Categories"     value={new Set(products.map(p=>p.category)).size} color="#6366f1"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…" style={{...S.input,flex:1,minWidth:180}}/>
        {cats.map(c=><FBtn key={c} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</FBtn>)}
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Product","Category","Price","Cost","Stock","Min","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((p,i)=>(
              <tr key={p.id} style={{borderBottom:i<filtered.length-1?"1px solid #e2e8f0":"none"}}>
                <td style={{...S.td,color:"#374151",fontWeight:600}}>{p.name}</td>
                <td style={S.td}><span style={{background:"rgba(99,102,241,0.12)",color:"#818cf8",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{p.category}</span></td>
                <td style={{...S.td,color:"#10b981",fontWeight:700}}>${p.price.toFixed(2)}</td>
                <td style={{...S.td,color:"#9ca3af"}}>${p.cost.toFixed(2)}</td>
                <td style={S.td}><span style={{color:p.stock<=p.minStock?"#f59e0b":"#9ca3af",fontWeight:700}}>{p.stock}</span></td>
                <td style={{...S.td,color:"#374151"}}>{p.minStock}</td>
                <td style={S.td}><span style={{background:p.stock<=p.minStock?"rgba(245,158,11,0.12)":"rgba(16,185,129,0.1)",color:p.stock<=p.minStock?"#f59e0b":"#10b981",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{p.stock<=p.minStock?"Low Stock":"In Stock"}</span></td>
                <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:p})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<ProductModal initial={modal.data} onSave={saveProduct} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function ProductModal({ initial, onSave, onClose }) {
  const cats = ["Dairy","Bakery","Beverages","Snacks","Produce","Household","Other"];
  const [f,setF]=useState(initial||{name:"",category:"Dairy",price:0,cost:0,stock:0,minStock:5,unit:"unit",barcode:""});
  const set=k=>v=>setF(x=>({...x,[k]:k==="price"||k==="cost"||k==="stock"||k==="minStock"?Number(v):v}));
  const valid=f.name.trim()&&f.price>=0&&f.stock>=0;
  return (
    <Modal title={initial?"Edit Product":"Add Product"} onClose={onClose}>
      <TxtInput label="Product Name *" value={f.name} onChange={set("name")} placeholder="e.g. Whole Milk 1L"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Sel label="Category" value={f.category} onChange={set("category")} options={cats}/>
        <TxtInput label="Unit" value={f.unit} onChange={set("unit")} placeholder="bottle, kg…"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Sell Price *" value={f.price} onChange={set("price")} type="number" placeholder="0.00"/>
        <TxtInput label="Cost Price"   value={f.cost}  onChange={set("cost")}  type="number" placeholder="0.00"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Current Stock *" value={f.stock}    onChange={set("stock")}    type="number" placeholder="0"/>
        <TxtInput label="Min Stock Alert" value={f.minStock} onChange={set("minStock")} type="number" placeholder="5"/>
      </div>
      <TxtInput label="Barcode" value={f.barcode} onChange={set("barcode")} placeholder="001"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Add Product"}</PBtn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────
function ReportsPage() {
  const [period,setPeriod]=useState("weekly");
  const totalWeek = SALES_DATA.reduce((s,d)=>s+d.sales,0);
  const totalOrders = SALES_DATA.reduce((s,d)=>s+d.orders,0);
  return (
    <div>
      <PageHeader title="Sales Reports" subtitle="Analyze your store's performance and trends." action={
        <button onClick={()=>downloadCSV(`sales_report_${new Date().toISOString().split('T')[0]}.csv`,
          ["Day","Sales ($)","Orders"],
          SALES_DATA.map(d=>[d.day,d.sales,d.orders])
        )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        <StatCard icon="💰" label="This Week"     value={`$${(totalWeek/1000).toFixed(1)}k`} color="#2ecc71" sub="vs $24.1k last week"/>
        <StatCard icon="📋" label="Total Orders"  value={totalOrders} color="#4a7cf7" sub="+8% vs last week"/>
        <StatCard icon="🧾" label="Avg Order Val" value={`$${(totalWeek/totalOrders).toFixed(2)}`} color="#e87c2b" sub="Per transaction"/>
        <StatCard icon="📈" label="Best Day"      value="Sat"  color="#9b59b6" sub="$5,200 in sales"/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {["weekly","monthly","category"].map(p=><FBtn key={p} active={period===p} onClick={()=>setPeriod(p)}>{p.charAt(0).toUpperCase()+p.slice(1)}</FBtn>)}
      </div>
      {period==="weekly"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
          <div style={{...S.card,padding:"20px"}}>
            <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Daily Sales — This Week</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={SALES_DATA} margin={{top:0,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                <XAxis dataKey="day" tick={{fill:"#94a3b8",fontSize:12}}/>
                <YAxis tick={{fill:"#94a3b8",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
                <Bar dataKey="sales" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{...S.card,padding:"20px"}}>
            <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Daily Orders</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={SALES_DATA} margin={{top:0,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                <XAxis dataKey="day" tick={{fill:"#94a3b8",fontSize:12}}/>
                <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}}/>
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{fill:"#10b981",r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {period==="monthly"&&(
        <div style={{...S.card,padding:"20px"}}>
          <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Monthly Revenue — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MONTHLY_DATA} margin={{top:0,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
              <XAxis dataKey="month" tick={{fill:"#94a3b8",fontSize:12}}/>
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
              <Bar dataKey="sales" fill="#e87c2b" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {period==="category"&&(
        <div style={{...S.card,padding:"20px"}}>
          <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Sales by Category (This Month)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={CATEGORY_SALES} layout="vertical" margin={{top:0,right:20,left:20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
              <XAxis type="number" tick={{fill:"#94a3b8",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
              <YAxis type="category" dataKey="category" tick={{fill:"#9ca3af",fontSize:12}} width={80}/>
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
              <Bar dataKey="sales" fill="#9b59b6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
function CustomersPage() {
  const { data:customers, loading, error, save:saveDb } = useCustomers();
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const filtered=customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)||c.email.toLowerCase().includes(search.toLowerCase()));
  const save=async c=>{ await saveDb(c); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Customers & Loyalty" subtitle="Manage customer profiles and loyalty points." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadCSV(`customers_${new Date().toISOString().split('T')[0]}.csv`,
            ["Name","Phone","Email","Loyalty Points","Total Spent","Visits","Joined"],
            customers.map(c=>[c.name,c.phone,c.email,c.loyaltyPts,c.totalSpent,c.visits,c.joined])
          )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Add Customer</PBtn>
        </div>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="🧑‍🤝‍🧑" label="Total Customers" value={customers.length} color="#f59e0b"/>
        <StatCard icon="⭐" label="Total Loyalty Pts" value={customers.reduce((s,c)=>s+c.loyaltyPts,0).toLocaleString()} color="#e87c2b"/>
        <StatCard icon="💰" label="Total Customer Revenue" value={`$${customers.reduce((s,c)=>s+c.totalSpent,0).toLocaleString()}`} color="#10b981"/>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search customers…" style={{...S.input,maxWidth:340,marginBottom:14}}/>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Customer","Phone","Loyalty Pts","Total Spent","Visits","Joined",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id} style={{borderBottom:i<filtered.length-1?"1px solid #e2e8f0":"none"}}>
                <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:9}}><Avatar initials={c.name.split(" ").map(w=>w[0]).join("")} size={30}/><div><div style={{color:"#374151",fontWeight:600,fontSize:13}}>{c.name}</div><div style={{color:"#6b7280",fontSize:11}}>{c.email}</div></div></div></td>
                <td style={{...S.td,color:"#9ca3af"}}>{c.phone}</td>
                <td style={S.td}><span style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",borderRadius:20,padding:"2px 9px",fontSize:12,fontWeight:700}}>⭐ {c.loyaltyPts}</span></td>
                <td style={{...S.td,color:"#10b981",fontWeight:700}}>${c.totalSpent.toFixed(2)}</td>
                <td style={{...S.td,color:"#9ca3af"}}>{c.visits}</td>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{c.joined}</td>
                <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:c})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<CustomerModal initial={modal.data} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function CustomerModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial||{name:"",phone:"",email:""});
  const set=k=>v=>setF(x=>({...x,[k]:v}));
  return (
    <Modal title={initial?"Edit Customer":"Add Customer"} onClose={onClose}>
      <TxtInput label="Full Name *" value={f.name} onChange={set("name")} placeholder="e.g. Maria Santos"/>
      <TxtInput label="Phone"  value={f.phone} onChange={set("phone")} placeholder="+1 555-0000"/>
      <TxtInput label="Email"  value={f.email} onChange={set("email")} placeholder="customer@email.com" type="email"/>
      {initial&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><TxtInput label="Loyalty Points" value={f.loyaltyPts} onChange={v=>setF(x=>({...x,loyaltyPts:Number(v)}))} type="number"/><TxtInput label="Total Spent ($)" value={f.totalSpent} onChange={v=>setF(x=>({...x,totalSpent:Number(v)}))} type="number"/></div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>f.name.trim()&&onSave(f)} disabled={!f.name.trim()}>{initial?"Save Changes":"Add Customer"}</PBtn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────
function ExpensesPage() {
  const { data:expenses, loading, error, save:saveDb } = useExpenses();
  const [modal,setModal]=useState(null);
  const [catFilter,setCatFilter]=useState("All");
  const cats=["All",...new Set(expenses.map(e=>e.category))];
  const filtered=catFilter==="All"?expenses:expenses.filter(e=>e.category===catFilter);
  const total=expenses.reduce((s,e)=>s+e.amount,0);
  const save=async e=>{ await saveDb(e); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track all store costs and outgoings." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadCSV(`expenses_${new Date().toISOString().split('T')[0]}.csv`,
            ["Description","Category","Vendor","Amount","Date","Receipt"],
            expenses.map(e=>[e.description,e.category,e.vendor,e.amount,e.date,e.receipt])
          )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Add Expense</PBtn>
        </div>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="💳" label="Total This Month" value={`$${total.toLocaleString("en",{minimumFractionDigits:2})}`} color="#ec4899"/>
        <StatCard icon="📋" label="Total Entries"    value={expenses.length} color="#6366f1"/>
        <StatCard icon="🏷" label="Biggest Category" value={EXPENSE_CATS.reduce((m,c)=>{const s=expenses.filter(e=>e.category===c).reduce((x,e)=>x+e.amount,0);return s>m.val?{cat:c,val:s}:m},{cat:"",val:0}).cat||"—"} color="#f59e0b"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {cats.map(c=><FBtn key={c} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</FBtn>)}
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Description","Category","Vendor","Date","Amount","Receipt",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((e,i,arr)=>(
              <tr key={e.id} style={{borderBottom:i<arr.length-1?"1px solid #e2e8f0":"none"}}>
                <td style={{...S.td,color:"#374151",fontWeight:600}}>{e.description}</td>
                <td style={S.td}><span style={{background:"rgba(236,72,153,0.1)",color:"#ec4899",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{e.category}</span></td>
                <td style={{...S.td,color:"#9ca3af"}}>{e.vendor}</td>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{e.date}</td>
                <td style={{...S.td,color:"#f87171",fontWeight:700}}>${e.amount.toFixed(2)}</td>
                <td style={{...S.td,color:"#374151",fontSize:12}}>{e.receipt}</td>
                <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:e})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<ExpenseModal initial={modal.data} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function ExpenseModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial||{description:"",category:"Utilities",vendor:"",date:new Date().toISOString().split("T")[0],amount:0,receipt:""});
  const set=k=>v=>setF(x=>({...x,[k]:k==="amount"?Number(v):v}));
  const valid=f.description.trim()&&f.amount>0;
  return (
    <Modal title={initial?"Edit Expense":"Add Expense"} onClose={onClose}>
      <TxtInput label="Description *" value={f.description} onChange={set("description")} placeholder="e.g. Electricity Bill"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Sel label="Category" value={f.category} onChange={set("category")} options={EXPENSE_CATS}/>
        <TxtInput label="Amount ($) *" value={f.amount} onChange={set("amount")} type="number" placeholder="0.00"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Vendor / Supplier" value={f.vendor} onChange={set("vendor")} placeholder="Vendor name"/>
        <TxtInput label="Date" value={f.date} onChange={set("date")} type="date"/>
      </div>
      <TxtInput label="Receipt #" value={f.receipt} onChange={set("receipt")} placeholder="#REC-000"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Add Expense"}</PBtn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
function AttendancePage() {
  const { data:shifts, loading, error, save:saveDb } = useShifts();
  const [modal,setModal]=useState(null);
  const [view,setView]=useState("daily"); // daily | weekly
  const [dateFilter,setDateFilter]=useState("");
  const [weekFilter,setWeekFilter]=useState(() => {
    const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().split("T")[0];
  });
  const today=new Date().toISOString().split("T")[0];
  const todayShifts=shifts.filter(s=>s.date===today);
  const filtered=dateFilter?shifts.filter(s=>s.date===dateFilter):[...shifts].sort((a,b)=>b.date.localeCompare(a.date)||a.staffName.localeCompare(b.staffName));
  const save=async s=>{ await saveDb(s); setModal(null); };

  // Weekly timesheet helpers
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const weekDates=DAYS.map((_,i)=>{ const d=new Date(weekFilter); d.setDate(d.getDate()+i); return d.toISOString().split("T")[0]; });
  const employees=[...new Set(shifts.map(s=>s.staffName))].sort();
  const getShift=(emp,date)=>shifts.find(s=>s.staffName===emp&&s.date===date);
  const weekTotal=(emp)=>weekDates.reduce((t,d)=>t+Number(getShift(emp,d)?.hours||0),0);
  const prevWeek=()=>{ const d=new Date(weekFilter); d.setDate(d.getDate()-7); setWeekFilter(d.toISOString().split("T")[0]); };
  const nextWeek=()=>{ const d=new Date(weekFilter); d.setDate(d.getDate()+7); setWeekFilter(d.toISOString().split("T")[0]); };

  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Staff Attendance" subtitle="Track shifts, clock-in/out and generate timesheets." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadTimesheetCSV(shifts)}
            style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            ⬇ Export Timesheet
          </button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Log Shift</PBtn>
        </div>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="👷" label="On Shift Today" value={todayShifts.length} color="#06b6d4"/>
        <StatCard icon="⏱️" label="Hours Today" value={todayShifts.reduce((s,x)=>s+Number(x.hours||0),0).toFixed(1)+"h"} color="#3b82f6"/>
        <StatCard icon="📋" label="Total Shifts" value={shifts.length} color="#6366f1"/>
        <StatCard icon="⌚" label="Total Hours" value={shifts.reduce((s,x)=>s+Number(x.hours||0),0).toFixed(1)+"h"} color="#9b59b6"/>
      </div>

      {/* View toggle */}
      <div style={{display:"flex",gap:5,marginBottom:16,background:"#f8fafc",borderRadius:10,padding:4,width:"fit-content"}}>
        {["daily","weekly"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"7px 18px",borderRadius:8,border:"none",cursor:"pointer",
            background:view===v?"#1e3a8a":"transparent",color:view===v?"#fff":"#6b7280",fontWeight:700,fontSize:13}}>
            {v==="daily"?"📋 Daily Log":"📅 Weekly Timesheet"}
          </button>
        ))}
      </div>

      {view==="daily" && (<>
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
          <input value={dateFilter} onChange={e=>setDateFilter(e.target.value)} type="date" style={{...S.input,width:"auto"}}/>
          {dateFilter&&<button onClick={()=>setDateFilter("")} style={{background:"none",border:"none",color:"#3b82f6",cursor:"pointer",fontSize:12}}>Clear ×</button>}
          {dateFilter&&<button onClick={()=>downloadCSV(`shifts_${dateFilter}.csv`,
            ["Staff","Date","Clock In","Clock Out","Hours"],
            filtered.map(s=>[s.staffName,s.date,s.clockIn,s.clockOut,s.hours])
          )} style={{padding:"6px 12px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:12,cursor:"pointer",fontWeight:600}}>⬇ Export</button>}
        </div>
        <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Staff","Date","Clock In","Clock Out","Hours",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((s,i,arr)=>(
                <tr key={s.id||i} style={{borderBottom:i<arr.length-1?"1px solid #e2e8f0":"none"}}>
                  <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:8}}><Avatar initials={(s.staffName||"?").split(" ").map(w=>w[0]).join("")} size={28}/><span style={{color:"#374151",fontSize:13,fontWeight:600}}>{s.staffName}</span></div></td>
                  <td style={{...S.td,color:"#6b7280"}}>{s.date}</td>
                  <td style={{...S.td,color:"#10b981",fontWeight:600}}>{s.clockIn}</td>
                  <td style={{...S.td,color:"#ef4444",fontWeight:600}}>{s.clockOut}</td>
                  <td style={S.td}><span style={{background:"rgba(6,182,212,0.1)",color:"#06b6d4",borderRadius:20,padding:"2px 9px",fontSize:12,fontWeight:700}}>{s.hours}h</span></td>
                  <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:s})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {view==="weekly" && (<>
        {/* Week navigator */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={prevWeek} style={{padding:"7px 14px",background:"#f8fafc",border:"1px solid #e5e9f0",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>← Prev</button>
          <div style={{color:"#111827",fontWeight:700,fontSize:14}}>Week: {weekFilter} → {weekDates[6]}</div>
          <button onClick={nextWeek} style={{padding:"7px 14px",background:"#f8fafc",border:"1px solid #e5e9f0",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>Next →</button>
          <button onClick={()=>downloadTimesheetCSV(shifts.filter(s=>weekDates.includes(s.date)))}
            style={{padding:"7px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,color:"#059669",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            ⬇ Export This Week
          </button>
        </div>
        {/* Timesheet table */}
        <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead>
              <tr style={{background:"#f8fafc",borderBottom:"2px solid #e5e9f0"}}>
                <th style={{...S.th,minWidth:130}}>Employee</th>
                {DAYS.map((d,i)=>(
                  <th key={d} style={{...S.th,textAlign:"center",minWidth:100,
                    background:weekDates[i]===today?"#eff6ff":"#f8fafc",
                    color:weekDates[i]===today?"#1d4ed8":"#6b7280"}}>
                    <div>{d}</div>
                    <div style={{fontSize:10,fontWeight:400}}>{weekDates[i].slice(5)}</div>
                  </th>
                ))}
                <th style={{...S.th,textAlign:"center",background:"#f0fdf4",color:"#059669",minWidth:80}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.length===0 && (
                <tr><td colSpan={9} style={{...S.td,textAlign:"center",color:"#9ca3af"}}>No shifts recorded yet.</td></tr>
              )}
              {employees.map((emp,ei)=>(
                <tr key={emp} style={{borderBottom:"1px solid #e5e9f0",background:ei%2===0?"#fff":"#fafbfc"}}>
                  <td style={S.td}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Avatar initials={emp.split(" ").map(w=>w[0]).join("")} size={28}/>
                      <span style={{color:"#111827",fontWeight:600,fontSize:13}}>{emp}</span>
                    </div>
                  </td>
                  {weekDates.map(date=>{
                    const shift=getShift(emp,date);
                    return (
                      <td key={date} style={{...S.td,textAlign:"center",padding:"8px 6px",
                        background:date===today?"rgba(59,130,246,0.04)":"transparent"}}>
                        {shift ? (
                          <div>
                            <div style={{color:"#059669",fontSize:12,fontWeight:700}}>{Number(shift.hours||0).toFixed(1)}h</div>
                            <div style={{color:"#9ca3af",fontSize:10}}>{shift.clockIn}–{shift.clockOut}</div>
                          </div>
                        ) : (
                          <span style={{color:"#d1d5db",fontSize:12}}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{...S.td,textAlign:"center",background:"#f0fdf4"}}>
                    <span style={{color:"#059669",fontWeight:800,fontSize:14}}>{weekTotal(emp).toFixed(1)}h</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {employees.length>0&&(
              <tfoot>
                <tr style={{borderTop:"2px solid #e5e9f0",background:"#f8fafc"}}>
                  <td style={{...S.td,fontWeight:700,color:"#374151"}}>Daily Total</td>
                  {weekDates.map(date=>{
                    const total=shifts.filter(s=>s.date===date).reduce((t,s)=>t+Number(s.hours||0),0);
                    return <td key={date} style={{...S.td,textAlign:"center",fontWeight:700,color:total>0?"#3b82f6":"#d1d5db"}}>{total>0?total.toFixed(1)+"h":"—"}</td>;
                  })}
                  <td style={{...S.td,textAlign:"center",fontWeight:800,color:"#059669",fontSize:15}}>
                    {shifts.filter(s=>weekDates.includes(s.date)).reduce((t,s)=>t+Number(s.hours||0),0).toFixed(1)}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </>)}

      {modal&&<ShiftModal initial={modal.data} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function ShiftModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial||{staffName:"",date:new Date().toISOString().split("T")[0],clockIn:"09:00",clockOut:"17:00",hours:8,staffId:0});
  const set=k=>v=>{ const upd={...f,[k]:k==="hours"?Number(v):v}; if(k==="clockIn"||k==="clockOut"){ const ci=upd.clockIn||""; const co=upd.clockOut||""; if(ci.includes(":")&&co.includes(":")){ const [ih,im]=ci.split(":").map(Number); const [oh,om]=co.split(":").map(Number); const hrs=((oh*60+om)-(ih*60+im))/60; upd.hours=Math.max(hrs,0).toFixed(1); } } setF(upd); };
  const staffOpts=SEED_STAFF.map(s=>({v:String(s.id),l:s.name}));
  const valid=f.staffName&&f.date&&f.clockIn&&f.clockOut;
  return (
    <Modal title={initial?"Edit Shift":"Log Shift"} onClose={onClose}>
      {!initial&&<Sel label="Staff Member *" value={String(f.staffId)} onChange={v=>{const st=SEED_STAFF.find(s=>String(s.id)===v);setF(x=>({...x,staffId:Number(v),staffName:st?.name||""}));}} options={[{v:"0",l:"-- Select staff --"},...staffOpts]}/>}
      {initial&&<TxtInput label="Staff" value={f.staffName} onChange={()=>{}} placeholder=""/>}
      <TxtInput label="Date *" value={f.date} onChange={set("date")} type="date"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <TxtInput label="Clock In"  value={f.clockIn}  onChange={set("clockIn")}  type="time"/>
        <TxtInput label="Clock Out" value={f.clockOut} onChange={set("clockOut")} type="time"/>
        <TxtInput label="Hours"     value={f.hours}    onChange={set("hours")}    type="number"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Log Shift"}</PBtn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS — Full user management with credentials
// ─────────────────────────────────────────────────────────────────────────────
function UsersPage() {
  const { user:currentUser } = useAuth();
  const [users, setUsers] = useState(getStoredUsers());
  const [modal, setModal] = useState(null); // {mode:"add"|"edit"|"password", data?}
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  const saveUsers = (updated) => { setUsers(updated); saveStoredUsers(updated); };

  const addUser = (u) => {
    const exists = users.some(x => x.username.toLowerCase() === u.username.toLowerCase());
    if (exists) { alert("Username already exists."); return; }
    const newUser = { ...u, id: Date.now(), avatar: u.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(), createdAt: new Date().toISOString(), lastLogin: "Never" };
    saveUsers([...users, newUser]);
    setModal(null);
  };

  const editUser = (u) => {
    saveUsers(users.map(x => x.id === u.id ? { ...x, ...u } : x));
    setModal(null);
  };

  const changePassword = (id, newPass) => {
    saveUsers(users.map(x => x.id === id ? { ...x, password: newPass } : x));
    setModal(null);
  };

  const toggle = (id) => {
    if (id === currentUser?.id) { alert("You cannot deactivate your own account."); return; }
    saveUsers(users.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u));
  };

  const deleteUser = (id) => {
    if (id === currentUser?.id) { alert("You cannot delete your own account."); return; }
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    saveUsers(users.filter(u => u.id !== id));
  };

  const filtered = users.filter(u =>
    (filterRole === "All" || u.role === filterRole) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = { total:users.length, active:users.filter(u=>u.status==="active").length, admins:users.filter(u=>u.role==="Admin").length };

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage staff accounts, roles, usernames and passwords."
        action={currentUser?.role==="Admin" ? <PBtn onClick={()=>setModal({mode:"add"})}>+ Add User</PBtn> : null}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="👥" label="Total Users" value={stats.total} color="#4a7cf7"/>
        <StatCard icon="✅" label="Active" value={stats.active} color="#2ecc71"/>
        <StatCard icon="🔑" label="Admins" value={stats.admins} color="#e87c2b"/>
      </div>

      {currentUser?.role !== "Admin" && (
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px",marginBottom:16,color:"#92400e",fontSize:13}}>
          🔒 Only Admin users can create, edit or delete accounts.
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search users…" style={{...S.input,flex:1,minWidth:180}}/>
        {["All","Admin","Manager","Cashier"].map(r=><FBtn key={r} active={filterRole===r} onClick={()=>setFilterRole(r)}>{r}</FBtn>)}
      </div>

      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
            {["User","Username","Role","Status","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:i<filtered.length-1?"1px solid #e2e8f0":"none",background:u.id===currentUser?.id?"#eff6ff":"transparent"}}>
                <td style={S.td}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <Avatar initials={u.avatar||u.name?.slice(0,2)||"??"} size={32}/>
                    <div>
                      <div style={{color:"#111827",fontSize:13,fontWeight:600}}>{u.name} {u.id===currentUser?.id&&<span style={{color:"#3b82f6",fontSize:10,fontWeight:700}}>(You)</span>}</div>
                      <div style={{color:"#9ca3af",fontSize:11}}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{...S.td,fontFamily:"monospace",color:"#374151",fontSize:12}}>{u.username}</td>
                <td style={S.td}><RoleBadge role={u.role}/></td>
                <td style={S.td}><Pill active={u.status==="active"}/></td>
                <td style={S.td}>
                  {currentUser?.role==="Admin" && (
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <button onClick={()=>setModal({mode:"edit",data:u})}
                        style={{padding:"4px 9px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,color:"#2563eb",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
                      <button onClick={()=>setModal({mode:"password",data:u})}
                        style={{padding:"4px 9px",background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:6,color:"#7c3aed",fontSize:11,cursor:"pointer",fontWeight:600}}>🔑 Password</button>
                      <button onClick={()=>toggle(u.id)}
                        style={{padding:"4px 9px",background:u.status==="active"?"#fef2f2":"#f0fdf4",border:`1px solid ${u.status==="active"?"#fecaca":"#bbf7d0"}`,borderRadius:6,color:u.status==="active"?"#dc2626":"#059669",fontSize:11,cursor:"pointer",fontWeight:600}}>
                        {u.status==="active"?"Disable":"Enable"}
                      </button>
                      {u.id!==currentUser?.id&&(
                        <button onClick={()=>deleteUser(u.id)}
                          style={{padding:"4px 9px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:600}}>🗑 Delete</button>
                      )}
                    </div>
                  )}
                  {currentUser?.role!=="Admin" && u.id===currentUser?.id && (
                    <button onClick={()=>setModal({mode:"password",data:u})}
                      style={{padding:"4px 9px",background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:6,color:"#7c3aed",fontSize:11,cursor:"pointer",fontWeight:600}}>🔑 Change My Password</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.mode==="add"    && <UserFormModal onSave={addUser}    onClose={()=>setModal(null)}/>}
      {modal?.mode==="edit"   && <UserFormModal initial={modal.data} onSave={editUser}  onClose={()=>setModal(null)}/>}
      {modal?.mode==="password" && <ChangePasswordModal user={modal.data} onSave={changePassword} onClose={()=>setModal(null)}/>}
    </div>
  );
}

function UserFormModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [f, setF] = useState(initial || { name:"", username:"", password:"", email:"", role:"Cashier", status:"active" });
  const set = k => v => setF(x=>({...x,[k]:v}));
  const valid = f.name.trim() && f.username.trim() && (isEdit || f.password.trim());
  return (
    <Modal title={isEdit ? "Edit User" : "Add New User"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Full Name *" value={f.name} onChange={set("name")} placeholder="e.g. John Smith"/>
        <TxtInput label="Username *" value={f.username} onChange={set("username")} placeholder="e.g. jsmith"/>
      </div>
      <TxtInput label="Email" value={f.email||""} onChange={set("email")} placeholder="john@doab.com" type="email"/>
      {!isEdit && (
        <TxtInput label="Password *" value={f.password} onChange={set("password")} placeholder="Set a strong password" type="password"/>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Sel label="Role" value={f.role} onChange={set("role")} options={["Admin","Manager","Cashier"]}/>
        {isEdit && <Sel label="Status" value={f.status} onChange={set("status")} options={[{v:"active",l:"Active"},{v:"inactive",l:"Inactive"}]}/>}
      </div>
      <div style={{background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#6b7280"}}>
        <strong style={{color:"#374151"}}>Role permissions:</strong><br/>
        🔑 <strong>Admin</strong> — full access including User Management<br/>
        📊 <strong>Manager</strong> — all modules except User Management<br/>
        🛒 <strong>Cashier</strong> — POS, Inventory, Attendance, Checklist
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{isEdit?"Save Changes":"Create User"}</PBtn>
      </div>
    </Modal>
  );
}

function ChangePasswordModal({ user, onSave, onClose }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const { user:currentUser } = useAuth();

  const submit = () => {
    setErr("");
    const users = getStoredUsers();
    const found = users.find(u => u.id === user.id);
    // Admins can change anyone's password without knowing current
    if (currentUser?.role !== "Admin") {
      if (found?.password !== current) { setErr("Current password is incorrect."); return; }
    }
    if (newPass.length < 6) { setErr("New password must be at least 6 characters."); return; }
    if (newPass !== confirm) { setErr("Passwords don't match."); return; }
    onSave(user.id, newPass);
  };

  return (
    <Modal title={`Change Password — ${user.name}`} onClose={onClose}>
      {currentUser?.role !== "Admin" && (
        <TxtInput label="Current Password *" value={current} onChange={setCurrent} type="password" placeholder="Enter current password"/>
      )}
      <TxtInput label="New Password *" value={newPass} onChange={setNewPass} type="password" placeholder="Min. 6 characters"/>
      <TxtInput label="Confirm New Password *" value={confirm} onChange={setConfirm} type="password" placeholder="Repeat new password"/>
      {err && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",color:"#dc2626",fontSize:12,marginBottom:8,fontWeight:600}}>⚠ {err}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={submit} disabled={!newPass||!confirm}>Update Password</PBtn>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDORS MODULE  (full rewrite — validation fixed, PDF support, edit mode)
// ─────────────────────────────────────────────────────────────────────────────
function VendorsPage() {
  const { data:vendors, save:saveVendorDb, loading:vLoading, error:vError } = useVendors();
  const { data:invoices, save:saveInvoiceDb } = useInvoices();
  const [tab,      setTab]       = useState("vendors");
  const [vModal,   setVModal]    = useState(null);
  const [iModal,   setIModal]    = useState(null);
  const [detailV,  setDetailV]   = useState(null);

  const saveVendor  = async v  => { await saveVendorDb(v);  setVModal(null); setDetailV(null); };
  const saveInvoice = async iv => { await saveInvoiceDb(iv); setIModal(null); };

  const TABS=[{key:"vendors",label:"Vendors",icon:"🏭"},{key:"invoices",label:"Invoices",icon:"🧾"},{key:"prices",label:"Price Tracker",icon:"📈"}];

  if (vLoading) return <LoadingScreen/>;
  if (vError) return <DbError message={vError}/>;

  return (
    <div>
      <PageHeader title="Vendors & Invoices" subtitle="Manage suppliers, track invoices and compare item prices."
        action={tab==="vendors"?<PBtn onClick={()=>setVModal({mode:"add"})}>+ Add Vendor</PBtn>:tab==="invoices"?<PBtn onClick={()=>setIModal({mode:"add"})}>+ Add Invoice</PBtn>:null}/>
      <div style={{display:"flex",gap:5,marginBottom:22,background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:11,padding:4,width:"fit-content"}}>
        {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",background:tab===t.key?"linear-gradient(135deg,#1e3a8a,#2563eb)":"transparent",color:tab===t.key?"#ffffff":"#6b7280",fontWeight:tab===t.key?700:400,fontSize:13,boxShadow:tab===t.key?"0 2px 8px rgba(37,99,235,0.3)":"none"}}><span>{t.icon}</span>{t.label}</button>)}
      </div>
      {tab==="vendors"  && <VendorList vendors={vendors} invoices={invoices} onSelect={setDetailV} onEdit={v=>setVModal({mode:"edit",data:v})}/>}
      {tab==="invoices" && <InvoiceList invoices={invoices} vendors={vendors} onEdit={iv=>setIModal({mode:"edit",data:iv})}/>}
      {tab==="prices"   && <PriceTracker invoices={invoices}/>}
      {vModal  && <VendorModal  initial={vModal.data}  onSave={saveVendor}  onClose={()=>setVModal(null)} existingVendors={vendors}/>}
      {iModal  && <InvoiceModal vendors={vendors} products={SEED_PRODUCTS} allInvoices={invoices} initial={iModal.data} onSave={saveInvoice} onClose={()=>setIModal(null)}
      onAddVendor={async (v,cb)=>{
        const saved = await saveVendorDb({...v,status:"active"});
        const newId = saved?.id || Date.now();
        if(cb) cb(String(newId));
      }}
    />}
      {detailV && <VendorDetail vendor={detailV} invoices={invoices.filter(i=>i.vendorId===detailV.id)} onEdit={()=>{setVModal({mode:"edit",data:detailV});setDetailV(null);}} onClose={()=>setDetailV(null)}/>}
    </div>
  );
}

function VendorList({ vendors, invoices, onSelect, onEdit }) {
  const [search,setSearch]=useState("");
  const CC={Groceries:"#2ecc71",Packaging:"#3b82f6",Dairy:"#f59e0b",Snacks:"#ec4899",Other:"#9ca3af"};
  const filtered=vendors.filter(v=>v.name.toLowerCase().includes(search.toLowerCase())||v.category.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search vendors…" style={{...S.input,maxWidth:340,marginBottom:14}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
        {filtered.map(v=>{
          const vi=invoices.filter(i=>i.vendorId===v.id);
          const tot=vi.reduce((s,iv)=>s+iv.items.reduce((a,it)=>a+it.qty*it.unitPrice,0),0);
          const cc=CC[v.category]||"#9ca3af";
          return (
            <div key={v.id} style={{...S.card,padding:"18px 20px",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#2563eb44"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e9f0"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flex:1}} onClick={()=>onSelect(v)}>
                  <div style={{width:42,height:42,borderRadius:11,background:`${cc}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏭</div>
                  <div><div style={{color:"#0f172a",fontWeight:700,fontSize:14}}>{v.name}</div><span style={{background:`${cc}18`,color:cc,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{v.category}</span></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}><Pill active={v.status==="active"}/><button onClick={()=>onEdit(v)} style={{padding:"3px 9px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:6,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12,fontSize:11,color:"#9ca3af"}}>
                <span>👤 {v.contact}</span><span>📞 {v.phone}</span>
                <span>✉️ {v.email}</span><span>📍 {v.address}</span>
              </div>
              <div style={{display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:10}}>
                <div style={{flex:1,textAlign:"center"}}><div style={{color:"#3b82f6",fontSize:16,fontWeight:800}}>{vi.length}</div><div style={{color:"#6b7280",fontSize:11}}>Invoices</div></div>
                <div style={{width:1,background:"#374151"}}/>
                <div style={{flex:1,textAlign:"center"}}><div style={{color:"#10b981",fontSize:16,fontWeight:800}}>${tot.toFixed(2)}</div><div style={{color:"#6b7280",fontSize:11}}>Total Spent</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvoiceList({ invoices, vendors, onEdit }) {
  const [expanded,setExpanded]=useState(null);
  const [fv,setFv]=useState("All");
  const names=["All",...new Set(invoices.map(i=>i.vendorName))];
  const sorted=[...(fv==="All"?invoices:invoices.filter(i=>i.vendorName===fv))].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const exportInvoices = () => {
    const rows = [];
    sorted.forEach(inv => {
      inv.items.forEach(it => {
        rows.push([inv.invoiceNo, inv.vendorName, inv.date, it.name, it.qty, it.unit, it.unitPrice, (it.qty*it.unitPrice).toFixed(2)]);
      });
    });
    downloadCSV(`invoices_${new Date().toISOString().split('T')[0]}.csv`,
      ["Invoice No","Vendor","Date","Item","Qty","Unit","Unit Price","Line Total"], rows);
  };
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {names.map(n=><FBtn key={n} active={fv===n} onClick={()=>setFv(n)}>{n}</FBtn>)}
        <button onClick={exportInvoices} style={{marginLeft:"auto",padding:"7px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,color:"#059669",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {sorted.length===0&&<div style={{color:"#374151",textAlign:"center",padding:40}}>No invoices yet. Click "+ Add Invoice" to upload one.</div>}
        {sorted.map(inv=>{
          const sub=inv.items.reduce((s,it)=>s+it.qty*it.unitPrice,0);
          const open=expanded===inv.id;
          return (
            <div key={inv.id} style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px"}}>
                <div onClick={()=>setExpanded(open?null:inv.id)} style={{display:"flex",alignItems:"center",gap:12,flex:1,cursor:"pointer"}}>
                  <div style={{width:38,height:38,borderRadius:9,background:"rgba(16,185,129,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🧾</div>
                  <div style={{flex:1}}><div style={{color:"#0f172a",fontWeight:700,fontSize:14}}>{inv.invoiceNo} <span style={{color:"#374151",fontWeight:400}}>·</span> <span style={{color:"#9ca3af",fontWeight:400,fontSize:13}}>{inv.vendorName}</span></div><div style={{color:"#6b7280",fontSize:12}}>{inv.date} · {inv.items.length} items</div></div>
                  <div style={{textAlign:"right",marginRight:8}}><div style={{color:"#10b981",fontWeight:800,fontSize:15}}>${sub.toFixed(2)}</div></div>
                </div>
                <button onClick={()=>onEdit(inv)} style={{padding:"5px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:12,cursor:"pointer",fontWeight:600,flexShrink:0}}>✏️ Edit</button>
                <span onClick={()=>setExpanded(open?null:inv.id)} style={{color:"#374151",cursor:"pointer",padding:"4px",fontSize:14}}>{open?"▲":"▼"}</span>
              </div>
              {open&&(
                <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",padding:"0 16px 14px"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}>
                    <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Item","Unit","Qty","Unit Price","Total"].map(h=><th key={h} style={{...S.th,padding:"7px 10px"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {inv.items.map((it,i)=>(
                        <tr key={i} style={{borderBottom:i<inv.items.length-1?"1px solid #f1f5f9":"none"}}>
                          <td style={{...S.td,color:"#374151",fontWeight:500,padding:"8px 10px"}}>{it.name}</td>
                          <td style={{...S.td,color:"#9ca3af",padding:"8px 10px"}}>{it.unit}</td>
                          <td style={{...S.td,color:"#9ca3af",padding:"8px 10px"}}>{it.qty}</td>
                          <td style={{...S.td,color:"#9ca3af",padding:"8px 10px"}}>${Number(it.unitPrice).toFixed(2)}</td>
                          <td style={{...S.td,color:"#10b981",fontWeight:700,padding:"8px 10px"}}>${(it.qty*it.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceTracker({ invoices }) {
  const [search,setSearch]=useState("");
  const priceMap=useMemo(()=>{
    const m={};
    invoices.forEach(inv=>inv.items.forEach(it=>{ if(!m[it.name]) m[it.name]=[]; m[it.name].push({vendorName:inv.vendorName,date:inv.date,unitPrice:it.unitPrice,invoiceNo:inv.invoiceNo}); }));
    Object.keys(m).forEach(k=>m[k].sort((a,b)=>new Date(b.date)-new Date(a.date)));
    return m;
  },[invoices]);
  const items=Object.keys(priceMap).filter(n=>n.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"13px 16px",marginBottom:18,display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:22}}>📈</span><div><div style={{color:"#10b981",fontWeight:700,fontSize:14}}>Smart Price Tracker</div><div style={{color:"#065f46",fontSize:13}}>Tracks every item across all vendors. Green = cheapest last price. Red = most expensive.</div></div></div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search items…" style={{...S.input,maxWidth:340,marginBottom:14}}/>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {items.map(name=>{
          const entries=priceMap[name];
          const latest={};
          entries.forEach(e=>{ if(!latest[e.vendorName]) latest[e.vendorName]=e; });
          const lp=Object.values(latest);
          const min=Math.min(...lp.map(e=>e.unitPrice));
          const max=Math.max(...lp.map(e=>e.unitPrice));
          const multi=lp.length>1;
          return (
            <div key={name} style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:8,background:"rgba(16,185,129,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📦</div><div><div style={{color:"#0f172a",fontWeight:700,fontSize:14}}>{name}</div><div style={{color:"#6b7280",fontSize:12}}>{lp.length} vendor{lp.length!==1?"s":""} · {entries.length} purchase{entries.length!==1?"s":""}</div></div></div>
                {multi&&max>min&&<div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:9,padding:"5px 12px",textAlign:"center"}}><div style={{color:"#10b981",fontSize:13,fontWeight:800}}>Save {((max-min)/max*100).toFixed(0)}%</div><div style={{color:"#166534",fontSize:11}}>vs most expensive</div></div>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap"}}>
                {lp.map((e,i)=>{
                  const cheap=e.unitPrice===min;
                  const most=multi&&e.unitPrice===max&&!cheap;
                  return (
                    <div key={e.vendorName} style={{flex:1,minWidth:160,padding:"12px 16px",borderRight:i<lp.length-1?"1px solid #e2e8f0":"none",background:cheap?"rgba(16,185,129,0.04)":most?"rgba(248,113,113,0.03)":"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{color:"#9ca3af",fontSize:12,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.vendorName}</span>
                        {cheap&&<span style={{background:"rgba(16,185,129,0.15)",color:"#10b981",borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>CHEAPEST</span>}
                        {most&&<span style={{background:"rgba(248,113,113,0.12)",color:"#f87171",borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>MOST EXP.</span>}
                      </div>
                      <div style={{color:cheap?"#10b981":most?"#f87171":"#374151",fontSize:22,fontWeight:800,marginBottom:3}}>${e.unitPrice.toFixed(2)}</div>
                      <div style={{color:"#374151",fontSize:11}}>{e.date} · {e.invoiceNo}</div>
                    </div>
                  );
                })}
              </div>
              {entries.length>1&&<div style={{borderTop:"1px solid rgba(255,255,255,0.1)",padding:"8px 16px",display:"flex",gap:8,flexWrap:"wrap"}}>
                {entries.map((e,i)=><div key={i} style={{background:"#f1f5f9",borderRadius:7,padding:"4px 10px",display:"flex",gap:8,fontSize:11}}><span style={{color:"#374151"}}>{e.date}</span><span style={{color:"#6b7280",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.vendorName}</span><span style={{color:"#374151",fontWeight:700}}>${e.unitPrice.toFixed(2)}</span></div>)}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VendorModal({ initial, onSave, onClose, existingVendors=[] }) {
  const [f,setF]=useState(initial||{name:"",contact:"",phone:"",email:"",address:"",category:"Groceries",status:"active"});
  const set=k=>v=>setF(x=>({...x,[k]:v}));
  const isDuplicate = !initial && existingVendors.some(v => v.name.trim().toLowerCase() === f.name.trim().toLowerCase());
  const valid=f.name.trim()&&f.contact.trim()&&!isDuplicate;
  return (
    <Modal title={initial?"Edit Vendor":"Add Vendor"} onClose={onClose}>
      <TxtInput label="Company Name *" value={f.name} onChange={set("name")} placeholder="e.g. FreshCo Distributors"/>
      {isDuplicate && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",marginTop:-8,marginBottom:8,color:"#dc2626",fontSize:12,fontWeight:600}}>⚠ A vendor with this name already exists.</div>}
      <TxtInput label="Contact Person *" value={f.contact} onChange={set("contact")} placeholder="e.g. John Smith"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Phone" value={f.phone} onChange={set("phone")} placeholder="+1 555-0000"/>
        <TxtInput label="Email" value={f.email} onChange={set("email")} placeholder="orders@vendor.com" type="email"/>
      </div>
      <TxtInput label="Address" value={f.address} onChange={set("address")} placeholder="Street, City, State"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:6}}>
        <Sel label="Category" value={f.category} onChange={set("category")} options={["Groceries","Dairy","Snacks","Packaging","Beverages","Other"]}/>
        {initial&&<Sel label="Status" value={f.status} onChange={set("status")} options={[{v:"active",l:"Active"},{v:"inactive",l:"Inactive"}]}/>}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Add Vendor"}</PBtn>
      </div>
    </Modal>
  );
}

function VendorDetail({ vendor:v, invoices, onEdit, onClose }) {
  const tot=invoices.reduce((s,iv)=>s+iv.items.reduce((a,it)=>a+it.qty*it.unitPrice,0),0);
  return (
    <Modal title={v.name} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[["👤 Contact",v.contact],["📞 Phone",v.phone],["✉️ Email",v.email],["📍 Address",v.address],["🏷 Category",v.category],["📊 Status",v.status]].map(([l,val])=><div key={l} style={{background:"#f1f5f9",borderRadius:9,padding:"9px 12px"}}><div style={{color:"#374151",fontSize:10,fontWeight:600,marginBottom:2}}>{l}</div><div style={{color:"#9ca3af",fontSize:13}}>{val}</div></div>)}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <div style={{flex:1,background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{color:"#3b82f6",fontSize:20,fontWeight:800}}>{invoices.length}</div><div style={{color:"#374151",fontSize:11}}>Invoices</div></div>
        <div style={{flex:1,background:"rgba(16,185,129,0.08)",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{color:"#10b981",fontSize:20,fontWeight:800}}>${tot.toFixed(2)}</div><div style={{color:"#374151",fontSize:11}}>Total Spent</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><PBtn onClick={onEdit}>✏️ Edit Vendor Details</PBtn></div>
    </Modal>
  );
}

// ── Item Name Input with product autocomplete ─────────────────────────────
function ItemNameInput({ value, products, onChange, onSelect, hasError }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!value.trim() || !focused) return [];
    const q = value.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, products, focused]);

  const showDropdown = open && suggestions.length > 0;

  return (
    <div style={{position:"relative"}}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setFocused(false); }, 150)}
        onInput={() => setOpen(true)}
        placeholder="Type item name…"
        style={{
          ...S.input, fontSize:12,
          border:`1px solid ${hasError?"#f97316":"#e5e9f0"}`,
          width:"100%",
        }}
      />
      {showDropdown && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
          background:"#ffffff", border:"1px solid #e5e9f0",
          borderRadius:10, boxShadow:"0 8px 24px rgba(15,23,42,0.12)",
          zIndex:200, overflow:"hidden",
        }}>
          {suggestions.map(p => (
            <div
              key={p.id}
              onMouseDown={() => { onSelect(p); setOpen(false); }}
              style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"9px 12px", cursor:"pointer", borderBottom:"1px solid #f1f5f9",
                transition:"background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background="#ffffff"}
            >
              <div>
                <div style={{color:"#111827", fontSize:12, fontWeight:600}}>{p.name}</div>
                <div style={{color:"#9ca3af", fontSize:11}}>{p.category} · {p.unit}</div>
              </div>
              <div style={{textAlign:"right", flexShrink:0}}>
                <div style={{color:"#6b7280", fontSize:11}}>cost</div>
                <div style={{color:"#10b981", fontSize:12, fontWeight:700}}>${p.cost.toFixed(2)}</div>
              </div>
            </div>
          ))}
          <div style={{padding:"6px 12px", color:"#9ca3af", fontSize:11, background:"#f8fafc"}}>
            ↵ Select to auto-fill unit & cost
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE MODAL — complete rewrite, validation fixed, PDF support, add+edit
// ─────────────────────────────────────────────────────────────────────────────
function InvoiceModal({ vendors, products = [], allInvoices = [], initial, onSave, onClose, onAddVendor }) {
  const isEdit=!!initial;
  // ── state ──
  const [step,             setStep]          = useState(isEdit?2:1);
  const [vendorId,         setVendorId]      = useState(initial?String(initial.vendorId):"");
  const [invoiceNo,        setInvoiceNo]     = useState(initial?.invoiceNo||"");
  const [date,             setDate]          = useState(initial?.date||new Date().toISOString().split("T")[0]);
  const [items,            setItems]         = useState(initial?.items||[]);
  const [fileB64,          setFileB64]       = useState(null);
  const [fileType,         setFileType]      = useState("image/jpeg");
  const [isPdf,            setIsPdf]         = useState(false);
  const [preview,          setPreview]       = useState(null);
  const [drag,             setDrag]          = useState(false);
  const [loading,          setLoading]       = useState(false);
  const [hint,             setHint]          = useState("");
  const [suggested,        setSuggested]     = useState({});
  // New vendor confirmation prompt
  const [newVendorPrompt,  setNewVendorPrompt] = useState(null); // { name, category }

  // ── VALIDATION ──
  const vOk  = vendorId !== "" && (vendors.some(v=>String(v.id)===String(vendorId)) || vendorId.length > 0);
  const isDupInvoice = !isEdit && invoiceNo.trim() && allInvoices?.some(i => i.invoiceNo?.trim().toLowerCase() === invoiceNo.trim().toLowerCase());
  const nOk  = invoiceNo.trim().length > 0 && !isDupInvoice;
  const dOk  = date.length > 0;
  const iOk  = items.length > 0 && items.every(it => it.name?.trim() && Number(it.qty) > 0 && Number(it.unitPrice) >= 0);
  const valid = vOk && nOk && dOk && iOk;
  const validationMsg = !vOk?"⚠ Select a vendor":!nOk?"⚠ Enter invoice number":!dOk?"⚠ Set a date":!iOk?"⚠ Add at least one item with name + qty":"";

  // ── file handling ──
  const handleFile = file => {
    if (!file) return;
    const pdf=file.type==="application/pdf";
    const img=file.type.startsWith("image/");
    if(!pdf&&!img){setHint("Please upload a JPG, PNG, WEBP image or PDF.");return;}
    setHint(""); setIsPdf(pdf); setFileType(file.type);
    setFileSize((file.size / 1024 / 1024).toFixed(1));
    const r=new FileReader();
    r.onload=e=>{const d=e.target.result;setFileB64(d.split(",")[1]);if(!pdf)setPreview(d);else setPreview(null);};
    r.readAsDataURL(file);
  };

  const [fileSize, setFileSize] = useState(null);

  // ── Save image to persistent storage ──────────────────────────────────────
  const saveImageToStorage = async (invoiceKey, dataUrl) => {
    try {
      await window.storage.set(`invoice-img:${invoiceKey}`, dataUrl);
    } catch(e) {  }
  };

  // ── Compress image ─────────────────────────────────────────────────────────
  const compressImage = (dataUrl, maxPx=1400, quality=0.88) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve({ b64: out.split(",")[1], dataUrl: out, type: "image/jpeg" });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });

  // ── AI scan — uses correct artifact API model ──────────────────────────────
  const scan = async () => {
    if (!fileB64) { setHint("Please upload a file first."); return; }
    setLoading(true); setHint("");

    try {
      // Compress image first
      let b64 = fileB64;
      let mimeType = fileType;
      let compressedDataUrl = preview;

      if (!isPdf && preview) {
        const c = await compressImage(preview);
        if (c) { b64 = c.b64; mimeType = c.type; compressedDataUrl = c.dataUrl; }
      }

      // Save image to storage for future access (keyed by timestamp)
      const imgKey = `scan-${Date.now()}`;
      if (compressedDataUrl) saveImageToStorage(imgKey, compressedDataUrl);

      const imageBlock = { type:"image", source:{ type:"base64", media_type: mimeType, data: b64 } };

      // ── Step 1: Extract raw text/data from invoice ──────────────────────────
      const step1 = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: [
              imageBlock,
              { type:"text", text:`Look at this invoice image. List every line item you can see.
For EACH item write one line exactly like this:
ITEM: <product name> | QTY: <number> | UNIT: <unit> | UNIT_PRICE: <number> | LINE_TOTAL: <number>

Then at the end write:
INVOICE_NO: <number or blank>
DATE: <YYYY-MM-DD or blank>
VENDOR: <company name or blank>

Rules:
- UNIT_PRICE is the price for ONE unit only
- LINE_TOTAL is qty × unit_price
- If you only see a line total (not unit price), calculate: UNIT_PRICE = LINE_TOTAL / QTY
- Write plain numbers only — no $ signs, no commas
- List EVERY item, do not skip any` }
            ]
          }]
        })
      });

      if (!step1.ok) {
        const t = await step1.text();
        throw new Error(`API ${step1.status}: ${t.slice(0,300)}`);
      }

      const d1 = await step1.json();
      if (d1.error) throw new Error(d1.error.message || JSON.stringify(d1.error));
      const rawText = (d1.content || []).map(b => b.text||"").join("").trim();

      // ── Step 2: Parse the structured text into JSON ─────────────────────────
      const step2 = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            { role:"user", content: [imageBlock, { type:"text", text:`Look at this invoice image. List every line item you can see.
For EACH item write one line exactly like this:
ITEM: <product name> | QTY: <number> | UNIT: <unit> | UNIT_PRICE: <number> | LINE_TOTAL: <number>

Then at the end write:
INVOICE_NO: <number or blank>
DATE: <YYYY-MM-DD or blank>
VENDOR: <company name or blank>

Rules:
- UNIT_PRICE is the price for ONE unit only
- LINE_TOTAL is qty × unit_price
- If you only see a line total (not unit price), calculate: UNIT_PRICE = LINE_TOTAL / QTY
- Write plain numbers only — no $ signs, no commas
- List EVERY item, do not skip any` }] },
            { role:"assistant", content: rawText },
            { role:"user", content: `Convert the above into a JSON object. Return ONLY the JSON, no explanation, no markdown:
{"invoiceNo":"","date":"","vendorName":"","items":[{"name":"","qty":0,"unit":"","unitPrice":0,"lineTotal":0}]}
Make sure every number is a plain number (not a string). Make sure lineTotal = qty * unitPrice.` }
          ]
        })
      });

      if (!step2.ok) {
        const t = await step2.text();
        throw new Error(`API step2 ${step2.status}: ${t.slice(0,300)}`);
      }

      const d2 = await step2.json();
      if (d2.error) throw new Error(d2.error.message || JSON.stringify(d2.error));
      const rawJson = (d2.content || []).map(b => b.text||"").join("").trim();

      // Strip markdown fences — handles ```json\n...\n``` and ``` ... ```
      const stripped = rawJson
        .replace(/^```[\w]*[\r\n]*/,"")   // remove opening ```json or ```
        .replace(/[\r\n]*```\s*$/,"")      // remove closing ```
        .trim();

      let parsed = null;
      for (const fn of [
        () => JSON.parse(stripped),
        () => JSON.parse(rawJson),
        () => { const m=stripped.match(/{[\s\S]*}/); if(m) return JSON.parse(m[0]); throw 0; },
        () => { const m=rawJson.match(/{[\s\S]*}/);  if(m) return JSON.parse(m[0]); throw 0; },
      ]) { try { parsed = fn(); break; } catch(_) {} }

      if (!parsed) throw new Error(`JSON parse failed. Step2 response: "${rawJson.slice(0,200)}"`);

      const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
      if (!rawItems.length) throw new Error("No items found in invoice. Try a clearer photo.");

      // ── Clean and correct numbers ───────────────────────────────────────────
      const cleanNum = (v, fb=0) => {
        if (v === null || v === undefined || v === "") return fb;
        if (typeof v === "number") return isFinite(v) ? v : fb;
        const s = String(v).replace(/[^0-9.,\-]/g,"").replace(/,(\d{3})/g,"$1").replace(/,/g,".");
        const n = parseFloat(s);
        return isFinite(n) ? n : fb;
      };

      const mappedItems = rawItems.map(it => {
        const name  = String(it.name || it.description || "").trim();
        const qty   = Math.max(cleanNum(it.qty || it.quantity, 1), 0.001);
        const unit  = String(it.unit || "unit").trim();
        let up   = cleanNum(it.unitPrice  ?? it.unit_price  ?? it.price ?? null, -1);
        let lt   = cleanNum(it.lineTotal  ?? it.line_total  ?? it.total ?? null, -1);

        // Self-correct: if both exist but don't match, lineTotal wins
        if (up >= 0 && lt >= 0) {
          const expected = parseFloat((qty * up).toFixed(2));
          const tol = Math.max(0.05, expected * 0.02);
          if (Math.abs(expected - lt) > tol) {
            // lineTotal is more likely correct (it's what the invoice shows)
            up = parseFloat((lt / qty).toFixed(4));
          }
        } else if (lt >= 0 && up < 0) {
          up = parseFloat((lt / qty).toFixed(4));
        } else if (up >= 0 && lt < 0) {
          lt = parseFloat((qty * up).toFixed(2));
        } else {
          up = 0; lt = 0;
        }

        return { name, qty, unit, unitPrice: Math.max(up,0), lineTotal: Math.max(lt,0) };
      });

      setItems(mappedItems);

      // Extract header fields
      const sug = {};
      const inv = parsed.invoiceNo || parsed.invoice_no || "";
      const dt  = parsed.date || parsed.invoice_date || "";
      const vn  = parsed.vendorName || parsed.vendor_name || parsed.supplier || "";
      if (inv) { setInvoiceNo(String(inv)); sug.invoiceNo = String(inv); }
      if (dt)  { setDate(String(dt));       sug.date      = String(dt);  }
      if (vn)  {
        sug.vendorName = vn;
        const vnl = vn.toLowerCase().split(" ")[0];
        const match = vendors.find(v =>
          v.name.toLowerCase().includes(vnl) || vnl.includes(v.name.toLowerCase().split(" ")[0])
        );
        if (match) { setVendorId(String(match.id)); }
        else if (vn.trim()) { setNewVendorPrompt({ name: vn.trim() }); }
      }
      setSuggested(sug);
      setStep(2);

    } catch(e) {
      setHint(String(e.message || "Unknown error. Check browser console (F12)."));
    }
    setLoading(false);
  };

  const addRow = () => setItems(is => [...is, { name:"", qty:1, unit:"unit", unitPrice:0, lineTotal:0 }]);
  const upd = (i, k, v) => setItems(is => is.map((it, idx) => {
    if (idx !== i) return it;
    if (k === "qty" || k === "unitPrice") {
      const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
      const val = isFinite(n) ? n : 0;
      const updated = { ...it, [k]: val };
      // Always keep lineTotal in sync
      updated.lineTotal = parseFloat((updated.qty * updated.unitPrice).toFixed(2));
      return updated;
    }
    if (k === "lineTotal") {
      const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
      const val = isFinite(n) ? n : 0;
      const updated = { ...it, lineTotal: val };
      // Recalculate unitPrice from lineTotal / qty
      if (updated.qty > 0) updated.unitPrice = parseFloat((val / updated.qty).toFixed(4));
      return updated;
    }
    return { ...it, [k]: v };
  }));
  const del = i => setItems(is => is.filter((_, idx) => idx !== i));
  const subtotal  = items.reduce((s,it)=>s+Number(it.qty)*Number(it.unitPrice),0);
  const doSave = () => {
    if (!valid) return;
    // Vendor might be newly added and not yet in list — fall back to newVendorPrompt name
    const vendor = vendors.find(v => String(v.id) === String(vendorId));
    const vName  = vendor?.name || newVendorPrompt?.name || "Unknown Vendor";
    const cleanItems = items.map(({ name, qty, unit, unitPrice }) => ({ name, qty, unit, unitPrice }));
    onSave({ ...(isEdit ? { id: initial.id } : {}), vendorId: Number(vendorId), vendorName: vName, invoiceNo: invoiceNo.trim(), date, items: cleanItems });
  };

  const SP=({n,label,active,done})=>(
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?"#10b981":active?"linear-gradient(135deg,#1e3a8a,#2563eb)":"#374151",color:(active||done)?"#0f172a":"#cbd5e1"}}>{done?"✓":n}</div>
      <span style={{color:(active||done)?"#9ca3af":"#cbd5e1",fontSize:13}}>{label}</span>
    </div>
  );

  return (
    <Modal title={isEdit?`Edit Invoice — ${initial.invoiceNo}`:"Add Invoice"} onClose={onClose} wide>
      {!isEdit&&<div style={{display:"flex",alignItems:"center",marginBottom:20}}><SP n={1} label="Upload File" active={step===1} done={step>1}/><div style={{flex:1,height:1,background:"#374151",margin:"0 10px"}}/><SP n={2} label="Review & Save" active={step===2} done={false}/></div>}

      {step===1&&(
        <>
          {/* Upload zone — desktop drag/drop */}
          <div onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
            onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
            onClick={()=>document.getElementById("inv-gallery").click()}
            style={{border:`2px dashed ${drag?"#10b981":"#bfdbfe"}`,borderRadius:13,padding:"22px 20px",textAlign:"center",background:drag?"rgba(16,185,129,0.05)":"#f8fafc",cursor:"pointer",marginBottom:12,transition:"all 0.2s"}}>
            {/* Gallery picker — no capture attribute, works on all devices */}
            <input id="inv-gallery" type="file" accept="image/*,application/pdf" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
            {preview ? (
              <>
                <img src={preview} alt="preview" style={{maxHeight:180,maxWidth:"100%",borderRadius:9,border:"1px solid #e2e8f0",objectFit:"contain",marginBottom:10}}/>
                <div style={{color:"#059669",fontSize:13,fontWeight:600}}>✓ Image ready {fileSize&&`· ${fileSize} MB (will compress)`}</div>
                <div style={{color:"#9ca3af",fontSize:12,marginTop:3}}>Tap to choose a different file</div>
              </>
            ) : fileB64&&isPdf ? (
              <>
                <div style={{fontSize:40,marginBottom:8}}>📄</div>
                <div style={{color:"#059669",fontSize:13,fontWeight:600}}>✓ PDF loaded {fileSize&&`(${fileSize} MB)`}</div>
                <div style={{color:"#9ca3af",fontSize:12,marginTop:3}}>Tap to change</div>
              </>
            ) : (
              <>
                <div style={{fontSize:40,marginBottom:10}}>📁</div>
                <div style={{color:"#374151",fontSize:14,fontWeight:700,marginBottom:4}}>Choose from Files / Gallery</div>
                <div style={{color:"#9ca3af",fontSize:12,marginBottom:8}}>JPG, PNG, WEBP, PDF · Drag & drop on desktop</div>
              </>
            )}
          </div>

          {/* 📷 Camera button — visible only on mobile, opens camera directly */}
          <input id="inv-camera" type="file" accept="image/*" capture="environment" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
          <button
            onClick={()=>document.getElementById("inv-camera").click()}
            style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10,boxShadow:"0 4px 14px rgba(59,130,246,0.25)"}}>
            📷 Take Photo of Invoice (Mobile Camera)
          </button>

          {hint&&(
            <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
              <div style={{color:"#dc2626",fontSize:13,fontWeight:700,marginBottom:4}}>⚠ Scan Failed</div>
              <div style={{color:"#dc2626",fontSize:12,lineHeight:1.6,wordBreak:"break-word"}}>{hint}</div>
              <div style={{color:"#991b1b",fontSize:11,marginTop:6}}>Check browser console (F12) for full error details.</div>
            </div>
          )}
          <button onClick={scan} disabled={!fileB64||loading} style={{width:"100%",padding:"12px",background:(!fileB64||loading)?"#e5e9f0":"linear-gradient(135deg,#064e3b,#10b981)",border:"none",borderRadius:10,color:(!fileB64||loading)?"#9ca3af":"#d1fae5",fontSize:13,fontWeight:700,cursor:(!fileB64||loading)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading?<><Spinner/> Scanning with AI…</>:"🤖 Scan Invoice with AI →"}
          </button>
          {loading&&<div style={{marginTop:12,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,padding:"10px 14px"}}><div style={{color:"#15803d",fontSize:13,fontWeight:600}}>🔍 Reading invoice…</div><div style={{color:"#166534",fontSize:12}}>Extracting vendor, date, invoice number and all line items.</div></div>}
          <div style={{marginTop:10,textAlign:"center"}}><button onClick={()=>{addRow();setStep(2);}} style={{background:"none",border:"none",color:"#9ca3af",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Skip — enter items manually</button></div>
        </>
      )}

      {step===2&&(
        <>
          {Object.keys(suggested).length>0&&!isEdit&&<div style={{background:"rgba(16,185,129,0.07)",border:"1px solid #bbf7d0",borderRadius:10,padding:"11px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}><span>✅</span><div><div style={{color:"#10b981",fontSize:13,fontWeight:700}}>AI found {items.length} item{items.length!==1?"s":""}</div><div style={{color:"#166534",fontSize:12,marginTop:2}}>{[suggested.invoiceNo&&`Invoice: ${suggested.invoiceNo}`,suggested.date&&`Date: ${suggested.date}`,suggested.vendorName&&`Vendor hint: ${suggested.vendorName}`].filter(Boolean).join(" · ")}</div></div></div>}
          {hint&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:9,padding:"9px 13px",color:"#f59e0b",fontSize:12,marginBottom:12}}>⚠ {hint}</div>}

          {/* New vendor confirmation banner */}
          {newVendorPrompt && !vendorId && (
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:11,padding:"14px 16px",marginBottom:14}}>
              <div style={{color:"#92400e",fontSize:13,fontWeight:700,marginBottom:6}}>
                🏭 New vendor detected: "<strong>{newVendorPrompt.name}</strong>"
              </div>
              <div style={{color:"#78350f",fontSize:12,marginBottom:10}}>
                This vendor is not in your list yet. Would you like to add them automatically?
              </div>
              <div style={{display:"flex",gap:8}}>
                <button
                  onClick={()=>{
                    onAddVendor(
                      { name:newVendorPrompt.name, contact:"", phone:"", email:"", address:"", category:"Other", status:"active" },
                      (newId) => setVendorId(newId)
                    );
                    setNewVendorPrompt(null);
                  }}
                  style={{padding:"7px 14px",background:"linear-gradient(135deg,#d97706,#f59e0b)",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  ✅ Yes, add "{newVendorPrompt.name}"
                </button>
                <button
                  onClick={()=>setNewVendorPrompt(null)}
                  style={{padding:"7px 14px",background:"transparent",border:"1px solid #fde68a",borderRadius:8,color:"#92400e",fontSize:12,cursor:"pointer"}}>
                  No, I'll select manually
                </button>
              </div>
            </div>
          )}

          {/* Vendor + Invoice No */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{color:"#9ca3af",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>Vendor *</div>
              <select value={vendorId} onChange={e=>setVendorId(e.target.value)} style={{...S.input,border:`1px solid ${!vOk&&vendorId===""?"#f97316":"#e5e9f0"}`}}>
                <option value="">-- Select vendor --</option>
                {vendors.map(v=><option key={v.id} value={String(v.id)}>{v.name}</option>)}
              </select>
              {suggested.vendorName&&!vOk&&<div style={{color:"#f59e0b",fontSize:11,marginTop:3}}>AI detected: "{suggested.vendorName}"</div>}
            </div>
            <div>
              <TxtInput label="Invoice Number *" value={invoiceNo} onChange={setInvoiceNo} placeholder="e.g. FC-1099"/>
              {isDupInvoice && <div style={{color:"#dc2626",fontSize:11,marginTop:-8,marginBottom:8,fontWeight:600}}>⚠ Invoice #{invoiceNo} already exists.</div>}
            </div>
          </div>
          <TxtInput label="Invoice Date *" value={date} onChange={setDate} type="date"/>

          {/* Items — proper table layout */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{color:"#374151",fontSize:13,fontWeight:700}}>Line Items *</div>
            <button onClick={addRow} style={{padding:"5px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>+ Add Row</button>
          </div>
          <div style={{border:"1px solid #e5e9f0",borderRadius:10,overflow:"auto",marginBottom:12,maxHeight:320,WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup>
                <col style={{width:"36%"}}/><col style={{width:"9%"}}/><col style={{width:"11%"}}/>
                <col style={{width:"16%"}}/><col style={{width:"18%"}}/><col style={{width:"10%"}}/>
              </colgroup>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr style={{background:"#f8fafc",borderBottom:"2px solid #e5e9f0"}}>
                  {["Item Name","Unit","Qty","Unit Price ($)","Line Total ($)",""].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length===0 && (
                  <tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:13}}>No items. Click "+ Add Row" or scan an invoice.</td></tr>
                )}
                {items.map((it,i)=>{
                  const computed = parseFloat((it.qty * it.unitPrice).toFixed(2));
                  const mismatch = it.lineTotal > 0 && Math.abs(computed - it.lineTotal) > 0.02;
                  return (
                    <tr key={i} style={{background:mismatch?"#fffbeb":i%2===0?"#fff":"#fafbfc",borderBottom:"1px solid #e5e9f0"}}>
                      <td style={{padding:"5px 8px",verticalAlign:"top"}}>
                        <ItemNameInput value={it.name} products={products}
                          onChange={name=>upd(i,"name",name)}
                          onSelect={p=>setItems(is=>is.map((item,idx)=>idx===i?{...item,name:p.name,unit:p.unit,unitPrice:p.cost,lineTotal:parseFloat((item.qty*p.cost).toFixed(2))}:item))}
                          hasError={!it.name?.trim()}/>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <input value={it.unit} onChange={e=>upd(i,"unit",e.target.value)} placeholder="unit"
                          style={{...S.input,fontSize:12,padding:"7px 6px"}}/>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <input value={it.qty===0?"":it.qty} onChange={e=>upd(i,"qty",e.target.value)}
                          onBlur={e=>{if(!e.target.value||Number(e.target.value)<=0)upd(i,"qty",1);}}
                          type="number" min="0.001" step="any" placeholder="1"
                          style={{...S.input,fontSize:12,padding:"7px 6px",border:`1px solid ${!(it.qty>0)?"#f97316":"#e5e9f0"}`}}/>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <div style={{position:"relative"}}>
                          <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11,pointerEvents:"none",lineHeight:1}}>$</span>
                          <input value={it.unitPrice===0?"":it.unitPrice} onChange={e=>upd(i,"unitPrice",e.target.value)}
                            onBlur={e=>{if(!e.target.value)upd(i,"unitPrice",0);}}
                            type="number" min="0" step="0.0001" placeholder="0.00"
                            style={{...S.input,fontSize:12,padding:"7px 6px 7px 16px",color:"#374151"}}/>
                        </div>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <div style={{position:"relative"}}>
                          <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11,pointerEvents:"none",lineHeight:1}}>$</span>
                          <input value={it.lineTotal===0?"":it.lineTotal} onChange={e=>upd(i,"lineTotal",e.target.value)}
                            onBlur={e=>{if(!e.target.value)upd(i,"lineTotal",0);}}
                            type="number" min="0" step="0.01" placeholder="0.00"
                            title="Edit line total → unit price auto-corrects"
                            style={{...S.input,fontSize:12,padding:"7px 6px 7px 16px",color:"#059669",fontWeight:700,
                              border:`1px solid ${mismatch?"#f97316":"#e5e9f0"}`}}/>
                          {mismatch&&<div style={{color:"#f97316",fontSize:9,marginTop:1}}>expected: {computed.toFixed(2)}</div>}
                        </div>
                      </td>
                      <td style={{padding:"5px 5px",textAlign:"center",verticalAlign:"top"}}>
                        <button onClick={()=>del(i)} style={{width:26,height:26,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#ef4444",fontSize:12,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",marginTop:2}}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {items.length>0&&(
                <tfoot>
                  <tr style={{background:"#f0fdf4",borderTop:"2px solid #bbf7d0"}}>
                    <td colSpan={4} style={{padding:"9px 10px",textAlign:"right",color:"#6b7280",fontSize:12,fontWeight:700}}>
                      {items.length} item{items.length!==1?"s":""} · Total:
                    </td>
                    <td style={{padding:"9px 8px",color:"#059669",fontSize:15,fontWeight:800}}>
                      ${items.reduce((s,it)=>s+Number(it.lineTotal||it.qty*it.unitPrice),0).toFixed(2)}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {items.some(it=>it.lineTotal>0&&Math.abs(parseFloat((it.qty*it.unitPrice).toFixed(2))-it.lineTotal)>0.02)&&(
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#92400e"}}>
              ⚠ Orange rows have a mismatch — edit the <strong>Line Total</strong> to match your invoice and unit price will auto-correct.
            </div>
          )}
          {/* Validation */}
          <div style={{marginBottom:16}}>
            {!valid&&<div style={{color:"#f97316",fontSize:12,fontWeight:600}}>{validationMsg}</div>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
            {!isEdit?<button onClick={()=>setStep(1)} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>← Re-upload</button>:<button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>}
            <PBtn onClick={doSave} disabled={!valid}>{isEdit?"Save Changes ✓":"Save Invoice ✓"}</PBtn>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS & ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────
function AlertsPage() {
  const [alerts,setAlerts]=useState([
    {id:1,icon:"⚠️",msg:"8 items running low on stock",detail:"Milk, Bread, Eggs and more below reorder level.",time:"2m ago",color:"#f59e0b",read:false},
    {id:2,icon:"📦",msg:"New PO #PO-2041 pending approval",detail:"Purchase order from FreshCo awaiting approval.",time:"15m ago",color:"#3b82f6",read:false},
    {id:3,icon:"✅",msg:"Today's sales target 84% achieved",detail:"$3,595 of $4,280 daily target reached.",time:"1h ago",color:"#2ecc71",read:true},
    {id:4,icon:"🔴",msg:"FreshCo delivery overdue",detail:"Expected delivery on 2026-03-08 not confirmed.",time:"3h ago",color:"#f87171",read:false},
  ]);
  const unread=alerts.filter(a=>!a.read).length;
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div><h1 style={{color:"#0f172a",fontSize:23,fontWeight:800,margin:0}}>Notifications</h1><p style={{color:"#6b7280",fontSize:13,marginTop:4}}>{unread} unread</p></div>
        {unread>0&&<button onClick={()=>setAlerts(as=>as.map(a=>({...a,read:true})))} style={{padding:"8px 14px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:8,color:"#3b82f6",fontSize:13,cursor:"pointer",fontWeight:600}}>Mark all read</button>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {alerts.map(a=>(
          <div key={a.id} onClick={()=>setAlerts(as=>as.map(x=>x.id===a.id?{...x,read:true}:x))} style={{display:"flex",gap:12,background:a.read?"#ffffff":"#eff6ff",border:`1px solid ${a.read?"#374151":a.color+"33"}`,borderRadius:13,padding:"14px 16px",cursor:"pointer",opacity:a.read?0.6:1,transition:"all 0.15s"}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${a.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{a.icon}</div>
            <div style={{flex:1}}><div style={{color:"#374151",fontWeight:700,fontSize:13,marginBottom:3,display:"flex",alignItems:"center",gap:7}}>{a.msg}{!a.read&&<span style={{width:6,height:6,borderRadius:"50%",background:a.color,display:"inline-block"}}/>}</div><div style={{color:"#9ca3af",fontSize:12}}>{a.detail}</div></div>
            <div style={{color:"#374151",fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>{a.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityPage() {
  const ACTS=[{id:1,user:"Alex Rivera",action:"Changed role of Jamie Lee to Cashier",time:"2026-03-10 09:10",type:"role"},{id:2,user:"Alex Rivera",action:"Deactivated Morgan Hill",time:"2026-03-09 16:30",type:"status"},{id:3,user:"Sam Torres",action:"Logged in",time:"2026-03-10 08:30",type:"auth"},{id:4,user:"Alex Rivera",action:"Updated permissions for Manager role",time:"2026-03-08 14:00",type:"permission"}];
  const CFG={role:{icon:"🔑",color:"#c45c00"},status:{icon:"⚡",color:"#b45309"},auth:{icon:"🔐",color:"#2952c4"},permission:{icon:"🛡️",color:"#7c3aed"}};
  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Audit trail of all user management actions."/>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        {ACTS.map((a,i)=>{const cfg=CFG[a.type]||{icon:"📋",color:"#999"};return(
          <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 18px",borderBottom:i<ACTS.length-1?"1px solid #e2e8f0":"none"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"#0f172a",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:15}}>{cfg.icon}</div>
            <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}><span style={{color:"#374151",fontWeight:600,fontSize:13}}>{a.user}</span><span style={{color:"#374151",fontSize:11}}>·</span><span style={{color:cfg.color,fontSize:11,fontWeight:600}}>{a.type}</span></div><div style={{color:"#9ca3af",fontSize:12}}>{a.action}</div></div>
            <div style={{color:"#6b7280",fontSize:11,whiteSpace:"nowrap"}}>{a.time}</div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function Login() {
  const {login}=useAuth();
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err,setErr]=useState(""); const [loading,setL]=useState(false);
  const [show,setShow]=useState(false);

  const submit=()=>{
    setErr("");
    if(!u||!p) return setErr("Please enter username and password.");
    setL(true);
    setTimeout(()=>{
      const users = getStoredUsers();
      const found = users.find(usr =>
        usr.username.toLowerCase()===u.toLowerCase() &&
        usr.password===p &&
        usr.status==="active"
      );
      if(found){
        const session = {id:found.id,name:found.name,role:found.role,avatar:found.avatar,email:found.email,username:found.username};
        saveSession(session);
        login(session);
      } else {
        setErr("Invalid username or password.");
        setL(false);
      }
    },600);
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.08) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{width:420,zIndex:1,padding:"0 16px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:68,height:68,background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",borderRadius:20,marginBottom:14,boxShadow:"0 8px 28px rgba(59,130,246,0.3)"}}><span style={{fontSize:32}}>🥯</span></div>
          <div style={{color:"#0f172a",fontSize:26,fontWeight:800,letterSpacing:"-0.5px"}}>Deli On A Bagel Cafe</div>
          <div style={{color:"#6b7280",fontSize:12,marginTop:4,letterSpacing:"1px",textTransform:"uppercase"}}>Store Management</div>
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:20,boxShadow:"0 8px 40px rgba(15,23,42,0.12)",padding:"32px 32px 28px"}}>
          <div style={{color:"#111827",fontSize:20,fontWeight:800,marginBottom:4}}>Welcome back</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:24}}>Sign in with your credentials</div>
          {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:16,fontWeight:600}}>⚠ {err}</div>}
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:6,textTransform:"uppercase"}}>Username</div>
          <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter your username" style={{...S.input,marginBottom:16}}/>
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:6,textTransform:"uppercase"}}>Password</div>
          <div style={{position:"relative",marginBottom:24}}>
            <input value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••" type={show?"text":"password"} style={{...S.input,paddingRight:40}}/>
            <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:16,lineHeight:1}}>{show?"🙈":"👁"}</button>
          </div>
          <button onClick={submit} disabled={loading} style={{width:"100%",background:loading?"#93c5fd":"linear-gradient(135deg,#1e3a8a,#3b82f6)",border:"none",borderRadius:12,padding:"13px",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",boxShadow:"0 4px 20px rgba(59,130,246,0.3)",letterSpacing:"0.3px"}}>
            {loading?"Signing in…":"Sign In →"}
          </button>
          <div style={{marginTop:20,padding:"12px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #e5e9f0"}}>
            <div style={{color:"#374151",fontSize:11,fontWeight:700,marginBottom:4}}>DEFAULT CREDENTIALS</div>
            <div style={{color:"#6b7280",fontSize:12,fontFamily:"monospace"}}>Username: <strong style={{color:"#374151"}}>admin</strong> · Password: <strong style={{color:"#374151"}}>admin123</strong></div>
            <div style={{color:"#9ca3af",fontSize:11,marginTop:4}}>Change these in User Management after logging in.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NEW FEATURE PAGES
// ═════════════════════════════════════════════════════════════════════════════

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
function PurchasePage() {
  const { data:pos, loading, error, save:saveDb, update:updateDb } = usePOs();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const filtered = filter==="all" ? pos : pos.filter(p=>p.status===filter);
  const save = async p => { await saveDb(p); setModal(null); };
  const updateStatus = async (id,status) => { await updateDb(id,{status}); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  const totals = { pending:pos.filter(p=>p.status==="pending").length, ordered:pos.filter(p=>p.status==="ordered").length, received:pos.filter(p=>p.status==="received").length };
  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Create and track orders to your suppliers." action={<PBtn onClick={()=>setModal({})}>+ New PO</PBtn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="⏳" label="Pending Approval" value={totals.pending} color="#f59e0b"/>
        <StatCard icon="📦" label="Ordered" value={totals.ordered} color="#3b82f6"/>
        <StatCard icon="✅" label="Received" value={totals.received} color="#10b981"/>
        <StatCard icon="💰" label="Total Value" value={`$${pos.reduce((s,p)=>s+p.total,0).toFixed(2)}`} color="#6366f1"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["all","pending","ordered","received","cancelled"].map(s=>(
          <FBtn key={s} active={filter===s} onClick={()=>setFilter(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</FBtn>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(po=>{
          const sc = PO_STATUS_COLORS[po.status]||{bg:"#f1f5f9",text:"#374151"};
          return (
            <div key={po.id} style={{...S.card,padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📋</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{color:"#111827",fontWeight:700,fontSize:15}}>{po.poNo}</span>
                    <span style={{background:sc.bg,color:sc.text,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{po.status}</span>
                  </div>
                  <div style={{color:"#6b7280",fontSize:12,marginTop:2}}>{po.vendorName} · {po.items.length} items · Expected: {po.expectedDate}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:"#059669",fontSize:17,fontWeight:800}}>${po.total.toFixed(2)}</div>
                  <div style={{color:"#9ca3af",fontSize:11}}>Created {po.date}</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>setModal(po)} style={{padding:"5px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
                  {po.status==="pending" && <button onClick={()=>updateStatus(po.id,"ordered")} style={{padding:"5px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:12,cursor:"pointer",fontWeight:600}}>Mark Ordered</button>}
                  {po.status==="ordered" && <button onClick={()=>updateStatus(po.id,"received")} style={{padding:"5px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:12,cursor:"pointer",fontWeight:600}}>Mark Received</button>}
                </div>
              </div>
              <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                {po.items.map((it,i)=>(
                  <span key={i} style={{background:"#f8fafc",border:"1px solid #e5e9f0",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#374151"}}>
                    {it.name} × {it.qty}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {modal!==null && <POModal initial={modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function POModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const { data:vendors } = useVendors();
  const [vendorId, setVendorId] = useState(String(initial?.vendorId||""));
  const [vendorName, setVendorName] = useState(initial?.vendorName||"");
  const [expected, setExpected] = useState(initial?.expectedDate||"");
  const [notes, setNotes] = useState(initial?.notes||"");
  const [items, setItems] = useState(initial?.items||[{name:"",qty:1,unit:"unit",unitCost:0}]);
  const addRow = () => setItems(is=>[...is,{name:"",qty:1,unit:"unit",unitCost:0}]);
  const upd = (i,k,v) => setItems(is=>is.map((it,idx)=>idx===i?{...it,[k]:k==="qty"||k==="unitCost"?Number(v):v}:it));
  const del = i => setItems(is=>is.filter((_,idx)=>idx!==i));
  const total = items.reduce((s,it)=>s+it.qty*it.unitCost,0);
  const valid = vendorName && expected && items.length>0 && items.every(it=>it.name&&it.qty>0);
  const save = () => { if(!valid)return; onSave({...(isEdit?{id:initial.id,poNo:initial.poNo}:{}),vendorId:Number(vendorId),vendorName,status:initial?.status||"pending",date:new Date().toISOString().split("T")[0],expectedDate:expected,items,total,notes}); };
  return (
    <Modal title={isEdit?"Edit PO":"New Purchase Order"} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div>
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>Vendor *</div>
          <select value={vendorId} onChange={e=>{setVendorId(e.target.value);setVendorName(vendors.find(v=>String(v.id)===e.target.value)?.name||"");}} style={S.input}>
            <option value="">-- Select vendor --</option>
            {vendors.map(v=><option key={v.id} value={String(v.id)}>{v.name}</option>)}
          </select>
        </div>
        <TxtInput label="Expected Delivery *" value={expected} onChange={setExpected} type="date"/>
      </div>
      <TxtInput label="Notes" value={notes} onChange={setNotes} placeholder="Any special instructions…"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{color:"#374151",fontWeight:700,fontSize:13}}>Items *</div>
        <button onClick={addRow} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>+ Add Item</button>
      </div>
      {items.map((it,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.7fr 1fr 28px",gap:8,marginBottom:8,alignItems:"center"}}>
          <input value={it.name} onChange={e=>upd(i,"name",e.target.value)} placeholder="Item name" style={S.input}/>
          <input value={it.unit} onChange={e=>upd(i,"unit",e.target.value)} placeholder="unit" style={S.input}/>
          <input value={it.qty||""} onChange={e=>upd(i,"qty",e.target.value)} type="number" min="1" placeholder="Qty" style={S.input}/>
          <div style={{position:"relative"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11}}>$</span><input value={it.unitCost||""} onChange={e=>upd(i,"unitCost",e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{...S.input,paddingLeft:18}}/></div>
          <button onClick={()=>del(i)} style={{width:28,height:28,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      ))}
      <div style={{textAlign:"right",color:"#059669",fontSize:15,fontWeight:800,marginBottom:16}}>Total: ${total.toFixed(2)}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={save} disabled={!valid}>{isEdit?"Save Changes":"Create PO"}</PBtn>
      </div>
    </Modal>
  );
}

// ── RECIPES & MENU COSTING ────────────────────────────────────────────────────
function RecipesPage() {
  const { data:recipes, loading, error, save:saveDb } = useRecipes();
  const [modal, setModal] = useState(null);
  const save = async r => { await saveDb(r); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Recipes & Menu Costing" subtitle="Build recipes from your inventory and track profit margins." action={<PBtn onClick={()=>setModal({})}>+ New Recipe</PBtn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {recipes.map(r=>{
          const cost = r.ingredients.reduce((s,i)=>s+(i.qty*i.costPer),0);
          const margin = r.sellingPrice>0?((r.sellingPrice-cost)/r.sellingPrice*100):0;
          const profit = r.sellingPrice-cost;
          return (
            <div key={r.id} style={{...S.card,padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{color:"#111827",fontWeight:700,fontSize:15}}>{r.name}</div>
                  <span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{r.category}</span>
                </div>
                <button onClick={()=>setModal(r)} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {[["Sell Price",`$${r.sellingPrice.toFixed(2)}`,"#111827"],["Food Cost",`$${cost.toFixed(2)}`,"#ef4444"],["Profit",`$${profit.toFixed(2)}`,"#059669"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#f8fafc",borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{color:c,fontSize:14,fontWeight:800}}>{v}</div>
                    <div style={{color:"#9ca3af",fontSize:10}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:margin>=60?"#f0fdf4":margin>=40?"#fffbeb":"#fef2f2",border:`1px solid ${margin>=60?"#bbf7d0":margin>=40?"#fde68a":"#fecaca"}`,borderRadius:8,padding:"6px 12px",textAlign:"center",marginBottom:10}}>
                <span style={{color:margin>=60?"#059669":margin>=40?"#92400e":"#dc2626",fontWeight:700,fontSize:13}}>
                  {margin.toFixed(1)}% margin {margin>=60?"🟢":margin>=40?"🟡":"🔴"}
                </span>
              </div>
              <div style={{borderTop:"1px solid #e5e9f0",paddingTop:10}}>
                <div style={{color:"#6b7280",fontSize:11,marginBottom:6,fontWeight:600}}>INGREDIENTS</div>
                {r.ingredients.map((ing,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:"#374151"}}>{ing.productName}</span>
                    <span style={{color:"#9ca3af"}}>{ing.qty} {ing.unit} · ${(ing.qty*ing.costPer).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {modal!==null && <RecipeModal initial={modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function RecipeModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [f,setF] = useState(initial?.id ? initial : {name:"",category:"Sandwiches",sellingPrice:0,ingredients:[],notes:""});
  const set = k=>v=>setF(x=>({...x,[k]:k==="sellingPrice"?Number(v):v}));
  const addIng = () => setF(x=>({...x,ingredients:[...x.ingredients,{productId:0,productName:"",qty:1,unit:"unit",costPer:0}]}));
  const updIng = (i,k,v) => setF(x=>({...x,ingredients:x.ingredients.map((ing,idx)=>idx===i?{...ing,[k]:k==="qty"||k==="costPer"?Number(v):v}:ing)}));
  const delIng = i => setF(x=>({...x,ingredients:x.ingredients.filter((_,idx)=>idx!==i)}));
  const cost = f.ingredients.reduce((s,i)=>s+i.qty*i.costPer,0);
  const valid = f.name.trim() && f.sellingPrice>0;
  return (
    <Modal title={isEdit?"Edit Recipe":"New Recipe"} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <TxtInput label="Recipe Name *" value={f.name} onChange={set("name")} placeholder="e.g. Classic Bagel"/>
        <Sel label="Category" value={f.category} onChange={set("category")} options={["Sandwiches","Breakfast","Salads","Drinks","Desserts","Other"]}/>
        <TxtInput label="Selling Price ($) *" value={f.sellingPrice||""} onChange={set("sellingPrice")} type="number" placeholder="0.00"/>
      </div>
      <TxtInput label="Notes" value={f.notes} onChange={set("notes")} placeholder="Serving notes…"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{color:"#374151",fontWeight:700,fontSize:13}}>Ingredients</div>
        <button onClick={addIng} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>+ Add</button>
      </div>
      {f.ingredients.map((ing,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.6fr 0.6fr 1fr 28px",gap:8,marginBottom:7,alignItems:"center"}}>
          <input value={ing.productName} onChange={e=>updIng(i,"productName",e.target.value)} placeholder="Ingredient" style={S.input}/>
          <input value={ing.qty||""} onChange={e=>updIng(i,"qty",e.target.value)} type="number" min="0" step="0.01" placeholder="Qty" style={S.input}/>
          <input value={ing.unit} onChange={e=>updIng(i,"unit",e.target.value)} placeholder="unit" style={S.input}/>
          <div style={{position:"relative"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11}}>$</span><input value={ing.costPer||""} onChange={e=>updIng(i,"costPer",e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{...S.input,paddingLeft:18}}/></div>
          <button onClick={()=>delIng(i)} style={{width:28,height:28,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      ))}
      {f.sellingPrice>0 && (
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",gap:20}}>
          {[["Food Cost",`$${cost.toFixed(2)}`],["Profit",`$${(f.sellingPrice-cost).toFixed(2)}`],["Margin",`${f.sellingPrice>0?((f.sellingPrice-cost)/f.sellingPrice*100).toFixed(1):0}%`]].map(([l,v])=>(
            <div key={l}><div style={{color:"#059669",fontWeight:700,fontSize:14}}>{v}</div><div style={{color:"#6b7280",fontSize:11}}>{l}</div></div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{isEdit?"Save Changes":"Add Recipe"}</PBtn>
      </div>
    </Modal>
  );
}

// ── CASH REGISTER ─────────────────────────────────────────────────────────────
function CashPage() {
  const { data:sessions, loading, error, create:createSession, update:updateSession } = useCash();
  const [modal, setModal] = useState(null);
  const today = sessions.find(s=>s.status==="open");
  const closed = sessions.filter(s=>s.status==="closed");
  const close = async (id, data) => { await updateSession(id,{...data,status:"closed"}); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Cash Register" subtitle="Daily cash reconciliation and session management."/>
      {today ? (
        <div style={{background:"linear-gradient(135deg,#1e3a8a,#2563eb)",borderRadius:16,padding:"22px 24px",marginBottom:20,color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{opacity:0.7,fontSize:12,marginBottom:4}}>TODAY'S SESSION — OPEN</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>{today.date}</div>
              <div style={{opacity:0.8,fontSize:13}}>Opened by {today.openedBy} · Float: ${today.openingFloat.toFixed(2)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,textAlign:"center"}}>
              {[["💳 Card Sales",`$${Number(today.cardSales||0).toFixed(2)}`],["💵 Cash Sales",`$${Number(today.cashSales||0).toFixed(2)}`],["📊 Total Sales",`$${Number(today.totalSales||0).toFixed(2)}`],["🏧 Expected Float",`$${(Number(today.openingFloat||0)+Number(today.cashSales||0)).toFixed(2)}`]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:14,fontWeight:800}}>{v}</div>
                  <div style={{fontSize:10,opacity:0.8}}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setModal(today)} style={{padding:"10px 20px",background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Close Register</button>
          </div>
        </div>
      ) : (
        <div style={{...S.card,padding:"20px 24px",marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}>🏧</div>
          <div style={{color:"#111827",fontWeight:700,fontSize:16,marginBottom:6}}>No open session today</div>
          <PBtn onClick={()=>{ createSession({date:new Date().toISOString().split("T")[0],openedBy:"Admin",openingFloat:200,closingFloat:null,totalSales:0,totalExpenses:0,cardSales:0,cashSales:0,variance:null,status:"open",notes:""}); }}>Open Register</PBtn>
        </div>
      )}
      <div style={{color:"#374151",fontWeight:700,fontSize:14,marginBottom:12}}>Past Sessions</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {closed.slice().reverse().map(s=>(
          <div key={s.id} style={{...S.card,padding:"14px 18px",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{color:"#111827",fontWeight:700,fontSize:14}}>{s.date}</div>
              <div style={{color:"#6b7280",fontSize:12}}>{s.openedBy} · Float: ${s.openingFloat} → ${s.closingFloat}</div>
            </div>
            {[["Sales",`$${Number(s.totalSales||0).toFixed(2)}`,"#059669"],["Card",`$${Number(s.cardSales||0).toFixed(2)}`,"#3b82f6"],["Cash",`$${Number(s.cashSales||0).toFixed(2)}`,"#f59e0b"],["Variance",s.variance!=null?(s.variance>=0?"+$"+Number(s.variance||0).toFixed(2):"−$"+Math.abs(Number(s.variance||0)).toFixed(2)):"—",s.variance<0?"#ef4444":"#059669"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center",minWidth:70}}>
                <div style={{color:c,fontWeight:700,fontSize:14}}>{v}</div>
                <div style={{color:"#9ca3af",fontSize:11}}>{l}</div>
              </div>
            ))}
            {s.notes&&<div style={{color:"#6b7280",fontSize:12,fontStyle:"italic"}}>"{s.notes}"</div>}
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Close Register" onClose={()=>setModal(null)}>
          <CloseRegisterForm session={modal} onClose={d=>close(modal.id,d)} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
}
function CloseRegisterForm({ session, onClose, onCancel }) {
  const [float, setFloat] = useState("");
  const [notes, setNotes] = useState("");
  const expected = session.openingFloat + session.cashSales;
  const variance = float ? parseFloat(float) - expected : null;
  return (
    <div>
      <div style={{background:"#f8fafc",borderRadius:10,padding:"14px",marginBottom:16}}>
        {[["Total Sales",`$${Number(session.totalSales||0).toFixed(2)}`],["Card Sales",`$${Number(session.cardSales||0).toFixed(2)}`],["Cash Sales",`$${Number(session.cashSales||0).toFixed(2)}`],["Expected Float",`$${Number(expected||0).toFixed(2)}`]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
            <span style={{color:"#6b7280"}}>{l}</span><span style={{color:"#111827",fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
      <TxtInput label="Actual Closing Float ($) *" value={float} onChange={setFloat} type="number" placeholder="Enter counted cash"/>
      {variance!==null && (
        <div style={{background:variance>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${variance>=0?"#bbf7d0":"#fecaca"}`,borderRadius:8,padding:"8px 14px",marginBottom:12}}>
          <span style={{color:variance>=0?"#059669":"#dc2626",fontWeight:700}}>Variance: {variance>=0?"+":""}{variance.toFixed(2)}</span>
        </div>
      )}
      <TxtInput label="Notes" value={notes} onChange={setNotes} placeholder="Any notes for this session…"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>float&&onClose({closingFloat:parseFloat(float),variance,notes})} disabled={!float}>Close Register</PBtn>
      </div>
    </div>
  );
}

// ── WASTE & SPOILAGE ──────────────────────────────────────────────────────────
function WastePage() {
  const { data:waste, loading, error, save:saveDb } = useWaste();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("All");
  const reasons = ["All",...WASTE_REASONS];
  const filtered = filter==="All" ? waste : waste.filter(w=>w.reason===filter);
  const totalCost = waste.reduce((s,w)=>s+w.cost,0);
  const save = async w => { await saveDb(w); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Waste & Spoilage Log" subtitle="Track wasted or expired items and monitor losses." action={<PBtn onClick={()=>setModal({})}>+ Log Waste</PBtn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="🗑️" label="Total Entries" value={waste.length} color="#ef4444"/>
        <StatCard icon="💸" label="Total Loss" value={`$${totalCost.toFixed(2)}`} color="#f97316"/>
        <StatCard icon="📅" label="This Week" value={waste.filter(w=>w.date>="2026-03-07").length+" items"} color="#f59e0b"/>
        <StatCard icon="🏷️" label="Top Reason" value={WASTE_REASONS.reduce((m,r)=>{const n=waste.filter(w=>w.reason===r).length;return n>m.count?{r,count:n}:m},{r:"—",count:0}).r} color="#6366f1"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {reasons.map(r=><FBtn key={r} active={filter===r} onClick={()=>setFilter(r)}>{r}</FBtn>)}
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Date","Product","Qty","Reason","Cost","Reported By",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.sort((a,b)=>b.date.localeCompare(a.date)).map((w,i,arr)=>(
              <tr key={w.id} style={{borderBottom:i<arr.length-1?"1px solid #e5e9f0":"none"}}>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{w.date}</td>
                <td style={{...S.td,color:"#111827",fontWeight:600}}>{w.productName}</td>
                <td style={{...S.td,color:"#374151"}}>{w.qty} {w.unit}</td>
                <td style={S.td}><span style={{background:"#fef2f2",color:"#dc2626",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{w.reason}</span></td>
                <td style={{...S.td,color:"#ef4444",fontWeight:700}}>${w.cost.toFixed(2)}</td>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{w.reportedBy}</td>
                <td style={S.td}><button onClick={()=>setModal(w)} style={{padding:"3px 9px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,color:"#2563eb",fontSize:11,cursor:"pointer"}}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal!==null && <WasteModal initial={modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function WasteModal({ initial, onSave, onClose }) {
  const [f,setF] = useState(initial?.id?initial:{productName:"",qty:1,unit:"unit",reason:"Expired",cost:0,date:new Date().toISOString().split("T")[0],reportedBy:"Admin"});
  const set=k=>v=>setF(x=>({...x,[k]:k==="qty"||k==="cost"?Number(v):v}));
  return (
    <Modal title={f.id?"Edit Waste Entry":"Log Waste / Spoilage"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Product Name *" value={f.productName} onChange={set("productName")} placeholder="e.g. White Bread"/>
        <TxtInput label="Date *" value={f.date} onChange={set("date")} type="date"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <TxtInput label="Quantity" value={f.qty||""} onChange={set("qty")} type="number" placeholder="1"/>
        <TxtInput label="Unit" value={f.unit} onChange={set("unit")} placeholder="unit"/>
        <Sel label="Reason" value={f.reason} onChange={set("reason")} options={WASTE_REASONS}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Cost ($)" value={f.cost||""} onChange={set("cost")} type="number" placeholder="0.00"/>
        <TxtInput label="Reported By" value={f.reportedBy} onChange={set("reportedBy")} placeholder="Staff name"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>f.productName&&onSave(f)} disabled={!f.productName}>{f.id?"Save Changes":"Log Waste"}</PBtn>
      </div>
    </Modal>
  );
}

// ── PROFIT & LOSS ─────────────────────────────────────────────────────────────
function PnLPage() {
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar"];
  const revenue  = [38000,42000,61000,35000,39000,28000];
  const cogs     = [14440,15960,23180,13300,14820,10640];
  const opex     = [11400,12600,18300,10500,11700,8400];
  const profit   = revenue.map((r,i)=>r-cogs[i]-opex[i]);
  const thisMonth = { revenue:revenue[5], cogs:cogs[5], opex:opex[5], profit:profit[5] };
  const margin = (thisMonth.profit/thisMonth.revenue*100).toFixed(1);
  const pnlData = months.map((m,i)=>({month:m,Revenue:revenue[i],COGS:cogs[i],OpEx:opex[i],Profit:profit[i]}));
  return (
    <div>
      <PageHeader title="Profit & Loss" subtitle="Revenue, costs, and net profit overview."/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
        {[["💰","Revenue",`$${thisMonth.revenue.toLocaleString()}`,"#3b82f6"],["🛒","Cost of Goods",`$${thisMonth.cogs.toLocaleString()}`,"#ef4444"],["💳","Operating Costs",`$${thisMonth.opex.toLocaleString()}`,"#f59e0b"],["💹","Net Profit",`$${thisMonth.profit.toLocaleString()}`,"#059669"]].map(([icon,label,value,color])=>(
          <StatCard key={label} icon={icon} label={label+" (Mar)"} value={value} color={color}/>
        ))}
      </div>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{color:"#111827",fontWeight:700,fontSize:14}}>6-Month P&L Overview</div>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"4px 12px",color:"#059669",fontWeight:700,fontSize:13}}>Net Margin: {margin}%</div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pnlData} margin={{top:0,right:10,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:12}}/>
            <YAxis tick={{fill:"#9ca3af",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
            <Tooltip contentStyle={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:8}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
            <Bar dataKey="Revenue" fill="#3b82f6" radius={[3,3,0,0]}/>
            <Bar dataKey="COGS"    fill="#ef4444" radius={[3,3,0,0]}/>
            <Bar dataKey="Profit"  fill="#059669" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Month","Revenue","COGS","Op Costs","Net Profit","Margin"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {pnlData.slice().reverse().map((row,i)=>{
              const m=(row.Profit/row.Revenue*100).toFixed(1);
              return (
                <tr key={row.month} style={{borderBottom:i<pnlData.length-1?"1px solid #e5e9f0":"none"}}>
                  <td style={{...S.td,fontWeight:600,color:"#111827"}}>{row.month} 2026</td>
                  <td style={{...S.td,color:"#3b82f6",fontWeight:600}}>${row.Revenue.toLocaleString()}</td>
                  <td style={{...S.td,color:"#ef4444"}}>${row.COGS.toLocaleString()}</td>
                  <td style={{...S.td,color:"#f59e0b"}}>${row.OpEx.toLocaleString()}</td>
                  <td style={{...S.td,color:"#059669",fontWeight:700}}>${row.Profit.toLocaleString()}</td>
                  <td style={S.td}><span style={{background:Number(m)>=30?"#d1fae5":"#fef3c7",color:Number(m)>=30?"#065f46":"#92400e",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{m}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── BEST SELLERS ──────────────────────────────────────────────────────────────
function BestSellersPage() {
  const data = [
    {rank:1,name:"Classic Bagel Sandwich",category:"Sandwiches",sold:284,revenue:3688.16,trend:"▲"},
    {rank:2,name:"Cheese Bagel",           category:"Sandwiches",sold:198,revenue:1780.02,trend:"▲"},
    {rank:3,name:"Coffee (Large)",          category:"Drinks",    sold:312,revenue:1560.00,trend:"▲"},
    {rank:4,name:"Yogurt Parfait",          category:"Breakfast",  sold:145,revenue:1013.55,trend:"▼"},
    {rank:5,name:"Whole Milk 1L",           category:"Grocery",    sold:210,revenue:627.90, trend:"▲"},
    {rank:6,name:"Bottled Water",           category:"Drinks",    sold:310,revenue:399.90, trend:"—"},
    {rank:7,name:"Chips Assorted",          category:"Snacks",    sold:180,revenue:358.20, trend:"▼"},
    {rank:8,name:"Orange Juice 1L",         category:"Drinks",    sold:88, revenue:395.12, trend:"▲"},
  ];
  const chartData = data.slice(0,6).map(d=>({name:d.name.split(" ").slice(0,2).join(" "),Revenue:d.revenue,Units:d.sold}));
  return (
    <div>
      <PageHeader title="Best Sellers" subtitle="Top performing items by units sold and revenue this month."/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        <StatCard icon="🏆" label="Top Item" value="Classic Bagel" color="#f59e0b"/>
        <StatCard icon="📦" label="Units Sold" value={data.reduce((s,d)=>s+d.sold,0).toLocaleString()} color="#3b82f6"/>
        <StatCard icon="💰" label="Total Revenue" value={`$${data.reduce((s,d)=>s+d.revenue,0).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`} color="#059669"/>
        <StatCard icon="📊" label="Categories" value={new Set(data.map(d=>d.category)).size} color="#8b5cf6"/>
      </div>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div style={{color:"#111827",fontWeight:700,fontSize:14,marginBottom:14}}>Revenue by Top 6 Items</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis type="number" tick={{fill:"#9ca3af",fontSize:11}} tickFormatter={v=>`$${v}`}/>
            <YAxis type="category" dataKey="name" tick={{fill:"#374151",fontSize:11}} width={100}/>
            <Tooltip contentStyle={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:8}} formatter={v=>[`$${Number(v).toFixed(2)}`,""]}/>
            <Bar dataKey="Revenue" fill="#f59e0b" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Rank","Item","Category","Units Sold","Revenue","Trend"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.map((d,i)=>(
              <tr key={d.rank} style={{borderBottom:i<data.length-1?"1px solid #e5e9f0":"none"}}>
                <td style={{...S.td,fontWeight:800,color:d.rank<=3?"#f59e0b":"#9ca3af",fontSize:16}}>{d.rank<=3?["🥇","🥈","🥉"][d.rank-1]:d.rank}</td>
                <td style={{...S.td,fontWeight:600,color:"#111827"}}>{d.name}</td>
                <td style={S.td}><span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{d.category}</span></td>
                <td style={{...S.td,color:"#3b82f6",fontWeight:700}}>{d.sold}</td>
                <td style={{...S.td,color:"#059669",fontWeight:700}}>${d.revenue.toFixed(2)}</td>
                <td style={{...S.td,color:d.trend==="▲"?"#059669":d.trend==="▼"?"#ef4444":"#9ca3af",fontSize:16,fontWeight:700}}>{d.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── REORDER ALERTS ────────────────────────────────────────────────────────────
function ReorderPage() {
  const products = SEED_PRODUCTS;
  const low = products.filter(p=>p.stock<=p.minStock);
  const [orders, setOrders] = useState({});
  const setQty = (id,qty) => setOrders(o=>({...o,[id]:qty}));
  return (
    <div>
      <PageHeader title="Reorder Alerts" subtitle="Products below minimum stock level — create purchase orders quickly."/>
      {low.length===0 ? (
        <div style={{...S.card,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{color:"#059669",fontWeight:700,fontSize:16}}>All stock levels are healthy!</div>
          <div style={{color:"#9ca3af",fontSize:13,marginTop:4}}>No products are below their minimum stock level.</div>
        </div>
      ) : (
        <>
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 18px",marginBottom:18,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div><div style={{color:"#92400e",fontWeight:700,fontSize:13}}>{low.length} item{low.length!==1?"s":""} need reordering</div><div style={{color:"#78350f",fontSize:12}}>Set quantities below and create a purchase order, or order individually.</div></div>
          </div>
          <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Product","Category","In Stock","Min Level","Shortage","Suggested Order",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {low.map((p,i)=>{
                  const shortage = p.minStock-p.stock;
                  const suggested = Math.ceil(p.minStock*2-p.stock);
                  return (
                    <tr key={p.id} style={{borderBottom:i<low.length-1?"1px solid #e5e9f0":"none"}}>
                      <td style={{...S.td,fontWeight:600,color:"#111827"}}>{p.name}</td>
                      <td style={S.td}><span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{p.category}</span></td>
                      <td style={{...S.td,color:"#ef4444",fontWeight:700}}>{p.stock} {p.unit}</td>
                      <td style={{...S.td,color:"#6b7280"}}>{p.minStock}</td>
                      <td style={{...S.td,color:"#f97316",fontWeight:600}}>-{shortage}</td>
                      <td style={S.td}>
                        <input type="number" defaultValue={suggested} onChange={e=>setQty(p.id,Number(e.target.value))}
                          style={{...S.input,width:80,padding:"5px 8px",fontSize:12}}/>
                      </td>
                      <td style={S.td}><button style={{padding:"5px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:11,cursor:"pointer",fontWeight:600}}>Order Now</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── AI RECEIPT SCANNER (for expenses) ─────────────────────────────────────────
function ReceiptScanPage() {
  const [preview, setPreview] = useState(null);
  const [fileB64, setFileB64] = useState(null);
  const [fileType, setFileType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState([]);

  const handleFile = file => {
    if(!file) return;
    setError(""); setResult(null);
    setFileType(file.type);
    const r = new FileReader();
    r.onload = e => { setFileB64(e.target.result.split(",")[1]); setPreview(e.target.result); };
    r.readAsDataURL(file);
  };

  const scan = async () => {
    if(!fileB64) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(API_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:[
            {type:"image",source:{type:"base64",media_type:fileType,data:fileB64}},
            {type:"text",text:`Read this receipt/bill and extract:
VENDOR: <company name>
DATE: <YYYY-MM-DD>
CATEGORY: <one of: Utilities, Rent, Equipment, Maintenance, Software, Food/Supplies, Other>
TOTAL: <total amount as number, no $ sign>
DESCRIPTION: <brief description of what was purchased>
Reply with just those 5 lines, nothing else.`}
          ]}]
        })
      });
      const data = await res.json();
      const text = (data.content||[]).map(b=>b.text||"").join("").trim();
      const lines = {};
      text.split("\n").forEach(l => { const [k,...v]=l.split(":"); if(k&&v.length) lines[k.trim().toUpperCase()]=v.join(":").trim(); });
      setResult({
        vendor: lines["VENDOR"]||"",
        date: lines["DATE"]||new Date().toISOString().split("T")[0],
        category: lines["CATEGORY"]||"Other",
        amount: parseFloat(lines["TOTAL"])||0,
        description: lines["DESCRIPTION"]||""
      });
    } catch(e) { setError("Scan failed: "+e.message); }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:600}}>
      <PageHeader title="Receipt Scanner" subtitle="AI-powered receipt scanning — automatically log expenses."/>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div onClick={()=>document.getElementById("receipt-input").click()}
          style={{border:"2px dashed #c7d7f0",borderRadius:12,padding:"24px",textAlign:"center",cursor:"pointer",marginBottom:14,background:"#f8fafc"}}>
          <input id="receipt-input" type="file" accept="image/*" capture="environment" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
          {preview ? <img src={preview} alt="receipt" style={{maxHeight:160,maxWidth:"100%",borderRadius:8,objectFit:"contain"}}/> : (
            <><div style={{fontSize:36,marginBottom:8}}>🧾</div><div style={{color:"#374151",fontWeight:600}}>Upload or take photo of receipt</div><div style={{color:"#9ca3af",fontSize:12,marginTop:4}}>JPG, PNG — tap to open camera on mobile</div></>
          )}
        </div>
        {error && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",color:"#dc2626",fontSize:12,marginBottom:10}}>{error}</div>}
        <button onClick={scan} disabled={!fileB64||loading}
          style={{width:"100%",padding:"11px",background:(!fileB64||loading)?"#e5e9f0":"linear-gradient(135deg,#0c4a6e,#0ea5e9)",border:"none",borderRadius:9,color:(!fileB64||loading)?"#9ca3af":"#fff",fontSize:13,fontWeight:700,cursor:(!fileB64||loading)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {loading?<><Spinner/> Scanning…</>:"📷 Scan Receipt with AI"}
        </button>
      </div>
      {result && (
        <div style={{...S.card,padding:20}}>
          <div style={{color:"#059669",fontWeight:700,fontSize:14,marginBottom:14}}>✅ Receipt scanned — review and save</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <TxtInput label="Vendor" value={result.vendor} onChange={v=>setResult(r=>({...r,vendor:v}))} placeholder="Vendor name"/>
            <TxtInput label="Date" value={result.date} onChange={v=>setResult(r=>({...r,date:v}))} type="date"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <Sel label="Category" value={result.category} onChange={v=>setResult(r=>({...r,category:v}))} options={["Utilities","Rent","Equipment","Maintenance","Software","Food/Supplies","Other"]}/>
            <TxtInput label="Amount ($)" value={result.amount||""} onChange={v=>setResult(r=>({...r,amount:Number(v)}))} type="number" placeholder="0.00"/>
          </div>
          <TxtInput label="Description" value={result.description} onChange={v=>setResult(r=>({...r,description:v}))} placeholder="What was purchased"/>
          <PBtn onClick={()=>{ setSaved(s=>[...s,{...result,id:Date.now()}]); setResult(null); setPreview(null); setFileB64(null); }}>Save as Expense ✓</PBtn>
        </div>
      )}
      {saved.length>0 && (
        <div style={{marginTop:16}}>
          <div style={{color:"#374151",fontWeight:700,marginBottom:8}}>Saved This Session ({saved.length})</div>
          {saved.map(s=>(
            <div key={s.id} style={{...S.card,padding:"12px 16px",marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{flex:1}}><div style={{color:"#111827",fontWeight:600,fontSize:13}}>{s.description||s.vendor}</div><div style={{color:"#9ca3af",fontSize:11}}>{s.vendor} · {s.date} · {s.category}</div></div>
              <div style={{color:"#ef4444",fontWeight:700,fontSize:14}}>${s.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI FORECASTING ────────────────────────────────────────────────────────────
function ForecastPage() {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState("");
  const products = SEED_PRODUCTS;
  const salesHistory = SALES_DATA;

  const generate = async () => {
    setLoading(true); setError(""); setForecast(null);
    try {
      const res = await fetch(API_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1500,
          messages:[{ role:"user", content:`You are an inventory forecasting AI for a deli/cafe called Deli On A Bagel Cafe.

Current inventory: ${JSON.stringify(products.map(p=>({name:p.name,stock:p.stock,minStock:p.minStock,unit:p.unit})))}

Weekly sales data (last 7 days): ${JSON.stringify(salesHistory)}

Based on this data, provide a 7-day forecast in this exact JSON format (no markdown):
{"summary":"2-sentence overview","items":[{"name":"product name","currentStock":0,"predictedDemand":0,"unit":"unit","daysUntilStockout":0,"orderSuggestion":0,"priority":"high|medium|low"}],"topInsight":"one key insight"}

Include only the top 5 most important items to watch. Numbers should be realistic for a small deli.`}
        ]})
      });
      const data = await res.json();
      const raw = (data.content||[]).map(b=>b.text||"").join("").trim();
      let parsed = null;
      for(const fn of [()=>JSON.parse(raw),()=>{const m=raw.match(/{[\s\S]*}/);if(m)return JSON.parse(m[0]);throw 0;}]){ try{parsed=fn();break;}catch(_){} }
      if(parsed) setForecast(parsed);
      else throw new Error("Could not parse forecast");
    } catch(e) { setError("Forecast failed: "+e.message); }
    setLoading(false);
  };

  const PRIORITY_COLORS = { high:{bg:"#fef2f2",text:"#dc2626",border:"#fecaca"}, medium:{bg:"#fffbeb",text:"#92400e",border:"#fde68a"}, low:{bg:"#f0fdf4",text:"#059669",border:"#bbf7d0"} };
  return (
    <div style={{maxWidth:800}}>
      <PageHeader title="AI Inventory Forecasting" subtitle="Predict what you need to order based on sales trends."/>
      <div style={{...S.card,padding:20,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:10}}>🔮</div>
        <div style={{color:"#111827",fontWeight:700,fontSize:16,marginBottom:6}}>Generate 7-Day Forecast</div>
        <div style={{color:"#6b7280",fontSize:13,marginBottom:18}}>Claude AI will analyze your current stock levels and sales patterns to predict what you need to order.</div>
        <PBtn onClick={generate} disabled={loading}>{loading?<><Spinner/>&nbsp;Analyzing…</>:"🤖 Generate Forecast"}</PBtn>
        {error && <div style={{marginTop:14,color:"#dc2626",fontSize:12}}>{error}</div>}
      </div>
      {forecast && (
        <div>
          <div style={{...S.card,padding:18,marginBottom:14,background:"linear-gradient(135deg,#eff6ff,#f0fdf4)"}}>
            <div style={{color:"#1e40af",fontWeight:700,fontSize:14,marginBottom:6}}>📊 Summary</div>
            <div style={{color:"#374151",fontSize:13,lineHeight:1.6}}>{forecast.summary}</div>
            <div style={{marginTop:10,background:"#fff",borderRadius:8,padding:"10px 14px",border:"1px solid #e5e9f0"}}>
              <span style={{color:"#059669",fontWeight:700}}>💡 Key Insight: </span>
              <span style={{color:"#374151",fontSize:13}}>{forecast.topInsight}</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {forecast.items?.map((item,i)=>{
              const pc = PRIORITY_COLORS[item.priority]||PRIORITY_COLORS.low;
              return (
                <div key={i} style={{...S.card,padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:180}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{color:"#111827",fontWeight:700,fontSize:14}}>{item.name}</span>
                        <span style={{background:pc.bg,color:pc.text,border:`1px solid ${pc.border}`,borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>{item.priority.toUpperCase()}</span>
                      </div>
                      <div style={{color:"#6b7280",fontSize:12}}>Current: {item.currentStock} {item.unit} · Demand: ~{item.predictedDemand} {item.unit}/week</div>
                    </div>
                    <div style={{textAlign:"center",padding:"8px 16px",background:"#fff7ed",borderRadius:10,border:"1px solid #fed7aa"}}>
                      <div style={{color:"#f97316",fontWeight:800,fontSize:16}}>{item.daysUntilStockout}d</div>
                      <div style={{color:"#9ca3af",fontSize:10}}>days left</div>
                    </div>
                    <div style={{textAlign:"center",padding:"8px 16px",background:"#f0fdf4",borderRadius:10,border:"1px solid #bbf7d0"}}>
                      <div style={{color:"#059669",fontWeight:800,fontSize:16}}>{item.orderSuggestion}</div>
                      <div style={{color:"#9ca3af",fontSize:10}}>suggest order</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SMART PRICING ─────────────────────────────────────────────────────────────
function SmartPricingPage() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [targetMargin, setTargetMargin] = useState("65");
  const [error, setError] = useState("");
  const recipes = SEED_RECIPES;

  const generate = async () => {
    setLoading(true); setError(""); setSuggestions(null);
    try {
      const res = await fetch(API_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:`You are a pricing consultant for Deli On A Bagel Cafe, a deli/bagel cafe.

Menu items with current pricing:
${JSON.stringify(recipes.map(r=>({name:r.name,category:r.category,currentPrice:r.sellingPrice,foodCost:r.ingredients.reduce((s,i)=>s+i.qty*i.costPer,0).toFixed(2)})))}

Target gross margin: ${targetMargin}%

Provide pricing suggestions in this exact JSON format (no markdown):
{"items":[{"name":"item name","currentPrice":0,"suggestedPrice":0,"foodCost":0,"projectedMargin":0,"reasoning":"one sentence"}]}

Be realistic for a NYC-area deli/cafe. Keep suggestions within 10-20% of current prices.`}
        ]})
      });
      const data = await res.json();
      const raw = (data.content||[]).map(b=>b.text||"").join("").trim();
      let parsed = null;
      for(const fn of [()=>JSON.parse(raw),()=>{const m=raw.match(/{[\s\S]*}/);if(m)return JSON.parse(m[0]);throw 0;}]){ try{parsed=fn();break;}catch(_){} }
      if(parsed) setSuggestions(parsed.items||[]);
      else throw new Error("Could not parse suggestions");
    } catch(e) { setError("Failed: "+e.message); }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:800}}>
      <PageHeader title="Smart Pricing Suggestions" subtitle="AI-powered pricing based on food cost and target margin."/>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{color:"#6b7280",fontSize:11,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>Target Gross Margin</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="40" max="80" value={targetMargin} onChange={e=>setTargetMargin(e.target.value)} style={{width:150,accentColor:"#3b82f6"}}/>
              <span style={{color:"#3b82f6",fontWeight:800,fontSize:18,minWidth:50}}>{targetMargin}%</span>
            </div>
          </div>
          <PBtn onClick={generate} disabled={loading}>{loading?<><Spinner/>&nbsp;Analyzing…</>:"🤖 Get Price Suggestions"}</PBtn>
        </div>
        {error && <div style={{marginTop:10,color:"#dc2626",fontSize:12}}>{error}</div>}
      </div>
      {suggestions && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {suggestions.map((s,i)=>{
            const diff = s.suggestedPrice - s.currentPrice;
            const pct = (diff/s.currentPrice*100).toFixed(1);
            return (
              <div key={i} style={{...S.card,padding:"16px 18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{color:"#111827",fontWeight:700,fontSize:14,marginBottom:3}}>{s.name}</div>
                    <div style={{color:"#6b7280",fontSize:12}}>Food cost: ${Number(s.foodCost).toFixed(2)} · {s.reasoning}</div>
                  </div>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#9ca3af",fontSize:11}}>Current</div>
                      <div style={{color:"#374151",fontWeight:700,fontSize:15}}>${Number(s.currentPrice).toFixed(2)}</div>
                    </div>
                    <div style={{color:"#6b7280",fontSize:18}}>→</div>
                    <div style={{textAlign:"center",padding:"8px 14px",background:diff>=0?"#f0fdf4":"#fef2f2",borderRadius:10,border:`1px solid ${diff>=0?"#bbf7d0":"#fecaca"}`}}>
                      <div style={{color:diff>=0?"#059669":"#dc2626",fontSize:10,fontWeight:600}}>{diff>=0?`+${pct}%`:`${pct}%`}</div>
                      <div style={{color:diff>=0?"#059669":"#dc2626",fontWeight:800,fontSize:16}}>${Number(s.suggestedPrice).toFixed(2)}</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#9ca3af",fontSize:11}}>Margin</div>
                      <div style={{color:"#059669",fontWeight:700,fontSize:15}}>{Number(s.projectedMargin).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── STAFF SCHEDULING ──────────────────────────────────────────────────────────
function SchedulePage() {
  const { data:schedules, loading, error, upsert } = useSchedules();
  const days = ["mon","tue","wed","thu","fri","sat","sun"];
  const dayLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const updateShift = (staffId, day, val) => { const s = schedules.find(x=>x.staff_id===staffId||x.staffId===staffId); if(s) upsert({...s,[day]:val}); };
  const totalHours = sched => days.reduce((total,day)=>{
    const shift = sched[day];
    if(!shift || shift==="OFF" || typeof shift !== "string" || !shift.includes("-")) return total;
    const parts = shift.split("-");
    if(parts.length < 2) return total;
    const [start,end] = parts;
    if(!start||!end||!start.includes(":")||!end.includes(":")) return total;
    const [sh,sm]=start.split(":").map(Number);
    const [eh,em]=end.split(":").map(Number);
    if(isNaN(sh)||isNaN(sm)||isNaN(eh)||isNaN(em)) return total;
    return total+((eh*60+em)-(sh*60+sm))/60;
  },0);
  return (
    <div>
      <PageHeader title="Staff Scheduling" subtitle="Weekly shift planner — click any cell to edit."/>
      <div style={{...S.card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead>
            <tr style={{borderBottom:"2px solid #e5e9f0"}}>
              <th style={{...S.th,minWidth:140}}>Staff</th>
              {dayLabels.map(d=><th key={d} style={{...S.th,textAlign:"center"}}>{d}</th>)}
              <th style={{...S.th,textAlign:"center"}}>Hours</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s,i)=>(
              <tr key={s.staffId} style={{borderBottom:i<schedules.length-1?"1px solid #e5e9f0":"none"}}>
                <td style={S.td}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Avatar initials={s.staffName.split(" ").map(w=>w[0]).join("")} size={28}/>
                    <div><div style={{color:"#111827",fontWeight:600,fontSize:12}}>{s.staffName}</div><div style={{color:"#9ca3af",fontSize:10}}>{s.role}</div></div>
                  </div>
                </td>
                {days.map(day=>(
                  <td key={day} style={{...S.td,padding:"8px 4px",textAlign:"center"}}>
                    <input value={s[day]} onChange={e=>updateShift(s.staffId,day,e.target.value)}
                      style={{width:"100%",background:s[day]==="OFF"?"#f8fafc":"#f0fdf4",border:`1px solid ${s[day]==="OFF"?"#e5e9f0":"#bbf7d0"}`,borderRadius:6,padding:"4px 4px",fontSize:10,textAlign:"center",color:s[day]==="OFF"?"#9ca3af":"#059669",fontWeight:600,outline:"none",minWidth:64}}/>
                  </td>
                ))}
                <td style={{...S.td,textAlign:"center",fontWeight:700,color:"#3b82f6"}}>{totalHours(s).toFixed(1)}h</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:"2px solid #e5e9f0",background:"#f8fafc"}}>
              <td style={{...S.td,fontWeight:700,color:"#374151"}}>Total Hours</td>
              {days.map(day=>{
                const count = schedules.filter(s=>s[day]&&s[day]!=="OFF").length;
                return <td key={day} style={{...S.td,textAlign:"center",color:"#6b7280",fontSize:12}}>{count} staff</td>;
              })}
              <td style={{...S.td,textAlign:"center",fontWeight:800,color:"#111827"}}>
                {schedules.reduce((t,s)=>t+totalHours(s),0).toFixed(1)}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── PAYROLL ───────────────────────────────────────────────────────────────────
function PayrollPage() {
  const [staff, setStaff] = useState(SEED_PAYROLL); // payroll rates stay local
  const upd = (id,k,v) => setStaff(ss=>ss.map(s=>s.staffId===id?{...s,[k]:Number(v)}:s));
  const calc = s => {
    const regular = Math.min(s.hoursThisWeek,40)*s.hourlyRate;
    const overtime = s.overtimeHours*s.hourlyRate*1.5;
    return { regular, overtime, gross: regular+overtime, tax: (regular+overtime)*0.22, net: (regular+overtime)*0.78 };
  };
  const totals = staff.reduce((t,s)=>{const c=calc(s);return{gross:t.gross+c.gross,tax:t.tax+c.tax,net:t.net+c.net};},{gross:0,tax:0,net:0});
  return (
    <div>
      <PageHeader title="Payroll Calculator" subtitle="Weekly payroll based on hours worked and hourly rates."/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="💰" label="Gross Payroll" value={`$${totals.gross.toFixed(2)}`} color="#3b82f6"/>
        <StatCard icon="🏛️" label="Est. Tax (22%)" value={`$${totals.tax.toFixed(2)}`} color="#ef4444"/>
        <StatCard icon="✅" label="Net Payroll" value={`$${totals.net.toFixed(2)}`} color="#059669"/>
        <StatCard icon="👷" label="Staff Count" value={staff.length} color="#8b5cf6"/>
      </div>
      <div style={{...S.card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr style={{borderBottom:"2px solid #e5e9f0"}}>{["Staff","Role","Rate/hr","Reg Hours","OT Hours","Gross","Tax (22%)","Net Pay"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {staff.map((s,i)=>{
              const c = calc(s);
              return (
                <tr key={s.staffId} style={{borderBottom:i<staff.length-1?"1px solid #e5e9f0":"none"}}>
                  <td style={S.td}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Avatar initials={s.staffName.split(" ").map(w=>w[0]).join("")} size={28}/>
                      <span style={{color:"#111827",fontWeight:600,fontSize:13}}>{s.staffName}</span>
                    </div>
                  </td>
                  <td style={S.td}><span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{s.role}</span></td>
                  <td style={S.td}><input value={s.hourlyRate} onChange={e=>upd(s.staffId,"hourlyRate",e.target.value)} type="number" min="0" step="0.5" style={{...S.input,width:70,padding:"4px 8px",fontSize:12}}/></td>
                  <td style={S.td}><input value={s.hoursThisWeek} onChange={e=>upd(s.staffId,"hoursThisWeek",e.target.value)} type="number" min="0" style={{...S.input,width:60,padding:"4px 8px",fontSize:12}}/></td>
                  <td style={S.td}><input value={s.overtimeHours} onChange={e=>upd(s.staffId,"overtimeHours",e.target.value)} type="number" min="0" style={{...S.input,width:60,padding:"4px 8px",fontSize:12}}/></td>
                  <td style={{...S.td,color:"#3b82f6",fontWeight:700}}>${c.gross.toFixed(2)}</td>
                  <td style={{...S.td,color:"#ef4444"}}>${c.tax.toFixed(2)}</td>
                  <td style={{...S.td,color:"#059669",fontWeight:800,fontSize:14}}>${c.net.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{borderTop:"2px solid #e5e9f0",background:"#f8fafc"}}>
              <td colSpan={5} style={{...S.td,fontWeight:700,color:"#374151",textAlign:"right"}}>TOTALS</td>
              <td style={{...S.td,color:"#3b82f6",fontWeight:800}}>${totals.gross.toFixed(2)}</td>
              <td style={{...S.td,color:"#ef4444",fontWeight:700}}>${totals.tax.toFixed(2)}</td>
              <td style={{...S.td,color:"#059669",fontWeight:800,fontSize:15}}>${totals.net.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── DAILY CHECKLIST ───────────────────────────────────────────────────────────
function ChecklistPage() {
  const [type, setType] = useState("opening");
  const [checked, setChecked] = useState({});
  const [date] = useState(new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}));
  const tasks = SEED_CHECKLIST[type];
  const toggle = id => setChecked(c=>({...c,[type+id]:!c[type+id]}));
  const done = tasks.filter(t=>checked[type+t.id]).length;
  const pct = Math.round(done/tasks.length*100);
  const CATEGORIES = [...new Set(tasks.map(t=>t.category))];
  const CAT_COLORS = {Security:"#ef4444",Equipment:"#3b82f6","Food Safety":"#f59e0b",Prep:"#10b981",Cash:"#059669",Cleaning:"#8b5cf6",Admin:"#6366f1",Maintenance:"#f97316"};
  return (
    <div style={{maxWidth:640}}>
      <PageHeader title="Daily Checklist" subtitle={date}/>
      <div style={{display:"flex",gap:6,marginBottom:18,background:"#f8fafc",borderRadius:10,padding:4,width:"fit-content"}}>
        {["opening","closing"].map(t=>(
          <button key={t} onClick={()=>{setType(t);}} style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",background:type===t?"#1e3a8a":"transparent",color:type===t?"#fff":"#6b7280",fontWeight:700,fontSize:13}}>
            {t==="opening"?"🌅 Opening":"🌙 Closing"}
          </button>
        ))}
      </div>
      <div style={{...S.card,padding:"18px 20px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{color:"#111827",fontWeight:700}}>{done}/{tasks.length} tasks completed</div>
          <div style={{color:pct===100?"#059669":pct>50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:16}}>{pct}%</div>
        </div>
        <div style={{background:"#e5e9f0",borderRadius:20,height:8,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct===100?"#059669":pct>50?"#f59e0b":"#ef4444",borderRadius:20,transition:"width 0.4s"}}/>
        </div>
        {pct===100 && <div style={{marginTop:10,color:"#059669",fontWeight:700,textAlign:"center",fontSize:14}}>✅ All done! Great job!</div>}
      </div>
      {CATEGORIES.map(cat=>(
        <div key={cat} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:CAT_COLORS[cat]||"#6b7280"}}/>
            <div style={{color:"#374151",fontSize:11,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>{cat}</div>
          </div>
          {tasks.filter(t=>t.category===cat).map(task=>{
            const done = checked[type+task.id];
            return (
              <div key={task.id} onClick={()=>toggle(task.id)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:done?"#f0fdf4":"#ffffff",border:`1px solid ${done?"#bbf7d0":"#e5e9f0"}`,borderRadius:10,marginBottom:6,cursor:"pointer",transition:"all 0.15s"}}>
                <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${done?"#059669":"#d1d5db"}`,background:done?"#059669":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                  {done && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                </div>
                <span style={{color:done?"#059669":"#374151",fontWeight:done?600:400,fontSize:13,textDecoration:done?"line-through":"none"}}>{task.task}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── CUSTOMER LOYALTY QR ───────────────────────────────────────────────────────
// Note: renders in CustomersPage — customers get a QR code on their profile card

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SHELL
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard() {
  const {user}=useAuth();
  const [tab,setTab]=useState("home");
  const [sidebarOpen,setSidebarOpen]=useState(false);

  const render=()=>{
    if(tab==="home")        return <HomePage setActive={setTab} user={user}/>;
    if(tab==="pos")         return <POSPage/>;
    if(tab==="inventory")   return <InventoryPage/>;
    if(tab==="reports")     return <ReportsPage/>;
    if(tab==="pnl")         return <PnLPage/>;
    if(tab==="bestsellers") return <BestSellersPage/>;
    if(tab==="vendors")     return <VendorsPage/>;
    if(tab==="purchase")    return <PurchasePage/>;
    if(tab==="reorder")     return <ReorderPage/>;
    if(tab==="recipes")     return <RecipesPage/>;
    if(tab==="pricing")     return <SmartPricingPage/>;
    if(tab==="customers")   return <CustomersPage/>;
    if(tab==="expenses")    return <ExpensesPage/>;
    if(tab==="receiptscan") return <ReceiptScanPage/>;
    if(tab==="cash")        return <CashPage/>;
    if(tab==="waste")       return <WastePage/>;
    if(tab==="forecast")    return <ForecastPage/>;
    if(tab==="schedule")    return <SchedulePage/>;
    if(tab==="payroll")     return <PayrollPage/>;
    if(tab==="checklist")   return <ChecklistPage/>;
    if(tab==="attendance")  return <AttendancePage/>;
    if(tab==="users")       return <UsersPage/>;
    if(tab==="alerts")      return <AlertsPage/>;
    if(tab==="activity")    return <ActivityPage/>;
    return null;
  };

  // Mobile bottom nav — most-used 5 tabs
  const BOTTOM_NAV = [
    { key:"home",      icon:"🏠", label:"Home"     },
    { key:"pos",       icon:"🛒", label:"POS"      },
    { key:"inventory", icon:"📦", label:"Stock"    },
    { key:"vendors",   icon:"🏭", label:"Vendors"  },
    { key:"alerts",    icon:"🔔", label:"Alerts"   },
  ];

  return (
    <div style={{display:"flex",minHeight:"100vh",minHeight:"-webkit-fill-available"}}>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div style={{display:"none"}} className="desktop-sidebar">
        <Sidebar active={tab} setActive={t=>{setTab(t);setSidebarOpen(false);}}/>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {sidebarOpen && (
        <div
          onClick={()=>setSidebarOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:40,display:"none"}}
          className="mobile-overlay"
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className="mobile-drawer"
        style={{
          position:"fixed",top:0,left:0,bottom:0,zIndex:50,
          transform:sidebarOpen?"translateX(0)":"translateX(-100%)",
          transition:"transform 0.25s ease",
          display:"none",
        }}
      >
        <Sidebar active={tab} setActive={t=>{setTab(t);setSidebarOpen(false);}}/>
      </div>

      {/* ── Main content ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{display:"none",alignItems:"center",gap:12,padding:"12px 16px",background:"#1e3a8a",borderBottom:"1px solid rgba(255,255,255,0.1)",position:"sticky",top:0,zIndex:30}}>
          <button
            onClick={()=>setSidebarOpen(s=>!s)}
            style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer",lineHeight:1,padding:"2px 4px"}}
          >☰</button>
          <div style={{flex:1,color:"#fff",fontWeight:800,fontSize:15}}>Deli On A Bagel Cafe</div>
          <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700}}>
            {user?.avatar}
          </div>
        </div>

        {/* Page content */}
        <main style={{flex:1,padding:24,overflow:"auto",background:"#f1f5f9",paddingBottom:80}} className="main-content">
          {render()}
        </main>

        {/* Mobile bottom nav */}
        <nav className="mobile-bottom-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:"#ffffff",borderTop:"1px solid #e5e9f0",zIndex:30,paddingBottom:"env(safe-area-inset-bottom)"}}>
          <div style={{display:"flex",justifyContent:"space-around",padding:"8px 0 4px"}}>
            {BOTTOM_NAV.map(item=>{
              const on=tab===item.key;
              return (
                <button key={item.key} onClick={()=>setTab(item.key)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:8,minWidth:56}}>
                  <span style={{fontSize:20,lineHeight:1}}>{item.icon}</span>
                  <span style={{fontSize:10,fontWeight:on?700:400,color:on?"#1e3a8a":"#9ca3af"}}>{item.label}</span>
                  {on&&<div style={{width:4,height:4,borderRadius:"50%",background:"#1e3a8a"}}/>}
                </button>
              );
            })}
            {/* "More" button opens drawer */}
            <button onClick={()=>setSidebarOpen(true)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:8,minWidth:56}}>
              <span style={{fontSize:20,lineHeight:1}}>⋯</span>
              <span style={{fontSize:10,color:"#9ca3af"}}>More</span>
            </button>
          </div>
        </nav>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-topbar    { display: none !important; }
          .mobile-bottom-nav{ display: none !important; }
          .mobile-drawer    { display: none !important; }
          .mobile-overlay   { display: none !important; }
          .main-content     { padding-bottom: 24px !important; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar  { display: none !important; }
          .mobile-topbar    { display: flex !important; }
          .mobile-bottom-nav{ display: flex !important; flex-direction: column; }
          .mobile-drawer    { display: block !important; }
          .mobile-overlay   { display: block !important; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(()=>getSession());
  const login = (u) => { saveSession(u); setUser(u); };
  const logout = () => { clearSession(); setUser(null); };
  return (
    <AuthCtx.Provider value={{user,login,logout}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin:0; padding:0; -webkit-text-size-adjust:100%; overflow-x:hidden; }
        body { font-family: system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f4f6f9; }
        input, select, textarea, button { font-family: inherit; }
        /* Prevent iOS zoom on inputs */
        input, select, textarea { font-size: 16px !important; }

        /* ── Modal always perfectly centered ── */
        .modal-overlay {
          position:fixed; inset:0;
          background:rgba(15,23,42,0.55);
          display:flex; align-items:center; justify-content:center;
          z-index:1000; padding:16px;
        }

        /* ── Sidebar / nav ── */
        @media (min-width:769px) {
          .desktop-sidebar   { display:flex !important; }
          .mob-bar           { display:none !important; }
          .mobile-bottom-nav { display:none !important; }
          .mobile-drawer     { display:none !important; }
          .mobile-overlay    { display:none !important; }
          .main-content      { padding-bottom:24px !important; }
        }
        @media (max-width:768px) {
          .desktop-sidebar   { display:none !important; }
          .mob-bar           { display:flex !important; }
          .mobile-bottom-nav { display:flex !important; flex-direction:column; }
          .mobile-drawer     { display:block !important; }
          .mobile-overlay    { display:block !important; }
          .main-content      { padding:14px !important; padding-bottom:90px !important; }
        }

        /* ── Responsive grids ── */
        .stat-grid-4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:20px; }
        .stat-grid-3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:20px; }
        .stat-grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-bottom:20px; }

        /* ── Tables scroll on mobile ── */
        .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; }
        .table-wrap table { min-width:520px; }

        /* ── Page header stacks on mobile ── */
        @media (max-width:600px) {
          .page-hdr { flex-direction:column !important; align-items:flex-start !important; gap:10px !important; }
          .page-hdr h1 { font-size:18px !important; }
          .modal-box { border-radius:14px !important; }
          .filter-row { flex-wrap:wrap !important; }
          .hide-mobile { display:none !important; }
        }

        /* ── POS layout stacks on mobile ── */
        @media (max-width:700px) {
          .pos-layout { grid-template-columns:1fr !important; }
          .pos-cart { position:fixed !important; bottom:70px !important; left:0 !important; right:0 !important; max-height:45vh !important; border-radius:18px 18px 0 0 !important; z-index:20 !important; }
        }

        /* ── Scrollbar styling ── */
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#f1f5f9; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
      `}</style>
      {user?<Dashboard/>:<Login/>}
    </AuthCtx.Provider>
  );
}
