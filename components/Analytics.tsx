
import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Project, UNCODED_COLOR, UNCODED_LABEL } from '../types';
import { Clock, Download, FileSpreadsheet, FileJson } from 'lucide-react';

interface AnalyticsProps {
  project: Project;
}

const Analytics: React.FC<AnalyticsProps> = ({ project }) => {
  const { streams, segments, transcriptCodes, duration, subtitles } = project;

  const effectiveDuration = duration || Math.max(...segments.map(s => s.endTime), ...subtitles.map(s => s.endTime), 10);

  const getStreamStats = (streamId: string, codes: any[]) => {
    const streamSegments = segments.filter(s => s.streamId === streamId).sort((a, b) => a.startTime - b.startTime);
    const stats: Record<string, number> = {};
    codes.forEach(c => stats[c.id] = 0);
    stats['uncoded'] = 0;

    let pointer = 0;
    streamSegments.forEach(seg => {
      if (seg.startTime > pointer) stats['uncoded'] += (seg.startTime - pointer);
      stats[seg.codeId] = (stats[seg.codeId] || 0) + (seg.endTime - seg.startTime);
      pointer = Math.max(pointer, seg.endTime);
    });
    if (pointer < effectiveDuration) stats['uncoded'] += (effectiveDuration - pointer);

    return [
      ...codes.map(c => ({ name: c.label, value: Number(stats[c.id].toFixed(2)), color: c.color })),
      { name: UNCODED_LABEL, value: Number(Math.max(0, stats['uncoded']).toFixed(2)), color: UNCODED_COLOR }
    ].filter(d => d.value > 0);
  };

  const transcriptData = transcriptCodes.map(c => ({
    name: c.label,
    count: subtitles.filter(s => s.codeId === c.id).length,
    color: c.color
  })).filter(d => d.count > 0);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8 space-y-12">
      <header className="border-b border-slate-800 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Qualitative Analytics Report</h2>
          <p className="text-slate-500 mt-2 font-medium">Multi-stream Sequence Analysis: {streams.length} distinct behaviors tracked.</p>
        </div>
        <div className="text-right font-mono text-sm text-slate-400 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
          Total Duration: {effectiveDuration.toFixed(2)}s
        </div>
      </header>

      {/* 循环渲染每个 Stream 的分析 */}
      {streams.map((stream, idx) => {
        const pieData = getStreamStats(stream.id, stream.codes);
        return (
          <section key={stream.id} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Stream {idx + 1}</div>
              <h3 className="text-xl font-bold text-slate-200">{stream.name} Analysis</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center h-[400px]">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 w-full">Time Composition (%)</h4>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
                      <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 h-[400px]">
                 <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Sequence Timeline Strip</h4>
                 <div className="relative w-full h-16 bg-black rounded-xl overflow-hidden shadow-inner mb-6">
                    {segments.filter(s => s.streamId === stream.id).map(seg => {
                      const c = stream.codes.find(cd => cd.id === seg.codeId);
                      return (
                        <div key={seg.id} className="absolute top-0 bottom-0 border-r border-black/20" 
                          style={{ left: `${(seg.startTime/effectiveDuration)*100}%`, width: `${((seg.endTime-seg.startTime)/effectiveDuration)*100}%`, backgroundColor: c?.color }} />
                      );
                    })}
                 </div>
                 <div className="space-y-3 overflow-y-auto h-40 custom-scrollbar pr-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs p-2 bg-slate-800/40 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}} />
                          <span className="text-slate-300 font-bold">{d.name}</span>
                        </div>
                        <span className="font-mono text-slate-500">{d.value}s ({((d.value/effectiveDuration)*100).toFixed(1)}%)</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Transcript 统计 */}
      <section className="pt-12 border-t border-slate-800">
        <h3 className="text-xl font-bold text-slate-200 mb-8">Transcript Content Theming</h3>
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transcriptData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#475569" />
              <YAxis dataKey="name" type="category" stroke="#475569" width={120} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <Tooltip cursor={{fill: '#1e293b', opacity: 0.4}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {transcriptData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Analytics;
