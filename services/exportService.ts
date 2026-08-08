
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

export interface RawAnnotationExportRow {
  projectId: string;
  projectName: string;
  streamId: string;
  streamName: string;
  parentStreamId: string;
  parentStreamName: string;
  segmentId: string;
  codeId: string;
  label: string;
  color: string;
  parentCodeId: string;
  parentLabel: string;
  previousSegmentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  note: string;
}

const getRawAnnotationData = (project: Project): RawAnnotationExportRow[] => {
  const streamOrder = new Map(project.streams.map((stream, index) => [stream.id, index]));

  const rows = project.segments
    .map(segment => {
      const stream = project.streams.find(item => item.id === segment.streamId);
      const parentStream = project.streams.find(item => item.id === stream?.parentId);
      const code = stream?.codes.find(item => item.id === segment.codeId);
      const parentCode = stream?.codes.find(item => item.id === code?.parentId);

      return {
        projectId: project.id,
        projectName: project.name,
        streamId: segment.streamId,
        streamName: stream?.name || 'Unknown Stream',
        parentStreamId: parentStream?.id || '',
        parentStreamName: parentStream?.name || '',
        segmentId: segment.id,
        codeId: segment.codeId,
        label: code?.label || 'Unknown',
        color: code?.color || '',
        parentCodeId: parentCode?.id || '',
        parentLabel: parentCode?.label || '',
        previousSegmentId: '',
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: segment.endTime - segment.startTime,
        note: segment.note || ''
      };
    })
    .sort((a, b) =>
      (streamOrder.get(a.streamId) ?? Number.MAX_SAFE_INTEGER) -
        (streamOrder.get(b.streamId) ?? Number.MAX_SAFE_INTEGER) ||
      a.startTime - b.startTime ||
      a.endTime - b.endTime
    );

  const previousByStream = new Map<string, string>();
  return rows.map(row => {
    const result = { ...row, previousSegmentId: previousByStream.get(row.streamId) || '' };
    previousByStream.set(row.streamId, row.segmentId);
    return result;
  });
};

