import { useState } from "react";
import { SEED_PAYROLL } from "../../shared/constants";
import { S, PageHeader, StatCard, Avatar } from "../../shared/ui";

export function PayrollPage() {
  const [staff, setStaff] = useState(SEED_PAYROLL);
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
