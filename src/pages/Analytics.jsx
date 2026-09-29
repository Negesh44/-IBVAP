import React, { useState } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Users, 
  Car, 
  ShieldAlert, 
  Activity, 
  Cpu, 
  Download,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import ChartCard from '../components/common/ChartCard';
import StatCard from '../components/common/StatCard';
import { MOCK_ANALYTICS, MOCK_SYSTEM_METRICS } from '../data/mockData';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('TODAY'); // 'TODAY' | '7DAYS' | '30DAYS'

  // Dynamic multiplier for simulated 7D / 30D scaling
  const multiplier = timeRange === '7DAYS' ? 6.8 : timeRange === '30DAYS' ? 28.5 : 1;

  const adjustedHourly = MOCK_ANALYTICS.hourlyDetections.map(item => ({
    ...item,
    people: Math.round(item.people * (timeRange === 'TODAY' ? 1 : 1.2)),
    vehicles: Math.round(item.vehicles * (timeRange === 'TODAY' ? 1 : 1.1)),
    alerts: Math.round(item.alerts * (timeRange === 'TODAY' ? 1 : 1.3)),
  }));

  const pieData = MOCK_ANALYTICS.peopleVsVehicles.map(item => ({
    ...item,
    value: Math.round(item.value * multiplier)
  }));

  const alertsByCategory = MOCK_ANALYTICS.alertsByCategory.map(item => ({
    ...item,
    count: Math.round(item.count * (timeRange === 'TODAY' ? 1 : timeRange === '7DAYS' ? 4.5 : 18.2))
  }));

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Border Intelligence & Analytics Matrix
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Predictive Intrusion Patterns, Object Classification & Optical Sensor Telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2" />
            {[
              { label: 'Today (24h)', val: 'TODAY' },
              { label: 'Past 7 Days', val: '7DAYS' },
              { label: 'Past 30 Days', val: '30DAYS' },
            ].map(r => (
              <button
                key={r.val}
                onClick={() => setTimeRange(r.val)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  timeRange === r.val
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert('Intelligence Report PDF generated and queued for download.')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Export Intelligence Summary Report"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Target Tracks"
          value={Math.round(397 * multiplier)}
          subtitle="Processed by ByteTrack"
          icon={Activity}
          colorScheme="cyan"
          trend="+14.2%"
        />
        <StatCard
          title="Intrusions Blocked"
          value={Math.round(23 * multiplier)}
          subtitle="Tripwire triggers"
          icon={ShieldAlert}
          colorScheme="red"
          trend="-8.5%"
          trendDirection="down"
        />
        <StatCard
          title="Whitelisted Passes"
          value={Math.round(210 * multiplier)}
          subtitle="Verified friendly matches"
          icon={Users}
          colorScheme="green"
          trend="+22%"
        />
        <StatCard
          title="Mean AI Latency"
          value="18.2 ms"
          subtitle="TensorRT CUDA core"
          icon={Cpu}
          colorScheme="blue"
          trend="99.9% RT"
        />
      </div>

      {/* Row 1: Hourly Detection Trends + Object Classification Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Detections Area Chart (7 cols) */}
        <div className="lg:col-span-7">
          <ChartCard
            title="Detections by Time of Day"
            subtitle="Hourly distribution of Human, Vehicle & Alert signatures"
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adjustedHourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anPeople" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="anVehicles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="anAlerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff334b" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#ff334b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} fontStyle="italic" />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="people" name="Personnel Tracks" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#anPeople)" />
                  <Area type="monotone" dataKey="vehicles" name="Vehicle Tracks" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#anVehicles)" />
                  <Area type="monotone" dataKey="alerts" name="Threat Events" stroke="#ff334b" strokeWidth={2} fillOpacity={1} fill="url(#anAlerts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* People vs Vehicles Donut Chart (5 cols) */}
        <div className="lg:col-span-5">
          <ChartCard
            title="Classification Distribution"
            subtitle="Personnel (Friendly vs Unknown) & Vehicle Types"
          >
            <div className="h-72 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono mt-1">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-400 truncate">{item.name}:</span>
                    <span className="text-slate-100 font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Row 2: Alerts By Category + Camera Node Activity + Daily Events Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts by Category (6 cols) */}
        <div className="lg:col-span-6">
          <ChartCard
            title="Alerts by Threat Category"
            subtitle="Incident frequency by tripwire & neural classification type"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertsByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={10} fontStyle="italic" />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                    {alertsByCategory.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Camera Fleet Activity & Uptime (6 cols) */}
        <div className="lg:col-span-6">
          <ChartCard
            title="Camera Fleet Load & Detections"
            subtitle="Sensor node uptime percentage and 24h tracked objects"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_ANALYTICS.cameraActivity} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="detections" name="Total Detections" fill="#00e5ff" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="alerts" name="Breach Alarms" fill="#ff334b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
