import { useState } from "react";
import { useAuth } from "./AuthContext";
import { sbUsers, getStoredUsers, saveSession } from "./AuthContext";
import { S } from "../../shared/ui";

export function Login() {
  const {login}=useAuth();
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err,setErr]=useState(""); const [loading,setL]=useState(false);
  const [show,setShow]=useState(false);

  const submit=async ()=>{
    setErr("");
    if(!u||!p) return setErr("Please enter username and password.");
    setL(true);
    try {
      let found = null;
      // Try Supabase first
      if (window._sbClient) {
        found = await sbUsers.findByCredentials(u, p);
      }
      // Fallback to localStorage
      if (!found) {
        const users = getStoredUsers();
        found = users.find(usr => usr.username.toLowerCase()===u.toLowerCase() && usr.password===p && usr.status==="active");
      }
      if (found) {
        if (found.id && window._sbClient) sbUsers.updateLastLogin(found.id);
        const session = {id:found.id, name:found.name, role:found.role, avatar:found.avatar||found.name?.slice(0,2)||'??', email:found.email, username:found.username};
        saveSession(session);
        login(session);
      } else {
        setErr("Invalid username or password.");
        setL(false);
      }
    } catch(e) {
      setErr("Login error: " + e.message);
      setL(false);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.08) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{width:420,zIndex:1,padding:"0 16px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:68,height:68,background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",borderRadius:20,marginBottom:14,boxShadow:"0 8px 28px rgba(59,130,246,0.3)"}}><span style={{fontSize:32}}>🥯</span></div>
          <div style={{color:"#0f172a",fontSize:26,fontWeight:800,letterSpacing:"-0.5px"}}>Deli On A Bagel Cafe</div>
          <div style={{color:"#6b7280",fontSize:12,marginTop:4,letterSpacing:"1px",textTransform:"uppercase"}}>Store Management</div>
        </div>
        <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:20,boxShadow:"0 8px 40px rgba(15,23,42,0.12)",padding:"32px 32px 28px"}}>
          <div style={{color:"#111827",fontSize:20,fontWeight:800,marginBottom:4}}>Welcome back</div>
          <div style={{color:"#6b7280",fontSize:13,marginBottom:24}}>Sign in with your credentials</div>
          {err&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:16,fontWeight:600}}>⚠ {err}</div>}
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:6,textTransform:"uppercase"}}>Username</div>
          <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter your username" style={{...S.input,marginBottom:16}}/>
          <div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:6,textTransform:"uppercase"}}>Password</div>
          <div style={{position:"relative",marginBottom:24}}>
            <input value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••" type={show?"text":"password"} style={{...S.input,paddingRight:40}}/>
            <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:16,lineHeight:1}}>{show?"🙈":"👁"}</button>
          </div>
          <button onClick={submit} disabled={loading} style={{width:"100%",background:loading?"#93c5fd":"linear-gradient(135deg,#1e3a8a,#3b82f6)",border:"none",borderRadius:12,padding:"13px",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",boxShadow:"0 4px 20px rgba(59,130,246,0.3)",letterSpacing:"0.3px"}}>
            {loading?"Signing in…":"Sign In →"}
          </button>

        </div>
      </div>
    </div>
  );
}
