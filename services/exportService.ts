
import { Project, UNCODED_LABEL, UNCODED_COLOR, TimelineStream } from '../types';

const calculateEffectiveDuration = (project: Project) => {
  const { segments, duration, subtitles } = project;
  return duration || Math.max(...segments.map(s => s.endTime), ...subtitles.map(s => s.endTime), 10);
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
  
  const streamSections = project.streams.map((stream, idx) => {
    const streamSegments = project.segments.filter(s => s.streamId === stream.id);
    const timelineHtml = streamSegments.map(seg => {
      const code = stream.codes.find(c => c.id === seg.codeId);
      if (!code) return '';
      const left = (seg.startTime / effectiveDuration) * 100;
      const width = ((seg.endTime - seg.startTime) / effectiveDuration) * 100;
      return `<div style="position:absolute; top:0; bottom:0; left:${left}%; width:${width}%; background:${code.color}; border-right:1px solid rgba(0,0,0,0.1);" title="${code.label}"></div>`;
    }).join('');

    return `
      <div class="mb-10 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Stream ${idx + 1}: ${stream.name}</h3>
        <div style="position:relative; width:100%; height:32px; background:#f1f5f9; border-radius:6px; overflow:hidden; border: 1px solid #e2e8f0;">
          <div style="position:absolute; inset:0; opacity:0.05; background:${UNCODED_COLOR}"></div>
          ${timelineHtml}
        </div>
        <div class="flex gap-4 mt-3">
          ${stream.codes.map(c => `<div class="flex items-center gap-1 text-[10px] font-bold text-slate-500"><span class="w-2 h-2 rounded-full" style="background:${c.color}"></span> ${c.label}</div>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>QualiVision Multi-Stream Report: ${project.name}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 p-10 max-w-5xl mx-auto font-sans">
      <header class="mb-12 border-b-2 border-slate-200 pb-6">
        <h1 class="text-4xl font-black text-slate-900 tracking-tight">Multi-Stream Analysis Report</h1>
        <p class="text-slate-500 font-mono text-xs mt-2">PROJECT: ${project.name} | DURATION: ${effectiveDuration.toFixed(2)}s</p>
      </header>
      ${streamSections}
      <section class="mt-12">
        <h2 class="text-xl font-bold mb-6 text-slate-800">Annotated Transcript</h2>
        <table class="w-full text-left text-sm border-collapse bg-white rounded-xl shadow-sm overflow-hidden">
          <thead>
            <tr class="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
              <th class="p-4">Time</th><th class="p-4">Theme</th><th class="p-4">Content</th>
            </tr>
          </thead>
          <tbody>
            ${project.subtitles.map(s => {
              const code = project.transcriptCodes.find(c => c.id === s.codeId);
              return `<tr class="border-b border-slate-50"><td class="p-4 font-mono text-xs">${s.startTime.toFixed(2)}s</td><td class="p-4">${code ? `<span style="background:${code.color};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">${code.label}</span>` : 'None'}</td><td class="p-4 text-slate-700">${s.html}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </section>
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

      // 保存 HTML 报告
      const htmlHandle = await projectDir.getFileHandle(`report.html`, { create: true });
      const wHtml = await htmlHandle.createWritable();
      await wHtml.write(generateHtmlContent(project));
      await wHtml.close();

      // 为每个 Stream 保存数据
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

      // 备份整个项目
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

  // Fallback
  downloadFile(`${safeName}_report.html`, generateHtmlContent(project), 'text/html');
  return true;
};