const escapeCsvCell = (value: string | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const generateRawAnnotationsJson = (project: Project): string =>
  JSON.stringify(getRawAnnotationData(project), null, 2);

export const generateRawAnnotationsCsv = (project: Project): string => {
  const headers = [
    'ProjectId', 'ProjectName', 'StreamId', 'StreamName', 'ParentStreamId', 'ParentStreamName', 'SegmentId',
    'CodeId', 'Label', 'Color', 'ParentCodeId', 'ParentLabel', 'PreviousSegmentId',
    'StartTime', 'EndTime', 'Duration', 'Note'
  ];
  const rows = getRawAnnotationData(project).map(item => [
    item.projectId,
    item.projectName,
    item.streamId,
    item.streamName,
    item.parentStreamId,
    item.parentStreamName,
    item.segmentId,
    item.codeId,
    item.label,
    item.color,
    item.parentCodeId,
    item.parentLabel,
    item.previousSegmentId,
    item.startTime.toFixed(3),
    item.endTime.toFixed(3),
    item.duration.toFixed(3),
    item.note
  ].map(escapeCsvCell).join(','));

  // The BOM keeps non-ASCII project names, labels, and notes readable in Excel.
  return `\uFEFF${[headers.join(','), ...rows].join('\n')}`;
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

export const generateTranscriptThemeCsvContent = (project: Project): string => {
  const stats = getTranscriptStatsData(project);
  const headers = ["ThemeName", "Occurrences", "Color"];
  const rows = stats.map(s => [
    `"${s.name}"`, 
    s.count, 
    `"${s.color}"`
  ].join(","));
  return [headers.join(","), ...rows].join("\n");
};

const getOrderedStreams = (project: Project) => {
  const ordered: TimelineStream[] = [];
  const visited = new Set<string>();
  const append = (parentId?: string) => project.streams
    .filter(stream => {
      const normalizedParent = stream.parentId && project.streams.some(candidate => candidate.id === stream.parentId)
        ? stream.parentId
        : undefined;
      return normalizedParent === parentId && !visited.has(stream.id);
    })
    .forEach(stream => {
      visited.add(stream.id);
      ordered.push(stream);
      append(stream.id);
    });
  append();
  project.streams.filter(stream => !visited.has(stream.id)).forEach(stream => ordered.push(stream));
  return ordered;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const reportPolarPoint = (radius: number, angle: number) => {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 300 + radius * Math.cos(radians), y: 300 + radius * Math.sin(radians) };
};

const reportRingArcPath = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const safeEnd = Math.min(endAngle, startAngle + 359.999);
  const outerStart = reportPolarPoint(outerRadius, startAngle);
  const outerEnd = reportPolarPoint(outerRadius, safeEnd);
  const innerEnd = reportPolarPoint(innerRadius, safeEnd);
  const innerStart = reportPolarPoint(innerRadius, startAngle);
  const largeArc = safeEnd - startAngle > 180 ? 1 : 0;
  return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
};

export const generateHierarchyJson = (project: Project): string => JSON.stringify({
  projectId: project.id,
  projectName: project.name,
  streams: getOrderedStreams(project).map(stream => ({
    id: stream.id,
    name: stream.name,
    parentStreamId: stream.parentId || null,
    codes: stream.codes.map(code => ({
      id: code.id,
      label: code.label,
      color: code.color,
      shortcut: code.shortcut || null,
      parentCodeId: code.parentId || null
    }))
  }))
}, null, 2);

const generateSunburstReportHtml = (project: Project, effectiveDuration: number) => {
  const orderedStreams = getOrderedStreams(project);
  const ringStep = Math.min(42, 185 / Math.max(orderedStreams.length, 1));
  const rings = orderedStreams.map((stream, streamIndex) => {
    const innerRadius = 85 + streamIndex * ringStep;
    const ringWidth = Math.max(1.5, ringStep - Math.min(6, ringStep * 0.2));
    const outerRadius = innerRadius + ringWidth;
    const segments = project.segments.filter(segment => segment.streamId === stream.id).map(segment => {
      const code = stream.codes.find(item => item.id === segment.codeId);
      if (!code || effectiveDuration <= 0) return '';
      const startAngle = Math.max(0, segment.startTime / effectiveDuration * 360);
      const endAngle = Math.min(360, segment.endTime / effectiveDuration * 360);
      if (endAngle <= startAngle) return '';
      return `<path d="${reportRingArcPath(innerRadius, outerRadius, startAngle, endAngle)}" fill="${escapeHtml(code.color)}" stroke="#ffffff" stroke-width="0.8"><title>${escapeHtml(stream.name)} · ${escapeHtml(code.label)}: ${segment.startTime.toFixed(2)}s–${segment.endTime.toFixed(2)}s</title></path>`;
    }).join('');
    return `<g><circle cx="300" cy="300" r="${(innerRadius + outerRadius) / 2}" fill="none" stroke="#e2e8f0" stroke-width="${ringWidth}"/>${segments}</g>`;
  }).join('');
  const legend = orderedStreams.map((stream, index) => `
    <div class="border-b border-slate-100 pb-3 mb-3">
      <div class="font-black text-sm text-slate-700 mb-2">Ring ${index + 1}: ${escapeHtml(stream.name)}${stream.parentId ? ' <span class="text-blue-500">↳ child stream</span>' : ''}</div>
      <div class="flex flex-wrap gap-3">${stream.codes.map(code => `<span class="text-[10px] text-slate-500"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${escapeHtml(code.color)};margin-right:4px"></i>${escapeHtml(code.label)}</span>`).join('')}</div>
    </div>`).join('');
  return `<section class="mt-16 mb-20 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
    <h2 class="text-2xl font-black text-slate-800 mb-2">Time-aligned Multi-stream Sunburst</h2>
    <p class="text-sm text-slate-500 mb-8">All rings share the same clockwise timeline, starting at 12 o'clock. One ring is generated for every actual stream.</p>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
      <svg viewBox="0 0 600 600" style="width:100%;max-width:620px" role="img" aria-label="Time-aligned multi-stream sunburst">${rings}<circle cx="300" cy="300" r="72" fill="#f8fafc" stroke="#cbd5e1"/><text x="300" y="294" text-anchor="middle" fill="#0f172a" font-size="18" font-weight="700">${effectiveDuration.toFixed(1)}s</text><text x="300" y="316" text-anchor="middle" fill="#64748b" font-size="11">clockwise timeline</text></svg>
      <div>${legend || '<p class="text-slate-400">No streams defined.</p>'}</div>
    </div>
  </section>`;
};

const generateHierarchyReportHtml = (project: Project) => {
  const renderCodes = (stream: TimelineStream, parentId?: string, visited = new Set<string>()): string => stream.codes
    .filter(code => {
      const normalizedParent = code.parentId && stream.codes.some(candidate => candidate.id === code.parentId) ? code.parentId : undefined;
      return normalizedParent === parentId && !visited.has(code.id);
    })
    .map(code => {
      const nextVisited = new Set(visited).add(code.id);
      const codeSegments = project.segments.filter(segment => segment.streamId === stream.id && segment.codeId === code.id).sort((a, b) => a.startTime - b.startTime);
      const times = codeSegments.map((segment, index) => `${index ? '<span class="text-slate-300 mx-1">→</span>' : ''}<span class="font-mono text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1" title="${escapeHtml(segment.note || '')}">${segment.startTime.toFixed(2)}s–${segment.endTime.toFixed(2)}s</span>`).join('');
      const children = renderCodes(stream, code.id, nextVisited);
      return `<li class="ml-5 border-l-2 border-slate-200 pl-4 py-2"><div><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${escapeHtml(code.color)};margin-right:7px"></i><strong>${escapeHtml(code.label)}</strong> <span class="text-[10px] text-slate-400">${codeSegments.length} segments</span></div>${times ? `<div class="ml-5 mt-2 flex flex-wrap items-center gap-1">${times}</div>` : ''}${children ? `<ul>${children}</ul>` : ''}</li>`;
    }).join('');
  const renderStreams = (parentId?: string, visited = new Set<string>()): string => project.streams
    .filter(stream => {
      const normalizedParent = stream.parentId && project.streams.some(candidate => candidate.id === stream.parentId) ? stream.parentId : undefined;
      return normalizedParent === parentId && !visited.has(stream.id);
    })
    .map(stream => {
      const nextVisited = new Set(visited).add(stream.id);
      const childStreams = renderStreams(stream.id, nextVisited);
      return `<li class="ml-5 border-l-4 border-blue-100 pl-5 py-4"><div class="flex items-center gap-2 mb-2"><span class="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-full">${stream.parentId ? 'CHILD STREAM' : 'STREAM'}</span><strong class="text-slate-800">${escapeHtml(stream.name)}</strong></div><ul>${renderCodes(stream) || '<li class="text-sm text-slate-400 ml-5">No codes defined.</li>'}</ul>${childStreams ? `<ul class="mt-2">${childStreams}</ul>` : ''}</li>`;
    }).join('');
  return `<section class="mt-16 mb-20 bg-white p-8 rounded-3xl shadow-sm border border-slate-100"><h2 class="text-2xl font-black text-slate-800 mb-2">Stream &amp; Code Hierarchy and Evolution</h2><p class="text-sm text-slate-500 mb-6">Parent/child streams and codes, with annotated intervals ordered from left to right by time.</p><ul>${renderStreams() || '<li class="text-slate-400">No hierarchy data.</li>'}</ul></section>`;
};

