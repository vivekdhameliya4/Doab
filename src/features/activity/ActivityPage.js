import { S, PageHeader } from "../../shared/ui";

export function ActivityPage() {
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
