import { useState } from "react";
import { WASTE_REASONS } from "../../shared/constants";
import { Modal, TxtInput, Sel, PBtn } from "../../shared/ui";

export function WasteModal({ initial, onSave, onClose }) {
  const [f,setF] = useState(initial?.id?initial:{productName:"",qty:1,unit:"unit",reason:"Expired",cost:0,date:new Date().toISOString().split("T")[0],reportedBy:"Admin"});
  const set=k=>v=>setF(x=>({...x,[k]:k==="qty"||k==="cost"?Number(v):v}));
  return (
    <Modal title={f.id?"Edit Waste Entry":"Log Waste / Spoilage"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Product Name *" value={f.productName} onChange={set("productName")} placeholder="e.g. White Bread"/>
        <TxtInput label="Date *" value={f.date} onChange={set("date")} type="date"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <TxtInput label="Quantity" value={f.qty||""} onChange={set("qty")} type="number" placeholder="1"/>
        <TxtInput label="Unit" value={f.unit} onChange={set("unit")} placeholder="unit"/>
        <Sel label="Reason" value={f.reason} onChange={set("reason")} options={WASTE_REASONS}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Cost ($)" value={f.cost||""} onChange={set("cost")} type="number" placeholder="0.00"/>
        <TxtInput label="Reported By" value={f.reportedBy} onChange={set("reportedBy")} placeholder="Staff name"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>f.productName&&onSave(f)} disabled={!f.productName}>{f.id?"Save Changes":"Log Waste"}</PBtn>
      </div>
    </Modal>
  );
}
