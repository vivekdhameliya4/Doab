// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
export const SEED_VENDORS = [];
export const SEED_INVOICES = [];
export const SEED_PRODUCTS = [];
export const SEED_CUSTOMERS = [];
export const SEED_EXPENSES = [];
export const SEED_STAFF = [];
export const SEED_SHIFTS = [];
export const SALES_DATA = [
  { day:"Mon", sales:3200, orders:42 }, { day:"Tue", sales:2800, orders:36 },
  { day:"Wed", sales:4100, orders:54 }, { day:"Thu", sales:3600, orders:47 },
  { day:"Fri", sales:4800, orders:62 }, { day:"Sat", sales:5200, orders:71 },
  { day:"Sun", sales:2400, orders:31 },
];
export const MONTHLY_DATA = [
  { month:"Oct", sales:38000 }, { month:"Nov", sales:42000 }, { month:"Dec", sales:61000 },
  { month:"Jan", sales:35000 }, { month:"Feb", sales:39000 }, { month:"Mar", sales:28000 },
];
export const CATEGORY_SALES = [
  { category:"Dairy",     sales:12400 }, { category:"Bakery", sales:8200 },
  { category:"Beverages", sales:6800 },  { category:"Snacks", sales:5100 },
  { category:"Other",     sales:3200 },
];
export const ROLE_COLORS = { Admin:{bg:"#fff0e6",text:"#c45c00",dot:"#e87c2b"}, Manager:{bg:"#e8f0ff",text:"#2952c4",dot:"#4a7cf7"}, Cashier:{bg:"#e8f7ee",text:"#1a7a42",dot:"#2ecc71"} };
export const EXPENSE_CATS = ["Utilities","Rent","Equipment","Maintenance","Software","Marketing","Other"];
export const FEATURES = [
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
export const NAV_GROUPS = [
  { label:"MAIN",       items:[{key:"home",label:"Home",icon:"🏠"}] },
  { label:"OPERATIONS", items:[{key:"pos",label:"Point of Sale",icon:"🛒"},{key:"inventory",label:"Inventory",icon:"📦"},{key:"purchase",label:"Purchase Orders",icon:"📋"},{key:"vendors",label:"Vendors & Invoices",icon:"🏭"},{key:"customers",label:"Customers",icon:"🧑‍🤝‍🧑"}] },
  { label:"MENU",       items:[{key:"recipes",label:"Recipes & Costing",icon:"🧾"},{key:"waste",label:"Waste & Spoilage",icon:"🗑️"},{key:"reorder",label:"Reorder Alerts",icon:"🔄"}] },
  { label:"FINANCE",    items:[{key:"reports",label:"Sales Reports",icon:"📊"},{key:"pnl",label:"Profit & Loss",icon:"💹"},{key:"bestsellers",label:"Best Sellers",icon:"🏆"},{key:"cash",label:"Cash Register",icon:"🏧"},{key:"expenses",label:"Expenses",icon:"💳"},{key:"receiptscan",label:"Receipt Scanner",icon:"📷"}] },
  { label:"AI",         items:[{key:"forecast",label:"AI Forecasting",icon:"🔮"},{key:"pricing",label:"Smart Pricing",icon:"🤖"}] },
  { label:"TEAM",       items:[{key:"schedule",label:"Staff Schedule",icon:"📅"},{key:"attendance",label:"Attendance",icon:"🗓️"},{key:"payroll",label:"Payroll",icon:"💰"},{key:"checklist",label:"Daily Checklist",icon:"✅"},{key:"users",label:"User Management",icon:"👥"}] },
  { label:"SYSTEM",     items:[{key:"alerts",label:"Notifications",icon:"🔔"},{key:"activity",label:"Activity Log",icon:"📋"}] },
];

// ── New feature seed data ─────────────────────────────────────────────────────
export const SEED_PURCHASE_ORDERS = [];
export const SEED_RECIPES = [];
export const SEED_CASH_SESSIONS = [];
export const SEED_WASTE = [];
export const SEED_SCHEDULES = [];
export const SEED_PAYROLL = [];
export const SEED_CHECKLIST = {
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
export const WASTE_REASONS = ["Expired","Damaged","Over-prep","Dropped","Wrong order","Other"];
export const PO_STATUS_COLORS = { pending:{bg:"#fef3c7",text:"#92400e"}, ordered:{bg:"#dbeafe",text:"#1e40af"}, received:{bg:"#d1fae5",text:"#065f46"}, cancelled:{bg:"#fee2e2",text:"#991b1b"} };
