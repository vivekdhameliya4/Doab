import { useState } from "react";
import { SEED_CHECKLIST } from "../../shared/constants";
import { PageHeader } from "../../shared/ui";

export function ChecklistPage() {
  const [type, setType] = useState("opening");
  const [checked, setChecked] = useState({});
  const [date] = useState(new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}));
  const tasks = SEED_CHECKLIST[type];
  const toggle = id => setChecked(c=>({...c,[type+id]:!c[type+id]}));
  const done = tasks.filter(t=>checked[type+t.id]).length;
  const pct = Math.round(done/tasks.length*100);
  const CATEGORIES = [...new Set(tasks.map(t=>t.category))];
  const CAT_COLORS = {Security:"#ef4444",Equipment:"#3b82f6","Food Safety":"#f59e0b",Prep:"#10b981",Cash:"#059669",Cleaning:"#8b5cf6",Admin:"#6366f1",Maintenance:"#f97316",Stock:"#06b6d4"};
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
      <div style={{background:"#ffffff",border:"1px solid #e5e9f0",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",padding:"18px 20px",marginBottom:16}}>
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
            const isDone = checked[type+task.id];
            return (
              <div key={task.id} onClick={()=>toggle(task.id)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:isDone?"#f0fdf4":"#ffffff",border:`1px solid ${isDone?"#bbf7d0":"#e5e9f0"}`,borderRadius:10,marginBottom:6,cursor:"pointer",transition:"all 0.15s"}}>
                <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${isDone?"#059669":"#d1d5db"}`,background:isDone?"#059669":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                  {isDone && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                </div>
                <span style={{color:isDone?"#059669":"#374151",fontWeight:isDone?600:400,fontSize:13,textDecoration:isDone?"line-through":"none"}}>{task.task}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
