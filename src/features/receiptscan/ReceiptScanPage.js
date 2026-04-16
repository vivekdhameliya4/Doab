import { useState } from "react";
import { API_URL } from "../../shared/utils";
import { S, PageHeader, PBtn, Spinner, TxtInput, Sel } from "../../shared/ui";

export function ReceiptScanPage() {
  const [preview, setPreview] = useState(null);
  const [fileB64, setFileB64] = useState(null);
  const [fileType, setFileType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState([]);

  const handleFile = file => {
    if(!file) return;
    setError(""); setResult(null);
    setFileType(file.type);
    const r = new FileReader();
    r.onload = e => { setFileB64(e.target.result.split(",")[1]); setPreview(e.target.result); };
    r.readAsDataURL(file);
  };

  const scan = async () => {
    if(!fileB64) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(API_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:[
            {type:"image",source:{type:"base64",media_type:fileType,data:fileB64}},
            {type:"text",text:`Read this receipt/bill and extract:
VENDOR: <company name>
DATE: <YYYY-MM-DD>
CATEGORY: <one of: Utilities, Rent, Equipment, Maintenance, Software, Food/Supplies, Other>
TOTAL: <total amount as number, no $ sign>
DESCRIPTION: <brief description of what was purchased>
Reply with just those 5 lines, nothing else.`}
          ]}]
        })
      });
      const data = await res.json();
      const text = (data.content||[]).map(b=>b.text||"").join("").trim();
      const lines = {};
      text.split("\n").forEach(l => { const [k,...v]=l.split(":"); if(k&&v.length) lines[k.trim().toUpperCase()]=v.join(":").trim(); });
      setResult({
        vendor: lines["VENDOR"]||"",
        date: lines["DATE"]||new Date().toISOString().split("T")[0],
        category: lines["CATEGORY"]||"Other",
        amount: parseFloat(lines["TOTAL"])||0,
        description: lines["DESCRIPTION"]||""
      });
    } catch(e) { setError("Scan failed: "+e.message); }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:600}}>
      <PageHeader title="Receipt Scanner" subtitle="AI-powered receipt scanning — automatically log expenses."/>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div onClick={()=>document.getElementById("receipt-input").click()}
          style={{border:"2px dashed #c7d7f0",borderRadius:12,padding:"24px",textAlign:"center",cursor:"pointer",marginBottom:14,background:"#f8fafc"}}>
          <input id="receipt-input" type="file" accept="image/*" capture="environment" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
          {preview ? <img src={preview} alt="receipt" style={{maxHeight:160,maxWidth:"100%",borderRadius:8,objectFit:"contain"}}/> : (
            <><div style={{fontSize:36,marginBottom:8}}>🧾</div><div style={{color:"#374151",fontWeight:600}}>Upload or take photo of receipt</div><div style={{color:"#9ca3af",fontSize:12,marginTop:4}}>JPG, PNG — tap to open camera on mobile</div></>
          )}
        </div>
        {error && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",color:"#dc2626",fontSize:12,marginBottom:10}}>{error}</div>}
        <button onClick={scan} disabled={!fileB64||loading}
          style={{width:"100%",padding:"11px",background:(!fileB64||loading)?"#e5e9f0":"linear-gradient(135deg,#0c4a6e,#0ea5e9)",border:"none",borderRadius:9,color:(!fileB64||loading)?"#9ca3af":"#fff",fontSize:13,fontWeight:700,cursor:(!fileB64||loading)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {loading?<><Spinner/> Scanning…</>:"📷 Scan Receipt with AI"}
        </button>
      </div>
      {result && (
        <div style={{...S.card,padding:20}}>
          <div style={{color:"#059669",fontWeight:700,fontSize:14,marginBottom:14}}>✅ Receipt scanned — review and save</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <TxtInput label="Vendor" value={result.vendor} onChange={v=>setResult(r=>({...r,vendor:v}))} placeholder="Vendor name"/>
            <TxtInput label="Date" value={result.date} onChange={v=>setResult(r=>({...r,date:v}))} type="date"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <Sel label="Category" value={result.category} onChange={v=>setResult(r=>({...r,category:v}))} options={["Utilities","Rent","Equipment","Maintenance","Software","Food/Supplies","Other"]}/>
            <TxtInput label="Amount ($)" value={result.amount||""} onChange={v=>setResult(r=>({...r,amount:Number(v)}))} type="number" placeholder="0.00"/>
          </div>
          <TxtInput label="Description" value={result.description} onChange={v=>setResult(r=>({...r,description:v}))} placeholder="What was purchased"/>
          <PBtn onClick={()=>{ setSaved(s=>[...s,{...result,id:Date.now()}]); setResult(null); setPreview(null); setFileB64(null); }}>Save as Expense ✓</PBtn>
        </div>
      )}
      {saved.length>0 && (
        <div style={{marginTop:16}}>
          <div style={{color:"#374151",fontWeight:700,marginBottom:8}}>Saved This Session ({saved.length})</div>
          {saved.map(s=>(
            <div key={s.id} style={{...S.card,padding:"12px 16px",marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
              <div style={{flex:1}}><div style={{color:"#111827",fontWeight:600,fontSize:13}}>{s.description||s.vendor}</div><div style={{color:"#9ca3af",fontSize:11}}>{s.vendor} · {s.date} · {s.category}</div></div>
              <div style={{color:"#ef4444",fontWeight:700,fontSize:14}}>${s.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
