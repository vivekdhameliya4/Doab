import { useState } from "react";
import { S, Pill, FBtn } from "../../shared/ui";
import { downloadCSV } from "../../shared/utils";

export function VendorList({ vendors, invoices, onSelect, onEdit }) {
  const [search,setSearch]=useState("");
  const CC={Groceries:"#2ecc71",Packaging:"#3b82f6",Dairy:"#f59e0b",Snacks:"#ec4899",Other:"#9ca3af"};
  const filtered=vendors.filter(v=>v.name.toLowerCase().includes(search.toLowerCase())||v.category.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search vendors…" style={{...S.input,maxWidth:340,marginBottom:14}}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
        {filtered.map(v=>{
          const vi=invoices.filter(i=>i.vendorId===v.id);
          const tot=vi.reduce((s,iv)=>s+iv.items.reduce((a,it)=>a+it.qty*it.unitPrice,0),0);
          const cc=CC[v.category]||"#9ca3af";
          return (
            <div key={v.id} style={{...S.card,padding:"18px 20px",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#2563eb44"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e9f0"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flex:1}} onClick={()=>onSelect(v)}>
                  <div style={{width:42,height:42,borderRadius:11,background:`${cc}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏭</div>
                  <div><div style={{color:"#0f172a",fontWeight:700,fontSize:14}}>{v.name}</div><span style={{background:`${cc}18`,color:cc,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{v.category}</span></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}><Pill active={v.status==="active"}/><button onClick={()=>onEdit(v)} style={{padding:"3px 9px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:6,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12,fontSize:11,color:"#9ca3af"}}>
                <span>👤 {v.contact}</span><span>📞 {v.phone}</span>
                <span>✉️ {v.email}</span><span>📍 {v.address}</span>
              </div>
              <div style={{display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:10}}>
                <div style={{flex:1,textAlign:"center"}}><div style={{color:"#3b82f6",fontSize:16,fontWeight:800}}>{vi.length}</div><div style={{color:"#6b7280",fontSize:11}}>Invoices</div></div>
                <div style={{width:1,background:"#374151"}}/>
                <div style={{flex:1,textAlign:"center"}}><div style={{color:"#10b981",fontSize:16,fontWeight:800}}>${tot.toFixed(2)}</div><div style={{color:"#6b7280",fontSize:11}}>Total Spent</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
