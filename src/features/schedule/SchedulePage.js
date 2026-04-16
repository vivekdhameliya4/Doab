import { S, PageHeader, Avatar } from "../../shared/ui";
import { useSchedules, LoadingScreen, DbError } from "../../hooks";

export function SchedulePage() {
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
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
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
