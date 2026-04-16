import { useState } from "react";
import { S, Modal, TxtInput, Sel, PBtn } from "../../shared/ui";

export function RecipeModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [f,setF] = useState(initial?.id ? initial : {name:"",category:"Sandwiches",sellingPrice:0,ingredients:[],notes:""});
  const set = k=>v=>setF(x=>({...x,[k]:k==="sellingPrice"?Number(v):v}));
  const addIng = () => setF(x=>({...x,ingredients:[...x.ingredients,{productId:0,productName:"",qty:1,unit:"unit",costPer:0}]}));
  const updIng = (i,k,v) => setF(x=>({...x,ingredients:x.ingredients.map((ing,idx)=>idx===i?{...ing,[k]:k==="qty"||k==="costPer"?Number(v):v}:ing)}));
  const delIng = i => setF(x=>({...x,ingredients:x.ingredients.filter((_,idx)=>idx!==i)}));
  const cost = f.ingredients.reduce((s,i)=>s+i.qty*i.costPer,0);
  const valid = f.name.trim() && f.sellingPrice>0;
  return (
    <Modal title={isEdit?"Edit Recipe":"New Recipe"} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <TxtInput label="Recipe Name *" value={f.name} onChange={set("name")} placeholder="e.g. Classic Bagel"/>
        <Sel label="Category" value={f.category} onChange={set("category")} options={["Sandwiches","Breakfast","Salads","Drinks","Desserts","Other"]}/>
        <TxtInput label="Selling Price ($) *" value={f.sellingPrice||""} onChange={set("sellingPrice")} type="number" placeholder="0.00"/>
      </div>
      <TxtInput label="Notes" value={f.notes} onChange={set("notes")} placeholder="Serving notes…"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{color:"#374151",fontWeight:700,fontSize:13}}>Ingredients</div>
        <button onClick={addIng} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>+ Add</button>
      </div>
      {f.ingredients.map((ing,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.6fr 0.6fr 1fr 28px",gap:8,marginBottom:7,alignItems:"center"}}>
          <input value={ing.productName} onChange={e=>updIng(i,"productName",e.target.value)} placeholder="Ingredient" style={S.input}/>
          <input value={ing.qty||""} onChange={e=>updIng(i,"qty",e.target.value)} type="number" min="0" step="0.01" placeholder="Qty" style={S.input}/>
          <input value={ing.unit} onChange={e=>updIng(i,"unit",e.target.value)} placeholder="unit" style={S.input}/>
          <div style={{position:"relative"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11}}>$</span><input value={ing.costPer||""} onChange={e=>updIng(i,"costPer",e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{...S.input,paddingLeft:18}}/></div>
          <button onClick={()=>delIng(i)} style={{width:28,height:28,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      ))}
      {f.sellingPrice>0 && (
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",gap:20}}>
          {[["Food Cost",`$${cost.toFixed(2)}`],["Profit",`$${(f.sellingPrice-cost).toFixed(2)}`],["Margin",`${f.sellingPrice>0?((f.sellingPrice-cost)/f.sellingPrice*100).toFixed(1):0}%`]].map(([l,v])=>(
            <div key={l}><div style={{color:"#059669",fontWeight:700,fontSize:14}}>{v}</div><div style={{color:"#6b7280",fontSize:11}}>{l}</div></div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{isEdit?"Save Changes":"Add Recipe"}</PBtn>
      </div>
    </Modal>
  );
}
