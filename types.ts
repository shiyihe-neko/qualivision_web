
export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  html: string; 
  codeId?: string; 
}

export interface CodeDefinition {
  id: string;
  label: string;
  color: string;
  shortcut?: string;
  parentId?: string; // Optional parent code for hierarchical analysis
}

export interface NoteDefinition {
  id: string;
  color: string;
  label: string;
}

export interface CodedSegment {
  id: string;
  streamId: string; // 关联到具体的 Stream
  codeId: string; 
  startTime: number;
  endTime: number;
  note?: string;
}

export interface TimelineStream {
  id: string;
  name: string;
  isLocked: boolean;
  parentId?: string; // Optional parent stream for nested analysis layers
  codes: CodeDefinition[]; // 每条流独立的编码组
}

export interface Project {
  id: string;
  name: string;
  videoFileName?: string; 
  videoUrlType: 'file' | 'url';
  createdAt: number;
  lastModified: number;
  subtitles: Subtitle[];
  segments: CodedSegment[];
  
  // 多流系统
  streams: TimelineStream[];
  
  transcriptCodes: CodeDefinition[];
  notePalette: NoteDefinition[];
  
  duration: number; 
}

export type ViewMode = 'analyze' | 'visualize';

export const UNCODED_COLOR = '#475569';
export const UNCODED_LABEL = 'Uncoded / Gap';
