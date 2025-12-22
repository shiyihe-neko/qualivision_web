
import { Project, UNCODED_LABEL, UNCODED_COLOR, TimelineStream } from '../types';

const calculateEffectiveDuration = (project: Project) => {
  const { segments, duration, subtitles } = project;
  return duration || Math.max(...segments.map(s => s.endTime), ...subtitles.map(s => s.endTime), 10);
};

const getStreamStatsData = (project: Project, stream: TimelineStream, effectiveDuration: number) => {
  const streamSegments = project.segments.filter(s => s.streamId === stream.id).sort((a, b) => a.startTime - b.startTime);
  const stats: Record<string, number> = {};
  stream.codes.forEach(c => stats[c.id] = 0);
  stats['uncoded'] = 0;

  let pointer = 0;
  streamSegments.forEach(seg => {
    if (seg.startTime > pointer) stats['uncoded'] += (seg.startTime - pointer);
    stats[seg.codeId] = (stats[seg.codeId] || 0) + (seg.endTime - seg.startTime);
    pointer = Math.max(pointer, seg.endTime);
  });
  if (pointer < effectiveDuration) stats['uncoded'] += (effectiveDuration - pointer);

  return [
    ...stream.codes.map(c => ({ name: c.label, value: Number(stats[c.id].toFixed(2)), color: c.color })),
    { name: UNCODED_LABEL, value: Number(Math.max(0, stats['uncoded']).toFixed(2)), color: UNCODED_COLOR }
  ].filter(d => d.value > 0);
};

const getTranscriptStatsData = (project: Project) => {
  return project.transcriptCodes.map(c => ({
    name: c.label,
    count: project.subtitles.filter(s => s.codeId === c.id).length,
    color: c.color
  })).filter(d => d.count > 0);
};

export const generateSequenceJson = (project: Project, stream: TimelineStream): string => {
  const effectiveDuration = calculateEffectiveDuration(project);
  const streamSegments = project.segments.filter(s => s.streamId === stream.id).sort((a, b) => a.startTime - b.startTime);
  const sequence: any[] = [];
  let pointer = 0;

  streamSegments.forEach(seg => {
    if (seg.startTime > pointer + 0.005) {
      sequence.push({ startTime: pointer, endTime: seg.startTime, duration: seg.startTime - pointer, label: UNCODED_LABEL, isGap: true });
    }
    const code = stream.codes.find(c => c.id === seg.codeId);
    sequence.push({ startTime: seg.startTime, endTime: seg.endTime, duration: seg.endTime - seg.startTime, label: code?.label || 'Unknown', isGap: false });
    pointer = Math.max(pointer, seg.endTime);
  });
  if (pointer < effectiveDuration - 0.005) {
    sequence.push({ startTime: pointer, endTime: effectiveDuration, duration: effectiveDuration - pointer, label: UNCODED_LABEL, isGap: true });
  }
  return JSON.stringify(sequence, null, 2);
};

export const generateCsvContent = (project: Project, stream: TimelineStream): string => {
  const json = JSON.parse(generateSequenceJson(project, stream));
  const headers = ["StartTime", "EndTime", "Duration", "Label", "IsGap"];
  const rows = json.map((item: any) => [
    item.startTime.toFixed(3), item.endTime.toFixed(3), item.duration.toFixed(3), `"${item.label}"`, item.isGap
  ].join(","));
  return [headers.join(","), ...rows].join("\n");
};

