import { useState } from "react";
import { PageHeader, PBtn } from "../../shared/ui";
import { useVendors, useInvoices, useProducts, LoadingScreen, DbError } from "../../hooks";
import { VendorList } from "./VendorList";
import { InvoiceList } from "./InvoiceList";
import { PriceTracker } from "./PriceTracker";
import { VendorModal } from "./VendorModal";
import { VendorDetail } from "./VendorDetail";
import { InvoiceModal } from "./InvoiceModal";
import { InventoryReviewModal } from "../../InventoryReviewModal";

export function VendorsPage() {
  const { data:vendors, save:saveVendorDb, loading:vLoading, error:vError } = useVendors();
  const { data:invoices, save:saveInvoiceDb } = useInvoices();
  const { data:products, save:saveProduct } = useProducts();
  const [tab,        setTab]       = useState("vendors");
  const [vModal,     setVModal]    = useState(null);
  const [iModal,     setIModal]    = useState(null);
  const [detailV,    setDetailV]   = useState(null);
  const [invReview,  setInvReview] = useState(null); // inventory review after invoice save

  const saveVendor = async v => { await saveVendorDb(v); setVModal(null); setDetailV(null); };

  const saveInvoice = async iv => {
    await saveInvoiceDb(iv);
    setIModal(null);

    // Build list of items to review for inventory
    const reviewItems = (iv.items || []).map(item => {
      const name = item.name?.trim();
      if (!name) return null;
      const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
      return {
        name,
        unit: item.unit || "unit",
        unitPrice: Number(item.unitPrice) || 0,
        qty: Number(item.qty) || 0,
        existing: existing || null,
        // default: add to inventory / update price
        include: true,
        addToStock: !existing, // only add stock for new items by default
        stockQty: !existing ? Number(item.qty) || 0 : 0,
        category: existing?.category || "Other",
        sellPrice: existing?.price || Number(item.unitPrice) * 1.4 || 0,
        minStock: existing?.minStock || 5,
      };
    }).filter(Boolean);

    if (reviewItems.length > 0) {
      setInvReview({ items: reviewItems, invoiceNo: iv.invoiceNo });
    }
  };

  const confirmInventory = async (reviewItems) => {
    for (const item of reviewItems) {
      if (!item.include) continue;
      if (item.existing) {
        // Update cost price (and optionally stock)
        const updated = { ...item.existing, cost: item.unitPrice };
        if (item.addToStock) updated.stock = Number(item.existing.stock||0) + Number(item.stockQty||0);
        await saveProduct(updated);
      } else {
        // New product
        await saveProduct({
          name: item.name, category: item.category,
          price: Number(item.sellPrice) || Number(item.unitPrice)*1.4,
          cost: Number(item.unitPrice),
          stock: item.addToStock ? Number(item.stockQty||0) : 0,
          minStock: Number(item.minStock) || 5,
          unit: item.unit, barcode:"",
        });
      }
    }
    setInvReview(null);
  };

  const TABS=[{key:"vendors",label:"Vendors",icon:"🏭"},{key:"invoices",label:"Invoices",icon:"🧾"},{key:"prices",label:"Price Tracker",icon:"📈"}];

  if (vLoading) return <LoadingScreen/>;
  if (vError) return <DbError message={vError}/>;

  return (
    <div>
      <PageHeader title="Vendors & Invoices" subtitle="Manage suppliers, track invoices and compare item prices."
        action={tab==="vendors"?<PBtn onClick={()=>setVModal({mode:"add"})}>+ Add Vendor</PBtn>:tab==="invoices"?<PBtn onClick={()=>setIModal({mode:"add"})}>+ Add Invoice</PBtn>:null}/>
      <div style={{display:"flex",gap:5,marginBottom:22,background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:11,padding:4,width:"fit-content"}}>
        {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",background:tab===t.key?"linear-gradient(135deg,#1e3a8a,#2563eb)":"transparent",color:tab===t.key?"#ffffff":"#6b7280",fontWeight:tab===t.key?700:400,fontSize:13,boxShadow:tab===t.key?"0 2px 8px rgba(37,99,235,0.3)":"none"}}><span>{t.icon}</span>{t.label}</button>)}
      </div>
      {tab==="vendors"  && <VendorList vendors={vendors} invoices={invoices} onSelect={setDetailV} onEdit={v=>setVModal({mode:"edit",data:v})}/>}
      {tab==="invoices" && <InvoiceList invoices={invoices} vendors={vendors} onEdit={iv=>setIModal({mode:"edit",data:iv})}/>}
      {tab==="prices"   && <PriceTracker invoices={invoices}/>}
      {vModal  && <VendorModal  initial={vModal.data}  onSave={saveVendor}  onClose={()=>setVModal(null)} existingVendors={vendors}/>}
      {iModal  && <InvoiceModal vendors={vendors} products={products} allInvoices={invoices} initial={iModal.data} onSave={saveInvoice} onClose={()=>setIModal(null)}
      onAddVendor={async (v,cb)=>{
        const saved = await saveVendorDb({...v,status:"active"});
        const newId = saved?.id || Date.now();
        if(cb) cb(String(newId));
      }}
    />}
      {detailV && <VendorDetail vendor={detailV} invoices={invoices.filter(i=>i.vendorId===detailV.id)} onEdit={()=>{setVModal({mode:"edit",data:detailV});setDetailV(null);}} onClose={()=>setDetailV(null)}/>}
      {invReview && <InventoryReviewModal review={invReview} onConfirm={confirmInventory} onSkip={()=>setInvReview(null)}/>}
    </div>
  );
}
