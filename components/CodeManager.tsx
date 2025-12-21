
import React, { useState } from 'react';
import { CodeDefinition, NoteDefinition, TimelineStream } from '../types';
// Added Settings2 to the imports from lucide-react
import { Plus, Trash2, X, Save, Edit3, AlignLeft, Clock, Highlighter, ListTree, Settings2 } from 'lucide-react';

interface CodeManagerProps {
  streams: TimelineStream[];
  transcriptCodes: CodeDefinition[];
  notePalette: NoteDefinition[];
  onUpdateStreams: (streams: TimelineStream[]) => void;
  onUpdateTranscriptCodes: (newCodes: CodeDefinition[]) => void;
  onUpdateNotePalette: (newNotes: NoteDefinition[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#84cc16', '#6366f1', '#d946ef', '#f43f5e', '#fbbf24'
];

const CodeManager: React.FC<CodeManagerProps> = ({ 
  streams, 
  transcriptCodes, 
  notePalette,
  onUpdateStreams, 
  onUpdateTranscriptCodes, 
  onUpdateNotePalette,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<string>(streams[0]?.id || 'transcript');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{id?: string, label?: string, color?: string, shortcut?: string}>({});

  const getCurrentList = () => {
    const stream = streams.find(s => s.id === activeTab);
    if (stream) return stream.codes;
    if (activeTab === 'transcript') return transcriptCodes;
    return notePalette;
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = () => {
    if (!editingId || !editForm.label) return;

    const streamIdx = streams.findIndex(s => s.id === activeTab);
    if (streamIdx !== -1) {
      const newStreams = [...streams];
      newStreams[streamIdx].codes = newStreams[streamIdx].codes.map(c => c.id === editingId ? { ...c, ...editForm } as CodeDefinition : c);
      onUpdateStreams(newStreams);
    } else if (activeTab === 'transcript') {
      onUpdateTranscriptCodes(transcriptCodes.map(c => c.id === editingId ? { ...c, ...editForm } as CodeDefinition : c));
    } else {
      onUpdateNotePalette(notePalette.map(c => c.id === editingId ? { ...c, ...editForm } as NoteDefinition : c));
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this definition?')) return;
    const streamIdx = streams.findIndex(s => s.id === activeTab);
    if (streamIdx !== -1) {
      const newStreams = [...streams];
      newStreams[streamIdx].codes = newStreams[streamIdx].codes.filter(c => c.id !== id);
      onUpdateStreams(newStreams);
    } else if (activeTab === 'transcript') {
      onUpdateTranscriptCodes(transcriptCodes.filter(c => c.id !== id));
    } else {
      onUpdateNotePalette(notePalette.filter(c => c.id !== id));
    }
  };

  const handleAdd = () => {
    const list = getCurrentList();
    const newId = `def_${Date.now()}`;
    const newColor = PRESET_COLORS[list.length % PRESET_COLORS.length];
    
    const streamIdx = streams.findIndex(s => s.id === activeTab);
    if (streamIdx !== -1) {
      const newCode: CodeDefinition = { id: newId, label: 'New Behavior', color: newColor, shortcut: String(list.length + 1) };
      const newStreams = [...streams];
      newStreams[streamIdx].codes = [...newStreams[streamIdx].codes, newCode];
      onUpdateStreams(newStreams);
      handleEdit(newCode);
    } else if (activeTab === 'transcript') {
      const newCode: CodeDefinition = { id: newId, label: 'New Theme', color: newColor, shortcut: '' };
      onUpdateTranscriptCodes([...transcriptCodes, newCode]);
      handleEdit(newCode);
    } else {
      const newNote: NoteDefinition = { id: newId, label: 'New Highlight', color: newColor };
      onUpdateNotePalette([...notePalette, newNote]);
      handleEdit(newNote);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[800px] max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <Settings2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-xl font-black tracking-tight">Project Settings</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* 左侧菜单 */}
          <aside className="w-56 border-r border-slate-800 p-4 space-y-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">Sequence Streams</div>
            {streams.map((s, i) => (
              <button key={s.id} onClick={() => setActiveTab(s.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === s.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                <ListTree className="w-4 h-4" /> {s.name || `Stream ${i+1}`}
              </button>
            ))}
            <div className="h-px bg-slate-800 my-4" />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">Content & Style</div>
            <button onClick={() => setActiveTab('transcript')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'transcript' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <AlignLeft className="w-4 h-4" /> Transcript Themes
            </button>
            <button onClick={() => setActiveTab('notes')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'notes' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Highlighter className="w-4 h-4" /> Highlighter Colors
            </button>
          </aside>

          {/* 右侧列表 */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40">
            <div className="p-6 overflow-y-auto space-y-3">
              {getCurrentList().map((item: any) => (
                <div key={item.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 group">
                  {editingId === item.id ? (
                    <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <input type="color" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"/>
                      <input type="text" value={editForm.label} onChange={e => setEditForm({...editForm, label: e.target.value})} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="Label"/>
                      {activeTab.startsWith('stream') && (
                        <input type="text" value={editForm.shortcut || ''} onChange={e => setEditForm({...editForm, shortcut: e.target.value})} className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center font-mono" placeholder="Key" maxLength={1}/>
                      )}
                      <button onClick={handleSave} className="p-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white shadow-lg"><Save className="w-5 h-5"/></button>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full border-2 border-white/10" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="font-bold text-slate-200">{item.label}</div>
                        {item.shortcut && <div className="text-[10px] text-slate-500 font-mono tracking-tighter">Shortcut Key: {item.shortcut}</div>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button onClick={handleAdd} className="w-full py-4 border-2 border-dashed border-slate-700 text-slate-500 rounded-2xl hover:border-slate-500 hover:text-slate-300 flex items-center justify-center gap-2 transition-all font-bold text-sm bg-slate-800/20"><Plus className="w-5 h-5" /> Add New Definition</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeManager;