export const generateHtmlContent = (project: Project): string => {
  const effectiveDuration = calculateEffectiveDuration(project);
  const transcriptStats = getTranscriptStatsData(project);
  const chartConfigs: any[] = [];
  
  const streamSections = project.streams.map((stream, idx) => {
    const streamSegments = project.segments.filter(s => s.streamId === stream.id);
    const pieData = getStreamStatsData(project, stream, effectiveDuration);
    
    chartConfigs.push({
      type: 'pie',
      id: `chart-pie-${stream.id}`,
      data: pieData
    });

    const timelineHtml = streamSegments.map(seg => {
      const code = stream.codes.find(c => c.id === seg.codeId);
      if (!code) return '';
      const left = (seg.startTime / effectiveDuration) * 100;
      const width = ((seg.endTime - seg.startTime) / effectiveDuration) * 100;
      return `<div style="position:absolute; top:0; bottom:0; left:${left}%; width:${width}%; background:${code.color}; border-right:1px solid rgba(0,0,0,0.1);" title="${code.label}"></div>`;
    }).join('');

    return `
      <div class="mb-12 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div class="flex items-center gap-3 mb-6">
           <span class="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Stream ${idx + 1}</span>
           <h3 class="text-xl font-black text-slate-800">${stream.name}</h3>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div class="flex flex-col items-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 self-start">Time Composition (%)</p>
            <div style="width: 100%; max-width: 260px; height: 260px;">
              <canvas id="chart-pie-${stream.id}"></canvas>
            </div>
          </div>

          <div class="flex flex-col justify-center">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sequence Timeline Strip</p>
            <div style="position:relative; width:100%; height:48px; background:#f1f5f9; border-radius:12px; overflow:hidden; border: 1px solid #e2e8f0; margin-bottom: 24px;">
              <div style="position:absolute; inset:0; opacity:0.05; background:${UNCODED_COLOR}"></div>
              ${timelineHtml}
            </div>
            
            <div class="grid grid-cols-2 gap-x-6 gap-y-2">
              ${pieData.map(d => `
                <div class="flex items-center justify-between text-[11px] border-b border-slate-50 pb-1">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" style="background:${d.color}"></span>
                    <span class="font-bold text-slate-600">${d.name}</span>
                  </div>
                  <span class="font-mono text-slate-400">${d.value}s (${((d.value/effectiveDuration)*100).toFixed(1)}%)</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>QualiVision Analysis Report: ${project.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .transcript-content, .transcript-content * {
          background-color: transparent !important;
        }
      </style>
    </head>
    <body class="bg-slate-50 p-10 max-w-6xl mx-auto font-sans text-slate-900">
      <header class="mb-12 border-b-4 border-blue-600 pb-8 flex justify-between items-end">
        <div>
          <h1 class="text-5xl font-black tracking-tighter text-slate-900 mb-2">Analysis Report</h1>
          <div class="flex gap-4 text-slate-400 font-mono text-xs uppercase tracking-widest">
            <span>Project: ${project.name}</span>
            <span>Duration: ${effectiveDuration.toFixed(2)}s</span>
          </div>
        </div>
        <div class="text-right text-[10px] font-black text-slate-300 uppercase tracking-widest">
          Generated via QualiVision
        </div>
      </header>

      ${streamSections}

      <section class="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-16 mb-20">
        <div class="lg:col-span-1">
          <h2 class="text-2xl font-black text-slate-800 mb-4 tracking-tight">Transcript Themes</h2>
          <p class="text-sm text-slate-500 leading-relaxed">Distribution of thematic codes across the annotated transcript segments.</p>
        </div>
        <div class="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div style="height: 300px; width: 100%;">
            <canvas id="transcriptChart"></canvas>
          </div>
        </div>
      </section>

      <section class="mt-20">
        <h2 class="text-2xl font-black mb-8 text-slate-800 tracking-tight">Annotated Transcript</h2>
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                <th class="p-6 w-24 text-center">Time</th>
                <th class="p-6 w-32">Theme</th>
                <th class="p-6">Content</th>
              </tr>
            </thead>
            <tbody>
              ${project.subtitles.map(s => {
                const code = project.transcriptCodes.find(c => c.id === s.codeId);
                return `
                  <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td class="p-6 font-mono text-xs text-slate-400 text-center">${s.startTime.toFixed(2)}s</td>
                    <td class="p-6">
                      ${code ? `<span style="background:${code.color};color:white;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:900;text-transform:uppercase;">${code.label}</span>` : '<span class="text-slate-200">---</span>'}
                    </td>
                    <td class="p-6 text-slate-700 leading-relaxed transcript-content">${s.html}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <script>
        window.addEventListener('load', function() {
          const streamCharts = ${JSON.stringify(chartConfigs)};
          const transcriptData = ${JSON.stringify(transcriptStats)};
          
          streamCharts.forEach(conf => {
            const el = document.getElementById(conf.id);
            if (!el) return;
            new Chart(el.getContext('2d'), {
              type: 'doughnut',
              data: {
                labels: conf.data.map(d => d.name),
                datasets: [{
                  data: conf.data.map(d => d.value),
                  backgroundColor: conf.data.map(d => d.color),
                  borderWidth: 0
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ctx.label + ': ' + ctx.raw + 's'
                    }
                  }
                }
              }
            });
          });

          const tCtx = document.getElementById('transcriptChart');
          if (tCtx) {
            new Chart(tCtx.getContext('2d'), {
              type: 'bar',
              data: {
                labels: transcriptData.map(d => d.name),
                datasets: [{
                  label: 'Occurrences',
                  data: transcriptData.map(d => d.count),
                  backgroundColor: transcriptData.map(d => d.color),
                  borderRadius: 8
                }]
              },
              options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { precision: 0 } },
                  y: { grid: { display: false } }
                }
              }
            });
          }
        });
      </script>

      <footer class="mt-20 pt-10 border-t border-slate-200 text-center pb-20">
        <p class="text-slate-300 text-[10px] font-bold uppercase tracking-widest">End of Qualitative Analysis Report</p>
      </footer>
    </body>
    </html>
  `;
};

const downloadFile = (filename: string, content: string | Blob, mimeType: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const saveProjectPackage = async (project: Project, videoFile: File | null) => {
  const safeName = project.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
  
  if ('showDirectoryPicker' in window) {
    try {
      const rootHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const projectDir = await rootHandle.getDirectoryHandle(`${safeName}_package`, { create: true });

      const htmlHandle = await projectDir.getFileHandle(`report.html`, { create: true });
      const wHtml = await htmlHandle.createWritable();
      await wHtml.write(generateHtmlContent(project));
      await wHtml.close();

      for (const stream of project.streams) {
        const streamSafeName = stream.name.replace(/\s+/g, '_').toLowerCase();
        
        const csvHandle = await projectDir.getFileHandle(`sequence_${streamSafeName}.csv`, { create: true });
        const wCsv = await csvHandle.createWritable();
        await wCsv.write(generateCsvContent(project, stream));
        await wCsv.close();

        const jsonHandle = await projectDir.getFileHandle(`sequence_${streamSafeName}.json`, { create: true });
        const wJson = await jsonHandle.createWritable();
        await wJson.write(generateSequenceJson(project, stream));
        await wJson.close();
      }

      const backupHandle = await projectDir.getFileHandle(`full_project_backup.json`, { create: true });
      const wBackup = await backupHandle.createWritable();
      await wBackup.write(JSON.stringify(project, null, 2));
      await wBackup.close();

      if (videoFile) {
        const videoHandle = await projectDir.getFileHandle(videoFile.name, { create: true });
        const wVideo = await videoHandle.createWritable();
        await wVideo.write(videoFile);
        await wVideo.close();
      }

      alert("Package exported successfully!");
      return true;
    } catch (e) {
      console.error(e);
    }
  }

  downloadFile(`${safeName}_report.html`, generateHtmlContent(project), 'text/html');
  return true;
};
