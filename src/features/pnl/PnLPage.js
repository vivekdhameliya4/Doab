import { S, PageHeader, StatCard } from "../../shared/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function PnLPage() {
  const months = ["Oct","Nov","Dec","Jan","Feb","Mar"];
  const revenue  = [38000,42000,61000,35000,39000,28000];
  const cogs     = [14440,15960,23180,13300,14820,10640];
  const opex     = [11400,12600,18300,10500,11700,8400];
  const profit   = revenue.map((r,i)=>r-cogs[i]-opex[i]);
  const thisMonth = { revenue:revenue[5], cogs:cogs[5], opex:opex[5], profit:profit[5] };
  const margin = (thisMonth.profit/thisMonth.revenue*100).toFixed(1);
  const pnlData = months.map((m,i)=>({month:m,Revenue:revenue[i],COGS:cogs[i],OpEx:opex[i],Profit:profit[i]}));
  return (
    <div>
      <PageHeader title="Profit & Loss" subtitle="Revenue, costs, and net profit overview."/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
        {[["💰","Revenue",`$${thisMonth.revenue.toLocaleString()}`,"#3b82f6"],["🛒","Cost of Goods",`$${thisMonth.cogs.toLocaleString()}`,"#ef4444"],["💳","Operating Costs",`$${thisMonth.opex.toLocaleString()}`,"#f59e0b"],["💹","Net Profit",`$${thisMonth.profit.toLocaleString()}`,"#059669"]].map(([icon,label,value,color])=>(
          <StatCard key={label} icon={icon} label={label+" (Mar)"} value={value} color={color}/>
        ))}
      </div>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{color:"#111827",fontWeight:700,fontSize:14}}>6-Month P&L Overview</div>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"4px 12px",color:"#059669",fontWeight:700,fontSize:13}}>Net Margin: {margin}%</div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={pnlData} margin={{top:0,right:10,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:12}}/>
            <YAxis tick={{fill:"#9ca3af",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
            <Tooltip contentStyle={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:8}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
            <Bar dataKey="Revenue" fill="#3b82f6" radius={[3,3,0,0]}/>
            <Bar dataKey="COGS"    fill="#ef4444" radius={[3,3,0,0]}/>
            <Bar dataKey="Profit"  fill="#059669" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Month","Revenue","COGS","Op Costs","Net Profit","Margin"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {pnlData.slice().reverse().map((row,i)=>{
              const m=(row.Profit/row.Revenue*100).toFixed(1);
              return (
                <tr key={row.month} style={{borderBottom:i<pnlData.length-1?"1px solid #e5e9f0":"none"}}>
                  <td style={{...S.td,fontWeight:600,color:"#111827"}}>{row.month} 2026</td>
                  <td style={{...S.td,color:"#3b82f6",fontWeight:600}}>${row.Revenue.toLocaleString()}</td>
                  <td style={{...S.td,color:"#ef4444"}}>${row.COGS.toLocaleString()}</td>
                  <td style={{...S.td,color:"#f59e0b"}}>${row.OpEx.toLocaleString()}</td>
                  <td style={{...S.td,color:"#059669",fontWeight:700}}>${row.Profit.toLocaleString()}</td>
                  <td style={S.td}><span style={{background:Number(m)>=30?"#d1fae5":"#fef3c7",color:Number(m)>=30?"#065f46":"#92400e",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{m}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
