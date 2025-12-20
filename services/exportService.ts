
import { Project, UNCODED_LABEL, UNCODED_COLOR } from '../types';

// Helper to calculate statistics
const calculateStats = (project: Project) => {
  const { segments, timelineCodes, transcriptCodes, duration, subtitles } = project;
  
  const maxSegmentTime = segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0;
  const maxSubtitleTime = subtitles.length > 0 ? Math.max(...subtitles.map(s => s.endTime)) : 0;
  
  let effectiveDuration = duration;
  if (!Number.isFinite(effectiveDuration) || effectiveDuration <= 0) {
     effectiveDuration = Math.max(maxSegmentTime, maxSubtitleTime);
  }
  if (effectiveDuration === 0) effectiveDuration = 10;

  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  const timelineStats: Record<string, number> = {};
  timelineCodes.forEach(c => timelineStats[c.id] = 0);
  timelineStats['uncoded'] = 0;
  
  let pointer = 0;
  sorted.forEach(seg => {
    if (seg.startTime > pointer + 0.001) {
      timelineStats['uncoded'] += (seg.startTime - pointer);
    }
    const dur = seg.endTime - seg.startTime;
    if (seg.codeId) timelineStats[seg.codeId] = (timelineStats[seg.codeId] || 0) + dur;
    pointer = Math.max(pointer, seg.endTime);
  });

  if (pointer < effectiveDuration) {
    timelineStats['uncoded'] += (effectiveDuration - pointer);
  }

  const pieData = [
    ...timelineCodes.map(c => ({
      name: c.label,
      value: Number(timelineStats[c.id]?.toFixed(2) || 0),
      color: c.color
    })),
    { name: UNCODED_LABEL, value: Number(Math.max(0, timelineStats['uncoded']).toFixed(2)), color: UNCODED_COLOR }
  ].filter(d => d.value > 0);

  const transcriptCounts: Record<string, number> = {};
  transcriptCodes.forEach(c => transcriptCounts[c.id] = 0);
  subtitles.forEach(sub => {
    if (sub.codeId) transcriptCounts[sub.codeId] = (transcriptCounts[sub.codeId] || 0) + 1;
  });

  const barData = Object.entries(transcriptCounts)
    .map(([id, count]) => {
        const code = transcriptCodes.find(c => c.id === id);
        return { name: code?.label || id, count, color: code?.color || '#ccc' };
    })
    .filter(d => d.count > 0);

  return { pieData, barData, effectiveDuration };
};

