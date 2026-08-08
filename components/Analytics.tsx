
import React, { useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { CodeDefinition, Project, UNCODED_COLOR, UNCODED_LABEL } from '../types';
import { GitBranch, Layers3, PieChart as PieChartIcon } from 'lucide-react';

interface AnalyticsProps {
  project: Project;
}

type AnalyticsView = 'overview' | 'sunburst' | 'tree';

const polarPoint = (radius: number, angle: number) => {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 300 + radius * Math.cos(radians), y: 300 + radius * Math.sin(radians) };
};

const ringArcPath = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const safeEnd = Math.min(endAngle, startAngle + 359.999);
  const outerStart = polarPoint(outerRadius, startAngle);
  const outerEnd = polarPoint(outerRadius, safeEnd);
  const innerEnd = polarPoint(innerRadius, safeEnd);
  const innerStart = polarPoint(innerRadius, startAngle);
  const largeArc = safeEnd - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z'
  ].join(' ');
};

const Analytics: React.FC<AnalyticsProps> = ({ project }) => {
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');
  const { streams, segments, transcriptCodes, duration, subtitles } = project;

  const effectiveDuration = duration || Math.max(...segments.map(s => s.endTime), ...subtitles.map(s => s.endTime), 10);

  const orderedStreams = (() => {
    const result: typeof streams = [];
    const visited = new Set<string>();
    const append = (parentId?: string) => streams
      .filter(stream => {
        const normalizedParent = stream.parentId && streams.some(candidate => candidate.id === stream.parentId) ? stream.parentId : undefined;
        return normalizedParent === parentId && !visited.has(stream.id);
      })
      .forEach(stream => {
        visited.add(stream.id);
        result.push(stream);
        append(stream.id);
      });
    append();
    streams.filter(stream => !visited.has(stream.id)).forEach(stream => result.push(stream));
    return result;
  })();

  const streamDepth = (streamId: string) => {
    let depth = 0;
    let current = streams.find(stream => stream.id === streamId);
    const visited = new Set<string>();
    while (current?.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId);
      current = streams.find(stream => stream.id === current?.parentId);
      if (current) depth += 1;
    }
    return depth;
  };

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

  const renderCodeTree = (streamId: string, codes: CodeDefinition[], parentId?: string, visited = new Set<string>()): React.ReactNode => {
    const children = codes.filter(code => {
      const normalizedParent = code.parentId && codes.some(candidate => candidate.id === code.parentId) ? code.parentId : undefined;
      return normalizedParent === parentId && !visited.has(code.id);
    });
    return children.map(code => {
      const nextVisited = new Set(visited).add(code.id);
      const codeSegments = segments
        .filter(segment => segment.streamId === streamId && segment.codeId === code.id)
        .sort((a, b) => a.startTime - b.startTime);
      return (
        <li key={code.id} className="ml-5 border-l border-slate-700 pl-4 py-2">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: code.color }} />
            <span className="font-bold text-slate-200">{code.label}</span>
            <span className="text-[10px] font-mono text-slate-500">{codeSegments.length} segments</span>
          </div>
          {codeSegments.length > 0 && (
            <div className="ml-6 mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
              {codeSegments.map((segment, index) => (
                <React.Fragment key={segment.id}>
                  {index > 0 && <span className="text-slate-600">→</span>}
                  <span className="bg-slate-800 border border-slate-700 rounded px-2 py-1" title={segment.note || undefined}>
                    {segment.startTime.toFixed(2)}s–{segment.endTime.toFixed(2)}s
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          {codes.some(child => child.parentId === code.id) && <ul>{renderCodeTree(streamId, codes, code.id, nextVisited)}</ul>}
        </li>
      );
    });
  };

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

      <div className="flex gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-1.5 w-fit">
        {([
          ['overview', 'Overview', PieChartIcon],
          ['sunburst', 'Aligned Sunburst', Layers3],
          ['tree', 'Hierarchy & Evolution', GitBranch]
        ] as const).map(([view, label, Icon]) => (
          <button key={view} onClick={() => setActiveView(view)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeView === view ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeView === 'sunburst' && (
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-200">Time-aligned multi-stream sunburst</h3>
            <p className="text-sm text-slate-500 mt-1">All rings share the same clockwise timeline, starting at 12 o'clock. Each ring is one stream.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(420px,620px)_1fr] gap-10 items-center">
            <svg viewBox="0 0 600 600" className="w-full max-w-[620px] mx-auto" role="img" aria-label="Concentric timeline with one ring per analysis stream">
              {orderedStreams.map((stream, streamIndex) => {
                const ringStep = Math.min(42, 185 / Math.max(orderedStreams.length, 1));
                const innerRadius = 85 + streamIndex * ringStep;
                const ringWidth = Math.max(1.5, ringStep - Math.min(6, ringStep * 0.2));
                const outerRadius = innerRadius + ringWidth;
                return (
                  <g key={stream.id}>
                    <circle cx="300" cy="300" r={(innerRadius + outerRadius) / 2} fill="none" stroke="#1e293b" strokeWidth={ringWidth} />
                    {segments.filter(segment => segment.streamId === stream.id).map(segment => {
                      const code = stream.codes.find(item => item.id === segment.codeId);
                      if (!code || effectiveDuration <= 0) return null;
                      const startAngle = Math.max(0, segment.startTime / effectiveDuration * 360);
                      const endAngle = Math.min(360, segment.endTime / effectiveDuration * 360);
                      if (endAngle <= startAngle) return null;
                      return (
                        <path key={segment.id} d={ringArcPath(innerRadius, outerRadius, startAngle, endAngle)} fill={code.color} stroke="#020617" strokeWidth="1">
                          <title>{stream.name} · {code.label}: {segment.startTime.toFixed(2)}s–{segment.endTime.toFixed(2)}s</title>
                        </path>
                      );
                    })}
                  </g>
                );
              })}
              <circle cx="300" cy="300" r="72" fill="#0f172a" stroke="#334155" />
              <text x="300" y="292" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700">{effectiveDuration.toFixed(1)}s</text>
              <text x="300" y="316" textAnchor="middle" fill="#64748b" fontSize="11">clockwise timeline</text>
            </svg>
            <div className="space-y-5">
              {orderedStreams.map((stream, index) => (
                <div key={stream.id} className="border-b border-slate-800 pb-4">
                  <div className="text-sm font-bold text-slate-200 mb-2" style={{ paddingLeft: `${streamDepth(stream.id) * 16}px` }}>
                    Ring {index + 1}: {stream.name}{stream.parentId ? ' ↳ child stream' : ''}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stream.codes.map(code => (
                      <span key={code.id} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: code.color }} />{code.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeView === 'tree' && (
        <section className="space-y-6">
          {orderedStreams.map((stream, index) => (
            <div key={stream.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-7" style={{ marginLeft: `${streamDepth(stream.id) * 28}px` }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full">{stream.parentId ? 'CHILD STREAM' : `STREAM ${index + 1}`}</span>
                <h3 className="text-lg font-bold text-slate-200">{stream.name}</h3>
              </div>
              <ul>{renderCodeTree(stream.id, stream.codes)}</ul>
              {stream.codes.length === 0 && <p className="text-sm text-slate-500">No codes defined.</p>}
            </div>
          ))}
        </section>
      )}

      {activeView === 'overview' && <>

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
      </>}
    </div>
  );
};

export default Analytics;
