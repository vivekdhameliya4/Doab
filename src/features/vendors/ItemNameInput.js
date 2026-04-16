import { useState, useMemo } from "react";
import { S } from "../../shared/ui";

export function ItemNameInput({ value, products, onChange, onSelect, hasError, allInvoices }) {
  // Build price history per item name from all invoices
  const priceHistory = useMemo(() => {
    const map = {};
    (allInvoices||[]).forEach(inv => {
      (inv.items||[]).forEach(it => {
        const n = it.name?.trim().toLowerCase();
        if (!n || !it.unitPrice) return;
        if (!map[n]) map[n] = [];
        map[n].push({ price: Number(it.unitPrice), date: inv.date, vendor: inv.vendorName });
      });
    });
    return map;
  }, [allInvoices]);

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!value.trim() || !focused) return [];
    const q = value.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [value, products, focused]);

  const showDropdown = open && suggestions.length > 0;

  return (
    <div style={{position:"relative"}}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => { setOpen(false); setFocused(false); }, 150)}
        onInput={() => setOpen(true)}
        placeholder="Type item name…"
        style={{
          ...S.input, fontSize:12,
          border:`1px solid ${hasError?"#f97316":"#e5e9f0"}`,
          width:"100%",
        }}
      />
      {showDropdown && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
          background:"#ffffff", border:"1px solid #e5e9f0",
          borderRadius:10, boxShadow:"0 8px 24px rgba(15,23,42,0.12)",
          zIndex:200, overflow:"hidden",
        }}>
          {suggestions.map(p => (
            <div
              key={p.id}
              onMouseDown={() => { onSelect(p); setOpen(false); }}
              style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"9px 12px", cursor:"pointer", borderBottom:"1px solid #f1f5f9",
                transition:"background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background="#ffffff"}
            >
              <div>
                <div style={{color:"#111827", fontSize:12, fontWeight:600}}>{p.name}</div>
                <div style={{color:"#9ca3af", fontSize:11}}>{p.category} · {p.unit}</div>
                {/* Show price history */}
                {priceHistory[p.name.toLowerCase()] && (
                  <div style={{color:"#6b7280",fontSize:10,marginTop:2}}>
                    Last price: <strong style={{color:"#f59e0b"}}>${priceHistory[p.name.toLowerCase()].sort((a,b)=>b.date.localeCompare(a.date))[0].price.toFixed(2)}</strong>
                    {" "}· {priceHistory[p.name.toLowerCase()].sort((a,b)=>b.date.localeCompare(a.date))[0].date}
                  </div>
                )}
              </div>
              <div style={{textAlign:"right", flexShrink:0}}>
                <div style={{color:"#6b7280", fontSize:11}}>cost</div>
                <div style={{color:"#10b981", fontSize:12, fontWeight:700}}>${Number(p.cost||0).toFixed(2)}</div>
              </div>
            </div>
          ))}
          <div style={{padding:"6px 12px", color:"#9ca3af", fontSize:11, background:"#f8fafc"}}>
            ↵ Select to auto-fill unit & cost
          </div>
        </div>
      )}
    </div>
  );
}
