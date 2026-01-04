
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
export const TOOL_CODES: CodeDefinition[] = [
  { id: 'e1', label: 'Linter_check', color: '#ff0804ff', shortcut: 'q' },
  { id: 'e2', label: 'Preview_check', color: '#f17d3fff', shortcut: 'w' },
  { id: 'e3', label: 'Finetune_intuition', color: '#FDD835', shortcut: 'e' },
  { id: 'e4', label: 'Finetune_linter', color: '#60ff66ff', shortcut: 'r' },
  { id: 'e5', label: 'Shift_strategy', color: '#35b4fdff', shortcut: 't' },
  { id: 'e6', label: 'Hacking', color: '#a91addff', shortcut: 'y' },
];

// --- sequential coding 3:  ---
export const INTERACTION_CODES: CodeDefinition[] = [
  { id: 'i1', label: 'Screen', color: '#8b5cf6', shortcut: 'a' },
  { id: 'i2', label: 'Paper', color: '#ec4899', shortcut: 's' },
  { id: 'i3', label: 'Person', color: '#f97316', shortcut: 'd' },
];


export const DEFAULT_STREAMS_CONFIG = [
  { name: 'Behavioral Stream', codes: BEHAVIOR_CODES },
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
