import { useState } from "react";
import { SEED_PRODUCTS } from "../../shared/constants";
import { S, PageHeader, FBtn, PBtn } from "../../shared/ui";

export function POSPage() {
  const [products]  = useState(SEED_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [paid, setPaid] = useState(false);
  const [catFilter, setCatFilter] = useState("All");
  const cats = ["All",...new Set(products.map(p=>p.category))];
  const filtered = products.filter(p=>(catFilter==="All"||p.category===catFilter)&&(p.name.toLowerCase().includes(search.toLowerCase())));
  const addToCart = p => { setCart(c=>{ const ex=c.find(x=>x.id===p.id); return ex?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}]; }); };
  const setQty = (id,qty) => { if(qty<=0){setCart(c=>c.filter(x=>x.id!==id));}else{setCart(c=>c.map(x=>x.id===id?{...x,qty}:x));} };
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const tax = subtotal*0.07;
  const total = subtotal+tax;
  if(paid) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
      <div style={{fontSize:56,marginBottom:16}}>✅</div>
      <div style={{color:"#10b981",fontSize:22,fontWeight:800,marginBottom:6}}>Payment Successful!</div>
      <div style={{color:"#6b7280",fontSize:14,marginBottom:24}}>Total charged: <strong style={{color:"#0f172a"}}>${total.toFixed(2)}</strong></div>
      <PBtn onClick={()=>{setCart([]);setPaid(false);}}>Start New Sale</PBtn>
    </div>
  );
  return (
    <div style={{display:"grid",gridTemplateColumns:"min(100%,1fr) min(100%,360px)",gap:20,flexWrap:"wrap"}}>
      <div style={{display:"flex",flexDirection:"column",gap:14,overflow:"hidden"}}>
        <PageHeader title="Point of Sale" subtitle="Select products to add to cart."/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…" style={{...S.input,flex:1,minWidth:160}}/>
          {cats.map(c=><FBtn key={c} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</FBtn>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,overflowY:"auto"}}>
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>addToCart(p)} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#93c5fd"} onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e9f0"}>
              <div style={{color:"#374151",fontSize:11,marginBottom:4}}>{p.category}</div>
              <div style={{color:"#374151",fontSize:14,fontWeight:700,marginBottom:4}}>{p.name}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{color:"#10b981",fontSize:16,fontWeight:800}}>${p.price.toFixed(2)}</div>
                <div style={{color:p.stock<10?"#f59e0b":"#cbd5e1",fontSize:11}}>Stock: {p.stock}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div style={{...S.card,padding:"18px",display:"flex",flexDirection:"column",height:"fit-content",maxHeight:"calc(100vh - 80px)",overflowY:"auto",position:"sticky",top:0}}>
        <div style={{color:"#0f172a",fontSize:15,fontWeight:800,marginBottom:14}}>🛒 Cart <span style={{color:"#6b7280",fontWeight:400,fontSize:12}}>({cart.length} items)</span></div>
        {cart.length===0&&<div style={{color:"#374151",fontSize:13,textAlign:"center",padding:"30px 0"}}>Cart is empty.<br/>Click products to add.</div>}
        {cart.map(item=>(
          <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 0",borderBottom:"1px solid #e2e8f0"}}>
            <div style={{flex:1}}><div style={{color:"#374151",fontSize:13,fontWeight:600}}>{item.name}</div><div style={{color:"#6b7280",fontSize:12}}>${item.price.toFixed(2)} ea.</div></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setQty(item.id,item.qty-1)} style={{width:24,height:24,borderRadius:6,background:"#374151",border:"none",color:"#374151",cursor:"pointer",fontSize:14}}>−</button>
              <span style={{color:"#374151",fontSize:13,fontWeight:700,minWidth:20,textAlign:"center"}}>{item.qty}</span>
              <button onClick={()=>setQty(item.id,item.qty+1)} style={{width:24,height:24,borderRadius:6,background:"#374151",border:"none",color:"#374151",cursor:"pointer",fontSize:14}}>+</button>
            </div>
            <div style={{color:"#10b981",fontSize:13,fontWeight:700,minWidth:52,textAlign:"right"}}>${(item.price*item.qty).toFixed(2)}</div>
          </div>
        ))}
        {cart.length>0&&(<>
          <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:12,marginTop:4}}>
            {[["Subtotal",`$${subtotal.toFixed(2)}`],["Tax (7%)",`$${tax.toFixed(2)}`],["Total",`$${total.toFixed(2)}`]].map(([l,v],i)=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:i===2?"#0f172a":"#9ca3af",fontSize:i===2?15:13,fontWeight:i===2?800:400}}>{l}</span><span style={{color:i===2?"#10b981":"#9ca3af",fontSize:i===2?17:13,fontWeight:700}}>{v}</span></div>
            ))}
          </div>
          <button onClick={()=>setPaid(true)} style={{marginTop:12,width:"100%",padding:"13px",background:"linear-gradient(135deg,#064e3b,#10b981)",border:"none",borderRadius:10,color:"#d1fae5",fontSize:14,fontWeight:700,cursor:"pointer"}}>💳 Charge ${total.toFixed(2)}</button>
          <button onClick={()=>setCart([])} style={{marginTop:8,width:"100%",padding:"8px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:9,color:"#6b7280",fontSize:12,cursor:"pointer"}}>Clear Cart</button>
        </>)}
      </div>
    </div>
  );
}
