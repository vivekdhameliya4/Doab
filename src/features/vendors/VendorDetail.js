import { Modal, PBtn } from "../../shared/ui";

export function VendorDetail({ vendor:v, invoices, onEdit, onClose }) {
  const tot=invoices.reduce((s,iv)=>s+iv.items.reduce((a,it)=>a+it.qty*it.unitPrice,0),0);
  return (
    <Modal title={v.name} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[["👤 Contact",v.contact],["📞 Phone",v.phone],["✉️ Email",v.email],["📍 Address",v.address],["🏷 Category",v.category],["📊 Status",v.status]].map(([l,val])=><div key={l} style={{background:"#f1f5f9",borderRadius:9,padding:"9px 12px"}}><div style={{color:"#374151",fontSize:10,fontWeight:600,marginBottom:2}}>{l}</div><div style={{color:"#9ca3af",fontSize:13}}>{val}</div></div>)}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <div style={{flex:1,background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{color:"#3b82f6",fontSize:20,fontWeight:800}}>{invoices.length}</div><div style={{color:"#374151",fontSize:11}}>Invoices</div></div>
        <div style={{flex:1,background:"rgba(16,185,129,0.08)",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{color:"#10b981",fontSize:20,fontWeight:800}}>${tot.toFixed(2)}</div><div style={{color:"#374151",fontSize:11}}>Total Spent</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><PBtn onClick={onEdit}>✏️ Edit Vendor Details</PBtn></div>
    </Modal>
  );
}
