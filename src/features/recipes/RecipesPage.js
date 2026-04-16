import { useState } from "react";
import { S, PageHeader, PBtn } from "../../shared/ui";
import { useRecipes, LoadingScreen, DbError } from "../../hooks";
import { RecipeModal } from "./RecipeModal";

export function RecipesPage() {
  const { data:recipes, loading, error, save:saveDb } = useRecipes();
  const [modal, setModal] = useState(null);
  const save = async r => { await saveDb(r); setModal(null); };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Recipes & Menu Costing" subtitle="Build recipes from your inventory and track profit margins." action={<PBtn onClick={()=>setModal({})}>+ New Recipe</PBtn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {recipes.map(r=>{
          const cost = r.ingredients.reduce((s,i)=>s+(i.qty*i.costPer),0);
          const margin = r.sellingPrice>0?((r.sellingPrice-cost)/r.sellingPrice*100):0;
          const profit = r.sellingPrice-cost;
          return (
            <div key={r.id} style={{...S.card,padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{color:"#111827",fontWeight:700,fontSize:15}}>{r.name}</div>
                  <span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{r.category}</span>
                </div>
                <button onClick={()=>setModal(r)} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {[["Sell Price",`$${r.sellingPrice.toFixed(2)}`,"#111827"],["Food Cost",`$${cost.toFixed(2)}`,"#ef4444"],["Profit",`$${profit.toFixed(2)}`,"#059669"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#f8fafc",borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{color:c,fontSize:14,fontWeight:800}}>{v}</div>
                    <div style={{color:"#9ca3af",fontSize:10}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:margin>=60?"#f0fdf4":margin>=40?"#fffbeb":"#fef2f2",border:`1px solid ${margin>=60?"#bbf7d0":margin>=40?"#fde68a":"#fecaca"}`,borderRadius:8,padding:"6px 12px",textAlign:"center",marginBottom:10}}>
                <span style={{color:margin>=60?"#059669":margin>=40?"#92400e":"#dc2626",fontWeight:700,fontSize:13}}>
                  {margin.toFixed(1)}% margin {margin>=60?"🟢":margin>=40?"🟡":"🔴"}
                </span>
              </div>
              <div style={{borderTop:"1px solid #e5e9f0",paddingTop:10}}>
                <div style={{color:"#6b7280",fontSize:11,marginBottom:6,fontWeight:600}}>INGREDIENTS</div>
                {r.ingredients.map((ing,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:"#374151"}}>{ing.productName}</span>
                    <span style={{color:"#9ca3af"}}>{ing.qty} {ing.unit} · ${(ing.qty*ing.costPer).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {modal!==null && <RecipeModal initial={modal} onSave={save} onClose={()=>setModal(null)}/>}
    </div>
  );
}
