import { useState } from "react";
import { Modal, TxtInput, Sel, PBtn } from "../../shared/ui";

export function UserFormModal({ initial, onSave, onClose }) {
  const isEdit = !!initial;
  const [f, setF] = useState(initial || { name:"", username:"", password:"", email:"", role:"Cashier", status:"active" });
  const set = k => v => setF(x=>({...x,[k]:v}));
  const valid = f.name.trim() && f.username.trim() && (isEdit || f.password.trim());
  return (
    <Modal title={isEdit ? "Edit User" : "Add New User"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Full Name *" value={f.name} onChange={set("name")} placeholder="e.g. John Smith"/>
        <TxtInput label="Username *" value={f.username} onChange={set("username")} placeholder="e.g. jsmith"/>
      </div>
      <TxtInput label="Email" value={f.email||""} onChange={set("email")} placeholder="john@doab.com" type="email"/>
      {!isEdit && (
        <TxtInput label="Password *" value={f.password} onChange={set("password")} placeholder="Set a strong password" type="password"/>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Sel label="Role" value={f.role} onChange={set("role")} options={["Admin","Manager","Cashier"]}/>
        {isEdit && <Sel label="Status" value={f.status} onChange={set("status")} options={[{v:"active",l:"Active"},{v:"inactive",l:"Inactive"}]}/>}
      </div>
      <div style={{background:"#f8fafc",borderRadius:9,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#6b7280"}}>
        <strong style={{color:"#374151"}}>Role permissions:</strong><br/>
        🔑 <strong>Admin</strong> — full access including User Management<br/>
        📊 <strong>Manager</strong> — all modules except User Management<br/>
        🛒 <strong>Cashier</strong> — POS, Inventory, Attendance, Checklist
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{isEdit?"Save Changes":"Create User"}</PBtn>
      </div>
    </Modal>
  );
}
