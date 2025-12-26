
import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
import { Subtitle, CodeDefinition, NoteDefinition } from '../types';
import { Edit2, Clock, Plus, Trash2, Upload, Play, Highlighter, Palette, Sparkles, Loader2 } from 'lucide-react';

// --- Helper Functions ---
const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string): number | null => {
  const clean = timeStr.trim();
  // 匹配 mm:ss 或 hh:mm:ss
  const parts = clean.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  } else if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) return h * 3600 + m * 60 + s;
  }
  return null;
};

// --- SMART TEXT PARSER ---
const parseTranscriptText = (text: string, defaultInterval: number): Subtitle[] => {
    const lines = text.split('\n');
    const result: Subtitle[] = [];
    let currentStartTime: number | null = null;
    let fallbackTime = 0;

    // 正则表达式匹配时间戳，例如 [00:12], 0:05, 00:00:10 等
    const timeRegex = /(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)(?:\])?/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const timeMatch = line.match(timeRegex);
        if (timeMatch) {
            const parsed = parseTime(timeMatch[1]);
            if (parsed !== null) {
                currentStartTime = parsed;
                // 如果这一行仅仅包含时间戳，我们寻找下一行作为内容
                const remainingContent = line.replace(timeMatch[0], '').trim();
                if (remainingContent) {
                    result.push({
                        id: `sub_${Date.now()}_${i}`,
                        startTime: currentStartTime,
                        endTime: currentStartTime + defaultInterval,
                        html: remainingContent
                    });
                    currentStartTime = null; // 重置
                }
                continue;
            }
        }

        // 如果走到了这里，说明这一行是文本内容
        const startTime = currentStartTime !== null ? currentStartTime : fallbackTime;
        result.push({
            id: `sub_${Date.now()}_${i}`,
            startTime: startTime,
            endTime: startTime + defaultInterval,
            html: line
        });

        // 更新 fallback 指针
        fallbackTime = startTime + defaultInterval;
        currentStartTime = null; // 消耗掉手动指定的时间戳
    }
    return result;
};

// --- SAFE EDITABLE CELL ---
interface SafeEditableCellProps {
  html: string;
  isNoteMode: boolean;
  activeNoteColor: string;
  onSave: (newHtml: string) => void;
}

const SafeEditableCell = ({ html, isNoteMode, activeNoteColor, onSave }: SafeEditableCellProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (contentRef.current && !isFocusedRef.current && contentRef.current.innerHTML !== html) {
      contentRef.current.innerHTML = html;
    }
  }, [html]);

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (contentRef.current) {
      const newContent = contentRef.current.innerHTML;
      if (newContent !== html) {
        onSave(newContent);
      }
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isNoteMode && activeNoteColor && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, activeNoteColor);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      className="w-full bg-transparent border-none outline-none text-sm leading-relaxed p-0 text-slate-300 min-h-[1.5em] focus:text-white transition-colors"
      style={{ caretColor: isNoteMode ? activeNoteColor : 'white' }}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// --- MEMOIZED ROW ---
interface SubtitleRowProps {
  sub: Subtitle;
  transcriptCodes: CodeDefinition[];
  isNoteMode: boolean;
  activeNoteColor: string;
  onSeek: (time: number) => void;
  onUpdate: (id: string, updates: Partial<Subtitle>) => void;
  onDelete: (id: string) => void;
  onAddAfter: (id: string) => void;
  onOpenCodeManager: () => void;
}

