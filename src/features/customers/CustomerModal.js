import { useState } from "react";
import { Modal, TxtInput, PBtn } from "../../shared/ui";

export function CustomerModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial||{name:"",phone:"",email:""});
  const set=k=>v=>setF(x=>({...x,[k]:v}));
  return (
    <Modal title={initial?"Edit Customer":"Add Customer"} onClose={onClose}>
      <TxtInput label="Full Name *" value={f.name} onChange={set("name")} placeholder="e.g. Maria Santos"/>
      <TxtInput label="Phone"  value={f.phone} onChange={set("phone")} placeholder="+1 555-0000"/>
      <TxtInput label="Email"  value={f.email} onChange={set("email")} placeholder="customer@email.com" type="email"/>
      {initial&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><TxtInput label="Loyalty Points" value={f.loyaltyPts} onChange={v=>setF(x=>({...x,loyaltyPts:Number(v)}))} type="number"/><TxtInput label="Total Spent ($)" value={f.totalSpent} onChange={v=>setF(x=>({...x,totalSpent:Number(v)}))} type="number"/></div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>f.name.trim()&&onSave(f)} disabled={!f.name.trim()}>{initial?"Save Changes":"Add Customer"}</PBtn>
      </div>
    </Modal>
  );
}
