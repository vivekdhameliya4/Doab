import { useState } from "react";
import { EXPENSE_CATS } from "../../shared/constants";
import { downloadCSV } from "../../shared/utils";
import { S, PageHeader, StatCard, FBtn, PBtn } from "../../shared/ui";
import { useExpenses, LoadingScreen, DbError } from "../../hooks";
import { ExpenseModal } from "./ExpenseModal";

export function ExpensesPage() {
  const { data:expenses, loading, error, save:saveDb } = useExpenses();
  const [modal,setModal]=useState(null);
  const [catFilter,setCatFilter]=useState("All");
  const cats=["All",...new Set(expenses.map(e=>e.category))];
  const filtered=catFilter==="All"?expenses:expenses.filter(e=>e.category===catFilter);
  const total=expenses.reduce((s,e)=>s+e.amount,0);
  const save=async e=>{ await saveDb(e); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track all store costs and outgoings." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadCSV(`expenses_${new Date().toISOString().split('T')[0]}.csv`,
            ["Description","Category","Vendor","Amount","Date","Receipt"],
            expenses.map(e=>[e.description,e.category,e.vendor,e.amount,e.date,e.receipt])
          )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Add Expense</PBtn>
        </div>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="💳" label="Total This Month" value={`$${total.toLocaleString("en",{minimumFractionDigits:2})}`} color="#ec4899"/>
        <StatCard icon="📋" label="Total Entries"    value={expenses.length} color="#6366f1"/>
        <StatCard icon="🏷" label="Biggest Category" value={EXPENSE_CATS.reduce((m,c)=>{const s=expenses.filter(e=>e.category===c).reduce((x,e)=>x+e.amount,0);return s>m.val?{cat:c,val:s}:m},{cat:"",val:0}).cat||"—"} color="#f59e0b"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {cats.map(c=><FBtn key={c} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</FBtn>)}
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Description","Category","Vendor","Date","Amount","Receipt",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((e,i,arr)=>(
              <tr key={e.id} style={{borderBottom:i<arr.length-1?"1px solid #e2e8f0":"none"}}>
                <td style={{...S.td,color:"#374151",fontWeight:600}}>{e.description}</td>
                <td style={S.td}><span style={{background:"rgba(236,72,153,0.1)",color:"#ec4899",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{e.category}</span></td>
                <td style={{...S.td,color:"#9ca3af"}}>{e.vendor}</td>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{e.date}</td>
                <td style={{...S.td,color:"#f87171",fontWeight:700}}>${e.amount.toFixed(2)}</td>
                <td style={{...S.td,color:"#374151",fontSize:12}}>{e.receipt}</td>
                <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:e})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<ExpenseModal initial={modal.data} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
