
import { CodeDefinition, NoteDefinition } from './types';


export const BEHAVIOR_CODES: CodeDefinition[] = [
  { id: 'b1', label: 'UI_Explore', color: '#f42c2cff', shortcut: '1' },
  { id: 'b2', label: 'Stuck', color: '#ff6411ff', shortcut: '2' },
  { id: 'b3', label: 'Hacking', color: '#046408ff', shortcut: '3' },
  { id: 'b4', label: 'Fine_Tune', color: '#1902b2ff', shortcut: '4' },
  { id: 'b5', label: 'Rough_Tune', color: '#35b4fdff', shortcut: '5' },
  { id: 'b6', label: 'Reframe', color: '#a007d7ff', shortcut: '6' },
  { id: 'b7', label: 'Visual_Eva', color: '#ec4899', shortcut: '7' },
  { id: 'b8', label: 'Simul_Eva', color: '#e6f564ff', shortcut: '8' },
  { id: 'b9', label: 'Linter_Eva', color: '#62fdc5ff', shortcut: '9' },
];

export const THINKING_CODES: CodeDefinition[] = [
  { id: 'e1', label: 'Aesthetic', color: '#ff0804ff', shortcut: 'W' },
  { id: 'e2', label: 'A11y', color: '#3f48f1ff', shortcut: 'A' },
  { id: 'e3', label: 'Constraints', color: '#FDD835', shortcut: 'S' },
];


export const DEFAULT_STREAMS_CONFIG = [
  { name: 'Behavioral Stream', codes: BEHAVIOR_CODES },
  { name: 'Thinking Stream', codes: THINKING_CODES },
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
