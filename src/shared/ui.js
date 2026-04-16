import { useState } from "react";
import { ROLE_COLORS } from "./constants";

export const S = {
  card:  { background:"#ffffff", border:"1px solid #e5e9f0", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  input: { width:"100%", background:"#f8fafc", border:"1px solid #e5e9f0", borderRadius:9, padding:"9px 12px", color:"#111827", fontSize:13, outline:"none", boxSizing:"border-box" },
  th:    { padding:"11px 14px", textAlign:"left", color:"#6b7280", fontSize:11, fontWeight:600, letterSpacing:"0.8px", textTransform:"uppercase", background:"#f8fafc" },
  td:    { padding:"13px 14px", fontSize:13 },
};
export const Avatar = ({ initials, size=36 }) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.33,fontWeight:700,flexShrink:0}}>{initials}</div>
);
export const RoleBadge = ({ role }) => {
  const c=ROLE_COLORS[role]||{bg:"#f0f0f0",text:"#666",dot:"#999"};
  return <span style={{background:c.bg,color:c.text,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:c.dot,display:"inline-block"}}/>{role}</span>;
};
export const Pill = ({ active }) => (
  <span style={{background:active?"#dcfce7":"#fef2f2",color:active?"#15803d":"#dc2626",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>{active?"● Active":"○ Inactive"}</span>
);
export const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{...S.card,padding:"16px 18px",display:"flex",gap:12,alignItems:"center"}}>
    <div style={{width:42,height:42,borderRadius:10,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div>
    <div><div style={{color:"#111827",fontSize:21,fontWeight:800}}>{value}</div><div style={{color:"#6b7280",fontSize:12}}>{label}</div>{sub&&<div style={{color:"#9ca3af",fontSize:11}}>{sub}</div>}</div>
  </div>
);
export const PageHeader = ({ title, subtitle, action }) => (
  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
    <div><h1 style={{color:"#111827",fontSize:23,fontWeight:800,margin:0,letterSpacing:"-0.3px"}}>{title}</h1>{subtitle&&<p style={{color:"#6b7280",fontSize:14,marginTop:4,marginBottom:0}}>{subtitle}</p>}</div>
    {action&&<div style={{display:"flex",gap:8}}>{action}</div>}
  </div>
);
export const FBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{padding:"8px 14px",borderRadius:9,border:"1px solid",borderColor:active?"#3b82f6":"#e5e9f0",background:active?"#eff6ff":"#ffffff",color:active?"#1d4ed8":"#6b7280",fontSize:13,cursor:"pointer",fontWeight:600}}>{children}</button>
);
export const PBtn = ({ onClick, children, color="#3b82f6", disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{padding:"9px 18px",background:disabled?"#e5e9f0":`linear-gradient(135deg,#1e3a8a,${color})`,border:"none",borderRadius:9,color:disabled?"#9ca3af":"#ffffff",fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",boxShadow:disabled?"none":"0 4px 12px rgba(59,130,246,0.25)"}}>{children}</button>
);
export const TxtInput = ({ label, value, onChange, placeholder, type="text", style:sx }) => (
  <div style={{marginBottom:13,...sx}}>
    {label&&<div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} style={{...S.input}}/>
  </div>
);
export const Sel = ({ label, value, onChange, options, style:sx }) => (
  <div style={{marginBottom:13,...sx}}>
    {label&&<div style={{color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{...S.input}}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select>
  </div>
);
export const Modal = ({ title, onClose, children, wide }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"16px"}}
    onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div style={{background:"#ffffff",border:"1px solid #e5e9f0",borderRadius:18,boxShadow:"0 20px 60px rgba(15,23,42,0.2)",width:"100%",maxWidth:wide?700:460,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 0"}}>
        <div style={{color:"#111827",fontSize:16,fontWeight:800}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#9ca3af",fontSize:20,cursor:"pointer",lineHeight:1,padding:4}}>✕</button>
      </div>
      <div style={{padding:"14px 22px 28px"}}>{children}</div>
    </div>
  </div>
);
export const Spinner = () => (
  <div style={{width:15,height:15,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>
);
