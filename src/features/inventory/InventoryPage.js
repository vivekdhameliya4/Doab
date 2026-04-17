import { useState } from "react";
import { downloadCSV } from "../../shared/utils";
import { S, PageHeader, StatCard, FBtn, PBtn } from "../../shared/ui";
import { useProducts, LoadingScreen, DbError } from "../../hooks";
import { ProductModal } from "./ProductModal";

export function InventoryPage() {
  const { data: products, loading, error, save: saveDb } = useProducts();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [modal, setModal] = useState(null); // null | {mode:"add"|"edit", data?}
  const cats = ["All",...new Set(products.map(p=>p.category))];
  const filtered = products.filter(p=>(catFilter==="All"||p.category===catFilter)&&p.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter(p=>p.stock<=p.minStock);
  const saveProduct = async p => {
    await saveDb(p);
    setModal(null);
  };
  if(loading) return <LoadingScreen/>;
  if(error) return <DbError message={error}/>;
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Manage products, stock levels and pricing." action={
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>downloadCSV(`inventory_${new Date().toISOString().split('T')[0]}.csv`,
            ["Name","Category","Sell Price","Cost","Stock","Min Stock","Unit","Barcode"],
            products.map(p=>[p.name,p.category,p.price,p.cost,p.stock,p.minStock,p.unit,p.barcode])
          )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>
          <PBtn onClick={()=>setModal({mode:"add"})}>+ Add Product</PBtn>
        </div>}/>
      {lowStock.length>0&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:11,padding:"11px 16px",marginBottom:18,display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>⚠️</span><span style={{color:"#f59e0b",fontSize:13,fontWeight:600}}>{lowStock.length} items below minimum stock level: </span><span style={{color:"#9ca3af",fontSize:13}}>{lowStock.map(p=>p.name).join(", ")}</span></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        <StatCard icon="📦" label="Total Products" value={products.length} color="#4a7cf7"/>
        <StatCard icon="⚠️" label="Low Stock"      value={lowStock.length} color="#f59e0b"/>
        <StatCard icon="💰" label="Inventory Value" value={`$${products.reduce((s,p)=>s+p.cost*p.stock,0).toLocaleString()}`} color="#10b981"/>
        <StatCard icon="🏷" label="Categories"     value={new Set(products.map(p=>p.category)).size} color="#6366f1"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…" style={{...S.input,flex:1,minWidth:180}}/>
        {cats.map(c=><FBtn key={c} active={catFilter===c} onClick={()=>setCatFilter(c)}>{c}</FBtn>)}
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e2e8f0"}}>{["Product","Category","Price","Cost","Stock","Min","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((p,i)=>(
              <tr key={p.id} style={{borderBottom:i<filtered.length-1?"1px solid #e2e8f0":"none"}}>
                <td style={{...S.td,color:"#374151",fontWeight:600}}>{p.name}</td>
                <td style={S.td}><span style={{background:"rgba(99,102,241,0.12)",color:"#818cf8",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{p.category}</span></td>
                <td style={{...S.td,color:"#10b981",fontWeight:700}}>${p.price.toFixed(2)}</td>
                <td style={{...S.td,color:"#9ca3af"}}>${p.cost.toFixed(2)}</td>
                <td style={S.td}><span style={{color:p.stock<=p.minStock?"#f59e0b":"#9ca3af",fontWeight:700}}>{p.stock}</span></td>
                <td style={{...S.td,color:"#374151"}}>{p.minStock}</td>
                <td style={S.td}><span style={{background:p.stock<=p.minStock?"rgba(245,158,11,0.12)":"rgba(16,185,129,0.1)",color:p.stock<=p.minStock?"#f59e0b":"#10b981",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{p.stock<=p.minStock?"Low Stock":"In Stock"}</span></td>
                <td style={S.td}><button onClick={()=>setModal({mode:"edit",data:p})} style={{padding:"4px 10px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:7,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:600}}>✏️ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal&&<ProductModal initial={modal.data} onSave={saveProduct} onClose={()=>setModal(null)}/>}
    </div>
  );
}