const SubtitleRow = memo(({
  sub, transcriptCodes, isNoteMode, activeNoteColor, 
  onSeek, onUpdate, onDelete, onAddAfter, onOpenCodeManager
}: SubtitleRowProps) => {
  const currentCode = transcriptCodes.find(c => c.id === sub.codeId);

  return (
    <div
      className="relative group flex flex-col p-2 rounded-md transition-all border border-transparent hover:bg-slate-800/50 hover:border-slate-800"
      style={{
        borderLeftColor: currentCode ? currentCode.color : 'transparent',
        borderLeftWidth: '4px',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
          <input 
            type="text"
            defaultValue={formatTime(sub.startTime)}
            onBlur={(e) => {
              const newTime = parseTime(e.target.value);
              if (newTime !== null) {
                const duration = sub.endTime - sub.startTime;
                onUpdate(sub.id, { startTime: newTime, endTime: newTime + duration });
              } else {
                e.target.value = formatTime(sub.startTime);
              }
            }}
            className="w-10 text-[10px] font-mono px-0.5 py-0.5 rounded bg-transparent border border-transparent hover:border-slate-600 text-center outline-none focus:border-emerald-500 focus:bg-slate-900 transition-colors text-slate-500"
          />
          
          <button 
            onClick={() => onSeek(sub.startTime)}
            className="text-slate-600 hover:text-emerald-400 -ml-1 p-0.5 rounded"
            title="Jump video to this line"
            tabIndex={-1}
          >
            <Play className="w-2.5 h-2.5 fill-current" />
          </button>

          <div className="relative flex-1 min-w-0">
              <select 
                className="w-full appearance-none bg-transparent text-[10px] font-medium uppercase tracking-wider cursor-pointer outline-none border-none py-0 pl-3 pr-2 truncate"
                style={{ color: currentCode ? currentCode.color : '#64748b' }}
                value={sub.codeId || ""}
                onChange={(e) => {
                  if (e.target.value === 'MANAGE_CODES') {
                    onOpenCodeManager();
                  } else {
                    onUpdate(sub.id, { codeId: e.target.value || undefined });
                  }
                }}
              >
                  <option value="" className="bg-slate-900 text-slate-500">No Category</option>
                  {transcriptCodes.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900" style={{color: c.color}}>
                          {c.label}
                      </option>
                  ))}
                  <option disabled className="bg-slate-800">──────────</option>
                  <option value="MANAGE_CODES" className="bg-slate-900 text-white font-bold">⚙️ Manage Codes...</option>
              </select>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button onClick={() => onAddAfter(sub.id)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Add line below" tabIndex={-1}><Plus className="w-3 h-3" /></button>
              <button onClick={() => onDelete(sub.id)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400" title="Delete line" tabIndex={-1}><Trash2 className="w-3 h-3" /></button>
          </div>
      </div>
      
      <SafeEditableCell 
        html={sub.html} 
        isNoteMode={isNoteMode} 
        activeNoteColor={activeNoteColor}
        onSave={(newHtml) => onUpdate(sub.id, { html: newHtml })}
      />
    </div>
  );
}, (prev, next) => {
  return (
    prev.sub === next.sub && 
    prev.isNoteMode === next.isNoteMode &&
    prev.activeNoteColor === next.activeNoteColor &&
    prev.transcriptCodes === next.transcriptCodes
  );
});

interface TranscriptEditorProps {
  subtitles: Subtitle[];
  transcriptCodes: CodeDefinition[];
  notePalette: NoteDefinition[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSubtitles: (subs: Subtitle[] | ((prev: Subtitle[]) => Subtitle[])) => void;
  onOpenCodeManager: () => void;
  isVideoLoaded?: boolean;
  isAIProcessing?: boolean;
  onAutoTranscribe?: () => void;
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ 
  subtitles, 
  transcriptCodes,
  notePalette,
  currentTime, 
  onSeek, 
  onUpdateSubtitles,
  onOpenCodeManager,
  isVideoLoaded,
  isAIProcessing,
  onAutoTranscribe
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [activeNoteColor, setActiveNoteColor] = useState<string>('');

  useEffect(() => {
    if (notePalette.length > 0 && !activeNoteColor) {
      setActiveNoteColor(notePalette[0].color);
    }
  }, [notePalette, activeNoteColor]);

  const updateLine = useCallback((id: string, updates: Partial<Subtitle>) => {
    onUpdateSubtitles((currentSubs) => 
        currentSubs.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }, [onUpdateSubtitles]);

  const deleteLine = useCallback((id: string) => {
    if(confirm("Delete this line?")) {
      onUpdateSubtitles((currentSubs) => currentSubs.filter(s => s.id !== id));
    }
  }, [onUpdateSubtitles]);

  const addLineAfter = useCallback((id: string) => {
    onUpdateSubtitles((currentSubs) => {
        const index = currentSubs.findIndex(s => s.id === id);
        if (index === -1) return currentSubs;

        const prev = currentSubs[index];
        const next = currentSubs[index + 1];
        let newStart = prev ? prev.endTime : 0;
        if (next && next.startTime <= newStart) {
            newStart = prev.startTime + (prev.endTime - prev.startTime) / 2; 
        }
        const newSub: Subtitle = {
            id: `sub_${Date.now()}`,
            startTime: newStart,
            endTime: newStart + 3,
            html: ""
        };
        const newSubsList = [...currentSubs];
        newSubsList.splice(index + 1, 0, newSub);
        return newSubsList;
    });
  }, [onUpdateSubtitles]);

  const getCustomInterval = (): number => {
    const input = prompt("Enter the time interval per line in seconds (if timestamps are missing):", "5");
    if (input === null) return 5;
    const val = parseInt(input, 10);
    return isNaN(val) || val <= 0 ? 5 : val;
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const interval = getCustomInterval();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const newSubs = parseTranscriptText(content, interval);

      onUpdateSubtitles((currentSubs) => {
         if (currentSubs.length > 0 && !confirm("Append to existing transcript? (Cancel to Replace)")) {
             return newSubs;
         }
         return [...currentSubs, ...newSubs].sort((a,b) => a.startTime - b.startTime);
      });
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteImport = () => {
      const text = prompt("Paste your transcript text here (Time marks like 00:12 will be extracted):");
      if (!text) return;
      const interval = getCustomInterval();
      const newSubs = parseTranscriptText(text, interval);

      onUpdateSubtitles((currentSubs) => {
         if (currentSubs.length > 0 && !confirm("Append to existing transcript? (Cancel to Replace)")) {
             return newSubs;
         }
         return [...currentSubs, ...newSubs].sort((a,b) => a.startTime - b.startTime);
      });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      <div className="p-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-20 flex flex-col gap-2 shadow-sm">
        <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Transcript
            </h2>
            <div className="flex gap-2">
                {onAutoTranscribe && (
                  <button 
                    onClick={onAutoTranscribe} 
                    disabled={!isVideoLoaded || isAIProcessing}
                    className="p-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded border border-indigo-700 flex items-center gap-1 shadow-lg shadow-indigo-900/20"
                    title="Auto Transcribe with AI"
                  >
                    {isAIProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI
                  </button>
                )}
                <button onClick={handlePasteImport} className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1" title="Paste Text">
                    <Edit2 className="w-3 h-3" />
                </button>
                <label className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".txt,.srt,.vtt" />
                </label>
            </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700">
           <button 
              onClick={() => setIsNoteMode(!isNoteMode)}
              className={`px-2 py-1.5 text-xs rounded border transition-colors flex items-center gap-1.5 font-medium ${
                isNoteMode 
                  ? 'bg-slate-700 text-white border-slate-500 shadow-sm' 
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
              title="Toggle Note Mode"
            >
               <Highlighter className="w-3.5 h-3.5" style={{ color: isNoteMode ? activeNoteColor : undefined }} />
               {isNoteMode ? 'ON' : 'Note Mode'}
           </button>
           
           {isNoteMode && (
             <div className="h-4 w-px bg-slate-600 mx-1" />
           )}

           {isNoteMode && (
             <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
                {notePalette.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveNoteColor(p.color)}
                    className={`w-4 h-4 rounded-full border transition-all shrink-0 ${activeNoteColor === p.color ? 'border-white scale-110 shadow' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: p.color }}
                    title={p.label}
                  />
                ))}
                 <button 
                    onClick={onOpenCodeManager} 
                    className="ml-auto p-1 text-slate-500 hover:text-white"
                    title="Edit Note Palette"
                 >
                    <Palette className="w-3 h-3" />
                 </button>
             </div>
           )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {subtitles.length === 0 && (
            <div className="text-center py-10">
                <p className="text-slate-500 text-sm mb-4">No transcript yet.</p>
                <button 
                  onClick={() => onUpdateSubtitles([{ id: `sub_${Date.now()}`, startTime: 0, endTime: 3, html: "Start typing..." }])} 
                  className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500"
                >
                  Add First Line
                </button>
            </div>
        )}

        {subtitles.map((sub) => {
          return (
            <SubtitleRow
              key={sub.id}
              sub={sub}
              transcriptCodes={transcriptCodes}
              isNoteMode={isNoteMode}
              activeNoteColor={activeNoteColor}
              onSeek={onSeek}
              onUpdate={updateLine}
              onDelete={deleteLine}
              onAddAfter={addLineAfter}
              onOpenCodeManager={onOpenCodeManager}
            />
          );
        })}
        
        {subtitles.length > 0 && (
             <button onClick={() => addLineAfter(subtitles[subtitles.length - 1].id)} className="w-full py-2 mt-2 text-xs text-slate-500 hover:text-slate-300 border border-dashed border-slate-800 hover:border-slate-600 rounded transition-colors">
                 + Add End Line
             </button>
        )}
      </div>
    </div>
  );
};

export default TranscriptEditor;
