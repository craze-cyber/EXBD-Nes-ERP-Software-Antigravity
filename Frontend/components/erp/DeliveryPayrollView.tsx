"use client";

import React from "react";
import { 
  Package, 
  Truck, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  MapPin, 
  Clock,
  TrendingUp,
  CreditCard
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface Props {
  payrollRecords: any[];
  transactions: any[];
  summary: any;
}

export default function DeliveryPayrollView({ payrollRecords, transactions, summary }: Props) {
  // Aggregate stats
  const totalDeliveries = transactions.length;
  const internalCount = payrollRecords.filter(r => r.extra_columns?.driver_type === 'internal').length;
  const externalCount = payrollRecords.filter(r => r.extra_columns?.driver_type === 'external').length;
  const bothCount = payrollRecords.filter(r => r.extra_columns?.driver_type === 'Both').length;
  
  const totalParcelValue = transactions.reduce((sum, t) => sum + (Number(t.parcel_value) || 0), 0);
  const totalDriverPay = payrollRecords.reduce((sum, r) => sum + (Number(r.net_salary) || 0), 0);

  // Chart Data: Top Areas
  const areaCounts: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.area) areaCounts[t.area] = (areaCounts[t.area] || 0) + 1;
  });
  const topAreas = Object.entries(areaCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Chart Data: Payment Methods
  const payMethods: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.payment_method) payMethods[t.payment_method] = (payMethods[t.payment_method] || 0) + 1;
  });
  const payMethodData = Object.entries(payMethods).map(([name, value]) => ({ name, value }));
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Deliveries" 
          value={totalDeliveries.toLocaleString()} 
          icon={<Package className="text-emerald-400" />}
          subtext="Processed from registry"
        />
        <SummaryCard 
          title="Active Drivers" 
          value={(internalCount + externalCount + bothCount).toString()} 
          icon={<Users className="text-blue-400" />}
          subtext={`${internalCount} Int | ${externalCount} Ext | ${bothCount} Both`}
        />
        <SummaryCard 
          title="Parcels Value" 
          value={`SAR ${totalParcelValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          icon={<TrendingUp className="text-orange-400" />}
          subtext="GMV delivered"
        />
        <SummaryCard 
          title="Total Payroll" 
          value={`SAR ${totalDriverPay.toLocaleString()}`} 
          icon={<DollarSign className="text-emerald-400" />}
          subtext="Total driver earnings"
        />
      </div>

      {/* Main Table */}
      <div className="glass rounded-[32px] border border-white/10 overflow-hidden shadow-2xl shadow-emerald-500/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-500" />
            Driver Payroll Breakdown
          </h3>
          <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Dabdoob Format</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.03] text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Orders</th>
                <th className="px-6 py-4 text-right">E&R</th>
                <th className="px-6 py-4 text-right font-emerald-400">Total Units</th>
                <th className="px-6 py-4 text-right">Gross Earnings</th>
                <th className="px-6 py-4 text-right">Net Pay</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {payrollRecords.map((record, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group cursor-default">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs">
                        {record.worker_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm">{record.worker_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      record.extra_columns?.driver_type === 'internal' ? 'bg-emerald-500/10 text-emerald-500' :
                      record.extra_columns?.driver_type === 'external' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-orange-500/10 text-orange-500'
                    }`}>
                      {record.extra_columns?.driver_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-mono">{record.extra_columns?.total_orders}</td>
                  <td className="px-6 py-4 text-right text-xs font-mono">{record.extra_columns?.er_count}</td>
                  <td className="px-6 py-4 text-right font-bold text-sm text-emerald-400 font-mono">
                    {record.extra_columns?.total_units}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs">
                    {Number(record.other_allowances).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-sm font-mono">
                    {Number(record.net_salary).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-[32px] p-8 border border-white/10">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            Top Delivery Areas
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAreas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-[32px] p-8 border border-white/10">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            Payment Methods
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {payMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 ml-4">
              {payMethodData.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-400 uppercase">{d.name}</span>
                  <span className="text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, subtext }: { title: string, value: string, icon: React.ReactNode, subtext: string }) {
  return (
    <div className="glass p-6 rounded-[28px] border border-white/10 hover:border-emerald-500/30 transition-all group overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
        {React.cloneElement(icon as React.ReactElement, { size: 48 })}
      </div>
      <div className="space-y-4 relative z-10">
        <div className="p-3 bg-white/5 rounded-2xl w-fit">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{title}</p>
          <h4 className="text-2xl font-bold mt-1 text-white">{value}</h4>
          <p className="text-[10px] text-zinc-400 mt-2 font-medium">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
