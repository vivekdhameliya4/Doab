import { useState } from "react";
import { downloadCSV } from "../../shared/utils";
import { S, PageHeader, StatCard, Avatar, PBtn } from "../../shared/ui";
import { useCustomers, LoadingScreen, DbError } from "../../hooks";
import { CustomerModal } from "./CustomerModal";

export function CustomersPage() {
  const { data:customers, loading, error, save:saveDb } = useCustomers();
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState(null);
  const filtered=customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)||c.email.toLowerCase().includes(search.toLowerCase()));
  const save=async c=>{ await saveDb(c); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Customers & Loyalty" subtitle="Manage customer profiles and loyalty points." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadCSV(`customers_${new Date().toISOString().split('T')[0]}.csv`,
            ["Name","Phone","Email","Loyalty Points","Total Spent","Visits","Joined"],
            customers.map(c=>[c.name,c.phone,c.email,c.loyaltyPts,c.totalSpent,c.visits,c.joined])
          )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Add Customer</PBtn>
        </div>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="🧑‍🤝‍🧑" label="Total Customers" value={customers.length} color="#f59e0b"/>
        <StatCard icon="⭐" label="Total Loyalty Pts" value={customers.reduce((s,c)=>s+c.loyaltyPts,0).toLocaleString()} color="#e87c2b"/>
        <StatCard icon="💰" label="Total Customer Revenue" value={`$${customers.reduce((s,c)=>s+c.totalSpent,0).toLocaleString()}`} color="#10b981"/>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search customers…" style={{...S.input,maxWidth:340,marginBottom:14}}/>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Customer","Phone","Loyalty Pts","Total Spent","Visits","Joined",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id} style={{borderBottom:i<filtered.length-1?"1px solid #e2e8f0":"none"}}>
                <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:9}}><Avatar initials={c.name.split(" ").map(w=>w[0]).join("")} size={30}/><div><div style={{color:"#374151",fontWeight:600,fontSize:13}}>{c.name}</div><div style={{color:"#6b7280",fontSize:11}}>{c.email}</div></div></div></td>
                <td style={{...S.td,color:"#9ca3af"}}>{c.phone}</td>
                <td style={S.td}><span style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",borderRadius:20,padding:"2px 9px",fontSize:12,fontWeight:700}}>⭐ {c.loyaltyPts}</span></td>
                <td style={{...S.td,color:"#10b981",fontWeight:700}}>${c.totalSpent.toFixed(2)}</td>
                <td style={{...S.td,color:"#9ca3af"}}>{c.visits}</td>
                <td style={{...S.td,color:"#6b7280",fontSize:12}}>{c.joined}</td>
                <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:c})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<CustomerModal initial={modal.data} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
