import { useState } from "react";
import { SEED_STAFF } from "../../shared/constants";
import { Modal, TxtInput, Sel, PBtn } from "../../shared/ui";

export function ShiftModal({ initial, onSave, onClose }) {
  const [f,setF]=useState(initial||{staffName:"",date:new Date().toISOString().split("T")[0],clockIn:"09:00",clockOut:"17:00",hours:8,staffId:0});
  const set=k=>v=>{ const upd={...f,[k]:k==="hours"?Number(v):v}; if(k==="clockIn"||k==="clockOut"){ const ci=upd.clockIn||""; const co=upd.clockOut||""; if(ci.includes(":")&&co.includes(":")){ const [ih,im]=ci.split(":").map(Number); const [oh,om]=co.split(":").map(Number); const hrs=((oh*60+om)-(ih*60+im))/60; upd.hours=Math.max(hrs,0).toFixed(1); } } setF(upd); };
  const staffOpts=SEED_STAFF.map(s=>({v:String(s.id),l:s.name}));
  const valid=f.staffName&&f.date&&f.clockIn&&f.clockOut;
  return (
    <Modal title={initial?"Edit Shift":"Log Shift"} onClose={onClose}>
      {!initial&&<Sel label="Staff Member *" value={String(f.staffId)} onChange={v=>{const st=SEED_STAFF.find(s=>String(s.id)===v);setF(x=>({...x,staffId:Number(v),staffName:st?.name||""}));}} options={[{v:"0",l:"-- Select staff --"},...staffOpts]}/>}
      {initial&&<TxtInput label="Staff" value={f.staffName} onChange={()=>{}} placeholder=""/>}
      <TxtInput label="Date *" value={f.date} onChange={set("date")} type="date"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <TxtInput label="Clock In"  value={f.clockIn}  onChange={set("clockIn")}  type="time"/>
        <TxtInput label="Clock Out" value={f.clockOut} onChange={set("clockOut")} type="time"/>
        <TxtInput label="Hours"     value={f.hours}    onChange={set("hours")}    type="number"/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Log Shift"}</PBtn>
      </div>
    </Modal>
  );
}
