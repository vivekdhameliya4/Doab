import { Modal, TxtInput, Sel, PBtn } from "../../shared/ui";
import { useState } from "react";

export function ProductModal({ initial, onSave, onClose }) {
  const cats = ["Dairy","Bakery","Beverages","Snacks","Produce","Household","Other"];
  const [f,setF]=useState(initial||{name:"",category:"Dairy",price:0,cost:0,stock:0,minStock:5,unit:"unit",barcode:""});
  const set=k=>v=>setF(x=>({...x,[k]:k==="price"||k==="cost"||k==="stock"||k==="minStock"?Number(v):v}));
  const valid=f.name.trim()&&f.price>=0&&f.stock>=0;
  return (
    <Modal title={initial?"Edit Product":"Add Product"} onClose={onClose}>
      <TxtInput label="Product Name *" value={f.name} onChange={set("name")} placeholder="e.g. Whole Milk 1L"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Sel label="Category" value={f.category} onChange={set("category")} options={cats}/>
        <TxtInput label="Unit" value={f.unit} onChange={set("unit")} placeholder="bottle, kg…"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Sell Price *" value={f.price} onChange={set("price")} type="number" placeholder="0.00"/>
        <TxtInput label="Cost Price"   value={f.cost}  onChange={set("cost")}  type="number" placeholder="0.00"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <TxtInput label="Current Stock *" value={f.stock}    onChange={set("stock")}    type="number" placeholder="0"/>
        <TxtInput label="Min Stock Alert" value={f.minStock} onChange={set("minStock")} type="number" placeholder="5"/>
      </div>
      <TxtInput label="Barcode" value={f.barcode} onChange={set("barcode")} placeholder="001"/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>
        <PBtn onClick={()=>valid&&onSave(f)} disabled={!valid}>{initial?"Save Changes":"Add Product"}</PBtn>
      </div>
    </Modal>
  );
}
