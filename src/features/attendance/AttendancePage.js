import { useState } from "react";
import { SEED_STAFF } from "../../shared/constants";
import { downloadCSV } from "../../shared/utils";
import { downloadTimesheetCSV } from "../../shared/utils";
import { S, PageHeader, StatCard, Avatar, PBtn } from "../../shared/ui";
import { useShifts, LoadingScreen, DbError } from "../../hooks";
import { ShiftModal } from "./ShiftModal";

export function AttendancePage() {
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
