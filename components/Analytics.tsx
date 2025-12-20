
import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Project, UNCODED_COLOR, UNCODED_LABEL } from '../types';
import { Download, FileJson, FileCode, Clock, Save, FileSpreadsheet } from 'lucide-react';
import { generateCsvContent, generateHtmlContent, generateSequenceJson } from '../services/exportService';

interface AnalyticsProps {
  project: Project;
}

const Analytics: React.FC<AnalyticsProps> = ({ project }) => {
  const { segments, timelineCodes, transcriptCodes, duration, subtitles } = project;

  // --- 1. Smart Duration Inference (Robust) ---
  const maxSegmentTime = segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0;
  const maxSubtitleTime = subtitles.length > 0 ? Math.max(...subtitles.map(s => s.endTime)) : 0;
  
  let effectiveDuration = duration;
  if (!Number.isFinite(effectiveDuration) || effectiveDuration <= 0) {
      effectiveDuration = Math.max(maxSegmentTime, maxSubtitleTime);
  }
  if (effectiveDuration === 0) effectiveDuration = 10;

  // --- 2. Logic for Timeline Stats (Distribution) ---
  const getFullTimelineData = () => {
    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    let pointer = 0;
    const stats: Record<string, number> = {};

    timelineCodes.forEach(c => stats[c.id] = 0);
    stats['uncoded'] = 0;

    sorted.forEach(seg => {
      if (seg.startTime > pointer) {
        const gapDuration = seg.startTime - pointer;
        stats['uncoded'] += gapDuration;
      }
      const segDuration = seg.endTime - seg.startTime;
      if (seg.codeId) stats[seg.codeId] = (stats[seg.codeId] || 0) + segDuration;
      pointer = Math.max(pointer, seg.endTime);
    });

    if (pointer < effectiveDuration) {
       const gapDuration = effectiveDuration - pointer;
       stats['uncoded'] += gapDuration;
    }
    
    if (stats['uncoded'] < 0) stats['uncoded'] = 0;

    return { stats };
  };

  const getTranscriptStats = () => {
      const counts: Record<string, number> = {};
      transcriptCodes.forEach(c => counts[c.id] = 0);
      
      subtitles.forEach(sub => {
          if (sub.codeId) {
              counts[sub.codeId] = (counts[sub.codeId] || 0) + 1;
          }
      });

      return Object.entries(counts)
        .map(([id, count]) => {
            const code = transcriptCodes.find(c => c.id === id);
            return {
                name: code?.label || id,
                count: count,
                color: code?.color || '#ccc'
            };
        })
        .filter(d => d.count > 0);
  };

  const { stats } = getFullTimelineData();
  const transcriptData = getTranscriptStats();

  const pieData = [
    ...timelineCodes.map(c => ({
      name: c.label,
      value: Number(stats[c.id]?.toFixed(2) || 0),
      color: c.color
    })),
    {
      name: UNCODED_LABEL,
      value: Number(stats['uncoded']?.toFixed(2) || 0),
      color: UNCODED_COLOR
    }
  ].filter(d => d.value > 0);

  // --- Helpers ---
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Exports ---
  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    download(dataStr, `${project.name}_full_backup.json`);
  };

  const downloadSequenceJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(generateSequenceJson(project));
    download(dataStr, `${project.name}_sequence.json`);
  };

  const downloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(generateCsvContent(project));
    download(csvContent, `${project.name}_sequence.csv`);
  };

  const downloadHTML = () => {
    const html = generateHtmlContent(project);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    download(url, `${project.name}_visual_report.html`);
  };

  const download = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const isCompletelyEmpty = segments.length === 0 && transcriptData.length === 0;

  if (isCompletelyEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No analysis data available yet.</p>
        <p className="text-sm mt-2 opacity-70">Add codes to the timeline or transcript to see results.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8 space-y-8">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
            <h2 className="text-2xl font-bold text-white">Analysis Report</h2>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-slate-400">Independent analysis for Sequence (Timeline) and Content (Transcript).</p>
               <span className="text-slate-600">|</span>
               <span className="text-slate-500 text-sm font-mono">Total Duration: {effectiveDuration.toFixed(2)}s</span>
            </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex gap-2">
              <button onClick={downloadCSV} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors" title="Export clean timeline sequence data for analysis">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Sequence CSV
              </button>
              <button onClick={downloadSequenceJson} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium transition-colors" title="Export clean timeline sequence data structure">
                <FileJson className="w-3.5 h-3.5" /> Sequence JSON
              </button>
           </div>
           <div className="flex gap-2">
              <button onClick={downloadBackup} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs font-medium transition-colors border border-slate-700" title="Full Project Backup (Use this to resume work)">
                <Save className="w-3.5 h-3.5" /> Project Backup
              </button>
              <button onClick={downloadHTML} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-lg shadow-indigo-900/20">
                <FileCode className="w-3.5 h-3.5" /> Full Visual Report (.html)
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
          {/* Timeline Visual Strip */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">Behavioral Sequence Timeline</h3>
                <div className="flex gap-4 text-xs">
                    {timelineCodes.map(c => (
                        <div key={c.id} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{backgroundColor: c.color}}></span>
                            <span className="text-slate-400">{c.label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm opacity-50" style={{backgroundColor: UNCODED_COLOR}}></span>
                        <span className="text-slate-500">{UNCODED_LABEL}</span>
                    </div>
                </div>
             </div>
             
             <div className="relative w-full h-16 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 shadow-inner group">
                <div className="absolute inset-0 opacity-20" style={{backgroundColor: UNCODED_COLOR}}></div>
                {segments.length > 0 ? (
                    segments.map(seg => {
                        const code = timelineCodes.find(c => c.id === seg.codeId);
                        if (!code) return null;
                        
                        let leftPct = (seg.startTime / effectiveDuration) * 100;
                        const duration = seg.endTime - seg.startTime;
                        let widthPct = Math.max(0.5, (duration / effectiveDuration) * 100);
                        
                        if (leftPct > 100) leftPct = 100;
                        if (leftPct + widthPct > 100) widthPct = 100 - leftPct;

                        return (
                            <div
                                key={seg.id}
                                className="absolute top-0 bottom-0 hover:brightness-110 transition-all cursor-help border-r border-black/10 z-10"
                                style={{
                                    left: `${leftPct.toFixed(2)}%`,
                                    width: `${widthPct.toFixed(2)}%`,
                                    backgroundColor: code.color
                                }}
                                title={`${code.label}: ${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}`}
                            >
                                <span className="sr-only">{code.label}</span>
                            </div>
                        );
                    })
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm italic z-0">
                        No segments recorded
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-4 flex justify-between px-2 text-[10px] text-slate-400 font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent z-20">
                     <span>0:00</span>
                     <span>{formatTime(effectiveDuration / 2)}</span>
                     <span>{formatTime(effectiveDuration)}</span>
                </div>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-slate-200">Time Distribution</h3>
             <span className="text-xs font-mono text-slate-500 uppercase">Total Duration by Code</span>
          </div>
          <div className="flex-1 w-full min-h-0">
             {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                      formatter={(value: number) => [`${value.toFixed(2)}s`, 'Total Duration']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                 <p className="text-sm font-medium">No timeline data found</p>
                 <p className="text-xs opacity-70 mt-1">Try adding codes in the Timeline view</p>
               </div>
             )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-slate-200">Transcript Code Frequency</h3>
             <span className="text-xs font-mono text-slate-500 uppercase">Count of Themes</span>
          </div>
          <div className="flex-1 w-full min-h-0">
             {transcriptData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transcriptData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#334155', opacity: 0.2}}
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {transcriptData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                 <p className="text-sm font-medium">No transcript codes found</p>
                 <p className="text-xs opacity-70 mt-1">Assign categories in Transcript view</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
