import { useState } from "react";
import { SEED_PRODUCTS } from "../../shared/constants";
import { S, PageHeader } from "../../shared/ui";

export function ReorderPage() {
  const products = SEED_PRODUCTS;
  const low = products.filter(p=>p.stock<=p.minStock);
  const [orders, setOrders] = useState({});
  const setQty = (id,qty) => setOrders(o=>({...o,[id]:qty}));
  return (
    <div>
      <PageHeader title="Reorder Alerts" subtitle="Products below minimum stock level — create purchase orders quickly."/>
      {low.length===0 ? (
        <div style={{...S.card,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{color:"#059669",fontWeight:700,fontSize:16}}>All stock levels are healthy!</div>
          <div style={{color:"#9ca3af",fontSize:13,marginTop:4}}>No products are below their minimum stock level.</div>
        </div>
      ) : (
        <>
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 18px",marginBottom:18,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div><div style={{color:"#92400e",fontWeight:700,fontSize:13}}>{low.length} item{low.length!==1?"s":""} need reordering</div><div style={{color:"#78350f",fontSize:12}}>Set quantities below and create a purchase order, or order individually.</div></div>
          </div>
          <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Product","Category","In Stock","Min Level","Shortage","Suggested Order",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {low.map((p,i)=>{
                  const shortage = p.minStock-p.stock;
                  const suggested = Math.ceil(p.minStock*2-p.stock);
                  return (
                    <tr key={p.id} style={{borderBottom:i<low.length-1?"1px solid #e5e9f0":"none"}}>
                      <td style={{...S.td,fontWeight:600,color:"#111827"}}>{p.name}</td>
                      <td style={S.td}><span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{p.category}</span></td>
                      <td style={{...S.td,color:"#ef4444",fontWeight:700}}>{p.stock} {p.unit}</td>
                      <td style={{...S.td,color:"#6b7280"}}>{p.minStock}</td>
                      <td style={{...S.td,color:"#f97316",fontWeight:600}}>-{shortage}</td>
                      <td style={S.td}>
                        <input type="number" defaultValue={suggested} onChange={e=>setQty(p.id,Number(e.target.value))}
                          style={{...S.input,width:80,padding:"5px 8px",fontSize:12}}/>
                      </td>
                      <td style={S.td}><button style={{padding:"5px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,color:"#059669",fontSize:11,cursor:"pointer",fontWeight:600}}>Order Now</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
