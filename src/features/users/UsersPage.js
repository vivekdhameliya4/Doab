import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { sbUsers, getStoredUsers, saveStoredUsers } from "../auth/AuthContext";
import { S, PageHeader, StatCard, Avatar, RoleBadge, Pill, FBtn, PBtn } from "../../shared/ui";
import { LoadingScreen } from "../../hooks";
import { UserFormModal } from "./UserFormModal";
import { ChangePasswordModal } from "./ChangePasswordModal";

export function UsersPage() {
  const { user:currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  useEffect(() => {
    if (window._sbClient) {
      sbUsers.getAll().then(rows => { setUsers(rows); setUsersLoading(false); });
    } else {
      setUsers(getStoredUsers()); setUsersLoading(false);
    }
  }, []);

  const addUser = async (u) => {
    const exists = users.some(x => x.username.toLowerCase() === u.username.toLowerCase());
    if (exists) { alert("Username already exists."); return; }
    try {
      if (window._sbClient) {
        const saved = await sbUsers.create(u);
        setUsers(us => [...us, saved]);
      } else {
        const newUser = { ...u, id:Date.now(), avatar:u.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() };
        const updated = [...users, newUser];
        setUsers(updated); saveStoredUsers(updated);
      }
      setModal(null);
    } catch(e) { alert("Error: " + e.message); }
  };

  const editUser = async (u) => {
    try {
      if (window._sbClient) {
        const saved = await sbUsers.update(u.id, { name:u.name, email:u.email, role:u.role, status:u.status });
        setUsers(us => us.map(x => x.id === u.id ? saved : x));
      } else {
        const updated = users.map(x => x.id === u.id ? { ...x, ...u } : x);
        setUsers(updated); saveStoredUsers(updated);
      }
      setModal(null);
    } catch(e) { alert("Error: " + e.message); }
  };

  const changePassword = async (id, newPass) => {
    try {
      if (window._sbClient) {
        await sbUsers.update(id, { password: newPass });
      } else {
        const updated = users.map(x => x.id === id ? { ...x, password: newPass } : x);
        setUsers(updated); saveStoredUsers(updated);
      }
      setUsers(us => us.map(x => x.id === id ? { ...x, password: newPass } : x));
      setModal(null);
    } catch(e) { alert("Error: " + e.message); }
  };

  const toggle = async (id) => {
    if (id === currentUser?.id) { alert("You cannot deactivate your own account."); return; }
    const u = users.find(x => x.id === id);
    const newStatus = u?.status === "active" ? "inactive" : "active";
    try {
      if (window._sbClient) await sbUsers.update(id, { status: newStatus });
      const updated = users.map(x => x.id === id ? { ...x, status: newStatus } : x);
      setUsers(updated);
      if (!window._sbClient) saveStoredUsers(updated);
    } catch(e) { alert("Error: " + e.message); }
  };

  const deleteUser = async (id) => {
    if (id === currentUser?.id) { alert("You cannot delete your own account."); return; }
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      if (window._sbClient) await sbUsers.delete(id);
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      if (!window._sbClient) saveStoredUsers(updated);
    } catch(e) { alert("Error: " + e.message); }
  };

  if (usersLoading) return <LoadingScreen/>;

  const filtered = users.filter(u =>
    (filterRole === "All" || u.role === filterRole) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = { total:users.length, active:users.filter(u=>u.status==="active").length, admins:users.filter(u=>u.role==="Admin").length };

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage staff accounts, roles, usernames and passwords."
        action={currentUser?.role==="Admin" ? <PBtn onClick={()=>setModal({mode:"add"})}>+ Add User</PBtn> : null}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="👥" label="Total Users" value={stats.total} color="#4a7cf7"/>
        <StatCard icon="✅" label="Active" value={stats.active} color="#2ecc71"/>
        <StatCard icon="🔑" label="Admins" value={stats.admins} color="#e87c2b"/>
      </div>

      {currentUser?.role !== "Admin" && (
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px",marginBottom:16,color:"#92400e",fontSize:13}}>
          🔒 Only Admin users can create, edit or delete accounts.
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search users…" style={{...S.input,flex:1,minWidth:180}}/>
        {["All","Admin","Manager","Cashier"].map(r=><FBtn key={r} active={filterRole===r} onClick={()=>setFilterRole(r)}>{r}</FBtn>)}
      </div>

      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>
            {["User","Username","Role","Status","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:i<filtered.length-1?"1px solid #e2e8f0":"none",background:u.id===currentUser?.id?"#eff6ff":"transparent"}}>
                <td style={S.td}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <Avatar initials={u.avatar||u.name?.slice(0,2)||"??"} size={32}/>
                    <div>
                      <div style={{color:"#111827",fontSize:13,fontWeight:600}}>{u.name} {u.id===currentUser?.id&&<span style={{color:"#3b82f6",fontSize:10,fontWeight:700}}>(You)</span>}</div>
                      <div style={{color:"#9ca3af",fontSize:11}}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{...S.td,fontFamily:"monospace",color:"#374151",fontSize:12}}>{u.username}</td>
                <td style={S.td}><RoleBadge role={u.role}/></td>
                <td style={S.td}><Pill active={u.status==="active"}/></td>
                <td style={S.td}>
                  {currentUser?.role==="Admin" && (
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <button onClick={()=>setModal({mode:"edit",data:u})}
                        style={{padding:"4px 9px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,color:"#2563eb",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
                      <button onClick={()=>setModal({mode:"password",data:u})}
                        style={{padding:"4px 9px",background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:6,color:"#7c3aed",fontSize:11,cursor:"pointer",fontWeight:600}}>🔑 Password</button>
                      <button onClick={()=>toggle(u.id)}
                        style={{padding:"4px 9px",background:u.status==="active"?"#fef2f2":"#f0fdf4",border:`1px solid ${u.status==="active"?"#fecaca":"#bbf7d0"}`,borderRadius:6,color:u.status==="active"?"#dc2626":"#059669",fontSize:11,cursor:"pointer",fontWeight:600}}>
                        {u.status==="active"?"Disable":"Enable"}
                      </button>
                      {u.id!==currentUser?.id&&(
                        <button onClick={()=>deleteUser(u.id)}
                          style={{padding:"4px 9px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:600}}>🗑 Delete</button>
                      )}
                    </div>
                  )}
                  {currentUser?.role!=="Admin" && u.id===currentUser?.id && (
                    <button onClick={()=>setModal({mode:"password",data:u})}
                      style={{padding:"4px 9px",background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:6,color:"#7c3aed",fontSize:11,cursor:"pointer",fontWeight:600}}>🔑 Change My Password</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.mode==="add"    && <UserFormModal onSave={addUser}    onClose={()=>setModal(null)}/>}
      {modal?.mode==="edit"   && <UserFormModal initial={modal.data} onSave={editUser}  onClose={()=>setModal(null)}/>}
      {modal?.mode==="password" && <ChangePasswordModal user={modal.data} onSave={changePassword} onClose={()=>setModal(null)}/>}
    </div>
  );
}
