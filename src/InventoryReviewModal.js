import { useState } from "react";
import { Modal, PBtn } from "./shared/ui";

export function InventoryReviewModal({ review, onConfirm, onSkip }) {
  const [items, setItems] = useState(review.items);
  const upd = (i, k, v) => setItems(is => is.map((it,idx) => idx===i ? {...it,[k]:v} : it));
  const anyIncluded = items.some(it => it.include);

  return (
    <Modal title={`📦 Update Inventory — Invoice ${review.invoiceNo}`} onClose={onSkip} wide>
      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#1e40af"}}>
        ✅ Invoice saved! Review the items below and choose what to add/update in your inventory.
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {items.map((item, i) => (
          <div key={i} style={{
            background: item.include ? "#f8fafc" : "#fafafa",
            border: `1px solid ${item.include ? "#e5e9f0" : "#f1f5f9"}`,
            borderRadius: 12, padding: "12px 14px",
            opacity: item.include ? 1 : 0.5,
          }}>
            {/* Header row */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:item.include?10:0}}>
              <input type="checkbox" checked={item.include} onChange={e=>upd(i,"include",e.target.checked)}
                style={{width:16,height:16,cursor:"pointer",accentColor:"#3b82f6"}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{color:"#111827",fontWeight:700,fontSize:14}}>{item.name}</span>
                  {item.existing
                    ? <span style={{background:"#d1fae5",color:"#065f46",borderRadius:20,padding:"1px 9px",fontSize:10,fontWeight:700}}>✓ In Inventory</span>
                    : <span style={{background:"#fef3c7",color:"#92400e",borderRadius:20,padding:"1px 9px",fontSize:10,fontWeight:700}}>+ New Item</span>
                  }
                </div>
                <div style={{color:"#9ca3af",fontSize:11,marginTop:2}}>
                  {item.qty} {item.unit} @ ${item.unitPrice.toFixed(2)} each
                  {item.existing && <> · Current cost: <strong style={{color:"#f59e0b"}}>${Number(item.existing.cost||0).toFixed(2)}</strong></>}
                  {item.existing && Number(item.existing.cost) !== item.unitPrice &&
                    <span style={{color:"#dc2626",fontWeight:600}}> → will update to ${item.unitPrice.toFixed(2)}</span>
                  }
                </div>
              </div>
            </div>

            {/* Expanded options when included */}
            {item.include && (
              <div style={{paddingLeft:26}}>
                {/* Add stock option */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"8px 12px",background:"#fff",borderRadius:8,border:"1px solid #e5e9f0"}}>
                  <input type="checkbox" checked={item.addToStock} onChange={e=>upd(i,"addToStock",e.target.checked)}
                    style={{width:14,height:14,cursor:"pointer",accentColor:"#059669"}}/>
                  <span style={{color:"#374151",fontSize:12,fontWeight:600}}>Add stock quantity</span>
                  {item.addToStock && (
                    <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
                      <span style={{color:"#6b7280",fontSize:12}}>Qty to add:</span>
                      <input type="number" value={item.stockQty||""} min="0"
                        onChange={e=>upd(i,"stockQty",Number(e.target.value))}
                        style={{width:70,padding:"4px 8px",border:"1px solid #e5e9f0",borderRadius:6,fontSize:12,textAlign:"center"}}/>
                      <span style={{color:"#6b7280",fontSize:11}}>{item.unit}</span>
                    </div>
                  )}
                </div>

                {/* New item extra fields */}
                {!item.existing && (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div>
                      <div style={{color:"#6b7280",fontSize:10,fontWeight:600,marginBottom:3}}>CATEGORY</div>
                      <select value={item.category} onChange={e=>upd(i,"category",e.target.value)}
                        style={{width:"100%",padding:"5px 8px",border:"1px solid #e5e9f0",borderRadius:7,fontSize:12,background:"#fff"}}>
                        {["Dairy","Bakery","Beverages","Snacks","Produce","Household","Other"].map(c=>(
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{color:"#6b7280",fontSize:10,fontWeight:600,marginBottom:3}}>SELL PRICE ($)</div>
                      <input type="number" value={item.sellPrice||""} min="0" step="0.01"
                        onChange={e=>upd(i,"sellPrice",Number(e.target.value))}
                        style={{width:"100%",padding:"5px 8px",border:"1px solid #e5e9f0",borderRadius:7,fontSize:12}}/>
                    </div>
                    <div>
                      <div style={{color:"#6b7280",fontSize:10,fontWeight:600,marginBottom:3}}>MIN STOCK</div>
                      <input type="number" value={item.minStock||""} min="0"
                        onChange={e=>upd(i,"minStock",Number(e.target.value))}
                        style={{width:"100%",padding:"5px 8px",border:"1px solid #e5e9f0",borderRadius:7,fontSize:12}}/>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onSkip}
          style={{padding:"9px 18px",background:"transparent",border:"1px solid #e5e9f0",borderRadius:9,color:"#6b7280",fontSize:13,cursor:"pointer",fontWeight:600}}>
          Skip — Don't Update Inventory
        </button>
        <PBtn onClick={()=>onConfirm(items)} disabled={!anyIncluded}>
          ✅ Confirm & Update Inventory ({items.filter(it=>it.include).length} items)
        </PBtn>
      </div>
    </Modal>
  );
}
