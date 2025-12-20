import React, { useState } from 'react';
import { CodeDefinition, NoteDefinition } from '../types';
import { Plus, Trash2, X, Save, Edit3, AlignLeft, Clock, Highlighter } from 'lucide-react';

interface CodeManagerProps {
  timelineCodes: CodeDefinition[];
  transcriptCodes: CodeDefinition[];
  notePalette: NoteDefinition[];
  onUpdateTimelineCodes: (newCodes: CodeDefinition[]) => void;
  onUpdateTranscriptCodes: (newCodes: CodeDefinition[]) => void;
  onUpdateNotePalette: (newNotes: NoteDefinition[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e',
  '#fbbf24', '#f472b6', '#22d3ee', '#a78bfa'
];

type Tab = 'timeline' | 'transcript' | 'notes';

const CodeManager: React.FC<CodeManagerProps> = ({ 
  timelineCodes, 
  transcriptCodes, 
  notePalette,
  onUpdateTimelineCodes, 
  onUpdateTranscriptCodes, 
  onUpdateNotePalette,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Generic state for editing any definition type
  const [editForm, setEditForm] = useState<{id?: string, label?: string, color?: string, shortcut?: string}>({});

  const getCurrentList = () => {
    if (activeTab === 'timeline') return timelineCodes;
    if (activeTab === 'transcript') return transcriptCodes;
    return notePalette;
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = () => {
    if (editingId && editForm.label) {
      if (activeTab === 'timeline') {
        const newCodes = timelineCodes.map(c => c.id === editingId ? { ...c, ...editForm } as CodeDefinition : c);
        onUpdateTimelineCodes(newCodes);
      } else if (activeTab === 'transcript') {
        const newCodes = transcriptCodes.map(c => c.id === editingId ? { ...c, ...editForm } as CodeDefinition : c);
        onUpdateTranscriptCodes(newCodes);
      } else {
        const newNotes = notePalette.map(c => c.id === editingId ? { ...c, ...editForm } as NoteDefinition : c);
        onUpdateNotePalette(newNotes);
      }
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      if (activeTab === 'timeline') {
        onUpdateTimelineCodes(timelineCodes.filter(c => c.id !== id));
      } else if (activeTab === 'transcript') {
        onUpdateTranscriptCodes(transcriptCodes.filter(c => c.id !== id));
      } else {
         onUpdateNotePalette(notePalette.filter(c => c.id !== id));
      }
    }
  };

  const handleAdd = () => {
    const list = getCurrentList();
    const newId = `${activeTab.substr(0,1)}_${Date.now()}`;
    const newColor = PRESET_COLORS[list.length % PRESET_COLORS.length];
    
    if (activeTab === 'timeline') {
       const newCode: CodeDefinition = {
         id: newId, label: 'New Behavior', color: newColor, shortcut: String(list.length + 1)
       };
       onUpdateTimelineCodes([...timelineCodes, newCode]);
       handleEdit(newCode);
    } else if (activeTab === 'transcript') {
       const newCode: CodeDefinition = {
         id: newId, label: 'New Theme', color: newColor, shortcut: ''
       };
       onUpdateTranscriptCodes([...transcriptCodes, newCode]);
       handleEdit(newCode);
    } else {
       const newNote: NoteDefinition = {
         id: newId, label: 'New Highlighter', color: newColor
       };
       onUpdateNotePalette([...notePalette, newNote]);
       handleEdit(newNote);
    }
  };

  const renderTabButton = (tab: Tab, label: string, Icon: any, colorClass: string, borderClass: string) => (
      <button 
        onClick={() => { setActiveTab(tab); setEditingId(null); }}
        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === tab
            ? `${colorClass} border-b-2 ${borderClass} bg-slate-800/50` 
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Icon className="w-4 h-4" /> {label}
      </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">Manage Project Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {renderTabButton('timeline', 'Timeline Codes', Clock, 'text-blue-400', 'border-blue-400')}
          {renderTabButton('transcript', 'Transcript Codes', AlignLeft, 'text-emerald-400', 'border-emerald-400')}
          {renderTabButton('notes', 'Note Highlighters', Highlighter, 'text-amber-400', 'border-amber-400')}
        </div>

        <div className="p-4 bg-slate-900/50 text-xs text-slate-500 text-center">
            {activeTab === 'timeline' && "Codes for Timeline Sequence Analysis (Video behavior)."}
            {activeTab === 'transcript' && "Codes for Categorizing Transcript Lines (Themes)."}
            {activeTab === 'notes' && "Colors used for highlighting text within the transcript (Notes/Memo)."}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {getCurrentList().map((item: any) => (
            <div key={item.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 border border-slate-700">
              {editingId === item.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input 
                    type="color" 
                    value={editForm.color}
                    onChange={e => setEditForm({...editForm, color: e.target.value})}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                  />
                  <input 
                    type="text" 
                    value={editForm.label}
                    onChange={e => setEditForm({...editForm, label: e.target.value})}
                    className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    placeholder="Label / Name"
                    autoFocus
                  />
                  {activeTab === 'timeline' && (
                    <input 
                        type="text" 
                        value={editForm.shortcut || ''}
                        onChange={e => setEditForm({...editForm, shortcut: e.target.value})}
                        className="w-12 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-center text-slate-300 font-mono"
                        placeholder="Key"
                        maxLength={1}
                        title="Keyboard Shortcut"
                    />
                  )}
                  <button onClick={handleSave} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white"><Save className="w-4 h-4"/></button>
                </div>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: item.color }} />
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">{item.label}</div>
                    {item.shortcut && activeTab === 'timeline' && <div className="text-xs text-slate-500 font-mono">Key: {item.shortcut}</div>}
                  </div>
                  <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-400"><Edit3 className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                </>
              )}
            </div>
          ))}

          <button 
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 rounded-lg hover:border-slate-500 hover:text-slate-200 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" /> Add New Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeManager;