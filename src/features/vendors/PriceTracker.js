import { useState, useMemo } from "react";
import { S } from "../../shared/ui";

export function PriceTracker({ invoices }) {
  const [search,setSearch]=useState("");
  const priceMap=useMemo(()=>{
    const m={};
    invoices.forEach(inv=>inv.items.forEach(it=>{ if(!m[it.name]) m[it.name]=[]; m[it.name].push({vendorName:inv.vendorName,date:inv.date,unitPrice:it.unitPrice,invoiceNo:inv.invoiceNo}); }));
    Object.keys(m).forEach(k=>m[k].sort((a,b)=>new Date(b.date)-new Date(a.date)));
    return m;
  },[invoices]);
  const items=Object.keys(priceMap).filter(n=>n.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"13px 16px",marginBottom:18,display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:22}}>📈</span><div><div style={{color:"#10b981",fontWeight:700,fontSize:14}}>Smart Price Tracker</div><div style={{color:"#065f46",fontSize:13}}>Tracks every item across all vendors. Green = cheapest last price. Red = most expensive.</div></div></div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search items…" style={{...S.input,maxWidth:340,marginBottom:14}}/>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {items.map(name=>{
          const entries=priceMap[name];
          const latest={};
          entries.forEach(e=>{ if(!latest[e.vendorName]) latest[e.vendorName]=e; });
          const lp=Object.values(latest);
          const min=Math.min(...lp.map(e=>e.unitPrice));
          const max=Math.max(...lp.map(e=>e.unitPrice));
          const multi=lp.length>1;
          return (
            <div key={name} style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:8,background:"rgba(16,185,129,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📦</div><div><div style={{color:"#0f172a",fontWeight:700,fontSize:14}}>{name}</div><div style={{color:"#6b7280",fontSize:12}}>{lp.length} vendor{lp.length!==1?"s":""} · {entries.length} purchase{entries.length!==1?"s":""}</div></div></div>
                {multi&&max>min&&<div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:9,padding:"5px 12px",textAlign:"center"}}><div style={{color:"#10b981",fontSize:13,fontWeight:800}}>Save {((max-min)/max*100).toFixed(0)}%</div><div style={{color:"#166534",fontSize:11}}>vs most expensive</div></div>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap"}}>
                {lp.map((e,i)=>{
                  const cheap=e.unitPrice===min;
                  const most=multi&&e.unitPrice===max&&!cheap;
                  return (
                    <div key={e.vendorName} style={{flex:1,minWidth:160,padding:"12px 16px",borderRight:i<lp.length-1?"1px solid #e2e8f0":"none",background:cheap?"rgba(16,185,129,0.04)":most?"rgba(248,113,113,0.03)":"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{color:"#9ca3af",fontSize:12,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.vendorName}</span>
                        {cheap&&<span style={{background:"rgba(16,185,129,0.15)",color:"#10b981",borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>CHEAPEST</span>}
                        {most&&<span style={{background:"rgba(248,113,113,0.12)",color:"#f87171",borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>MOST EXP.</span>}
                      </div>
                      <div style={{color:cheap?"#10b981":most?"#f87171":"#374151",fontSize:22,fontWeight:800,marginBottom:3}}>${e.unitPrice.toFixed(2)}</div>
                      <div style={{color:"#374151",fontSize:11}}>{e.date} · {e.invoiceNo}</div>
                    </div>
                  );
                })}
              </div>
              {entries.length>1&&<div style={{borderTop:"1px solid rgba(255,255,255,0.1)",padding:"8px 16px",display:"flex",gap:8,flexWrap:"wrap"}}>
                {entries.map((e,i)=><div key={i} style={{background:"#f1f5f9",borderRadius:7,padding:"4px 10px",display:"flex",gap:8,fontSize:11}}><span style={{color:"#374151"}}>{e.date}</span><span style={{color:"#6b7280",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.vendorName}</span><span style={{color:"#374151",fontWeight:700}}>${e.unitPrice.toFixed(2)}</span></div>)}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
