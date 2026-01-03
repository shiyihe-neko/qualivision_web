
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Project, ViewMode, TimelineStream, CodeDefinition } from './types';
import { 
  DEFAULT_STREAMS_CONFIG, 
  DEFAULT_TRANSCRIPT_CODES, 
  DEFAULT_NOTE_PALETTE 
} from './constants';
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
  CheckCircle2, Settings2, Sparkles, X, Edit3, Save, Video, ListMusic, FileText,
  Clock
} from 'lucide-react';

const STORAGE_KEY = 'qualivision_multi_projects_v4';

const App: React.FC = () => {
  // 1. 初始化项目列表
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  // 2. 初始化当前活动项目 ID
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    const lastActive = localStorage.getItem('qv_active_id');
    if (lastActive) return lastActive;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length > 0 ? parsed[0].id : null;
    }
    return null;
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingProjectNameId, setEditingProjectNameId] = useState<string | null>(null);

  const createNewStream = useCallback((name: string, customCodes?: CodeDefinition[]): TimelineStream => ({
    id: `stream_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name,
    isLocked: false,
    codes: customCodes ? [...customCodes] : [...DEFAULT_STREAMS_CONFIG[0].codes]
  }), []);

  const getInitialStreams = useCallback(() => {
    return DEFAULT_STREAMS_CONFIG.map(config => createNewStream(config.name, config.codes));
  }, [createNewStream]);

  const createBlankProject = useCallback((): Project => ({
    id: `proj_${Date.now()}`,
    name: 'New Analysis ' + new Date().toLocaleDateString(),
    videoUrlType: 'file',
    createdAt: Date.now(),
    lastModified: Date.now(),
    subtitles: [],
    segments: [],
    streams: getInitialStreams(),
    transcriptCodes: DEFAULT_TRANSCRIPT_CODES,
    notePalette: DEFAULT_NOTE_PALETTE,
    duration: 0,
  }), [getInitialStreams]);

  // 3. 使用 Undo/Redo Hook 管理当前项目状态
  const activeProjectFromList = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || createBlankProject(), 
    [activeProjectId, projects, createBlankProject]
  );

  const { 
    state: project, set: setProject, undo, redo, canUndo, canRedo, reset 
  } = useUndoRedo<Project>(activeProjectFromList);

  // 4. 当 activeProjectId 改变时，从 projects 列表中载入
  useEffect(() => {
    const target = projects.find(p => p.id === activeProjectId);
    if (target) {
      reset(target);
      setVideoSrc(null);
      setVideoFile(null);
      localStorage.setItem('qv_active_id', target.id);
    }
  }, [activeProjectId, reset]);

  // 5. 自动保存机制：当 project 状态改变时，更新到 projects 列表并存入 localStorage
  useEffect(() => {
    if (!project.id) return;
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === project.id);
      let newList;
      if (idx !== -1) {
        // 更新现有项目，确保 subtitles, segments, streams 全部被保存
        newList = [...prev];
        newList[idx] = { ...project, lastModified: Date.now() };
      } else {
        // 添加新项目
        newList = [{ ...project, lastModified: Date.now() }, ...prev];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      return newList;
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
    const newProj = createBlankProject();
    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setIsHistoryOpen(false);
  };

  const loadVideoFile = (file: File) => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoFile(file);
    // 只在项目名称还是默认值时自动重命名
    if (project.name.startsWith('New Analysis')) {
      setProject(prev => ({ ...prev, name: file.name.split('.')[0], videoFileName: file.name }));
    } else {
      setProject(prev => ({ ...prev, videoFileName: file.name }));
    }
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
    } catch (e) { 
      alert("AI transcription failed. Check your API key."); 
    } finally { 
      setIsAIProcessing(false); 
    }
  };

  const handleFinish = async () => {
    if (confirm("Download current analysis report and all data packages?")) {
      await saveProjectPackage(project, videoFile);
    }
  };

  const handleAddStream = (index: number) => {
    const streamName = `New Stream ${project.streams.length + 1}`;
    const newStream = createNewStream(streamName, DEFAULT_STREAMS_CONFIG[0].codes);
    setProject(prev => {
      const currentStreams = prev.streams || [];
      const newStreams = [...currentStreams];
      newStreams.splice(index, 0, newStream);
      return { ...prev, streams: newStreams };
    });
  };

  const handleRenameProject = (id: string, newName: string) => {
    if (!newName.trim()) return;
    if (id === project.id) {
      setProject(p => ({ ...p, name: newName }));
    } else {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    }
    setEditingProjectNameId(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {/* 历史项目侧边栏 */}
      <div className={`fixed inset-y-0 left-0 w-85 bg-slate-900/98 backdrop-blur-2xl border-r border-slate-800 z-[100] transition-transform duration-500 shadow-2xl flex flex-col ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-500"/>
            <h2 className="font-black text-xs uppercase tracking-widest text-slate-400">Project Library</h2>
          </div>
          <button onClick={() => setIsHistoryOpen(false)} className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
        </div>
        
        <div className="p-5">
          <button onClick={handleNewProject} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-900/40 mb-2 active:scale-95">
            <Plus className="w-5 h-5" /> NEW ANALYSIS
          </button>
          <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-tighter opacity-50 mt-2">All changes are auto-saved locally</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-3 custom-scrollbar">
          {projects.length === 0 && (
            <div className="text-center py-20 px-10">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <FileText className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">No projects yet. Start your first analysis above!</p>
            </div>
          )}
          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => { setActiveProjectId(p.id); setIsHistoryOpen(false); }} 
              className={`group p-4 rounded-2xl cursor-pointer transition-all border-2 relative ${activeProjectId === p.id ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20' : 'bg-slate-800/40 border-transparent hover:border-slate-700 text-slate-400 hover:text-white'}`}
            >
              <div className="flex items-start justify-between mb-2">
                {editingProjectNameId === p.id ? (
                  <input 
                    autoFocus
                    className="bg-slate-950 text-white text-sm font-bold rounded px-2 py-1 outline-none border border-blue-500 w-full"
                    defaultValue={p.name}
                    onBlur={(e) => handleRenameProject(p.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameProject(p.id, e.currentTarget.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="text-sm font-bold truncate pr-10">{p.name}</div>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-3">
                 <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-slate-500">
                   <ListMusic className="w-3 h-3" /> {p.segments?.length || 0} Segments
                 </div>
                 <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-slate-500">
                   <FileText className="w-3 h-3" /> {p.subtitles?.length || 0} Subs
                 </div>
              </div>
              
              <div className="text-[9px] opacity-30 mt-2 font-mono flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {new Date(p.lastModified).toLocaleString()}
              </div>

              <div className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingProjectNameId(p.id); }} 
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5"/>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('Delete this project?')) setProjects(prev => prev.filter(item => item.id !== p.id)); }} 
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主界面 */}
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
            <button 
              onClick={() => setIsHistoryOpen(true)} 
              className={`p-2.5 rounded-xl transition-all relative ${isHistoryOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`} 
              title="Open Project Library"
            >
              <History className="w-5 h-5"/>
              {projects.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-900"></span>}
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">QualiVision</span>
                <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">V4</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <Edit3 className="w-2.5 h-2.5" /> {project.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                <button onClick={undo} disabled={!canUndo} className="p-2 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-slate-300 transition-all" title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4"/></button>
                <button onClick={redo} disabled={!canRedo} className="p-2 hover:bg-slate-700 disabled:opacity-20 rounded-lg text-slate-300 transition-all" title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4"/></button>
             </div>
             
             <div className="h-6 w-px bg-slate-800 mx-2" />

             <button onClick={() => setViewMode(viewMode === 'analyze' ? 'visualize' : 'analyze')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${viewMode === 'visualize' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
               <LayoutDashboard className="w-4 h-4" /> {viewMode === 'analyze' ? 'View Report' : 'Back to Editor'}
             </button>

             {viewMode === 'visualize' && (
               <button onClick={handleFinish} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-500/30 transition-all shadow-xl shadow-emerald-900/40 active:scale-95"><CheckCircle2 className="w-4 h-4" /> Export Package</button>
             )}
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setShowCodeManager(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all"><Settings2 className="w-4 h-4"/> Setup</button>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 relative">
          {viewMode === 'visualize' ? <Analytics project={project} /> : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex min-h-0 overflow-hidden bg-black">
                <div className="flex-1 relative bg-[#020617] flex items-center justify-center p-4">
                  <VideoPlayer 
                    ref={videoRef} 
                    src={videoSrc} 
                    projectVideoName={project.videoFileName} 
                    onTimeUpdate={setCurrentTime} 
                    onLoadedMetadata={(d) => setProject(p => ({ ...p, duration: d }))} 
                    onEnded={() => setIsPlaying(false)} 
                    onRelinkVideo={loadVideoFile} 
                    onUploadNew={loadVideoFile} 
                  />
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
                  <TranscriptEditor 
                    subtitles={project.subtitles} 
                    transcriptCodes={project.transcriptCodes} 
                    notePalette={project.notePalette} 
                    currentTime={currentTime} 
                    isVideoLoaded={!!videoSrc} 
                    isAIProcessing={isAIProcessing} 
                    onSeek={(t) => videoRef.current?.seekTo(t)} 
                    onUpdateSubtitles={(subs) => setProject(p => ({ ...p, subtitles: typeof subs === 'function' ? subs(p.subtitles) : subs }))} 
                    onOpenCodeManager={() => setShowCodeManager(true)} 
                    onAutoTranscribe={handleAutoTranscribe} 
                  />
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
