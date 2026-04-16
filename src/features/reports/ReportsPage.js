import { useState } from "react";
import { SALES_DATA, MONTHLY_DATA, CATEGORY_SALES } from "../../shared/constants";
import { downloadCSV } from "../../shared/utils";
import { S, PageHeader, StatCard, FBtn } from "../../shared/ui";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function ReportsPage() {
  const [period,setPeriod]=useState("weekly");
  const totalWeek = SALES_DATA.reduce((s,d)=>s+d.sales,0);
  const totalOrders = SALES_DATA.reduce((s,d)=>s+d.orders,0);
  return (
    <div>
      <PageHeader title="Sales Reports" subtitle="Analyze your store's performance and trends." action={
        <button onClick={()=>downloadCSV(`sales_report_${new Date().toISOString().split('T')[0]}.csv`,
          ["Day","Sales ($)","Orders"],
          SALES_DATA.map(d=>[d.day,d.sales,d.orders])
        )} style={{padding:"9px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,color:"#059669",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ Export CSV</button>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        <StatCard icon="💰" label="This Week"     value={`$${(totalWeek/1000).toFixed(1)}k`} color="#2ecc71" sub="vs $24.1k last week"/>
        <StatCard icon="📋" label="Total Orders"  value={totalOrders} color="#4a7cf7" sub="+8% vs last week"/>
        <StatCard icon="🧾" label="Avg Order Val" value={`$${(totalWeek/totalOrders).toFixed(2)}`} color="#e87c2b" sub="Per transaction"/>
        <StatCard icon="📈" label="Best Day"      value="Sat"  color="#9b59b6" sub="$5,200 in sales"/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {["weekly","monthly","category"].map(p=><FBtn key={p} active={period===p} onClick={()=>setPeriod(p)}>{p.charAt(0).toUpperCase()+p.slice(1)}</FBtn>)}
      </div>
      {period==="weekly"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
          <div style={{...S.card,padding:"20px"}}>
            <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Daily Sales — This Week</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={SALES_DATA} margin={{top:0,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                <XAxis dataKey="day" tick={{fill:"#94a3b8",fontSize:12}}/>
                <YAxis tick={{fill:"#94a3b8",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
                <Bar dataKey="sales" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{...S.card,padding:"20px"}}>
            <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Daily Orders</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={SALES_DATA} margin={{top:0,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                <XAxis dataKey="day" tick={{fill:"#94a3b8",fontSize:12}}/>
                <YAxis tick={{fill:"#94a3b8",fontSize:11}}/>
                <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}}/>
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{fill:"#10b981",r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {period==="monthly"&&(
        <div style={{...S.card,padding:"20px"}}>
          <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Monthly Revenue — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MONTHLY_DATA} margin={{top:0,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
              <XAxis dataKey="month" tick={{fill:"#94a3b8",fontSize:12}}/>
              <YAxis tick={{fill:"#94a3b8",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
              <Bar dataKey="sales" fill="#e87c2b" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {period==="category"&&(
        <div style={{...S.card,padding:"20px"}}>
          <div style={{color:"#0f172a",fontWeight:700,fontSize:14,marginBottom:14}}>Sales by Category (This Month)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={CATEGORY_SALES} layout="vertical" margin={{top:0,right:20,left:20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
              <XAxis type="number" tick={{fill:"#94a3b8",fontSize:11}} tickFormatter={v=>`$${v/1000}k`}/>
              <YAxis type="category" dataKey="category" tick={{fill:"#9ca3af",fontSize:12}} width={80}/>
              <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#111827"}} formatter={v=>[`$${v.toLocaleString()}`,""]}/>
              <Bar dataKey="sales" fill="#9b59b6" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
