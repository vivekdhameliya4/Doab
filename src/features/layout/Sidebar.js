import { useAuth } from "../auth/AuthContext";
import { Avatar } from "../../shared/ui";
import { NAV_GROUPS } from "../../shared/constants";
import { HAS_SUPABASE } from "../../hooks";

export function Sidebar({ active, setActive }) {
  const { user, logout } = useAuth();
  return (
    <aside style={{width:228,background:"#1e3a8a",borderRight:"1px solid rgba(255,255,255,0.1)",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto",height:"100%",minHeight:"100vh",WebkitOverflowScrolling:"touch"}}>
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
        <button onClick={logout} style={{width:"100%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:9,padding:"9px",color:"#f87171",fontSize:13,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>🚪 Sign Out</button>
        <div style={{marginTop:8,padding:"5px 8px",borderRadius:6,background:HAS_SUPABASE?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.15)",border:`1px solid ${HAS_SUPABASE?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.3)"}`,textAlign:"center",fontSize:10,fontWeight:700,color:HAS_SUPABASE?"#10b981":"#f59e0b"}}>
          {HAS_SUPABASE?"🟢 Supabase Connected":"🟡 Local Only (no DB)"}
        </div>
      </div>
    </aside>
  );
}
