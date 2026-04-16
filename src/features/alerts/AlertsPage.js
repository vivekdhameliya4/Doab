import { useState } from "react";
import { S } from "../../shared/ui";

export function AlertsPage() {
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
