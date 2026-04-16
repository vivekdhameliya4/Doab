import { useState } from "react";
import { S, FBtn } from "../../shared/ui";
import { downloadCSV } from "../../shared/utils";

export function InvoiceList({ invoices, vendors, onEdit }) {
  const [expanded,setExpanded]=useState(null);
  const [fv,setFv]=useState("All");
  const names=["All",...new Set(invoices.map(i=>i.vendorName))];
  const sorted=[...(fv==="All"?invoices:invoices.filter(i=>i.vendorName===fv))].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const exportInvoices = () => {
    const rows = [];
    sorted.forEach(inv => {
      inv.items.forEach(it => {
        rows.push([inv.invoiceNo, inv.vendorName, inv.date, it.name, it.qty, it.unit, it.unitPrice, (it.qty*it.unitPrice).toFixed(2)]);
      });
    });
    downloadCSV(`invoices_${new Date().toISOString().split('T')[0]}.csv`,
      ["Invoice No","Vendor","Date","Item","Qty","Unit","Unit Price","Line Total"], rows);
  };
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {names.map(n=><FBtn key={n} active={fv===n} onClick={()=>setFv(n)}>{n}</FBtn>)}
        <button onClick={exportInvoices} style={{marginLeft:"auto",padding:"7px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,color:"#059669",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {sorted.length===0&&<div style={{color:"#374151",textAlign:"center",padding:40}}>No invoices yet. Click "+ Add Invoice" to upload one.</div>}
        {sorted.map(inv=>{
          const sub=inv.items.reduce((s,it)=>s+it.qty*it.unitPrice,0);
          const open=expanded===inv.id;
          return (
            <div key={inv.id} style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px"}}>
                <div onClick={()=>setExpanded(open?null:inv.id)} style={{display:"flex",alignItems:"center",gap:12,flex:1,cursor:"pointer"}}>
                  <div style={{width:38,height:38,borderRadius:9,background:"rgba(16,185,129,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>🧾</div>
                  <div style={{flex:1}}><div style={{color:"#0f172a",fontWeight:700,fontSize:14}}>{inv.invoiceNo} <span style={{color:"#374151",fontWeight:400}}>·</span> <span style={{color:"#9ca3af",fontWeight:400,fontSize:13}}>{inv.vendorName}</span></div><div style={{color:"#6b7280",fontSize:12}}>{inv.date} · {inv.items.length} items</div></div>
                  <div style={{textAlign:"right",marginRight:8}}><div style={{color:"#10b981",fontWeight:800,fontSize:15}}>${sub.toFixed(2)}</div></div>
                </div>
                <button onClick={()=>onEdit(inv)} style={{padding:"5px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:12,cursor:"pointer",fontWeight:600,flexShrink:0}}>✏️ Edit</button>
                <span onClick={()=>setExpanded(open?null:inv.id)} style={{color:"#374151",cursor:"pointer",padding:"4px",fontSize:14}}>{open?"▲":"▼"}</span>
              </div>
              {open&&(
                <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",padding:"0 16px 14px"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",marginTop:10}}>
                    <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Item","Unit","Qty","Unit Price","Total"].map(h=><th key={h} style={{...S.th,padding:"7px 10px"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {inv.items.map((it,i)=>(
                        <tr key={i} style={{borderBottom:i<inv.items.length-1?"1px solid #f1f5f9":"none"}}>
                          <td style={{...S.td,color:"#374151",fontWeight:500,padding:"8px 10px"}}>{it.name}</td>
                          <td style={{...S.td,color:"#9ca3af",padding:"8px 10px"}}>{it.unit}</td>
                          <td style={{...S.td,color:"#9ca3af",padding:"8px 10px"}}>{it.qty}</td>
                          <td style={{...S.td,color:"#9ca3af",padding:"8px 10px"}}>${Number(it.unitPrice).toFixed(2)}</td>
                          <td style={{...S.td,color:"#10b981",fontWeight:700,padding:"8px 10px"}}>${(it.qty*it.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
