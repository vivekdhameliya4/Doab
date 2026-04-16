import { useState } from "react";
import { API_URL } from "../../shared/utils";
import { S, Modal, TxtInput, PBtn, Spinner } from "../../shared/ui";
import { ItemNameInput } from "./ItemNameInput";

export function InvoiceModal({ vendors, products = [], allInvoices = [], initial, onSave, onClose, onAddVendor }) {
  const isEdit=!!initial;
  // ── state ──
  const [step,             setStep]          = useState(isEdit?2:1);
  const [vendorId,         setVendorId]      = useState(initial?String(initial.vendorId):"");
  const [invoiceNo,        setInvoiceNo]     = useState(initial?.invoiceNo||"");
  const [date,             setDate]          = useState(initial?.date||new Date().toISOString().split("T")[0]);
  const [items,            setItems]         = useState(initial?.items||[]);
  const [fileB64,          setFileB64]       = useState(null);
  const [fileType,         setFileType]      = useState("image/jpeg");
  const [isPdf,            setIsPdf]         = useState(false);
  const [preview,          setPreview]       = useState(null);
  const [drag,             setDrag]          = useState(false);
  const [loading,          setLoading]       = useState(false);
  const [hint,             setHint]          = useState("");
  const [suggested,        setSuggested]     = useState({});
  // New vendor confirmation prompt
  const [newVendorPrompt,  setNewVendorPrompt] = useState(null); // { name, category }

  // ── VALIDATION ──
  const vOk  = vendorId !== "" && (vendors.some(v=>String(v.id)===String(vendorId)) || vendorId.length > 0);
  const isDupInvoice = !isEdit && invoiceNo.trim() && allInvoices?.some(i => i.invoiceNo?.trim().toLowerCase() === invoiceNo.trim().toLowerCase());
  const nOk  = invoiceNo.trim().length > 0 && !isDupInvoice;
  const dOk  = date.length > 0;
  const iOk  = items.length > 0 && items.every(it => it.name?.trim() && Number(it.qty) > 0 && Number(it.unitPrice) >= 0);
  const valid = vOk && nOk && dOk && iOk;
  const validationMsg = !vOk?"⚠ Select a vendor":!nOk?"⚠ Enter invoice number":!dOk?"⚠ Set a date":!iOk?"⚠ Add at least one item with name + qty":"";

  // ── file handling ──
  const handleFile = file => {
    if (!file) return;
    const pdf=file.type==="application/pdf";
    const img=file.type.startsWith("image/");
    if(!pdf&&!img){setHint("Please upload a JPG, PNG, WEBP image or PDF.");return;}
    setHint(""); setIsPdf(pdf); setFileType(file.type);
    setFileSize((file.size / 1024 / 1024).toFixed(1));
    const r=new FileReader();
    r.onload=e=>{const d=e.target.result;setFileB64(d.split(",")[1]);if(!pdf)setPreview(d);else setPreview(null);};
    r.readAsDataURL(file);
  };

  const [fileSize, setFileSize] = useState(null);

  // ── Save image to persistent storage ──────────────────────────────────────
  const saveImageToStorage = async (invoiceKey, dataUrl) => {
    try {
      await window.storage.set(`invoice-img:${invoiceKey}`, dataUrl);
    } catch(e) {  }
  };

  // ── Compress image ─────────────────────────────────────────────────────────
  const compressImage = (dataUrl, maxPx=1400, quality=0.88) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve({ b64: out.split(",")[1], dataUrl: out, type: "image/jpeg" });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });

  // ── AI scan — uses correct artifact API model ──────────────────────────────
  const scan = async () => {
    if (!fileB64) { setHint("Please upload a file first."); return; }
    setLoading(true); setHint("");

    try {
      // Compress image first
      let b64 = fileB64;
      let mimeType = fileType;
      let compressedDataUrl = preview;

      if (!isPdf && preview) {
        const c = await compressImage(preview);
        if (c) { b64 = c.b64; mimeType = c.type; compressedDataUrl = c.dataUrl; }
      }

      // Save image to storage for future access (keyed by timestamp)
      const imgKey = `scan-${Date.now()}`;
      if (compressedDataUrl) saveImageToStorage(imgKey, compressedDataUrl);

      const imageBlock = { type:"image", source:{ type:"base64", media_type: mimeType, data: b64 } };

      // ── Step 1: Extract raw text/data from invoice ──────────────────────────
      const step1 = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: [
              imageBlock,
              { type:"text", text:`Look at this invoice image. List every line item you can see.
For EACH item write one line exactly like this:
ITEM: <product name> | QTY: <number> | UNIT: <unit> | UNIT_PRICE: <number> | LINE_TOTAL: <number>

Then at the end write:
INVOICE_NO: <number or blank>
DATE: <YYYY-MM-DD or blank>
VENDOR: <company name or blank>

Rules:
- UNIT_PRICE is the price for ONE unit only
- LINE_TOTAL is qty × unit_price
- If you only see a line total (not unit price), calculate: UNIT_PRICE = LINE_TOTAL / QTY
- Write plain numbers only — no $ signs, no commas
- List EVERY item, do not skip any` }
            ]
          }]
        })
      });

      if (!step1.ok) {
        const t = await step1.text();
        throw new Error(`API ${step1.status}: ${t.slice(0,300)}`);
      }

      const d1 = await step1.json();
      if (d1.error) throw new Error(d1.error.message || JSON.stringify(d1.error));
      const rawText = (d1.content || []).map(b => b.text||"").join("").trim();

      // ── Step 2: Parse the structured text into JSON ─────────────────────────
      const step2 = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [
            { role:"user", content: [imageBlock, { type:"text", text:`Look at this invoice image. List every line item you can see.
For EACH item write one line exactly like this:
ITEM: <product name> | QTY: <number> | UNIT: <unit> | UNIT_PRICE: <number> | LINE_TOTAL: <number>

Then at the end write:
INVOICE_NO: <number or blank>
DATE: <YYYY-MM-DD or blank>
VENDOR: <company name or blank>

Rules:
- UNIT_PRICE is the price for ONE unit only
- LINE_TOTAL is qty × unit_price
- If you only see a line total (not unit price), calculate: UNIT_PRICE = LINE_TOTAL / QTY
- Write plain numbers only — no $ signs, no commas
- List EVERY item, do not skip any` }] },
            { role:"assistant", content: rawText },
            { role:"user", content: `Convert the above into a JSON object. Return ONLY the JSON, no explanation, no markdown:
{"invoiceNo":"","date":"","vendorName":"","items":[{"name":"","qty":0,"unit":"","unitPrice":0,"lineTotal":0}]}
Make sure every number is a plain number (not a string). Make sure lineTotal = qty * unitPrice.` }
          ]
        })
      });

      if (!step2.ok) {
        const t = await step2.text();
        throw new Error(`API step2 ${step2.status}: ${t.slice(0,300)}`);
      }

      const d2 = await step2.json();
      if (d2.error) throw new Error(d2.error.message || JSON.stringify(d2.error));
      const rawJson = (d2.content || []).map(b => b.text||"").join("").trim();

      // Strip markdown fences — handles ```json\n...\n``` and ``` ... ```
      const stripped = rawJson
        .replace(/^```[\w]*[\r\n]*/,"")   // remove opening ```json or ```
        .replace(/[\r\n]*```\s*$/,"")      // remove closing ```
        .trim();

      let parsed = null;
      for (const fn of [
        () => JSON.parse(stripped),
        () => JSON.parse(rawJson),
        () => { const m=stripped.match(/{[\s\S]*}/); if(m) return JSON.parse(m[0]); throw 0; },
        () => { const m=rawJson.match(/{[\s\S]*}/);  if(m) return JSON.parse(m[0]); throw 0; },
      ]) { try { parsed = fn(); break; } catch(_) {} }

      if (!parsed) throw new Error(`JSON parse failed. Step2 response: "${rawJson.slice(0,200)}"`);

      const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
      if (!rawItems.length) throw new Error("No items found in invoice. Try a clearer photo.");

      // ── Clean and correct numbers ───────────────────────────────────────────
      const cleanNum = (v, fb=0) => {
        if (v === null || v === undefined || v === "") return fb;
        if (typeof v === "number") return isFinite(v) ? v : fb;
        const s = String(v).replace(/[^0-9.,\-]/g,"").replace(/,(\d{3})/g,"$1").replace(/,/g,".");
        const n = parseFloat(s);
        return isFinite(n) ? n : fb;
      };

      const mappedItems = rawItems.map(it => {
        const name  = String(it.name || it.description || "").trim();
        const qty   = Math.max(cleanNum(it.qty || it.quantity, 1), 0.001);
        const unit  = String(it.unit || "unit").trim();
        let up   = cleanNum(it.unitPrice  ?? it.unit_price  ?? it.price ?? null, -1);
        let lt   = cleanNum(it.lineTotal  ?? it.line_total  ?? it.total ?? null, -1);

        // Self-correct: if both exist but don't match, lineTotal wins
        if (up >= 0 && lt >= 0) {
          const expected = parseFloat((qty * up).toFixed(2));
          const tol = Math.max(0.05, expected * 0.02);
          if (Math.abs(expected - lt) > tol) {
            // lineTotal is more likely correct (it's what the invoice shows)
            up = parseFloat((lt / qty).toFixed(4));
          }
        } else if (lt >= 0 && up < 0) {
          up = parseFloat((lt / qty).toFixed(4));
        } else if (up >= 0 && lt < 0) {
          lt = parseFloat((qty * up).toFixed(2));
        } else {
          up = 0; lt = 0;
        }

        return { name, qty, unit, unitPrice: Math.max(up,0), lineTotal: Math.max(lt,0) };
      });

      setItems(mappedItems);

      // Extract header fields
      const sug = {};
      const inv = parsed.invoiceNo || parsed.invoice_no || "";
      const dt  = parsed.date || parsed.invoice_date || "";
      const vn  = parsed.vendorName || parsed.vendor_name || parsed.supplier || "";
      if (inv) { setInvoiceNo(String(inv)); sug.invoiceNo = String(inv); }
      if (dt)  { setDate(String(dt));       sug.date      = String(dt);  }
      if (vn)  {
        sug.vendorName = vn;
        const vnl = vn.toLowerCase().split(" ")[0];
        const match = vendors.find(v =>
          v.name.toLowerCase().includes(vnl) || vnl.includes(v.name.toLowerCase().split(" ")[0])
        );
        if (match) { setVendorId(String(match.id)); }
        else if (vn.trim()) { setNewVendorPrompt({ name: vn.trim() }); }
      }
      setSuggested(sug);
      setStep(2);

    } catch(e) {
      setHint(String(e.message || "Unknown error. Check browser console (F12)."));
    }
    setLoading(false);
  };

  const addRow = () => setItems(is => [...is, { name:"", qty:1, unit:"unit", unitPrice:0, lineTotal:0 }]);
  const upd = (i, k, v) => setItems(is => is.map((it, idx) => {
    if (idx !== i) return it;
    if (k === "qty" || k === "unitPrice") {
      const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
      const val = isFinite(n) ? n : 0;
      const updated = { ...it, [k]: val };
      // Always keep lineTotal in sync
      updated.lineTotal = parseFloat((updated.qty * updated.unitPrice).toFixed(2));
      return updated;
    }
    if (k === "lineTotal") {
      const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
      const val = isFinite(n) ? n : 0;
      const updated = { ...it, lineTotal: val };
      // Recalculate unitPrice from lineTotal / qty
      if (updated.qty > 0) updated.unitPrice = parseFloat((val / updated.qty).toFixed(4));
      return updated;
    }
    return { ...it, [k]: v };
  }));
  const del = i => setItems(is => is.filter((_, idx) => idx !== i));
  const doSave = () => {
    if (!valid) return;
    // Vendor might be newly added and not yet in list — fall back to newVendorPrompt name
    const vendor = vendors.find(v => String(v.id) === String(vendorId));
    const vName  = vendor?.name || newVendorPrompt?.name || "Unknown Vendor";
    const cleanItems = items.map(({ name, qty, unit, unitPrice }) => ({ name, qty, unit, unitPrice }));
    onSave({ ...(isEdit ? { id: initial.id } : {}), vendorId: Number(vendorId), vendorName: vName, invoiceNo: invoiceNo.trim(), date, items: cleanItems });
  };

  const SP=({n,label,active,done})=>(
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?"#10b981":active?"linear-gradient(135deg,#1e3a8a,#2563eb)":"#374151",color:(active||done)?"#0f172a":"#cbd5e1"}}>{done?"✓":n}</div>
      <span style={{color:(active||done)?"#9ca3af":"#cbd5e1",fontSize:13}}>{label}</span>
    </div>
  );

  return (
    <Modal title={isEdit?`Edit Invoice — ${initial.invoiceNo}`:"Add Invoice"} onClose={onClose} wide>
      {!isEdit&&<div style={{display:"flex",alignItems:"center",marginBottom:20}}><SP n={1} label="Upload File" active={step===1} done={step>1}/><div style={{flex:1,height:1,background:"#374151",margin:"0 10px"}}/><SP n={2} label="Review & Save" active={step===2} done={false}/></div>}

      {step===1&&(
        <>
          {/* Upload zone — desktop drag/drop */}
          <div onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
            onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
            onClick={()=>document.getElementById("inv-gallery").click()}
            style={{border:`2px dashed ${drag?"#10b981":"#bfdbfe"}`,borderRadius:13,padding:"22px 20px",textAlign:"center",background:drag?"rgba(16,185,129,0.05)":"#f8fafc",cursor:"pointer",marginBottom:12,transition:"all 0.2s"}}>
            {/* Gallery picker — no capture attribute, works on all devices */}
            <input id="inv-gallery" type="file" accept="image/*,application/pdf" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
            {preview ? (
              <>
                <img src={preview} alt="preview" style={{maxHeight:180,maxWidth:"100%",borderRadius:9,border:"1px solid #e2e8f0",objectFit:"contain",marginBottom:10}}/>
                <div style={{color:"#059669",fontSize:13,fontWeight:600}}>✓ Image ready {fileSize&&`· ${fileSize} MB (will compress)`}</div>
                <div style={{color:"#9ca3af",fontSize:12,marginTop:3}}>Tap to choose a different file</div>
              </>
            ) : fileB64&&isPdf ? (
              <>
                <div style={{fontSize:40,marginBottom:8}}>📄</div>
                <div style={{color:"#059669",fontSize:13,fontWeight:600}}>✓ PDF loaded {fileSize&&`(${fileSize} MB)`}</div>
                <div style={{color:"#9ca3af",fontSize:12,marginTop:3}}>Tap to change</div>
              </>
            ) : (
              <>
                <div style={{fontSize:40,marginBottom:10}}>📁</div>
                <div style={{color:"#374151",fontSize:14,fontWeight:700,marginBottom:4}}>Choose from Files / Gallery</div>
                <div style={{color:"#9ca3af",fontSize:12,marginBottom:8}}>JPG, PNG, WEBP, PDF · Drag & drop on desktop</div>
              </>
            )}
          </div>

          {/* 📷 Camera button — visible only on mobile, opens camera directly */}
          <input id="inv-camera" type="file" accept="image/*" capture="environment" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
          <button
            onClick={()=>document.getElementById("inv-camera").click()}
            style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10,boxShadow:"0 4px 14px rgba(59,130,246,0.25)"}}>
            📷 Take Photo of Invoice (Mobile Camera)
          </button>

          {hint&&(
            <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
              <div style={{color:"#dc2626",fontSize:13,fontWeight:700,marginBottom:4}}>⚠ Scan Failed</div>
              <div style={{color:"#dc2626",fontSize:12,lineHeight:1.6,wordBreak:"break-word"}}>{hint}</div>
              <div style={{color:"#991b1b",fontSize:11,marginTop:6}}>Check browser console (F12) for full error details.</div>
            </div>
          )}
          <button onClick={scan} disabled={!fileB64||loading} style={{width:"100%",padding:"12px",background:(!fileB64||loading)?"#e5e9f0":"linear-gradient(135deg,#064e3b,#10b981)",border:"none",borderRadius:10,color:(!fileB64||loading)?"#9ca3af":"#d1fae5",fontSize:13,fontWeight:700,cursor:(!fileB64||loading)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {loading?<><Spinner/> Scanning with AI…</>:"🤖 Scan Invoice with AI →"}
          </button>
          {loading&&<div style={{marginTop:12,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,padding:"10px 14px"}}><div style={{color:"#15803d",fontSize:13,fontWeight:600}}>🔍 Reading invoice…</div><div style={{color:"#166534",fontSize:12}}>Extracting vendor, date, invoice number and all line items.</div></div>}
          <div style={{marginTop:10,textAlign:"center"}}><button onClick={()=>{addRow();setStep(2);}} style={{background:"none",border:"none",color:"#9ca3af",fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Skip — enter items manually</button></div>
        </>
      )}

      {step===2&&(
        <>
          {Object.keys(suggested).length>0&&!isEdit&&<div style={{background:"rgba(16,185,129,0.07)",border:"1px solid #bbf7d0",borderRadius:10,padding:"11px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}><span>✅</span><div><div style={{color:"#10b981",fontSize:13,fontWeight:700}}>AI found {items.length} item{items.length!==1?"s":""}</div><div style={{color:"#166534",fontSize:12,marginTop:2}}>{[suggested.invoiceNo&&`Invoice: ${suggested.invoiceNo}`,suggested.date&&`Date: ${suggested.date}`,suggested.vendorName&&`Vendor hint: ${suggested.vendorName}`].filter(Boolean).join(" · ")}</div></div></div>}
          {hint&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:9,padding:"9px 13px",color:"#f59e0b",fontSize:12,marginBottom:12}}>⚠ {hint}</div>}

          {/* New vendor confirmation banner */}
          {newVendorPrompt && !vendorId && (
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:11,padding:"14px 16px",marginBottom:14}}>
              <div style={{color:"#92400e",fontSize:13,fontWeight:700,marginBottom:6}}>
                🏭 New vendor detected: "<strong>{newVendorPrompt.name}</strong>"
              </div>
              <div style={{color:"#78350f",fontSize:12,marginBottom:10}}>
                This vendor is not in your list yet. Would you like to add them automatically?
              </div>
              <div style={{display:"flex",gap:8}}>
                <button
                  onClick={()=>{
                    onAddVendor(
                      { name:newVendorPrompt.name, contact:"", phone:"", email:"", address:"", category:"Other", status:"active" },
                      (newId) => setVendorId(newId)
                    );
                    setNewVendorPrompt(null);
                  }}
                  style={{padding:"7px 14px",background:"linear-gradient(135deg,#d97706,#f59e0b)",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  ✅ Yes, add "{newVendorPrompt.name}"
                </button>
                <button
                  onClick={()=>setNewVendorPrompt(null)}
                  style={{padding:"7px 14px",background:"transparent",border:"1px solid #fde68a",borderRadius:8,color:"#92400e",fontSize:12,cursor:"pointer"}}>
                  No, I'll select manually
                </button>
              </div>
            </div>
          )}

          {/* Vendor + Invoice No */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{color:"#9ca3af",fontSize:10,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>Vendor *</div>
              <select value={vendorId} onChange={e=>setVendorId(e.target.value)} style={{...S.input,border:`1px solid ${!vOk&&vendorId===""?"#f97316":"#e5e9f0"}`}}>
                <option value="">-- Select vendor --</option>
                {vendors.map(v=><option key={v.id} value={String(v.id)}>{v.name}</option>)}
              </select>
              {suggested.vendorName&&!vOk&&<div style={{color:"#f59e0b",fontSize:11,marginTop:3}}>AI detected: "{suggested.vendorName}"</div>}
            </div>
            <div>
              <TxtInput label="Invoice Number *" value={invoiceNo} onChange={setInvoiceNo} placeholder="e.g. FC-1099"/>
              {isDupInvoice && <div style={{color:"#dc2626",fontSize:11,marginTop:-8,marginBottom:8,fontWeight:600}}>⚠ Invoice #{invoiceNo} already exists.</div>}
            </div>
          </div>
          <TxtInput label="Invoice Date *" value={date} onChange={setDate} type="date"/>

          {/* Items — proper table layout */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{color:"#374151",fontSize:13,fontWeight:700}}>Line Items *</div>
            <button onClick={addRow} style={{padding:"5px 12px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,color:"#2563eb",fontSize:12,cursor:"pointer",fontWeight:600}}>+ Add Row</button>
          </div>
          <div style={{border:"1px solid #e5e9f0",borderRadius:10,overflow:"auto",marginBottom:12,maxHeight:320,WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup>
                <col style={{width:"36%"}}/><col style={{width:"9%"}}/><col style={{width:"11%"}}/>
                <col style={{width:"16%"}}/><col style={{width:"18%"}}/><col style={{width:"10%"}}/>
              </colgroup>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr style={{background:"#f8fafc",borderBottom:"2px solid #e5e9f0"}}>
                  {["Item Name","Unit","Qty","Unit Price ($)","Line Total ($)",""].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#6b7280",fontSize:10,fontWeight:700,letterSpacing:"0.5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length===0 && (
                  <tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#9ca3af",fontSize:13}}>No items. Click "+ Add Row" or scan an invoice.</td></tr>
                )}
                {items.map((it,i)=>{
                  const computed = parseFloat((it.qty * it.unitPrice).toFixed(2));
                  const mismatch = it.lineTotal > 0 && Math.abs(computed - it.lineTotal) > 0.02;
                  return (
                    <tr key={i} style={{background:mismatch?"#fffbeb":i%2===0?"#fff":"#fafbfc",borderBottom:"1px solid #e5e9f0"}}>
                      <td style={{padding:"5px 8px",verticalAlign:"top"}}>
                        <ItemNameInput value={it.name} products={products}
                          allInvoices={allInvoices}
                          onChange={name=>upd(i,"name",name)}
                          onSelect={p=>setItems(is=>is.map((item,idx)=>idx===i?{...item,name:p.name,unit:p.unit,unitPrice:p.cost,lineTotal:parseFloat((item.qty*p.cost).toFixed(2))}:item))}
                          hasError={!it.name?.trim()}/>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <input value={it.unit} onChange={e=>upd(i,"unit",e.target.value)} placeholder="unit"
                          style={{...S.input,fontSize:12,padding:"7px 6px"}}/>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <input value={it.qty===0?"":it.qty} onChange={e=>upd(i,"qty",e.target.value)}
                          onBlur={e=>{if(!e.target.value||Number(e.target.value)<=0)upd(i,"qty",1);}}
                          type="number" min="0.001" step="any" placeholder="1"
                          style={{...S.input,fontSize:12,padding:"7px 6px",border:`1px solid ${!(it.qty>0)?"#f97316":"#e5e9f0"}`}}/>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <div style={{position:"relative"}}>
                          <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11,pointerEvents:"none",lineHeight:1}}>$</span>
                          <input value={it.unitPrice===0?"":it.unitPrice} onChange={e=>upd(i,"unitPrice",e.target.value)}
                            onBlur={e=>{if(!e.target.value)upd(i,"unitPrice",0);}}
                            type="number" min="0" step="0.0001" placeholder="0.00"
                            style={{...S.input,fontSize:12,padding:"7px 6px 7px 16px",color:"#374151"}}/>
                        </div>
                      </td>
                      <td style={{padding:"5px 5px",verticalAlign:"top"}}>
                        <div style={{position:"relative"}}>
                          <span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",fontSize:11,pointerEvents:"none",lineHeight:1}}>$</span>
                          <input value={it.lineTotal===0?"":it.lineTotal} onChange={e=>upd(i,"lineTotal",e.target.value)}
                            onBlur={e=>{if(!e.target.value)upd(i,"lineTotal",0);}}
                            type="number" min="0" step="0.01" placeholder="0.00"
                            title="Edit line total → unit price auto-corrects"
                            style={{...S.input,fontSize:12,padding:"7px 6px 7px 16px",color:"#059669",fontWeight:700,
                              border:`1px solid ${mismatch?"#f97316":"#e5e9f0"}`}}/>
                          {mismatch&&<div style={{color:"#f97316",fontSize:9,marginTop:1}}>expected: {computed.toFixed(2)}</div>}
                        </div>
                      </td>
                      <td style={{padding:"5px 5px",textAlign:"center",verticalAlign:"top"}}>
                        <button onClick={()=>del(i)} style={{width:26,height:26,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,color:"#ef4444",fontSize:12,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",marginTop:2}}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {items.length>0&&(
                <tfoot>
                  <tr style={{background:"#f0fdf4",borderTop:"2px solid #bbf7d0"}}>
                    <td colSpan={4} style={{padding:"9px 10px",textAlign:"right",color:"#6b7280",fontSize:12,fontWeight:700}}>
                      {items.length} item{items.length!==1?"s":""} · Total:
                    </td>
                    <td style={{padding:"9px 8px",color:"#059669",fontSize:15,fontWeight:800}}>
                      ${items.reduce((s,it)=>s+Number(it.lineTotal||it.qty*it.unitPrice),0).toFixed(2)}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {items.some(it=>it.lineTotal>0&&Math.abs(parseFloat((it.qty*it.unitPrice).toFixed(2))-it.lineTotal)>0.02)&&(
            <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#92400e"}}>
              ⚠ Orange rows have a mismatch — edit the <strong>Line Total</strong> to match your invoice and unit price will auto-correct.
            </div>
          )}
          {/* Validation */}
          <div style={{marginBottom:16}}>
            {!valid&&<div style={{color:"#f97316",fontSize:12,fontWeight:600}}>{validationMsg}</div>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
            {!isEdit?<button onClick={()=>setStep(1)} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>← Re-upload</button>:<button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e2e8f0",borderRadius:8,color:"#6b7280",fontSize:13,cursor:"pointer"}}>Cancel</button>}
            <PBtn onClick={doSave} disabled={!valid}>{isEdit?"Save Changes ✓":"Save Invoice ✓"}</PBtn>
          </div>
        </>
      )}
    </Modal>
  );
}
