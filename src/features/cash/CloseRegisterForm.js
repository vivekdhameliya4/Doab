import { useState } from "react";
import { TxtInput, PBtn } from "../../shared/ui";

export function CloseRegisterForm({ session, onClose, onCancel }) {
  const [float, setFloat] = useState("");
  const [notes, setNotes] = useState("");
  const expected = session.openingFloat + session.cashSales;
  const variance = float ? parseFloat(float) - expected : null;
  return (
    <div>
      <div style={{background:"#f8fafc",borderRadius:10,padding:"14px",marginBottom:16}}>
        {[["Total Sales",`$${Number(session.totalSales||0).toFixed(2)}`],["Card Sales",`$${Number(session.cardSales||0).toFixed(2)}`],["Cash Sales",`$${Number(session.cashSales||0).toFixed(2)}`],["Expected Float",`$${Number(expected||0).toFixed(2)}`]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
            <span style={{color:"#6b7280"}}>{l}</span><span style={{color:"#111827",fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
      <TxtInput label="Actual Closing Float ($) *" value={float} onChange={setFloat} type="number" placeholder="Enter counted cash"/>
      {variance!==null && (
        <div style={{background:variance>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${variance>=0?"#bbf7d0":"#fecaca"}`,borderRadius:8,padding:"8px 14px",marginBottom:12}}>
          <span style={{color:variance>=0?"#059669":"#dc2626",fontWeight:700}}>Variance: {variance>=0?"+":""}{variance.toFixed(2)}</span>
        </div>
      )}
      <TxtInput label="Notes" value={notes} onChange={setNotes} placeholder="Any notes for this session…"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>float&&onClose({closingFloat:parseFloat(float),variance,notes})} disabled={!float}>Close Register</PBtn>
      </div>
    </div>
  );
}
