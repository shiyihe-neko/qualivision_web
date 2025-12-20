
export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  html: string; // Rich text notes
  codeId?: string; // Links to transcriptCodes
}

export interface CodeDefinition {
  id: string;
  label: string;
  color: string;
  shortcut?: string;
}

export interface NoteDefinition {
  id: string;
  color: string;
  label: string;
}

export interface CodedSegment {
  id: string;
  codeId: string; // Links to timelineCodes
  startTime: number;
  endTime: number;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  videoFileName?: string; 
  videoUrlType: 'file' | 'url';
  createdAt: number;
  lastModified: number;
  videoDataUrl?: string; 
  subtitles: Subtitle[];
  segments: CodedSegment[];
  
  // SEPARATED CODING SYSTEMS
  timelineCodes: CodeDefinition[];
  transcriptCodes: CodeDefinition[];
  notePalette: NoteDefinition[]; // New: Customizable note colors
  
  duration: number; 
}

export type ViewMode = 'analyze' | 'visualize';

export const UNCODED_COLOR = '#475569';
export const UNCODED_LABEL = 'Uncoded / Gap';
