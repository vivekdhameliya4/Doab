import { useState } from "react";
import { SEED_RECIPES } from "../../shared/constants";
import { API_URL } from "../../shared/utils";
import { S, PageHeader, PBtn, Spinner } from "../../shared/ui";

export function SmartPricingPage() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [targetMargin, setTargetMargin] = useState("65");
  const [error, setError] = useState("");
  const recipes = SEED_RECIPES;

  const generate = async () => {
    setLoading(true); setError(""); setSuggestions(null);
    try {
      const res = await fetch(API_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{ role:"user", content:`You are a pricing consultant for Deli On A Bagel Cafe, a deli/bagel cafe.

Menu items with current pricing:
${JSON.stringify(recipes.map(r=>({name:r.name,category:r.category,currentPrice:r.sellingPrice,foodCost:r.ingredients.reduce((s,i)=>s+i.qty*i.costPer,0).toFixed(2)})))}

Target gross margin: ${targetMargin}%

Provide pricing suggestions in this exact JSON format (no markdown):
{"items":[{"name":"item name","currentPrice":0,"suggestedPrice":0,"foodCost":0,"projectedMargin":0,"reasoning":"one sentence"}]}

Be realistic for a NYC-area deli/cafe. Keep suggestions within 10-20% of current prices.`}
        ]})
      });
      const data = await res.json();
      const raw = (data.content||[]).map(b=>b.text||"").join("").trim();
      let parsed = null;
      for(const fn of [()=>JSON.parse(raw),()=>{const m=raw.match(/{[\s\S]*}/);if(m)return JSON.parse(m[0]);throw 0;}]){ try{parsed=fn();break;}catch(_){} }
      if(parsed) setSuggestions(parsed.items||[]);
      else throw new Error("Could not parse suggestions");
    } catch(e) { setError("Failed: "+e.message); }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:800}}>
      <PageHeader title="Smart Pricing Suggestions" subtitle="AI-powered pricing based on food cost and target margin."/>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{color:"#6b7280",fontSize:11,fontWeight:700,letterSpacing:"0.8px",marginBottom:5,textTransform:"uppercase"}}>Target Gross Margin</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="40" max="80" value={targetMargin} onChange={e=>setTargetMargin(e.target.value)} style={{width:150,accentColor:"#3b82f6"}}/>
              <span style={{color:"#3b82f6",fontWeight:800,fontSize:18,minWidth:50}}>{targetMargin}%</span>
            </div>
          </div>
          <PBtn onClick={generate} disabled={loading}>{loading?<><Spinner/>&nbsp;Analyzing…</>:"🤖 Get Price Suggestions"}</PBtn>
        </div>
        {error && <div style={{marginTop:10,color:"#dc2626",fontSize:12}}>{error}</div>}
      </div>
      {suggestions && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {suggestions.map((s,i)=>{
            const diff = s.suggestedPrice - s.currentPrice;
            const pct = (diff/s.currentPrice*100).toFixed(1);
            return (
              <div key={i} style={{...S.card,padding:"16px 18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{color:"#111827",fontWeight:700,fontSize:14,marginBottom:3}}>{s.name}</div>
                    <div style={{color:"#6b7280",fontSize:12}}>Food cost: ${Number(s.foodCost).toFixed(2)} · {s.reasoning}</div>
                  </div>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#9ca3af",fontSize:11}}>Current</div>
                      <div style={{color:"#374151",fontWeight:700,fontSize:15}}>${Number(s.currentPrice).toFixed(2)}</div>
                    </div>
                    <div style={{color:"#6b7280",fontSize:18}}>→</div>
                    <div style={{textAlign:"center",padding:"8px 14px",background:diff>=0?"#f0fdf4":"#fef2f2",borderRadius:10,border:`1px solid ${diff>=0?"#bbf7d0":"#fecaca"}`}}>
                      <div style={{color:diff>=0?"#059669":"#dc2626",fontSize:10,fontWeight:600}}>{diff>=0?`+${pct}%`:`${pct}%`}</div>
                      <div style={{color:diff>=0?"#059669":"#dc2626",fontWeight:800,fontSize:16}}>${Number(s.suggestedPrice).toFixed(2)}</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#9ca3af",fontSize:11}}>Margin</div>
                      <div style={{color:"#059669",fontWeight:700,fontSize:15}}>{Number(s.projectedMargin).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
