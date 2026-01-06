
import { CodeDefinition, NoteDefinition } from './types';

// --- sequential coding 1: Behavioral
export const BEHAVIOR_CODES: CodeDefinition[] = [
  { id: 'b1', label: 'Explore', color: '#f3a3dfff', shortcut: '1' },
  { id: 'b2', label: 'Stuck', color: '#f17d3fff', shortcut: '3' },
  { id: 'b3', label: 'Finetune', color: '#60ff66ff', shortcut: '2' },
  { id: 'b4', label: 'Evaluate', color: '#35b4fdff', shortcut: '4' },
  { id: 'b5', label: 'Reframe', color: '#a91addff', shortcut: '5' },
];

// --- sequential coding 2: tool triggered activities ---
export const TOOL_CODES_COLORBUDDY: CodeDefinition[] = [
  { id: 'e1', label: 'Linter_check', color: '#ff0804ff', shortcut: 'g' },
  { id: 'e2', label: 'Preview_check', color: '#f17d3fff', shortcut: 'h' },
  { id: 'e3', label: 'Simulate_check', color: '#FDD835', shortcut: 'i' },
  { id: 'e4', label: 'Finetune_intuition', color: '#4a67f7ff', shortcut: 'j' },
  { id: 'e5', label: 'Finetune_linter', color: '#302660ff', shortcut: 'k' },
  { id: 'e6', label: 'Auto_palette', color: '#35b4fdff', shortcut: 'l' },
  { id: 'e7', label: 'Hacking', color: '#a91addff', shortcut: 'm' },
  { id: 'e8', label: 'Add_color', color: '#ec4899', shortcut: 'n' },
];

// --- sequential coding 3:  ---

export const TOOL_CODES: CodeDefinition[] = [
  { id: 'e1', label: 'Simulate_check', color: '#ff0804ff', shortcut: 'a' },
  { id: 'e2', label: 'Preview_check', color: '#f17d3fff', shortcut: 'b' },
  { id: 'e3', label: 'Finetune_intuition', color: '#FDD835', shortcut: 'c' },
  { id: 'e4', label: 'Auto_palette', color: '#35b4fdff', shortcut: 'd' },
  { id: 'e5', label: 'Hacking', color: '#a91addff', shortcut: 'e' },
  { id: 'e6', label: 'Add_color', color: '#ec4899', shortcut: 'f' },
];
  
export const DEFAULT_STREAMS_CONFIG = [
  { name: 'Behavioral Stream', codes: BEHAVIOR_CODES },
  { name: 'Tool triggered Activities Color Buddy', codes: TOOL_CODES_COLORBUDDY },
  { name: 'Tool triggered Activities', codes: TOOL_CODES },
];

export const DEFAULT_TIMELINE_CODES = BEHAVIOR_CODES;

// transcripts code - cognitive actions and evaluation method
export const DEFAULT_TRANSCRIPT_CODES: CodeDefinition[] = [
  { id: 'tr1', label: 'Probing_intuition', color: '#f3a3dfff', shortcut: '' }, 
  { id: 'tr2', label: 'Probing_exploration', color: '#f17d3fff', shortcut: '' }, 
  { id: 'tr3', label: 'Evaluation_holistic', color: '#60ff66ff', shortcut: '' },
  { id: 'tr4', label: 'Perceptual_checking', color: '#35b4fdff', shortcut: '' },
  { id: 'tr5', label: 'Strategy_shift', color: '#a91addff', shortcut: '' },
];

// notes code
export const DEFAULT_NOTE_PALETTE: NoteDefinition[] = [
  { id: 'n1', color: '#fbbf24', label: 'Amber Highlight' }, 
  { id: 'n2', color: '#f472b6', label: 'Pink Highlight' }, 
  { id: 'n3', color: '#34d399', label: 'Green Highlight' },
  { id: 'n4', color: '#60a5fa', label: 'Blue Highlight' },
];
