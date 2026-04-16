import { useState } from "react";
import { useAuth } from "./features/auth/AuthContext";
import { Sidebar } from "./features/layout/Sidebar";
import { HomePage } from "./features/layout/HomePage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { CustomersPage } from "./features/customers/CustomersPage";
import { ExpensesPage } from "./features/expenses/ExpensesPage";
import { AttendancePage } from "./features/attendance/AttendancePage";
import { UsersPage } from "./features/users/UsersPage";
import { VendorsPage } from "./features/vendors/VendorsPage";
import { AlertsPage } from "./features/alerts/AlertsPage";
import { ActivityPage } from "./features/activity/ActivityPage";
import { PurchasePage } from "./features/purchase/PurchasePage";
import { RecipesPage } from "./features/recipes/RecipesPage";
import { CashPage } from "./features/cash/CashPage";
import { WastePage } from "./features/waste/WastePage";
import { PnLPage } from "./features/pnl/PnLPage";
import { BestSellersPage } from "./features/bestsellers/BestSellersPage";
import { ReorderPage } from "./features/reorder/ReorderPage";
import { ReceiptScanPage } from "./features/receiptscan/ReceiptScanPage";
import { SchedulePage } from "./features/schedule/SchedulePage";
import { PayrollPage } from "./features/payroll/PayrollPage";
import { ChecklistPage } from "./features/checklist/ChecklistPage";
import { InventoryReviewModal } from "./InventoryReviewModal";

export { InventoryReviewModal };

export function Dashboard() {
  const {user}=useAuth();
  const [tab,setTab]=useState("home");
  const [sidebarOpen,setSidebarOpen]=useState(false);

  const render=()=>{
    if(tab==="home")        return <HomePage setActive={setTab} user={user}/>;
    if(tab==="inventory")   return <InventoryPage/>;
    if(tab==="reports")     return <ReportsPage/>;
    if(tab==="pnl")         return <PnLPage/>;
    if(tab==="bestsellers") return <BestSellersPage/>;
    if(tab==="vendors")     return <VendorsPage/>;
    if(tab==="purchase")    return <PurchasePage/>;
    if(tab==="reorder")     return <ReorderPage/>;
    if(tab==="recipes")     return <RecipesPage/>;
    if(tab==="customers")   return <CustomersPage/>;
    if(tab==="expenses")    return <ExpensesPage/>;
    if(tab==="receiptscan") return <ReceiptScanPage/>;
    if(tab==="cash")        return <CashPage/>;
    if(tab==="waste")       return <WastePage/>;
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
    { key:"inventory", icon:"📦", label:"Stock"    },
    { key:"vendors",   icon:"🏭", label:"Vendors"  },
    { key:"reports",   icon:"📊", label:"Reports"  },
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
          overflowY:"auto",
          WebkitOverflowScrolling:"touch",
          width:260,
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
