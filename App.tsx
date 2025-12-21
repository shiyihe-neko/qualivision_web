
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, ViewMode, TimelineStream } from './types';
import { DEFAULT_TIMELINE_CODES, DEFAULT_TRANSCRIPT_CODES, DEFAULT_NOTE_PALETTE } from './constants';
import useUndoRedo from './hooks/useUndoRedo';
import VideoPlayer, { VideoPlayerHandle } from './components/VideoPlayer';
import TranscriptEditor from './components/TranscriptEditor';
import TimelineCoder from './components/TimelineCoder';
import Analytics from './components/Analytics';
import CodeManager from './components/CodeManager';
import { saveProjectPackage } from './services/exportService';
import { generateTranscript } from './services/geminiService';
import { 
  Activity, LayoutDashboard, Undo2, Redo2, Loader2, History, Plus, Trash2, 
  CheckCircle2, Settings2, Sparkles, X
} from 'lucide-react';

const STORAGE_KEY = 'qualivision_multi_projects_v3';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length > 0 ? parsed[0].id : null;
    }
    return null;
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 移到外面以保持稳定
  const createNewStream = useCallback((name: string): TimelineStream => ({
    id: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    isLocked: false,
    codes: [...DEFAULT_TIMELINE_CODES]
  }), []);

  const initialProject: Project = {
    id: `proj_${Date.now()}`,
    name: 'New Analysis',
    videoUrlType: 'file',
    createdAt: Date.now(),
    lastModified: Date.now(),
    subtitles: [],
    segments: [],
    streams: [], // 初始化为空，由 useEffect 补充
    transcriptCodes: DEFAULT_TRANSCRIPT_CODES,
    notePalette: DEFAULT_NOTE_PALETTE,
    duration: 0,
  };

  const { 
    state: project, set: setProject, undo, redo, canUndo, canRedo, reset 
  } = useUndoRedo<Project>(
    projects.find(p => p.id === activeProjectId) || initialProject
  );

  // 核心修复：确保 project 永远有 streams
  useEffect(() => {
    if (project && (!project.streams || project.streams.length === 0)) {
        setProject(prev => ({
            ...prev,
            streams: prev.streams && prev.streams.length > 0 ? prev.streams : [createNewStream('Primary Sequence')]
        }));
    }
  }, [project.id]);

  useEffect(() => {
    const p = projects.find(p => p.id === activeProjectId);
    if (p) {
      const updatedP = {
          ...p,
          streams: p.streams || [createNewStream('Imported Sequence')]
      };
      reset(updatedP);
      setVideoSrc(null);
      setVideoFile(null);
    }
  }, [activeProjectId, reset, createNewStream]);

  useEffect(() => {
    if (!project.id) return;
    setProjects(prev => {
      const exists = prev.find(p => p.id === project.id);
      let next;
      if (exists) {
        next = prev.map(p => p.id === project.id ? { ...project, lastModified: Date.now() } : p);
      } else {
        next = [...prev, { ...project, lastModified: Date.now() }];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [project]);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('analyze');
  const [showCodeManager, setShowCodeManager] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const videoRef = useRef<VideoPlayerHandle>(null);

  const handleNewProject = () => {
    const newProj = { ...initialProject, id: `proj_${Date.now()}`, streams: [createNewStream('Primary Sequence')] };
    setActiveProjectId(newProj.id);
    reset(newProj);
    setVideoSrc(null);
    setVideoFile(null);
    setIsHistoryOpen(false);
  };

  const loadVideoFile = (file: File) => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoFile(file);
    setProject(prev => ({ ...prev, name: file.name.split('.')[0], videoFileName: file.name }));
  };

  const handleAutoTranscribe = async () => {
    if (!videoFile) { alert("Please upload a video first."); return; }
    try {
      setIsAIProcessing(true);
      const reader = new FileReader();
      const base64Promise = new Promise<string>(r => {
        reader.onload = () => r((reader.result as string).split(',')[1]);
        reader.readAsDataURL(videoFile);
      });
      const base64Data = await base64Promise;
      const newSubtitles = await generateTranscript(base64Data, videoFile.type);
      setProject(prev => ({ ...prev, subtitles: [...prev.subtitles, ...newSubtitles] }));
    } catch (e) { alert("AI transcription failed."); } finally { setIsAIProcessing(false); }
  };

  const handleFinish = async () => {
    setViewMode('visualize');
    if (confirm("Finish analysis and export all sequence data?")) {
      await saveProjectPackage(project, videoFile);
    }
  };

  const handleAddStream = (index: number) => {
    // 移除 prompt，避免拦截。用户可以后续在 Settings 里重命名
    const streamName = `New Stream ${project.streams.length + 1}`;
    const newStream = createNewStream(streamName);
    setProject(prev => {
      const currentStreams = prev.streams || [];
      const newStreams = [...currentStreams];
      newStreams.splice(index, 0, newStream);
      return { ...prev, streams: newStreams };
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      <div className={`fixed inset-y-0 left-0 w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 z-[100] transition-transform duration-500 shadow-2xl ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500"/>
            <h2 className="font-black text-xs uppercase tracking-widest text-slate-400">Analysis History</h2>
          </div>
          <button onClick={() => setIsHistoryOpen(false)} className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        
        <div className="p-4"><button onClick={handleNewProject} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20 mb-4"><Plus className="w-4 h-4" /> Start New Project</button></div>

        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-2 custom-scrollbar">
          {projects.map(p => (
            <div key={p.id} onClick={() => { setActiveProjectId(p.id); setIsHistoryOpen(false); }} className={`group p-4 rounded-xl cursor-pointer transition-all border-2 relative ${activeProjectId === p.id ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-800/40 border-transparent hover:border-slate-700 text-slate-400 hover:text-white'}`}>
              <div className="text-sm font-bold truncate pr-6">{p.name}</div>
              <div className="text-[10px] opacity-40 mt-1 font-mono">{new Date(p.lastModified).toLocaleString()}</div>
              <button onClick={(e) => { e.stopPropagation(); setProjects(prev => prev.filter(item => item.id !== p.id)); }} className="absolute right-4 top-5 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {showCodeManager && (
          <CodeManager 
            streams={project.streams || []}
            transcriptCodes={project.transcriptCodes} 
            notePalette={project.notePalette} 
            onClose={() => setShowCodeManager(false)}
            onUpdateStreams={(s) => setProject(p => ({...p, streams: s}))}
            onUpdateTranscriptCodes={(c) => setProject(p => ({...p, transcriptCodes: c}))}
            onUpdateNotePalette={(n) => setProject(p => ({...p, notePalette: n}))}
          />
        )}

        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0a0f1e]/80 backdrop-blur-md shrink-0 z-30">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsHistoryOpen(true)} className={`p-2.5 rounded-xl transition-all ${isHistoryOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="Open Project History"><History className="w-5 h-5"/></button>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/40"><Activity className="w-5 h-5 text-white" /></div>
              <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">QualiVision</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-slate-300 transition-all"><Undo2 className="w-4 h-4"/></button>
                <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-slate-300 transition-all"><Redo2 className="w-4 h-4"/></button>
             </div>
             
             <button onClick={() => setViewMode(viewMode === 'analyze' ? 'visualize' : 'analyze')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${viewMode === 'visualize' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}><LayoutDashboard className="w-4 h-4" /> {viewMode === 'analyze' ? 'View Report' : 'Editor'}</button>

             {viewMode === 'analyze' && (
               <button onClick={handleFinish} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-500/30 transition-all shadow-xl shadow-emerald-900/30"><CheckCircle2 className="w-4 h-4" /> Finish & Save</button>
             )}
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowCodeManager(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all"><Settings2 className="w-4 h-4"/> Settings</button>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 relative">
          {viewMode === 'visualize' ? <Analytics project={project} /> : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex min-h-0 overflow-hidden bg-black">
                <div className="flex-1 relative bg-[#020617] flex items-center justify-center p-4">
                  <VideoPlayer ref={videoRef} src={videoSrc} projectVideoName={project.videoFileName} onTimeUpdate={setCurrentTime} onLoadedMetadata={(d) => setProject(p => ({ ...p, duration: d }))} onEnded={() => setIsPlaying(false)} onRelinkVideo={loadVideoFile} onUploadNew={loadVideoFile} />
                  {isAIProcessing && (
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl z-40 flex flex-col items-center justify-center text-center p-10">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                        <Loader2 className="w-24 h-24 animate-spin text-blue-500 relative z-10" />
                        <Sparkles className="w-10 h-10 text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                      </div>
                      <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">AI AGENT WORKING...</h3>
                      <p className="text-slate-400 text-lg max-w-sm font-medium leading-relaxed">Analyzing video frames and audio to generate smart transcripts.</p>
                    </div>
                  )}
                </div>
                <aside className="w-[480px] bg-[#0a0f1e] border-l border-slate-800 flex flex-col shrink-0">
                  <TranscriptEditor subtitles={project.subtitles} transcriptCodes={project.transcriptCodes} notePalette={project.notePalette} currentTime={currentTime} isVideoLoaded={!!videoSrc} isAIProcessing={isAIProcessing} onSeek={(t) => videoRef.current?.seekTo(t)} onUpdateSubtitles={(subs) => setProject(p => ({ ...p, subtitles: typeof subs === 'function' ? subs(p.subtitles) : subs }))} onOpenCodeManager={() => setShowCodeManager(true)} onAutoTranscribe={handleAutoTranscribe} />
                </aside>
              </div>
              
              <footer className="h-80 bg-[#0a0f1e] border-t border-slate-800 shrink-0 shadow-2xl z-20 overflow-y-auto">
                <TimelineCoder 
                  duration={project.duration} 
                  currentTime={currentTime} 
                  streams={project.streams || []}
                  segments={project.segments}
                  onUpdateStreams={(s) => setProject(p => ({ ...p, streams: s }))}
                  onAddSegment={(s) => setProject(p => ({ ...p, segments: [...p.segments, s] }))} 
                  onDeleteSegment={(id) => setProject(p => ({ ...p, segments: p.segments.filter(s => s.id !== id) }))} 
                  onSeek={(t) => videoRef.current?.seekTo(t)} 
                  isPlaying={isPlaying} 
                  onTogglePlay={() => { if (isPlaying) videoRef.current?.pause(); else videoRef.current?.play(); setIsPlaying(!isPlaying); }} 
                  onOpenCodeManager={() => setShowCodeManager(true)} 
                  onAddStream={handleAddStream}
                />
              </footer>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
