import { useState } from "react";
import { SEED_PRODUCTS, SALES_DATA } from "../../shared/constants";
import { API_URL } from "../../shared/utils";
import { S, PageHeader, PBtn, Spinner } from "../../shared/ui";

export function ForecastPage() {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState("");
  const products = SEED_PRODUCTS;
  const salesHistory = SALES_DATA;

  const generate = async () => {
    setLoading(true); setError(""); setForecast(null);
    try {
      const res = await fetch(API_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1500,
          messages:[{ role:"user", content:`You are an inventory forecasting AI for a deli/cafe called Deli On A Bagel Cafe.

Current inventory: ${JSON.stringify(products.map(p=>({name:p.name,stock:p.stock,minStock:p.minStock,unit:p.unit})))}

Weekly sales data (last 7 days): ${JSON.stringify(salesHistory)}

Based on this data, provide a 7-day forecast in this exact JSON format (no markdown):
{"summary":"2-sentence overview","items":[{"name":"product name","currentStock":0,"predictedDemand":0,"unit":"unit","daysUntilStockout":0,"orderSuggestion":0,"priority":"high|medium|low"}],"topInsight":"one key insight"}

Include only the top 5 most important items to watch. Numbers should be realistic for a small deli.`}
        ]})
      });
      const data = await res.json();
      const raw = (data.content||[]).map(b=>b.text||"").join("").trim();
      let parsed = null;
      for(const fn of [()=>JSON.parse(raw),()=>{const m=raw.match(/{[\s\S]*}/);if(m)return JSON.parse(m[0]);throw 0;}]){ try{parsed=fn();break;}catch(_){} }
      if(parsed) setForecast(parsed);
      else throw new Error("Could not parse forecast");
    } catch(e) { setError("Forecast failed: "+e.message); }
    setLoading(false);
  };

  const PRIORITY_COLORS = { high:{bg:"#fef2f2",text:"#dc2626",border:"#fecaca"}, medium:{bg:"#fffbeb",text:"#92400e",border:"#fde68a"}, low:{bg:"#f0fdf4",text:"#059669",border:"#bbf7d0"} };
  return (
    <div style={{maxWidth:800}}>
      <PageHeader title="AI Inventory Forecasting" subtitle="Predict what you need to order based on sales trends."/>
      <div style={{...S.card,padding:20,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:10}}>🔮</div>
        <div style={{color:"#111827",fontWeight:700,fontSize:16,marginBottom:6}}>Generate 7-Day Forecast</div>
        <div style={{color:"#6b7280",fontSize:13,marginBottom:18}}>Claude AI will analyze your current stock levels and sales patterns to predict what you need to order.</div>
        <PBtn onClick={generate} disabled={loading}>{loading?<><Spinner/>&nbsp;Analyzing…</>:"🤖 Generate Forecast"}</PBtn>
        {error && <div style={{marginTop:14,color:"#dc2626",fontSize:12}}>{error}</div>}
      </div>
      {forecast && (
        <div>
          <div style={{...S.card,padding:18,marginBottom:14,background:"linear-gradient(135deg,#eff6ff,#f0fdf4)"}}>
            <div style={{color:"#1e40af",fontWeight:700,fontSize:14,marginBottom:6}}>📊 Summary</div>
            <div style={{color:"#374151",fontSize:13,lineHeight:1.6}}>{forecast.summary}</div>
            <div style={{marginTop:10,background:"#fff",borderRadius:8,padding:"10px 14px",border:"1px solid #e5e9f0"}}>
              <span style={{color:"#059669",fontWeight:700}}>💡 Key Insight: </span>
              <span style={{color:"#374151",fontSize:13}}>{forecast.topInsight}</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {forecast.items?.map((item,i)=>{
              const pc = PRIORITY_COLORS[item.priority]||PRIORITY_COLORS.low;
              return (
                <div key={i} style={{...S.card,padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:180}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{color:"#111827",fontWeight:700,fontSize:14}}>{item.name}</span>
                        <span style={{background:pc.bg,color:pc.text,border:`1px solid ${pc.border}`,borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:700}}>{item.priority.toUpperCase()}</span>
                      </div>
                      <div style={{color:"#6b7280",fontSize:12}}>Current: {item.currentStock} {item.unit} · Demand: ~{item.predictedDemand} {item.unit}/week</div>
                    </div>
                    <div style={{textAlign:"center",padding:"8px 16px",background:"#fff7ed",borderRadius:10,border:"1px solid #fed7aa"}}>
                      <div style={{color:"#f97316",fontWeight:800,fontSize:16}}>{item.daysUntilStockout}d</div>
                      <div style={{color:"#9ca3af",fontSize:10}}>days left</div>
                    </div>
                    <div style={{textAlign:"center",padding:"8px 16px",background:"#f0fdf4",borderRadius:10,border:"1px solid #bbf7d0"}}>
                      <div style={{color:"#059669",fontWeight:800,fontSize:16}}>{item.orderSuggestion}</div>
                      <div style={{color:"#9ca3af",fontSize:10}}>suggest order</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
