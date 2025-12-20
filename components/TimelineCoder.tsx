
import React, { useState, useEffect, useRef } from 'react';
import { CodedSegment, CodeDefinition, UNCODED_COLOR, UNCODED_LABEL } from '../types';
import { Play, Pause, Settings2, Trash2, Edit3, ChevronRight, ChevronLeft } from 'lucide-react';

interface TimelineCoderProps {
  duration: number;
  currentTime: number;
  segments: CodedSegment[];
  codeDefinitions: CodeDefinition[];
  onAddSegment: (segment: CodedSegment) => void;
  onDeleteSegment: (id: string) => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenCodeManager: () => void;
}

const TimelineCoder: React.FC<TimelineCoderProps> = ({
  duration,
  currentTime,
  segments,
  codeDefinitions,
  onAddSegment,
  onDeleteSegment,
  onSeek,
  isPlaying,
  onTogglePlay,
  onOpenCodeManager
}) => {
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);
  const [activeSegmentStart, setActiveSegmentStart] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
      
      const code = codeDefinitions.find(c => c.shortcut === e.key);
      if (code) {
        e.preventDefault(); 
        handleCodeToggle(code.id);
      }
      
      if (e.code === 'Space') {
          e.preventDefault();
          onTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [codeDefinitions, activeCodeId, activeSegmentStart, currentTime, onTogglePlay]);

  useEffect(() => {
    if (!isPlaying && activeCodeId) stopCoding();
  }, [isPlaying]);

  const handleCodeToggle = (codeId: string) => {
    if (activeCodeId === codeId) stopCoding();
    else {
      if (activeCodeId) stopCoding();
      startCoding(codeId);
    }
  };

  const startCoding = (codeId: string) => {
    setActiveCodeId(codeId);
    setActiveSegmentStart(currentTime);
  };

  const stopCoding = () => {
    if (activeCodeId && activeSegmentStart !== null) {
      if (currentTime - activeSegmentStart > 0.1) {
        onAddSegment({
          id: `seg_${Date.now()}`,
          codeId: activeCodeId,
          startTime: activeSegmentStart,
          endTime: currentTime,
        });
      }
      setActiveCodeId(null);
      setActiveSegmentStart(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (timelineRef.current && duration > 0) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      onSeek(pct * duration);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#0a0f1e]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <button onClick={onTogglePlay} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg">
            {isPlaying ? <Pause className="w-6 h-6 fill-current"/> : <Play className="w-6 h-6 fill-current ml-1"/>}
          </button>
          
          <div className="flex flex-col">
            <div className="text-2xl font-mono font-black tracking-tight text-white">
              {formatTime(currentTime)} <span className="text-slate-600 text-lg">/ {formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sequence Controls:</span>
          <div className="flex gap-2">
            {codeDefinitions.map(code => (
              <div key={code.id} className="group relative flex items-center">
                <button
                  onClick={() => handleCodeToggle(code.id)}
                  style={{ 
                    borderColor: activeCodeId === code.id ? code.color : 'transparent',
                    backgroundColor: activeCodeId === code.id ? `${code.color}20` : '#1e293b'
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all shadow-sm ${activeCodeId === code.id ? 'ring-2 ring-white/10' : 'hover:bg-slate-700'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: code.color }} />
                  <span className="text-sm font-bold text-slate-200">{code.label}</span>
                  <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 ml-1">{code.shortcut}</span>
                </button>
                
                {/* 快捷编辑图标 - 对应你的截图需求 */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onOpenCodeManager(); }}
                  className="absolute -right-2 -top-2 bg-slate-800 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:text-white transition-all shadow-lg z-10"
                  title="Edit Definition"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={onOpenCodeManager} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Behavioral Sequence Stream (Timeline)</div>
        <div 
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden cursor-pointer group shadow-inner"
        >
          {/* Uncoded Gap Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundColor: UNCODED_COLOR }} />
          
          {/* Segments */}
          {segments.map(seg => {
            const code = codeDefinitions.find(c => c.id === seg.codeId);
            if (!code) return null;
            const left = (seg.startTime / duration) * 100;
            const width = ((seg.endTime - seg.startTime) / duration) * 100;
            return (
              <div
                key={seg.id}
                className="absolute top-0 bottom-0 border-x border-black/20 group/seg hover:brightness-110 flex items-center justify-center transition-all"
                style={{ left: `${left}%`, width: `${width}%`, backgroundColor: code.color }}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteSegment(seg.id); }}
                  className="hidden group-hover/seg:flex items-center justify-center bg-black/40 p-1 rounded-full hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-white"/>
                </button>
              </div>
            );
          })}

          {/* Current Recording Segment */}
          {activeCodeId && activeSegmentStart !== null && (
            <div
              className="absolute top-0 bottom-0 opacity-60 animate-pulse border-x border-white/20"
              style={{ 
                left: `${(activeSegmentStart / duration) * 100}%`, 
                width: `${((currentTime - activeSegmentStart) / duration) * 100}%`,
                backgroundColor: codeDefinitions.find(c => c.id === activeCodeId)?.color 
              }}
            />
          )}

          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-white z-20 pointer-events-none shadow-[0_0_8px_white]"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        
        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
           <div className="flex items-center gap-1.5">
             <div className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
             <span>Uncoded / Gap (No active behavior)</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineCoder;
