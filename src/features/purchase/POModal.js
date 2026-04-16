import { useState } from "react";
import { S, Modal, TxtInput, PBtn } from "../../shared/ui";
import { useVendors } from "../../hooks";

export function POModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const { data:vendors } = useVendors();
  const [vendorId, setVendorId] = useState(String(initial?.vendorId||""));
  const [vendorName, setVendorName] = useState(initial?.vendorName||"");
  const [expected, setExpected] = useState(initial?.expectedDate||"");
  const [notes, setNotes] = useState(initial?.notes||"");
  const [items, setItems] = useState(initial?.items||[{name:"",qty:1,unit:"unit",unitCost:0}]);
  const addRow = () => setItems(is=>[...is,{name:"",qty:1,unit:"unit",unitCost:0}]);
  const upd = (i,k,v) => setItems(is=>is.map((it,idx)=>idx===i?{...it,[k]:k==="qty"||k==="unitCost"?Number(v):v}:it));
  const del = i => setItems(is=>is.filter((_,idx)=>idx!==i));
  const total = items.reduce((s,it)=>s+it.qty*it.unitCost,0);
  const valid = vendorName && expected && items.length>0 && items.every(it=>it.name&&it.qty>0);
  const save = () => { if(!valid)return; onSave({...(isEdit?{id:initial.id,poNo:initial.poNo}:{}),vendorId:Number(vendorId),vendorName,status:initial?.status||"pending",date:new Date().toISOString().split("T")[0],expectedDate:expected,items,total,notes}); };
  return (
    <Modal title={isEdit?"Edit PO":"New Purchase Order"} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div>
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>Vendor *</div>
          <select value={vendorId} onChange={e=>{setVendorId(e.target.value);setVendorName(vendors.find(v=>String(v.id)===e.target.value)?.name||"");}} style={S.input}>
            <option value="">-- Select vendor --</option>
            {vendors.map(v=><option key={v.id} value={String(v.id)}>{v.name}</option>)}
          </select>
        </div>
        <TxtInput label="Expected Delivery *" value={expected} onChange={setExpected} type="date"/>
      </div>
      <TxtInput label="Notes" value={notes} onChange={setNotes} placeholder="Any special instructions…"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{color:"#374151",fontWeight:700,fontSize:13}}>Items *</div>
        <button onClick={addRow} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>+ Add Item</button>
      </div>
      {items.map((it,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.7fr 1fr 28px",gap:8,marginBottom:8,alignItems:"center"}}>
          <input value={it.name} onChange={e=>upd(i,"name",e.target.value)} placeholder="Item name" style={S.input}/>
          <input value={it.unit} onChange={e=>upd(i,"unit",e.target.value)} placeholder="unit" style={S.input}/>
          <input value={it.qty||""} onChange={e=>upd(i,"qty",e.target.value)} type="number" min="1" placeholder="Qty" style={S.input}/>
          <div style={{position:"relative"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11}}>$</span><input value={it.unitCost||""} onChange={e=>upd(i,"unitCost",e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{...S.input,paddingLeft:18}}/></div>
          <button onClick={()=>del(i)} style={{width:28,height:28,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      ))}
      <div style={{textAlign:"right",color:"#059669",fontSize:15,fontWeight:800,marginBottom:16}}>Total: ${total.toFixed(2)}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={save} disabled={!valid}>{isEdit?"Save Changes":"Create PO"}</PBtn>
      </div>
    </Modal>
  );
}
