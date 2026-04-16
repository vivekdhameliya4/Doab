import { useState } from "react";
import { PO_STATUS_COLORS } from "../../shared/constants";
import { S, PageHeader, StatCard, FBtn, PBtn } from "../../shared/ui";
import { usePOs, useVendors, LoadingScreen, DbError } from "../../hooks";
import { POModal } from "./POModal";

export function PurchasePage() {
  const { data:pos, loading, error, save:saveDb, update:updateDb } = usePOs();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const filtered = filter==="all" ? pos : pos.filter(p=>p.status===filter);
  const save = async p => { await saveDb(p); setModal(null); };
  const updateStatus = async (id,status) => { await updateDb(id,{status}); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  const totals = { pending:pos.filter(p=>p.status==="pending").length, ordered:pos.filter(p=>p.status==="ordered").length, received:pos.filter(p=>p.status==="received").length };
  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Create and track orders to your suppliers." action={<PBtn onClick={()=>setModal({})}>+ New PO</PBtn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="⏳" label="Pending Approval" value={totals.pending} color="#f59e0b"/>
        <StatCard icon="📦" label="Ordered" value={totals.ordered} color="#3b82f6"/>
        <StatCard icon="✅" label="Received" value={totals.received} color="#10b981"/>
        <StatCard icon="💰" label="Total Value" value={`$${pos.reduce((s,p)=>s+p.total,0).toFixed(2)}`} color="#6366f1"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {["all","pending","ordered","received","cancelled"].map(s=>(
          <FBtn key={s} active={filter===s} onClick={()=>setFilter(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</FBtn>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(po=>{
          const sc = PO_STATUS_COLORS[po.status]||{bg:"#f1f5f9",text:"#374151"};
          return (
            <div key={po.id} style={{...S.card,padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📋</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{color:"#111827",fontWeight:700,fontSize:15}}>{po.poNo}</span>
                    <span style={{background:sc.bg,color:sc.text,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{po.status}</span>
                  </div>
                  <div style={{color:"#6b7280",fontSize:12,marginTop:2}}>{po.vendorName} · {po.items.length} items · Expected: {po.expectedDate}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:"#059669",fontSize:17,fontWeight:800}}>${po.total.toFixed(2)}</div>
                  <div style={{color:"#9ca3af",fontSize:11}}>Created {po.date}</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>setModal(po)} style={{padding:"5px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
                  {po.status==="pending" && <button onClick={()=>updateStatus(po.id,"ordered")} style={{padding:"5px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:12,cursor:"pointer",fontWeight:600}}>Mark Ordered</button>}
                  {po.status==="ordered" && <button onClick={()=>updateStatus(po.id,"received")} style={{padding:"5px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:12,cursor:"pointer",fontWeight:600}}>Mark Received</button>}
                </div>
              </div>
              <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                {po.items.map((it,i)=>(
                  <span key={i} style={{background:"#f8fafc",border:"1px solid #e5e9f0",borderRadius:8,padding:"3px 10px",fontSize:11,color:"#374151"}}>
                    {it.name} × {it.qty}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {modal!==null && <POModal initial={modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