export const generateHtmlContent = (project: Project): string => {
  const effectiveDuration = calculateEffectiveDuration(project);
  const transcriptStats = getTranscriptStatsData(project);
  const chartConfigs: any[] = [];
  const sunburstSection = generateSunburstReportHtml(project, effectiveDuration);
  const hierarchySection = generateHierarchyReportHtml(project);
  
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

      ${sunburstSection}

      ${hierarchySection}

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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createZipBlob = (entries: Array<{ name: string; content: string }>) => {
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  entries.forEach(entry => {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    localParts.push(localHeader, name, data);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
    centralSize += centralHeader.length + name.length;
  });

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, endRecord], { type: 'application/zip' });
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

      const themeCsvHandle = await projectDir.getFileHandle(`transcript_themes_summary.csv`, { create: true });
      const wThemeCsv = await themeCsvHandle.createWritable();
      await wThemeCsv.write(generateTranscriptThemeCsvContent(project));
      await wThemeCsv.close();

      const rawCsvHandle = await projectDir.getFileHandle(`raw_annotations.csv`, { create: true });
      const wRawCsv = await rawCsvHandle.createWritable();
      await wRawCsv.write(generateRawAnnotationsCsv(project));
      await wRawCsv.close();

      const rawJsonHandle = await projectDir.getFileHandle(`raw_annotations.json`, { create: true });
      const wRawJson = await rawJsonHandle.createWritable();
      await wRawJson.write(generateRawAnnotationsJson(project));
      await wRawJson.close();

      const hierarchyHandle = await projectDir.getFileHandle(`hierarchy.json`, { create: true });
      const wHierarchy = await hierarchyHandle.createWritable();
      await wHierarchy.write(generateHierarchyJson(project));
      await wHierarchy.close();

      for (const [streamIndex, stream] of project.streams.entries()) {
        const streamSafeName = stream.name.replace(/\s+/g, '_').toLowerCase();
        const sequenceBaseName = `sequence_${streamIndex + 1}_${streamSafeName}`;
        
        const csvHandle = await projectDir.getFileHandle(`${sequenceBaseName}.csv`, { create: true });
        const wCsv = await csvHandle.createWritable();
        await wCsv.write(generateCsvContent(project, stream));
        await wCsv.close();

        const jsonHandle = await projectDir.getFileHandle(`${sequenceBaseName}.json`, { create: true });
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

  const fallbackEntries = [
    { name: 'report.html', content: generateHtmlContent(project) },
    { name: 'transcript_themes_summary.csv', content: generateTranscriptThemeCsvContent(project) },
    { name: 'raw_annotations.csv', content: generateRawAnnotationsCsv(project) },
    { name: 'raw_annotations.json', content: generateRawAnnotationsJson(project) },
    { name: 'hierarchy.json', content: generateHierarchyJson(project) },
    ...project.streams.flatMap((stream, streamIndex) => {
      const streamSafeName = stream.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
      const sequenceBaseName = `sequence_${streamIndex + 1}_${streamSafeName}`;
      return [
        { name: `${sequenceBaseName}.csv`, content: generateCsvContent(project, stream) },
        { name: `${sequenceBaseName}.json`, content: generateSequenceJson(project, stream) }
      ];
    }),
    { name: 'full_project_backup.json', content: JSON.stringify(project, null, 2) }
  ];
  downloadFile(`${safeName}_package.zip`, createZipBlob(fallbackEntries), 'application/zip');
  return true;
};
