import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getStoredUsers } from "../auth/AuthContext";
import { Modal, TxtInput, PBtn } from "../../shared/ui";

export function ChangePasswordModal({ user, onSave, onClose }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const { user:currentUser } = useAuth();

  const submit = () => {
    setErr("");
    const users = getStoredUsers();
    const found = users.find(u => u.id === user.id);
    // Admins can change anyone's password without knowing current
    if (currentUser?.role !== "Admin") {
      if (found?.password !== current) { setErr("Current password is incorrect."); return; }
    }
    if (newPass.length < 6) { setErr("New password must be at least 6 characters."); return; }
    if (newPass !== confirm) { setErr("Passwords don't match."); return; }
    onSave(user.id, newPass);
  };

  return (
    <Modal title={`Change Password — ${user.name}`} onClose={onClose}>
      {currentUser?.role !== "Admin" && (
        <TxtInput label="Current Password *" value={current} onChange={setCurrent} type="password" placeholder="Enter current password"/>
      )}
      <TxtInput label="New Password *" value={newPass} onChange={setNewPass} type="password" placeholder="Min. 6 characters"/>
      <TxtInput label="Confirm New Password *" value={confirm} onChange={setConfirm} type="password" placeholder="Repeat new password"/>
      {err && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",color:"#dc2626",fontSize:12,marginBottom:8,fontWeight:600}}>⚠ {err}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={submit} disabled={!newPass||!confirm}>Update Password</PBtn>
      </div>
    </Modal>
  );
}
