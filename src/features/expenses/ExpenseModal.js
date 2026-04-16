import { useState } from "react";
import { EXPENSE_CATS } from "../../shared/constants";
import { Modal, TxtInput, Sel, PBtn } from "../../shared/ui";

export function ExpenseModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial||{description:"",category:"Utilities",vendor:"",date:new Date().toISOString().split("T")[0],amount:0,receipt:""});
  const set=k=>v=>setF(x=>({...x,[k]:k==="amount"?Number(v):v}));
  const valid=f.description.trim()&&f.amount>0;
  return (
    <Modal title={initial?"Edit Expense":"Add Expense"} onClose={onClose}>
      <TxtInput label="Description *" value={f.description} onChange={set("description")} placeholder="e.g. Electricity Bill"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Sel label="Category" value={f.category} onChange={set("category")} options={EXPENSE_CATS}/>
        <TxtInput label="Amount ($) *" value={f.amount} onChange={set("amount")} type="number" placeholder="0.00"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Vendor / Supplier" value={f.vendor} onChange={set("vendor")} placeholder="Vendor name"/>
        <TxtInput label="Date" value={f.date} onChange={set("date")} type="date"/>
      </div>
      <TxtInput label="Receipt #" value={f.receipt} onChange={set("receipt")} placeholder="#REC-000"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Add Expense"}</PBtn>
      </div>
    </Modal>
  );
}
