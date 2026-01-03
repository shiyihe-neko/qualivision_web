
import { CodeDefinition, NoteDefinition } from './types';

// --- sequential coding 1: Behavioral
export const BEHAVIOR_CODES: CodeDefinition[] = [
  { id: 'b1', label: 'Explore_design', color: '#E53935', shortcut: '1' },
  { id: 'b2', label: 'Stuck_unmet_design', color: '#FB8C00', shortcut: '3' },
  { id: 'b3', label: 'Explore_function', color: '#ec4899', shortcut: '2' },
  { id: 'b4', label: 'Stuck_unexp_func', color: '#FDD835', shortcut: '4' },
  { id: 'b5', label: 'Stuck_complex_func', color: '#C2B48A', shortcut: '5' },
  { id: 'b6', label: 'Vibe_finetuning', color: '#43A047', shortcut: '6' },
  { id: 'b7', label: 'Vibe_evaluation', color: '#1E88E5', shortcut: '7' },
  { id: 'b8', label: 'Vibe_reframing', color: '#8E24AA', shortcut: '8' },
  { id: 'b9', label: 'Para_finetuning', color: '#8FA39A', shortcut: '9' },
  { id: 'b10', label: 'Para_evaluation', color: '#8FA0B2', shortcut: '0' },
  { id: 'b11', label: 'Para_reframing', color: '#9A8FA3', shortcut: '-' },
];

// --- sequential coding 2: tool triggered activities ---
export const TOOL_CODES: CodeDefinition[] = [
  { id: 'e1', label: 'EL_Preview', color: '#E53935', shortcut: 'q' },
  { id: 'e2', label: 'EL_Testing', color: '#fb98daff', shortcut: 'w' },
  { id: 'e3', label: 'Selective_Control', color: '#FDD835', shortcut: 'e' },
  { id: 'e4', label: 'FT_Slider', color: '#43A047', shortcut: 'r' },
  { id: 'e5', label: 'FT_Wheels', color: '#1E88E5', shortcut: 't' },
  { id: 'e6', label: 'FT_Colorpicker', color: '#8E24AA', shortcut: 'y' },
  { id: 'e7', label: 'FT_Colorspace', color: '#ec4899', shortcut: 'u' },
  { id: 'e8', label: 'FT_Order', color: '#f97316', shortcut: 'i' },
  { id: 'e9', label: 'Hacking', color: '#7ba592ff', shortcut: 'i' },
  { id: 'e10', label: 'Regenerate_same', color: '#7896b6ff', shortcut: 'o' },
  { id: 'e11', label: 'Regenerate_diff', color: '#b3a67fff', shortcut: 'p' },
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
  { id: 'tr1', label: 'Probing', color: '#E53935', shortcut: '' }, 
  { id: 'tr2', label: 'Hypothesis_Testing', color: '#9f6867ff', shortcut: '' }, 
  { id: 'tr3', label: 'Intuition', color: '#6366f1', shortcut: '' },
  { id: 'tr4', label: 'Perceptual_Checking', color: '#1E88E5', shortcut: '' },
  { id: 'tr5', label: 'Strategy_Shift', color: '#43A047', shortcut: '' },
  { id: 'tr6', label: 'Holistic_Judgment', color: '#fbbf24', shortcut: '' },
  { id: 'tr7', label: 'Pairwise_Comparison', color: '#8E24AA', shortcut: '' },
  { id: 'tr8', label: 'Sequential_Scanning', color: '#f97316', shortcut: '' },
  { id: 'tr9', label: 'Preview_Evaluation', color: '#ec4899', shortcut: '' },
  { id: 'tr10', label: 'Check_Evaluation', color: '#fb98daff', shortcut: '' },
];

// notes code
export const DEFAULT_NOTE_PALETTE: NoteDefinition[] = [
  { id: 'n1', color: '#fbbf24', label: 'Amber Highlight' }, 
  { id: 'n2', color: '#f472b6', label: 'Pink Highlight' }, 
  { id: 'n3', color: '#34d399', label: 'Green Highlight' },
  { id: 'n4', color: '#60a5fa', label: 'Blue Highlight' },
];
