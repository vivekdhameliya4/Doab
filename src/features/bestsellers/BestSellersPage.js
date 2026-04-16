import { S, PageHeader, StatCard } from "../../shared/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function BestSellersPage() {
  const data = [
    {rank:1,name:"Classic Bagel Sandwich",category:"Sandwiches",sold:284,revenue:3688.16,trend:"▲"},
    {rank:2,name:"Cheese Bagel",           category:"Sandwiches",sold:198,revenue:1780.02,trend:"▲"},
    {rank:3,name:"Coffee (Large)",          category:"Drinks",    sold:312,revenue:1560.00,trend:"▲"},
    {rank:4,name:"Yogurt Parfait",          category:"Breakfast",  sold:145,revenue:1013.55,trend:"▼"},
    {rank:5,name:"Whole Milk 1L",           category:"Grocery",    sold:210,revenue:627.90, trend:"▲"},
    {rank:6,name:"Bottled Water",           category:"Drinks",    sold:310,revenue:399.90, trend:"—"},
    {rank:7,name:"Chips Assorted",          category:"Snacks",    sold:180,revenue:358.20, trend:"▼"},
    {rank:8,name:"Orange Juice 1L",         category:"Drinks",    sold:88, revenue:395.12, trend:"▲"},
  ];
  const chartData = data.slice(0,6).map(d=>({name:d.name.split(" ").slice(0,2).join(" "),Revenue:d.revenue,Units:d.sold}));
  return (
    <div>
      <PageHeader title="Best Sellers" subtitle="Top performing items by units sold and revenue this month."/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        <StatCard icon="🏆" label="Top Item" value="Classic Bagel" color="#f59e0b"/>
        <StatCard icon="📦" label="Units Sold" value={data.reduce((s,d)=>s+d.sold,0).toLocaleString()} color="#3b82f6"/>
        <StatCard icon="💰" label="Total Revenue" value={`$${data.reduce((s,d)=>s+d.revenue,0).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`} color="#059669"/>
        <StatCard icon="📊" label="Categories" value={new Set(data.map(d=>d.category)).size} color="#8b5cf6"/>
      </div>
      <div style={{...S.card,padding:20,marginBottom:16}}>
        <div style={{color:"#111827",fontWeight:700,fontSize:14,marginBottom:14}}>Revenue by Top 6 Items</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis type="number" tick={{fill:"#9ca3af",fontSize:11}} tickFormatter={v=>`$${v}`}/>
            <YAxis type="category" dataKey="name" tick={{fill:"#374151",fontSize:11}} width={100}/>
            <Tooltip contentStyle={{background:"#fff",border:"1px solid #e5e9f0",borderRadius:8}} formatter={v=>[`$${Number(v).toFixed(2)}`,""]}/>
            <Bar dataKey="Revenue" fill="#f59e0b" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{...S.card,overflow:"hidden",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid #e5e9f0"}}>{["Rank","Item","Category","Units Sold","Revenue","Trend"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.map((d,i)=>(
              <tr key={d.rank} style={{borderBottom:i<data.length-1?"1px solid #e5e9f0":"none"}}>
                <td style={{...S.td,fontWeight:800,color:d.rank<=3?"#f59e0b":"#9ca3af",fontSize:16}}>{d.rank<=3?["🥇","🥈","🥉"][d.rank-1]:d.rank}</td>
                <td style={{...S.td,fontWeight:600,color:"#111827"}}>{d.name}</td>
                <td style={S.td}><span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{d.category}</span></td>
                <td style={{...S.td,color:"#3b82f6",fontWeight:700}}>{d.sold}</td>
                <td style={{...S.td,color:"#059669",fontWeight:700}}>${d.revenue.toFixed(2)}</td>
                <td style={{...S.td,color:d.trend==="▲"?"#059669":d.trend==="▼"?"#ef4444":"#9ca3af",fontSize:16,fontWeight:700}}>{d.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
