
import { CodeDefinition, NoteDefinition } from './types';

// Behavior / Sequence Codes (Timeline)
export const DEFAULT_TIMELINE_CODES: CodeDefinition[] = [
  { id: 'tm1', label: 'Talking', color: '#3b82f6', shortcut: '1' }, // Blue
  { id: 'tm2', label: 'Gesturing', color: '#10b981', shortcut: '2' }, // Emerald
  { id: 'tm3', label: 'Walking', color: '#f59e0b', shortcut: '3' }, // Amber
  { id: 'tm4', label: 'Screen Interaction', color: '#8b5cf6', shortcut: '4' }, // Violet
];

// Thematic / Content Codes (Transcript)
export const DEFAULT_TRANSCRIPT_CODES: CodeDefinition[] = [
  { id: 'tr1', label: 'Positive Sentiment', color: '#84cc16', shortcut: '' }, 
  { id: 'tr2', label: 'Pain Point', color: '#ef4444', shortcut: '' }, 
  { id: 'tr3', label: 'Feature Request', color: '#06b6d4', shortcut: '' }, 
  { id: 'tr4', label: 'Confusion', color: '#f43f5e', shortcut: '' }, 
];

// Note Highlighting Palette (Defaults)
export const DEFAULT_NOTE_PALETTE: NoteDefinition[] = [
  { id: 'n1', color: '#fbbf24', label: 'Insight (Amber)' }, 
  { id: 'n2', color: '#f472b6', label: 'Question (Pink)' }, 
  { id: 'n3', color: '#22d3ee', label: 'Action Item (Cyan)' },
  { id: 'n4', color: '#a78bfa', label: 'Theme Idea (Violet)' },
  { id: 'n5', color: '#f87171', label: 'Correction (Red)' },
];

export const MOCK_SUBTITLES = [
  { id: 's1', startTime: 0, endTime: 5, html: "Welcome to the qualitative analysis demonstration." },
  { id: 's2', startTime: 5, endTime: 12, html: "Please upload a video to generate real AI transcripts." },
];
