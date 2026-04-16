import { useState } from "react";
import { FEATURES } from "../../shared/constants";
import { StatCard, PBtn } from "../../shared/ui";

export function HomePage({ setActive, user }) {
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

export function HomeFeatureCard({ feature:f, onClick }) {
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
