import { useState } from "react";
import { Modal, TxtInput, Sel, PBtn } from "../../shared/ui";

export function VendorModal({ initial, onSave, onClose, existingVendors=[] }) {
  const [f,setF]=useState(initial||{name:"",contact:"",phone:"",email:"",address:"",category:"Groceries",status:"active"});
  const set=k=>v=>setF(x=>({...x,[k]:v}));
  const isDuplicate = !initial && existingVendors.some(v => v.name.trim().toLowerCase() === f.name.trim().toLowerCase());
  const valid=f.name.trim()&&f.contact.trim()&&!isDuplicate;
  return (
    <Modal title={initial?"Edit Vendor":"Add Vendor"} onClose={onClose}>
      <TxtInput label="Company Name *" value={f.name} onChange={set("name")} placeholder="e.g. FreshCo Distributors"/>
      {isDuplicate && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",marginTop:-8,marginBottom:8,color:"#dc2626",fontSize:12,fontWeight:600}}>⚠ A vendor with this name already exists.</div>}
      <TxtInput label="Contact Person *" value={f.contact} onChange={set("contact")} placeholder="e.g. John Smith"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Phone" value={f.phone} onChange={set("phone")} placeholder="+1 555-0000"/>
        <TxtInput label="Email" value={f.email} onChange={set("email")} placeholder="orders@vendor.com" type="email"/>
      </div>
      <TxtInput label="Address" value={f.address} onChange={set("address")} placeholder="Street, City, State"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:6}}>
        <Sel label="Category" value={f.category} onChange={set("category")} options={["Groceries","Dairy","Snacks","Packaging","Beverages","Other"]}/>
        {initial&&<Sel label="Status" value={f.status} onChange={set("status")} options={[{v:"active",l:"Active"},{v:"inactive",l:"Inactive"}]}/>}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Add Vendor"}</PBtn>
      </div>
    </Modal>
  );
}
