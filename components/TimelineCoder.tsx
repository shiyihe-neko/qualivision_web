
import React, { useState, useEffect, useRef } from 'react';
import { CodedSegment, TimelineStream, UNCODED_COLOR, UNCODED_LABEL } from '../types';
import { Play, Pause, Settings2, Trash2, Lock, Unlock, Plus, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface TimelineCoderProps {
  duration: number;
  currentTime: number;
  streams: TimelineStream[];
  segments: CodedSegment[];
  onUpdateStreams: (streams: TimelineStream[]) => void;
  onAddSegment: (segment: CodedSegment) => void;
  onDeleteSegment: (id: string) => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenCodeManager: () => void;
  onAddStream: (index: number) => void;
}

const TimelineCoder: React.FC<TimelineCoderProps> = ({
  duration,
  currentTime,
  streams = [],
  segments,
  onUpdateStreams,
  onAddSegment,
  onDeleteSegment,
  onSeek,
  isPlaying,
  onTogglePlay,
  onOpenCodeManager,
  onAddStream
}) => {
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);
  const [activeSegmentStart, setActiveSegmentStart] = useState<number | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
      
      const activeStream = (streams || []).find(s => !s.isLocked);
      if (!activeStream) return;

      const code = activeStream.codes.find(c => c.shortcut === e.key);
      if (code) {
        e.preventDefault(); 
        handleCodeToggle(activeStream.id, code.id);
      }
      
      if (e.code === 'Space') {
          e.preventDefault();
          onTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [streams, activeCodeId, activeSegmentStart, currentTime, onTogglePlay]);

  useEffect(() => {
    if (!isPlaying && activeCodeId) stopCoding();
  }, [isPlaying]);

  const handleCodeToggle = (streamId: string, codeId: string) => {
    const stream = streams.find(s => s.id === streamId);
    if (!stream || stream.isLocked) return;

    if (activeStreamId === streamId && activeCodeId === codeId) {
      stopCoding();
    } else {
      if (activeCodeId) stopCoding();
      startCoding(streamId, codeId);
    }
  };

  const startCoding = (streamId: string, codeId: string) => {
    setActiveStreamId(streamId);
    setActiveCodeId(codeId);
    setActiveSegmentStart(currentTime);
  };

  const stopCoding = () => {
    if (activeStreamId && activeCodeId && activeSegmentStart !== null) {
      if (currentTime - activeSegmentStart > 0.1) {
        onAddSegment({
          id: `seg_${Date.now()}`,
          streamId: activeStreamId,
          codeId: activeCodeId,
          startTime: activeSegmentStart,
          endTime: currentTime,
        });
      }
      setActiveStreamId(null);
      setActiveCodeId(null);
      setActiveSegmentStart(null);
    }
  };

  const toggleLock = (streamId: string) => {
    if (activeStreamId === streamId) stopCoding();
    onUpdateStreams(streams.map(s => s.id === streamId ? { ...s, isLocked: !s.isLocked } : s));
  };

  const deleteStream = (streamId: string) => {
    if (streams.length <= 1) return alert("Must have at least one stream.");
    if (confirm("Delete this entire stream and all its coded data?")) {
      onUpdateStreams(streams.filter(s => s.id !== streamId));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-[#0a0f1e] flex flex-col gap-4 min-h-full">
      {/* 顶部主控 */}
      <div className="flex items-center justify-between shrink-0 sticky top-0 bg-[#0a0f1e] z-40 py-2 border-b border-slate-800/50">
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} 
            className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current"/> : <Play className="w-6 h-6 fill-current ml-1"/>}
          </button>
          <div className="text-2xl font-mono font-black tracking-tight text-white">
            {formatTime(currentTime)} <span className="text-slate-600 text-lg">/ {formatTime(duration)}</span>
          </div>
        </div>
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddStream(streams.length); }} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 z-50"
        >
          <Plus className="w-4 h-4"/> Add Analysis Stream
        </button>
      </div>

      {/* Streams 列表 */}
      <div className="flex-1 flex flex-col gap-8 mt-4" ref={timelineContainerRef}>
        {(streams || []).map((stream, idx) => (
          <div key={stream.id} className="flex flex-col gap-2 group/stream relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">Stream {idx + 1}: {stream.name}</span>
                {stream.isLocked ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"><Lock className="w-3 h-3"/> Locked</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><Unlock className="w-3 h-3"/> Editing</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap justify-end">
                  {stream.codes.map(code => (
                    <button
                      key={code.id}
                      type="button"
                      disabled={stream.isLocked}
                      onClick={() => handleCodeToggle(stream.id, code.id)}
                      style={{ 
                        borderColor: (activeStreamId === stream.id && activeCodeId === code.id) ? code.color : 'transparent',
                        backgroundColor: (activeStreamId === stream.id && activeCodeId === code.id) ? `${code.color}20` : '#1e293b'
                      }}
                      className={`px-3 py-1.5 rounded-lg border-2 text-[10px] font-bold text-slate-200 transition-all flex items-center gap-1.5 ${stream.isLocked ? 'opacity-20 cursor-not-allowed' : 'hover:bg-slate-700 active:scale-95'}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: code.color }} />
                      {code.label}
                      <span className="opacity-40 font-mono">{code.shortcut}</span>
                    </button>
                  ))}
                </div>
                
                <div className="h-6 w-px bg-slate-800 mx-2" />
                
                <button 
                  type="button"
                  onClick={() => toggleLock(stream.id)}
                  className={`p-1.5 rounded-lg transition-all ${stream.isLocked ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'}`}
                  title={stream.isLocked ? "Unlock to Edit" : "Save and Lock"}
                >
                  {stream.isLocked ? <Settings2 className="w-4 h-4"/> : <Check className="w-4 h-4"/>}
                </button>
                <button type="button" onClick={() => deleteStream(stream.id)} className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>

            <div 
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                onSeek((x / rect.width) * duration);
              }}
              className="relative h-10 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden cursor-pointer shadow-inner"
            >
              <div className="absolute inset-0 opacity-10" style={{ backgroundColor: UNCODED_COLOR }} />
              {segments.filter(s => s.streamId === stream.id).map(seg => {
                const code = stream.codes.find(c => c.id === seg.codeId);
                if (!code) return null;
                return (
                  <div
                    key={seg.id}
                    className="absolute top-0 bottom-0 border-x border-black/20 flex items-center justify-center group/seg"
                    style={{ 
                      left: `${(seg.startTime / duration) * 100}%`, 
                      width: `${((seg.endTime - seg.startTime) / duration) * 100}%`, 
                      backgroundColor: code.color 
                    }}
                  >
                    {!stream.isLocked && (
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteSegment(seg.id); }}
                        className="hidden group-hover/seg:flex items-center justify-center bg-black/60 p-1 rounded-full hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white"/>
                      </button>
                    )}
                  </div>
                );
              })}
              {activeStreamId === stream.id && activeCodeId && activeSegmentStart !== null && (
                <div
                  className="absolute top-0 bottom-0 opacity-60 animate-pulse border-x border-white/20"
                  style={{ 
                    left: `${(activeSegmentStart / duration) * 100}%`, 
                    width: `${((currentTime - activeSegmentStart) / duration) * 100}%`,
                    backgroundColor: stream.codes.find(c => c.id === activeCodeId)?.color 
                  }}
                />
              )}
              <div className="absolute top-0 bottom-0 w-px bg-white z-20 pointer-events-none shadow-[0_0_8px_white]" style={{ left: `${(currentTime / duration) * 100}%` }} />
            </div>

            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddStream(idx + 1); }} 
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover/stream:opacity-100 transition-opacity p-1.5 bg-slate-800 border border-slate-700 rounded-full hover:bg-blue-600 z-50 shadow-xl" 
              title="Add stream below"
            >
              <Plus className="w-3.5 h-3.5 text-white"/>
            </button>
          </div>
        ))}
        <div className="h-20" /> {/* 底部留空，方便添加按钮显示 */}
      </div>
    </div>
  );
};

export default TimelineCoder;