// Generates a comprehensive Visual Report in HTML format with SVG charts
export const generateHtmlContent = (project: Project): string => {
  const { pieData, barData, effectiveDuration } = calculateStats(project);
  
  // Calculate SVG Pie Chart Paths
  let currentAngle = 0;
  const piePaths = pieData.map(d => {
    const sliceAngle = (d.value / effectiveDuration) * 360;
    const x1 = Math.cos((currentAngle - 90) * Math.PI / 180) * 80 + 100;
    const y1 = Math.sin((currentAngle - 90) * Math.PI / 180) * 80 + 100;
    currentAngle += sliceAngle;
    const x2 = Math.cos((currentAngle - 90) * Math.PI / 180) * 80 + 100;
    const y2 = Math.sin((currentAngle - 90) * Math.PI / 180) * 80 + 100;
    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
    return `<path d="M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${d.color}" />`;
  }).join('');

  // Calculate SVG Bar Chart
  const maxCount = Math.max(...barData.map(d => d.count), 1);
  const barChartHtml = barData.map((d, i) => {
    const barWidth = (d.count / maxCount) * 100;
    return `
      <div style="display:flex; align-items:center; margin-bottom: 8px;">
        <div style="width: 120px; font-size: 12px; text-align:right; padding-right:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${d.name}</div>
        <div style="flex:1; background: #e2e8f0; border-radius: 4px; height: 16px;">
          <div style="width: ${barWidth}%; background: ${d.color}; height: 100%; border-radius: 4px; display:flex; align-items:center; padding-left:4px; font-size:10px; color:white; font-weight:bold;">${d.count}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Analysis Report: ${project.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background: #f8fafc; color: #1e293b; }
        .print-break { page-break-after: always; }
      </style>
    </head>
    <body class="p-8 max-w-5xl mx-auto">
      <header class="flex justify-between items-end border-b-2 border-slate-200 pb-4 mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">QualiVision Analysis Report</h1>
          <p class="text-slate-500 font-mono mt-1 uppercase text-xs tracking-widest">Project: ${project.name} | Created: ${new Date(project.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] text-slate-400 font-bold uppercase">Duration</p>
          <p class="text-xl font-mono font-bold">${effectiveDuration.toFixed(2)}s</p>
        </div>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <h3 class="w-full text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Time Composition (%)</h3>
          <svg width="200" height="200" viewBox="0 0 200 200" class="drop-shadow-sm">
            ${piePaths}
            <circle cx="100" cy="100" r="50" fill="white" />
          </svg>
          <div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 w-full">
            ${pieData.map(d => `
              <div class="flex items-center gap-2 text-xs">
                <span class="w-2.5 h-2.5 rounded-full" style="background:${d.color}"></span>
                <span class="text-slate-600 font-medium">${d.name}</span>
                <span class="ml-auto font-mono text-slate-400">${((d.value / effectiveDuration) * 100).toFixed(1)}%</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Thematic Frequency (Counts)</h3>
          <div class="mt-4">
            ${barChartHtml || '<p class="text-center py-10 text-slate-300 italic text-sm">No coded transcript themes yet.</p>'}
          </div>
        </div>
      </section>

      <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-12">
        <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Behavioral Sequence Visualization</h3>
        <div style="position:relative; width:100%; height:40px; background:#f1f5f9; border-radius:8px; overflow:hidden; border: 1px solid #e2e8f0;">
          <div style="position:absolute; inset:0; opacity:0.1; background:${UNCODED_COLOR}"></div>
          ${project.segments.map(seg => {
            const code = project.timelineCodes.find(c => c.id === seg.codeId);
            if (!code) return '';
            const left = (seg.startTime / effectiveDuration) * 100;
            const width = ((seg.endTime - seg.startTime) / effectiveDuration) * 100;
            return `<div style="position:absolute; top:0; bottom:0; left:${left}%; width:${width}%; background:${code.color}; border-right:1px solid rgba(0,0,0,0.1);" title="${code.label}"></div>`;
          }).join('')}
        </div>
        <div class="flex justify-between mt-2 text-[10px] font-mono text-slate-400">
          <span>0:00</span>
          <span>${Math.floor(effectiveDuration/60)}:${Math.floor(effectiveDuration%60).toString().padStart(2,'0')}</span>
        </div>
      </section>

      <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Annotated Transcript</h3>
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b-2 border-slate-50 border-slate-100">
              <th class="py-3 px-4 text-slate-400 font-bold uppercase text-[10px]">Time</th>
              <th class="py-3 px-4 text-slate-400 font-bold uppercase text-[10px]">Category</th>
              <th class="py-3 px-4 text-slate-400 font-bold uppercase text-[10px]">Content</th>
            </tr>
          </thead>
          <tbody>
            ${project.subtitles.map(sub => {
              const code = project.transcriptCodes.find(c => c.id === sub.codeId);
              const label = code ? `<span class="px-2 py-0.5 rounded text-[10px] font-black text-white" style="background:${code.color}">${code.label}</span>` : '<span class="text-slate-300">Uncoded</span>';
              return `
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td class="py-3 px-4 font-mono text-slate-500 text-xs">${new Date(sub.startTime * 1000).toISOString().substr(14, 5)}</td>
                  <td class="py-3 px-4">${label}</td>
                  <td class="py-3 px-4 text-slate-700 leading-relaxed">${sub.html}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </section>

      <footer class="mt-12 pt-8 border-t border-slate-100 text-center text-slate-300 text-[10px] font-bold tracking-widest uppercase">
        Generated by QualiVision &copy; ${new Date().getFullYear()} - Professional Qualitative Analysis
      </footer>
    </body>
    </html>
  `;
};

// EXPORT: CSV (Pure behavioral sequence including GAPs)
export const generateCsvContent = (project: Project): string => {
  const { segments, timelineCodes, duration } = project;
  const headers = ["StartTime", "EndTime", "Duration", "CodeID", "CodeLabel"];
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  const fullSequence: any[] = [];
  let pointer = 0;

  sortedSegments.forEach(seg => {
    if (seg.startTime > pointer + 0.005) {
      fullSequence.push({
        startTime: pointer,
        endTime: seg.startTime,
        duration: seg.startTime - pointer,
        codeId: "uncoded",
        label: UNCODED_LABEL
      });
    }
    const code = timelineCodes.find(c => c.id === seg.codeId);
    fullSequence.push({
      startTime: seg.startTime,
      endTime: seg.endTime,
      duration: seg.endTime - seg.startTime,
      codeId: seg.codeId,
      label: code ? code.label : 'Unknown'
    });
    pointer = Math.max(pointer, seg.endTime);
  });

  if (pointer < duration - 0.005) {
    fullSequence.push({
      startTime: pointer,
      endTime: duration,
      duration: duration - pointer,
      codeId: "uncoded",
      label: UNCODED_LABEL
    });
  }

  const rows = fullSequence.map(item => [
    item.startTime.toFixed(3),
    item.endTime.toFixed(3),
    item.duration.toFixed(3),
    item.codeId,
    item.label
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
};

export const generateSequenceJson = (project: Project): string => {
    const { segments, timelineCodes, duration } = project;
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
    const fullSequence: any[] = [];
    let pointer = 0;

    sortedSegments.forEach(seg => {
      if (seg.startTime > pointer + 0.005) {
        fullSequence.push({
          startTime: Number(pointer.toFixed(3)),
          endTime: Number(seg.startTime.toFixed(3)),
          duration: Number((seg.startTime - pointer).toFixed(3)),
          codeId: "uncoded",
          label: UNCODED_LABEL,
          isGap: true
        });
      }
      const code = timelineCodes.find(c => c.id === seg.codeId);
      fullSequence.push({
        startTime: Number(seg.startTime.toFixed(3)),
        endTime: Number(seg.endTime.toFixed(3)),
        duration: Number((seg.endTime - seg.startTime).toFixed(3)),
        codeId: seg.codeId,
        label: code ? code.label : 'Unknown',
        isGap: false
      });
      pointer = Math.max(pointer, seg.endTime);
    });

    if (pointer < duration - 0.005) {
      fullSequence.push({
        startTime: Number(pointer.toFixed(3)),
        endTime: Number(duration.toFixed(3)),
        duration: Number((duration - pointer).toFixed(3)),
        codeId: "uncoded",
        label: UNCODED_LABEL,
        isGap: true
      });
    }
    return JSON.stringify(fullSequence, null, 2);
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
  URL.revokeObjectURL(url);
};

// Main Export Entry Point - NOW SUPPORTS VIDEO SAVING
export const saveProjectPackage = async (project: Project, videoFile: File | null) => {
  const safeName = project.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
  const folderName = `${safeName}_analysis_package`;
  
  const fullProjectJson = JSON.stringify(project, null, 2);
  const sequenceJson = generateSequenceJson(project);
  const csvContent = generateCsvContent(project);
  const htmlContent = generateHtmlContent(project);

  try {
    // Attempt to use modern File System Access API
    if ('showDirectoryPicker' in window) {
      const rootHandle = await (window as any).showDirectoryPicker({ 
        mode: 'readwrite',
        startIn: 'downloads' 
      });
      
      const projectDir = await rootHandle.getDirectoryHandle(folderName, { create: true });

      // 1. Save HTML Visual Report
      const htmlHandle = await projectDir.getFileHandle(`${safeName}_report.html`, { create: true });
      const wHtml = await htmlHandle.createWritable();
      await wHtml.write(htmlContent);
      await wHtml.close();

      // 2. Save Sequence CSV
      const csvHandle = await projectDir.getFileHandle(`${safeName}_sequence.csv`, { create: true });
      const wCsv = await csvHandle.createWritable();
      await wCsv.write(csvContent);
      await wCsv.close();

      // 3. Save Sequence JSON
      const jsonHandle = await projectDir.getFileHandle(`${safeName}_sequence.json`, { create: true });
      const wJson = await jsonHandle.createWritable();
      await wJson.write(sequenceJson);
      await wJson.close();

      // 4. Save Full Project Backup
      const backupHandle = await projectDir.getFileHandle(`${safeName}_full_backup.json`, { create: true });
      const wBackup = await backupHandle.createWritable();
      await wBackup.write(fullProjectJson);
      await wBackup.close();

      // 5. Save Video File (The real "Pack" part)
      if (videoFile) {
        const videoHandle = await projectDir.getFileHandle(videoFile.name, { create: true });
        const wVideo = await videoHandle.createWritable();
        await wVideo.write(videoFile);
        await wVideo.close();
      }

      alert(`✅ Analysis exported successfully!\n\nLocation: /${folderName}\nFiles: HTML Report, CSV, JSON, Video.`);
      return true;
    } else {
      throw new Error("Filesystem API unavailable");
    }
  } catch (error: any) {
    if (error.name === 'AbortError') return false;
    
    alert("Notice: Individual files will be downloaded due to browser restrictions.");
    
    // Fallback: Individual downloads
    downloadFile(`${safeName}_report.html`, htmlContent, 'text/html');
    setTimeout(() => downloadFile(`${safeName}_sequence.csv`, csvContent, 'text/csv'), 200);
    setTimeout(() => downloadFile(`${safeName}_sequence.json`, sequenceJson, 'application/json'), 400);
    setTimeout(() => downloadFile(`${safeName}_full_backup.json`, fullProjectJson, 'application/json'), 600);
    if (videoFile) {
      setTimeout(() => downloadFile(videoFile.name, videoFile, videoFile.type), 1000);
    }
    return true;
  }
};
