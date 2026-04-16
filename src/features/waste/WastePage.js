import { useState } from "react";
import { WASTE_REASONS } from "../../shared/constants";
import { S, PageHeader, StatCard, FBtn, PBtn } from "../../shared/ui";
import { useWaste, LoadingScreen, DbError } from "../../hooks";
import { WasteModal } from "./WasteModal";

export function WastePage() {
  const { data:waste, loading, error, save:saveDb } = useWaste();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("All");
  const reasons = ["All",...WASTE_REASONS];
  const filtered = filter==="All" ? waste : waste.filter(w=>w.reason===filter);
  const totalCost = waste.reduce((s,w)=>s+w.cost,0);
  const save = async w => { await saveDb(w); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Waste & Spoilage Log" subtitle="Track wasted or expired items and monitor losses." action={<PBtn onClick={()=>setModal({})}>+ Log Waste</PBtn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="🗑️" label="Total Entries" value={waste.length} color="#ef4444"/>
        <StatCard icon="💸" label="Total Loss" value={`$${totalCost.toFixed(2)}`} color="#f97316"/>
        <StatCard icon="📅" label="This Week" value={waste.filter(w=>w.date>="2026-03-07").length+" items"} color="#f59e0b"/>
        <StatCard icon="🏷️" label="Top Reason" value={WASTE_REASONS.reduce((m,r)=>{const n=waste.filter(w=>w.reason===r).length;return n>m.count?{r,count:n}:m},{r:"—",count:0}).r} color="#6366f1"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {reasons.map(r=><FBtn key={r} active={filter===r} onClick={()=>setFilter(r)}>{r}</FBtn>)}
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Date","Product","Qty","Reason","Cost","Reported By",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.sort((a,b)=>b.date.localeCompare(a.date)).map((w,i,arr)=>(
              <tr key={w.id} style={{borderBottom:i<arr.length-1?"1px solid #e5e9f0":"none"}}>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{w.date}</td>
                <td style={{...S.td,color:"#111827",fontWeight:600}}>{w.productName}</td>
                <td style={{...S.td,color:"#374151"}}>{w.qty} {w.unit}</td>
                <td style={S.td}><span style={{background:"#fef2f2",color:"#dc2626",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{w.reason}</span></td>
                <td style={{...S.td,color:"#ef4444",fontWeight:700}}>${w.cost.toFixed(2)}</td>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{w.reportedBy}</td>
                <td style={S.td}><button onClick={()=>setModal(w)} style={{padding:"3px 9px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,color:"#2563eb",fontSize:11,cursor:"pointer"}}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal!==null && <WasteModal initial={modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
