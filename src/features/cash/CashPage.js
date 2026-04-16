import { useState } from "react";
import { S, PageHeader, PBtn, Modal, TxtInput } from "../../shared/ui";
import { useCash, LoadingScreen, DbError } from "../../hooks";
import { CloseRegisterForm } from "./CloseRegisterForm";

export function CashPage() {
  const { data:sessions, loading, error, create:createSession, update:updateSession } = useCash();
  const [modal, setModal] = useState(null);
  const today = sessions.find(s=>s.status==="open");
  const closed = sessions.filter(s=>s.status==="closed");
  const close = async (id, data) => { await updateSession(id,{...data,status:"closed"}); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Cash Register" subtitle="Daily cash reconciliation and session management."/>
      {today ? (
        <div style={{background:"linear-gradient(135deg,#1e3a8a,#2563eb)",borderRadius:16,padding:"22px 24px",marginBottom:20,color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{opacity:0.7,fontSize:12,marginBottom:4}}>TODAY'S SESSION — OPEN</div>
              <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>{today.date}</div>
              <div style={{opacity:0.8,fontSize:13}}>Opened by {today.openedBy} · Float: ${today.openingFloat.toFixed(2)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,textAlign:"center"}}>
              {[["💳 Card Sales",`$${Number(today.cardSales||0).toFixed(2)}`],["💵 Cash Sales",`$${Number(today.cashSales||0).toFixed(2)}`],["📊 Total Sales",`$${Number(today.totalSales||0).toFixed(2)}`],["🏧 Expected Float",`$${(Number(today.openingFloat||0)+Number(today.cashSales||0)).toFixed(2)}`]].map(([l,v])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:14,fontWeight:800}}>{v}</div>
                  <div style={{fontSize:10,opacity:0.8}}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setModal(today)} style={{padding:"10px 20px",background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Close Register</button>
          </div>
        </div>
      ) : (
        <div style={{...S.card,padding:"20px 24px",marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}>🏧</div>
          <div style={{color:"#111827",fontWeight:700,fontSize:16,marginBottom:6}}>No open session today</div>
          <PBtn onClick={()=>{ createSession({date:new Date().toISOString().split("T")[0],openedBy:"Admin",openingFloat:200,closingFloat:null,totalSales:0,totalExpenses:0,cardSales:0,cashSales:0,variance:null,status:"open",notes:""}); }}>Open Register</PBtn>
        </div>
      )}
      <div style={{color:"#374151",fontWeight:700,fontSize:14,marginBottom:12}}>Past Sessions</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {closed.slice().reverse().map(s=>(
          <div key={s.id} style={{...S.card,padding:"14px 18px",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{color:"#111827",fontWeight:700,fontSize:14}}>{s.date}</div>
              <div style={{color:"#6b7280",fontSize:12}}>{s.openedBy} · Float: ${s.openingFloat} → ${s.closingFloat}</div>
            </div>
            {[["Sales",`$${Number(s.totalSales||0).toFixed(2)}`,"#059669"],["Card",`$${Number(s.cardSales||0).toFixed(2)}`,"#3b82f6"],["Cash",`$${Number(s.cashSales||0).toFixed(2)}`,"#f59e0b"],["Variance",s.variance!=null?(s.variance>=0?"+$"+Number(s.variance||0).toFixed(2):"−$"+Math.abs(Number(s.variance||0)).toFixed(2)):"—",s.variance<0?"#ef4444":"#059669"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center",minWidth:70}}>
                <div style={{color:c,fontWeight:700,fontSize:14}}>{v}</div>
                <div style={{color:"#9ca3af",fontSize:11}}>{l}</div>
              </div>
            ))}
            {s.notes&&<div style={{color:"#6b7280",fontSize:12,fontStyle:"italic"}}>"{s.notes}"</div>}
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Close Register" onClose={()=>setModal(null)}>
          <CloseRegisterForm session={modal} onClose={d=>close(modal.id,d)} onCancel={()=>setModal(null)}/>
        </Modal>
      )}
    </div>
  );
}
